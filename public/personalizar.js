// Personalización visual por lista: colores, fuente, tamaños e imágenes decorativas.
// El estilo se aplica para todos los visitantes; el panel solo se usa en modo administrador.
// Usa listaActual y claveAdmin, definidas en el script de index.html.

const panelEstilo = document.getElementById('panelEstilo');
const capaDecoraciones = document.getElementById('decoraciones');
const controlesDecoracion = document.getElementById('controlesDecoracion');
const miniaturasDecoracion = document.getElementById('miniaturasDecoracion');
const variablesColor = { fondo: '--fondo', tarjeta: '--tarjeta', texto: '--texto', suave: '--suave', acento: '--acento' };
const unidades = { tamanoTexto: 'px', radio: 'px', anchoTarjeta: 'px', ancho: 'px', radio_decoracion: '%', rotacion: '°' };

let estiloGuardado = null;  // lo que está en el servidor
let estiloEditado = null;   // copia que modifica el panel; null cuando el panel está cerrado
let estiloPredeterminado = null;
let fuentesDisponibles = {};
let idDecoracionSeleccionada = null;

async function cargarEstilo() {
  const datos = await (await fetch(`/api/estilo?lista=${listaActual}`)).json();
  fuentesDisponibles = datos.fuentes;
  estiloPredeterminado = datos.predeterminado;
  estiloGuardado = datos.estilo;
  aplicarEstilo(estiloGuardado);
}

function cargarFuenteGoogle(fuente) {
  if (!fuente.google || document.querySelector(`link[data-fuente="${fuente.google}"]`)) return;
  const enlace = Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: `https://fonts.googleapis.com/css2?family=${fuente.google}&display=swap`,
  });
  enlace.dataset.fuente = fuente.google;
  document.head.append(enlace);
}

function aplicarEstilo(estilo) {
  const raiz = document.documentElement.style;
  // Un color en null deja el del tema claro/oscuro definido en el CSS
  for (const [clave, variable] of Object.entries(variablesColor)) {
    if (estilo.colores[clave]) raiz.setProperty(variable, estilo.colores[clave]);
    else raiz.removeProperty(variable);
  }
  const fuente = fuentesDisponibles[estilo.fuente] || fuentesDisponibles.sistema;
  cargarFuenteGoogle(fuente);
  raiz.setProperty('--fuente', fuente.css);
  raiz.setProperty('--tamanoTexto', `${estilo.tamanoTexto}px`);
  raiz.setProperty('--radio', `${estilo.radio}px`);
  raiz.setProperty('--anchoTarjeta', `${estilo.anchoTarjeta}px`);
  dibujarDecoraciones(estilo.decoraciones);
}

function estiloDeDecoracion(imagen, decoracion) {
  Object.assign(imagen.style, {
    left: `${decoracion.x}%`,
    top: `${decoracion.y}px`,
    width: `${decoracion.ancho}px`,
    opacity: decoracion.opacidad,
    borderRadius: `${decoracion.radio}%`,
    transform: `rotate(${decoracion.rotacion}deg)`,
    zIndex: decoracion.delante ? 2 : 0,
  });
}

function dibujarDecoraciones(decoraciones) {
  capaDecoraciones.classList.toggle('editando', Boolean(estiloEditado));
  capaDecoraciones.replaceChildren(...decoraciones.map(decoracion => {
    const imagen = Object.assign(document.createElement('img'), { src: decoracion.url, alt: '', draggable: false });
    imagen.dataset.id = decoracion.id;
    imagen.classList.toggle('seleccionada', decoracion.id === idDecoracionSeleccionada);
    estiloDeDecoracion(imagen, decoracion);
    imagen.onpointerdown = evento => empezarArrastre(evento, imagen, decoracion);
    return imagen;
  }));
  dibujarMiniaturas();
}

