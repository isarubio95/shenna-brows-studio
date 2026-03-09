# Reenvío de correos info@shennabrows.com → Shennabrows@hotmail.com

Esta función Edge recibe el webhook de Resend cuando llega un correo a **info@shennabrows.com** y lo reenvía automáticamente a **Shennabrows@hotmail.com**.

## Configuración en Resend

1. **Dominio y recepción (Inbound)**  
   - En [Resend → Domains](https://resend.com/domains) verifica el dominio **shennabrows.com** (o un subdominio, p. ej. `mail.shennabrows.com`).  
   - Activa **Receive emails** (Inbound) para ese dominio y configura los registros MX que te indique Resend.

2. **Webhook**  
   - En [Resend → Webhooks](https://resend.com/webhooks) crea un webhook con:  
     - **URL**: `https://<TU_PROYECTO_SUPABASE>.supabase.co/functions/v1/resend-forward-inbound`  
     - **Eventos**: marca `email.received`.  
   - **Recomendado:** copia el **Signing secret** (empieza por `whsec_...`) y configúralo como secreto `RESEND_WEBHOOK_SECRET` en Supabase. Así la función verificará que cada POST viene de Resend y rechazará peticiones falsas (401).

3. **Variable de entorno en Supabase**  
   - En el proyecto Supabase: **Project Settings → Edge Functions → Secrets** (o **Settings → API**).  
   - Añade el secreto:  
     - **Nombre**: `RESEND_API_KEY`  
     - **Valor**: tu API Key de Resend (con permiso para enviar y para “Receiving”).

## Despliegue

**Importante:** Esta función la llama Resend (no el navegador), así que debe desplegarse **sin verificación JWT** para que Resend pueda llamarla sin la API key de Supabase:

```bash
supabase functions deploy resend-forward-inbound --no-verify-jwt
```

Si usas secretos:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
supabase secrets set RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

## Comportamiento

- Resend envía un `POST` a esta función con `type: "email.received"` y `data.email_id`.
- La función obtiene el correo recibido con la API de Resend, descarga adjuntos (si los hay) y envía un nuevo correo desde **Shenna Brows &lt;info@shennabrows.com&gt;** a **Shennabrows@hotmail.com** con el mismo asunto (prefijado `[Reenvío info@shennabrows.com]`), cuerpo HTML/texto y adjuntos.
