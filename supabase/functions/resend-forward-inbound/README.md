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

---

## Enviar correos como info@shennabrows.com desde Outlook / Hotmail

Para que **todos los correos que envíes** desde tu cuenta (p. ej. Shennabrows@hotmail.com) **salgan como enviados desde info@shennabrows.com**, configura tu cliente de correo para usar el **SMTP de Resend**. Así el envío lo hace Resend con tu dominio verificado y el remitente será info@shennabrows.com.

### Requisitos

- Dominio **shennabrows.com** verificado en Resend (con SPF/DKIM para envío).
- Una [API Key de Resend](https://resend.com/api-keys) con permiso de envío.

### Datos SMTP de Resend

| Campo      | Valor              |
|-----------|--------------------|
| Servidor  | `smtp.resend.com`   |
| Puerto    | `465` (SSL) o `587` (STARTTLS) |
| Usuario   | `resend`           |
| Contraseña| Tu API Key de Resend (p. ej. `re_xxxx...`) |

### Outlook (Windows / Mac)

1. **Archivo → Configuración de la cuenta → Configuración de la cuenta** (o **Información → Cuenta → Configuración de la cuenta**).
2. **Agregar cuenta** (o **Configuración de la cuenta de correo**).
3. Elige **Configuración manual** / **Otro tipo de cuenta** (no uses la detección automática).
4. Configura una **cuenta de correo electrónico** con:
   - **Dirección de correo:** `info@shennabrows.com`
   - **Servidor de correo entrante:** si solo quieres enviar desde esta dirección, puedes dejar el de Hotmail o un servidor ficticio; lo importante es el **saliente**.
   - **Servidor de correo saliente (SMTP):**
     - Servidor: `smtp.resend.com`
     - Puerto: `465` (SSL) o `587`
     - Autenticación: **Sí** (usuario y contraseña).
     - Usuario: `resend`
     - Contraseña: tu API Key de Resend.

O bien añade **info@shennabrows.com** como “Enviar como” en tu cuenta de Hotmail y, cuando te pida el servidor saliente, usa los datos SMTP de Resend anteriores.

### Outlook.com / Hotmail (web)

En la versión web no suele permitirse SMTP personalizado. Opciones:

- Usar **Outlook de escritorio** (Windows/Mac) con la configuración anterior, o
- Usar otro cliente (Thunderbird, Apple Mail, etc.) con los mismos datos SMTP.

### Resumen

- **Entrada:** Los correos que llegan a **info@shennabrows.com** se reenvían a Shennabrows@hotmail.com (esta Edge Function + Inbound de Resend).
- **Salida:** Configurando el SMTP de Resend en tu cliente con remitente **info@shennabrows.com**, los correos que envíes saldrán desde esa dirección y pasarán por Resend, con SPF/DKIM correctos para tu dominio.
