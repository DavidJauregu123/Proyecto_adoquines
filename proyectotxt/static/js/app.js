/* =========================================================================
   Calculadora de Adoquines — lógica del navegador (app.js)
   ========================================================================= */

/* -------------------------------------------------------------------------
   PALETA del dibujo
   ------------------------------------------------------------------------- */
const COLORES_PIEZA = ["#C8643C", "#D98B5F", "#9A9384", "#B0A48E", "#C9B79A"];
const VELO_CORTE = "rgba(22, 33, 28, 0.30)";
const RAYA_CORTE = "rgba(251, 250, 246, 0.34)";
const COLOR_JUNTA = "#16211C";
const COLOR_REGLA = "#7FA8AB";

function marcarCorte(ctx, trazar, x0, y0, x1, y1) {
  trazar();
  ctx.fillStyle = VELO_CORTE;
  ctx.fill();
  if (Math.min(x1 - x0, y1 - y0) < 5) return;
  ctx.save();
  trazar();
  ctx.clip();
  ctx.strokeStyle = RAYA_CORTE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const alto = y1 - y0;
  for (let d = x0 - alto; d < x1; d += 5) {
    ctx.moveTo(d, y1);
    ctx.lineTo(d + alto, y0);
  }
  ctx.stroke();
  ctx.restore();
}

function factorMinimoDibujo(minPx, ...dimsPx) {
  const positivas = dimsPx.filter((v) => v > 0 && isFinite(v));
  if (!positivas.length) return 1;
  const menor = Math.min(...positivas);
  return menor < minPx ? minPx / menor : 1;
}

const _DESP_ZONA = { rectangulo: 0, cuadrado: 0, trapecio: 5, triangular: 8, circular: 12, medialuna: 15,
  ele: 6, anillo: 15, ovalo: 10, hexagono: 5 };

function _areaZona(forma, d, conv) {
  const m = v => (parseFloat(v) || 0) * conv;
  if (forma === "rectangulo") return m(d.largo) * m(d.ancho);
  if (forma === "cuadrado")   return m(d.lado) ** 2;
  if (forma === "circular")   return Math.PI * (m(d.diametro) / 2) ** 2;
  if (forma === "triangular") return m(d.base) * m(d.altura) / 2;
  if (forma === "trapecio")   return (m(d.base_mayor) + m(d.base_menor)) / 2 * m(d.altura);
  if (forma === "medialuna")  return Math.PI * (m(d.diametro) / 2) ** 2 / 2;
  if (forma === "ele")        return Math.max(0, m(d.largo) * m(d.ancho) - m(d.corte_largo) * m(d.corte_ancho));
  if (forma === "anillo")     return Math.PI * ((m(d.diametro_ext) / 2) ** 2 - (m(d.diametro_int) / 2) ** 2);
  if (forma === "ovalo")      return Math.PI * (m(d.ancho) / 2) * (m(d.alto) / 2);
  if (forma === "hexagono")   return (3 * Math.sqrt(3) / 2) * m(d.lado) ** 2;
  return 0;
}

function _leerDims(card, prefijo) {
  const d = {};
  card.querySelectorAll(`input[data-campo^="${prefijo}"]`).forEach(inp => {
    d[inp.dataset.campo.slice(prefijo.length)] = parseFloat(inp.value) || 0;
  });
  return d;
}

function calcularDesperdicioAuto(formaZona, patron, card) {
  const base = (PATRONES[patron] || {}).desp || 5;
  const extra = _DESP_ZONA[formaZona] || 0;
  if (!card) return Math.min(base + extra, 60);
  const convZona  = estado.sistema === "imperial" ? 0.3048 : 1;
  const convPieza = estado.sistema === "imperial" ? 0.0254 : 0.01;
  const zonaDims  = _leerDims(card, "zona_");
  const piezaDims = _leerDims(card, "pieza_");
  const area = _areaZona(formaZona, zonaDims, convZona);
  if (!(area > 0)) return Math.min(base + extra, 60);
  const piezaVals = Object.values(piezaDims).filter(v => v > 0);
  const piezaM = piezaVals.length ? Math.min(...piezaVals) * convPieza : 0.15;
  const geo = (piezaM / Math.sqrt(area)) * 250; // % extra por efecto de borde (pieza grande / terreno chico = más corte)
  return Math.max(3, Math.min(Math.round(base + extra + geo), 60));
}

function colorPieza(i) {
  const n = COLORES_PIEZA.length;
  return COLORES_PIEZA[((Math.round(i) % n) + n) % n];
}

/* -------------------------------------------------------------------------
   ICONOS (SVG)
   ------------------------------------------------------------------------- */
const IC = {
  rectangulo: '<svg viewBox="0 0 40 40"><rect x="5" y="14" width="30" height="12" rx="1"/></svg>',
  cuadrado:   '<svg viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20" rx="1"/></svg>',
  hexagono:   '<svg viewBox="0 0 40 40"><polygon points="20,6 32,13 32,27 20,34 8,27 8,13"/></svg>',
  rombo:      '<svg viewBox="0 0 40 40"><polygon points="20,5 35,20 20,35 5,20"/></svg>',
  trapezoide: '<svg viewBox="0 0 40 40"><polygon points="8,28 32,28 25,12 15,12"/></svg>',
  doble_t:    '<svg viewBox="0 0 40 40"><path d="M10 9 h20 v5 h-7 v12 h7 v5 h-20 v-5 h7 v-12 h-7 z"/></svg>',
  doble_s:    '<svg viewBox="0 0 40 40"><path d="M7 17 q4 -7 8 -2 q4 5 8 -2 q4 -7 8 -2 l0 11 q-4 5 -8 0 q-4 -5 -8 0 q-4 5 -8 0 z"/></svg>',
  celosia:    '<svg viewBox="0 0 40 40"><rect x="8" y="8" width="8" height="8"/><rect x="24" y="8" width="8" height="8"/><rect x="16" y="16" width="8" height="8"/><rect x="8" y="24" width="8" height="8"/><rect x="24" y="24" width="8" height="8"/></svg>',
  llave:      '<svg viewBox="0 0 40 40"><rect x="8" y="14" width="18" height="12" rx="1"/><rect x="26" y="17" width="6" height="6"/></svg>',
  gaviota:    '<svg viewBox="0 0 40 40"><path d="M6 27 q6 -13 12 -3 q6 -10 12 -3 q3 4 4 6 l0 4 h-28 z"/></svg>',
  puzzle:     '<svg viewBox="0 0 40 40"><path d="M11 13 h5 a3 3 0 1 1 6 0 h5 v5 a3 3 0 1 1 0 6 v5 h-16 v-5 a3 3 0 1 0 0 -6 z"/></svg>',
  abanico:    '<svg viewBox="0 0 40 40"><path d="M8 29 A16 16 0 0 1 32 29 Z"/></svg>',
  z_rectangulo: '<svg viewBox="0 0 40 40"><rect x="5" y="11" width="30" height="18" rx="1"/></svg>',
  z_cuadrado:   '<svg viewBox="0 0 40 40"><rect x="9" y="9" width="22" height="22" rx="1"/></svg>',
  z_circular:   '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13"/></svg>',
  z_triangular: '<svg viewBox="0 0 40 40"><polygon points="20,7 34,31 6,31"/></svg>',
  z_trapecio:   '<svg viewBox="0 0 40 40"><polygon points="6,30 34,30 27,12 13,12"/></svg>',
  z_medialuna:  '<svg viewBox="0 0 40 40"><path d="M6 15 A16 16 0 0 0 34 15 Z"/></svg>',
  z_ele:        '<svg viewBox="0 0 40 40"><polygon points="7,7 24,7 24,18 33,18 33,33 7,33"/></svg>',
  z_anillo:     '<svg viewBox="0 0 40 40"><path fill-rule="evenodd" d="M20,5 a15,15 0 1,0 0.1,0 Z M20,14 a6,6 0 1,1 -0.1,0 Z"/></svg>',
  z_ovalo:      '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="20" rx="16" ry="10"/></svg>',
  z_hexagono:   '<svg viewBox="0 0 40 40"><polygon points="20,6 33,13 33,27 20,34 7,27 7,13"/></svg>',
};

