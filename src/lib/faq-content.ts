export const FAQ_CONTENT_KEY = "faq";
export const FAQ_PAGE_PATH = "/preguntas-frecuentes";

export const FAQ_PLACEHOLDER_ANSWER =
  "Respuesta a completar: completar con la información real de la tienda, producto, política o documentación aprobada.";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  visible: boolean;
}

export interface FaqSection {
  id: string;
  title: string;
  visible: boolean;
  items: FaqItem[];
}

export interface FaqPageConfig {
  pageVisible: boolean;
  eyebrow: string;
  title: string;
  intro: string;
  helpTitle: string;
  helpSubtitle: string;
  helpBody: string;
  helpCtaLabel: string;
  helpCtaHref: string;
  sections: FaqSection[];
}

const item = (id: string, question: string, answer = FAQ_PLACEHOLDER_ANSWER): FaqItem => ({
  id,
  question,
  answer,
  visible: true,
});

export const DEFAULT_FAQ: FaqPageConfig = {
  pageVisible: false,
  eyebrow: "Ayuda",
  title: "Preguntas frecuentes",
  intro:
    "Resolvemos las dudas más habituales sobre productos, uso, pago y devoluciones. Si no encuentras lo que buscas, escríbenos y te ayudamos.",
  helpTitle: "¿Todavía tienes dudas?",
  helpSubtitle: "Estamos aquí para ayudarte.",
  helpBody:
    "Si no sabes qué producto elegir, escríbenos y te ayudaremos a encontrar la opción que mejor encaja contigo y con tu rutina.",
  helpCtaLabel: "Escríbenos",
  helpCtaHref: "mailto:info@shennabrows.com",
  sections: [
    {
      id: "productos",
      title: "Sobre los productos",
      visible: true,
      items: [
        item("productos-adecuado", "¿Qué producto es el adecuado para mí?"),
        item(
          "productos-diferencia",
          "¿Qué diferencia hay entre las herramientas, el lápiz, la mousse y el stick?",
        ),
        item("productos-no-profesional", "¿Puedo utilizar los productos aunque no sea profesional?"),
        item("productos-pieles-sensibles", "¿Los productos son aptos para pieles sensibles?"),
        item(
          "productos-mousse-tratamiento",
          "¿Puedo utilizar la mousse si estoy realizando un tratamiento facial?",
        ),
        item(
          "productos-mousse-maquillaje",
          "¿Puedo utilizar la mousse antes y después del maquillaje?",
        ),
        item("productos-stick-zonas", "¿Puedo utilizar el Stick en diferentes zonas del rostro?"),
        item(
          "productos-stick-micropigmentacion",
          "¿Puedo utilizar el Stick en cejas y labios con micropigmentación?",
        ),
        item("productos-como-utilizar", "¿Cómo debo utilizar cada producto?"),
        item(
          "productos-misma-rutina",
          "¿Puedo utilizar varios productos de Shenna en una misma rutina?",
        ),
      ],
    },
    {
      id: "carolina",
      title: "Preguntas pensadas para Carolina",
      visible: true,
      items: [
        item(
          "carolina-maquillaje",
          "¿Necesito saber maquillarme para utilizar Shenna Brows?",
        ),
        item(
          "carolina-solo-profesionales",
          "¿Los productos están pensados solo para profesionales?",
        ),
        item(
          "carolina-todos-los-productos",
          "¿Tengo que utilizar todos los productos para conseguir buenos resultados?",
        ),
        item(
          "carolina-poco-tiempo",
          "¿Y si tengo poco tiempo para mi rutina de belleza?",
        ),
      ],
    },
    {
      id: "herramientas",
      title: "Herramientas y Black Edition",
      visible: true,
      items: [
        item(
          "herramientas-gold-black",
          "¿Qué diferencia hay entre Gold Edition y Black Edition?",
        ),
        item("herramientas-packs", "¿Qué incluye cada pack?"),
        item(
          "herramientas-punta-silicona",
          "¿Para qué sirve la punta de silicona de las herramientas Black Edition?",
        ),
        item(
          "herramientas-limpiar",
          "¿Cómo debo limpiar y cuidar mis herramientas?",
        ),
        item(
          "herramientas-conservar",
          "¿Cómo debo conservarlas después de utilizarlas?",
        ),
        item(
          "herramientas-profesional-domestico",
          "¿Las herramientas son adecuadas para uso profesional y doméstico?",
        ),
        item(
          "herramientas-depilacion-precisa",
          "¿Qué herramienta necesito para conseguir una depilación precisa?",
        ),
      ],
    },
    {
      id: "mousse",
      title: "Mousse",
      visible: true,
      items: [
        item("mousse-para-que", "¿Para qué puedo utilizar la Mousse?"),
        item("mousse-antes-maquillaje", "¿Puedo utilizarla antes del maquillaje?"),
        item("mousse-despues-maquillaje", "¿Puedo utilizarla después del maquillaje?"),
        item(
          "mousse-limpieza-diaria",
          "¿Puedo utilizarla como parte de mi limpieza diaria?",
        ),
        item(
          "mousse-antes-depilar",
          "¿Puedo utilizarla antes de depilarme las cejas?",
        ),
        item(
          "mousse-antes-tratamiento",
          "¿Puedo utilizarla antes de realizar un tratamiento en las cejas?",
        ),
        item(
          "mousse-pieles-sensibles",
          "¿Es adecuada para pieles sensibles o sensibilizadas?",
        ),
        item("mousse-sensacion", "¿Qué sensación deja en la piel?"),
        item("mousse-perfume", "¿Tiene perfume?"),
        item("mousse-vegana", "¿Es vegana?"),
      ],
    },
    {
      id: "stick",
      title: "Stick",
      visible: true,
      items: [
        item("stick-donde", "¿Dónde puedo utilizar el Stick?"),
        item("stick-cejas", "¿Puedo utilizarlo en las cejas?"),
        item("stick-ojeras", "¿Puedo utilizarlo en la zona de las ojeras?"),
        item("stick-antes-maquillaje", "¿Puedo utilizarlo antes del maquillaje?"),
        item("stick-reaplicar", "¿Puedo reaplicarlo durante el día?"),
        item(
          "stick-micropigmentacion",
          "¿Es adecuado para proteger zonas con micropigmentación?",
        ),
        item(
          "stick-manchas",
          "¿Puedo utilizarlo sobre manchas o zonas que han recibido un tratamiento despigmentante?",
        ),
        item(
          "stick-llevar",
          "¿Puedo llevarlo conmigo para reaplicarlo fácilmente?",
        ),
        item("stick-factor-solar", "¿Qué factor de protección solar tiene?"),
      ],
    },
    {
      id: "pago",
      title: "Pago y devoluciones",
      visible: true,
      items: [
        item(
          "pago-metodos",
          "¿Qué métodos de pago aceptáis?",
          "Aceptamos tarjeta, Bizum, Google Pay y Apple Pay a través de la pasarela segura de Redsys.",
        ),
        item(
          "pago-seguro",
          "¿Es seguro comprar en la web?",
          "Sí. El pago se procesa en el TPV virtual de Redsys. No almacenamos los datos de tu tarjeta en nuestra web.",
        ),
        item(
          "pago-tarjeta",
          "¿Puedo pagar con tarjeta?",
          "Sí. Al finalizar la compra te redirigimos a Redsys para pagar con tarjeta de forma segura.",
        ),
        item(
          "pago-paypal",
          "¿Puedo pagar con PayPal u otros métodos?",
          "Ahora mismo no aceptamos PayPal. Puedes pagar con tarjeta, Bizum, Google Pay o Apple Pay.",
        ),
        item(
          "pago-devolver",
          "¿Puedo devolver un producto?",
          "Sí. Tienes 14 días naturales desde la recepción para desistir de la compra, sin necesidad de justificación. Consulta la [política de devoluciones](/politica-devoluciones).",
        ),
        item(
          "pago-plazo",
          "¿Cuál es el plazo para realizar una devolución?",
          "14 días naturales desde que recibes el pedido. Puedes iniciar la solicitud desde [Mi cuenta](/account) o escribirnos a info@shennabrows.com antes de que finalice ese plazo.",
        ),
        item(
          "pago-solicitar",
          "¿Cómo debo solicitar una devolución?",
          "Entra en [Mi cuenta](/account) y usa el botón de devolución en el pedido correspondiente, o escríbenos a info@shennabrows.com con tu número de pedido. Te enviaremos las instrucciones para devolver el producto.",
        ),
        item(
          "pago-higiene",
          "¿Qué productos no se pueden devolver por motivos de higiene?",
          "Los productos sellados que se hayan desprecintado tras la entrega y no sean aptos para devolución por higiene pueden quedar excluidos del derecho de desistimiento. Si tienes dudas sobre un artículo concreto, escríbenos antes de abrirlo.",
        ),
        item(
          "pago-defectuoso",
          "¿Qué ocurre si el producto llega defectuoso?",
          "Ponte en contacto con nosotros de inmediato. En ese caso nos hacemos cargo de los gastos de envío y te enviamos un producto en perfecto estado o el reembolso completo, según prefieras.",
        ),
        item(
          "pago-danado",
          "¿Qué hago si mi pedido llega dañado o falta algún producto?",
          "Escríbenos a info@shennabrows.com con tu número de pedido y, si puedes, una foto. Lo revisamos y te proponemos reposición o reembolso.",
        ),
      ],
    },
  ],
};

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const newId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseItem = (value: unknown, index: number): FaqItem | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<FaqItem>;
  const question = asString(raw.question, "").trim();
  if (!question) return null;
  return {
    id: asString(raw.id, `item-${index}`).trim() || `item-${index}`,
    question,
    answer: asString(raw.answer, ""),
    visible: asBoolean(raw.visible, true),
  };
};

