import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Film, ImageIcon, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { isVideoMediaUrl, posterUrlForVideoUrl } from "@/lib/media-url";
import { publicStorageUrl } from "@/lib/upload-media";
import {
  ADMIN_STORAGE_USAGE_QUERY_KEY,
  MEDIA_SITE_CONTENT_KEYS,
  collectUsedStorageRefs,
  formatStorageBytes,
  posterCompanionPath,
  storageObjectKey,
  usedStorageLabelsByKey,
} from "@/lib/storage-usage";
import type { Database } from "@/integrations/supabase/types";

type StorageObjectRow = Database["public"]["Functions"]["list_storage_objects"]["Returns"][number];

type BucketFilter = "all" | "product-images" | "campaign-images";
type UseFilter = "all" | "in_use" | "unused";
type SortKey =
  | "date_desc"
  | "date_asc"
  | "size_desc"
  | "size_asc"
  | "name_asc"
  | "in_use_first"
  | "unused_first";

type MediaRow = StorageObjectRow & {
  inUse: boolean;
  usageLabels: string[];
  publicUrl: string;
  isVideo: boolean;
};

const BUCKET_LABELS: Record<string, string> = {
  "product-images": "Productos",
  "campaign-images": "Campaña",
};

const filterBtnClass = (active: boolean) =>
  cn(
    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
    active
      ? "border-gold bg-gold text-white shadow-[0_4px_14px_rgba(197,160,89,0.28)]"
      : "border-gold/15 bg-white text-carbon/65 hover:border-gold/30 hover:text-carbon hover:bg-gold/4",
  );

async function removePathsByBucket(items: { bucket_id: string; name: string }[]) {
  const grouped = new Map<string, string[]>();
  for (const item of items) {
    const list = grouped.get(item.bucket_id) ?? [];
    list.push(item.name);
    grouped.set(item.bucket_id, list);
  }
  for (const [bucket, names] of grouped) {
    const unique = [...new Set(names)];
    const { error } = await supabase.storage.from(bucket).remove(unique);
    if (error) throw error;
  }
}

