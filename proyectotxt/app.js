/* =========================================================================
   Calculadora de Adoquines — lógica del navegador (app.js)

   Responsabilidades:
   1. Leer el formulario y armar un objeto con los datos.
   2. Enviar esos datos a Python (POST /api/calcular) y recibir el resultado.
   3. Mostrar los números en las tarjetas.
   4. Dibujar el "plano" a escala en el lienzo (canvas), con reglas de medida,
      el patrón de adoquines y las piezas de borde sombreadas como cortes.

   IMPORTANTE: los CÁLCULOS los hace Python. Este archivo solo dibuja y muestra.
   ========================================================================= */

// ---------------------------------------------------------------------------
// Catálogo de patrones disponibles según la forma del adoquín.
// 'desp' es el desperdicio sugerido (el usuario lo puede cambiar).
// ---------------------------------------------------------------------------
const PATRONES = {
  rectangulo: [
    { id: "cuadricula", nombre: "Cuadrícula", desp: 5 },
    { id: "soga",       nombre: "Soga",       desp: 8 },
    { id: "espiga",     nombre: "Espiga",     desp: 15 },
    { id: "trenzado",   nombre: "Trenzado",   desp: 10 },
  ],
  cuadrado: [
    { id: "cuadricula", nombre: "Cuadrícula", desp: 5 },
    { id: "diagonal",   nombre: "Diagonal",   desp: 12 },
  ],
  hexagono: [
    { id: "panal",      nombre: "Panal",      desp: 10 },
  ],
};

// Colores de los adoquines en el dibujo (terrosos, para distinguir el patrón).
const COLORES_PIEZA = ["#C8643C", "#D98B5F", "#9A9384", "#B0A48E", "#C9B79A"];
const COLOR_CORTE = "#5C5247";   // piezas de borde (cortadas)
const COLOR_JUNTA = "#16211C";   // color del lienzo (junta entre piezas)
const COLOR_REGLA = "#7FA8AB";   // teal claro para reglas y textos del plano

// ---------------------------------------------------------------------------
// ESTADO de la interfaz: lo que el usuario tiene seleccionado en este momento.
// ---------------------------------------------------------------------------
const estado = {
  sistema: "metrico",
  formaZona: "rectangulo",
  formaPieza: "rectangulo",
  patron: "cuadricula",
  // 'geometria' guarda lo último que Python nos devolvió (medidas en metros)
  // para poder redibujar el plano.
  geometria: null,
};

// Atajos para no escribir document.getElementById todo el tiempo
const $ = (id) => document.getElementById(id);

// ===========================================================================
// 1) LECTURA DEL FORMULARIO  ->  objeto de datos para enviar a Python
// ===========================================================================
function leerFormulario() {
  const datos = {
    sistema: estado.sistema,
    forma_zona: estado.formaZona,
    forma_pieza: estado.formaPieza,
    patron: estado.patron,
    desperdicio: $("desperdicioNum").value,
  };

  // Medidas del terreno según su forma
  if (estado.formaZona === "rectangulo") {
    datos.zona_largo = $("zonaLargo").value;
    datos.zona_ancho = $("zonaAncho").value;
  } else {
    datos.zona_lado = $("zonaLado").value;
  }

  // Medidas del adoquín según su forma
  if (estado.formaPieza === "rectangulo") {
    datos.pieza_largo = $("piezaLargo").value;
    datos.pieza_ancho = $("piezaAncho").value;
  } else {
    datos.pieza_lado = $("piezaLado").value;
  }

  return datos;
}

