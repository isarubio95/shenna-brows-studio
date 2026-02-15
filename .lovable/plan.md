

# Shenna BROWS — Tienda E-Commerce de Lujo

## Visión General
Tienda online premium para una marca de herramientas profesionales de cejas (Pinzas, Tijeras, Gel). Estética minimalista de ultra-lujo con tonos crema, oro y negro carbón, inspirada en las imágenes de referencia proporcionadas.

---

## Fase 1: Diseño y Tema Premium

### Paleta y Tipografía
- Fondo crema seda (#F9F7F2), acentos oro mate (#C5A059), texto negro carbón (#1A1A1A)
- Títulos con fuente Serif elegante (Playfair Display), cuerpo con Sans-serif limpia (Inter)
- Sombras suaves y difuminadas, bordes redondeados sutiles

### Animaciones (Framer Motion)
- Entradas fade-in-up para secciones al hacer scroll
- Micro-interacciones en botones (scale suave al hover)
- Transiciones de página sedosas

---

## Fase 2: Estructura de Páginas

### Navbar Premium
- Sticky con fondo transparente + efecto backdrop-blur al scroll
- Logo "Shenna BROWS" a la izquierda
- Enlaces: Inicio, Pinzas, Tijeras, Gel, Sobre mí
- Iconos: Búsqueda, Usuario (login), Carrito
- Menú hamburguesa elegante en móvil

### 1. Home (Inicio)
- **Hero**: Sección a pantalla completa con titular "La precisión que te define", subtítulo "Herramientas creadas desde la experiencia profesional", CTA "Descubrir colección"
- **Beneficios**: 3 iconos minimalistas — "Acero inoxidable italiano", "Precisión absoluta", "Diseñado por experiencia"
- **Productos destacados**: Grid con los 3 productos, hover elegante con efecto scale
- **Footer premium** con links, redes sociales y copyright

### 2. Páginas de Producto (Pinzas / Tijeras / Gel)
- Landing page dedicada por producto (no categorías)
- Layout: Imagen grande a la izquierda, detalles a la derecha
- Acordeones para: Descripción, Materiales (Acero italiano), Envío
- Botón "Añadir al Carrito" prominente en oro
- Precios placeholder editables desde admin

### 3. Sobre Mí (Storytelling)
- Título "El Storytelling de Shenna BROWS"
- Secciones narrativas con el copy proporcionado: "Donde la precisión se convierte en identidad", "Fabricado donde la calidad es cultura", etc.
- Diseño editorial con tipografía grande y espaciado generoso

### 4. Carrito y Checkout
- **Carrito drawer**: Panel deslizante desde la derecha (Sheet/Drawer)
- Lista de productos, cantidades editables, total
- **Checkout**: Página limpia con formulario de datos de envío
- Integración con Stripe (preparada para modo test)

### 5. Panel de Administración (/admin)
- Ruta protegida solo para usuarios con rol admin
- Dashboard con pedidos recientes (tabla con estado, monto, fecha)
- Formulario para editar stock y precio de productos
- Vista simple y funcional

---

## Fase 3: Backend (Supabase)

### Autenticación
- Registro e inicio de sesión por email/contraseña
- Perfiles de usuario con datos de envío (dirección)

### Base de Datos
- **products**: id, name, slug, description, price, stock, image_url, category, materials, shipping_info
- **profiles**: id (FK auth.users), full_name, address, phone
- **user_roles**: id, user_id (FK auth.users), role (enum: admin, customer) — tabla separada por seguridad
- **orders**: id, user_id, status (pending/paid/shipped), total_amount, shipping_address, created_at
- **order_items**: id, order_id, product_id, quantity, unit_price

### Seguridad (RLS)
- Products: lectura pública, escritura solo admin (validado con función `has_role`)
- Orders/Order Items: usuarios solo ven sus propios pedidos
- Profiles: usuarios solo leen/editan su propio perfil
- User Roles: solo lectura, gestionado por admin

### Datos Iniciales
- Insertar 3 productos (Pinzas, Tijeras, Gel) con precios placeholder y descripciones de marca

---

## Fase 4: Pagos (Stripe)

- Integración de Stripe en modo test
- Flujo de checkout con creación de sesión de pago
- Actualización de estado del pedido tras pago exitoso

---

## Extras
- **SEO**: Meta tags dinámicos por producto (título, descripción, Open Graph)
- **Performance**: Lazy loading de imágenes, code splitting por rutas
- **Responsive**: Diseño mobile-first, menú hamburguesa, layouts adaptados
- **Imágenes**: Se usarán placeholders elegantes; las imágenes reales se pueden subir después desde el admin o reemplazando los assets

