import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type DiscountCode = Tables<"discount_codes">;

type DiscountUsage = {
  id: string;
  email: string;
  created_at: string | null;
  discount_amount: number | null;
  total: number | null;
  status: string;
  stripe_session_id: string | null;
};

type FormState = {
  code: string;
  description: string;
  discount_type: "fixed" | "percent";
  discount_value: string;
  min_subtotal: string;
  max_uses: string;
  max_uses_per_email: string;
  first_order_only: boolean;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_welcome_offer: boolean;
};

const emptyForm = (): FormState => ({
  code: "",
  description: "",
  discount_type: "fixed",
  discount_value: "10",
  min_subtotal: "50",
  max_uses: "",
  max_uses_per_email: "1",
  first_order_only: true,
  starts_at: "",
  ends_at: "",
  is_active: true,
  is_welcome_offer: false,
});

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocal = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const formatMoney = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

const formatValue = (row: DiscountCode) =>
  row.discount_type === "percent"
    ? `${Number(row.discount_value)}%`
    : formatMoney(Number(row.discount_value));

const AdminDiscountCodes = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [usageCode, setUsageCode] = useState<DiscountCode | null>(null);
  const [usages, setUsages] = useState<DiscountUsage[]>([]);
  const [usagesLoading, setUsagesLoading] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("discount_codes_list", error.message);
      toast({
        title: "No se pudieron cargar los códigos",
        description: error.message,
        variant: "destructive",
      });
      setCodes([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as DiscountCode[];
    setCodes(rows);

    const ids = rows.map((r) => r.id);
    if (ids.length === 0) {
      setUsageCounts({});
      setLoading(false);
      return;
    }

    const { data: orderRows, error: ordersErr } = await supabase
      .from("orders")
      .select("discount_code_id")
      .in("discount_code_id", ids)
      .neq("status", "pending_payment");

    if (ordersErr) {
      console.warn("discount_codes_usage_count", ordersErr.message);
      setUsageCounts({});
    } else {
      const counts: Record<string, number> = {};
      for (const row of orderRows ?? []) {
        const id = String((row as { discount_code_id?: string | null }).discount_code_id ?? "");
        if (!id) continue;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      setUsageCounts(counts);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void fetchCodes();
  }, [fetchCodes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [codes, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row: DiscountCode) => {
    setEditing(row);
    setForm({
      code: row.code,
      description: row.description ?? "",
      discount_type: row.discount_type === "percent" ? "percent" : "fixed",
      discount_value: String(row.discount_value ?? ""),
      min_subtotal: row.min_subtotal == null ? "" : String(row.min_subtotal),
      max_uses: row.max_uses == null ? "" : String(row.max_uses),
      max_uses_per_email: row.max_uses_per_email == null ? "" : String(row.max_uses_per_email),
      first_order_only: row.first_order_only,
      starts_at: toDatetimeLocal(row.starts_at),
      ends_at: toDatetimeLocal(row.ends_at),
      is_active: row.is_active,
      is_welcome_offer: row.is_welcome_offer,
    });
    setDialogOpen(true);
  };

  const clearOtherWelcomeOffers = async (exceptId?: string) => {
    let query = supabase
      .from("discount_codes")
      .update({ is_welcome_offer: false })
      .eq("is_welcome_offer", true);
    if (exceptId) {
      query = query.neq("id", exceptId);
    }
    const { error } = await query;
    if (error) throw error;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    const discountValue = Number(form.discount_value.replace(",", "."));
    if (!code) {
      toast({ title: "El código es obligatorio", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      toast({ title: "Valor de descuento inválido", variant: "destructive" });
      return;
    }
    if (form.discount_type === "percent" && discountValue > 100) {
      toast({ title: "El porcentaje no puede superar 100", variant: "destructive" });
      return;
    }

    const minSubtotalRaw = form.min_subtotal.trim();
    const minSubtotal =
      minSubtotalRaw === "" ? null : Number(minSubtotalRaw.replace(",", "."));
    if (minSubtotal != null && (!Number.isFinite(minSubtotal) || minSubtotal < 0)) {
      toast({ title: "Mínimo de pedido inválido", variant: "destructive" });
      return;
    }

    const maxUsesRaw = form.max_uses.trim();
    const maxUses = maxUsesRaw === "" ? null : Math.floor(Number(maxUsesRaw));
    if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
      toast({ title: "Máximo de usos inválido", variant: "destructive" });
      return;
    }

    const maxPerEmailRaw = form.max_uses_per_email.trim();
    const maxPerEmail =
      maxPerEmailRaw === "" ? null : Math.floor(Number(maxPerEmailRaw));
    if (maxPerEmail != null && (!Number.isFinite(maxPerEmail) || maxPerEmail < 1)) {
      toast({ title: "Usos por email inválidos", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (form.is_welcome_offer && form.is_active) {
        await clearOtherWelcomeOffers(editing?.id);
      }

      const payload = {
        code,
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: discountValue,
        min_subtotal: minSubtotal,
        max_uses: maxUses,
        max_uses_per_email: maxPerEmail,
        first_order_only: form.first_order_only,
        starts_at: fromDatetimeLocal(form.starts_at),
        ends_at: fromDatetimeLocal(form.ends_at),
        is_active: form.is_active,
        is_welcome_offer: form.is_welcome_offer,
      };

      if (editing) {
        const { error } = await supabase
          .from("discount_codes")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Código actualizado" });
      } else {
        const { error } = await supabase.from("discount_codes").insert(payload);
        if (error) throw error;
        toast({ title: "Código creado" });
      }
      setDialogOpen(false);
      await fetchCodes();
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const uses = usageCounts[deleteTarget.id] ?? 0;
      if (uses > 0) {
        const { error } = await supabase
          .from("discount_codes")
          .update({ is_active: false, is_welcome_offer: false })
          .eq("id", deleteTarget.id);
        if (error) throw error;
        toast({
          title: "Código desactivado",
          description: "Tenía usos registrados; se ha desactivado en lugar de borrarlo.",
        });
      } else {
        const { error } = await supabase
          .from("discount_codes")
          .delete()
          .eq("id", deleteTarget.id);
        if (error) throw error;
        toast({ title: "Código eliminado" });
      }
      setDeleteTarget(null);
      await fetchCodes();
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openUsages = async (row: DiscountCode) => {
    setUsageCode(row);
    setUsagesLoading(true);
    setUsages([]);
    const { data, error } = await supabase
      .from("orders")
      .select("id, email, created_at, discount_amount, total, status, stripe_session_id")
      .eq("discount_code_id", row.id)
      .neq("status", "pending_payment")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "No se pudieron cargar los usos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUsages((data ?? []) as DiscountUsage[]);
    }
    setUsagesLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-playfair text-2xl font-semibold text-carbon">Códigos de descuento</h2>
          <p className="text-sm text-carbon/50 mt-1">
            Crea, edita y revisa quién ha usado cada código promocional.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchCodes()}
            className="border-gold/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button type="button" onClick={openCreate} className="bg-gold hover:bg-gold/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo código
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-4 border-b border-gold/10">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o descripción…"
            className="max-w-sm border-gold/15"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-carbon/50 py-16">No hay códigos todavía.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gold/10 hover:bg-transparent">
                <TableHead className="text-carbon/60">Código</TableHead>
                <TableHead className="text-carbon/60">Descuento</TableHead>
                <TableHead className="text-carbon/60">Mínimo</TableHead>
                <TableHead className="text-carbon/60">Usos</TableHead>
                <TableHead className="text-carbon/60">Estado</TableHead>
                <TableHead className="text-carbon/60 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className="border-b border-gold/5">
                  <TableCell>
                    <div className="font-medium text-carbon tracking-wide">{row.code}</div>
                    {row.description ? (
                      <div className="text-xs text-carbon/45 mt-0.5 line-clamp-1">{row.description}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-carbon">{formatValue(row)}</TableCell>
                  <TableCell className="text-carbon/70">
                    {row.min_subtotal == null ? "—" : formatMoney(Number(row.min_subtotal))}
                  </TableCell>
                  <TableCell className="text-carbon/70">
                    {usageCounts[row.id] ?? 0}
                    {row.max_uses != null ? ` / ${row.max_uses}` : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant="outline"
                        className={
                          row.is_active
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                            : "border-carbon/15 text-carbon/50"
                        }
                      >
                        {row.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      {row.is_welcome_offer ? (
                        <Badge variant="outline" className="border-gold/30 text-gold bg-gold/5">
                          Welcome
                        </Badge>
                      ) : null}
                      {row.first_order_only ? (
                        <Badge variant="outline" className="border-carbon/15 text-carbon/55">
                          1er pedido
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => void openUsages(row)}
                        title="Ver usos"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(row)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(row)}
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-cream border-gold/20 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair text-carbon">
              {editing ? "Editar código" : "Nuevo código"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dc-code">Código *</Label>
              <Input
                id="dc-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="uppercase border-gold/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc-desc">Descripción</Label>
              <Textarea
                id="dc-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="border-gold/20 min-h-[72px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      discount_type: v === "percent" ? "percent" : "fixed",
                    }))
                  }
                >
                  <SelectTrigger className="border-gold/20 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fijo (€)</SelectItem>
                    <SelectItem value="percent">Porcentaje (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dc-value">Valor *</Label>
                <Input
                  id="dc-value"
                  value={form.discount_value}
                  onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                  className="border-gold/20"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dc-min">Pedido mínimo (€)</Label>
                <Input
                  id="dc-min"
                  value={form.min_subtotal}
                  onChange={(e) => setForm((f) => ({ ...f, min_subtotal: e.target.value }))}
                  className="border-gold/20"
                  placeholder="Vacío = sin mínimo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dc-max">Máx. usos totales</Label>
                <Input
                  id="dc-max"
                  value={form.max_uses}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                  className="border-gold/20"
                  placeholder="Ilimitado"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc-max-email">Máx. usos por email</Label>
              <Input
                id="dc-max-email"
                value={form.max_uses_per_email}
                onChange={(e) => setForm((f) => ({ ...f, max_uses_per_email: e.target.value }))}
                className="border-gold/20"
                placeholder="Ilimitado"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dc-starts">Inicio</Label>
                <Input
                  id="dc-starts"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="border-gold/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dc-ends">Fin</Label>
                <Input
                  id="dc-ends"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  className="border-gold/20"
                />
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-gold/15 bg-white/60 p-3">
              <label className="flex items-center justify-between gap-3 text-sm text-carbon">
                <span>Activo</span>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-carbon">
                <span>Solo primer pedido</span>
                <Switch
                  checked={form.first_order_only}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, first_order_only: v }))}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-carbon">
                <span>Oferta del popup de bienvenida</span>
                <Switch
                  checked={form.is_welcome_offer}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_welcome_offer: v }))}
                />
              </label>
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-gold hover:bg-gold/90 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : editing ? (
                "Guardar cambios"
              ) : (
                "Crear código"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-cream border-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-playfair">
              ¿Eliminar {deleteTarget?.code}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(usageCounts[deleteTarget?.id ?? ""] ?? 0) > 0
                ? "Este código ya tiene usos. Se desactivará en lugar de borrarse para conservar el historial."
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Procesando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(usageCode)} onOpenChange={(o) => !o && setUsageCode(null)}>
        <DialogContent className="bg-cream border-gold/20 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair text-carbon">
              Usos de {usageCode?.code}
            </DialogTitle>
          </DialogHeader>
          {usagesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : usages.length === 0 ? (
            <p className="text-sm text-carbon/50 py-6 text-center">Nadie ha usado este código todavía.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gold/10 hover:bg-transparent">
                  <TableHead className="text-carbon/60">Email</TableHead>
                  <TableHead className="text-carbon/60">Fecha</TableHead>
                  <TableHead className="text-carbon/60">Dto.</TableHead>
                  <TableHead className="text-carbon/60">Total</TableHead>
                  <TableHead className="text-carbon/60">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usages.map((u) => (
                  <TableRow key={u.id} className="border-b border-gold/5">
                    <TableCell className="text-sm text-carbon">{u.email}</TableCell>
                    <TableCell className="text-sm text-carbon/60">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleString("es-ES")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-carbon">
                      {formatMoney(u.discount_amount)}
                    </TableCell>
                    <TableCell className="text-sm text-carbon">{formatMoney(u.total)}</TableCell>
                    <TableCell className="text-sm text-carbon/60">{u.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDiscountCodes;