// ===========================================================================
// 2) LLAMADA A LA API DE PYTHON
// ===========================================================================
async function calcular() {
  const datos = leerFormulario();
  try {
    const resp = await fetch("/api/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const json = await resp.json();

    if (!json.ok) {
      // Python detectó un dato inválido: mostramos el mensaje en el lienzo.
      mostrarError(json.error || "Revisa los datos.");
      return;
    }
    ocultarError();
    estado.geometria = json.geometria;
    pintarResultados(json);
    dibujarPlano();
  } catch (e) {
    // Falló la conexión con el servidor (ej. Flask apagado).
    mostrarError("No se pudo conectar con el servidor de cálculo.");
  }
}

// Llamada "amortiguada": espera a que el usuario deje de teclear un instante
// antes de calcular, para no mandar 20 peticiones por segundo.
let temporizador = null;
function calcularPronto() {
  clearTimeout(temporizador);
  temporizador = setTimeout(calcular, 220);
}

// ===========================================================================
// 3) MOSTRAR LOS RESULTADOS EN LAS TARJETAS
// ===========================================================================
function pintarResultados(r) {
  const u = r.unidades;
  setValor("rArea", r.area_total + " " + u.sup);
  setValor("rMin", formatoMiles(r.cantidad_minima));
  setValor("rRec", formatoMiles(r.cantidad_recomendada));
  setValor("rExtra", "+" + formatoMiles(r.piezas_extra));
  $("rRecFoot").textContent = "incluye " + r.desperdicio_pct + "% de desperdicio";
}

// Cambia el texto y dispara una pequeña animación.
function setValor(id, texto) {
  const el = $(id);
  el.textContent = texto;
  el.classList.remove("is-updated");
  void el.offsetWidth; // truco para reiniciar la animación
  el.classList.add("is-updated");
}

function formatoMiles(n) {
  return Number(n).toLocaleString("es-MX");
}

function mostrarError(msg) {
  const box = $("canvasError");
  box.textContent = "⚠ " + msg;
  box.classList.remove("is-hidden");
}
function ocultarError() {
  $("canvasError").classList.add("is-hidden");
}

// ===========================================================================
// 4) DIBUJO DEL PLANO EN EL LIENZO (canvas)
// ===========================================================================
//
// El lienzo muestra el terreno a escala. Convertimos metros a píxeles con un
// factor "escala" (px por metro). Dejamos márgenes para las reglas de medida.
//
function prepararLienzo(canvas) {
  // Hacemos el dibujo nítido en pantallas de alta densidad (Retina).
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 28; // menos el padding
  const cssH = Math.max(320, Math.round(cssW * 0.6));
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // todo se mide en px CSS
  return { ctx, cssW, cssH };
}

function dibujarPlano() {
  const g = estado.geometria;
  if (!g) return;
  const canvas = $("plano");
  const { ctx, cssW, cssH } = prepararLienzo(canvas);

  // Limpiar
  ctx.clearRect(0, 0, cssW, cssH);

  // Márgenes para las reglas (regla arriba y a la izquierda)
  const M = { top: 38, left: 52, right: 18, bottom: 34 };
  const areaW = cssW - M.left - M.right;
  const areaH = cssH - M.top - M.bottom;

  // Medidas del terreno en metros (largo = horizontal, ancho = vertical)
  const Lm = g.zona.largo_m;
  const Wm = g.zona.ancho_m;

  // Escala: cuántos píxeles equivale 1 metro, eligiendo la que haga caber todo.
  const escala = Math.min(areaW / Lm, areaH / Wm);
  const zonaW = Lm * escala;
  const zonaH = Wm * escala;

  // Centramos el terreno dentro del área disponible
  const zx = M.left + (areaW - zonaW) / 2;
  const zy = M.top + (areaH - zonaH) / 2;
  const zona = { x: zx, y: zy, w: zonaW, h: zonaH };

  // a) rejilla tipo blueprint dentro del terreno
  dibujarRejilla(ctx, zona, escala);

  // b) el patrón de adoquines (recortado al terreno)
  dibujarPatron(ctx, zona, escala, g);

  // c) marco del terreno
  ctx.strokeStyle = COLOR_REGLA;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(zona.x, zona.y, zona.w, zona.h);

  // d) reglas de medida (marcas + etiquetas)
  dibujarReglas(ctx, zona, Lm, Wm);

  // e) barra de escala (ej. "1 m")
  dibujarBarraEscala(ctx, zona, escala, cssH, M);
}

// Rejilla suave de fondo dentro del terreno
function dibujarRejilla(ctx, z, escala) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(z.x, z.y, z.w, z.h);
  ctx.clip();
  ctx.strokeStyle = "rgba(127,168,171,0.12)";
  ctx.lineWidth = 1;
  // Una línea cada metro
  for (let m = 0; m * escala <= z.w; m++) {
    const x = z.x + m * escala;
    ctx.beginPath(); ctx.moveTo(x, z.y); ctx.lineTo(x, z.y + z.h); ctx.stroke();
  }
  for (let m = 0; m * escala <= z.h; m++) {
    const y = z.y + m * escala;
    ctx.beginPath(); ctx.moveTo(z.x, y); ctx.lineTo(z.x + z.w, y); ctx.stroke();
  }
  ctx.restore();
}

