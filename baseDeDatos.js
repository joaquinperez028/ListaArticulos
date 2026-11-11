// Capa de datos. shortcut: guarda todo en un archivo JSON, cambiar por una base real (SQLite, Postgres) manteniendo estos métodos.
const fs = require('fs');

class BaseDeDatos {
  constructor(rutaArchivo) {
    this.rutaArchivo = rutaArchivo;
  }

  listar() {
    try { return JSON.parse(fs.readFileSync(this.rutaArchivo, 'utf8')); } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error; // un JSON corrupto no se pisa con una lista vacía
    }
  }

  agregar(articulo) {
    const articulos = this.listar();
    articulos.unshift(articulo);
    this.guardar(articulos);
    return articulo;
  }

  eliminar(id) {
    this.guardar(this.listar().filter(articulo => articulo.id !== id));
  }

  // Escribe a un temporal y renombra, así un corte a mitad no deja el archivo roto
  guardar(articulos) {
    const rutaTemporal = this.rutaArchivo + '.tmp';
    fs.writeFileSync(rutaTemporal, JSON.stringify(articulos, null, 2));
    fs.renameSync(rutaTemporal, this.rutaArchivo);
  }
}

module.exports = BaseDeDatos;
