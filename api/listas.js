// GET: pestañas disponibles. POST: crear lista. PATCH ?id=: cambiar nombre y/o aviso. DELETE ?id=: eliminar lista con sus artículos e imágenes.
// Todo menos GET es solo para el administrador.
const { obtenerListas, guardarListas, limpiarNombre, limpiarAviso, crearId, claveRedisDe, largoMaximoNombre, largoMaximoTituloAviso, largoMaximoTextoAviso } = require('../lib/listas');
const { obtenerEstilo } = require('../lib/estilos');
const { obtenerRedis } = require('../lib/baseDeDatos');
const { responder, esAdmin, eliminarImagenPropia } = require('../lib/utilidades');

const errorNombre = `El nombre es obligatorio y puede tener hasta ${largoMaximoNombre} caracteres`;
const errorAviso = `El título del aviso puede tener hasta ${largoMaximoTituloAviso} caracteres y el texto hasta ${largoMaximoTextoAviso}`;

module.exports = async (req, res) => {
  if (req.method === 'GET') return responder(res, 200, await obtenerListas());
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return responder(res, 405, { error: 'Método no permitido' });
  if (!esAdmin(req)) return responder(res, 401, { error: 'Clave de administrador incorrecta' });
  const listas = await obtenerListas();

  if (req.method === 'POST') {
    const nombre = limpiarNombre(req.body?.nombre);
    if (!nombre) return responder(res, 400, { error: errorNombre });
    const lista = { id: crearId(nombre, listas), nombre };
    await guardarListas([...listas, lista]);
    return responder(res, 201, lista);
  }

  const lista = listas.find(l => l.id === String(req.query.id || ''));
  if (!lista) return responder(res, 404, { error: 'La lista no existe' });

  if (req.method === 'DELETE') {
    if (listas.length === 1) return responder(res, 400, { error: 'No se puede eliminar la única lista' });
    const claveArticulos = claveRedisDe(lista.id);
    const redis = obtenerRedis();
    const articulos = (await redis.get(claveArticulos)) || [];
    const estilo = await obtenerEstilo(lista.id);
    // Primero se saca la lista y sus datos; las imágenes que no se puedan borrar solo quedan como archivos sueltos
    await guardarListas(listas.filter(l => l.id !== lista.id));
    await redis.del(claveArticulos, `estilo:${lista.id}`);
    const urls = [...articulos.map(a => a.portada), ...estilo.decoraciones.map(d => d.url)];
    const borrados = await Promise.allSettled(urls.map(eliminarImagenPropia));
    for (const borrado of borrados) if (borrado.status === 'rejected') console.error('No se pudo borrar una imagen de la lista eliminada:', borrado.reason);
    return responder(res, 204);
  }

  // Cambios parciales: solo se toca lo que viene en el cuerpo
  const cuerpo = req.body || {};
  if (cuerpo.nombre === undefined && cuerpo.aviso === undefined) return responder(res, 400, { error: 'No hay cambios para guardar' });
  if (cuerpo.nombre !== undefined) {
    const nombre = limpiarNombre(cuerpo.nombre);
    if (!nombre) return responder(res, 400, { error: errorNombre });
    lista.nombre = nombre;
  }
  if (cuerpo.aviso !== undefined) {
    const aviso = limpiarAviso(cuerpo.aviso);
    if (!aviso) return responder(res, 400, { error: errorAviso });
    lista.aviso = aviso;
  }
  await guardarListas(listas);
  responder(res, 200, lista);
};
