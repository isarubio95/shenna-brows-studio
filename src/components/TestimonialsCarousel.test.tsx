import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";

vi.mock("@/assets/paper-texture.avif", () => ({ default: "paper-texture.avif" }));

const ranges: Array<[number, number]> = [];

const featured = Array.from({ length: 10 }, (_, index) => ({
  full_name: `Clienta ${index + 1}`,
  content: `Reseña número ${index + 1}`,
  created_at: `2026-09-${String(28 - index).padStart(2, "0")}T10:00:00.000Z`,
  is_featured: true,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "profiles_public_view") {
        throw new Error(`Tabla inesperada: ${table}`);
      }
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: (from: number, to: number) => {
          ranges.push([from, to]);
          return Promise.resolve({
            data: featured.slice(from, to + 1),
            error: null,
            count: featured.length,
          });
        },
      };
      return builder;
    },
  },
}));

function renderCarousel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TestimonialsCarousel />
    </QueryClientProvider>,
  );
}

describe("TestimonialsCarousel", () => {
  beforeEach(() => {
    ranges.length = 0;
  });

  it("carga todas las reseñas destacadas por páginas, sin el tope de 5", async () => {
    renderCarousel();

    expect(await screen.findByText(/Reseña número 1/)).toBeInTheDocument();
    expect(screen.queryByText(/de 10/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Reseña número 10/)).toBeInTheDocument();
    });

    expect(ranges).toEqual([
      [0, 7],
      [8, 15],
    ]);
    expect(screen.getByText("Clienta 10")).toBeInTheDocument();
    expect(screen.queryByText(/Reseña número 11/)).not.toBeInTheDocument();
  });
});
