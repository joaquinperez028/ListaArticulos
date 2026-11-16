// DELETE: eliminar artículo y su imagen propia (solo administrador). La pestaña llega en ?lista=.
const BaseDeDatos = require('../../lib/baseDeDatos');
const { obtenerLista } = require('../../lib/listas');
const { responder, esAdmin, eliminarImagenPropia } = require('../../lib/utilidades');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') return responder(res, 405, { error: 'Método no permitido' });
  if (!esAdmin(req)) return responder(res, 401, { error: 'Clave de administrador incorrecta' });
  const lista = await obtenerLista(req);
  if (!lista) return responder(res, 404, { error: 'La lista no existe' });
  const baseDeDatos = new BaseDeDatos(lista.claveRedis);

  const articulo = await baseDeDatos.buscar(req.query.id);
  if (!articulo) return responder(res, 404, { error: 'No encontrado' });
  await baseDeDatos.eliminar(articulo.id);
  await eliminarImagenPropia(articulo.portada);
  responder(res, 204);
};
