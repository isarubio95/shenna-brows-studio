-- Los buckets de vídeo dejan de recortarse a 50 MB. El cliente sube el archivo
-- original (sin recomprimir), así que el tope tiene que coincidir con el del
-- origen (200 MB). El límite global del proyecto sigue mandando: en el plan Free
-- de Supabase no se puede pasar de 50 MB.

UPDATE storage.buckets
SET file_size_limit = 209715200
WHERE id IN ('campaign-images', 'product-images');