function MediaThumb({
  url,
  isVideo,
  alt,
  onClick,
}: {
  url: string;
  isVideo: boolean;
  alt: string;
  onClick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const thumbSrc = isVideo ? posterUrlForVideoUrl(url) : url;

  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gold/10 bg-cream"
      aria-label={`Vista previa de ${alt}`}
    >
      {failed || !thumbSrc ? (
        <span className="flex h-full w-full items-center justify-center text-carbon/30">
          {isVideo ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
        </span>
      ) : (
        <img
          src={thumbSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </button>
  );
}

const AdminMediaManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [objects, setObjects] = useState<StorageObjectRow[]>([]);
  const [usageLabels, setUsageLabels] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>("all");
  const [useFilter, setUseFilter] = useState<UseFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [preview, setPreview] = useState<MediaRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [objectsRes, productsRes, contentRes] = await Promise.all([
      supabase.rpc("list_storage_objects"),
      supabase.from("products").select("name, image_url, feature_videos"),
      supabase
        .from("site_content")
        .select("key, content")
        .in("key", [...MEDIA_SITE_CONTENT_KEYS]),
    ]);

    if (objectsRes.error) {
      toast({
        title: "No se pudo listar el almacenamiento",
        description: objectsRes.error.message,
        variant: "destructive",
      });
      setObjects([]);
      setLoading(false);
      return;
    }

    const refs = collectUsedStorageRefs({
      products: productsRes.data ?? [],
      siteContent: contentRes.data ?? [],
    });
    setUsageLabels(usedStorageLabelsByKey(refs));
    setObjects(objectsRes.data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: MediaRow[] = useMemo(
    () =>
      objects.map((object) => {
        const labels = usageLabels.get(storageObjectKey(object.bucket_id, object.name)) ?? [];
        return {
          ...object,
          inUse: labels.length > 0,
          usageLabels: labels,
          publicUrl: publicStorageUrl(object.bucket_id, object.name),
          isVideo: object.mime_type.startsWith("video/") || isVideoMediaUrl(object.name),
        };
      }),
    [objects, usageLabels],
  );

  const usedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.inUse) set.add(storageObjectKey(row.bucket_id, row.name));
    }
    return set;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const next = rows.filter((row) => {
      if (bucketFilter !== "all" && row.bucket_id !== bucketFilter) return false;
      if (useFilter === "in_use" && !row.inUse) return false;
      if (useFilter === "unused" && row.inUse) return false;
      if (q && !row.name.toLowerCase().includes(q)) return false;
      return true;
    });

    next.sort((a, b) => {
      switch (sortKey) {
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "size_desc":
          return b.size_bytes - a.size_bytes;
        case "size_asc":
          return a.size_bytes - b.size_bytes;
        case "name_asc":
          return a.name.localeCompare(b.name, "es");
        case "in_use_first":
          return Number(b.inUse) - Number(a.inUse) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "unused_first":
          return Number(a.inUse) - Number(b.inUse) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_desc":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return next;
  }, [rows, search, bucketFilter, useFilter, sortKey]);

  const totals = useMemo(() => {
    const unused = rows.filter((row) => !row.inUse);
    return {
      files: rows.length,
      inUse: rows.length - unused.length,
      unused: unused.length,
      bytes: rows.reduce((sum, row) => sum + row.size_bytes, 0),
      unusedBytes: unused.reduce((sum, row) => sum + row.size_bytes, 0),
      unusedRows: unused,
    };
  }, [rows]);

  const pathsToDeleteFor = useCallback(
    (row: MediaRow): { bucket_id: string; name: string }[] => {
      const items = [{ bucket_id: row.bucket_id, name: row.name }];
      const poster = posterCompanionPath(row.name);
      if (!poster) return items;
      const posterKey = storageObjectKey(row.bucket_id, poster);
      if (usedKeys.has(posterKey)) return items;
      if (!objects.some((object) => object.bucket_id === row.bucket_id && object.name === poster)) {
        return items;
      }
      items.push({ bucket_id: row.bucket_id, name: poster });
      return items;
    },
    [objects, usedKeys],
  );

  const afterDelete = async (count: number) => {
    toast({
      title: count === 1 ? "Archivo eliminado" : `${count} archivos eliminados`,
    });
    await queryClient.invalidateQueries({ queryKey: ADMIN_STORAGE_USAGE_QUERY_KEY });
    await load();
  };

  const confirmDeleteOne = async () => {
    if (!deleteTarget || deleteTarget.inUse) return;
    setDeleting(true);
    try {
      const items = pathsToDeleteFor(deleteTarget);
      await removePathsByBucket(items);
      setDeleteTarget(null);
      await afterDelete(items.length);
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

  const confirmBulkDelete = async () => {
    if (totals.unusedRows.length === 0) return;
    setDeleting(true);
    try {
      await removePathsByBucket(totals.unusedRows);
      setBulkDeleteOpen(false);
      await afterDelete(totals.unusedRows.length);
    } catch (error) {
      toast({
        title: "No se pudieron eliminar los archivos",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h2 className="font-playfair text-xl font-semibold text-carbon">Media</h2>
          <p className="text-carbon/40 text-sm mt-1">
            Archivos de los buckets de productos y campaña. Los que están referenciados en la web
            aparecen como en uso.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-gold/20 text-gold hover:bg-gold/5"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            disabled={totals.unused === 0 || loading}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar no usados
          </Button>
        </div>
      </div>

      <p className="text-sm text-carbon/50 mb-4">
        {totals.files} archivo{totals.files === 1 ? "" : "s"} · {totals.inUse} en uso · {totals.unused}{" "}
        sin usar · {formatStorageBytes(totals.bytes)}
      </p>

      <div className="flex flex-col gap-3 mb-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre de archivo…"
          className="max-w-md border-gold/20 bg-white"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-carbon/40 mr-1">Bucket</span>
          {(
            [
              ["all", "Todos"],
              ["product-images", "Productos"],
              ["campaign-images", "Campaña"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filterBtnClass(bucketFilter === id)}
              onClick={() => setBucketFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-carbon/40 mr-1">Estado</span>
          {(
            [
              ["all", "Todos"],
              ["in_use", "En uso"],
              ["unused", "Sin usar"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filterBtnClass(useFilter === id)}
              onClick={() => setUseFilter(id)}
            >
              {label}
            </button>
          ))}
          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger className="ml-auto w-[220px] border-gold/20 bg-white">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Fecha de subida (reciente)</SelectItem>
              <SelectItem value="date_asc">Fecha de subida (antigua)</SelectItem>
              <SelectItem value="size_desc">Tamaño (mayor)</SelectItem>
              <SelectItem value="size_asc">Tamaño (menor)</SelectItem>
              <SelectItem value="name_asc">Nombre</SelectItem>
              <SelectItem value="in_use_first">En uso primero</SelectItem>
              <SelectItem value="unused_first">Sin usar primero</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-carbon/40">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-carbon/40">
            {rows.length === 0 ? "No hay archivos en los buckets." : "Ningún archivo coincide con los filtros."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gold/10">
                  <TableHead className="text-carbon/60 w-16">Vista</TableHead>
                  <TableHead className="text-carbon/60">Archivo</TableHead>
                  <TableHead className="text-carbon/60">Bucket</TableHead>
                  <TableHead className="text-carbon/60">Tamaño</TableHead>
                  <TableHead className="text-carbon/60">Subida</TableHead>
                  <TableHead className="text-carbon/60">Estado</TableHead>
                  <TableHead className="text-carbon/60">Uso</TableHead>
                  <TableHead className="text-carbon/60 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={`${row.bucket_id}/${row.name}`}
                    className="border-b border-gold/5"
                  >
                    <TableCell>
                      <MediaThumb
                        url={row.publicUrl}
                        isVideo={row.isVideo}
                        alt={row.name}
                        onClick={() => setPreview(row)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-carbon break-all max-w-[240px]">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-sm text-carbon/70">
                      {BUCKET_LABELS[row.bucket_id] ?? row.bucket_id}
                    </TableCell>
                    <TableCell className="text-sm text-carbon/70 whitespace-nowrap">
                      {formatStorageBytes(row.size_bytes)}
                    </TableCell>
                    <TableCell className="text-sm text-carbon/60 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell>
                      {row.inUse ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          En uso
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-carbon/15 text-carbon/50">
                          Sin usar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-carbon/55 max-w-[200px]">
                      {row.usageLabels.join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        disabled={row.inUse}
                        title={row.inUse ? "Este archivo está en uso" : "Eliminar"}
                        aria-label={row.inUse ? "No se puede eliminar, está en uso" : "Eliminar"}
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="bg-cream border-gold/20 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-carbon break-all">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <div className="overflow-hidden rounded-lg bg-black/5">
              {preview.isVideo ? (
                <video
                  src={preview.publicUrl}
                  poster={posterUrlForVideoUrl(preview.publicUrl)}
                  controls
                  className="max-h-[70vh] w-full"
                />
              ) : (
                <img
                  src={preview.publicUrl}
                  alt={preview.name}
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-cream border-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-playfair text-carbon">
              ¿Eliminar este archivo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-carbon/60">
              Se borrará <span className="font-mono text-xs text-carbon">{deleteTarget?.name}</span>
              {deleteTarget ? ` (${formatStorageBytes(deleteTarget.size_bytes)})` : ""}. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold/20">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteOne();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="bg-cream border-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-playfair text-carbon">
              ¿Eliminar todos los archivos sin usar?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-carbon/60">
              Se borrarán {totals.unused} archivo{totals.unused === 1 ? "" : "s"} (
              {formatStorageBytes(totals.unusedBytes)}). Los que están en uso no se tocan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold/20">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmBulkDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando…" : "Eliminar no usados"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminMediaManager;