// Una miniatura por imagen en el panel, para elegir cualquiera aunque en la página quede tapada o sea muy chica
function dibujarMiniaturas() {
  if (!estiloEditado) return miniaturasDecoracion.replaceChildren();
  miniaturasDecoracion.replaceChildren(...estiloEditado.decoraciones.map((decoracion, indice) => {
    const boton = Object.assign(document.createElement('button'), { type: 'button', title: `Imagen ${indice + 1}` });
    boton.setAttribute('aria-label', `Imagen ${indice + 1}`);
    boton.setAttribute('aria-pressed', String(decoracion.id === idDecoracionSeleccionada));
    boton.style.backgroundImage = `url("${decoracion.url}")`;
    boton.onclick = () => {
      seleccionarDecoracion(decoracion.id);
      capaDecoraciones.querySelector(`[data-id="${decoracion.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    return boton;
  }));
}

// Arrastrar: x se guarda en % del ancho de la página e y en píxeles, así se adapta a pantallas de otro ancho
function empezarArrastre(evento, imagen, decoracion) {
  if (!estiloEditado) return;
  evento.preventDefault();
  seleccionarDecoracion(decoracion.id);
  imagen.setPointerCapture(evento.pointerId);
  const inicio = { x: evento.pageX, y: evento.pageY, decoracionX: decoracion.x, decoracionY: decoracion.y };
  const anchoPagina = capaDecoraciones.clientWidth;
  imagen.onpointermove = movimiento => {
    decoracion.x = Math.min(150, Math.max(-50, inicio.decoracionX + (movimiento.pageX - inicio.x) / anchoPagina * 100));
    decoracion.y = Math.max(0, inicio.decoracionY + movimiento.pageY - inicio.y);
    estiloDeDecoracion(imagen, decoracion);
  };
  imagen.onpointerup = imagen.onpointercancel = () => { imagen.onpointermove = null; };
}

function decoracionSeleccionada() {
  return estiloEditado?.decoraciones.find(decoracion => decoracion.id === idDecoracionSeleccionada);
}

function seleccionarDecoracion(id) {
  idDecoracionSeleccionada = id;
  for (const imagen of capaDecoraciones.children) imagen.classList.toggle('seleccionada', imagen.dataset.id === id);
  miniaturasDecoracion.querySelectorAll('button').forEach((boton, indice) => {
    boton.setAttribute('aria-pressed', String(estiloEditado?.decoraciones[indice]?.id === id));
  });
  const decoracion = decoracionSeleccionada();
  controlesDecoracion.hidden = !decoracion;
  if (!decoracion) return;
  for (const control of controlesDecoracion.querySelectorAll('[data-decoracion]')) {
    const campo = control.dataset.decoracion;
    if (control.type === 'checkbox') control.checked = decoracion[campo];
    else control.value = decoracion[campo];
    mostrarValor(control, campo === 'radio' ? 'radio_decoracion' : campo);
  }
}

function mostrarValor(control, campo) {
  const salida = control.parentElement.querySelector('output');
  if (!salida) return;
  salida.textContent = campo === 'opacidad' ? `${Math.round(control.value * 100)}%` : `${control.value}${unidades[campo] || ''}`;
}

// Un color en null se muestra con el valor actual del tema, porque <input type=color> necesita un valor
function llenarPanel() {
  const selectorFuente = document.getElementById('estiloFuente');
  selectorFuente.replaceChildren(...Object.entries(fuentesDisponibles).map(([id, fuente]) => {
    cargarFuenteGoogle(fuente);
    const opcion = Object.assign(document.createElement('option'), { value: id, textContent: fuente.nombre });
    opcion.style.fontFamily = fuente.css;
    return opcion;
  }));
  selectorFuente.value = estiloEditado.fuente;
  for (const control of panelEstilo.querySelectorAll('[data-campo]')) {
    control.value = estiloEditado[control.dataset.campo];
    mostrarValor(control, control.dataset.campo);
  }
  const colores = getComputedStyle(document.documentElement);
  for (const control of panelEstilo.querySelectorAll('[data-color]')) {
    control.value = estiloEditado.colores[control.dataset.color] || colores.getPropertyValue(variablesColor[control.dataset.color]).trim();
  }
  seleccionarDecoracion(idDecoracionSeleccionada);
}

function abrirPanelEstilo() {
  estiloEditado = structuredClone(estiloGuardado);
  idDecoracionSeleccionada = null;
  panelEstilo.hidden = false;
  aplicarEstilo(estiloEditado);
  llenarPanel();
}

function cerrarPanelEstilo() {
  estiloEditado = null;
  idDecoracionSeleccionada = null;
  panelEstilo.hidden = true;
}

// Descarta los cambios sin guardar; también lo llama index.html al salir del modo administrador
function cancelarEdicionEstilo() {
  if (!estiloEditado) return;
  cerrarPanelEstilo();
  aplicarEstilo(estiloGuardado);
}

async function pedirEstilo(metodo, cuerpo) {
  const respuesta = await fetch(`/api/estilo?lista=${listaActual}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-clave-admin': claveAdmin },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error);
  return datos;
}

// Las imágenes nuevas se suben recién al guardar, así cancelar no deja archivos sueltos en Blob
async function guardarEstiloEditado() {
  const botonGuardar = document.getElementById('guardarEstilo');
  botonGuardar.disabled = true;
  botonGuardar.textContent = 'Guardando...';
  try {
    for (const decoracion of estiloEditado.decoraciones) {
      if (decoracion.url.startsWith('data:')) decoracion.url = (await pedirEstilo('POST', { imagen: decoracion.url })).url;
    }
    estiloGuardado = await pedirEstilo('PUT', estiloEditado);
    cerrarPanelEstilo();
    aplicarEstilo(estiloGuardado);
  } catch (error) {
    alert(error.message);
  } finally {
    botonGuardar.disabled = false;
    botonGuardar.textContent = 'Guardar';
  }
}

// desplazamiento: separa en diagonal las imágenes agregadas juntas para que no queden apiladas
function agregarDecoracion(archivo, desplazamiento = 0) {
  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(archivo.type)) return alert(`${archivo.name}: la imagen debe ser PNG, JPG, GIF o WEBP`);
  if (archivo.size > 3 * 1024 * 1024) return alert(`${archivo.name}: la imagen no puede superar 3 MB`);
  if (estiloEditado.decoraciones.length >= 30) return alert('Se pueden agregar hasta 30 imágenes por lista');
  const id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const lector = new FileReader();
  lector.onload = () => {
    const decoracion = {
      id, url: lector.result,
      x: 5 + desplazamiento * 6, y: Math.round(scrollY + 120 + desplazamiento * 40), ancho: 200, opacidad: 1, radio: 0, rotacion: 0, delante: false,
    };
    estiloEditado.decoraciones.push(decoracion);
    idDecoracionSeleccionada = decoracion.id;
    dibujarDecoraciones(estiloEditado.decoraciones);
    seleccionarDecoracion(decoracion.id);
  };
  lector.readAsDataURL(archivo);
}

document.getElementById('abrirPanelEstilo').onclick = abrirPanelEstilo;
document.getElementById('cerrarPanelEstilo').onclick = cancelarEdicionEstilo;
document.getElementById('cancelarEstilo').onclick = cancelarEdicionEstilo;
document.getElementById('guardarEstilo').onclick = guardarEstiloEditado;

document.getElementById('restablecerEstilo').onclick = () => {
  // Vuelve a los valores de fábrica pero conserva las imágenes; no se guarda hasta tocar Guardar
  estiloEditado = { ...structuredClone(estiloPredeterminado), decoraciones: estiloEditado.decoraciones };
  aplicarEstilo(estiloEditado);
  llenarPanel();
};

document.getElementById('coloresDelTema').onclick = () => {
  for (const clave of Object.keys(estiloEditado.colores)) estiloEditado.colores[clave] = null;
  aplicarEstilo(estiloEditado);
  llenarPanel();
};

document.getElementById('estiloFuente').onchange = evento => {
  estiloEditado.fuente = evento.target.value;
  aplicarEstilo(estiloEditado);
};

for (const control of panelEstilo.querySelectorAll('[data-campo]')) {
  control.oninput = () => {
    estiloEditado[control.dataset.campo] = Number(control.value);
    mostrarValor(control, control.dataset.campo);
    aplicarEstilo(estiloEditado);
  };
}

for (const control of panelEstilo.querySelectorAll('[data-color]')) {
  control.oninput = () => {
    estiloEditado.colores[control.dataset.color] = control.value;
    aplicarEstilo(estiloEditado);
  };
}

for (const control of controlesDecoracion.querySelectorAll('[data-decoracion]')) {
  control.oninput = () => {
    const decoracion = decoracionSeleccionada();
    if (!decoracion) return;
    const campo = control.dataset.decoracion;
    decoracion[campo] = control.type === 'checkbox' ? control.checked : Number(control.value);
    mostrarValor(control, campo === 'radio' ? 'radio_decoracion' : campo);
    const imagen = capaDecoraciones.querySelector(`[data-id="${decoracion.id}"]`);
    if (imagen) estiloDeDecoracion(imagen, decoracion);
  };
}

document.getElementById('eliminarDecoracion').onclick = () => {
  estiloEditado.decoraciones = estiloEditado.decoraciones.filter(decoracion => decoracion.id !== idDecoracionSeleccionada);
  idDecoracionSeleccionada = null;
  dibujarDecoraciones(estiloEditado.decoraciones);
  seleccionarDecoracion(null);
};

document.getElementById('nuevaDecoracion').onchange = evento => {
  [...evento.target.files].forEach(agregarDecoracion);
  evento.target.value = '';
};
