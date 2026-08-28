import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Tables } from "@/integrations/supabase/types";
import ProductEditDialog from "@/components/admin/ProductEditDialog";

type Product = Tables<"products">;

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
  created_at: null,
  updated_at: null,
  stripe_price_id: null,
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

function normalizeHtml(html: string) {
  return html.replace(/<br\s*\/?>/gi, "").replace(/<p>\s*<\/p>/gi, "").trim();
}
