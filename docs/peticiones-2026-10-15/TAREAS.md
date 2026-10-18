# Peticiones de Alexandra (clienta) — 15/10/2026

Contexto para trabajar en estas tareas. Fuente: conversación de WhatsApp con Alexandra
(dueña de Shenna BROWS) del 13/10 al 15/10/2026. Las citas entre comillas son literales
(las notas de voz están transcritas).

**Importante sobre el alcance:** solo las tareas de la sección A están acordadas y
presupuestadas (2 horas). Las de la sección B son peticiones nuevas que **todavía no están
aprobadas ni presupuestadas**: no implementarlas sin confirmación explícita de Isaías.

## Origen del acuerdo (13/10)

Alexandra, nota de voz:

> "me puedes calcular cuánto costaría hacer que todo lo que es descripción y materiales de
> los productos sea desplegable. [...] y luego que, por ejemplo, lo de los envíos, producto
> de calidad, o sea, lo de los valores diferenciadores, que aparezcan en todas las páginas y
> que en todas las páginas aparezcan las reseñas. [...] me dijeron que tienen que ser
> visibles [...] que aparezcan en carrusel en todas las páginas. O sea, que entren donde
> entren en la web aparezcan las reseñas."

Isaías: "Lo de los desplegables, los valores y mostrar las reseñas en todas las páginas no
cuesta mucho, en dos horas está hecho".

---

## A. Tareas acordadas (2 h)

### A1. Descripción y materiales en desplegables (todas las fichas de producto)

- Ahora se muestran abiertos en [ProductPage.tsx](../../src/pages/ProductPage.tsx)
  (bloques "Descripción" y "Materiales"/"Composición", ~línea 363).
- Convertirlos en desplegables (acordeón), cerrados por defecto.
- Vídeo: "tanto la descripción como los materiales abajo tienen que estar en desplegables".
- Ver [06-video-ficha-elixir-fotogramas.jpg](img/06-video-ficha-elixir-fotogramas.jpg).

### A2. Franja de valores / confianza en todas las páginas

Contenido (imagen [01-franja-confianza.jpg](img/01-franja-confianza.jpg)):

| Icono | Título | Subtítulo |
|---|---|---|
| Camión | Envío gratis | En pedidos superiores a 50 € |
| Caja con check | Entrega en 2–3 días | Laborables, según las condiciones de envío |
| Escudo con check | Pago seguro | Métodos de pago disponibles en la tienda |
| Bocadillo | Te acompañamos | Atención cercana a través de WhatsApp |

- Posición: "debajo de la marquesina en movimiento, los cuatro en fila, con emoticono rosa
  y letras en rosa si queda bien".
- En la ficha de producto se repite con el título **"Tus ventajas al comprar en Shenna"**
  (imagen [04-ventajas-ficha-producto.jpg](img/04-ventajas-ficha-producto.jpg)), en versión
  compacta (icono + título + subtítulo corto).
- Un solo componente reutilizable con ambas variantes.

### A3. Reseñas visibles en carrusel en todas las páginas

- Hoy [TestimonialsCarousel](../../src/components/TestimonialsCarousel.tsx) solo se usa en
  [Index.tsx](../../src/pages/Index.tsx).
- Llevarlo a todas las páginas (layout común).
- Mantener también la vista actual de reseñas: "Reseñas en todas las páginas visibles en
  carrusel y no solo como lo tenemos, que es precioso".

---

## B. Peticiones nuevas — NO aprobadas, pendientes de presupuesto

No implementar sin confirmación. Se documentan para tener el contexto.

- **B1. Bloque "Nuestros valores" de marca en todas las páginas.** Amplía A2: es un
  segundo bloque.
  - Ver [02-valores-de-marca.jpg](img/02-valores-de-marca.jpg). Título "La esencia que
    define Shenna BROWS" y subtítulo "BELLEZA · PRECISIÓN · CUIDADO · DETALLE".
  - Son 4 tarjetas con foto: Precisión en cada detalle / Tu belleza, a tu manera /
    Cuidado que acompaña / El valor de los detalles.
  - No existe en el código actual.
  - Alexandra: "Luego los valores diferenciadores de la propia marca y después Elixir como
    producto estrella [...] Esto debe de estar en cada página que pinchen".
