-- Los buckets de assets pasan a guardar también vídeo (hero, campaña, hero de
-- tienda, popup de bienvenida y galería de producto).
--
-- No se fija `allowed_mime_types` a propósito: el vídeo se sube con el tipo que
-- produce MediaRecorder en cada navegador (video/mp4 o video/webm) y una lista
-- blanca rompería la subida en cuanto apareciera una variante nueva. El control
-- de tipo y de tamaño se hace en el cliente (`src/lib/optimize-video-upload.ts`).
--
-- `file_size_limit` queda explícito en 50 MB, que es el tope por defecto del
-- proyecto. El cliente rechaza cualquier vídeo que supere 45 MB ya optimizado,
-- así que el error se ve en el admin y no como un fallo opaco de Storage.

UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id IN ('campaign-images', 'product-images');
