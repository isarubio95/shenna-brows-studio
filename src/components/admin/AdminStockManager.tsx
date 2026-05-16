import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getProductImageUrl } from "@/lib/product-images";
import { Loader2, Minus, Plus, Save } from "lucide-react";

export type StockProductRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  stock: number;
};

interface AdminStockManagerProps {
  products: StockProductRow[];
  loading: boolean;
  onStockUpdated: () => void | Promise<void>;
}

const parsePositiveInt = (raw: string, fallback: number): number => {
  const n = Math.floor(Number(String(raw).replace(",", ".")));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
};

const parseNonNegativeInt = (raw: string): number => {
  const n = Math.floor(Number(String(raw).replace(",", ".")));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
};

/** Solo dígitos (permite guardar sin ambigüedad mientras se escribe en el input). */
const parseStrictNonNegativeInt = (raw: string): { ok: true; value: number } | { ok: false } => {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return { ok: false };
  const value = Number.parseInt(t, 10);
  if (!Number.isFinite(value) || value < 0) return { ok: false };
  return { ok: true, value };
};

const AdminStockManager = ({ products, loading, onStockUpdated }: AdminStockManagerProps) => {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adjustStep, setAdjustStep] = useState("1");
  /** Texto del stock pendiente por fila; si no hay clave, no hay borrador (se muestra el stock del servidor). */
  const [draftText, setDraftText] = useState<Record<string, string | undefined>>({});

  const applyStock = async (productId: string, nextStock: number) => {
    const clamped = Math.max(0, Math.floor(nextStock));
    setBusyId(productId);
    const { error } = await supabase.from("products").update({ stock: clamped }).eq("id", productId);
    if (error) {
      toast({
        title: "No se pudo actualizar el stock",
        description: error.message,
        variant: "destructive",
      });
      setBusyId(null);
      return;
    }
    toast({ title: "Stock actualizado", description: `Nuevo stock: ${clamped}` });
    setDraftText((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    await onStockUpdated();
    setBusyId(null);
  };

  const step = parsePositiveInt(adjustStep, 1);

  const workingText = (p: StockProductRow) =>
    draftText[p.id] !== undefined ? draftText[p.id]! : String(p.stock ?? 0);

  const currentWorkingValue = (p: StockProductRow) =>
    draftText[p.id] !== undefined ? parseNonNegativeInt(draftText[p.id]!) : Number(p.stock ?? 0);

  const handleSumar = (p: StockProductRow) => {
    const base = currentWorkingValue(p);
    setDraftText((prev) => ({ ...prev, [p.id]: String(Math.max(0, base + step)) }));
  };

  const handleRestar = (p: StockProductRow) => {
    const base = currentWorkingValue(p);
    setDraftText((prev) => ({ ...prev, [p.id]: String(Math.max(0, base - step)) }));
  };

  const canGuardar = (p: StockProductRow) => {
    if (draftText[p.id] === undefined) return false;
    const parsed = parseStrictNonNegativeInt(draftText[p.id]!);
    if (!parsed.ok) return false;
    return parsed.value !== Math.floor(Number(p.stock ?? 0));
  };

  const handleGuardar = (p: StockProductRow) => {
    const parsed = parseStrictNonNegativeInt(workingText(p));
    if (!parsed.ok) return;
    applyStock(p.id, parsed.value);
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-4 border-b border-gold/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-carbon/50 text-sm">
          <span className="text-carbon/70">Sumar</span> y <span className="text-carbon/70">Restar</span> solo actualizan el borrador; nada se guarda en el servidor hasta pulsar{" "}
          <span className="text-carbon/70">Guardar</span>. Cantidad por pulsación:
        </p>
        <div className="flex items-center gap-2 max-w-[140px]">
          <Input
            type="number"
            min={1}
            value={adjustStep}
            onChange={(e) => setAdjustStep(e.target.value)}
            className="h-9 bg-white border-gold/15"
            aria-label="Cantidad para sumar o restar"
          />
        </div>
      </div>
      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" />
        </div>
      ) : products.length === 0 ? (
        <div className="p-8 text-center text-carbon/40">No hay productos</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gold/10">
                <TableHead className="text-carbon/60 min-w-[200px]">Producto</TableHead>
                <TableHead className="text-carbon/60 text-center w-[100px]">Stock actual</TableHead>
                <TableHead className="text-carbon/60 text-center min-w-[200px]">Ajuste rápido</TableHead>
                <TableHead className="text-carbon/60 min-w-[140px]">Nuevo stock</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const busy = busyId === p.id;
                const guardarOk = canGuardar(p);
                return (
                  <TableRow key={p.id} className="border-b border-gold/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img
                            src={getProductImageUrl(p.image_url, p.slug)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="text-carbon text-sm font-medium leading-snug">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-carbon font-semibold tabular-nums">{Number(p.stock ?? 0)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleRestar(p)}
                          className="border-gold/20 text-carbon hover:bg-gold/5 shrink-0"
                          aria-label={`Restar ${step} al borrador de stock de ${p.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleSumar(p)}
                          className="border-gold/20 text-gold hover:bg-gold/5 shrink-0"
                          aria-label={`Sumar ${step} al borrador de stock de ${p.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={workingText(p)}
                        disabled={busy}
                        onChange={(e) => setDraftText((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="h-9 max-w-[120px] bg-white border-gold/15 tabular-nums"
                        aria-label={`Nuevo stock (borrador) para ${p.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right w-0 whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy || !guardarOk}
                        onClick={() => handleGuardar(p)}
                        className="bg-gold/15 text-carbon hover:bg-gold/25 shrink-0"
                        aria-label={`Guardar stock de ${p.name}`}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1.5" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminStockManager;
