/** Máximo de destinatarios que acepta `send-admin-email` en una sola petición. */
export const NEWSLETTER_BATCH_SIZE = 100;

export type NewsletterBatch = {
  /** 0-based. */
  index: number;
  /** Posición (1-based) de la primera y la última suscriptora de la tanda. */
  from: number;
  to: number;
  emails: string[];
};

type SubscriberLike = { email: string; created_at: string };

/**
 * Parte la lista en tandas de `size` por orden de alta (las más antiguas primero),
 * así las nuevas suscriptoras caen en la última tanda y las anteriores no se mueven.
 */
export function buildNewsletterBatches(
  subscribers: SubscriberLike[],
  size: number = NEWSLETTER_BATCH_SIZE,
): NewsletterBatch[] {
  const ordered = [...subscribers].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.email.localeCompare(b.email),
  );
  const batches: NewsletterBatch[] = [];
  for (let start = 0; start < ordered.length; start += size) {
    const slice = ordered.slice(start, start + size);
    batches.push({
      index: batches.length,
      from: start + 1,
      to: start + slice.length,
      emails: slice.map((row) => row.email),
    });
  }
  return batches;
}

/** Las primeras `size` (por orden de alta) que todavía no han recibido este envío. */
export function nextUnsentEmails(
  subscribers: SubscriberLike[],
  sent: ReadonlySet<string>,
  size: number = NEWSLETTER_BATCH_SIZE,
): string[] {
  return buildNewsletterBatches(subscribers, Number.MAX_SAFE_INTEGER)
    .flatMap((batch) => batch.emails)
    .filter((email) => !sent.has(email))
    .slice(0, size);
}
