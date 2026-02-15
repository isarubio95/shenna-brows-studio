export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  description: string;
  materials: string;
  shipping_info: string;
  tagline: string;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Pinzas Shenna Pro",
    slug: "pinzas",
    category: "pinzas",
    price: 34.99,
    stock: 50,
    image_url: "/placeholder.svg",
    description: "Pinzas de precisión profesional diseñadas para un agarre perfecto. Cada par está calibrado a mano para garantizar un cierre milimétrico que atrapa incluso el vello más fino. La herramienta esencial para artistas de cejas que no aceptan menos que la perfección.",
    materials: "Acero inoxidable italiano 430. Acabado satinado antideslizante. Punta calibrada a mano con cierre hermético.",
    shipping_info: "Envío gratuito en pedidos superiores a €50. Entrega estimada en 3-5 días laborables. Empaque premium de regalo incluido.",
    tagline: "Precisión milimétrica en cada agarre",
  },
  {
    id: "2",
    name: "Tijeras Shenna Elite",
    slug: "tijeras",
    category: "tijeras",
    price: 29.99,
    stock: 35,
    image_url: "/placeholder.svg",
    description: "Tijeras de corte preciso con hojas micro-serradas que permiten un recorte limpio y controlado. Diseñadas ergonómicamente para sesiones prolongadas sin fatiga. El complemento perfecto para dar forma y definición.",
    materials: "Acero inoxidable japonés de alta dureza. Hojas micro-serradas. Mangos ergonómicos con revestimiento soft-touch.",
    shipping_info: "Envío gratuito en pedidos superiores a €50. Entrega estimada en 3-5 días laborables. Empaque premium de regalo incluido.",
    tagline: "Corte limpio, forma perfecta",
  },
  {
    id: "3",
    name: "Gel Fijador Shenna",
    slug: "gel",
    category: "gel",
    price: 18.99,
    stock: 100,
    image_url: "/placeholder.svg",
    description: "Gel fijador transparente de larga duración que mantiene las cejas en su lugar durante todo el día. Fórmula ligera, sin residuos y resistente al agua. Enriquecido con aceite de ricino para nutrir el vello mientras fija.",
    materials: "Fórmula vegana y cruelty-free. Ingredientes clave: Aceite de ricino, Vitamina E, Pantenol. Sin parabenos ni sulfatos.",
    shipping_info: "Envío gratuito en pedidos superiores a €50. Entrega estimada en 3-5 días laborables. Empaque premium de regalo incluido.",
    tagline: "Fijación invisible, resultado visible",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