/* -------------------------------------------------------------------------
   CATÁLOGOS
   ------------------------------------------------------------------------- */
const FORMAS_ZONA = {
  rectangulo: { nombre: "Rectángulo", icon: IC.z_rectangulo,
    campos: [ {k:"largo", et:"Largo", def:5}, {k:"ancho", et:"Ancho", def:4} ] },
  cuadrado:   { nombre: "Cuadrado", icon: IC.z_cuadrado,
    campos: [ {k:"lado", et:"Lado", def:4} ] },
  circular:   { nombre: "Circular", icon: IC.z_circular,
    campos: [ {k:"diametro", et:"Diámetro", def:5} ] },
  triangular: { nombre: "Triangular", icon: IC.z_triangular,
    campos: [ {k:"base", et:"Base", def:6}, {k:"altura", et:"Altura", def:4} ] },
  trapecio:   { nombre: "Trapecio", icon: IC.z_trapecio,
    campos: [ {k:"base_mayor", et:"Base mayor", def:6}, {k:"base_menor", et:"Base menor", def:3}, {k:"altura", et:"Altura", def:4} ] },
  medialuna:  { nombre: "Media luna", icon: IC.z_medialuna,
    campos: [ {k:"diametro", et:"Diámetro", def:6} ] },
  ele:        { nombre: "Forma L", icon: IC.z_ele,
    campos: [ {k:"largo", et:"Largo", def:6}, {k:"ancho", et:"Ancho", def:5}, {k:"corte_largo", et:"Corte largo", def:2.5}, {k:"corte_ancho", et:"Corte ancho", def:2} ] },
  anillo:     { nombre: "Anillo", icon: IC.z_anillo,
    campos: [ {k:"diametro_ext", et:"Diámetro ext.", def:6}, {k:"diametro_int", et:"Diámetro int.", def:2} ] },
  ovalo:      { nombre: "Óvalo", icon: IC.z_ovalo,
    campos: [ {k:"ancho", et:"Ancho", def:6}, {k:"alto", et:"Alto", def:4} ] },
  hexagono:   { nombre: "Hexágono", icon: IC.z_hexagono,
    campos: [ {k:"lado", et:"Lado", def:3} ] },
};

const FORMAS_PIEZA = {
  rectangulo: { nombre:"Rectángulo", icon:IC.rectangulo,
    campos:[ {k:"largo",et:"Largo",def:20}, {k:"ancho",et:"Ancho",def:10} ],
    patrones:["cuadricula","soga","espiga","trenzado"] },
  cuadrado:   { nombre:"Cuadrado", icon:IC.cuadrado,
    campos:[ {k:"lado",et:"Lado",def:10} ], patrones:["cuadricula","diagonal"] },
  hexagono:   { nombre:"Hexágono", icon:IC.hexagono,
    campos:[ {k:"lado",et:"Lado",def:10} ], patrones:["panal"] },
  rombo:      { nombre:"Rombo", icon:IC.rombo,
    campos:[ {k:"diag_mayor",et:"Diag. mayor",def:20}, {k:"diag_menor",et:"Diag. menor",def:12} ],
    patrones:["diamante"] },
  trapezoide: { nombre:"Trapezoide", icon:IC.trapezoide,
    campos:[ {k:"base_mayor",et:"Base mayor",def:20}, {k:"base_menor",et:"Base menor",def:10}, {k:"altura",et:"Altura",def:10} ],
    patrones:["trapecio_hilera"] },
  doble_t:    { nombre:"Doble T", icon:IC.doble_t,
    campos:[ {k:"largo",et:"Largo",def:22}, {k:"ancho",et:"Ancho",def:11} ], patrones:["doble_t"] },
  doble_s:    { nombre:"Doble S", icon:IC.doble_s,
    campos:[ {k:"largo",et:"Largo",def:22}, {k:"ancho",et:"Ancho",def:11} ], patrones:["doble_s"] },
  celosia:    { nombre:"Celosía", icon:IC.celosia,
    campos:[ {k:"lado",et:"Lado",def:30} ], patrones:["celosia"] },
  llave:      { nombre:"Llave", icon:IC.llave,
    campos:[ {k:"largo",et:"Largo",def:20}, {k:"ancho",et:"Ancho",def:12} ], patrones:["llave"] },
  gaviota:    { nombre:"Gaviota", icon:IC.gaviota,
    campos:[ {k:"largo",et:"Largo",def:25}, {k:"ancho",et:"Ancho",def:12} ], patrones:["gaviota"] },
  puzzle:     { nombre:"Puzzle", icon:IC.puzzle,
    campos:[ {k:"lado",et:"Lado",def:12} ], patrones:["puzzle"] },
  abanico:    { nombre:"Abanico", icon:IC.abanico,
    campos:[ {k:"ancho",et:"Ancho",def:15}, {k:"alto",et:"Alto",def:12} ], patrones:["abanico"] },
};

const PATRONES = {
  cuadricula:      {nombre:"Cuadrícula", desp:5},
  soga:            {nombre:"Soga",       desp:8},
  espiga:          {nombre:"Espiga",     desp:15},
  trenzado:        {nombre:"Trenzado",   desp:10},
  diagonal:        {nombre:"Diagonal",   desp:12},
  panal:           {nombre:"Panal",      desp:10},
  diamante:        {nombre:"Diamante",   desp:12},
  trapecio_hilera: {nombre:"Hileras",    desp:12},
  doble_t:         {nombre:"Doble T",    desp:8},
  doble_s:         {nombre:"Doble S",    desp:10},
  celosia:         {nombre:"Celosía",    desp:6},
  llave:           {nombre:"Llave",      desp:10},
  gaviota:         {nombre:"Gaviota",    desp:12},
  puzzle:          {nombre:"Puzzle",     desp:10},
  abanico:         {nombre:"Abanico",    desp:15},
};

/* -------------------------------------------------------------------------
   ESTADO
   ------------------------------------------------------------------------- */
let _zid = 0;
function nuevaZona() {
  return { id: ++_zid, formaZona: "rectangulo", formaPieza: "rectangulo", patron: "cuadricula" };
}

const estado = {
  sistema: "metrico",
  zonas: [nuevaZona()],
  vista: "2d",
  geometrias: null,
};

const $ = (id) => document.getElementById(id);

let ZONA = null;

/* =========================================================================
   1) LECTURA DEL FORMULARIO
   ========================================================================= */
function leerFormulario() {
  return {
    sistema: estado.sistema,
    moneda: $("moneda").value,
    zonas: estado.zonas.map(z => {
      const card = document.querySelector(`.zona-card[data-zona-id="${z.id}"]`);
      const d = { forma_zona: z.formaZona, forma_pieza: z.formaPieza, patron: z.patron };
      card.querySelectorAll("input[data-campo]").forEach(inp => { d[inp.dataset.campo] = inp.value; });
      return d;
    }),
  };
}

/* =========================================================================
   2) LLAMADA A LA API
   ========================================================================= */
