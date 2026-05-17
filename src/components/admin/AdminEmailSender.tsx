import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import AdminEmailComposeDialog, { type AdminEmailSendPayload } from "@/components/admin/AdminEmailComposeDialog";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
const SEND_ADMIN_EMAIL_ENDPOINT = `${SUPABASE_URL}/functions/v1/send-admin-email`;

const AdminEmailSender = () => {
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const fetchSubscriberCount = useCallback(async () => {
    setLoadingCount(true);
    const { count, error } = await supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("is_subscribed", true);
    if (error) {
      console.warn("newsletter_subscribers_count", error.message);
      setSubscriberCount(0);
    } else {
      setSubscriberCount(count ?? 0);
    }
    setLoadingCount(false);
  }, []);

  useEffect(() => {
    fetchSubscriberCount();
  }, [fetchSubscriberCount]);

  const sendNewsletter = async (payload: AdminEmailSendPayload) => {
    if (subscriberCount === 0) {
      return { ok: false, error: "No hay suscriptores activos" };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const res = await fetch(SEND_ADMIN_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        audience: "newsletter",
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments,
      }),
    });

    const result = await res.json();
    if (res.ok) {
      return { ok: true, message: result.message };
    }
    return { ok: false, error: result.error, status: res.status };
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-carbon/60">Audiencia</p>
          <p className="text-carbon font-medium">
            {loadingCount ? "Cargando suscriptores..." : `${subscriberCount} suscriptor(es) activos`}
          </p>
        </div>
        <Button
          onClick={() => setComposeOpen(true)}
          disabled={loadingCount || subscriberCount === 0}
          className="bg-gold hover:bg-gold/90 text-white"
        >
          <Mail className="h-4 w-4 mr-2" />
          Enviar newsletter
        </Button>
      </div>

      <AdminEmailComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        title="Enviar newsletter"
        recipientHint={
          loadingCount
            ? undefined
            : `${subscriberCount} suscriptor(es) activos de la newsletter`
        }
        sendButtonLabel="Enviar"
        onSend={sendNewsletter}
      />
    </div>
  );
};

export default AdminEmailSender;
