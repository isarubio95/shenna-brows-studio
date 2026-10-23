import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProductCard, { type CatalogProduct } from "@/components/ProductCard";

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit"]) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve);
  return { supabase: { from: () => builder } };
});

const gel: CatalogProduct = {
  id: "p-gel",
  name: "GEL CON COLOR",
  slug: "gel",
  category: "GEL",
  price: 19.9,
  stock: 10,
  is_on_sale: false,
  sale_price: null,
  is_pack: false,
  image_url: "/placeholder.svg",
  tagline: null,
  description: null,
  materials: null,
  materials_label: null,
  shipping_info: null,
  stripe_price_id: null,
  claims: null,
  feature_videos: [],
  color_variants: [],
  created_at: null,
  updated_at: null,
};

function renderCard(product: CatalogProduct) {
  const onOpenProduct = vi.fn();
  const onAddToCart = vi.fn();
  render(
    <ProductCard
      product={product}
      delay={0}
      onOpenProduct={onOpenProduct}
      onAddToCart={onAddToCart}
      addToCartDisabled={false}
    />,
  );
  return { onOpenProduct, onAddToCart };
}

describe("tarjeta de producto", () => {
  it("añade al carrito un producto sin colores", () => {
    const { onOpenProduct, onAddToCart } = renderCard(gel);

    fireEvent.click(screen.getByRole("button", { name: /Añadir/ }));

    expect(onAddToCart).toHaveBeenCalledWith(gel);
    expect(onOpenProduct).not.toHaveBeenCalled();
  });

  it("con colores lleva a la ficha para elegir uno en vez de añadirlo sin color", () => {
    const withColors = {
      ...gel,
      color_variants: [
        { id: "v-rubio", name: "Rubio", hex: "#C8A165" },
        { id: "v-castano", name: "Castaño", hex: "#6B4226" },
      ],
    };
    const { onOpenProduct, onAddToCart } = renderCard(withColors);

    expect(screen.queryByRole("button", { name: /Añadir/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Elegir color/ }));

    expect(onOpenProduct).toHaveBeenCalledTimes(1);
    expect(onOpenProduct).toHaveBeenCalledWith("gel");
    expect(onAddToCart).not.toHaveBeenCalled();
  });
});
