import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CollectionIntro from "@/components/CollectionIntro";
import { ValuePropositionView } from "@/components/ValueProposition";
import AdminBlockPreview from "@/components/admin/AdminBlockPreview";
import ProvisionalNote from "@/components/admin/ProvisionalNote";
import type { SiteBlockFieldsProps } from "@/components/admin/AdminSiteBlockEditor";
import {
  COLLECTION_INTRO_PROVISIONAL_SUBTITLE,
  DEFAULT_COLLECTION_INTRO,
  type CollectionIntroConfig,
} from "@/lib/collection-intro-content";
import { isProvisionalText } from "@/lib/provisional-content";
import {
  VALUE_PROPOSITION_PROVISIONAL_TEXT,
  type ValuePropositionConfig,
} from "@/lib/value-proposition-content";

const labelClass = "text-carbon/60 text-xs uppercase tracking-wider";
const inputClass = "mt-1 border-gold/20 focus-visible:ring-gold/30";

export const AdminCollectionIntroFields = ({ value, onChange }: SiteBlockFieldsProps<CollectionIntroConfig>) => (
  <>
    <div>
      <Label className={labelClass}>Título</Label>
      <Input
        value={value.title}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
        placeholder={DEFAULT_COLLECTION_INTRO.title}
        className={inputClass}
      />
    </div>
    <div>
      <Label className={labelClass}>Subtítulo</Label>
      <Textarea
        value={value.subtitle}
        onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
        rows={2}
        placeholder="Opcional"
        className={`${inputClass} font-sans`}
      />
      {isProvisionalText(value.subtitle, COLLECTION_INTRO_PROVISIONAL_SUBTITLE) ? (
        <ProvisionalNote>
          Texto provisional: pendiente del texto nuevo pensado para la clienta final (que no parezca
          solo para profesionales).
        </ProvisionalNote>
      ) : null}
    </div>

    <AdminBlockPreview>
      {() => (
        <div className="px-6 pt-12 pb-2" style={{ backgroundColor: "#F8F3EB" }}>
          <CollectionIntro config={value} />
        </div>
      )}
    </AdminBlockPreview>
  </>
);

export const AdminValuePropositionFields = ({ value, onChange }: SiteBlockFieldsProps<ValuePropositionConfig>) => (
  <>
    <div className="flex items-center gap-2.5">
      <Switch
        id="value-proposition-enabled"
        checked={value.enabled}
        onCheckedChange={(enabled) => onChange({ ...value, enabled })}
      />
      <Label htmlFor="value-proposition-enabled" className="text-sm text-carbon/70 cursor-pointer">
        Mostrar en la web
      </Label>
    </div>
    <div>
      <Label className={labelClass}>Antetítulo</Label>
      <Input
        value={value.eyebrow}
        onChange={(e) => onChange({ ...value, eyebrow: e.target.value })}
        placeholder="Opcional"
        className={inputClass}
      />
    </div>
    <div>
      <Label className={labelClass}>Propuesta de valor</Label>
      <Textarea
        value={value.text}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
        rows={3}
        className={`${inputClass} font-sans`}
      />
      {isProvisionalText(value.text, VALUE_PROPOSITION_PROVISIONAL_TEXT) ? (
        <ProvisionalNote>
          Texto provisional, montado con frases de la tienda. Escribe la propuesta definitiva y
          activa «Mostrar en la web».
        </ProvisionalNote>
      ) : null}
    </div>

    <AdminBlockPreview note={value.enabled ? undefined : "Ahora mismo está oculta en la web."}>
      {() => <ValuePropositionView config={value} preview />}
    </AdminBlockPreview>
  </>
);
