import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ProductFeatureVideoCarousel,
  ProductFeatureVideoStack,
} from "@/components/ProductFeatureVideos";
import type { ProductFeatureVideo } from "@/lib/product-feature-videos";

const videos: ProductFeatureVideo[] = [
  { id: "1", title: "El anuncio", videoUrl: "https://x/anuncio.mp4", aspectRatio: 0.5625 },
  { id: "2", title: "Cómo se utiliza", videoUrl: "https://x/uso.mp4", aspectRatio: 0.5625 },
  { id: "3", title: "Por qué elegirlo", videoUrl: "https://x/ingredientes.mp4", aspectRatio: null },
];

describe("ProductFeatureVideoStack", () => {
  it("pinta cada vídeo con su título y su póster", () => {
    const { container } = render(
      <ProductFeatureVideoStack videos={videos} productName="Elixir" />,
    );

    const players = container.querySelectorAll("video");
    expect(players).toHaveLength(3);
    expect(players[0].getAttribute("poster")).toBe("https://x/anuncio.poster.webp");
    videos.forEach((v) => expect(screen.getByText(v.title)).toBeInTheDocument());
  });

  it("no pinta nada cuando la ficha no tiene vídeos", () => {
    const { container } = render(<ProductFeatureVideoStack videos={[]} productName="Elixir" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ProductFeatureVideoCarousel", () => {
  it("da un punto de navegación por vídeo, etiquetado con su título", () => {
    render(<ProductFeatureVideoCarousel videos={videos} productName="Elixir" />);

    const dots = screen.getAllByRole("tab");
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Cómo se utiliza" })).toBeInTheDocument();
  });

  it("se queda sin puntos cuando hay un solo vídeo", () => {
    render(<ProductFeatureVideoCarousel videos={[videos[0]]} productName="Elixir" />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
