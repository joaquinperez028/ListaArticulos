// Estilo visual de cada lista (colores, fuente, tamaños e imágenes decorativas), guardado en Redis como 'estilo:<lista>'.
const { obtenerRedis } = require('./baseDeDatos');
const { esImagenPropia } = require('./utilidades');

// Solo se aceptan estas fuentes; las de Google se cargan desde fonts.googleapis.com
const fuentes = {
  sistema: { nombre: 'Sistema', css: 'system-ui, sans-serif' },
  inter: { nombre: 'Inter', css: "'Inter', sans-serif", google: 'Inter:wght@400;600;700' },
  poppins: { nombre: 'Poppins', css: "'Poppins', sans-serif", google: 'Poppins:wght@400;600;700' },
  nunito: { nombre: 'Nunito', css: "'Nunito', sans-serif", google: 'Nunito:wght@400;600;700' },
  lora: { nombre: 'Lora', css: "'Lora', serif", google: 'Lora:wght@400;600;700' },
  playfair: { nombre: 'Playfair Display', css: "'Playfair Display', serif", google: 'Playfair+Display:wght@400;600;700' },
  caveat: { nombre: 'Caveat', css: "'Caveat', cursive", google: 'Caveat:wght@400;600;700' },
  pacifico: { nombre: 'Pacifico', css: "'Pacifico', cursive", google: 'Pacifico' },
  robotoMono: { nombre: 'Roboto Mono', css: "'Roboto Mono', monospace", google: 'Roboto+Mono:wght@400;600;700' },
};

const clavesColor = ['fondo', 'tarjeta', 'texto', 'suave', 'acento'];
const maximoDecoraciones = 30;

// Colores en null = usar los del tema claro/oscuro del navegador
const estiloPredeterminado = {
  fuente: 'sistema',
  tamanoTexto: 16,
  radio: 12,
  anchoTarjeta: 240,
  colores: Object.fromEntries(clavesColor.map(clave => [clave, null])),
  decoraciones: [],
};

function numero(valor, minimo, maximo, predeterminado) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? Math.min(maximo, Math.max(minimo, convertido)) : predeterminado;
}

function color(valor) {
  return typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor) ? valor.toLowerCase() : null;
}

function limpiarDecoracion(decoracion) {
  if (!decoracion || !esImagenPropia(decoracion.url) || !/^[\w-]{1,40}$/.test(String(decoracion.id))) return null;
  return {
    id: String(decoracion.id),
    url: decoracion.url,
    x: numero(decoracion.x, -50, 150, 0), // porcentaje del ancho de la página
    y: numero(decoracion.y, 0, 20000, 0), // píxeles desde arriba
    ancho: numero(decoracion.ancho, 20, 1200, 200),
    opacidad: numero(decoracion.opacidad, 0, 1, 1),
    radio: numero(decoracion.radio, 0, 50, 0), // porcentaje: 50 = círculo
    rotacion: numero(decoracion.rotacion, -180, 180, 0),
    delante: Boolean(decoracion.delante),
  };
}

// Convierte lo que manda el navegador en un estilo válido; lo desconocido vuelve al valor predeterminado
function limpiarEstilo(datos = {}) {
  const colores = datos.colores || {};
  return {
    fuente: Object.hasOwn(fuentes, datos.fuente) ? datos.fuente : estiloPredeterminado.fuente,
    tamanoTexto: numero(datos.tamanoTexto, 12, 24, estiloPredeterminado.tamanoTexto),
    radio: numero(datos.radio, 0, 32, estiloPredeterminado.radio),
    anchoTarjeta: numero(datos.anchoTarjeta, 160, 420, estiloPredeterminado.anchoTarjeta),
    colores: Object.fromEntries(clavesColor.map(clave => [clave, color(colores[clave])])),
    decoraciones: (Array.isArray(datos.decoraciones) ? datos.decoraciones : [])
      .slice(0, maximoDecoraciones).map(limpiarDecoracion).filter(Boolean),
  };
}

async function obtenerEstilo(idLista) {
  return limpiarEstilo((await obtenerRedis().get(`estilo:${idLista}`)) || estiloPredeterminado);
}

async function guardarEstilo(idLista, estilo) {
  await obtenerRedis().set(`estilo:${idLista}`, estilo);
}

module.exports = { fuentes, estiloPredeterminado, limpiarEstilo, obtenerEstilo, guardarEstilo };
