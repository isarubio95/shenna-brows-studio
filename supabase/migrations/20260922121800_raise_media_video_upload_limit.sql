-- El cliente sube el archivo original sin tope de tamaño. El bucket tampoco
-- impone uno propio (`file_size_limit` a null). El límite global del proyecto
-- sigue mandando: en el plan Free de Supabase no se puede pasar de 50 MB.

UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id IN ('campaign-images', 'product-images');
