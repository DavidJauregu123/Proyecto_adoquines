# -*- coding: utf-8 -*-
"""
Calculadora Inteligente de Adoquines
=====================================

Este archivo es el "cerebro" de la aplicación. Aquí vive TODA la lógica de
cálculo en Python. La página web (HTML + CSS + JavaScript) solo se encarga de
mostrar formularios y dibujar; cuando hay que calcular cuántos adoquines se
necesitan, le pregunta a este archivo a través de una pequeña API.

¿Qué es una API aquí? Es simplemente una dirección (URL) a la que el navegador
le manda los datos del formulario y recibe de vuelta un resultado en formato
JSON (un texto ordenado con los números ya calculados).

Flujo general:
    Navegador  --->  POST /api/calcular (con los datos)  --->  Python calcula
    Navegador  <---  JSON con los resultados             <---  Python responde

Autor: (proyecto de estudiante)
"""

import math
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


# ---------------------------------------------------------------------------
# 1) TABLAS DE CONFIGURACIÓN
# ---------------------------------------------------------------------------
# Para no equivocarnos con las unidades, convertimos TODO a metros por dentro.
# Estos son los factores: "cuántos metros vale 1 unidad".
#   1 m  = 1 metro
#   1 cm = 0.01 metros
#   1 ft = 0.3048 metros (1 pie)
#   1 in = 0.0254 metros (1 pulgada)
FACTORES_A_METRO = {
    "m": 1.0,
    "cm": 0.01,
    "mm": 0.001,
    "ft": 0.3048,
    "in": 0.0254,
}

# Según el sistema de medida elegido, usamos unas unidades u otras.
#   - area:  unidad para medir el terreno (grande: metros o pies)
#   - pieza: unidad para medir el adoquín (pequeña: cm o pulgadas)
#   - sup:   unidad en la que mostramos la superficie total
#   - long:  unidad lineal para la barra de escala del dibujo
SISTEMAS = {
    "metrico": {
        "area": "m", "pieza": "cm",
        "sup": "m²", "long": "m",
    },
    "imperial": {
        "area": "ft", "pieza": "in",
        "sup": "ft²", "long": "ft",
    },
}

# Monedas admitidas con su símbolo y código ISO
MONEDAS = {
    "MXN": {"simbolo": "$",   "codigo": "MXN"},
    "USD": {"simbolo": "US$", "codigo": "USD"},
    "EUR": {"simbolo": "€",   "codigo": "EUR"},
}


# ---------------------------------------------------------------------------
# 2) AYUDANTES DE VALIDACIÓN
# ---------------------------------------------------------------------------
def a_numero_positivo(valor, nombre_campo):
    """Convierte un valor de texto a número y verifica que sea > 0.

    Lanza ValueError con un mensaje entendible si:
        - el campo está vacío
        - el texto no es un número (ej. "abc")
        - el número es 0 o negativo (no tiene sentido un largo de 0)
    """
    if valor is None or str(valor).strip() == "":
        raise ValueError("Falta el valor de '%s'." % nombre_campo)
    try:
        n = float(valor)
    except (TypeError, ValueError):
        raise ValueError("El valor de '%s' no es un número válido." % nombre_campo)
    if n <= 0:
        raise ValueError("El valor de '%s' debe ser mayor que cero." % nombre_campo)
    return n


def a_numero_no_negativo(valor, default=None):
    """Convierte valor a float >= 0; devuelve default si está vacío o es inválido."""
    if valor is None or str(valor).strip() == "":
        return default
    try:
        n = float(valor)
        return n if n >= 0 else default
    except (TypeError, ValueError):
        return default


def dims_a_metros(dims, unidad):
    """Toma un diccionario de dimensiones y las pasa todas a metros.

    Ejemplo: si el usuario midió en cm y escribió 20, lo guardamos como 0.20 m.
    """
    factor = FACTORES_A_METRO[unidad]
    return {clave: valor * factor for clave, valor in dims.items()}