// Reglas de dimensión: marcas y etiquetas con la medida real
function dibujarReglas(ctx, z, Lm, Wm) {
  ctx.fillStyle = COLOR_REGLA;
  ctx.strokeStyle = COLOR_REGLA;
  ctx.lineWidth = 1;
  ctx.font = '11px "Space Mono", monospace';

  // Regla superior (largo, horizontal)
  const yR = z.y - 14;
  ctx.beginPath(); ctx.moveTo(z.x, yR); ctx.lineTo(z.x + z.w, yR); ctx.stroke();
  // topes
  marca(ctx, z.x, yR, 4); marca(ctx, z.x + z.w, yR, 4);
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText(Lm.toFixed(2) + " m", z.x + z.w / 2, yR - 4);

  // Regla izquierda (ancho, vertical)
  const xR = z.x - 16;
  ctx.beginPath(); ctx.moveTo(xR, z.y); ctx.lineTo(xR, z.y + z.h); ctx.stroke();
  marcaV(ctx, xR, z.y, 4); marcaV(ctx, xR, z.y + z.h, 4);
  ctx.save();
  ctx.translate(xR - 6, z.y + z.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText(Wm.toFixed(2) + " m", 0, 0);
  ctx.restore();
}
function marca(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); }
function marcaV(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke(); }

// Barra de escala abajo a la derecha
function dibujarBarraEscala(ctx, z, escala, cssH, M) {
  // Elegimos una longitud "redonda" para la barra (1 m si cabe, si no 0.5 m)
  let metros = 1;
  if (escala * 1 > z.w * 0.5) metros = 0.5;
  if (escala * metros < 24) metros = Math.max(metros, Math.ceil(24 / escala));
  const largoPx = escala * metros;
  const x2 = z.x + z.w;
  const y = cssH - 16;
  const x1 = x2 - largoPx;

  ctx.strokeStyle = COLOR_REGLA;
  ctx.fillStyle = COLOR_REGLA;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  marca(ctx, x1, y, 4); marca(ctx, x2, y, 4);
  ctx.font = '10px "Space Mono", monospace';
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText(metros + " m (escala)", x2, y - 5);
}

// ---------------------------------------------------------------------------
// EL DIBUJO DEL PATRÓN
// Recortamos ("clip") al rectángulo del terreno para que las piezas que se
// salen aparezcan cortadas justo en el borde. Antes de recortar, marcamos con
// otro color las piezas que cruzan el borde (esos son los cortes reales).
// ---------------------------------------------------------------------------
function dibujarPatron(ctx, z, escala, g) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(z.x, z.y, z.w, z.h);
  ctx.clip(); // todo lo que dibujemos se ve solo dentro del terreno

  const patron = g.patron;

  if (patron === "panal") {
    dibujarPanal(ctx, z, escala, g.pieza_m.lado);
  } else if (patron === "diagonal") {
    dibujarDiagonal(ctx, z, escala, g.pieza_m.lado);
  } else if (patron === "espiga") {
    dibujarEspiga(ctx, z, escala, g.pieza_m);
  } else if (patron === "trenzado") {
    dibujarTrenzado(ctx, z, escala, g.pieza_m);
  } else if (patron === "soga") {
    dibujarLadrillos(ctx, z, escala, g.pieza_m, true);
  } else {
    dibujarLadrillos(ctx, z, escala, g.pieza_m, false);
  }

  ctx.restore();
}

