import { buildCorreosUrl } from "./correos.ts";
import { buildCorreosAuthorizedHeaders, getCorreosAccessToken } from "./correosAuth.ts";

const NON_DELIVERY_PATTERNS = [
  /no se ha podido entregar/i,
  /ausente/i,
  /pendiente de entrega/i,
  /intento de entrega/i,
  /devuelto/i,
  /returned to sender/i,
  /rehusad[oa]/i,
];

const DELIVERED_TEXT_PATTERNS = [
  /entregad[oa]/i,
  /delivered/i,
  /entrega\s+efectuada/i,
  /depositad[oa]\s+en\s+(el\s+)?buz/i,
  /entregado\s+al\s+destinatario/i,
  /picked\s+up\s+by\s+recipient/i,
];

const DELIVERED_STATUS_PATTERNS = [
  /^entregad[oa]$/i,
  /^delivered$/i,
  /ENTREG/,
];

function trackingPathsForCode(code: string): string[] {
  const encoded = encodeURIComponent(code);
  return [
    `/support/trackpub/api/v2/shipments/${encoded}`,
    `/support/trackpub/api/v2/shipments/${encoded}/events`,
    `/trackpub/shipments/${encoded}/events`,
    `/trackpub/api/v2/shipments/${encoded}`,
  ];
}

function collectEventObjects(payload: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 4 || payload == null) return [];
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => collectEventObjects(item, depth + 1));
  }
  if (typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const events: Record<string, unknown>[] = [];

  for (const key of ["events", "eventos", "trackingEvents", "listaEventos"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") {
          events.push(item as Record<string, unknown>);
        }
      }
    }
  }

  for (const key of ["shipment", "envio", "data", "result"]) {
    const nested = record[key];
    if (nested && typeof nested === "object") {
      events.push(...collectEventObjects(nested, depth + 1));
    }
  }

  return events;
}

function readEventText(event: Record<string, unknown>): string {
  const parts = [
    event.summaryText,
    event.summary,
    event.descripcion,
    event.description,
    event.eventDescription,
    event.textoResumen,
    event.text,
    event.status,
    event.estado,
    event.eventCode,
    event.code,
    event.codEvento,
  ];
  return parts
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => String(value).trim())
    .join(" ");
}

function textLooksDelivered(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  if (NON_DELIVERY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }
  return DELIVERED_TEXT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function codeLooksDelivered(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  return /ENTREG/.test(normalized);
}

function statusLooksDelivered(status: string): boolean {
  const normalized = status.trim();
  if (!normalized) return false;
  if (NON_DELIVERY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }
  return DELIVERED_STATUS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function parseCorreosEventDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim();

  const dmy = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (dmy) {
    const [, day, month, year, hour = "12", minute = "0", second = "0"] = dmy;
    const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}+01:00`;
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return null;
}

export function parseDeliveryFromTracking(payload: unknown): { delivered: boolean; at?: string } {
  if (!payload || typeof payload !== "object") {
    return { delivered: false };
  }

  const root = payload as Record<string, unknown>;
  const topLevelStatus = [
    root.status,
    root.estado,
    root.shipmentStatus,
    root.codEstado,
    root.desEstado,
  ];
  for (const status of topLevelStatus) {
    if (typeof status === "string" && statusLooksDelivered(status)) {
      return {
        delivered: true,
        at: parseCorreosEventDate(root.eventDate ?? root.fecha) ?? undefined,
      };
    }
  }

  const events = collectEventObjects(payload);
  let latestDeliveredAt: string | undefined;

  for (const event of events) {
    const text = readEventText(event);
    const code = String(event.eventCode ?? event.code ?? event.codEvento ?? "");
    const delivered = textLooksDelivered(text) || codeLooksDelivered(code);
    if (!delivered) continue;

    const at =
      parseCorreosEventDate(
        event.eventDate ??
          event.date ??
          event.fecha ??
          event.timestamp ??
          event.fecEvento,
      ) ?? undefined;

    if (at && (!latestDeliveredAt || at > latestDeliveredAt)) {
      latestDeliveredAt = at;
    } else if (!latestDeliveredAt) {
      latestDeliveredAt = at;
    }
  }

  if (latestDeliveredAt || events.some((event) => {
    const text = readEventText(event);
    const code = String(event.eventCode ?? event.code ?? event.codEvento ?? "");
    return textLooksDelivered(text) || codeLooksDelivered(code);
  })) {
    return { delivered: true, at: latestDeliveredAt };
  }

  return { delivered: false };
}

export async function fetchCorreosTrackingPayload(
  shipmentCode: string,
): Promise<{ payload: unknown; path: string } | null> {
  const code = shipmentCode.trim();
  if (!code) return null;

  const token = await getCorreosAccessToken();
  const headers = buildCorreosAuthorizedHeaders(token);

  for (const path of trackingPathsForCode(code)) {
    const url = buildCorreosUrl(path);
    const response = await fetch(url, { method: "GET", headers });
    const raw = await response.text();

    if (!response.ok) {
      if (response.status !== 404) {
        console.warn("correos_tracking_fetch", response.status, path, raw.slice(0, 200));
      }
      continue;
    }

    try {
      return { payload: JSON.parse(raw || "{}"), path };
    } catch {
      console.warn("correos_tracking_parse", path, raw.slice(0, 200));
    }
  }

  return null;
}