const parseSection = (value: unknown, index: number): FaqSection | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<FaqSection>;
  const title = asString(raw.title, "").trim();
  if (!title) return null;
  const items = Array.isArray(raw.items)
    ? raw.items.map((itemValue, itemIndex) => parseItem(itemValue, itemIndex)).filter((row): row is FaqItem => row !== null)
    : [];
  return {
    id: asString(raw.id, `section-${index}`).trim() || `section-${index}`,
    title,
    visible: asBoolean(raw.visible, true),
    items,
  };
};

export function cloneFaqConfig(config: FaqPageConfig): FaqPageConfig {
  return structuredClone(config);
}

export function parseFaqConfig(raw?: string | null): FaqPageConfig {
  if (!raw?.trim()) {
    return cloneFaqConfig(DEFAULT_FAQ);
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return cloneFaqConfig(DEFAULT_FAQ);
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<FaqPageConfig>;
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections
          .map((section, index) => parseSection(section, index))
          .filter((section): section is FaqSection => section !== null)
      : [];

    return {
      pageVisible: asBoolean(parsed.pageVisible, false),
      eyebrow: asString(parsed.eyebrow, DEFAULT_FAQ.eyebrow).trim() || DEFAULT_FAQ.eyebrow,
      title: asString(parsed.title, DEFAULT_FAQ.title).trim() || DEFAULT_FAQ.title,
      intro: asString(parsed.intro, DEFAULT_FAQ.intro),
      helpTitle: asString(parsed.helpTitle, DEFAULT_FAQ.helpTitle).trim() || DEFAULT_FAQ.helpTitle,
      helpSubtitle: asString(parsed.helpSubtitle, DEFAULT_FAQ.helpSubtitle),
      helpBody: asString(parsed.helpBody, DEFAULT_FAQ.helpBody),
      helpCtaLabel: asString(parsed.helpCtaLabel, DEFAULT_FAQ.helpCtaLabel).trim() || DEFAULT_FAQ.helpCtaLabel,
      helpCtaHref: asString(parsed.helpCtaHref, DEFAULT_FAQ.helpCtaHref).trim() || DEFAULT_FAQ.helpCtaHref,
      sections: sections.length > 0 ? sections : cloneFaqConfig(DEFAULT_FAQ).sections,
    };
  } catch {
    return cloneFaqConfig(DEFAULT_FAQ);
  }
}