async function calcular() {
  estado.zonas.forEach(z => {
    if (z._despTag && z._despTag.className.includes("auto") && z._aplicarSugerencia) {
      z._aplicarSugerencia();
    }
  });
  const datos = leerFormulario();
  try {
    const resp = await fetch("/api/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const json = await resp.json();
    if (!json.ok) { mostrarError(json.error || "Revisa los datos."); return; }
    ocultarError();
    estado.geometrias = json.geometrias;
    pintarResultados(json);
    dibujarPlano();
  } catch (e) {
    mostrarError("No se pudo conectar con el servidor de cálculo.");
  }
}

let temporizador = null;
function calcularPronto() { clearTimeout(temporizador); temporizador = setTimeout(calcular, 220); }

/* =========================================================================
   3) MOSTRAR RESULTADOS
   ========================================================================= */
function pintarResultados(r) {
  const u = r.unidades;
  setValor("rArea", r.area_total + " " + u.sup);
  setValor("rMin", formatoMiles(r.cantidad_minima));
  setValor("rRec", formatoMiles(r.cantidad_recomendada));
  setValor("rExtra", "+" + formatoMiles(r.piezas_extra));
  $("rRecFoot").textContent = "incluye el desperdicio de cada figura";

  const s = r.moneda.simbolo, cod = r.moneda.codigo;

  const strip = $("costStrip");
  if (r.costo_total !== null && r.costo_total !== undefined) {
    $("costTotal").textContent = s + formatoMoneda(r.costo_total) + " " + cod;
    $("costSub").textContent =
      r.zonas_con_precio + " de " + r.zonas_total + " figuras con precio  ·  mínimo " +
      s + formatoMoneda(r.costo_minimo) + " " + cod;
    strip.classList.remove("is-hidden");
  } else {
    strip.classList.add("is-hidden");
  }

  pintarResumenFiguras(r, s, cod);
  pintarResultadosPorZona(r.resumen_figuras);
}

function pintarResumenFiguras(r, s, cod) {
  const cont = $("resumenFiguras");
  cont.innerHTML = "<h3>Resumen por figura</h3>";
  r.resumen_figuras.forEach(f => {
    const nZona = (FORMAS_ZONA[f.forma_zona] || {}).nombre || f.forma_zona;
    const nPieza = (FORMAS_PIEZA[f.forma_pieza] || {}).nombre || f.forma_pieza;
    const row = document.createElement("div");
    row.className = "desglose-item";
    const costoTxt = f.costo_total !== null
      ? s + formatoMoneda(f.costo_total) + " " + cod
      : "sin precio";
    row.innerHTML =
      '<span class="desglose-tipo">Figura ' + f.num + ' · ' + nZona + ' (' + nPieza + ')</span>' +
      '<span class="desglose-recomendada">' + formatoMiles(f.cantidad_recomendada) + ' pzas</span>' +
      '<span class="desglose-extra">' + costoTxt + '</span>';
    cont.appendChild(row);
  });
}

function pintarResultadosPorZona(resumen) {
  resumen.forEach(f => {
    const card = document.querySelector(`.zona-card[data-zona-num="${f.num}"]`);
    if (!card) return;
    const box = card.querySelector("[data-zona-resultado]");
    if (!box) return;
    box.querySelector("[data-r-cant]").textContent = formatoMiles(f.cantidad_recomendada);
    box.querySelector("[data-r-extra]").textContent = "+" + formatoMiles(f.piezas_extra);
    box.querySelector("[data-r-costo]").textContent = f.costo_total !== null
      ? formatoMoneda(f.costo_total)
      : "—";
  });
}

function setValor(id, texto) {
  const el = $(id);
  el.textContent = texto;
  el.classList.remove("is-updated"); void el.offsetWidth; el.classList.add("is-updated");
}
function formatoMiles(n) { return Number(n).toLocaleString("es-MX"); }
function formatoMoneda(n) {
  return Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function mostrarError(msg) { const b = $("canvasError"); b.textContent = "⚠ " + msg; b.classList.remove("is-hidden"); }
function ocultarError() { $("canvasError").classList.add("is-hidden"); }

/* =========================================================================
   4) DIBUJO DEL PLANO
   ========================================================================= */
function prepararLienzo(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 28;
  const cssH = Math.max(340, Math.round(cssW * 0.62));
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, cssW, cssH };
}

function dibujarPlano() {
  const gs = estado.geometrias;
  if (!gs || !gs.length) return;
  if (estado.vista === "2.5d") {
    dibujarPlano2_5D(gs);
  } else {
    dibujarPlano2D(gs);
  }
}

function dibujarPlano2D(geometrias) {
  const canvas = $("plano");
  const { ctx, cssW, cssH } = prepararLienzo(canvas);
  ctx.clearRect(0, 0, cssW, cssH);

  const M = { top: 40, left: 54, right: 20, bottom: 36 };
  const areaW = cssW - M.left - M.right;
  const areaH = cssH - M.top - M.bottom;

  const GAP_M = 0.5;
  const totalL = geometrias.reduce((s, g) => s + g.bbox_m.largo, 0) + GAP_M * (geometrias.length - 1);
  const maxA = Math.max(...geometrias.map(g => g.bbox_m.ancho));
  const escala = Math.min(areaW / totalL, areaH / maxA);

  const totalPx = totalL * escala;
  const maxPx = maxA * escala;
  let ox = M.left + (areaW - totalPx) / 2;
  const baseY = M.top + (areaH - maxPx) / 2;

  for (const g of geometrias) {
    const zW = g.bbox_m.largo * escala, zH = g.bbox_m.ancho * escala;
    const bbox = { x: ox, y: baseY + (maxPx - zH) / 2, w: zW, h: zH };
    ZONA = construirZona(g.forma_zona, g.zona_m, escala, bbox);

    ctx.save(); ctx.clip(ZONA.path);
    dibujarRejilla(ctx, bbox, escala);
    ctx.restore();

    ctx.save(); ctx.clip(ZONA.path);
    try { dibujarPatron(ctx, bbox, escala, g); }
    catch (e) { console.error("Error dibujando patrón:", g.patron, e); }
    ctx.restore();

    ctx.strokeStyle = COLOR_REGLA; ctx.lineWidth = 1.6; ctx.stroke(ZONA.path);
    ox += zW + GAP_M * escala;
  }

  const allBbox = { x: M.left + (areaW - totalPx) / 2, y: baseY, w: totalPx, h: maxPx };
  dibujarBarraEscala(ctx, allBbox, escala, cssH);
}

function dibujarPlano2_5D(geometrias) {
  const canvas = $("plano");
  const { ctx, cssW, cssH } = prepararLienzo(canvas);
  ctx.clearRect(0, 0, cssW, cssH);

  const M = { top: 60, left: 60, right: 60, bottom: 40 };
  const areaW = cssW - M.left - M.right;
  const areaH = cssH - M.top - M.bottom;

  const GAP_M = 0.5;
  const totalL = geometrias.reduce((s, g) => s + g.bbox_m.largo, 0) + GAP_M * (geometrias.length - 1);
  const maxA = Math.max(...geometrias.map(g => g.bbox_m.ancho));
  const escala = Math.min(
    areaW / ((totalL + maxA) * 0.866),
    areaH / ((totalL + maxA) * 0.5)
  );

  const cx = cssW / 2;
  const cy = M.top + areaH / 2;
  const GAP_PX = GAP_M * escala;

  const totalPxL = geometrias.reduce((s, g) => s + g.bbox_m.largo * escala, 0) + GAP_PX * (geometrias.length - 1);
  let ox = -totalPxL / 2;
  const bboxes = geometrias.map(g => {
    const zW = g.bbox_m.largo * escala, zH = g.bbox_m.ancho * escala;
    const b = { x: ox, y: -zH / 2, w: zW, h: zH };
    ox += zW + GAP_PX;
    return b;
  });

  bboxes.forEach((bbox, i) => {
    const g = geometrias[i];
    ZONA = construirZona(g.forma_zona, g.zona_m, escala, bbox);
    const extPx = Math.max(5, Math.min(bbox.w, bbox.h) * 0.03);
    ctx.save();
    ctx.transform(0.866, 0.5, -0.866, 0.5, cx, cy + extPx);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill(ZONA.path);
    ctx.restore();
  });

  bboxes.forEach((bbox, i) => {
    const g = geometrias[i];
    ZONA = construirZona(g.forma_zona, g.zona_m, escala, bbox);
    ctx.save();
    ctx.transform(0.866, 0.5, -0.866, 0.5, cx, cy);
    ctx.save(); ctx.clip(ZONA.path);
    try { dibujarPatron(ctx, bbox, escala, g); }
    catch (e) { console.error("Error dibujando patrón:", g.patron, e); }
    ctx.restore();
    ctx.strokeStyle = COLOR_REGLA; ctx.lineWidth = 1.6; ctx.stroke(ZONA.path);
    ctx.restore();
  });

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "11px var(--font-mono)";
  ctx.textAlign = "center";
  ctx.fillText("Perspectiva isométrica", cssW / 2, cssH - 8);
}

/* -------------------------------------------------------------------------
   CONSTRUCCIÓN DE LA ZONA
   ------------------------------------------------------------------------- */
function construirZona(forma, zm, escala, bb) {
  const path = new Path2D();
  const cx = bb.x + bb.w / 2;
  let test;

  if (forma === "rectangulo" || forma === "cuadrado") {
    path.rect(bb.x, bb.y, bb.w, bb.h);
    const EPS = 0.01; // ponytail: tolerancia a error de punto flotante en sumas repetidas de pw/ph
    test = (px, py) => px >= bb.x - EPS && px <= bb.x + bb.w + EPS && py >= bb.y - EPS && py <= bb.y + bb.h + EPS;

  } else if (forma === "circular") {
    const r = bb.w / 2, cyc = bb.y + bb.h / 2;
    path.arc(cx, cyc, r, 0, Math.PI * 2);
    test = (px, py) => ((px - cx) ** 2 + (py - cyc) ** 2) <= r * r;

  } else if (forma === "triangular") {
    const A = [cx, bb.y], B = [bb.x, bb.y + bb.h], C = [bb.x + bb.w, bb.y + bb.h];
    trazarPoligono(path, [A, B, C]);
    test = (px, py) => puntoEnPoligono(px, py, [A, B, C]);

  } else if (forma === "trapecio") {
    const bmay = zm.base_mayor * escala, bmen = zm.base_menor * escala;
    const yb = bb.y + bb.h, yt = bb.y;
    const pts = [[cx - bmay/2, yb], [cx + bmay/2, yb], [cx + bmen/2, yt], [cx - bmen/2, yt]];
    trazarPoligono(path, pts);
    test = (px, py) => puntoEnPoligono(px, py, pts);

  } else if (forma === "medialuna") {
    const r = bb.w / 2, yt = bb.y;
    path.moveTo(cx + r, yt);
    path.arc(cx, yt, r, 0, Math.PI);
    path.closePath();
    test = (px, py) => (((px - cx) ** 2 + (py - yt) ** 2) <= r * r) && (py >= yt);

  } else if (forma === "ele") {
    const cutW = Math.min((zm.corte_largo || 0) * escala, bb.w * 0.95);
    const cutH = Math.min((zm.corte_ancho || 0) * escala, bb.h * 0.95);
    const pts = [
      [bb.x, bb.y], [bb.x + bb.w - cutW, bb.y], [bb.x + bb.w - cutW, bb.y + cutH],
      [bb.x + bb.w, bb.y + cutH], [bb.x + bb.w, bb.y + bb.h], [bb.x, bb.y + bb.h],
    ];
    trazarPoligono(path, pts);
    test = (px, py) => puntoEnPoligono(px, py, pts);

  } else if (forma === "anillo") {
    const cyc = bb.y + bb.h / 2;
    const rExt = bb.w / 2;
    const rInt = rExt * ((zm.diametro_int || 0) / (zm.diametro_ext || 1));
    path.arc(cx, cyc, rExt, 0, Math.PI * 2);
    path.moveTo(cx + rInt, cyc);
    path.arc(cx, cyc, rInt, 0, Math.PI * 2, true); // sentido inverso: crea el hueco (regla nonzero)
    test = (px, py) => {
      const d2 = (px - cx) ** 2 + (py - cyc) ** 2;
      return d2 <= rExt * rExt && d2 >= rInt * rInt;
    };

  } else if (forma === "ovalo") {
    const rx = bb.w / 2, ry = bb.h / 2, cyc = bb.y + ry;
    path.ellipse(cx, cyc, rx, ry, 0, 0, Math.PI * 2);
    test = (px, py) => ((px - cx) ** 2) / (rx * rx) + ((py - cyc) ** 2) / (ry * ry) <= 1;

  } else if (forma === "hexagono") {
    const r = bb.w / 2, cyc = bb.y + bb.h / 2;
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const ang = (Math.PI / 180) * (60 * k);
      pts.push([cx + r * Math.cos(ang), cyc + r * Math.sin(ang)]);
    }
    trazarPoligono(path, pts);
    test = (px, py) => puntoEnPoligono(px, py, pts);

  } else {
    path.rect(bb.x, bb.y, bb.w, bb.h);
    test = () => true;
  }
  return { path, test, bb };
}

