import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  buildCustomerEmail,
  CUSTOMER_EMAIL_GROUP_LABELS,
  CUSTOMER_EMAILS,
  CUSTOMER_EMAILS_CONTENT_KEY,
  customerEmailDef,
  parseCustomerEmailOverrides,
  resolveCustomerEmail,
  sampleCustomerEmailData,
  serializeCustomerEmailOverrides,
  type CustomerEmailGroup,
  type CustomerEmailKey,
  type CustomerEmailOverrides,
} from "../../../supabase/functions/_shared/customerEmails";

type Row = { id: string; content: string | null };

const GROUPS: CustomerEmailGroup[] = ["pedidos", "devoluciones", "newsletter"];

/** Todos los textos tal y como salen ahora (originales + cambios guardados). */
function fullDraft(overrides: CustomerEmailOverrides): CustomerEmailOverrides {
  const out: CustomerEmailOverrides = {};
  for (const def of CUSTOMER_EMAILS) {
    const resolved = resolveCustomerEmail(def.key, overrides);
    out[def.key] = Object.fromEntries(def.fields.map((f) => [f.key, resolved[f.key]]));
  }
  return out;
}

const AdminAutomaticEmails = () => {
  const { toast } = useToast();
  const [row, setRow] = useState<Row | null>(null);
  const [draft, setDraft] = useState<CustomerEmailOverrides>(() => fullDraft({}));
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    serializeCustomerEmailOverrides(fullDraft({})),
  );
  const [selected, setSelected] = useState<CustomerEmailKey>("order_paid");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("site_content")
        .select("id, content")
        .eq("key", CUSTOMER_EMAILS_CONTENT_KEY)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({ title: "No se pudieron cargar los emails", description: error.message, variant: "destructive" });
      }
      const next = fullDraft(parseCustomerEmailOverrides(data?.content ?? ""));
      setRow(data ?? null);
      setDraft(next);
      setSavedSnapshot(serializeCustomerEmailOverrides(next));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const serialized = useMemo(() => serializeCustomerEmailOverrides(draft), [draft]);
  const dirty = serialized !== savedSnapshot;
  const savedOverrides = useMemo(() => parseCustomerEmailOverrides(savedSnapshot), [savedSnapshot]);

  const def = customerEmailDef(selected);
  const values = draft[selected] ?? {};
  const preview = useMemo(
    () => buildCustomerEmail(sampleCustomerEmailData(selected, window.location.origin), draft),
    [selected, draft],
  );
  const selectedIsCustom = Boolean(parseCustomerEmailOverrides(serialized)[selected]);

  const setField = (field: string, text: string) =>
    setDraft((prev) => ({ ...prev, [selected]: { ...prev[selected], [field]: text } }));

  const restoreSelected = () =>
    setDraft((prev) => ({ ...prev, [selected]: fullDraft({})[selected] }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { title: "Emails automáticos", content: serialized };
      if (row) {
        const { error } = await (supabase as any).from("site_content").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("site_content")
          .insert({ key: CUSTOMER_EMAILS_CONTENT_KEY, ...payload })
          .select("id, content")
          .single();
        if (error) throw error;
        setRow(data);
      }
      setSavedSnapshot(serialized);
      toast({ title: "Emails guardados", description: "Los próximos emails saldrán con estos textos." });
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-carbon/50">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando emails…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Emails automáticos" className="space-y-5">
        {GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-1.5 text-xs uppercase tracking-wider text-carbon/45">
              {CUSTOMER_EMAIL_GROUP_LABELS[group]}
            </p>
            <ul className="space-y-1">
              {CUSTOMER_EMAILS.filter((e) => e.group === group).map((email) => {
                const active = email.key === selected;
                return (
                  <li key={email.key}>
                    <button
                      type="button"
                      onClick={() => setSelected(email.key)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        active ? "bg-gold/15 text-carbon" : "text-carbon/65 hover:bg-gold/8 hover:text-carbon",
                      )}
                    >
                      <span>{email.label}</span>
                      {savedOverrides[email.key] ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" title="Texto cambiado" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className="text-xs leading-relaxed text-carbon/40">
          El punto dorado marca los emails con textos cambiados. Los de la newsletter llevan
          siempre el enlace para darse de baja.
        </p>
      </nav>

      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-playfair text-lg font-semibold text-carbon">{def.label}</h3>
            <p className="mt-1 max-w-prose text-sm text-carbon/55">{def.trigger}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={restoreSelected}
              disabled={!selectedIsCustom}
              className="border-gold/20 text-carbon/70"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Texto original
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={!dirty || saving}
              className="bg-gold text-white hover:bg-gold/90"
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              {dirty ? "Guardar cambios" : "Guardado"}
            </Button>
          </div>
        </div>

        {def.placeholders.length ? (
          <div className="rounded-lg border border-gold/15 bg-cream/50 p-3 text-xs text-carbon/60">
            <p className="mb-1.5">Puedes escribir estas palabras entre llaves y se cambian por el dato real:</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {def.placeholders.map((p) => (
                <li key={p.token}>
                  <code className="rounded bg-white px-1 py-0.5 font-mono text-carbon/80">{p.token}</code>{" "}
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-4">
          {def.fields.map((field) => {
            const original = def.defaults[field.key] ?? "";
            const value = values[field.key] ?? "";
            const id = `customer-email-${selected}-${field.key}`;
            return (
              <div key={field.key}>
                <div className="flex items-center gap-2">
                  <Label htmlFor={id} className="text-carbon/60 text-xs uppercase tracking-wider">
                    {field.label}
                  </Label>
                  {field.optional ? (
                    <Badge variant="outline" className="border-gold/20 px-1.5 py-0 text-[0.6rem] font-normal text-carbon/45">
                      opcional
                    </Badge>
                  ) : null}
                </div>
                {field.multiline ? (
                  <Textarea
                    id={id}
                    value={value}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.optional ? "Vacío: no sale" : original}
                    className="mt-1 min-h-[110px] border-gold/20 focus-visible:ring-gold/30"
                  />
                ) : (
                  <Input
                    id={id}
                    value={value}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.optional ? "Vacío: no sale" : original}
                    className="mt-1 border-gold/20 focus-visible:ring-gold/30"
                  />
                )}
                {field.help || (!field.optional && !value.trim()) ? (
                  <p className="mt-1 text-xs text-carbon/40">
                    {!field.optional && !value.trim() ? "Vacío: se usará el texto original. " : ""}
                    {field.help ?? ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-carbon/45">Vista previa (datos de ejemplo)</p>
          <div className="overflow-hidden rounded-lg border border-gold/15 bg-white">
            <p className="border-b border-gold/10 px-4 py-2.5 text-sm text-carbon/70">
              <span className="text-carbon/40">Asunto:</span> {preview.subject}
            </p>
            <iframe
              title={`Vista previa: ${def.label}`}
              srcDoc={`<!doctype html><meta charset="utf-8"><body style="margin:0">${preview.html}</body>`}
              sandbox=""
              className="h-[560px] w-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAutomaticEmails;
