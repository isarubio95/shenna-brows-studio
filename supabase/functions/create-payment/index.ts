import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { items, customerEmail, shippingAddress } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided");
    }

    // Build line items from cart
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item: { stripe_price_id: string; quantity: number }) => ({
        price: item.stripe_price_id,
        quantity: item.quantity,
      })
    );

    // Calculate subtotal to determine shipping
    // We'll add shipping as a line item if applicable
    const subtotal = items.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0
    );

    const FREE_SHIPPING_THRESHOLD = 50;
    const SHIPPING_COST = 5;
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

    if (shippingCost > 0) {
      // Create a one-time shipping price
      const shippingPrice = await stripe.prices.create({
        unit_amount: shippingCost * 100, // in cents
        currency: "eur",
        product_data: {
          name: "Gastos de envío",
        },
      });
      lineItems.push({ price: shippingPrice.id, quantity: 1 });
    }

    const origin =
      req.headers.get("origin") ||
      Deno.env.get("SITE_URL") ||
      "http://localhost:8080";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success`,
      cancel_url: `${origin}/checkout`,
      shipping_address_collection: {
        allowed_countries: ["ES", "PT", "FR", "DE", "IT", "GB"],
      },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Payment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