function trazarPoligono(path, pts) {
  pts.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
  path.closePath();
}
function puntoEnPoligono(px, py, pts) {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    const cruza = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/* -------------------------------------------------------------------------
   Rejilla, reglas y barra de escala
   ------------------------------------------------------------------------- */
function dibujarRejilla(ctx, z, escala) {
  ctx.strokeStyle = "rgba(127,168,171,0.12)";
  ctx.lineWidth = 1;
  for (let m = 0; m * escala <= z.w + 0.5; m++) {
    const x = z.x + m * escala;
    ctx.beginPath(); ctx.moveTo(x, z.y); ctx.lineTo(x, z.y + z.h); ctx.stroke();
  }
  for (let m = 0; m * escala <= z.h + 0.5; m++) {
    const y = z.y + m * escala;
    ctx.beginPath(); ctx.moveTo(z.x, y); ctx.lineTo(z.x + z.w, y); ctx.stroke();
  }
}

function marca(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); }

function dibujarBarraEscala(ctx, z, escala, cssH) {
  let metros = 1;
  if (escala * 1 > z.w * 0.5) metros = 0.5;
  if (escala * metros < 24) metros = Math.max(metros, Math.ceil(24 / escala));
  const largoPx = escala * metros;
  const x2 = z.x + z.w, y = cssH - 16, x1 = x2 - largoPx;
  ctx.strokeStyle = COLOR_REGLA; ctx.fillStyle = COLOR_REGLA; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  marca(ctx, x1, y, 4); marca(ctx, x2, y, 4);
  ctx.font = '10px "Space Mono", monospace';
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText(metros + " m (escala)", x2, y - 5);
}

/* =========================================================================
   5) EL PATRÓN — enrutador
   ========================================================================= */
function dibujarPatron(ctx, z, escala, g) {
  const p = g.patron, pm = g.pieza_m;
  switch (p) {
    case "panal":           dibujarPanal(ctx, z, escala, pm.lado); break;
    case "diagonal":        dibujarDiagonal(ctx, z, escala, pm.lado); break;
    case "espiga":          dibujarEspiga(ctx, z, escala, pm); break;
    case "trenzado":        dibujarTrenzado(ctx, z, escala, pm); break;
    case "soga":            dibujarLadrillos(ctx, z, escala, pm, true); break;
    case "diamante":        dibujarRombo(ctx, z, escala, pm); break;
    case "trapecio_hilera": dibujarTrapezoide(ctx, z, escala, pm); break;
    case "celosia":         dibujarCelosia(ctx, z, escala, pm.lado); break;
    case "abanico":         dibujarAbanico(ctx, z, escala, pm); break;
    case "doble_t":         dibujarTile(ctx, z, escala, pm, "doble_t"); break;
    case "doble_s":         dibujarTile(ctx, z, escala, pm, "doble_s"); break;
    case "llave":           dibujarTile(ctx, z, escala, pm, "llave"); break;
    case "gaviota":         dibujarTile(ctx, z, escala, pm, "gaviota"); break;
    case "puzzle":          dibujarTile(ctx, z, escala, pm, "puzzle"); break;
    default:                dibujarLadrillos(ctx, z, escala, pm, false);
  }
}

