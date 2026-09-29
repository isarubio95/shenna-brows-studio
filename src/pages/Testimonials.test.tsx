import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Testimonials from "@/pages/Testimonials";

const ranges: Array<[number, number]> = [];
const filters: Array<[string, unknown]> = [];

const featured = Array.from({ length: 14 }, (_, index) => ({
  full_name: `Clienta ${index + 1}`,
  content: `Reseña número ${index + 1}`,
  created_at: `2026-09-${String(28 - index).padStart(2, "0")}T10:00:00.000Z`,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "site_content") {
        const content = {
          select: () => content,
          in: () => Promise.resolve({ data: [], error: null }),
        };
        return content;
      }
      if (table !== "profiles_public_view") {
        throw new Error(`Tabla inesperada: ${table}`);
      }
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return builder;
        },
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

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Testimonials />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Testimonials", () => {
  beforeEach(() => {
    ranges.length = 0;
    filters.length = 0;
  });

  it("lista solo las reseñas visibles y carga más por páginas", async () => {
    renderPage();

    expect(await screen.findByText("Reseña número 1")).toBeInTheDocument();
    expect(screen.getByText("Clienta 12")).toBeInTheDocument();
    expect(screen.queryByText("Reseña número 13")).not.toBeInTheDocument();
    expect(filters).toContainEqual(["is_featured", true]);

    fireEvent.click(screen.getByRole("button", { name: /Ver más opiniones/ }));

    await waitFor(() => {
      expect(screen.getByText("Reseña número 14")).toBeInTheDocument();
    });
    expect(ranges).toEqual([
      [0, 11],
      [12, 23],
    ]);
    expect(screen.queryByRole("button", { name: /Ver más opiniones/ })).not.toBeInTheDocument();
  });
});
