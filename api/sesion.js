// POST: verifica la clave de administrador antes de mostrar el formulario
const { responder, esAdmin } = require('../lib/utilidades');

module.exports = (req, res) => {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' });
  if (!esAdmin(req)) return responder(res, 401, { error: 'Clave de administrador incorrecta' });
  responder(res, 204);
};
