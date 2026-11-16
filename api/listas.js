// GET: pestañas disponibles. POST: crear lista. PATCH ?id=: renombrar lista. Crear y renombrar son solo para el administrador.
const { obtenerListas, guardarListas, limpiarNombre, crearId, largoMaximoNombre } = require('../lib/listas');
const { responder, esAdmin } = require('../lib/utilidades');

module.exports = async (req, res) => {
  if (req.method === 'GET') return responder(res, 200, await obtenerListas());
  if (!['POST', 'PATCH'].includes(req.method)) return responder(res, 405, { error: 'Método no permitido' });
  if (!esAdmin(req)) return responder(res, 401, { error: 'Clave de administrador incorrecta' });

  const nombre = limpiarNombre(req.body?.nombre);
  if (!nombre) return responder(res, 400, { error: `El nombre es obligatorio y puede tener hasta ${largoMaximoNombre} caracteres` });
  const listas = await obtenerListas();

  if (req.method === 'POST') {
    const lista = { id: crearId(nombre, listas), nombre };
    await guardarListas([...listas, lista]);
    return responder(res, 201, lista);
  }

  const lista = listas.find(l => l.id === String(req.query.id || ''));
  if (!lista) return responder(res, 404, { error: 'La lista no existe' });
  lista.nombre = nombre;
  await guardarListas(listas);
  responder(res, 200, lista);
};