// Dibuja un rectángulo de adoquín; si cruza el borde del terreno, lo pinta
// como "corte" (color apagado). Devuelve nada; dibuja directamente.
function pieza(ctx, z, x, y, w, h, color) {
  const cruza =
    x < z.x - 0.5 || y < z.y - 0.5 ||
    x + w > z.x + z.w + 0.5 || y + h > z.y + z.h + 0.5;
  ctx.fillStyle = cruza ? COLOR_CORTE : color;
  ctx.fillRect(x, y, w, h);
  // junta (línea entre piezas)
  ctx.strokeStyle = COLOR_JUNTA;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// --- CUADRÍCULA y SOGA (ladrillos rectangulares) ---
// 'desfase' = true produce el patrón de soga (cada fila corrida media pieza).
function dibujarLadrillos(ctx, z, escala, pieza_m, desfase) {
  const pw = pieza_m.largo * escala;
  const ph = pieza_m.ancho * escala;
  if (pw < 2 || ph < 2) return; // piezas demasiado chicas para dibujar
  let fila = 0;
  for (let y = z.y; y < z.y + z.h; y += ph) {
    const corr = desfase && (fila % 2 === 1) ? -pw / 2 : 0;
    for (let x = z.x + corr - pw; x < z.x + z.w + pw; x += pw) {
      const color = COLORES_PIEZA[(fila + Math.round((x - z.x) / pw)) % COLORES_PIEZA.length];
      pieza(ctx, z, x, y, pw, ph, color);
    }
    fila++;
  }
}

// --- ESPIGA 90° (herringbone) ---
// Algoritmo verificado: dos pasadas con desfase (0,0) y (w,-w).
// Cada celda coloca un ladrillo horizontal (2w x w) y uno vertical (w x 2w).
function dibujarEspiga(ctx, z, escala, pieza_m) {
  const w = Math.min(pieza_m.largo, pieza_m.ancho) * escala; // lado corto
  if (w < 3) return;
  const L = 2 * w;
  const pasadas = [[0, 0], [w, -w]];
  // Rango amplio para cubrir todo el terreno aunque empiece "antes"
  const iMin = -4, iMax = Math.ceil((z.w + z.h) / (2 * w)) + 4;
  const jMin = -Math.ceil((z.w + z.h) / (2 * w)) - 4, jMax = Math.ceil((z.w + z.h) / (2 * w)) + 4;
  let n = 0;
  for (const off of pasadas) {
    for (let j = jMin; j <= jMax; j++) {
      for (let i = iMin; i <= iMax; i++) {
        const ox = z.x + i * 2 * w + j * 2 * w + off[0];
        const oy = z.y + i * 2 * w - j * 2 * w + off[1];
        // Solo dibujamos si está cerca del terreno (optimización)
        if (ox > z.x + z.w + L || ox + L < z.x - L) continue;
        if (oy > z.y + z.h + L || oy + L < z.y - L) continue;
        pieza(ctx, z, ox, oy, L, w, COLORES_PIEZA[n % 2 === 0 ? 0 : 2]);
        pieza(ctx, z, ox + L, oy, w, L, COLORES_PIEZA[n % 2 === 0 ? 1 : 3]);
        n++;
      }
    }
  }
}

// --- TRENZADO (basketweave) ---
// Algoritmo verificado: tablero de ajedrez. En celdas pares, dos ladrillos
// horizontales apilados; en impares, dos verticales lado a lado.
function dibujarTrenzado(ctx, z, escala, pieza_m) {
  const w = Math.min(pieza_m.largo, pieza_m.ancho) * escala;
  if (w < 3) return;
  const b = 2 * w; // lado del bloque cuadrado
  let j = 0;
  for (let y = z.y; y < z.y + z.h + b; y += b, j++) {
    let i = 0;
    for (let x = z.x; x < z.x + z.w + b; x += b, i++) {
      if ((i + j) % 2 === 0) {
        pieza(ctx, z, x, y, b, w, COLORES_PIEZA[0]);
        pieza(ctx, z, x, y + w, b, w, COLORES_PIEZA[1]);
      } else {
        pieza(ctx, z, x, y, w, b, COLORES_PIEZA[2]);
        pieza(ctx, z, x + w, y, w, b, COLORES_PIEZA[3]);
      }
    }
  }
}

// --- PANAL (hexágonos, honeycomb) ---
// Algoritmo verificado: hexágonos "punta plana". Columnas separadas 1.5*lado,
// filas separadas √3*lado, columnas alternas desplazadas media fila.
function dibujarPanal(ctx, z, escala, lado_m) {
  const s = lado_m * escala;
  if (s < 4) return;
  const Ht = Math.sqrt(3) * s;
  const cols = Math.ceil(z.w / (1.5 * s)) + 2;
  const rows = Math.ceil(z.h / Ht) + 2;
  for (let col = -1; col <= cols; col++) {
    for (let row = -1; row <= rows; row++) {
      const cx = z.x + col * 1.5 * s;
      const cy = z.y + row * Ht + (Math.abs(col % 2) === 1 ? Ht / 2 : 0);
      dibujarHexagono(ctx, z, cx, cy, s, COLORES_PIEZA[Math.abs(col + row) % COLORES_PIEZA.length]);
    }
  }
}
function dibujarHexagono(ctx, z, cx, cy, s, color) {
  // ¿el hexágono se sale del terreno? -> marcarlo como corte
  let fuera = false;
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 180) * (60 * k); // punta plana
    const px = cx + s * Math.cos(ang);
    const py = cy + s * Math.sin(ang);
    pts.push([px, py]);
    if (px < z.x - 0.5 || px > z.x + z.w + 0.5 || py < z.y - 0.5 || py > z.y + z.h + 0.5) {
      fuera = true;
    }
  }
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = fuera ? COLOR_CORTE : color;
  ctx.fill();
  ctx.strokeStyle = COLOR_JUNTA;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// --- DIAGONAL (cuadrados girados 45°) ---
