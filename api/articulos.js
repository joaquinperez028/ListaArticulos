// GET: lista pública. POST: agregar artículo (solo administrador). La pestaña llega en ?lista=.
const BaseDeDatos = require('../lib/baseDeDatos');
const { obtenerLista } = require('../lib/listas');
const { ErrorDeValidacion, responder, esAdmin, validarArticulo, obtenerPortada, guardarImagenPropia } = require('../lib/utilidades');

module.exports = async (req, res) => {
  const lista = await obtenerLista(req);
  if (!lista) return responder(res, 404, { error: 'La lista no existe' });
  const baseDeDatos = new BaseDeDatos(lista.claveRedis);

  if (req.method === 'GET') return responder(res, 200, await baseDeDatos.listar());
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' });
  if (!esAdmin(req)) return responder(res, 401, { error: 'Clave de administrador incorrecta' });

  const datos = req.body || {};
  const id = Date.now().toString();
  try {
    const campos = validarArticulo(datos);
    const portada = datos.imagen ? await guardarImagenPropia(String(datos.imagen), id) : await obtenerPortada(campos.link);
    responder(res, 201, await baseDeDatos.agregar({ id, ...campos, portada }));
  } catch (error) {
    if (error instanceof ErrorDeValidacion) return responder(res, 400, { error: error.message });
    throw error;
  }
};
