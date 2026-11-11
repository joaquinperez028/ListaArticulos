// GET: lista pública. POST: agregar artículo (solo administrador).
const BaseDeDatos = require('../lib/baseDeDatos');
const { ErrorDeValidacion, responder, esAdmin, esLinkValido, obtenerPortada, guardarImagenPropia } = require('../lib/utilidades');

const baseDeDatos = new BaseDeDatos();

module.exports = async (req, res) => {
  if (req.method === 'GET') return responder(res, 200, await baseDeDatos.listar());
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' });
  if (!esAdmin(req)) return responder(res, 401, { error: 'Clave de administrador incorrecta' });

  const datos = req.body || {};
  const nombre = String(datos.nombre || '').trim();
  const descripcion = String(datos.descripcion || '').trim();
  const link = String(datos.link || '').trim();
  if (!nombre || !esLinkValido(link)) return responder(res, 400, { error: 'Nombre y link http(s) son obligatorios' });

  const id = Date.now().toString();
  let portada;
  try {
    portada = datos.imagen ? await guardarImagenPropia(String(datos.imagen), id) : await obtenerPortada(link);
  } catch (error) {
    if (error instanceof ErrorDeValidacion) return responder(res, 400, { error: error.message });
    throw error;
  }
  responder(res, 201, await baseDeDatos.agregar({ id, nombre, descripcion, link, portada }));
};
