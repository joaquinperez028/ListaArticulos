// Capa de datos sobre Upstash Redis. Lee UPSTASH_REDIS_REST_URL/TOKEN (o KV_REST_API_URL/TOKEN) que carga Vercel.
const { Redis } = require('@upstash/redis');

// shortcut: toda la lista vive en una sola clave; dos escrituras simultáneas pueden pisarse. Alcanza con un solo administrador.
const claveLista = 'articulos';

class BaseDeDatos {
  constructor(redis = Redis.fromEnv()) {
    this.redis = redis;
  }

  async listar() {
    return (await this.redis.get(claveLista)) || [];
  }

  async buscar(id) {
    return (await this.listar()).find(articulo => articulo.id === id);
  }

  async agregar(articulo) {
    const articulos = await this.listar();
    articulos.unshift(articulo);
    await this.guardar(articulos);
    return articulo;
  }

  async eliminar(id) {
    await this.guardar((await this.listar()).filter(articulo => articulo.id !== id));
  }

  async guardar(articulos) {
    await this.redis.set(claveLista, articulos);
  }
}

module.exports = BaseDeDatos;
