// Funciones compartidas por las funciones de /api
const crypto = require('crypto');
const { put, del } = require('@vercel/blob');

// Vercel limita el cuerpo del pedido a 4.5 MB; 3 MB en base64 ocupan unos 4 MB
const tamanoMaximoImagen = 3 * 1024 * 1024;
const extensionesPorTipo = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

class ErrorDeValidacion extends Error {}

function responder(res, estado, datos) {
  res.statusCode = estado;
  res.setHeader('Content-Type', 'application/json');
  res.end(datos === undefined ? '' : JSON.stringify(datos));
}

// Compara la clave del encabezado con CLAVE_ADMIN. Sin CLAVE_ADMIN configurada nadie puede modificar la lista.
function esAdmin(req) {
  const claveEsperada = process.env.CLAVE_ADMIN;
  const claveRecibida = req.headers['x-clave-admin'];
  if (!claveEsperada || typeof claveRecibida !== 'string') return false;
  const resumen = texto => crypto.createHash('sha256').update(texto).digest();
  return crypto.timingSafeEqual(resumen(claveEsperada), resumen(claveRecibida));
}

function esLinkValido(texto) {
  try { return ['http:', 'https:'].includes(new URL(texto).protocol); } catch { return false; }
}

// Busca og:image / twitter:image en el HTML del link
async function obtenerPortada(link) {
  try {
    const respuesta = await fetch(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (ListaArticulos)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = (await respuesta.text()).slice(0, 500000);
    for (const etiqueta of html.match(/<meta[^>]+>/gi) || []) {
      if (!/(og:image|twitter:image)(:src)?["']/i.test(etiqueta)) continue;
      const contenido = etiqueta.match(/content=["']([^"']+)["']/i);
      if (contenido) return new URL(contenido[1].replace(/&amp;/g, '&'), respuesta.url).href;
    }
  } catch {}
  return null;
}

// Sube a Vercel Blob la imagen propia (data URL de un archivo elegido o pegado) y devuelve su URL pública
async function guardarImagenPropia(dataUrl, id) {
  const partes = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
  const extension = partes && extensionesPorTipo[partes[1]];
  if (!extension) throw new ErrorDeValidacion('La imagen debe ser PNG, JPG, GIF o WEBP');
  const contenido = Buffer.from(partes[2], 'base64');
  if (contenido.length > tamanoMaximoImagen) throw new ErrorDeValidacion('La imagen no puede superar 3 MB');
  return subirImagen(`imagenes/${id}.${extension}`, contenido, partes[1]);
}

async function subirImagen(ruta, contenido, tipo) {
  const blob = await put(ruta, contenido, { access: 'public', contentType: tipo, addRandomSuffix: true });
  return blob.url;
}

// Solo se borran imágenes subidas a nuestro Blob, nunca portadas externas
async function eliminarImagenPropia(portada) {
  if (portada && new URL(portada).hostname.endsWith('.blob.vercel-storage.com')) await del(portada);
}

module.exports = { ErrorDeValidacion, responder, esAdmin, esLinkValido, obtenerPortada, guardarImagenPropia, subirImagen, eliminarImagenPropia, extensionesPorTipo };
