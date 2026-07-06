# Calculadora Inteligente de Adoquines — Documentación

Esta guía explica, paso a paso y sin dar nada por sabido, qué se corrigió en el proyecto, cómo está armado por dentro y cómo usarlo. La idea es que cualquier persona, aunque nunca haya programado, entienda **qué hace cada pieza y cómo se conecta con las demás**.

---

## 1. ¿Qué es esta aplicación?

Es una página web que responde a una pregunta muy concreta de obra: *"¿cuántos adoquines necesito para cubrir este pedazo de piso?"*

Tú le das tres cosas:

1. **El tamaño del terreno** que quieres cubrir (por ejemplo, 5 metros de largo por 3 de ancho).
2. **El tamaño y la forma del adoquín** que vas a usar (por ejemplo, una pieza rectangular de 20 × 10 cm).
3. **Un porcentaje de desperdicio**, que es un colchón para los adoquines que se rompen, se cortan en las orillas o salen mal.

Y ella te devuelve, ya calculado, **cuántas piezas comprar** y te dibuja un plano de cómo se verían acomodadas.

---

## 2. El error que tenía el cálculo (lo más importante)

El proyecto original entregaba **más adoquines de los necesarios**. No era un error enorme, pero en una compra real eso es dinero tirado. El problema tiene nombre: **se redondeaba dos veces**.

![Comparación del cálculo viejo contra el nuevo, con el ejemplo de 10.05 m²](imagenes/calculo_antes_despues.svg)

### ¿Qué es "redondear" y por qué importa?

Redondear *hacia arriba* significa subir al siguiente número entero. Como no puedes comprar "medio adoquín", si la cuenta da 502.5 piezas, en realidad necesitas 503. Eso está bien y es necesario. El problema no es redondear: es **redondear, y después volver a redondear sobre ese número que ya subiste**.

### El método viejo, con peras y manzanas

Imagina el ejemplo de la imagen: un terreno de 10.05 m² y un adoquín de 0.02 m² (los típicos 20 × 10 cm), con 10 % de desperdicio.

El código viejo hacía esto:

- **Paso 1:** dividía el terreno entre el adoquín → 10.05 ÷ 0.02 = **502.5**. Y ahí mismo lo redondeaba a **503**. *(primer redondeo)*
- **Paso 2:** a ese 503 le sumaba el 10 % de desperdicio → 503 × 1.10 = 553.3, y lo redondeaba a **554**. *(segundo redondeo)*

Resultado: **554 piezas**.

¿Ves el problema? En el primer paso ya habíamos "regalado" medio adoquín de más (subimos de 502.5 a 503). Luego, al multiplicar por 1.10, ese medio de más **también se infló** y arrastró la cuenta todavía más arriba. El error se acumula en cada paso.

### El método nuevo, corregido

El arreglo es una regla sencilla: **trabaja siempre con el número exacto, con todos sus decimales, y redondea una sola vez, hasta el final.**

- **Paso 1:** divide → 10.05 ÷ 0.02 = **502.5**, y lo guarda tal cual, con su decimal. *(no redondea todavía)*
- **Paso 2:** aplica el desperdicio sobre ese número exacto → 502.5 × 1.10 = 552.75, y **ahora sí** redondea: **553**. *(único redondeo)*

Resultado: **553 piezas**. Una pieza menos, y es la cifra correcta.

### Cómo quedó esto en el código

Dentro de `app.py`, el cálculo ahora distingue tres números, y los nombres dicen exactamente qué es cada uno:

- `cantidad_exacta` → la división pura, con decimales (502.5). Nunca se redondea; es la "verdad" matemática.
- `cantidad_minima` → la cantidad exacta redondeada hacia arriba (503). Es lo mínimo para cubrir el piso **sin** contar roturas.
- `cantidad_recomendada` → la cantidad exacta multiplicada por el desperdicio y **luego** redondeada una sola vez (553). Es lo que conviene comprar.
- `piezas_extra` → la resta de las dos anteriores (553 − 503 = 50). Te dice, en limpio, cuántas piezas estás comprando "de colchón".