// Giramos el "lápiz" 45° alrededor del centro del terreno y dibujamos una
// cuadrícula normal. El recorte (clip) ya está puesto al terreno.
function dibujarDiagonal(ctx, z, escala, lado_m) {
  const lado = lado_m * escala;
  if (lado < 3) return;
  const cx = z.x + z.w / 2;
  const cy = z.y + z.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  // dibujamos una malla amplia centrada en el origen girado
  const R = Math.ceil((z.w + z.h) / lado) + 2;
  let c = 0;
  for (let gy = -R; gy <= R; gy++) {
    for (let gx = -R; gx <= R; gx++) {
      const x = gx * lado;
      const y = gy * lado;
      ctx.fillStyle = COLORES_PIEZA[Math.abs(gx + gy) % COLORES_PIEZA.length];
      ctx.fillRect(x, y, lado, lado);
      ctx.strokeStyle = COLOR_JUNTA;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, lado - 1, lado - 1);
      c++;
    }
  }
  ctx.restore();
}

// ===========================================================================
// 5) MINIATURAS DE PATRÓN (los botoncitos del panel)
// ===========================================================================
function construirSelectorPatrones() {
  const cont = $("patronPick");
  cont.innerHTML = "";
  const lista = PATRONES[estado.formaPieza];

  // Si el patrón actual no aplica a la nueva forma, elegimos el primero
  // y aplicamos su desperdicio sugerido (para que la sugerencia sea coherente).
  if (!lista.some((p) => p.id === estado.patron)) {
    estado.patron = lista[0].id;
    aplicarSugerido(lista[0].desp);
  }

  lista.forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "pattern-btn" + (p.id === estado.patron ? " is-active" : "");
    btn.dataset.patron = p.id;
    btn.dataset.desp = p.desp;

    const mini = document.createElement("canvas");
    mini.width = 150; mini.height = 116;
    btn.appendChild(mini);

    const label = document.createElement("span");
    label.textContent = p.nombre;
    btn.appendChild(label);

    cont.appendChild(btn);
    dibujarMiniatura(mini, p.id);

    btn.addEventListener("click", () => {
      estado.patron = p.id;
      document.querySelectorAll("#patronPick .pattern-btn")
        .forEach((b) => b.classList.toggle("is-active", b === btn));
      // Sugerimos el desperdicio típico de ese patrón
      aplicarSugerido(Number(btn.dataset.desp));
      calcular();
    });
  });
}

// Pone el valor de desperdicio sugerido en el deslizador, la caja y la pista.
function aplicarSugerido(d) {
  $("desperdicioRange").value = d;
  $("desperdicioNum").value = d;
  $("desperdicioHint").textContent = "sugerido: " + d + "%";
}

// Dibuja una versión chica de cada patrón en su botón.
function dibujarMiniatura(canvas, patronId) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = COLOR_JUNTA;
  ctx.fillRect(0, 0, W, H);
  const z = { x: 6, y: 6, w: W - 12, h: H - 12 };
  ctx.save();
  ctx.beginPath(); ctx.rect(z.x, z.y, z.w, z.h); ctx.clip();

  if (patronId === "panal") {
    dibujarPanal(ctx, z, 1, 13);
  } else if (patronId === "diagonal") {
    dibujarDiagonal(ctx, z, 1, 22);
  } else if (patronId === "espiga") {
    dibujarEspiga(ctx, z, 1, { largo: 26, ancho: 13 });
  } else if (patronId === "trenzado") {
    dibujarTrenzado(ctx, z, 1, { largo: 26, ancho: 13 });
  } else if (patronId === "soga") {
    dibujarLadrillos(ctx, z, 1, { largo: 34, ancho: 17 }, true);
  } else {
    dibujarLadrillos(ctx, z, 1, { largo: 34, ancho: 17 }, false);
  }
  ctx.restore();
}

// ===========================================================================
// 6) CAMBIOS DE FORMA Y DE UNIDADES
// ===========================================================================

