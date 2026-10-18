-- Bloques de marketing editables desde el panel (Contenido): franja de confianza,
-- propuesta de valor, valores de marca, producto protagonista y título de la colección.
-- Opcional: sin estas filas la web usa los mismos valores por defecto, y el panel
-- crea cada fila la primera vez que se guarda. Los textos provisionales (plazo de
-- entrega, subtítulo de la colección, propuesta de valor) están marcados en el panel.

INSERT INTO public.site_content (key, title, content)
SELECT
  'site_trust_strip',
  'Franja de confianza',
  '{"enabled":true,"compactHeading":"Tus ventajas al comprar en Shenna","items":[{"icon":"truck","title":"Envío gratis","subtitle":"En pedidos superiores a 50 €","compactTitle":"Envío gratis","compactSubtitle":"Desde 50 €"},{"icon":"package-check","title":"Entrega en 2–3 días","subtitle":"Laborables, según las condiciones de envío","compactTitle":"Entrega en 2–3 días","compactSubtitle":"Laborables"},{"icon":"shield-check","title":"Pago seguro","subtitle":"Métodos de pago disponibles en la tienda","compactTitle":"Pago seguro","compactSubtitle":""},{"icon":"message-circle","title":"Te acompañamos","subtitle":"Atención cercana a través de WhatsApp","compactTitle":"Atención por WhatsApp","compactSubtitle":""}]}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'site_trust_strip'
);

INSERT INTO public.site_content (key, title, content)
SELECT
  'site_value_proposition',
  'Propuesta de valor',
  '{"enabled":false,"eyebrow":"Nuestra propuesta","text":"Herramientas y fórmulas creadas desde la experiencia profesional para que consigas unas cejas bonitas, definidas y naturales desde casa, sin complicarte. Menos pasos, más tú."}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'site_value_proposition'
);

INSERT INTO public.site_content (key, title, content)
SELECT
  'site_brand_values',
  'Nuestros valores',
  '{"enabled":true,"eyebrow":"Nuestros valores","title":"La esencia que define Shenna BROWS","titleAccent":"Shenna BROWS","keywords":"Belleza · Precisión · Cuidado · Detalle","cards":[{"icon":"crosshair","title":"Precisión en cada detalle","text":"Herramientas diseñadas para definir, cuidar y realzar tu belleza con la máxima precisión.","imageUrl":"/valores/precision.jpg","imageAlt":"Pinza de precisión Shenna"},{"icon":"heart","title":"Tu belleza, a tu manera","text":"Resultados que respetan tu estilo y realzan tu expresión natural.","imageUrl":"/valores/belleza.jpg","imageAlt":"Ceja definida de forma natural"},{"icon":"leaf","title":"Cuidado que acompaña","text":"Fórmulas y rutinas pensadas para el cuidado diario de tus cejas y pestañas.","imageUrl":"/valores/cuidado.jpg","imageAlt":"Gota de sérum cayendo de un cuentagotas"},{"icon":"sparkle","title":"El valor de los detalles","text":"Una experiencia cuidada de principio a fin, con la calidad y el diseño que nos definen.","imageUrl":"/valores/detalles.jpg","imageAlt":"Caja de regalo Shenna BROWS"}]}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'site_brand_values'
);

INSERT INTO public.site_content (key, title, content)
SELECT
  'site_elixir_spotlight',
  'Producto protagonista',
  '{"enabled":true,"productSlug":"elixir","eyebrow":"Producto protagonista","title":"","description":"El fijador híbrido de cejas y pestañas de Shenna BROWS: fijación y cuidado diario en un solo gesto.","benefits":["Fijación con acabado natural","Sin residuos blancos visibles","Fijación y cuidado en una misma fórmula","Enriquecido con péptidos y activos cosméticos","Cejas y pestañas en un solo gesto"],"demoVideoId":"","ctaText":"Añadir al carrito","secondaryCtaText":"Ver ficha completa"}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'site_elixir_spotlight'
);

INSERT INTO public.site_content (key, title, content)
SELECT
  'index_collection_intro',
  'Título de la colección',
  '{"title":"Nuestra colección","subtitle":"Todo lo que necesitas para cuidar, definir y realzar tus cejas, con la precisión de la experiencia profesional."}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE key = 'index_collection_intro'
);
