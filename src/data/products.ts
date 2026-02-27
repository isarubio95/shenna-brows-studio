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
  stripe_price_id: string;
}

export const SHIPPING_COST = 5;
export const FREE_SHIPPING_THRESHOLD = 50;

export function getShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Espuma Fijadora Shenna",
    slug: "espuma",
    category: "espuma",
    price: 19.99,
    stock: 100,
    image_url: "/placeholder.svg",
    description: "Espuma fijadora de cejas de larga duración que aporta volumen y estructura sin apelmazar. Su textura ultraligera permite modelar cada vello con precisión, manteniéndolos en su lugar durante todo el día. Enriquecida con pantenol y extracto de bambú para fortalecer el vello.",
    materials: "Fórmula vegana y cruelty-free. Ingredientes clave: Pantenol, Extracto de bambú, Vitamina E. Sin parabenos ni sulfatos. Envase airless de 50ml.",
    shipping_info: "Envío gratuito en pedidos superiores a €50. Entrega estimada en 3-5 días laborables. Empaque premium de regalo incluido.",
    tagline: "Volumen y fijación sin esfuerzo",
    stripe_price_id: "price_1T16FqHU2ua1cIqbqUxepbBu",
  },
  {
    id: "2",
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
    stripe_price_id: "price_1T16FCHU2ua1cIqbfBUxN6ku",
  },
  {
    id: "3",
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
    stripe_price_id: "price_1T16FTHU2ua1cIqbvBmeuqgK",
  },
  {
    id: "4",
    name: "Stick Protector Shenna",
    slug: "stick",
    category: "stick",
    price: 14.99,
    stock: 80,
    image_url: "/placeholder.svg",
    description: "Stick de protección cutánea diseñado para crear una barrera invisible alrededor de la ceja durante el tinte o la depilación. Protege la piel sensible de irritaciones y manchas no deseadas. Fórmula dermatológicamente testada con aloe vera y vitamina E.",
    materials: "Fórmula hipoalergénica y dermatológicamente testada. Ingredientes clave: Aloe vera, Vitamina E, Cera de abeja natural. Sin fragancias artificiales. Formato stick de 15g.",
    shipping_info: "Envío gratuito en pedidos superiores a €50. Entrega estimada en 3-5 días laborables. Empaque premium de regalo incluido.",
    tagline: "Protección invisible, resultados impecables",
    stripe_price_id: "",
  },
  {
    id: "5",
    name: "Lápiz de Cejas Shenna",
    slug: "lapiz",
    category: "lapiz",
    price: 16.99,
    stock: 60,
    image_url: "/placeholder.svg",
    description: "Lápiz de cejas de punta ultrafina que permite trazos pelo a pelo para un resultado hiperrealista y natural. Su fórmula waterproof garantiza una duración impecable de hasta 24 horas. Incluye cepillo spoolie integrado para difuminar y peinar.",
    materials: "Punta ultrafina de 0.1mm. Fórmula waterproof de larga duración. Cepillo spoolie integrado. Disponible en tono universal. Sin testado en animales.",
    shipping_info: "Envío gratuito en pedidos superiores a €50. Entrega estimada en 3-5 días laborables. Empaque premium de regalo incluido.",
    tagline: "Trazos que imitan la naturaleza",
    stripe_price_id: "",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
