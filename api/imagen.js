// GET: sirve una imagen propia guardada en el store privado de Vercel Blob
const { Readable } = require('stream');
const { get } = require('@vercel/blob');
const { responder } = require('../lib/utilidades');

module.exports = async (req, res) => {
  const ruta = String(req.query.ruta || '');
  if (req.method !== 'GET' || !/^imagenes\/[\w.-]+$/.test(ruta)) return responder(res, 404, { error: 'No encontrado' });

  const resultado = await get(ruta, { access: 'private' });
  if (!resultado) return responder(res, 404, { error: 'No encontrado' });
  res.setHeader('Content-Type', resultado.blob.contentType || 'application/octet-stream');
  // La ruta lleva un sufijo aleatorio y nunca cambia, así que el CDN puede guardarla para siempre
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  Readable.fromWeb(resultado.stream).pipe(res);
};
