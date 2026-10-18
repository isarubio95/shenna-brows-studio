/**
 * El producto protagonista (Elixir) es siempre el primero que se ve: encabeza
 * cualquier listado sin alterar el orden del resto.
 */
export function featuredFirst<T extends { slug: string }>(items: T[], slug?: string | null): T[] {
  if (!slug) return items;
  const index = items.findIndex((item) => item.slug === slug);
  if (index <= 0) return items;
  return [items[index], ...items.slice(0, index), ...items.slice(index + 1)];
}
