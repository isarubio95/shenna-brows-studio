import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Tables } from "@/integrations/supabase/types";
import ProductEditDialog from "@/components/admin/ProductEditDialog";

type Product = Tables<"products">;

/** Error de PostgREST cuando `products.claims` todavía no existe; null = columna creada. */
let claimsColumnError: { message: string } | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [], error: claimsColumnError }),
      }),
    }),
  },
}));

afterEach(() => {
  claimsColumnError = null;
});

const savedDescription = "<p>Descripción guardada de prueba</p>";

const product: Product = {
  id: "prod-1",
  name: "Espuma fijadora",
  slug: "espuma-fijadora",
  category: "Espuma",
  price: 24,
  stock: 8,
  tagline: "Fijación ligera",
  description: savedDescription,
  materials: "Pantenol",
  materials_label: "materiales",
  shipping_info: "Envío 24/48h",
  image_url: null,
  is_pack: false,
  is_on_sale: false,
  sale_price: null,
  color_variants: [],
  feature_videos: [],
  created_at: null,
  updated_at: null,
  stripe_price_id: null,
  claims: "Fijación ligera. Sin apelmazar.\nVegana",
};

describe("ProductEditDialog description editor", () => {
  it("precarga la descripción existente al abrir el editor", () => {
    render(
      <ProductEditDialog
        product={product}
        mode="edit"
        open
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );

    const editor = document.getElementById("description");
    expect(editor).toBeTruthy();
    expect(editor?.innerHTML).toContain("Descripción guardada de prueba");
    expect(screen.getByText("Descripción guardada de prueba")).toBeInTheDocument();
  });

  it("deja vacío el editor al crear un producto nuevo", () => {
    render(
      <ProductEditDialog
        product={null}
        mode="create"
        open
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );

    const editor = document.getElementById("description");
    expect(editor).toBeTruthy();
    expect(normalizeHtml(editor?.innerHTML ?? "")).toBe("");
  });

  it("conserva lo escrito en la descripción si el resto del formulario se re-renderiza", () => {
    render(
      <ProductEditDialog
        product={product}
        mode="edit"
        open
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );

    const editor = document.getElementById("description");
    expect(editor).toBeTruthy();
    editor!.innerHTML = "<p>Texto editado ahora</p>";
    fireEvent.input(editor!);

    const nameInput = screen.getByLabelText("Nombre");
    fireEvent.change(nameInput, { target: { value: "Nombre nuevo" } });

    expect(document.getElementById("description")?.innerHTML).toContain("Texto editado ahora");
  });
});

describe("ProductEditDialog vídeos de la ficha", () => {
  it("explica dónde salen los vídeos y deja claro que son opcionales", () => {
    render(
      <ProductEditDialog
        product={product}
        mode="edit"
        open
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );

    expect(screen.getByText("Vídeos de la ficha")).toBeInTheDocument();
    expect(screen.getByText(/columna de la izquierda, al lado de la descripción/)).toBeInTheDocument();
    expect(screen.getByText(/carrusel debajo de «Envío»/)).toBeInTheDocument();
    expect(screen.getByText(/la ficha muestra solo las fotos y el texto/i)).toBeInTheDocument();
  });

  it("precarga los vídeos guardados con su título", () => {
    render(
      <ProductEditDialog
        product={{
          ...product,
          feature_videos: [
            { id: "v1", title: "El anuncio", videoUrl: "https://x/a.mp4", aspectRatio: 0.5625 },
            { id: "v2", title: "Cómo se utiliza", videoUrl: "https://x/b.mp4", aspectRatio: 0.5625 },
          ],
        }}
        mode="edit"
        open
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );

    const titles = screen
      .getAllByLabelText("Título: qué se ve en el vídeo")
      .map((input) => (input as HTMLInputElement).value);
    expect(titles).toEqual(["El anuncio", "Cómo se utiliza"]);
  });

  it("no arrastra los vídeos de otro producto al crear uno nuevo", () => {
    render(
      <ProductEditDialog
        product={null}
        mode="create"
        open
        onOpenChange={() => {}}
        onSaved={() => {}}
      />,
    );

    expect(screen.queryAllByLabelText("Título: qué se ve en el vídeo")).toHaveLength(0);
  });
});

function normalizeHtml(html: string) {
  return html.replace(/<br\s*\/?>/gi, "").replace(/<p>\s*<\/p>/gi, "").trim();
}

describe("ProductEditDialog argumentos de venta", () => {
  it("precarga los claims guardados en cinco líneas editables", async () => {
    render(
      <ProductEditDialog product={product} mode="edit" open onOpenChange={() => {}} onSaved={() => {}} />,
    );

    const first = screen.getByRole("textbox", { name: "Argumento de venta 1" });
    expect(first).toHaveValue("Fijación ligera. Sin apelmazar.");
    expect(screen.getByRole("textbox", { name: "Argumento de venta 2" })).toHaveValue("Vegana");
    expect(screen.getAllByRole("textbox", { name: /Argumento de venta \d/ })).toHaveLength(5);
    await vi.waitFor(() => expect(first).toBeEnabled());
  });

  it("avisa de la migración pendiente si la columna no existe", async () => {
    claimsColumnError = { message: "column products.claims does not exist" };
    render(
      <ProductEditDialog product={product} mode="edit" open onOpenChange={() => {}} onSaved={() => {}} />,
    );

    expect(await screen.findByText(/migración pendiente/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /Argumento de venta/ })).toBeNull();
  });
});
