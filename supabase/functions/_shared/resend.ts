const resendApiUrl = "https://api.resend.com/emails";

export function getResendFromAddress(): string {
  return Deno.env.get("RESEND_FROM_ADDRESS")?.trim() || "Shenna Brows <info@shennabrows.com>";
}

export async function sendResendEmail(args: {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
  attachments?: Array<{ filename: string; content: string; content_type: string }>;
}): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!resendApiKey) {
    return { ok: false, status: 500, detail: "RESEND_API_KEY not configured" };
  }

  const email = args.to.trim().toLowerCase();
  if (!email) {
    return { ok: false, status: 400, detail: "Missing recipient email" };
  }

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getResendFromAddress(),
      to: [email],
      subject: args.subject,
      html: args.html,
      ...(args.headers ? { headers: args.headers } : {}),
      ...(args.attachments?.length ? { attachments: args.attachments } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, status: response.status, detail };
  }

  return { ok: true };
}
