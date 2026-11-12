// Servidor para desarrollo local: imita a Vercel sirviendo public/ y las funciones de api/.
// Antes de usarlo: `npx vercel env pull .env.local` para traer las credenciales de Redis y Blob.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { responder } = require('./lib/utilidades');

const puerto = process.env.PORT || 3000;
const rutas = [
  [/^\/api\/articulos$/, require('./api/articulos')],
  [/^\/api\/articulos\/(\w+)$/, require('./api/articulos/[id]')],
  [/^\/api\/sesion$/, require('./api/sesion')],
  [/^\/api\/imagen$/, require('./api/imagen')],
];

async function manejarPedido(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'public', 'index.html')).pipe(res);
  }

  for (const [patron, funcion] of rutas) {
    const coincidencia = patron.exec(url.pathname);
    if (!coincidencia) continue;
    // Vercel entrega req.query y req.body ya armados; acá se arman a mano
    req.query = { ...Object.fromEntries(url.searchParams), id: coincidencia[1] };
    let cuerpo = '';
    for await (const trozo of req) {
      cuerpo += trozo;
      if (cuerpo.length > 4.5 * 1024 * 1024) return responder(res, 413, { error: 'El pedido es demasiado grande' });
    }
    try { req.body = cuerpo ? JSON.parse(cuerpo) : undefined; } catch { return responder(res, 400, { error: 'JSON inválido' }); }
    return funcion(req, res);
  }

  responder(res, 404, { error: 'No encontrado' });
}

http.createServer((req, res) => {
  manejarPedido(req, res).catch(error => {
    console.error(error);
    responder(res, 500, { error: 'Error del servidor' });
  });
}).listen(puerto, () => console.log(`ListaArticulos en http://localhost:${puerto}`));
