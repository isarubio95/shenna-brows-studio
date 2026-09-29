import { supabase } from "@/integrations/supabase/client";

export const TESTIMONIALS_PAGE_PATH = "/testimonios";

export const TESTIMONIALS_PAGE_SIZE = 12;

export type PublicTestimonial = {
  author_name: string;
  content: string | null;
  created_at: string | null;
};

export type TestimonialsPage = {
  items: PublicTestimonial[];
  total: number | null;
};

/** Una página de las reseñas que el admin ha marcado como visibles, de la más nueva a la más antigua. */
export async function fetchFeaturedTestimonials(page: number): Promise<TestimonialsPage> {
  const from = page * TESTIMONIALS_PAGE_SIZE;
  const to = from + TESTIMONIALS_PAGE_SIZE - 1;
  const { data: rows, error, count } = await supabase
    .from("profiles_public_view")
    .select("full_name, content, created_at", { count: "exact" })
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return {
    items: (rows ?? []).map((row) => ({
      author_name: row.full_name || "Cliente Shenna",
      content: row.content,
      created_at: row.created_at,
    })),
    total: count,
  };
}

export function nextTestimonialsPage(
  lastPage: TestimonialsPage,
  lastPageParam: number,
): number | undefined {
  if (lastPage.items.length < TESTIMONIALS_PAGE_SIZE) return undefined;
  const loaded = (lastPageParam + 1) * TESTIMONIALS_PAGE_SIZE;
  if (typeof lastPage.total === "number" && loaded >= lastPage.total) return undefined;
  return lastPageParam + 1;
}