De paso se corrigieron otras dos cosas en el motor:

- **La fórmula del hexágono.** El área de un hexágono no es base por altura; es `(3 × √3 ÷ 2) × lado²`. Si algún día calculas adoquines hexagonales, ahora sale bien.
- **Las validaciones.** Antes, si dejabas un campo vacío o escribías letras, la aplicación se caía con un error feo. Ahora detecta el problema y responde con un mensaje claro (por ejemplo, *"El valor de 'largo del área' debe ser mayor que cero"*) en lugar de tronar.

---

## 3. Cómo funciona por dentro (la arquitectura)

Aquí viene la parte que conecta todo. La aplicación tiene **dos mitades que se hablan entre sí**: lo que ves en la pantalla y lo que piensa por detrás.

![Diagrama del flujo de datos entre el navegador y Python](imagenes/flujo_datos.svg)

### La analogía: la cara y el cerebro

- **El navegador es la cara.** Es todo lo que tú ves y tocas: el formulario donde escribes las medidas, los botones, el dibujo del plano y las tarjetas con los resultados. Está hecho con **HTML** (la estructura), **CSS** (la apariencia) y **JavaScript** (lo que reacciona cuando haces clic). La cara es bonita y atiende al usuario, **pero no sabe hacer las cuentas difíciles**.
- **Python es el cerebro.** Vive en el archivo `app.py` y usa una herramienta llamada **Flask** para poder "escuchar" peticiones. El cerebro no se ve, pero es quien hace toda la matemática corregida del punto anterior.

### El recado que va y viene

El truco es entender que la cara y el cerebro se mandan un recado de ida y vuelta. El recorrido es así:

1. **Tú llenas el formulario** (medidas, forma del terreno, forma del adoquín, patrón y desperdicio) y das clic en *Calcular*.
2. **El navegador empaqueta esos datos** en un formato ordenado llamado **JSON** (piénsalo como una ficha con campos y valores) y se los manda al cerebro con una orden llamada `fetch`. El recado viaja a la dirección `/api/calcular`.
3. **Python recibe la ficha, revisa que todo sea válido, lo convierte todo a metros para no confundirse, hace las cuentas** (área del terreno, área del adoquín, cantidad exacta, desperdicio y el redondeo único) y arma la respuesta, otra vez en JSON.
4. **El navegador recibe la respuesta y la muestra:** escribe los números en las tarjetas y dibuja el plano en el lienzo (con sus reglas de medida, el patrón elegido y las piezas de las orillas marcadas como cortes).

Lo importante de este diseño: **el cálculo solo vive en un lugar** (Python). Así, si mañana hay que ajustar una fórmula, se toca un solo archivo y la cara ni se entera; ella solo pregunta y muestra lo que le respondan.

---

## 4. Lo nuevo que se agregó

Además de arreglar el cálculo, la aplicación creció en tres frentes.

### a) Distintas formas de terreno y de adoquín

Ya no se asume que todo es un rectángulo. Ahora puedes elegir:

- **El terreno** puede ser un **rectángulo** (largo y ancho) o un **cuadrado** (un solo lado).
- **El adoquín** puede ser **rectangular**, **cuadrado** o **hexagonal**.

La forma del adoquín, además, decide qué patrones de acomodo tienen sentido (no puedes hacer espiga con hexágonos, por ejemplo).

### b) Seis patrones de acomodo, dibujados de verdad

Esta es la parte más vistosa. Según la forma del adoquín, la aplicación ofrece patrones reales de albañilería y los **dibuja sobre el plano** para que veas cómo quedarían:

![Lámina con los seis patrones de acomodo](imagenes/patrones.png)