function dibujarPoligonoPieza(ctx, pts, color) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [px, py] of pts) {
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (py < minY) minY = py; if (py > maxY) maxY = py;
  }
  const bb = ZONA.bb;
  if (bb && (maxX < bb.x || minX > bb.x + bb.w || maxY < bb.y || minY > bb.y + bb.h)) return;
  let completa = true;
  for (const [px, py] of pts) {
    if (!ZONA.test(px, py)) { completa = false; break; }
  }
  const trazar = () => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  };
  trazar();
  ctx.fillStyle = color;
  ctx.fill();
  if (!completa) marcarCorte(ctx, trazar, minX, minY, maxX, maxY);
  trazar();
  ctx.strokeStyle = COLOR_JUNTA; ctx.lineWidth = 1; ctx.stroke();
}

function pieza(ctx, x, y, w, h, color) {
  const bb = ZONA.bb;
  if (bb && (x + w < bb.x || x > bb.x + bb.w || y + h < bb.y || y > bb.y + bb.h)) return;
  let completa = true;
  if (bb) {
    const vertices = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
    for (const [vx, vy] of vertices) {
      if (!ZONA.test(vx, vy)) {
        completa = false;
        break;
      }
    }
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  if (!completa) {
    marcarCorte(ctx, () => { ctx.beginPath(); ctx.rect(x, y, w, h); }, x, y, x + w, y + h);
  }
  ctx.strokeStyle = COLOR_JUNTA; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function dibujarLadrillos(ctx, z, escala, pm, desfase) {
  let pw = (pm.largo || pm.lado) * escala, ph = (pm.ancho || pm.lado) * escala;
  if (!(pw > 0) || !(ph > 0)) return;
  const f = factorMinimoDibujo(3, pw, ph);
  pw *= f; ph *= f;
  let fila = 0;
  for (let y = z.y; y < z.y + z.h; y += ph) {
    const corr = desfase && (fila % 2 === 1) ? -pw / 2 : 0;
    for (let x = z.x + corr - pw; x < z.x + z.w + pw; x += pw) {
      pieza(ctx, x, y, pw, ph, colorPieza(fila + (x - z.x) / pw));
    }
    fila++;
  }
}

function dibujarEspiga(ctx, z, escala, pm) {
  let w = Math.min(pm.largo || pm.lado, pm.ancho || pm.lado) * escala;
  if (!(w > 0)) return;
  w *= factorMinimoDibujo(4, w);
  const L = 2 * w;
  const pasadas = [[0, 0], [w, -w]];
  const rango = Math.ceil((z.w + z.h) / (2 * w)) + 4;
  let n = 0;
  for (const off of pasadas) {
    for (let j = -rango; j <= rango; j++) {
      for (let i = -4; i <= rango; i++) {
        const ox = z.x + i * 2 * w + j * 2 * w + off[0];
        const oy = z.y + i * 2 * w - j * 2 * w + off[1];
        if (ox > z.x + z.w + L || ox + L < z.x - L) continue;
        if (oy > z.y + z.h + L || oy + L < z.y - L) continue;
        pieza(ctx, ox, oy, L, w, COLORES_PIEZA[n % 2 === 0 ? 0 : 2]);
        pieza(ctx, ox + L, oy, w, L, COLORES_PIEZA[n % 2 === 0 ? 1 : 3]);
        n++;
      }
    }
  }
}

function dibujarTrenzado(ctx, z, escala, pm) {
  let w = Math.min(pm.largo || pm.lado, pm.ancho || pm.lado) * escala;
  if (!(w > 0)) return;
  w *= factorMinimoDibujo(3, w);
  const b = 2 * w;
  let j = 0;
  for (let y = z.y; y < z.y + z.h + b; y += b, j++) {
    let i = 0;
    for (let x = z.x; x < z.x + z.w + b; x += b, i++) {
      if ((i + j) % 2 === 0) {
        pieza(ctx, x, y, b, w, COLORES_PIEZA[0]);
        pieza(ctx, x, y + w, b, w, COLORES_PIEZA[1]);
      } else {
        pieza(ctx, x, y, w, b, COLORES_PIEZA[2]);
        pieza(ctx, x + w, y, w, b, COLORES_PIEZA[3]);
      }
    }
  }
}

function dibujarPanal(ctx, z, escala, lado_m) {
  let s = lado_m * escala;
  if (!(s > 0)) return;
  s *= factorMinimoDibujo(4, s);
  const Ht = Math.sqrt(3) * s;
  const cols = Math.ceil(z.w / (1.5 * s)) + 2;
  const rows = Math.ceil(z.h / Ht) + 2;
  for (let col = -1; col <= cols; col++) {
    for (let row = -1; row <= rows; row++) {
      const cx = z.x + col * 1.5 * s;
      const cy = z.y + row * Ht + (Math.abs(col % 2) === 1 ? Ht / 2 : 0);
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 180) * (60 * k);
        pts.push([cx + s * Math.cos(ang), cy + s * Math.sin(ang)]);
      }
      dibujarPoligonoPieza(ctx, pts, COLORES_PIEZA[Math.abs(col + row) % COLORES_PIEZA.length]);
    }
  }
}

function dibujarDiagonal(ctx, z, escala, lado_m) {
  let lado = lado_m * escala;
  if (!(lado > 0)) return;
  lado *= factorMinimoDibujo(4, lado);
  const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
  const ang = Math.PI / 4, cosA = Math.cos(ang), sinA = Math.sin(ang);
  const rot = (x, y) => [cx + (x - cx) * cosA - (y - cy) * sinA,
                         cy + (x - cx) * sinA + (y - cy) * cosA];
  const R = Math.ceil((z.w + z.h) / lado) + 2;
  for (let gy = -R; gy <= R; gy++) {
    for (let gx = -R; gx <= R; gx++) {
      const x = cx + gx * lado, y = cy + gy * lado;
      const pts = [rot(x, y), rot(x + lado, y), rot(x + lado, y + lado), rot(x, y + lado)];
      dibujarPoligonoPieza(ctx, pts, COLORES_PIEZA[Math.abs(gx + gy) % COLORES_PIEZA.length]);
    }
  }
}

function dibujarRombo(ctx, z, escala, pm) {
  let p = pm.diag_mayor * escala, q = pm.diag_menor * escala;
  if (!(p > 0) || !(q > 0)) return;
  const f = factorMinimoDibujo(4, p, q);
  p *= f; q *= f;
  const cols = Math.ceil(z.w / (p / 2)) + 3;
  const rows = Math.ceil(z.h / (q / 2)) + 3;
  for (let row = -2; row <= rows; row++) {
    for (let col = -2; col <= cols; col++) {
      if ((row + col) % 2 !== 0) continue;
      const ccx = z.x + col * (p / 2);
      const ccy = z.y + row * (q / 2);
      const pts = [[ccx - p/2, ccy], [ccx, ccy - q/2], [ccx + p/2, ccy], [ccx, ccy + q/2]];
      dibujarPoligonoPieza(ctx, pts, COLORES_PIEZA[Math.abs(col + row) % COLORES_PIEZA.length]);
    }
  }
}

