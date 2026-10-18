import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
            columns === "*" ? query({ data: elixir, error: null }) : list,
        };
      }
      return query({ data: [], error: null });
    },
  },
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ addItem: vi.fn(), isAddToCartDisabled: false }),
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
