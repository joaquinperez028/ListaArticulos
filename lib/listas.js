// Pestañas guardadas en Redis (clave 'listas'). Cada una guarda sus artículos en su propia clave.
const { obtenerRedis } = require('./baseDeDatos');

const claveListas = 'listas';
// La primera lista conserva la clave 'articulos' para no migrar los datos que ya existían
const listaInicial = { id: 'principal', nombre: 'Joaquín' };
const largoMaximoNombre = 60;

function claveRedisDe(id) {
  return id === listaInicial.id ? 'articulos' : `articulos:${id}`;
}

async function obtenerListas() {
  return (await obtenerRedis().get(claveListas)) || [listaInicial];
}

async function guardarListas(listas) {
  await obtenerRedis().set(claveListas, listas);
}

// Devuelve la lista pedida en ?lista= (o la primera si no viene) con su clave de Redis, o null si no existe
async function obtenerLista(req) {
  const listas = await obtenerListas();
  const lista = req.query.lista ? listas.find(l => l.id === String(req.query.lista)) : listas[0];
  return lista ? { ...lista, claveRedis: claveRedisDe(lista.id) } : null;
}

// Valida el nombre; devuelve el texto limpio o null si no sirve
function limpiarNombre(nombre) {
  const limpio = String(nombre || '').trim();
  return limpio && limpio.length <= largoMaximoNombre ? limpio : null;
}

// Crea el id a partir del nombre ("María José" -> "maria-jose") para que el link sea legible
function crearId(nombre, listas) {
  const base = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lista';
  let id = base;
  for (let numero = 2; listas.some(l => l.id === id); numero++) id = `${base}-${numero}`;
  return id;
}

module.exports = { obtenerListas, guardarListas, obtenerLista, limpiarNombre, crearId, largoMaximoNombre };
