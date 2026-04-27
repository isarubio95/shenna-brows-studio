# Correos API (Edge Function)

Esta función expone una pasarela backend para consumir servicios de Correos sin exponer credenciales en frontend.

## Rutas de servicios configuradas

- `preregister` -> `/preregister`
- `labels` -> `/labels`
- `requests` -> `/requests`
- `trackpub` -> `/trackpub`
- OAuth token -> `CORREOS_OAUTH_TOKEN_PATH` (por defecto `/oauth/token`)

> Nota: los sub-endpoints concretos de cada servicio (por ejemplo alta de envío, generación de etiqueta o consulta de tracking) se deben validar en tu catálogo privado de `developers.correos.es`, ya que dependen de los productos habilitados por contrato.

## Variables de entorno necesarias

- `CORREOS_API_BASE_URL` (ejemplo: host base del entorno de Correos asignado a tu cuenta)
- `CORREOS_OAUTH_BASE_URL` (opcional, si token OAuth va en host distinto; si no se indica usa `CORREOS_API_BASE_URL`)
- `CORREOS_CLIENT_ID`
- `CORREOS_CLIENT_SECRET`
- `CORREOS_OAUTH_SCOPE` (opcional)
- `CORREOS_OAUTH_TOKEN_PATH` (opcional, default `/oauth/token`)

## Ejemplo de invocación

```json
{
  "service": "trackpub",
  "endpoint": "/shipments/PK123456789ES/events",
  "method": "GET"
}
```
