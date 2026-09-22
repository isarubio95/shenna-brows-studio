import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductImageGallery, {
  PRODUCT_IMAGE_GALLERY_ATTR,
  allowEmblaDragOutsideProductGallery,
} from "./ProductImageGallery";

const images = [
  "https://cdn.example.com/a.webp",
  "https://cdn.example.com/b.webp",
  "https://cdn.example.com/c.webp",
];

describe("allowEmblaDragOutsideProductGallery", () => {
  it("deja arrastrar el carrusel padre si el gesto no nace en la galería", () => {
    const target = document.createElement("p");
    expect(allowEmblaDragOutsideProductGallery(null, { target })).toBe(true);
  });

  it("bloquea el carrusel padre cuando el gesto nace en la galería", () => {
    const gallery = document.createElement("div");
    gallery.setAttribute(PRODUCT_IMAGE_GALLERY_ATTR, "");
    const image = document.createElement("img");
    gallery.appendChild(image);
    expect(allowEmblaDragOutsideProductGallery(null, { target: image })).toBe(false);
  });
});

describe("ProductImageGallery", () => {
  it("marca la galería y pinta controles cuando hay varias fotos", () => {
    const { container } = render(
      <ProductImageGallery images={images} alt="Lápiz de precisión" showDots compact />,
    );

    expect(container.querySelector(`[${PRODUCT_IMAGE_GALLERY_ATTR}]`)).not.toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Foto anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente foto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver foto 2" })).toBeInTheDocument();
  });

  it("cambia de foto con las flechas y deslizando el dedo", () => {
    const { container } = render(
      <ProductImageGallery images={images} alt="Lápiz de precisión" showDots compact />,
    );
    const current = () => screen.getByRole("button", { current: true }).getAttribute("aria-label");
    const gallery = container.querySelector(`[${PRODUCT_IMAGE_GALLERY_ATTR}]`)!;

    fireEvent.click(screen.getByRole("button", { name: "Siguiente foto" }));
    expect(current()).toBe("Ver foto 2");

    fireEvent.touchStart(gallery, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(gallery, { touches: [{ clientX: 100, clientY: 105 }] });
    fireEvent.touchEnd(gallery);
    expect(current()).toBe("Ver foto 3");

    const prev = screen.getByRole("button", { name: "Foto anterior" });
    fireEvent.touchStart(prev, { touches: [{ clientX: 10, clientY: 100 }] });
    fireEvent.touchEnd(prev);
    fireEvent.click(prev);
    expect(current()).toBe("Ver foto 2");
  });

  it("no intercepta el carrusel padre cuando solo hay una foto", () => {
    const { container } = render(
      <ProductImageGallery images={[images[0]]} alt="Lápiz de precisión" showDots compact />,
    );

    expect(container.querySelector(`[${PRODUCT_IMAGE_GALLERY_ATTR}]`)).toBeNull();
    expect(screen.queryByRole("button", { name: "Siguiente foto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver foto 1" })).not.toBeInTheDocument();
  });
});