function dibujarTrapezoide(ctx, z, escala, pm) {
  let A = pm.base_mayor * escala, B = pm.base_menor * escala, h = pm.altura * escala;
  if (!(A > 0) || !(B > 0) || !(h > 0)) return;
  const f = factorMinimoDibujo(4, A, B, h);
  A *= f; B *= f; h *= f;
  const U = [[0, h], [A, h], [(A + B) / 2, 0], [(A - B) / 2, 0]];
  const m = [(A + (A + B) / 2) / 2, h / 2];
  const V = U.map(([x, y]) => [2 * m[0] - x, 2 * m[1] - y]);
  const u = [A + B, 0], s = [(A - B) / 2, -h];
  const nY = Math.ceil(z.h / h) + 3;
  const desplazX = Math.abs(s[0]) * nY;
  const nX = Math.ceil((z.w + desplazX) / (A + B)) + 3;
  for (let mF = -nY; mF <= nY; mF++) {
    for (let nF = -nX; nF <= nX; nF++) {
      const ox = z.x + nF * u[0] + mF * s[0];
      const oy = z.y + nF * u[1] + mF * s[1];
      if (ox > z.x + z.w + (A + B) || ox + (A + B) < z.x - (A + B)) continue;
      if (oy > z.y + z.h + h * 2 || oy + h < z.y - h * 2) continue;
      dibujarPoligonoPieza(ctx, U.map(([x, y]) => [ox + x, oy + y]), COLORES_PIEZA[Math.abs(nF + mF) % COLORES_PIEZA.length]);
      dibujarPoligonoPieza(ctx, V.map(([x, y]) => [ox + x, oy + y]), COLORES_PIEZA[Math.abs(nF + mF + 2) % COLORES_PIEZA.length]);
    }
  }
}

function dibujarCelosia(ctx, z, escala, lado_m) {
  let s = lado_m * escala;
  if (!(s > 0)) return;
  s *= factorMinimoDibujo(6, s);
  for (let y = z.y; y < z.y + z.h; y += s) {
    for (let x = z.x; x < z.x + z.w; x += s) {
      const completa = ZONA.test(x, y) && ZONA.test(x + s, y) &&
                       ZONA.test(x, y + s) && ZONA.test(x + s, y + s);
      ctx.fillStyle = colorPieza((x - z.x) / s + (y - z.y) / s);
      ctx.fillRect(x, y, s, s);
      if (!completa) {
        marcarCorte(ctx, () => { ctx.beginPath(); ctx.rect(x, y, s, s); }, x, y, x + s, y + s);
      }
      ctx.strokeStyle = COLOR_JUNTA; ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
      if (completa) {
        const m = s * 0.16, hueco = (s - 2 * m - s * 0.1) / 2, gap = s * 0.1;
        ctx.fillStyle = COLOR_JUNTA;
        for (let a = 0; a < 2; a++)
          for (let b = 0; b < 2; b++)
            ctx.fillRect(x + m + a * (hueco + gap), y + m + b * (hueco + gap), hueco, hueco);
      }
    }
  }
}

