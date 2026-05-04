# Correos API (Edge Function)

Esta función expone una pasarela backend para consumir servicios de Correos sin exponer credenciales en frontend.

## Rutas de servicios (PRO, alineado con Postman Correos)

Con `CORREOS_API_BASE_URL=https://api1.correos.es` (solo host; si termina en `/admissions` se normaliza):

- `preregister` → `…/admissions/preregister` + endpoint (p. ej. `/api/v1/delivery`)
- `labels` → `…/support/labels/api/v1` + endpoint (p. ej. `/labels/print`)
- `requests` → `/requests`
- `trackpub` → `/trackpub`

OAuth (Correos Identidad): `CORREOS_OAUTH_TOKEN_URL` URL completa del token, o `CORREOS_OAUTH_TOKEN_PATH` si usas base OAuth.

Credenciales recomendadas:

- **Identidad (JWT):** `CORREOS_OAUTH_CLIENT_ID`, `CORREOS_OAUTH_CLIENT_SECRET`, `CORREOS_OAUTH_SCOPE` (ej. `AP3 LBS RCG`)
- **API Developers (preregister/labels):** `CORREOS_API_CLIENT_ID`, `CORREOS_API_CLIENT_SECRET`

## Variables de entorno necesarias

- `CORREOS_API_BASE_URL` — ejemplo: `https://api1.correos.es`
- `CORREOS_OAUTH_TOKEN_URL` — ejemplo: `https://apioauthcid.correos.es/Api/Authorize/Token`
- `CORREOS_OAUTH_CLIENT_ID` / `CORREOS_OAUTH_CLIENT_SECRET` / `CORREOS_OAUTH_SCOPE`
- `CORREOS_API_CLIENT_ID` / `CORREOS_API_CLIENT_SECRET`
- Opcionales: `CORREOS_OAUTH_BASE_URL`, `CORREOS_OAUTH_TOKEN_PATH`

### Contrato / cliente / etiquetador (PRO vs PRE)

El panel envía en el cuerpo de **preregister** `contractNumber`, `clientNumber` y `labellerCode` desde variables `VITE_*` del build. Si ahí quedan datos del **entorno de pruebas** pero el token y la URL son de **producción**, Correos verá la incoherencia.

Opcionalmente puedes definir en **secrets del proyecto Supabase** (misma función `correos-api`) estos nombres; si un valor está definido y no vacío, **sustituye** el que venga del cliente solo en la petición de preregister:

- `CORREOS_CONTRACT_NUMBER`
- `CORREOS_CLIENT_NUMBER`
- `CORREOS_LABELLER_CODE`

Así en producción mandas siempre los datos reales del contrato aunque el frontend tenga `VITE_*` de PRE por error.

## Ejemplo de invocación

```json
{
  "service": "trackpub",
  "endpoint": "/shipments/PK123456789ES/events",
  "method": "GET"
}
```