- **B2. Claims de venta por producto (zona editable).**
  - Unos 5 argumentos de venta justo debajo del precio. Ejemplo:
    [05-por-que-elegir-elixir.jpg](img/05-por-que-elegir-elixir.jpg).
  - Orden pedido en la ficha: precio → claims → "Tus ventajas al comprar en Shenna" →
    desplegables de descripción y materiales.
  - Quiere poder editarlos ella desde el admin: "con que me dejes esa zona para editar de
    cinco líneas, yo me ocupo". Alternativa que ofrece: enviar los textos para que se
    pongan a mano.
- **B3. Cambiar el texto "5 herramientas esenciales para el artista que busca
  perfección".**
  - Motivo: "si es lo primero que se ve, la consumidora piensa que es una página solamente
    para profesionales".
  - No aparece en `src/`: probablemente es contenido editable de la base de datos
    (site content).
  - Falta el texto nuevo.
- **B4. Que Elixir sea siempre el primer producto que se ve al entrar en la web.**
- **B5. Sección "Elixir, producto protagonista".**
  - Beneficios claros, demostración y botón de añadir al carrito.
  - También en todas las páginas.
- **B6. Reordenar la página según su esquema.**
  - Ver [03-esquema-orden-pagina.jpg](img/03-esquema-orden-pagina.jpg).
  - Orden: 1. marquesina → 2. franja de confianza → 3. valores diferenciadores →
    4. Elixir protagonista → 5. packs, resto de la colección y opiniones.
- **B7. Campaña antes que la colección.**
  - Hoy `CampaignBanner` va después de `#coleccion` en Index.tsx.
  - Alexandra: "que antes de ver colección, que vean directamente la campaña".
- **B8. Productos en cuadrícula como los packs, sin deslizar a los lados.**
  - Alexandra: "los productos aparezcan como los packs, que se vean sin deslizar a los
    lados".
- **B9. "Propuesta de valor".** Alexandra dijo que enviaría el contenido; aún no ha llegado.

## C. Dudas abiertas con la clienta

- **Plazo de envío.** En el vídeo dice "envío en máximo 24 horas, entrega de 2 a 3 días", y
  la franja dice "Entrega en 2–3 días". Confirmar el texto.
- **Valores de marca.** No está claro si B1 cuenta como parte de A2 o es un extra. Ella
  habló de "lo de los envíos, producto de calidad" el 13/10.
- **Recomendaciones del Loom.** Hay un Loom del consultor ("Mejoras clave en tu web y
  Black Friday", 08/10) con más recomendaciones. Nunca se pasó por escrito ni se
  presupuestó.

## Archivos

- `img/01-franja-confianza.jpg`: contenido de la franja de confianza (A2).
- `img/02-valores-de-marca.jpg`: bloque de valores de marca (B1).
- `img/03-esquema-orden-pagina.jpg`: orden de secciones deseado (B6).
- `img/04-ventajas-ficha-producto.jpg`: "Tus ventajas al comprar en Shenna" en la ficha (A2).
- `img/05-por-que-elegir-elixir.jpg`: ejemplo de claims de venta (B2).
- `img/06-video-ficha-elixir.mp4`: vídeo de 30 s señalando la ficha de Elixir debajo de
  "Añadir al carrito".
- `img/06-video-ficha-elixir-fotogramas.jpg`: fotogramas del vídeo.
  - Transcripción: "Vale, entonces tanto la descripción como los materiales abajo tienen que
    estar en desplegables y aquí vamos a poner nuestros valores diferenciadores de cada
    producto que serán como 5 argumentos de venta, 5 ganchos de venta y justo debajo de los
    ganchos de venta, antes de la descripción y de los materiales, tendremos que tener otra
    vez puesto lo de pago seguro, envío en máximo 24 horas, entrega de 2 a 3 días, o sea
    todas estas cosas que hacen tan importantes que una persona se decida al comprar."