# ---------------------------------------------------------------------------
# 3) GEOMETRÍA DE LA ZONA (terreno a cubrir)
# ---------------------------------------------------------------------------
def leer_zona(z_raw, unidad_area, num):
    """Parsea la forma y dimensiones del terreno de una zona.

    Devuelve (forma, zona_m, area_m2, bbox_m) donde:
      - forma:   string identificador de la forma
      - zona_m:  dict con las dimensiones en metros para usar en el dibujo
      - area_m2: área en metros cuadrados
      - bbox_m:  bounding box {largo, ancho} en metros para escalar el canvas
    """
    forma = z_raw.get("forma_zona", "rectangulo")
    n = "de la figura %d" % num

    if forma == "rectangulo":
        largo = a_numero_positivo(z_raw.get("zona_largo"), "largo " + n)
        ancho = a_numero_positivo(z_raw.get("zona_ancho"), "ancho " + n)
        dims_m = dims_a_metros({"largo": largo, "ancho": ancho}, unidad_area)
        area = dims_m["largo"] * dims_m["ancho"]
        bbox = {"largo": dims_m["largo"], "ancho": dims_m["ancho"]}
        zona_m = {"largo": dims_m["largo"], "ancho": dims_m["ancho"]}

    elif forma == "cuadrado":
        lado = a_numero_positivo(z_raw.get("zona_lado"), "lado " + n)
        dims_m = dims_a_metros({"lado": lado}, unidad_area)
        area = dims_m["lado"] ** 2
        bbox = {"largo": dims_m["lado"], "ancho": dims_m["lado"]}
        zona_m = {"lado": dims_m["lado"]}

    elif forma == "circular":
        diam = a_numero_positivo(z_raw.get("zona_diametro"), "diámetro " + n)
        dims_m = dims_a_metros({"diametro": diam}, unidad_area)
        r = dims_m["diametro"] / 2.0
        area = math.pi * r * r
        bbox = {"largo": dims_m["diametro"], "ancho": dims_m["diametro"]}
        zona_m = {"diametro": dims_m["diametro"]}

    elif forma == "triangular":
        base = a_numero_positivo(z_raw.get("zona_base"), "base " + n)
        alt  = a_numero_positivo(z_raw.get("zona_altura"), "altura " + n)
        dims_m = dims_a_metros({"base": base, "altura": alt}, unidad_area)
        area = dims_m["base"] * dims_m["altura"] / 2.0
        bbox = {"largo": dims_m["base"], "ancho": dims_m["altura"]}
        zona_m = {"base": dims_m["base"], "altura": dims_m["altura"]}

    elif forma == "trapecio":
        bm  = a_numero_positivo(z_raw.get("zona_base_mayor"), "base mayor " + n)
        bme = a_numero_positivo(z_raw.get("zona_base_menor"), "base menor " + n)
        alt = a_numero_positivo(z_raw.get("zona_altura"), "altura " + n)
        dims_m = dims_a_metros(
            {"base_mayor": bm, "base_menor": bme, "altura": alt}, unidad_area
        )
        area = (dims_m["base_mayor"] + dims_m["base_menor"]) / 2.0 * dims_m["altura"]
        bbox = {"largo": dims_m["base_mayor"], "ancho": dims_m["altura"]}
        zona_m = {
            "base_mayor": dims_m["base_mayor"],
            "base_menor": dims_m["base_menor"],
            "altura": dims_m["altura"],
        }

    elif forma == "medialuna":
        diam = a_numero_positivo(z_raw.get("zona_diametro"), "diámetro " + n)
        dims_m = dims_a_metros({"diametro": diam}, unidad_area)
        r = dims_m["diametro"] / 2.0
        area = math.pi * r * r / 2.0
        # Bounding box de una semicircunferencia: diámetro × radio
        bbox = {"largo": dims_m["diametro"], "ancho": r}
        zona_m = {"diametro": dims_m["diametro"]}

    elif forma == "ele":
        largo = a_numero_positivo(z_raw.get("zona_largo"), "largo " + n)
        ancho = a_numero_positivo(z_raw.get("zona_ancho"), "ancho " + n)
        corte_largo = a_numero_positivo(z_raw.get("zona_corte_largo"), "corte largo " + n)
        corte_ancho = a_numero_positivo(z_raw.get("zona_corte_ancho"), "corte ancho " + n)
        dims_m = dims_a_metros(
            {"largo": largo, "ancho": ancho, "corte_largo": corte_largo, "corte_ancho": corte_ancho},
            unidad_area,
        )
        if dims_m["corte_largo"] >= dims_m["largo"] or dims_m["corte_ancho"] >= dims_m["ancho"]:
            raise ValueError("El corte de la forma en L " + n + " no puede ser igual o más grande que el terreno.")
        area = dims_m["largo"] * dims_m["ancho"] - dims_m["corte_largo"] * dims_m["corte_ancho"]
        bbox = {"largo": dims_m["largo"], "ancho": dims_m["ancho"]}
        zona_m = dims_m

    elif forma == "anillo":
        d_ext = a_numero_positivo(z_raw.get("zona_diametro_ext"), "diámetro exterior " + n)
        d_int = a_numero_positivo(z_raw.get("zona_diametro_int"), "diámetro interior " + n)
        dims_m = dims_a_metros({"diametro_ext": d_ext, "diametro_int": d_int}, unidad_area)
        if dims_m["diametro_int"] >= dims_m["diametro_ext"]:
            raise ValueError("El diámetro interior del anillo " + n + " debe ser menor que el exterior.")
        r_ext, r_int = dims_m["diametro_ext"] / 2.0, dims_m["diametro_int"] / 2.0
        area = math.pi * (r_ext * r_ext - r_int * r_int)
        bbox = {"largo": dims_m["diametro_ext"], "ancho": dims_m["diametro_ext"]}
        zona_m = dims_m

    elif forma == "ovalo":
        ancho = a_numero_positivo(z_raw.get("zona_ancho"), "ancho " + n)
        alto = a_numero_positivo(z_raw.get("zona_alto"), "alto " + n)
        dims_m = dims_a_metros({"ancho": ancho, "alto": alto}, unidad_area)
        area = math.pi * (dims_m["ancho"] / 2.0) * (dims_m["alto"] / 2.0)
        bbox = {"largo": dims_m["ancho"], "ancho": dims_m["alto"]}
        zona_m = dims_m

    elif forma == "hexagono":
        lado = a_numero_positivo(z_raw.get("zona_lado"), "lado " + n)
        dims_m = dims_a_metros({"lado": lado}, unidad_area)
        area = (3.0 * math.sqrt(3.0) / 2.0) * (dims_m["lado"] ** 2)
        bbox = {"largo": 2.0 * dims_m["lado"], "ancho": math.sqrt(3.0) * dims_m["lado"]}
        zona_m = {"lado": dims_m["lado"]}

    else:
        raise ValueError(
            "Forma de zona no reconocida en figura %d: '%s'." % (num, forma)
        )

    return forma, zona_m, area, bbox


