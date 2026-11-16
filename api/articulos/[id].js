// PATCH: editar artículo. DELETE: eliminar artículo y su imagen propia. Solo administrador; la pestaña llega en ?lista=.
const BaseDeDatos = require('../../lib/baseDeDatos');
const { obtenerLista } = require('../../lib/listas');
const { ErrorDeValidacion, responder, esAdmin, validarArticulo, obtenerPortada, guardarImagenPropia, esImagenPropia, eliminarImagenPropia } = require('../../lib/utilidades');

module.exports = async (req, res) => {
  if (!['PATCH', 'DELETE'].includes(req.method)) return responder(res, 405, { error: 'Método no permitido' });
  if (!esAdmin(req)) return responder(res, 401, { error: 'Clave de administrador incorrecta' });
  const lista = await obtenerLista(req);
  if (!lista) return responder(res, 404, { error: 'La lista no existe' });
  const baseDeDatos = new BaseDeDatos(lista.claveRedis);

  const articulo = await baseDeDatos.buscar(req.query.id);
  if (!articulo) return responder(res, 404, { error: 'No encontrado' });

  if (req.method === 'DELETE') {
    await baseDeDatos.eliminar(articulo.id);
    await eliminarImagenPropia(articulo.portada);
    return responder(res, 204);
  }

  // imagen: data URL = imagen propia nueva; 'automatica' = volver a la portada del link; otro valor = mantener la actual
  const imagen = req.body?.imagen;
  try {
    const campos = validarArticulo(req.body);
    let portada = articulo.portada;
    if (typeof imagen === 'string' && imagen.startsWith('data:')) {
      portada = await guardarImagenPropia(imagen, articulo.id);
    } else if (imagen === 'automatica' || (campos.link !== articulo.link && !esImagenPropia(articulo.portada))) {
      portada = await obtenerPortada(campos.link);
    }
    const actualizado = await baseDeDatos.actualizar(articulo.id, { ...campos, portada });
    // La imagen anterior se borra recién cuando el artículo ya apunta a la nueva
    if (portada !== articulo.portada) await eliminarImagenPropia(articulo.portada);
    responder(res, 200, actualizado);
  } catch (error) {
    if (error instanceof ErrorDeValidacion) return responder(res, 400, { error: error.message });
    throw error;
  }
};
