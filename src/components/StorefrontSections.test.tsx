import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import StorefrontSections, { StorefrontTopSections } from "@/components/StorefrontSections";

function query(result: { data: unknown; error: null; count?: number }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit"]) {
    builder[method] = () => builder;
  }
  builder.range = () => Promise.resolve(result);
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) =>
      table === "profiles_public_view"
        ? query({ data: [{ full_name: "Celia", content: "Mi básico", created_at: "2026-10-01" }], error: null, count: 1 })
        : query({ data: [], error: null }),
  },
}));

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <StorefrontTopSections />
        <main>Página</main>
        <StorefrontSections />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("bloques comunes del layout", () => {
  it("pone la franja de envíos arriba, justo antes de la página", () => {
    const { container } = renderAt("/sobre-mi");

    const top = container.querySelector(".storefront-top-strip");
    expect(top).not.toBeNull();
    expect(top?.nextElementSibling?.tagName).toBe("MAIN");
    expect(screen.getByRole("region", { name: "Ventajas de comprar en Shenna" })).toBeInTheDocument();
  });

  it("deja solo las reseñas al final fuera de Inicio y Colección", async () => {
    renderAt("/preguntas-frecuentes");

    expect(await screen.findByText("Mi básico")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /La esencia que define/ })).toBeNull();
  });

  it("añade los valores al final de Colección", async () => {
    renderAt("/tienda");

    expect(await screen.findByRole("heading", { name: /La esencia que define/ })).toBeInTheDocument();
  });

  it("no pinta nada en la home, que coloca los bloques ella misma", () => {
    const { container } = renderAt("/");

    expect(container.querySelector("[data-storefront-sections]")).toBeNull();
  });
});
