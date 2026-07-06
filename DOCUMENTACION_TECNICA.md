# Calculadora Inteligente de Adoquines
## Documentación Técnica del Proyecto

| Campo | Detalle |
|---|---|
| **Proyecto** | Calculadora Inteligente de Adoquines |
| **Tipo de sistema** | Aplicación web cliente–servidor |
| **Versión del documento** | 1.0 |
| **Fecha** | Julio de 2026 |
| **Autores** | David Emanuel Jauregui Aban · Christian de Jesús Hernández Ruiz · Julián Azael Mex Domínguez |
| **Tecnologías principales** | Python 3.11 · Flask 3.0.3 · HTML5 · CSS3 · JavaScript (Canvas API) · Docker |

> **Convención de figuras.** Las imágenes se referencian con rutas relativas a la carpeta `docs/` (por ejemplo, `imagenes/flujo_datos.svg`), por lo que este documento debe ubicarse dentro de `docs/`. Las figuras que ya existen en el proyecto se insertan directamente. Las figuras pendientes de captura se señalan con un bloque **[INSERTAR IMAGEN]**, que indica el contenido esperado y el nombre de archivo sugerido dentro de `docs/imagenes/`.

---

## Índice

1. [Introducción](#1-introducción)
2. [Descripción general del sistema](#2-descripción-general-del-sistema)
3. [Problema y justificación](#3-problema-y-justificación)
4. [Objetivos](#4-objetivos)
5. [Alcance de la versión actual](#5-alcance-de-la-versión-actual)
6. [Tecnologías utilizadas](#6-tecnologías-utilizadas)
7. [Arquitectura del sistema](#7-arquitectura-del-sistema)
8. [Estructura del proyecto](#8-estructura-del-proyecto)
9. [Modelo de cálculo](#9-modelo-de-cálculo)
10. [Funcionalidades](#10-funcionalidades)
11. [API del sistema](#11-api-del-sistema)
12. [Validación de datos](#12-validación-de-datos)
13. [Interfaz de usuario](#13-interfaz-de-usuario)
14. [Despliegue y ejecución](#14-despliegue-y-ejecución)
15. [Estrategia de verificación](#15-estrategia-de-verificación)
16. [Consideraciones y limitaciones](#16-consideraciones-y-limitaciones)
17. [Trabajo futuro](#17-trabajo-futuro)
18. [Créditos](#18-créditos)

---

## 1. Introducción

El presente documento constituye la documentación técnica formal de la **Calculadora Inteligente de Adoquines**, una aplicación web orientada a la estimación de materiales para proyectos de pavimentación. Su propósito es describir la arquitectura del sistema, el modelo matemático de cálculo, las funcionalidades implementadas, la interfaz de programación (API), el proceso de validación de datos y los procedimientos de despliegue.

El documento está dirigido a evaluadores académicos, a desarrolladores que deban dar mantenimiento al sistema y a usuarios técnicos interesados en su funcionamiento interno. Existe además una guía complementaria de carácter divulgativo (`docs/DOCUMENTACION.md`) que explica los mismos conceptos con un enfoque introductorio.

---

## 2. Descripción general del sistema

La Calculadora Inteligente de Adoquines estima la cantidad de adoquines necesaria para cubrir una o varias superficies (zonas). El usuario define, para cada zona, la forma y dimensiones del terreno, la forma y dimensiones del adoquín, el patrón de colocación, un porcentaje de desperdicio y, opcionalmente, el precio unitario de la pieza. Con esta información, el sistema calcula el área total, la cantidad mínima de piezas, la cantidad recomendada (que incorpora el desperdicio) y el costo estimado.

Como complemento del cálculo numérico, la aplicación genera una representación gráfica del plano: dibuja cada zona a escala, aplica el patrón de colocación seleccionado, recorta el patrón al contorno de la zona y distingue visualmente las piezas de borde que requerirían corte. La visualización puede alternarse entre una vista ortogonal (2D) y una proyección isométrica (2.5D).

El sistema se distribuye como aplicación contenerizada mediante Docker, lo que garantiza un entorno de ejecución reproducible en distintos equipos.

---

## 3. Problema y justificación

En trabajos de construcción, jardinería y urbanización es habitual requerir una estimación de materiales previa al inicio de la obra. El cálculo manual de adoquines es propenso a errores: compra insuficiente o excesiva de material, omisión del desperdicio por cortes y roturas, y pérdida de tiempo en cálculos repetitivos cuando cambian las dimensiones, el tipo de pieza o el patrón de colocación.

La aplicación automatiza este proceso con un modelo de cálculo uniforme y verificable, reduce el error humano y permite comparar rápidamente escenarios distintos (formas de pieza, patrones o porcentajes de desperdicio) antes de tomar una decisión de compra.

---

## 4. Objetivos

### 4.1 Objetivo general

Desarrollar una aplicación web contenerizada que calcule la cantidad de adoquines y el costo estimado necesarios para cubrir una o varias superficies, considerando la geometría del terreno, la geometría de la pieza, el patrón de colocación y un porcentaje de desperdicio configurable.

### 4.2 Objetivos específicos

1. Proveer una interfaz web para capturar los parámetros de cálculo por zona.
2. Calcular el área de terrenos con seis geometrías distintas.
3. Calcular el área de cobertura de doce formas de adoquín.
4. Determinar la cantidad mínima y la cantidad recomendada de piezas aplicando una política de redondeo único.
5. Estimar el costo total a partir del precio unitario por pieza, en tres monedas.
6. Representar gráficamente el plano de colocación en vistas 2D y 2.5D.
7. Soportar los sistemas de unidades métrico e imperial.
8. Ejecutar la aplicación dentro de un contenedor Docker.

---

## 5. Alcance de la versión actual

La versión documentada incluye: gestión de un número arbitrario de zonas independientes, cada una con su propia configuración de terreno, pieza, patrón, desperdicio y precio; seis formas de terreno; doce formas de adoquín; quince patrones de colocación con desperdicio sugerido; cálculo de costos en pesos mexicanos, dólares o euros; visualización del plano en 2D y 2.5D con marcado de piezas de corte; alternancia entre sistema métrico e imperial con conversión automática de los valores capturados; y despliegue mediante Docker o, alternativamente, en la plataforma Vercel.

Quedan fuera del alcance de esta versión la persistencia de cálculos en base de datos, la autenticación de usuarios y la exportación de reportes, contempladas como trabajo futuro (véase la sección 17).

---

## 6. Tecnologías utilizadas

| Capa | Tecnología | Versión | Función en el proyecto |
|---|---|---|---|
| Backend | Python | 3.11 | Lenguaje del servidor y de la lógica de cálculo |
| Backend | Flask | 3.0.3 | Framework web: enrutamiento, plantillas y API JSON |
| Frontend | HTML5 | — | Estructura de la interfaz (`templates/index.html`) |
| Frontend | CSS3 | — | Estilo visual tipo "plano de ingeniería" (`static/css/style.css`) |
| Frontend | JavaScript (ES6) | — | Interacción, llamadas a la API y dibujo con Canvas API (`static/js/app.js`) |
| Infraestructura | Docker | — | Contenerización y despliegue reproducible |
| Infraestructura | Vercel (opcional) | — | Despliegue alternativo sin contenedor (`vercel.json`) |
| Tipografía | Google Fonts | — | Space Grotesk (títulos), Inter (interfaz), Space Mono (cifras) |

---

## 7. Arquitectura del sistema

El sistema sigue una arquitectura cliente–servidor de dos capas. El **frontend** (HTML, CSS y JavaScript ejecutados en el navegador) captura los parámetros, solicita el cálculo y presenta los resultados numéricos y gráficos. El **backend** (Flask) concentra la totalidad de la lógica de cálculo y la validación de datos, de modo que existe una única fuente de verdad matemática: cualquier ajuste a las fórmulas se realiza exclusivamente en `app.py`, sin modificar el cliente.

Ambas capas se comunican mediante peticiones HTTP con cuerpo JSON a través del endpoint `POST /api/calcular`.

![Figura 1. Flujo de datos entre el navegador y el servidor Flask](imagenes/flujo_datos.svg)

*Figura 1. Arquitectura y flujo de datos del sistema.*

### 7.1 Flujo de una petición de cálculo

1. El usuario modifica cualquier parámetro del formulario. El cliente agrupa los cambios mediante un mecanismo de *debounce* (220 ms) para evitar peticiones excesivas.
2. El cliente serializa el estado de todas las zonas en un objeto JSON y lo envía a `POST /api/calcular` mediante `fetch`.
3. El servidor valida los datos, convierte todas las magnitudes a metros, calcula áreas, cantidades y costos por zona, y agrega los totales del proyecto.
4. El servidor responde con un objeto JSON que contiene los resultados numéricos y la geometría normalizada de cada zona.
5. El cliente actualiza las tarjetas de resultados, el desglose por figura y redibuja el plano en el lienzo (`<canvas>`) a partir de la geometría recibida.

---

## 8. Estructura del proyecto

```text
calculadora-adoquines/
├── app.py                  # Servidor Flask y lógica de cálculo (backend)
├── requirements.txt        # Dependencias de Python (Flask)
├── Dockerfile              # Construcción de la imagen Docker
├── .dockerignore           # Exclusiones para la imagen (docs, git, cachés)
├── vercel.json             # Configuración de despliegue alternativo en Vercel
├── templates/
│   └── index.html          # Estructura de la interfaz (plantilla Flask)
├── static/
│   ├── css/
│   │   └── style.css       # Hoja de estilos de la aplicación
│   └── js/
│       └── app.js          # Lógica del cliente: UI, API y dibujo del plano
└── docs/
    ├── DOCUMENTACION.md            # Guía divulgativa del proyecto
    ├── DOCUMENTACION_TECNICA.md    # Este documento
    └── imagenes/                   # Figuras de la documentación
```

![Figura 2. Estructura de archivos del proyecto](imagenes/estructura_archivos.svg)

*Figura 2. Estructura de archivos y responsabilidad de cada componente.*

---

## 9. Modelo de cálculo

### 9.1 Principio general: estimación por área

El sistema emplea el método estándar de estimación por área. Para cada zona, la cantidad exacta de piezas se obtiene como el cociente entre el área del terreno y el **área de cobertura** de una pieza:

```text
cantidad_exacta = área_zona ÷ área_cobertura_pieza
```

El área de cobertura corresponde a la superficie que una pieza ocupa dentro del teselado. Para las formas que embonan sin huecos coincide con el área geométrica de la figura; para las piezas que se traslapan (abanico) corresponde a la porción que queda a la vista. Todas las magnitudes se convierten internamente a metros antes de operar (sección 9.7), por lo que el resultado es independiente del sistema de unidades elegido.

### 9.2 Área de la zona (terreno)

El sistema admite seis geometrías de terreno. La tabla 1 resume los parámetros requeridos y la fórmula aplicada por la función `area_zona()` de `app.py`.

*Tabla 1. Fórmulas de área por forma de zona.*

| Forma | Parámetros | Fórmula de área |
|---|---|---|
| Rectángulo | largo, ancho | A = largo × ancho |
| Cuadrado | lado | A = lado² |
| Circular | diámetro | A = π · (diámetro / 2)² |
| Triangular | base, altura | A = (base × altura) / 2 |
| Trapecio | base mayor, base menor, altura | A = ((B + b) / 2) · altura |
| Media luna | diámetro | A = (π · (diámetro / 2)²) / 2 |

![Figura 3. Formas de zona disponibles](imagenes/formas_zona.png)

*Figura 3. Las seis formas de terreno admitidas.*

### 9.3 Área de cobertura del adoquín

Se admiten doce formas de pieza, resueltas por la función `area_pieza()`.

*Tabla 2. Área de cobertura por forma de adoquín.*

| Forma | Parámetros | Área de cobertura |
|---|---|---|
| Rectángulo | largo, ancho | largo × ancho |
| Cuadrado | lado | lado² |
| Hexágono | lado | (3√3 / 2) · lado² |
| Rombo | diagonal mayor, diagonal menor | (D · d) / 2 |
| Trapezoide | base mayor, base menor, altura | ((B + b) / 2) · altura |
| Doble T | largo, ancho | largo × ancho |
| Doble S | largo, ancho | largo × ancho |
| Celosía | lado | lado² |
| Llave | largo, ancho | largo × ancho |
| Gaviota | largo, ancho | largo × ancho |
| Puzzle | lado | lado² |
| Abanico | ancho, alto | ancho × (alto / 2) |

Tres casos merecen precisión técnica. El **hexágono regular** no se calcula como producto de dimensiones, sino con la fórmula (3√3/2)·lado². El **abanico** (escama de pez) se instala con un traslape aproximado del 50 % entre hileras, por lo que su cobertura efectiva equivale a la mitad de su rectángulo envolvente; la fórmula ya incorpora este factor. Las **formas entrelazadas** (doble T, doble S, llave, gaviota, puzzle, celosía) teselan el plano sin huecos, de modo que su cobertura equivale a la de su celda rectangular o cuadrada de repetición.

![Figura 4. Formas de adoquín disponibles](imagenes/formas_adoquin.png)

*Figura 4. Las doce formas de adoquín admitidas.*

### 9.4 Cantidad de piezas y política de redondeo único

A partir de la cantidad exacta, el sistema deriva tres valores por zona:

```text
cantidad_minima      = ⌈cantidad_exacta⌉
cantidad_recomendada = ⌈cantidad_exacta × (1 + desperdicio / 100)⌉
piezas_extra         = cantidad_recomendada − cantidad_minima
```

La regla central del modelo es el **redondeo único**: el desperdicio se aplica sobre la cantidad exacta (con decimales) y el redondeo hacia arriba se ejecuta una sola vez, al final de cada expresión. Con ello se evita el error acumulado que produciría redondear primero la división y aplicar después el porcentaje sobre un valor ya inflado. Para el caso de referencia (área de 10.05 m², pieza de 0.02 m², desperdicio del 10 %), el método corregido arroja 553 piezas frente a las 554 del método con doble redondeo.

![Figura 5. Comparación entre el método con doble redondeo y el método corregido](imagenes/calculo_antes_despues.svg)

*Figura 5. Efecto de la política de redondeo único sobre el resultado.*

### 9.5 Desperdicio

Cada zona define su propio porcentaje de desperdicio, editable por el usuario entre 0 y 60 %. Al seleccionar un patrón de colocación, la interfaz propone automáticamente el valor sugerido para ese patrón (tabla 4, sección 10.2), dado que cada acomodo genera una proporción distinta de cortes de borde. Si el valor recibido por el servidor no es numérico, se aplica un valor por defecto del 5 %.

### 9.6 Costo estimado

El precio unitario por pieza es opcional y se captura por zona. Cuando está presente, el servidor calcula:

```text
costo_total  = cantidad_recomendada × precio_pieza
costo_minimo = cantidad_minima × precio_pieza
```

El costo global del proyecto suma únicamente las zonas que declararon precio, y la respuesta indica cuántas zonas lo hicieron (`zonas_con_precio` de `zonas_total`). La moneda seleccionada (MXN, USD o EUR) determina exclusivamente el símbolo y el código mostrados; el sistema no realiza conversión cambiaria, pues el precio se captura directamente en la moneda elegida. Los precios no numéricos o negativos se descartan y la zona se trata como zona sin precio.

### 9.7 Conversión de unidades

Todas las magnitudes se normalizan a metros mediante los factores de la tabla 3 antes de cualquier operación. En el sistema métrico, el terreno se captura en metros y la pieza en centímetros; en el sistema imperial, en pies y pulgadas respectivamente.

*Tabla 3. Factores de conversión a metros.*

| Unidad | Equivalencia |
|---|---|
| m | 1.0 m |
| cm | 0.01 m |
| mm | 0.001 m |
| ft | 0.3048 m |
| in | 0.0254 m |

---

## 10. Funcionalidades

### 10.1 Gestión de zonas múltiples

El proyecto puede componerse de un número arbitrario de zonas independientes. Cada zona se representa en el panel de control como una tarjeta con su propia configuración: forma y dimensiones del terreno, forma y dimensiones del adoquín, patrón, desperdicio y precio. Las zonas pueden agregarse y eliminarse dinámicamente (se conserva siempre al menos una). Los resultados se reportan de forma individual por zona —dentro de su tarjeta y en el resumen por figura— y de forma agregada en los totales del proyecto. En el plano, las zonas se dibujan lado a lado con una separación visual de 0.5 m a escala.

### 10.2 Patrones de colocación

Cada forma de adoquín habilita únicamente los patrones geométricamente compatibles con ella. El sistema implementa quince patrones, con miniaturas dibujadas en tiempo real mediante las mismas rutinas de render del plano, y un desperdicio sugerido por patrón.

*Tabla 4. Patrones, compatibilidad y desperdicio sugerido.*

| Patrón | Forma(s) compatible(s) | Desperdicio sugerido |
|---|---|---|
| Cuadrícula | Rectángulo, cuadrado | 5 % |
| Soga | Rectángulo | 8 % |
| Espiga | Rectángulo | 15 % |
| Trenzado | Rectángulo | 10 % |
| Diagonal | Cuadrado | 12 % |
| Panal | Hexágono | 10 % |
| Diamante | Rombo | 12 % |
| Hileras | Trapezoide | 12 % |
| Doble T | Doble T | 8 % |
| Doble S | Doble S | 10 % |
| Celosía | Celosía | 6 % |
| Llave | Llave | 10 % |
| Gaviota | Gaviota | 12 % |
| Puzzle | Puzzle | 10 % |
| Abanico | Abanico | 15 % |

![Figura 6. Lámina de patrones de colocación clásicos](imagenes/patrones.png)

*Figura 6. Patrones clásicos para piezas rectangulares, cuadradas y hexagonales.*

### 10.3 Sistema de unidades

Un conmutador global alterna entre los sistemas métrico (m/cm) e imperial (ft/in). Al cambiar de sistema, los valores ya capturados se convierten automáticamente (terreno: factor 3.28084; pieza: factor 2.54), se redondean a dos decimales y las etiquetas de unidad de todos los campos se actualizan.

### 10.4 Visualización del plano (2D y 2.5D)

El plano se dibuja en un elemento `<canvas>` con soporte para pantallas de alta densidad (ajuste por `devicePixelRatio`). En la **vista 2D**, cada zona se representa en proyección ortogonal con una retícula de referencia de 1 m, el contorno de la zona y una barra de escala. En la **vista 2.5D**, las zonas se proyectan en perspectiva isométrica (matriz de transformación con componentes 0.866 y 0.5), con una pasada previa de sombras que aporta profundidad.

En ambas vistas, el patrón se recorta al contorno exacto de la zona mediante trazados `Path2D` y recorte de lienzo (`clip`), aplicable tanto a bordes rectos como curvos. El lienzo se redibuja automáticamente al cambiar de vista o al redimensionar la ventana (con *debounce* de 150 ms).

> **[INSERTAR IMAGEN — Figura 7]** Captura de pantalla de la vista 2D del plano con al menos dos zonas de formas distintas.
> Archivo sugerido: `docs/imagenes/vista_2d.png`

> **[INSERTAR IMAGEN — Figura 8]** Captura de pantalla de la vista 2.5D (perspectiva isométrica) del mismo proyecto.
> Archivo sugerido: `docs/imagenes/vista_2_5d.png`

### 10.5 Representación de piezas de corte

Durante el dibujo, cada pieza se clasifica según la posición de sus vértices respecto del contorno de la zona (prueba de punto en polígono para formas poligonales y pruebas analíticas para círculo y media luna). Las piezas completamente interiores se pintan con la paleta de colores del patrón; las piezas que intersectan el borde reciben un tratamiento visual diferenciado que las identifica como **piezas de corte**, señalando al usuario dónde se concentraría el trabajo de recorte en obra.

> **[INSERTAR IMAGEN — Figura 9]** Detalle del borde de una zona curva (circular o media luna) mostrando el marcado de las piezas de corte.
> Archivo sugerido: `docs/imagenes/piezas_corte.png`

### 10.6 Panel de resultados

Los resultados se presentan en tres niveles: (a) tarjetas globales con el área total, las piezas mínimas, las piezas recomendadas y las piezas extra; (b) una tira de costo, visible solo cuando al menos una zona declaró precio, con el costo estimado total y el costo mínimo; y (c) un resumen por figura que detalla, para cada zona, la forma del terreno, la forma de la pieza, las piezas recomendadas y su costo. Las cifras se formatean con separadores de miles según la convención regional (`es-MX`).

---

## 11. API del sistema

### 11.1 Rutas

*Tabla 5. Rutas expuestas por el servidor.*

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Entrega la página principal (`index.html`) |
| POST | `/api/calcular` | Recibe los parámetros en JSON y devuelve el resultado del cálculo |

### 11.2 Formato de la solicitud

El cuerpo de la petición es un objeto JSON con el sistema de unidades, la moneda y el arreglo de zonas. Los nombres de los campos dimensionales se componen del prefijo `zona_` o `pieza_` seguido del parámetro correspondiente a la forma seleccionada (tablas 1 y 2).

```json
{
  "sistema": "metrico",
  "moneda": "MXN",
  "zonas": [
    {
      "forma_zona": "rectangulo",
      "forma_pieza": "rectangulo",
      "patron": "cuadricula",
      "zona_largo": "5",
      "zona_ancho": "4",
      "pieza_largo": "20",
      "pieza_ancho": "10",
      "desperdicio": "5",
      "precio_pieza": "12.50"
    }
  ]
}
```

### 11.3 Formato de la respuesta

En caso de éxito, la respuesta incluye los totales del proyecto, la información de moneda y unidades, la geometría normalizada de cada zona (en metros, para el dibujo del plano) y el resumen por figura.

```json
{
  "ok": true,
  "area_total": 20.0,
  "area_total_m2": 20.0,
  "cantidad_minima": 1000,
  "cantidad_recomendada": 1050,
  "piezas_extra": 50,
  "moneda": { "simbolo": "$", "codigo": "MXN", "nombre": "Pesos mexicanos" },
  "costo_total": 13125.0,
  "costo_minimo": 12500.0,
  "zonas_con_precio": 1,
  "zonas_total": 1,
  "unidades": { "area": "m", "pieza": "cm", "sup": "m²", "sup_pieza": "cm²" },
  "geometrias": [
    {
      "forma_zona": "rectangulo",
      "zona_m": { "largo": 5.0, "ancho": 4.0 },
      "bbox_m": { "largo": 5.0, "ancho": 4.0 },
      "forma_pieza": "rectangulo",
      "pieza_m": { "largo": 0.2, "ancho": 0.1 },
      "patron": "cuadricula"
    }
  ],
  "desglose_piezas": {
    "rectangulo": { "minima": 1000, "recomendada": 1050, "extra": 50 }
  },
  "resumen_figuras": [
    {
      "num": 1,
      "forma_zona": "rectangulo",
      "forma_pieza": "rectangulo",
      "area": 20.0,
      "cantidad_minima": 1000,
      "cantidad_recomendada": 1050,
      "piezas_extra": 50,
      "desperdicio_pct": 5.0,
      "precio_pieza": 12.5,
      "costo_total": 13125.0
    }
  ]
}
```

El campo `geometrias` merece mención especial: contiene, por zona, la forma del terreno con sus dimensiones en metros, el rectángulo envolvente (`bbox_m`) que el cliente utiliza para escalar el dibujo, la forma y dimensiones de la pieza y el patrón seleccionado. De este modo, el cliente dibuja siempre a partir de datos ya validados y normalizados por el servidor.

### 11.4 Manejo de errores

Los errores de validación (datos faltantes, no numéricos o fuera de rango) se responden con código HTTP 400 y un mensaje descriptivo; los errores no previstos se responden con código 500 sin interrumpir el servidor. En ambos casos el cuerpo mantiene la misma estructura:

```json
{ "ok": false, "error": "El valor de 'largo del área' debe ser mayor que cero." }
```

El cliente muestra el mensaje sobre el lienzo y, ante fallas de red, informa que no fue posible conectar con el servidor de cálculo.

---

## 12. Validación de datos

La validación se ejecuta en el servidor antes de cualquier operación aritmética. Cada campo dimensional se procesa con la función `a_numero_positivo()`, que verifica tres condiciones: que el valor exista (no esté vacío), que sea convertible a número y que sea estrictamente mayor que cero. Los mensajes de error identifican el campo y su contexto (por ejemplo, *"Falta el valor de 'diámetro del área'"*), lo que permite al usuario corregir con precisión.

Los catálogos `FORMAS_ZONA` y `FORMAS_PIEZA` declaran los campos requeridos por cada forma, de modo que servidor y cliente comparten el mismo contrato de datos. Adicionalmente: un sistema de unidades desconocido produce error de validación; una moneda desconocida se sustituye por el valor por defecto (MXN); un desperdicio no numérico se sustituye por 5 %; y un precio ausente, no numérico o negativo se trata como zona sin precio, sin interrumpir el cálculo.

---

## 13. Interfaz de usuario

La interfaz adopta un concepto visual de "mesa de dibujo / plano de ingeniería", organizado en una retícula de dos columnas: a la izquierda, el **panel de parámetros**, con desplazamiento interno propio para que la lista de opciones no desplace el plano fuera de la vista; a la derecha, la **mesa de dibujo**, con el lienzo, el conmutador de vista 2D/2.5D, las tarjetas de resultados, la tira de costo y el resumen por figura.

Cada zona se administra desde una tarjeta que incluye selectores iconográficos de forma (terreno y pieza), miniaturas de patrón dibujadas con las mismas rutinas de render del plano, un control deslizante de desperdicio sincronizado con su campo numérico y el campo opcional de precio. La tipografía distingue jerarquías: Space Grotesk para títulos, Inter para la interfaz y Space Mono para cifras. El diseño es adaptable (puntos de quiebre en 880 px y 460 px) e incorpora atributos ARIA en los conmutadores, así como respeto a la preferencia del sistema `prefers-reduced-motion`.

> **[INSERTAR IMAGEN — Figura 10]** Captura de pantalla completa de la interfaz: panel de parámetros a la izquierda y mesa de dibujo con resultados a la derecha.
> Archivo sugerido: `docs/imagenes/interfaz_principal.png`

---

## 14. Despliegue y ejecución

### 14.1 Ejecución con Docker (recomendada)

La imagen se construye sobre `python:3.11-slim`, instala las dependencias declaradas en `requirements.txt`, copia el proyecto y expone el puerto 5000. El archivo `.dockerignore` excluye del contexto la documentación, los archivos de control de versiones y las cachés de Python, para producir una imagen ligera.

```bash
# Construcción de la imagen
docker build -t adoquines .

# Ejecución del contenedor
docker run -p 5000:5000 adoquines
```

La aplicación queda disponible en `http://localhost:5000`.

### 14.2 Ejecución local sin contenedor

```bash
pip install -r requirements.txt
python app.py
```

### 14.3 Despliegue alternativo en Vercel

El archivo `vercel.json` configura el despliegue del servidor con el runtime `@vercel/python`, dirigiendo todas las rutas a `app.py`. Esta vía permite publicar la aplicación sin administrar infraestructura propia.

**Nota sobre el modo de depuración.** El arranque directo (`python app.py`) habilita `debug=True`, apropiado para desarrollo por su recarga automática y sus trazas detalladas. Para un entorno productivo se recomienda desactivar este modo y servir la aplicación con un servidor WSGI (por ejemplo, Gunicorn).

---

## 15. Estrategia de verificación

Durante el desarrollo se aplicó una metodología de verificación visual automatizada: la aplicación se ejecuta en segundo plano y un navegador controlado con **Playwright** reproduce las configuraciones de interés (combinaciones de forma de zona, forma de pieza, patrón y vista). Sobre las capturas resultantes se realizan mediciones de píxeles que permiten confirmar de manera objetiva que las zonas contienen piezas dibujadas, que los colores de las piezas se distinguen del fondo del lienzo y que las correcciones no introducen regresiones en configuraciones previamente válidas (en particular, las zonas rectangulares). Este enfoque resultó especialmente útil para detectar defectos de percepción visual —piezas presentes pero indistinguibles del fondo— que una inspección del código no revela con facilidad.

---

## 16. Consideraciones y limitaciones

La estimación es de tipo **área**, el método estándar para presupuestar material: divide la superficie entre la cobertura unitaria de la pieza y agrega el desperdicio. No realiza un empaquetado geométrico pieza a pieza, por lo que el plano tiene carácter ilustrativo y las piezas de corte señaladas son indicativas. En las formas entrelazadas (doble T, doble S, llave, gaviota, puzzle), la geometría exacta varía entre fabricantes; el sistema las representa con un teselado característico sin huecos, lo que no afecta el conteo por área. El módulo de costos no efectúa conversión cambiaria: la moneda determina únicamente el etiquetado. Finalmente, cada zona admite una sola combinación de pieza y patrón; las superficies con mezcla de piezas deben modelarse como zonas separadas.

---

## 17. Trabajo futuro

Se contemplan como líneas de evolución del sistema: la incorporación de un catálogo de adoquines comerciales con dimensiones predefinidas; la persistencia del historial de cálculos mediante una base de datos ligera (SQLite) y su orquestación con Docker Compose; la exportación de resultados y planos en formato PDF; la autenticación de usuarios con proyectos guardados; y la generación de reportes de materiales.

---

## 18. Créditos

Proyecto desarrollado por **David Emanuel Jauregui Aban**, **Christian de Jesús Hernández Ruiz** y **Julián Azael Mex Domínguez**.

---

*Documento técnico del proyecto Calculadora Inteligente de Adoquines. Última actualización: julio de 2026.*
