import { ArrowDown, ArrowUp, Film, Loader2, Monitor, Plus, Smartphone, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductMedia from "@/components/ProductMedia";
import {
  featureVideoAspectRatio,
  PRODUCT_FEATURE_VIDEOS_MAX,
  type ProductFeatureVideo,
} from "@/lib/product-feature-videos";

/** Sólo vídeo: la galería de arriba acepta fotos, esta sección no. */
export const FEATURE_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

const PLACEMENT_TEXT_BLOCKS = ["Descripción", "Materiales", "Envío"];

const PlacementTextBlock = ({ label }: { label: string }) => (
  <div className="rounded bg-carbon/5 px-1.5 py-1">
    <p className="text-[9px] leading-none text-carbon/45">{label}</p>
    <div className="mt-1 space-y-0.5">
      <div className="h-[3px] w-full rounded-full bg-carbon/10" />
      <div className="h-[3px] w-4/5 rounded-full bg-carbon/10" />
    </div>
  </div>
);

/** Esquema de dónde acaban los vídeos, para verlo sin salir del panel. */
const PlacementHint = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" aria-hidden>
    <div className="rounded-lg border border-gold/15 bg-white/80 p-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-carbon/45">
        <Monitor size={12} className="text-carbon/35" />
        Ordenador
      </p>
      <div className="flex gap-2">
        <div className="w-[42%] space-y-1.5">
          <div className="flex h-9 items-center justify-center rounded bg-carbon/8 text-[9px] text-carbon/40">
            Fotos
          </div>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex h-6 items-center justify-center rounded bg-gold/90 text-[9px] font-medium text-white"
            >
              Vídeo {n}
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-1.5">
          {PLACEMENT_TEXT_BLOCKS.map((label) => (
            <PlacementTextBlock key={label} label={label} />
          ))}
        </div>
      </div>
    </div>

    <div className="rounded-lg border border-gold/15 bg-white/80 p-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-carbon/45">
        <Smartphone size={12} className="text-carbon/35" />
        Móvil
      </p>
      <div className="mx-auto w-full max-w-38 space-y-1.5">
        <div className="flex h-9 items-center justify-center rounded bg-carbon/8 text-[9px] text-carbon/40">
          Fotos
        </div>
        {PLACEMENT_TEXT_BLOCKS.map((label) => (
          <PlacementTextBlock key={label} label={label} />
        ))}
        <div className="rounded bg-gold/90 px-1.5 py-1.5">
          <p className="text-center text-[9px] font-medium leading-none text-white">
            Carrusel de vídeos
          </p>
          <div className="mt-1.5 flex justify-center gap-1">
            <span className="h-[3px] w-4 rounded-full bg-white" />
            <span className="h-[3px] w-[3px] rounded-full bg-white/60" />
            <span className="h-[3px] w-[3px] rounded-full bg-white/60" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface ProductFeatureVideosFieldProps {
  videos: ProductFeatureVideo[];
  /** Id del vídeo que se está subiendo, `"new"` si es uno nuevo; null si ninguno. */
  uploadingId: string | null;
  /** Progreso del re-encode, de 0 a 1; null mientras no se recomprime. */
  progress: number | null;
  /** Abre el selector de archivos: `null` añade uno nuevo, un id reemplaza ese. */
  onPickFile: (targetId: string | null) => void;
  onTitleChange: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}

/**
 * Sección del editor de producto para los vídeos opcionales de la ficha, con el
 * esquema de dónde salen en ordenador y en móvil.
 */
const ProductFeatureVideosField = ({
  videos,
  uploadingId,
  progress,
  onPickFile,
  onTitleChange,
  onRemove,
  onMove,
}: ProductFeatureVideosFieldProps) => (
  <div className="rounded-xl border border-gold/15 bg-white/60 p-4 space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
      <div className="min-w-0">
        <Label className="text-carbon/70 text-xs uppercase tracking-wider inline-flex items-center gap-1.5">
          <Film size={14} className="text-gold" aria-hidden />
          Vídeos de la ficha
        </Label>
        <p className="text-xs text-carbon/45 mt-1 leading-snug">
          Opcional, hasta {PRODUCT_FEATURE_VIDEOS_MAX}. Lo habitual son tres: el anuncio, cómo se
          utiliza y por qué elegirlo por sus ingredientes. Si no subes ninguno, la ficha queda como
          está ahora.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPickFile(null)}
        disabled={videos.length >= PRODUCT_FEATURE_VIDEOS_MAX || uploadingId !== null}
        className="shrink-0 border-gold/20 text-gold hover:bg-gold/5 disabled:opacity-40"
      >
        <Plus size={14} className="mr-1" />
        Añadir vídeo
      </Button>
    </div>

    <PlacementHint />
    <p className="text-xs text-carbon/50 leading-snug">
      En ordenador se apilan en la columna de la izquierda, al lado de la descripción; en móvil salen
      en un carrusel debajo de «Envío». En los dos casos el título se lee justo debajo de su vídeo, y
      el orden de esta lista es el que se respeta.
    </p>

    {uploadingId === "new" ? (
      <div className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-xs text-carbon/60">
        <Loader2 className="h-4 w-4 animate-spin text-gold" />
        {progress === null
          ? "Subiendo vídeo…"
          : `Procesando vídeo… ${Math.round(progress * 100)}%`}
      </div>
    ) : null}

    {videos.length === 0 ? (
      <p className="text-sm text-carbon/40 italic">
        Sin vídeos: la ficha muestra solo las fotos y el texto.
      </p>
    ) : (
      <div className="space-y-3">
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="flex flex-col sm:flex-row gap-3 rounded-lg border border-gold/10 bg-white/80 p-3"
          >
            <div
              className="relative w-20 shrink-0 self-start overflow-hidden rounded-md border border-gold/15 bg-muted"
              style={{ aspectRatio: String(featureVideoAspectRatio(video)) }}
            >
              <ProductMedia
                src={video.videoUrl}
                alt={`Vídeo ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
                playable={false}
                preload="metadata"
              />
              {uploadingId === video.id ? (
                <div className="absolute inset-0 flex items-center justify-center bg-carbon/45">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              ) : null}
              <span className="absolute left-1 top-1 rounded bg-gold px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                {index + 1}
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <Label
                  htmlFor={`feature-video-title-${video.id}`}
                  className="text-[10px] uppercase tracking-wider text-carbon/50"
                >
                  Título: qué se ve en el vídeo
                </Label>
                <Input
                  id={`feature-video-title-${video.id}`}
                  value={video.title}
                  onChange={(e) => onTitleChange(video.id, e.target.value)}
                  placeholder="Ej. Cómo se utiliza paso a paso"
                  className="mt-1 bg-white border-gold/15 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onPickFile(video.id)}
                  disabled={uploadingId !== null}
                  className="h-8 border-gold/20 text-xs text-carbon/70 hover:bg-gold/5 disabled:opacity-40"
                >
                  <Upload size={13} className="mr-1" />
                  Cambiar vídeo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  aria-label={`Mover el vídeo ${index + 1} hacia arriba`}
                  className="h-8 w-8 border-gold/20 text-carbon/60 hover:bg-gold/5 disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onMove(index, 1)}
                  disabled={index === videos.length - 1}
                  aria-label={`Mover el vídeo ${index + 1} hacia abajo`}
                  className="h-8 w-8 border-gold/20 text-carbon/60 hover:bg-gold/5 disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </Button>
                <button
                  type="button"
                  onClick={() => onRemove(video.id)}
                  aria-label={`Quitar el vídeo ${index + 1}`}
                  className="ml-auto p-2 text-carbon/30 transition-colors hover:text-red-400"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default ProductFeatureVideosField;