export function serializeFaqConfig(config: FaqPageConfig): string {
  return JSON.stringify({
    pageVisible: Boolean(config.pageVisible),
    eyebrow: config.eyebrow.trim(),
    title: config.title.trim(),
    intro: config.intro.trim(),
    helpTitle: config.helpTitle.trim(),
    helpSubtitle: config.helpSubtitle.trim(),
    helpBody: config.helpBody.trim(),
    helpCtaLabel: config.helpCtaLabel.trim(),
    helpCtaHref: config.helpCtaHref.trim(),
    sections: config.sections.map((section) => ({
      id: section.id,
      title: section.title.trim(),
      visible: Boolean(section.visible),
      items: section.items.map((faqItem) => ({
        id: faqItem.id,
        question: faqItem.question.trim(),
        answer: faqItem.answer,
        visible: Boolean(faqItem.visible),
      })),
    })),
  });
}

export function isPendingFaqAnswer(answer: string): boolean {
  const text = answer.trim();
  return !text || text.startsWith("Respuesta a completar");
}

export function getVisibleFaqSections(config: FaqPageConfig): FaqSection[] {
  return config.sections
    .filter((section) => section.visible)
    .map((section) => ({
      ...section,
      items: section.items.filter((faqItem) => faqItem.visible && faqItem.question.trim()),
    }))
    .filter((section) => section.items.length > 0);
}

export function createFaqSection(title = "Nueva sección"): FaqSection {
  return {
    id: newId("section"),
    title,
    visible: true,
    items: [],
  };
}

export function createFaqItem(question = "Nueva pregunta"): FaqItem {
  return {
    id: newId("item"),
    question,
    answer: "",
    visible: true,
  };
}

export function moveArrayItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const copy = [...items];
  const [row] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, row);
  return copy;
}

const SAFE_LINK_RE = /^https?:\/\/|^mailto:|^\/(?!\/)/i;

export type FaqAnswerPart =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|\/[^)\s]+)\)/g;

export function parseFaqAnswerParts(answer: string): FaqAnswerPart[] {
  const parts: FaqAnswerPart[] = [];
  const source = answer.trim();
  if (!source) return parts;

  let cursor = 0;
  for (const match of source.matchAll(MARKDOWN_LINK_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push({ type: "text", value: source.slice(cursor, index) });
    }
    const href = match[2];
    if (SAFE_LINK_RE.test(href)) {
      parts.push({ type: "link", href, label: match[1] });
    } else {
      parts.push({ type: "text", value: match[0] });
    }
    cursor = index + match[0].length;
  }

  if (cursor < source.length) {
    parts.push({ type: "text", value: source.slice(cursor) });
  }

  return parts;
}