- **Cuadrícula:** las piezas alineadas en filas y columnas, como una rejilla. El acomodo más simple.
- **Soga (o petacado):** filas corridas donde cada hilera se desfasa media pieza, como un muro de ladrillos clásico.
- **Espiga (herringbone):** las piezas en zigzag a 90°, formando una "V" repetida. Muy usado en banquetas y patios.
- **Trenzado (basketweave):** parejas de piezas que se alternan horizontal y vertical, imitando un tejido de canasta.
- **Diagonal:** la cuadrícula girada 45°, para un acomodo en rombo (solo para piezas cuadradas).
- **Panal (honeycomb):** hexágonos embonados, como las celdas de una colmena (para piezas hexagonales).

Cada patrón, además, trae un **desperdicio sugerido** distinto, porque no todos generan la misma cantidad de cortes. La cuadrícula casi no desperdicia (5 %), mientras que la espiga, al tener tantos cortes en las orillas, sugiere más (15 %). Al cambiar de patrón, ese porcentaje se ajusta solo, aunque siempre puedes escribir el tuyo.

### c) Sistema métrico e imperial

La aplicación entiende dos sistemas de medida y **convierte todo internamente a metros** antes de calcular, para que nunca se mezclen las unidades:

- **Métrico:** el terreno en metros, el adoquín en centímetros.
- **Imperial:** el terreno en pies (*ft*), el adoquín en pulgadas (*in*).

Por dentro guarda una tabla de conversión (un metro = 100 cm = 1000 mm = 3.2808 ft = 39.37 in), así que da igual en qué sistema pienses: el resultado siempre es correcto.

---

## 5. Qué archivo hace qué

Si abres la carpeta del proyecto, esto es lo que vas a encontrar y para qué sirve cada cosa:

![Estructura de archivos del proyecto](imagenes/estructura_archivos.svg)

En resumen, en palabras llanas:

- **`app.py`** es **el cerebro**: contiene toda la matemática corregida y la API `/api/calcular`. Es el archivo más importante.
- **`templates/index.html`** es **la estructura** de la página: dónde van el formulario, el lienzo y las tarjetas.
- **`static/css/style.css`** es **la apariencia**: los colores, las tipografías y el acomodo, con el estilo de "mesa de dibujo / plano de ingeniería".
- **`static/js/app.js`** es **la acción del navegador**: el que recoge tus datos, le pregunta a Python y dibuja el plano en el lienzo.
- **`requirements.txt`** lista lo que hay que instalar (en este caso, Flask).
- **`Dockerfile`** y **`.dockerignore`** son las instrucciones para empaquetar todo en un contenedor (lo vemos enseguida).
- **`docs/`** es esta documentación con sus imágenes.

---

## 6. Cómo ejecutar la aplicación

Tienes dos caminos. El recomendado es Docker, porque no te obliga a instalar nada en tu computadora más que el propio Docker.

### Opción A — Con Docker (recomendado)

Docker es como una **caja de mudanza sellada**: dentro va la aplicación con todo lo que necesita para funcionar (Python, Flask, el código). Esa caja corre igual en cualquier computadora, sin que tengas que pelearte con instalaciones.

Párate en la carpeta del proyecto y corre estos dos comandos:

```bash
# 1. Construir la imagen (armar la caja). Solo se hace una vez.
docker build -t adoquines .

# 2. Ejecutar el contenedor (abrir la caja y encender la app)
docker run -p 5000:5000 adoquines
```

El `-p 5000:5000` conecta el puerto de la caja con el de tu computadora, para que puedas asomarte. Una vez encendida, abre tu navegador en:

```text
http://localhost:5000
```

### Opción B — Sin Docker (Python directo)

Si prefieres correrlo a mano, necesitas Python 3 instalado:

```bash
# 1. Instalar Flask
pip install -r requirements.txt

# 2. Encender la aplicación
python app.py
```

Y de nuevo, abres `http://localhost:5000` en el navegador.

---

## 7. Resumen en una frase

Se corrigió el cálculo para que **redondee una sola vez** (ya no infla la compra), se le dio una **cara nueva tipo plano de ingeniería** que dibuja el terreno con seis patrones reales de acomodo, y se le enseñó a trabajar en **métrico e imperial**. La cara pregunta, el cerebro (Python) calcula, y todo viaja empaquetado en un contenedor Docker que corre igual en cualquier máquina.
