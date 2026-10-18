import type { SiteBlockDefinition } from "@/components/admin/AdminSiteBlockEditor";
import AdminTrustStripFields from "@/components/admin/AdminTrustStripFields";
import AdminBrandValuesFields from "@/components/admin/AdminBrandValuesFields";
import AdminElixirSpotlightFields from "@/components/admin/AdminElixirSpotlightFields";
import {
  AdminCollectionIntroFields,
  AdminValuePropositionFields,
} from "@/components/admin/AdminIntroTextsFields";
import {
  COLLECTION_INTRO_CONTENT_KEY,
  DEFAULT_COLLECTION_INTRO,
  parseCollectionIntroConfig,
  serializeCollectionIntroConfig,
  type CollectionIntroConfig,
} from "@/lib/collection-intro-content";
import {
  DEFAULT_VALUE_PROPOSITION,
  VALUE_PROPOSITION_CONTENT_KEY,
  parseValuePropositionConfig,
  serializeValuePropositionConfig,
  type ValuePropositionConfig,
} from "@/lib/value-proposition-content";
import {
  DEFAULT_ELIXIR_SPOTLIGHT,
  ELIXIR_SPOTLIGHT_CONTENT_KEY,
  parseElixirSpotlightConfig,
  serializeElixirSpotlightConfig,
  type ElixirSpotlightConfig,
} from "@/lib/elixir-spotlight-content";
import {
  BRAND_VALUES_CONTENT_KEY,
  DEFAULT_BRAND_VALUES,
  parseBrandValuesConfig,
  serializeBrandValuesConfig,
  type BrandValuesConfig,
} from "@/lib/brand-values-content";
import {
  DEFAULT_TRUST_STRIP,
  TRUST_STRIP_CONTENT_KEY,
  parseTrustStripConfig,
  serializeTrustStripConfig,
  type TrustStripConfig,
} from "@/lib/trust-strip-content";

/** Bloques de marketing editables, cada uno en su pestaña de Contenido. */
export const TRUST_STRIP_BLOCK: SiteBlockDefinition<TrustStripConfig> = {
  key: TRUST_STRIP_CONTENT_KEY,
  rowTitle: "Franja de confianza",
  label: "Franja de confianza — Todas las páginas",
  description:
    "Cuatro ventajas en fila: en el inicio debajo de la marquesina, y en el resto de páginas arriba del todo, antes de la primera imagen. En la ficha de producto sale además la versión compacta «Tus ventajas…».",
  defaults: DEFAULT_TRUST_STRIP,
  parse: parseTrustStripConfig,
  serialize: serializeTrustStripConfig,
  Fields: AdminTrustStripFields,
};

export const BRAND_VALUES_BLOCK: SiteBlockDefinition<BrandValuesConfig> = {
  key: BRAND_VALUES_CONTENT_KEY,
  rowTitle: "Nuestros valores",
  label: "Nuestros valores — Inicio y Colección",
  description:
    "«La esencia que define Shenna BROWS»: cuatro tarjetas con foto e icono sobre el rosa de la marca. En el inicio va después de la franja de confianza; en Colección, al final.",
  defaults: DEFAULT_BRAND_VALUES,
  parse: parseBrandValuesConfig,
  serialize: serializeBrandValuesConfig,
  Fields: AdminBrandValuesFields,
};

export const ELIXIR_SPOTLIGHT_BLOCK: SiteBlockDefinition<ElixirSpotlightConfig> = {
  key: ELIXIR_SPOTLIGHT_CONTENT_KEY,
  rowTitle: "Producto protagonista",
  label: "El más vendido (Elixir) — Inicio y Colección",
  description:
    "Elixir con sus beneficios, una foto o vídeo y el botón de compra. En el inicio va después de «Todo lo que tus cejas necesitan»; en Colección, justo después de la cabecera.",
  defaults: DEFAULT_ELIXIR_SPOTLIGHT,
  parse: parseElixirSpotlightConfig,
  serialize: serializeElixirSpotlightConfig,
  Fields: AdminElixirSpotlightFields,
};

export const VALUE_PROPOSITION_BLOCK: SiteBlockDefinition<ValuePropositionConfig> = {
  key: VALUE_PROPOSITION_CONTENT_KEY,
  rowTitle: "Propuesta de valor",
  label: "Propuesta de valor — Inicio, después de la franja de confianza",
  description:
    "Frase que resume qué ofrece Shenna BROWS. Está oculta hasta que se escriba el texto definitivo y se active.",
  defaults: DEFAULT_VALUE_PROPOSITION,
  parse: parseValuePropositionConfig,
  serialize: serializeValuePropositionConfig,
  Fields: AdminValuePropositionFields,
};

export const COLLECTION_INTRO_BLOCK: SiteBlockDefinition<CollectionIntroConfig> = {
  key: COLLECTION_INTRO_CONTENT_KEY,
  rowTitle: "Título de la colección",
  label: "Título de la colección — Inicio",
  description: "Título y subtítulo encima de la cuadrícula de productos del inicio.",
  defaults: DEFAULT_COLLECTION_INTRO,
  parse: parseCollectionIntroConfig,
  serialize: serializeCollectionIntroConfig,
  Fields: AdminCollectionIntroFields,
};