# ---------------------------------------------------------------------------
# 4) GEOMETRÍA DEL ADOQUÍN (pieza)
# ---------------------------------------------------------------------------
def leer_pieza(z_raw, unidad_pieza, num):
    """Parsea la forma y dimensiones del adoquín de una zona.

    Devuelve (forma_pieza, pieza_m, area_pieza_m2) donde:
      - forma_pieza:  string identificador de la forma del adoquín
      - pieza_m:      dict con las dimensiones relevantes en metros (para el dibujo)
      - area_pieza_m2: área efectiva en metros cuadrados (usada para el conteo)
    """
    forma = z_raw.get("forma_pieza", "rectangulo")
    n = "del adoquín figura %d" % num

    if forma in ("rectangulo", "doble_t", "doble_s", "llave", "gaviota"):
        largo = a_numero_positivo(z_raw.get("pieza_largo"), "largo " + n)
        ancho = a_numero_positivo(z_raw.get("pieza_ancho"), "ancho " + n)
        dims_m = dims_a_metros({"largo": largo, "ancho": ancho}, unidad_pieza)
        pieza_m = {"largo": dims_m["largo"], "ancho": dims_m["ancho"]}
        # Formas complejas ocupan menos área que su bounding box
        _FILL = {
            "doble_t": 0.75, "doble_s": 0.75,
            "llave": 0.78, "gaviota": 0.72,
        }
        area = dims_m["largo"] * dims_m["ancho"] * _FILL.get(forma, 1.0)

    elif forma in ("cuadrado", "hexagono", "celosia", "puzzle"):
        lado = a_numero_positivo(z_raw.get("pieza_lado"), "lado " + n)
        dims_m = dims_a_metros({"lado": lado}, unidad_pieza)
        pieza_m = {"lado": dims_m["lado"]}
        if forma == "hexagono":
            area = (3.0 * math.sqrt(3.0) / 2.0) * (dims_m["lado"] ** 2)
        elif forma == "celosia":
            area = dims_m["lado"] ** 2 * 0.60
        elif forma == "puzzle":
            area = dims_m["lado"] ** 2 * 0.80
        else:  # cuadrado
            area = dims_m["lado"] ** 2

    elif forma == "rombo":
        dm  = a_numero_positivo(z_raw.get("pieza_diag_mayor"), "diagonal mayor " + n)
        dme = a_numero_positivo(z_raw.get("pieza_diag_menor"), "diagonal menor " + n)
        dims_m = dims_a_metros({"diag_mayor": dm, "diag_menor": dme}, unidad_pieza)
        pieza_m = {
            "diag_mayor": dims_m["diag_mayor"],
            "diag_menor": dims_m["diag_menor"],
        }
        area = dims_m["diag_mayor"] * dims_m["diag_menor"] / 2.0

    elif forma == "trapezoide":
        bm  = a_numero_positivo(z_raw.get("pieza_base_mayor"), "base mayor " + n)
        bme = a_numero_positivo(z_raw.get("pieza_base_menor"), "base menor " + n)
        alt = a_numero_positivo(z_raw.get("pieza_altura"), "altura " + n)
        dims_m = dims_a_metros(
            {"base_mayor": bm, "base_menor": bme, "altura": alt}, unidad_pieza
        )
        pieza_m = {
            "base_mayor": dims_m["base_mayor"],
            "base_menor": dims_m["base_menor"],
            "altura": dims_m["altura"],
        }
        area = (dims_m["base_mayor"] + dims_m["base_menor"]) / 2.0 * dims_m["altura"]

    elif forma == "abanico":
        ancho = a_numero_positivo(z_raw.get("pieza_ancho"), "ancho " + n)
        alto  = a_numero_positivo(z_raw.get("pieza_alto"), "alto " + n)
        dims_m = dims_a_metros({"ancho": ancho, "alto": alto}, unidad_pieza)
        pieza_m = {"ancho": dims_m["ancho"], "alto": dims_m["alto"]}
        # Abanico ≈ semicírculo cuya base es el ancho
        r = dims_m["ancho"] / 2.0
        area = math.pi * r * r / 2.0

    else:
        raise ValueError(
            "Forma de adoquín no reconocida en figura %d: '%s'." % (num, forma)
        )

    if area <= 0:
        raise ValueError(
            "El área del adoquín no puede ser cero en figura %d." % num
        )

    return forma, pieza_m, area


