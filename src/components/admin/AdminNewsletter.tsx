import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Mail, RefreshCw } from "lucide-react";
import AdminEmailComposeDialog, { type AdminEmailSendPayload } from "@/components/admin/AdminEmailComposeDialog";
import {
  NEWSLETTER_BATCH_SIZE,
  buildNewsletterBatches,
  nextUnsentEmails,
} from "@/lib/newsletter-batches";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
const SEND_ADMIN_EMAIL_ENDPOINT = `${SUPABASE_URL}/functions/v1/send-admin-email`;
const PAGE_SIZE = 1000;

type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  is_subscribed: boolean;
  created_at: string;
  user_id: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  footer_form: "Pie de página",
  register_form: "Registro",
  maintenance_page: "Página mantenimiento",
  public_form: "Formulario público",
  welcome_popup: "Popup bienvenida",
  campaign_cta: "Botón de campaña",
};

const formatSource = (source: string) => SOURCE_LABELS[source] ?? source;

const AdminNewsletter = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Emails que ya han recibido un envío desde que se abrió el panel. */
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const rows: NewsletterSubscriber[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("id, email, source, is_subscribed, created_at, user_id")
        .eq("is_subscribed", true)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        console.warn("newsletter_subscribers_list", error.message);
        break;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
    }
    setSubscribers(rows);
    const stillSubscribed = new Set(rows.map((row) => row.email));
    setSelected((prev) => new Set([...prev].filter((email) => stillSubscribed.has(email))));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const batches = useMemo(() => buildNewsletterBatches(subscribers), [subscribers]);

  const filteredSubscribers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subscribers;
    return subscribers.filter((row) => row.email.toLowerCase().includes(query));
  }, [subscribers, search]);

  const visibleSelectedCount = filteredSubscribers.filter((row) => selected.has(row.email)).length;
  const headerChecked: boolean | "indeterminate" =
    filteredSubscribers.length > 0 && visibleSelectedCount === filteredSubscribers.length
      ? true
      : visibleSelectedCount > 0
        ? "indeterminate"
        : false;

  const toggleOne = (email: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(email);
      else next.delete(email);
      return next;
    });
  };

  const toggleVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of filteredSubscribers) {
        if (checked) next.add(row.email);
        else next.delete(row.email);
      }
      return next;
    });
  };

  const selectBatch = (value: string) => {
    const batch = batches[Number(value)];
    if (batch) setSelected(new Set(batch.emails));
  };

  const selectNextUnsent = () => {
    setSelected(new Set(nextUnsentEmails(subscribers, sent)));
  };

  const selectedCount = selected.size;
  const overLimit = selectedCount > NEWSLETTER_BATCH_SIZE;
  const selectedAlreadySent = [...selected].filter((email) => sent.has(email)).length;
  const pendingCount = subscribers.filter((row) => !sent.has(row.email)).length;

  const recipientHint = useMemo(() => {
    const emails = [...selected];
    if (emails.length === 1) return emails[0];
    const preview = emails.slice(0, 3).join(", ");
    return `${emails.length} suscriptoras: ${preview}${emails.length > 3 ? "…" : ""}`;
  }, [selected]);

  const sendNewsletter = async (payload: AdminEmailSendPayload) => {
    const recipients = [...selected];
    if (recipients.length === 0) {
      return { ok: false, error: "No hay destinatarios seleccionados" };
    }
    if (recipients.length > NEWSLETTER_BATCH_SIZE) {
      return { ok: false, error: `Máximo ${NEWSLETTER_BATCH_SIZE} destinatarios por envío` };
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
        recipients,
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      return { ok: false, error: result.error, status: res.status };
    }

    // El servidor devuelve los emails en minúsculas; los volvemos a la forma guardada.
    const storedByLower = new Map(recipients.map((email) => [email.toLowerCase(), email]));
    const delivered = (result.results ?? [])
      .filter((r: { success: boolean }) => r.success)
      .map((r: { email: string }) => storedByLower.get(r.email.toLowerCase()) ?? r.email);
    setSent((prev) => new Set([...prev, ...delivered]));
    setSelected(new Set());
    return { ok: true, message: result.message };
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-carbon/60">Suscriptoras activas</p>
            <p className="text-carbon font-medium">
              {loading
                ? "Cargando..."
                : `${subscribers.length} en total${sent.size > 0 ? ` · ${pendingCount} sin enviar en esta sesión` : ""}`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email..."
              className="border-gold/20 focus:border-gold sm:w-64"
            />
            <Button variant="outline" onClick={fetchSubscribers} disabled={loading} className="border-gold/20">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-2 border-t border-gold/10 pt-4">
          <Select value="" onValueChange={selectBatch} disabled={loading || batches.length === 0}>
            <SelectTrigger className="border-gold/20 lg:w-64">
              <SelectValue placeholder={`Elegir tanda de ${NEWSLETTER_BATCH_SIZE}...`} />
            </SelectTrigger>
            <SelectContent>
              {batches.map((batch) => {
                const done = batch.emails.every((email) => sent.has(email));
                return (
                  <SelectItem key={batch.index} value={String(batch.index)}>
                    Tanda {batch.index + 1} ({batch.from}–{batch.to}){done ? " · enviada" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={selectNextUnsent}
            disabled={loading || pendingCount === 0}
            className="border-gold/20"
          >
            Siguientes {NEWSLETTER_BATCH_SIZE} sin enviar
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSelected(new Set())}
            disabled={selectedCount === 0}
            className="text-carbon/60"
          >
            Quitar selección
          </Button>
          <div className="lg:ml-auto flex flex-col sm:flex-row sm:items-center gap-2">
            <p className={`text-sm ${overLimit ? "text-destructive" : "text-carbon/60"}`}>
              {selectedCount} seleccionada(s)
              {overLimit ? ` · máximo ${NEWSLETTER_BATCH_SIZE} por envío` : ""}
              {!overLimit && selectedAlreadySent > 0 ? ` · ${selectedAlreadySent} ya la recibieron` : ""}
            </p>
            <Button
              onClick={() => setComposeOpen(true)}
              disabled={selectedCount === 0 || overLimit}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              <Mail className="h-4 w-4 mr-2" />
              Enviar newsletter
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-carbon/40 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando suscriptoras...
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-8 text-center text-carbon/40">
            {subscribers.length === 0
              ? "No hay suscriptoras activas todavía"
              : "Ningún resultado para la búsqueda"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gold/10">
                <TableHead className="w-10">
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={(value) => toggleVisible(value === true)}
                    aria-label={search ? "Seleccionar resultados de la búsqueda" : "Seleccionar todas"}
                    className="border-gold data-[state=checked]:bg-gold data-[state=indeterminate]:bg-gold data-[state=checked]:text-white"
                  />
                </TableHead>
                <TableHead className="text-carbon/60">Email</TableHead>
                <TableHead className="text-carbon/60 hidden sm:table-cell">Origen</TableHead>
                <TableHead className="text-carbon/60 hidden md:table-cell">Cuenta</TableHead>
                <TableHead className="text-carbon/60">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-gold/5 cursor-pointer"
                  data-state={selected.has(row.email) ? "selected" : undefined}
                  onClick={() => toggleOne(row.email, !selected.has(row.email))}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(row.email)}
                      onCheckedChange={(value) => toggleOne(row.email, value === true)}
                      aria-label={`Seleccionar ${row.email}`}
                      className="border-gold data-[state=checked]:bg-gold data-[state=checked]:text-white"
                    />
                  </TableCell>
                  <TableCell className="text-carbon text-sm font-medium">
                    <span className="inline-flex items-center gap-2">
                      {row.email}
                      {sent.has(row.email) ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Check className="h-3 w-3" />
                          Enviado
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-carbon/70 text-sm hidden sm:table-cell">
                    {formatSource(row.source)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {row.user_id ? (
                      <Badge variant="outline" className="text-xs border-gold/30 text-gold">
                        Registrado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Sin cuenta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-carbon/60 text-sm">
                    {new Date(row.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AdminEmailComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        title="Enviar newsletter"
        recipientHint={recipientHint}
        sendButtonLabel={`Enviar a ${selectedCount}`}
        preserveDraft
        onSend={sendNewsletter}
      />
    </div>
  );
};

export default AdminNewsletter;
