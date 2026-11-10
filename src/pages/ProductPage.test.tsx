import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProductPage from "@/pages/ProductPage";

const elixir = {
  id: "p-elixir",
  name: "FIJADOR HÍBRIDO DE CEJAS Y PESTAÑAS",
  slug: "elixir",
  category: "ELIXIR",
  price: 59.9,
  stock: 10,
  image_url: "/placeholder.svg",
  tagline: "Fijación y cuidado en un sólo gesto",
  description: "Fijación + cuidado en un solo gesto.\nLa mirada que quieres.",
  materials: "AQUA\nGLYCERIN",
  materials_label: "composicion",
  shipping_info: "Entrega estimada de dos a tres días laborales",
  is_pack: false,
  feature_videos: [],
  color_variants: null,
  claims:
    "Fijación con acabado natural. Mantén tus cejas definidas y en su sitio.\nCejas y pestañas en un solo gesto",
};

const ritual = {
  ...elixir,
  id: "p-ritual",
  name: "RITUAL COMPLETO",
  slug: "ritual-shenna-brows",
  category: "PACK",
  is_pack: true,
  claims: null,
  color_variants: [
    { id: "black", name: "Black Edition", hex: "#0A0A0A", group: "Herramientas" },
    { id: "gold", name: "Gold Edition", hex: "#F0E138", group: "Herramientas" },
    { id: "soft", name: "Soft Brown", hex: "#736049", group: "Lápiz" },
    { id: "medium", name: "Medium Brown", hex: "#54483D", group: "Lápiz" },
  ],
};

const pencil = {
  ...ritual,
  id: "p-lapiz",
  name: "DEFINE TUS CEJAS",
  slug: "lapiz-de-precision",
  is_pack: false,
  color_variants: [
    { id: "soft", name: "Soft Brown", hex: "#736049" },
    { id: "medium", name: "Medium Brown", hex: "#54483D" },
  ],
};

/** Producto que devuelve la consulta de la ficha. */
let current: Record<string, unknown> = elixir;
const addItem = vi.fn();

const catalog = [
  elixir,
  { ...elixir, id: "p-stick", slug: "stick", name: "PROTECCIÓN E HIDRATACIÓN", category: "STICK" },
];

/** Builder encadenable que se resuelve como una consulta de PostgREST. */
function query(result: { data: unknown; error: null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit", "range"]) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = () => Promise.resolve(result);
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "site_content") return query({ data: [], error: null });
      if (table === "products") {
        const list = query({ data: catalog, error: null });
        return {
          ...list,
          select: (columns: string) =>
            columns === "*" ? query({ data: current, error: null }) : list,
        };
      }
      return query({ data: [], error: null });
    },
  },
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ addItem, isAddToCartDisabled: false }),
}));

function renderProduct(slug = "elixir") {
  return render(
    <MemoryRouter initialEntries={[`/${slug}`]}>
      <Routes>
        <Route path="/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  current = elixir;
  addItem.mockClear();
});

describe("ficha de producto", () => {
  it("muestra descripción, composición y envío como desplegables cerrados", async () => {
    renderProduct();

    const description = await screen.findByRole("button", { name: "Descripción" });
    const composition = screen.getByRole("button", { name: "Composición" });
    const shipping = screen.getByRole("button", { name: "Envío" });

    for (const trigger of [description, composition, shipping]) {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
    expect(screen.queryByText("AQUA")).toBeNull();
  });

  it("repite las ventajas de compra entre el botón y los desplegables", async () => {
    renderProduct();

    const heading = await screen.findByRole("heading", { name: "Tus ventajas al comprar en Shenna BROWS" });
    const addToCart = screen.getByRole("button", { name: /Añadir al Carrito/i });
    const description = screen.getByRole("button", { name: "Descripción" });

    expect(screen.getByText("Atención por WhatsApp")).toBeInTheDocument();
    expect(addToCart.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("muestra los claims del producto justo después de «Añadir al carrito»", async () => {
    renderProduct();

    const heading = await screen.findByRole("heading", { name: "¿Por qué elegir ELIXIR?" });
    const advantages = screen.getByRole("heading", { name: "Tus ventajas al comprar en Shenna BROWS" });
    const addToCart = screen.getByRole("button", { name: /Añadir al Carrito/i });
    const lead = screen.getByText("Fijación con acabado natural.");

    expect(lead.tagName).toBe("STRONG");
    expect(screen.getByText("Cejas y pestañas en un solo gesto")).toBeInTheDocument();
    expect(addToCart.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(advantages) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("abre cada desplegable al tocarlo", async () => {
    renderProduct();

    fireEvent.click(await screen.findByRole("button", { name: "Composición" }));

    expect(screen.getByRole("button", { name: "Composición" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("AQUA")).toBeInTheDocument();
  });
});

describe("variantes en la ficha", () => {
  it("en un pack con dos grupos pide una variante de cada uno y añade las dos", async () => {
    current = ritual;
    renderProduct("ritual-shenna-brows");

    const tools = await screen.findByRole("listbox", { name: "Elegir Herramientas" });
    const pencils = screen.getByRole("listbox", { name: "Elegir Lápiz" });
    expect(within(tools).getAllByRole("option").map((o) => o.title)).toEqual(["Black Edition", "Gold Edition"]);

    fireEvent.click(within(tools).getByRole("option", { name: "Gold Edition" }));
    fireEvent.click(within(pencils).getByRole("option", { name: "Medium Brown" }));
    fireEvent.click(screen.getByRole("button", { name: /Añadir al Carrito/i }));

    expect(addItem).toHaveBeenCalledTimes(1);
    const [product, variants] = addItem.mock.calls[0];
    expect(product).toMatchObject({ id: "p-ritual" });
    expect(variants.map((v: { name: string }) => v.name)).toEqual(["Gold Edition", "Medium Brown"]);
  });

  it("sin grupos mantiene un solo selector de color, con el primero elegido", async () => {
    current = pencil;
    renderProduct("lapiz-de-precision");

    const colors = await screen.findByRole("listbox", { name: "Elegir color" });
    expect(screen.getAllByRole("listbox")).toHaveLength(1);
    expect(within(colors).getByRole("option", { name: "Soft Brown" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: /Añadir al Carrito/i }));

    expect(addItem.mock.calls[0][1].map((v: { id: string }) => v.id)).toEqual(["soft"]);
  });
});
