export const VALUE_PROPOSITION_CONTENT_KEY = "site_value_proposition";

export interface ValuePropositionConfig {
  /**
   * Oculta hasta que llegue el texto definitivo de la clienta: así la home
   * sigue su esquema mientras tanto.
   */
  enabled: boolean;
  eyebrow: string;
  text: string;
}

/** Provisional, montado con frases que la clienta ya usa en la tienda. */
export const VALUE_PROPOSITION_PROVISIONAL_TEXT =
  "Herramientas y fórmulas creadas desde la experiencia profesional para que consigas unas cejas bonitas, definidas y naturales desde casa, sin complicarte. Menos pasos, más tú.";

export const DEFAULT_VALUE_PROPOSITION: ValuePropositionConfig = {
  enabled: false,
  eyebrow: "Nuestra propuesta",
  text: VALUE_PROPOSITION_PROVISIONAL_TEXT,
};

export function parseValuePropositionConfig(raw?: string | null): ValuePropositionConfig {
  const d = DEFAULT_VALUE_PROPOSITION;
  const trimmed = raw?.trim();
  if (!trimmed?.startsWith("{")) return { ...d };

  try {
    const parsed = JSON.parse(trimmed) as Partial<Record<keyof ValuePropositionConfig, unknown>>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : d.enabled,
      eyebrow: typeof parsed.eyebrow === "string" ? parsed.eyebrow.trim() : d.eyebrow,
      text: typeof parsed.text === "string" && parsed.text.trim() ? parsed.text.trim() : d.text,
    };
  } catch {
    return { ...d };
  }
}

export function serializeValuePropositionConfig(config: ValuePropositionConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    eyebrow: config.eyebrow.trim(),
    text: config.text.trim(),
  });
}