// Mostrar/ocultar los campos de medida según la forma del terreno
function actualizarCamposZona() {
  const esRect = estado.formaZona === "rectangulo";
  $("zonaRect").classList.toggle("is-hidden", !esRect);
  $("zonaCuad").classList.toggle("is-hidden", esRect);
}

// Mostrar/ocultar campos según la forma del adoquín, y reconstruir patrones
function actualizarCamposPieza() {
  const esRect = estado.formaPieza === "rectangulo";
  $("piezaRect").classList.toggle("is-hidden", !esRect);
  $("piezaLadoWrap").classList.toggle("is-hidden", esRect);
  construirSelectorPatrones();
}

// Conversión de valores al cambiar de sistema de unidades.
// Terreno: metros <-> pies (factor 3.28084). Adoquín: cm <-> pulgadas (2.54).
function convertirValores(nuevoSistema) {
  const aImperial = nuevoSistema === "imperial";
  const convArea = (v) => aImperial ? v * 3.28084 : v / 3.28084; // m<->ft
  const convPieza = (v) => aImperial ? v / 2.54 : v * 2.54;       // cm<->in
  const r2 = (v) => Math.round(parseFloat(v) * 100) / 100;

  ["zonaLargo", "zonaAncho", "zonaLado"].forEach((id) => {
    const el = $(id);
    if (el && el.value !== "") el.value = r2(convArea(parseFloat(el.value)));
  });
  ["piezaLargo", "piezaAncho", "piezaLado"].forEach((id) => {
    const el = $(id);
    if (el && el.value !== "") el.value = r2(convPieza(parseFloat(el.value)));
  });
}

// Actualiza las etiquetas de unidad (m/ft y cm/in) en todo el formulario
function actualizarEtiquetasUnidad() {
  const uArea = estado.sistema === "metrico" ? "m" : "ft";
  const uPieza = estado.sistema === "metrico" ? "cm" : "in";
  document.querySelectorAll(".u-area").forEach((s) => (s.textContent = uArea));
  document.querySelectorAll(".u-pieza").forEach((s) => (s.textContent = uPieza));
}

// ===========================================================================
// 7) CONECTAR TODOS LOS CONTROLES (eventos)
// ===========================================================================
function conectarEventos() {
  // Campos numéricos -> recalcular
  ["zonaLargo", "zonaAncho", "zonaLado", "piezaLargo", "piezaAncho", "piezaLado"]
    .forEach((id) => $(id).addEventListener("input", calcularPronto));

  // Forma del terreno
  document.querySelectorAll("#formaZona .seg__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      estado.formaZona = btn.dataset.forma;
      document.querySelectorAll("#formaZona .seg__btn")
        .forEach((b) => b.classList.toggle("is-active", b === btn));
      actualizarCamposZona();
      calcular();
    });
  });

  // Forma del adoquín
  document.querySelectorAll("#formaPieza .shape-pick__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      estado.formaPieza = btn.dataset.forma;
      document.querySelectorAll("#formaPieza .shape-pick__btn")
        .forEach((b) => b.classList.toggle("is-active", b === btn));
      actualizarCamposPieza();
      calcular();
    });
  });

  // Deslizador de desperdicio <-> caja numérica (van sincronizados)
  $("desperdicioRange").addEventListener("input", () => {
    $("desperdicioNum").value = $("desperdicioRange").value;
    calcularPronto();
  });
  $("desperdicioNum").addEventListener("input", () => {
    $("desperdicioRange").value = $("desperdicioNum").value;
    calcularPronto();
  });

  // Interruptor de sistema de unidades
  document.querySelectorAll("#unitToggle .unit-toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nuevo = btn.dataset.sistema;
      if (nuevo === estado.sistema) return;
      convertirValores(nuevo);     // convierte los números que ya estaban
      estado.sistema = nuevo;
      document.querySelectorAll("#unitToggle .unit-toggle__btn")
        .forEach((b) => b.classList.toggle("is-active", b === btn));
      actualizarEtiquetasUnidad();
      calcular();
    });
  });

  // Redibujar el plano si cambia el tamaño de la ventana
  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(dibujarPlano, 150);
  });
}

// ===========================================================================
// ARRANQUE
// ===========================================================================
function iniciar() {
  actualizarCamposZona();
  actualizarCamposPieza();      // también construye el selector de patrones
  actualizarEtiquetasUnidad();
  conectarEventos();
  calcular();                   // primer cálculo y dibujo
}

document.addEventListener("DOMContentLoaded", iniciar);
