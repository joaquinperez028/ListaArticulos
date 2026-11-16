// GET ?lista=: estilo de la lista (público). PUT ?lista=: guardar estilo. POST ?lista=: subir una imagen decorativa.
// PUT y POST son solo para el administrador.
const { obtenerLista } = require('../lib/listas');
const { fuentes, estiloPredeterminado, limpiarEstilo, obtenerEstilo, guardarEstilo } = require('../lib/estilos');
const { ErrorDeValidacion, responder, esAdmin, guardarImagenPropia, eliminarImagenPropia } = require('../lib/utilidades');

module.exports = async (req, res) => {
  const lista = await obtenerLista(req);
  if (!lista) return responder(res, 404, { error: 'La lista no existe' });

  if (req.method === 'GET') {
    return responder(res, 200, { estilo: await obtenerEstilo(lista.id), predeterminado: estiloPredeterminado, fuentes });
  }
  if (!['PUT', 'POST'].includes(req.method)) return responder(res, 405, { error: 'Método no permitido' });
  if (!esAdmin(req)) return responder(res, 401, { error: 'Clave de administrador incorrecta' });

  if (req.method === 'POST') {
    try {
      return responder(res, 201, { url: await guardarImagenPropia(String(req.body?.imagen || ''), `decoracion-${Date.now()}`) });
    } catch (error) {
      if (error instanceof ErrorDeValidacion) return responder(res, 400, { error: error.message });
      throw error;
    }
  }

  const anterior = await obtenerEstilo(lista.id);
  const nuevo = limpiarEstilo(req.body);
  await guardarEstilo(lista.id, nuevo);
  // Las imágenes que se quitaron del estilo se borran de Blob. El estilo ya está guardado, así que un fallo acá solo deja un archivo suelto.
  const urlsNuevas = new Set(nuevo.decoraciones.map(decoracion => decoracion.url));
  const borrados = await Promise.allSettled(anterior.decoraciones.filter(d => !urlsNuevas.has(d.url)).map(d => eliminarImagenPropia(d.url)));
  for (const borrado of borrados) if (borrado.status === 'rejected') console.error('No se pudo borrar una imagen decorativa:', borrado.reason);
  responder(res, 200, nuevo);
};
