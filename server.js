// Servidor sin dependencias: sirve la página y guarda los artículos en articulos.json
const http = require('http');
const fs = require('fs');
const path = require('path');
const BaseDeDatos = require('./baseDeDatos');

const puerto = process.env.PORT || 3000;
const baseDeDatos = new BaseDeDatos(path.join(__dirname, 'articulos.json'));
const carpetaImagenes = path.join(__dirname, 'imagenes');
const tamanoMaximoImagen = 5 * 1024 * 1024;
const extensionesPorTipo = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
const tiposPorExtension = Object.fromEntries(Object.entries(extensionesPorTipo).map(([tipo, extension]) => [extension, tipo]));
fs.mkdirSync(carpetaImagenes, { recursive: true });

// Recibe un data URL (archivo elegido o pegado) y lo guarda en imagenes/. Devuelve la ruta pública o lanza un error de validación.
function guardarImagenPropia(dataUrl, id) {
  const partes = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
  const extension = partes && extensionesPorTipo[partes[1]];
  if (!extension) throw new ErrorDeValidacion('La imagen debe ser PNG, JPG, GIF o WEBP');
  const contenido = Buffer.from(partes[2], 'base64');
  if (contenido.length > tamanoMaximoImagen) throw new ErrorDeValidacion('La imagen no puede superar 5 MB');
  const nombreArchivo = `${id}.${extension}`;
  fs.writeFileSync(path.join(carpetaImagenes, nombreArchivo), contenido);
  return `/imagenes/${nombreArchivo}`;
}

class ErrorDeValidacion extends Error {}

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

function esLinkValido(texto) {
  try { return ['http:', 'https:'].includes(new URL(texto).protocol); } catch { return false; }
}

function responder(res, estado, datos) {
  res.writeHead(estado, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(datos));
}

async function manejarPedido(req, res) {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }

  const imagenPedida = req.method === 'GET' && /^\/imagenes\/(\w+\.(png|jpg|gif|webp))$/.exec(req.url);
  if (imagenPedida) {
    const rutaImagen = path.join(carpetaImagenes, imagenPedida[1]);
    if (!fs.existsSync(rutaImagen)) return responder(res, 404, { error: 'No encontrado' });
    res.writeHead(200, { 'Content-Type': tiposPorExtension[imagenPedida[2]] });
    return fs.createReadStream(rutaImagen).pipe(res);
  }

  if (req.url === '/api/articulos' && req.method === 'GET') {
    return responder(res, 200, baseDeDatos.listar());
  }

  if (req.url === '/api/articulos' && req.method === 'POST') {
    let cuerpo = '';
    for await (const trozo of req) {
      cuerpo += trozo;
      if (cuerpo.length > tamanoMaximoImagen * 1.5) return responder(res, 413, { error: 'El pedido es demasiado grande' });
    }
    let datos;
    try { datos = JSON.parse(cuerpo); } catch { return responder(res, 400, { error: 'JSON inválido' }); }
    const nombre = String(datos.nombre || '').trim();
    const descripcion = String(datos.descripcion || '').trim();
    const link = String(datos.link || '').trim();
    if (!nombre || !esLinkValido(link)) return responder(res, 400, { error: 'Nombre y link http(s) son obligatorios' });

    const id = Date.now().toString();
    let portada;
    try {
      portada = datos.imagen ? guardarImagenPropia(String(datos.imagen), id) : await obtenerPortada(link);
    } catch (error) {
      if (error instanceof ErrorDeValidacion) return responder(res, 400, { error: error.message });
      throw error;
    }
    const articulo = { id, nombre, descripcion, link, portada };
    return responder(res, 201, baseDeDatos.agregar(articulo));
  }

  const coincidencia = req.url.match(/^\/api\/articulos\/(\w+)$/);
  if (coincidencia && req.method === 'DELETE') {
    const articulo = baseDeDatos.listar().find(a => a.id === coincidencia[1]);
    baseDeDatos.eliminar(coincidencia[1]);
    // Solo se borran imágenes subidas por el usuario, nunca portadas externas
    if (articulo?.portada?.startsWith('/imagenes/')) fs.rmSync(path.join(__dirname, articulo.portada), { force: true });
    return responder(res, 204, {});
  }

  responder(res, 404, { error: 'No encontrado' });
}

http.createServer((req, res) => {
  manejarPedido(req, res).catch(error => {
    console.error(error);
    responder(res, 500, { error: 'Error al acceder a la base de datos' });
  });
}).listen(puerto, () => console.log(`ListaArticulos en http://localhost:${puerto}`));
