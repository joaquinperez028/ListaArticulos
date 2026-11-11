// Migración única: copia articulos.json e imagenes/ locales a Upstash Redis y Vercel Blob.
// Uso: `npx vercel env pull .env.local` y después `npm run migrar`.
const fs = require('fs');
const path = require('path');
const BaseDeDatos = require('../lib/baseDeDatos');
const { subirImagen, extensionesPorTipo } = require('../lib/utilidades');

const raiz = path.join(__dirname, '..');
const tiposPorExtension = Object.fromEntries(Object.entries(extensionesPorTipo).map(([tipo, extension]) => [extension, tipo]));

async function migrar() {
  const baseDeDatos = new BaseDeDatos();
  const existentes = await baseDeDatos.listar();
  if (existentes.length && !process.argv.includes('--forzar')) {
    throw new Error(`La base ya tiene ${existentes.length} artículos. Usá --forzar para reemplazarlos.`);
  }

  const articulos = JSON.parse(fs.readFileSync(path.join(raiz, 'articulos.json'), 'utf8'));
  for (const articulo of articulos) {
    if (articulo.portada?.startsWith('/imagenes/')) {
      const rutaLocal = path.join(raiz, articulo.portada);
      const extension = path.extname(rutaLocal).slice(1);
      articulo.portada = await subirImagen(articulo.portada.slice(1), fs.readFileSync(rutaLocal), tiposPorExtension[extension]);
      console.log(`Imagen subida: ${articulo.nombre}`);
    }
  }
  await baseDeDatos.guardar(articulos);
  console.log(`Migrados ${articulos.length} artículos.`);
}

migrar().catch(error => {
  console.error(error.message);
  process.exit(1);
});