function dibujarAbanico(ctx, z, escala, pm) {
  let w = pm.ancho * escala, h = pm.alto * escala;
  if (!(w > 0) || !(h > 0)) return;
  const f = factorMinimoDibujo(4, w, h);
  w *= f; h *= f;
  const avance = h / 2;
  let fila = 0;
  // filas de abajo hacia arriba: cada curva debe pintarse ENCIMA del borde
  // recto de la fila de abajo, si no, la tapa y se ve como ladrillo cuadrado
  for (let cy = z.y + z.h; cy > z.y - h - avance; cy -= avance, fila++) {
    const offset = (fila % 2 === 0) ? 0 : w / 2;
    for (let cx = z.x - w + offset; cx < z.x + z.w + w; cx += w) {
      if (cx + w / 2 < z.x || cx - w / 2 > z.x + z.w) continue;
      const completa = ZONA.test(cx - w / 2, cy) && ZONA.test(cx + w / 2, cy) &&
                       ZONA.test(cx - w / 2, cy + h) && ZONA.test(cx + w / 2, cy + h);
      const trazar = () => {
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, cy);
        ctx.lineTo(cx + w / 2, cy);
        ctx.lineTo(cx + w / 2, cy + h * 0.35);
        ctx.ellipse(cx, cy + h * 0.35, w / 2, h * 0.65, 0, 0, Math.PI);
        ctx.lineTo(cx - w / 2, cy);
        ctx.closePath();
      };
      trazar();
      ctx.fillStyle = colorPieza(fila + (cx - z.x) / w);
      ctx.fill();
      if (!completa) marcarCorte(ctx, trazar, cx - w / 2, cy, cx + w / 2, cy + h);
      trazar();
      ctx.strokeStyle = COLOR_JUNTA; ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

function dibujarTile(ctx, z, escala, pm, tipo) {
  let cw = (pm.largo || pm.lado) * escala, ch = (pm.ancho || pm.lado) * escala;
  if (!(cw > 0) || !(ch > 0)) return;
  const f = factorMinimoDibujo(8, cw, ch);
  cw *= f; ch *= f;
  const { edgeH, edgeV } = bordesDe(tipo, cw, ch);
  const ns = 18;
  const cols = Math.ceil(z.w / cw) + 3, rows = Math.ceil(z.h / ch) + 3;
  for (let j = -2; j <= rows; j++) {
    for (let i = -2; i <= cols; i++) {
      const ox = z.x + i * cw, oy = z.y + j * ch;
      const pts = celda(ox, oy, cw, ch, edgeH, edgeV, ns);
      dibujarPoligonoPieza(ctx, pts, COLORES_PIEZA[Math.abs(i + j) % COLORES_PIEZA.length]);
    }
  }
}

function celda(ox, oy, cw, ch, edgeH, edgeV, ns) {
  const pts = [];
  for (let k = 0; k <= ns; k++) { const t = k / ns; pts.push([ox + t * cw, oy + edgeH(t)]); }
  for (let k = 1; k <= ns; k++) { const t = k / ns; pts.push([ox + cw + edgeV(t), oy + t * ch]); }
  for (let k = ns - 1; k >= 0; k--) { const t = k / ns; pts.push([ox + t * cw, oy + ch + edgeH(t)]); }
  for (let k = ns - 1; k >= 1; k--) { const t = k / ns; pts.push([ox + edgeV(t), oy + t * ch]); }
  return pts;
}

function bumpRound(t, c, wdt, amp, sign) {
  const d = Math.abs(t - c);
  if (d >= wdt) return 0;
  return amp * sign * 0.5 * (1 + Math.cos(Math.PI * d / wdt));
}

function bumpFlat(t, c, wdt, amp, sign) {
  const d = Math.abs(t - c);
  if (d >= wdt) return 0;
  const ramp = wdt * 0.4;
  if (d <= wdt - ramp) return amp * sign;
  return amp * sign * (wdt - d) / ramp;
}

function bordesDe(tipo, cw, ch) {
  if (tipo === "puzzle") {
    const knob = 0.20 * Math.min(cw, ch);
    return { edgeH: (t) => bumpRound(t, 0.5, 0.18, knob, -1), edgeV: (t) => bumpRound(t, 0.5, 0.18, knob, +1) };
  }
  if (tipo === "doble_s") {
    const amp = 0.16 * ch;
    return { edgeH: (t) => amp * Math.sin(2 * Math.PI * t), edgeV: (t) => amp * Math.sin(2 * Math.PI * t) };
  }
  if (tipo === "gaviota") {
    const amp = 0.22 * ch;
    return { edgeH: (t) => -amp * Math.abs(Math.sin(2 * Math.PI * t)), edgeV: () => 0 };
  }
  if (tipo === "llave") {
    const tab = 0.20 * cw;
    return { edgeH: () => 0, edgeV: (t) => bumpFlat(t, 0.5, 0.20, tab, +1) };
  }
  const tabH = 0.16 * ch, tabV = 0.13 * cw;
  return {
    edgeH: (t) => bumpFlat(t, 0.28, 0.13, tabH, -1) + bumpFlat(t, 0.72, 0.13, tabH, -1),
    edgeV: (t) => bumpFlat(t, 0.5, 0.16, tabV, +1),
  };
}

/* =========================================================================
   6) UI DE ZONAS
   ========================================================================= */
function renderZonaList() {
  const list = $("zonaList");
  list.innerHTML = "";
  estado.zonas.forEach((z, i) => list.appendChild(crearZonaCard(z, i + 1)));
  const addBtn = document.createElement("button");
  addBtn.className = "zona-add";
  addBtn.textContent = "+ Agregar zona";
  addBtn.addEventListener("click", () => {
    estado.zonas.push(nuevaZona());
    renderZonaList();
    calcular();
  });
  list.appendChild(addBtn);
}

function crearZonaCard(zona, num) {
  const card = document.createElement("div");
  card.className = "zona-card";
  card.dataset.zonaId = zona.id;
  card.dataset.zonaNum = num;

  const head = document.createElement("div");
  head.className = "zona-card__head";
  const label = document.createElement("span");
  label.className = "zona-card__label";
  label.textContent = "Zona " + num;
  const delBtn = document.createElement("button");
  delBtn.className = "zona-del";
  delBtn.textContent = "×";
  delBtn.disabled = estado.zonas.length === 1;
  delBtn.addEventListener("click", () => {
    estado.zonas = estado.zonas.filter(z => z.id !== zona.id);
    renderZonaList();
    calcular();
  });
  head.appendChild(label);
  head.appendChild(delBtn);
  card.appendChild(head);

  const body = document.createElement("div");
  body.className = "zona-card__body";

  const lblFZ = document.createElement("span");
  lblFZ.className = "zona-sub";
  lblFZ.textContent = "Forma del terreno";
  body.appendChild(lblFZ);

  const pickerZona = document.createElement("div");
  pickerZona.className = "shape-pick shape-pick--zona";
  body.appendChild(pickerZona);

  const dimsZona = document.createElement("div");
  dimsZona.className = "dims-host";
  body.appendChild(dimsZona);

  construirSelectorFormas(pickerZona, FORMAS_ZONA, () => zona.formaZona, (id) => {
    zona.formaZona = id;
    marcarActivo(pickerZona, id);
    renderDims(dimsZona, id, FORMAS_ZONA, "zona_", "u-area");
    if (zona._aplicarSugerencia) zona._aplicarSugerencia();
    calcular();
  });
  renderDims(dimsZona, zona.formaZona, FORMAS_ZONA, "zona_", "u-area");

  const lblFP = document.createElement("span");
  lblFP.className = "zona-sub";
  lblFP.textContent = "Forma del adoquín";
  body.appendChild(lblFP);

  const scrollPieza = document.createElement("div");
  scrollPieza.className = "shape-scroll";
  const pickerPieza = document.createElement("div");
  pickerPieza.className = "shape-pick";
  scrollPieza.appendChild(pickerPieza);
  body.appendChild(scrollPieza);

  const dimsPieza = document.createElement("div");
  dimsPieza.className = "dims-host";
  body.appendChild(dimsPieza);

  const lblPat = document.createElement("span");
  lblPat.className = "zona-sub";
  lblPat.textContent = "Patrón";
  body.appendChild(lblPat);

  const patronCont = document.createElement("div");
  patronCont.className = "pattern-pick";
  body.appendChild(patronCont);

  construirSelectorFormas(pickerPieza, FORMAS_PIEZA, () => zona.formaPieza, (id) => {
    zona.formaPieza = id;
    marcarActivo(pickerPieza, id);
    renderDims(dimsPieza, id, FORMAS_PIEZA, "pieza_", "u-pieza");
    renderPatronesZona(patronCont, zona);
    if (zona._aplicarSugerencia) zona._aplicarSugerencia();
    calcular();
  });
  renderDims(dimsPieza, zona.formaPieza, FORMAS_PIEZA, "pieza_", "u-pieza");
  renderPatronesZona(patronCont, zona);

  const lblDesp = document.createElement("span");
  lblDesp.className = "zona-sub";
  lblDesp.textContent = "Desperdicio";
  body.appendChild(lblDesp);

  const despWrap = document.createElement("label");
  despWrap.className = "field";
  const despSpan = document.createElement("span");
  despSpan.className = "field__label";
  despSpan.textContent = "Margen por cortes y roturas";
  const despRow = document.createElement("div");
  despRow.className = "slider-row";
  const despRange = document.createElement("input");
  despRange.type = "range"; despRange.min = "0"; despRange.max = "60"; despRange.step = "1";
  despRange.value = calcularDesperdicioAuto(zona.formaZona, zona.patron);
  const despValWrap = document.createElement("div");
  despValWrap.className = "slider-row__val";
  const despNum = document.createElement("input");
  despNum.type = "number"; despNum.min = "0"; despNum.max = "60"; despNum.step = "1";
  despNum.value = calcularDesperdicioAuto(zona.formaZona, zona.patron);
  despNum.dataset.campo = "desperdicio";
  const despPct = document.createElement("span");
  despPct.textContent = "%";
  despValWrap.appendChild(despNum); despValWrap.appendChild(despPct);
  const despTag = document.createElement("span");
  despTag.className = "desp-tag desp-tag--auto";
  despTag.textContent = "Sugerido: " + despRange.value + "%";
  despRange.addEventListener("input", () => {
    despNum.value = despRange.value;
    despTag.textContent = "Personalizado: " + despRange.value + "%";
    despTag.className = "desp-tag desp-tag--custom";
    calcularPronto();
  });
  despNum.addEventListener("input", () => {
    despRange.value = despNum.value;
    despTag.textContent = "Personalizado: " + despNum.value + "%";
    despTag.className = "desp-tag desp-tag--custom";
    calcularPronto();
  });
  despRow.appendChild(despRange); despRow.appendChild(despValWrap);
  despWrap.appendChild(despSpan); despWrap.appendChild(despTag); despWrap.appendChild(despRow);
  body.appendChild(despWrap);
  zona._despRange = despRange; zona._despNum = despNum; zona._despTag = despTag;

  function aplicarSugerencia() {
    const v = calcularDesperdicioAuto(zona.formaZona, zona.patron, card);
    despRange.value = v; despNum.value = v;
    despTag.textContent = "Sugerido: " + v + "%";
    despTag.className = "desp-tag desp-tag--auto";
  }
  zona._aplicarSugerencia = aplicarSugerencia;
  aplicarSugerencia();

  card.addEventListener("input", (e) => {
    const campo = e.target.dataset.campo || "";
    if ((campo.startsWith("zona_") || campo.startsWith("pieza_")) &&
        despTag.className.includes("auto")) {
      aplicarSugerencia();
      calcularPronto();
    }
  });

  const lblPrecio = document.createElement("span");
  lblPrecio.className = "zona-sub";
  lblPrecio.textContent = "Precio por pieza";
  body.appendChild(lblPrecio);

  const precioWrap = document.createElement("label");
  precioWrap.className = "field";
  const precioSpan = document.createElement("span");
  precioSpan.className = "field__label";
  precioSpan.textContent = "Costo de 1 adoquín (opcional)";
  const precioInp = document.createElement("input");
  precioInp.type = "number"; precioInp.min = "0"; precioInp.step = "0.01"; precioInp.placeholder = "ej. 12.50";
  precioInp.dataset.campo = "precio_pieza";
  precioInp.addEventListener("input", calcularPronto);
  precioWrap.appendChild(precioSpan); precioWrap.appendChild(precioInp);
  body.appendChild(precioWrap);

  const resBox = document.createElement("div");
  resBox.className = "zona-resultado";
  resBox.setAttribute("data-zona-resultado", "");
  resBox.innerHTML =
    '<span>Piezas: <b data-r-cant>—</b> <em data-r-extra>—</em></span>' +
    '<span>Costo: <b data-r-costo>—</b></span>';
  body.appendChild(resBox);

  card.appendChild(body);
  return card;
}

function renderPatronesZona(cont, zona) {
  cont.innerHTML = "";
  const lista = FORMAS_PIEZA[zona.formaPieza].patrones;
  if (!lista.includes(zona.patron)) zona.patron = lista[0];
  lista.forEach(pid => {
    const info = PATRONES[pid];
    const btn = document.createElement("button");
    btn.className = "pattern-btn" + (pid === zona.patron ? " is-active" : "");
    const mini = document.createElement("canvas");
    mini.width = 150; mini.height = 104;
    btn.appendChild(mini);
    const lbl = document.createElement("span");
    lbl.textContent = info.nombre;
    btn.appendChild(lbl);
    cont.appendChild(btn);
    dibujarMiniatura(mini, pid);
    btn.addEventListener("click", () => {
      zona.patron = pid;
      cont.querySelectorAll(".pattern-btn").forEach(b => b.classList.toggle("is-active", b === btn));
      if (zona._despRange && zona._despNum) {
        if (zona._aplicarSugerencia) zona._aplicarSugerencia();
      }
      calcular();
    });
  });
}

/* =========================================================================
   7) SELECTORES COMPARTIDOS
   ========================================================================= */
function construirSelectorFormas(cont, catalogo, getActual, onPick) {
  cont.innerHTML = "";
  Object.entries(catalogo).forEach(([id, info]) => {
    const btn = document.createElement("button");
    btn.className = "shape-pick__btn" + (id === getActual() ? " is-active" : "");
    btn.dataset.forma = id;
    btn.innerHTML = info.icon + "<span>" + info.nombre + "</span>";
    btn.addEventListener("click", () => onPick(id, cont));
    cont.appendChild(btn);
  });
}

function marcarActivo(cont, id) {
  cont.querySelectorAll(".shape-pick__btn")
    .forEach((b) => b.classList.toggle("is-active", b.dataset.forma === id));
}

function renderDims(cont, forma, catalogo, prefijo, claseU) {
  cont.innerHTML = "";
  const campos = catalogo[forma].campos;
  const uTxt = claseU === "u-area"
    ? (estado.sistema === "metrico" ? "m" : "ft")
    : (estado.sistema === "metrico" ? "cm" : "in");
  const step = claseU === "u-area" ? "0.01" : "0.1";

  const wrap = document.createElement("div");
  wrap.className = "dims" + (campos.length === 2 ? " dims--pair" : "");

  campos.forEach((c) => {
    const lab = document.createElement("label");
    lab.className = "field" + (campos.length === 2 ? " field--inline" : "");
    const span = document.createElement("span");
    span.className = "field__label";
    span.innerHTML = c.et + ' (<span class="' + claseU + '">' + uTxt + "</span>)";
    const inp = document.createElement("input");
    inp.type = "number"; inp.min = "0"; inp.step = step; inp.value = c.def;
    inp.dataset.campo = prefijo + c.k;
    inp.addEventListener("input", calcularPronto);
    lab.appendChild(span); lab.appendChild(inp);
    wrap.appendChild(lab);
  });
  cont.appendChild(wrap);
}

function dibujarMiniatura(canvas, patronId) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = COLOR_JUNTA; ctx.fillRect(0, 0, W, H);
  const z = { x: 5, y: 5, w: W - 10, h: H - 10 };
  const path = new Path2D(); path.rect(z.x, z.y, z.w, z.h);
  ZONA = { path, test: (px, py) => px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h, bb: z };
  ctx.save(); ctx.clip(path);
  const e = 1;
  const demo = {
    cuadricula: () => dibujarLadrillos(ctx, z, e, { largo: 34, ancho: 17 }, false),
    soga:       () => dibujarLadrillos(ctx, z, e, { largo: 34, ancho: 17 }, true),
    espiga:     () => dibujarEspiga(ctx, z, e, { largo: 26, ancho: 13 }),
    trenzado:   () => dibujarTrenzado(ctx, z, e, { largo: 24, ancho: 12 }),
    diagonal:   () => dibujarDiagonal(ctx, z, e, 22),
    panal:      () => dibujarPanal(ctx, z, e, 13),
    diamante:   () => dibujarRombo(ctx, z, e, { diag_mayor: 34, diag_menor: 22 }),
    trapecio_hilera: () => dibujarTrapezoide(ctx, z, e, { base_mayor: 34, base_menor: 18, altura: 18 }),
    celosia:    () => dibujarCelosia(ctx, z, e, 30),
    abanico:    () => dibujarAbanico(ctx, z, e, { ancho: 26, alto: 20 }),
    doble_t:    () => dibujarTile(ctx, z, e, { largo: 34, ancho: 22 }, "doble_t"),
    doble_s:    () => dibujarTile(ctx, z, e, { largo: 34, ancho: 22 }, "doble_s"),
    llave:      () => dibujarTile(ctx, z, e, { largo: 34, ancho: 22 }, "llave"),
    gaviota:    () => dibujarTile(ctx, z, e, { largo: 40, ancho: 22 }, "gaviota"),
    puzzle:     () => dibujarTile(ctx, z, e, { largo: 28, ancho: 28 }, "puzzle"),
  };
  (demo[patronId] || demo.cuadricula)();
  ctx.restore();
}

/* =========================================================================
   8) UNIDADES
   ========================================================================= */
function convertirValores(nuevoSistema) {
  const aImperial = nuevoSistema === "imperial";
  const convArea = (v) => aImperial ? v * 3.28084 : v / 3.28084;
  const convPieza = (v) => aImperial ? v / 2.54 : v * 2.54;
  const r2 = (v) => Math.round(parseFloat(v) * 100) / 100;
  document.querySelectorAll(".zona-card input[data-campo^='zona_']").forEach((el) => {
    if (el.value !== "") el.value = r2(convArea(parseFloat(el.value)));
  });
  document.querySelectorAll(".zona-card input[data-campo^='pieza_']").forEach((el) => {
    if (el.value !== "") el.value = r2(convPieza(parseFloat(el.value)));
  });
}

function actualizarEtiquetasUnidad() {
  const uArea = estado.sistema === "metrico" ? "m" : "ft";
  const uPieza = estado.sistema === "metrico" ? "cm" : "in";
  document.querySelectorAll(".u-area").forEach((s) => (s.textContent = uArea));
  document.querySelectorAll(".u-pieza").forEach((s) => (s.textContent = uPieza));
}

/* =========================================================================
   9) EVENTOS
   ========================================================================= */
function conectarEventos() {
  $("moneda").addEventListener("change", calcular);

  document.querySelectorAll("#unitToggle .unit-toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nuevo = btn.dataset.sistema;
      if (nuevo === estado.sistema) return;
      convertirValores(nuevo);
      estado.sistema = nuevo;
      document.querySelectorAll("#unitToggle .unit-toggle__btn")
        .forEach((b) => b.classList.toggle("is-active", b === btn));
      actualizarEtiquetasUnidad();
      calcular();
    });
  });

  document.querySelectorAll("#viewToggle .view-toggle__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nueva = btn.dataset.vista;
      if (nueva === estado.vista) return;
      estado.vista = nueva;
      document.querySelectorAll("#viewToggle .view-toggle__btn")
        .forEach((b) => b.classList.toggle("is-active", b === btn));
      dibujarPlano();
    });
  });

  let rt = null;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(dibujarPlano, 150); });
}

/* =========================================================================
   ARRANQUE
   ========================================================================= */
function iniciar() {
  renderZonaList();
  actualizarEtiquetasUnidad();
  conectarEventos();
  calcular();
}

document.addEventListener("DOMContentLoaded", iniciar);