# ---------------------------------------------------------------------------
# 5) EL CÁLCULO PRINCIPAL
# ---------------------------------------------------------------------------
def calcular(datos):
    """Recibe los datos del formulario (ya como diccionario) y devuelve el
    resultado completo listo para enviar al navegador.
    """

    # --- 5.1 Leer y validar el sistema de unidades ---
    sistema = datos.get("sistema", "metrico")
    if sistema not in SISTEMAS:
        raise ValueError("Sistema de unidades no reconocido.")
    u = SISTEMAS[sistema]
    unidad_area  = u["area"]
    unidad_pieza = u["pieza"]

    # --- 5.2 Moneda ---
    moneda_cod = (datos.get("moneda") or "MXN").upper()
    moneda = MONEDAS.get(moneda_cod, MONEDAS["MXN"])

    # --- 5.3 Zonas ---
    zonas_raw = datos.get("zonas")
    if not zonas_raw or not isinstance(zonas_raw, list):
        raise ValueError("Se requiere al menos una figura.")

    zonas_proc = []
    geometrias = []

    for i, z_raw in enumerate(zonas_raw):
        num = i + 1

        # Terreno de esta zona
        forma_zona, zona_m, area_zona_m2, bbox_m = leer_zona(
            z_raw, unidad_area, num
        )

        # Adoquín de esta zona
        forma_pieza, pieza_m, area_pieza_m2 = leer_pieza(
            z_raw, unidad_pieza, num
        )

        # Patrón
        patron = z_raw.get("patron", "cuadricula")

        # Desperdicio: porcentaje numérico enviado por el formulario (ej. "5" = 5 %)
        desp_pct = max(
            0.0, min(60.0, float(a_numero_no_negativo(z_raw.get("desperdicio"), 5.0)))
        )

        # Cantidades
        cant_exacta = area_zona_m2 / area_pieza_m2
        cant_min    = math.ceil(cant_exacta)
        cant_rec    = math.ceil(cant_exacta * (1.0 + desp_pct / 100.0))
        piezas_extra = cant_rec - cant_min

        # Precio por pieza (opcional)
        precio = a_numero_no_negativo(z_raw.get("precio_pieza"))
        costo_zona     = round(cant_rec * precio, 2) if precio is not None else None
        costo_min_zona = round(cant_min * precio, 2) if precio is not None else None

        zonas_proc.append({
            "forma_zona":   forma_zona,
            "forma_pieza":  forma_pieza,
            "patron":       patron,
            "area_zona":    area_zona_m2,
            "area_pieza":   area_pieza_m2,
            "cant_min":     cant_min,
            "cant_rec":     cant_rec,
            "piezas_extra": piezas_extra,
            "costo_total":  costo_zona,
            "costo_minimo": costo_min_zona,
        })

        geometrias.append({
            "forma_zona":  forma_zona,
            "forma_pieza": forma_pieza,
            "patron":      patron,
            "bbox_m":      bbox_m,
            "zona_m":      zona_m,
            "pieza_m":     pieza_m,
        })

    # --- 5.4 Totales ---
    area_total_m2        = sum(z["area_zona"] for z in zonas_proc)
    cantidad_minima      = sum(z["cant_min"]  for z in zonas_proc)
    cantidad_recomendada = sum(z["cant_rec"]  for z in zonas_proc)
    piezas_extra_total   = cantidad_recomendada - cantidad_minima

    zonas_con_precio = sum(1 for z in zonas_proc if z["costo_total"] is not None)
    if zonas_con_precio > 0:
        costo_total  = round(
            sum(z["costo_total"]  for z in zonas_proc if z["costo_total"]  is not None), 2
        )
        costo_minimo = round(
            sum(z["costo_minimo"] for z in zonas_proc if z["costo_minimo"] is not None), 2
        )
    else:
        costo_total  = None
        costo_minimo = None

    # Área de visualización en las unidades del sistema elegido
    factor_area  = FACTORES_A_METRO[unidad_area]
    area_display = round(area_total_m2 / (factor_area ** 2), 3)

    resumen_figuras = [
        {
            "num":                   i + 1,
            "forma_zona":            z["forma_zona"],
            "forma_pieza":           z["forma_pieza"],
            "cantidad_recomendada":  z["cant_rec"],
            "piezas_extra":          z["piezas_extra"],
            "costo_total":           z["costo_total"],
        }
        for i, z in enumerate(zonas_proc)
    ]

    return {
        "ok":                    True,
        "area_total":            area_display,
        "cantidad_minima":       cantidad_minima,
        "cantidad_recomendada":  cantidad_recomendada,
        "piezas_extra":          piezas_extra_total,
        "unidades":              {"sup": u["sup"], "long": u["long"]},
        "moneda":                moneda,
        "costo_total":           costo_total,
        "costo_minimo":          costo_minimo,
        "zonas_con_precio":      zonas_con_precio,
        "zonas_total":           len(zonas_proc),
        "resumen_figuras":       resumen_figuras,
        "geometrias":            geometrias,
    }


# ---------------------------------------------------------------------------
# 6) RUTAS DE FLASK (las "direcciones" de la aplicación)
# ---------------------------------------------------------------------------
@app.route("/")
def inicio():
    """Página principal: entrega el HTML de la calculadora."""
    return render_template("index.html")


@app.route("/api/calcular", methods=["POST"])
def api_calcular():
    """API de cálculo.

    El navegador envía aquí los datos del formulario en formato JSON.
    Respondemos con el resultado (o con un mensaje de error claro si algo
    estaba mal en los datos). Nunca dejamos que el programa "explote": si hay
    un problema, lo capturamos y lo explicamos.
    """
    try:
        datos = request.get_json(force=True, silent=True) or {}
        resultado = calcular(datos)
        return jsonify(resultado)
    except ValueError as e:
        # Errores ESPERADOS (datos mal escritos): respondemos amablemente.
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        # Errores inesperados: avisamos sin tumbar el servidor.
        return jsonify({"ok": False, "error": "Error interno: %s" % str(e)}), 500


if __name__ == "__main__":
    # host="0.0.0.0" permite verlo desde fuera del contenedor Docker.
    app.run(host="0.0.0.0", port=5000, debug=True)
