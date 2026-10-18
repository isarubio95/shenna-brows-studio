-- Argumentos de venta por producto: hasta cinco líneas bajo «Añadir al carrito»
-- (la primera frase de cada línea sale en negrita). Se editan en Catálogo.
-- Las políticas de lectura y edición de `products` ya cubren la columna nueva.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS claims text;

COMMENT ON COLUMN public.products.claims IS
  'Argumentos de venta de la ficha: uno por línea, máximo 5.';

-- Los de Elixir los envió la clienta («¿Por qué elegir ELIXIR?»). Solo si aún no hay.
UPDATE public.products
SET claims = concat_ws(
  E'\n',
  'Fijación con acabado natural. Mantén tus cejas definidas y en su sitio.',
  'Sin residuos blancos visibles. Un acabado limpio y discreto.',
  'Fijación y cuidado en una misma fórmula. Combina polímeros fijadores con activos cosméticos.',
  'Enriquecido con péptidos y activos cosméticos. Una fórmula pensada para acompañar tu rutina de cuidado.',
  'Cejas y pestañas en un solo gesto. Dos zonas, una propuesta de cuidado y definición, según las instrucciones de uso.'
)
WHERE slug = 'elixir'
  AND (claims IS NULL OR btrim(claims) = '');
