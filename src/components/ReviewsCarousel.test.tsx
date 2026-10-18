import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ReviewsCarousel from "@/components/ReviewsCarousel";

let rows: Array<{ full_name: string | null; content: string | null; created_at: string }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: () => Promise.resolve({ data: rows, error: null, count: rows.length }),
      };
      return builder;
    },
  },
}));

function renderCarousel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ReviewsCarousel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ReviewsCarousel", () => {
  beforeEach(() => {
    rows = [];
  });

  it("muestra las reseñas destacadas y enlaza a todas las opiniones", async () => {
    rows = [
      { full_name: "Celia", content: "Mi básico sí o sí", created_at: "2026-10-01T10:00:00Z" },
      { full_name: null, content: "Deja una sensación súper agradable", created_at: "2026-09-30T10:00:00Z" },
      { full_name: "Vacía", content: "   ", created_at: "2026-09-29T10:00:00Z" },
    ];
    renderCarousel();

    expect(await screen.findByText("Mi básico sí o sí")).toBeInTheDocument();
    expect(screen.getByText("Cliente Shenna")).toBeInTheDocument();
    expect(screen.queryByText("Vacía")).toBeNull();
    expect(screen.getByRole("link", { name: /Ver todas las opiniones/ })).toHaveAttribute(
      "href",
      "/testimonios",
    );
  });

  it("no pinta nada si todavía no hay reseñas", async () => {
    const { container } = renderCarousel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
