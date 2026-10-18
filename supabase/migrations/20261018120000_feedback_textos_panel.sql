-- Correcciones de la clienta (18/10): dos textos ya guardados desde el panel con
-- el valor antiguo. Solo se cambian si nadie los ha editado desde entonces.

UPDATE public.site_content
SET content = jsonb_set(content::jsonb, '{eyebrow}', to_jsonb('El más vendido'::text))::text,
    updated_at = now()
WHERE key = 'site_elixir_spotlight'
  AND content::jsonb ->> 'eyebrow' = 'Producto protagonista';

UPDATE public.site_content
SET content = jsonb_set(content::jsonb, '{compactHeading}', to_jsonb('Tus ventajas al comprar en Shenna BROWS'::text))::text,
    updated_at = now()
WHERE key = 'site_trust_strip'
  AND content::jsonb ->> 'compactHeading' = 'Tus ventajas al comprar en Shenna';
