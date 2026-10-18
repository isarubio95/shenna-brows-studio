import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Index from "@/pages/Index";
import { refreshSiteContent } from "@/hooks/use-site-content";

const product = (slug: string, name: string, extra: Record<string, unknown> = {}) => ({
  id: `p-${slug}`,
  slug,
  name,
  category: slug.toUpperCase(),
  price: 30,
  stock: 10,
  image_url: "/placeholder.svg",
  tagline: "",
  description: "",
  materials: "",
  shipping_info: "",
  is_pack: false,
  ...extra,
});

// Orden alfabético por nombre, como lo devuelve la consulta real.
const products = [
  product("lapiz", "DEFINE TUS CEJAS"),
  product("mix", "ESENCIALES DE CEJAS", { is_pack: true }),
  product("elixir", "FIJADOR HÍBRIDO"),
  product("stick", "PROTECCIÓN E HIDRATACIÓN"),
];

const siteContent = [
  {
    key: "index_campaign",
    title: "Campaña",
    content: JSON.stringify({ desktopImageUrl: "https://cdn.example.com/campana.jpg", headline: "CAMPAÑA" }),
  },
];

const reviews = [{ full_name: "Celia", content: "Mi básico sí o sí", created_at: "2026-10-01T10:00:00Z" }];

function query(result: { data: unknown; error: null; count?: number }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit"]) {
    builder[method] = () => builder;
  }
  builder.range = () => Promise.resolve(result);
  builder.maybeSingle = () => Promise.resolve(result);
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "products") return query({ data: products, error: null });
      if (table === "site_content") return query({ data: siteContent, error: null });
      if (table === "profiles_public_view") return query({ data: reviews, error: null, count: 1 });
      return query({ data: [], error: null });
    },
  },
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ addItem: vi.fn(), isAddToCartDisabled: false }),
}));

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const follows = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("home", () => {
  it("sigue el orden de la clienta: envíos y valores, campaña, titular, Elixir, colección, packs y reseñas", async () => {
    const { container } = renderHome();

    const reviewsTitle = await screen.findByRole("heading", { name: /Lo que dicen nuestras/ });
    const trust = screen.getByRole("region", { name: "Ventajas de comprar en Shenna" });
    const values = screen.getByRole("heading", { name: "La esencia que define Shenna BROWS" });
    const campaign = screen.getByRole("heading", { name: "CAMPAÑA" });
    const headline = screen.getByRole("region", { name: "Titular de la colección" });
    const spotlight = await screen.findByRole("heading", { name: "ELIXIR" });
    const collection = container.querySelector("#coleccion")!;
    const packs = container.querySelector("#packs")!;

    const order = [trust, values, campaign, headline, spotlight, collection, packs, reviewsTitle];
    order.slice(1).forEach((element, i) => expect(follows(order[i], element)).toBe(true));
  });

  it("destaca el producto protagonista en su bloque y la colección muestra el resto", async () => {
    const { container } = renderHome();

    const spotlightTitle = await screen.findByRole("heading", { name: "ELIXIR" });
    const collection = container.querySelector("#coleccion")!;
    const collectionNames = [...collection.querySelectorAll("h3")].map((h) => h.textContent);

    expect(follows(spotlightTitle, collection)).toBe(true);
    expect(collectionNames).toEqual(["DEFINE TUS CEJAS", "PROTECCIÓN E HIDRATACIÓN"]);
    // Cuadrícula, no carrusel: nada que deslizar a los lados.
    expect(collection.querySelector('[aria-roledescription="carousel"]')).toBeNull();
    expect(collection.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelector("#packs")?.textContent).toContain("ESENCIALES DE CEJAS");
    expect(screen.getByText("Fijación con acabado natural")).toBeInTheDocument();
  });

  it("sin bloque protagonista, lo pone el primero de la colección", async () => {
    siteContent.push({
      key: "site_elixir_spotlight",
      title: "Producto protagonista",
      content: JSON.stringify({ enabled: false, productSlug: "elixir" }),
    });
    await refreshSiteContent();
    try {
      const { container } = renderHome();

      await screen.findByText("ESENCIALES DE CEJAS");
      const collectionNames = [...container.querySelectorAll("#coleccion h3")].map((h) => h.textContent);
      expect(collectionNames[0]).toBe("FIJADOR HÍBRIDO");
      expect(screen.queryByRole("heading", { name: "ELIXIR" })).toBeNull();
    } finally {
      siteContent.pop();
      await refreshSiteContent();
    }
  });
});
