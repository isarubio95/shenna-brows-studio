import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode as encodeBase64, decode as decodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const RESEND_API = "https://api.resend.com";
const FORWARD_TO = "Shennabrows@hotmail.com";
const FORWARD_FROM = "Shenna Brows <info@shennabrows.com>";

/** Tolerancia para el timestamp del webhook (segundos). Evita replay attacks. */
const WEBHOOK_TOLERANCE_SEC = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

/**
 * Verifica la firma Svix del webhook de Resend.
 * Usa RESEND_WEBHOOK_SECRET (whsec_...) desde los detalles del webhook en Resend.
 */
async function verifySvixSignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string
): Promise<boolean> {
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(svixTimestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > WEBHOOK_TOLERANCE_SEC) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const secretPart = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const secretBytes = decodeBase64(secretPart);
  const key = await crypto.subtle.importKey(
    "raw",
    (secretBytes as Uint8Array).buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent)
  );
  const expectedSig = encodeBase64(sigBuffer);

  const signatures = svixSignature.split(" ").map((s) => s.trim());
  for (const part of signatures) {
    const [version, value] = part.split(",", 2);
    if (version === "v1" && value && timingSafeEqual(value, expectedSig)) return true;
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

interface WebhookPayload {
  type: string;
  data: { email_id: string; subject?: string; from?: string; to?: string[] };
}

interface ReceivedEmail {
  id: string;
  subject: string | null;
  from: string | null;
  html: string | null;
  text: string | null;
  attachments?: { id: string; filename: string; content_type?: string; content_id?: string | null }[];
}

interface AttachmentListItem {
  id: string;
  filename: string;
  content_type?: string;
  content_disposition?: string | null;
  content_id?: string | null;
  download_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");

  try {
    const rawBody = await req.text();

    if (webhookSecret) {
      const svixId = req.headers.get("svix-id");
      const svixTimestamp = req.headers.get("svix-timestamp");
      const svixSignature = req.headers.get("svix-signature");
      const valid = await verifySvixSignature(
        rawBody,
        svixId,
        svixTimestamp,
        svixSignature,
        webhookSecret
      );
      if (!valid) {
        console.warn("Webhook signature verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const payload: WebhookPayload = JSON.parse(rawBody);

    if (payload.type !== "email.received") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailId = payload.data?.email_id;
    if (!emailId) {
      return new Response(JSON.stringify({ error: "Missing email_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = { Authorization: `Bearer ${apiKey}` };

    const getRes = await fetch(`${RESEND_API}/emails/receiving/${emailId}`, {
      headers: { ...authHeader, "Content-Type": "application/json" },
    });

    if (!getRes.ok) {
      const errText = await getRes.text();
      console.error("Resend get received email error:", getRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch received email", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email: ReceivedEmail = await getRes.json();
    const subject = email.subject || "(Sin asunto)";
    const html = email.html ?? undefined;
    const text = email.text ?? undefined;

    const attachments: { content: string; filename: string; content_type?: string; content_id?: string }[] = [];

    const listAttRes = await fetch(`${RESEND_API}/emails/receiving/${emailId}/attachments`, {
      headers: { ...authHeader, "Content-Type": "application/json" },
    });

    if (listAttRes.ok) {
      const listData = await listAttRes.json();
      const items: AttachmentListItem[] = listData.data ?? [];
      for (const att of items) {
        const downloadUrl = att.download_url;
        if (!downloadUrl) continue;
        try {
          const attRes = await fetch(downloadUrl);
          if (!attRes.ok) continue;
          const buffer = await attRes.arrayBuffer();
          const base64 = encodeBase64(buffer);
          attachments.push({
            content: base64,
            filename: att.filename || "attachment",
            ...(att.content_type && { content_type: att.content_type }),
            ...(att.content_id && { content_id: att.content_id.replace(/^<|>$/g, "") }),
          });
        } catch (e) {
          console.warn("Failed to fetch attachment:", att.id, e);
        }
      }
    }

    const sendBody = {
      from: FORWARD_FROM,
      to: [FORWARD_TO],
      subject: `[Reenvío info@shennabrows.com] ${subject}`,
      ...(html && { html }),
      ...(text && { text }),
      ...(attachments.length > 0 && { attachments }),
    };

    const sendRes = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(sendBody),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("Resend send error:", sendRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to forward email", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sendData = await sendRes.json();
    return new Response(
      JSON.stringify({ message: "Email forwarded", id: sendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Webhook error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
