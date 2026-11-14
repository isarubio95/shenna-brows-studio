import { describe, expect, it } from "vitest";
import {
  buildCustomerEmail,
  CUSTOMER_EMAILS,
  discountConditionsText,
  parseCustomerEmailOverrides,
  resolveCustomerEmail,
  sampleCustomerEmailData,
  serializeCustomerEmailOverrides,
  textToParagraphsHtml,
} from "../../supabase/functions/_shared/customerEmails";

const order = {
  orderRef: "2611140001",
  subtotal: 54.9,
  shipping: 4.9,
  total: 49.8,
  discountAmount: 10,
  discountCode: "BIENVENIDA10",
  lines: [{ name: "Elixir <b>", quantity: 2, unitPrice: 10 }],
};

describe("customer email texts", () => {
  it("keeps the original texts until the admin changes them", () => {
    const email = buildCustomerEmail({ key: "order_paid", order });
    expect(email.subject).toBe("Confirmación de pedido - Shenna Brows");
    expect(email.html).toContain("Hemos recibido el pago correctamente");
    expect(email.html).toContain("BIENVENIDA10");
    expect(email.html).toContain("Elixir &lt;b&gt;");
  });

  it("fills placeholders and bold marks, escaping what the admin typed", () => {
    const overrides = parseCustomerEmailOverrides(
      serializeCustomerEmailOverrides({
        order_paid: {
          subject: "Pedido {pedido} recibido",
          body: "Hola <script>\n\nTotal: **{total}**",
        },
      }),
    );
    const email = buildCustomerEmail({ key: "order_paid", order }, overrides);
    expect(email.subject).toBe("Pedido 2611140001 recibido");
    expect(email.html).toContain("Hola &lt;script&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toMatch(/Total: <strong>49,80\s€<\/strong>/);
  });

  it("stores only what differs from the original", () => {
    const original = resolveCustomerEmail("order_cancelled");
    const stored = JSON.parse(
      serializeCustomerEmailOverrides({
        order_cancelled: { ...original, title: "Cancelado" },
      }),
    );
    expect(stored.emails).toEqual({ order_cancelled: { title: "Cancelado" } });
  });

  it("brings an emptied required field back and lets optional ones hide", () => {
    const overrides = parseCustomerEmailOverrides(
      JSON.stringify({ version: 1, emails: { order_delivered: { subject: "  ", extra: "" } } }),
    );
    const resolved = resolveCustomerEmail("order_delivered", overrides);
    expect(resolved.subject).toBe("Tu pedido ha sido entregado — Shenna Brows");
    expect(resolved.extra).toBe("");
    const html = buildCustomerEmail(sampleCustomerEmailData("order_delivered"), overrides).html;
    expect(html).not.toContain("instagram.com");
  });

  it("ignores broken or unknown saved content", () => {
    expect(parseCustomerEmailOverrides("not json")).toEqual({});
    expect(parseCustomerEmailOverrides(JSON.stringify({ emails: { nope: { subject: "x" } } }))).toEqual({});
  });

  it("uses the no-tracking text for a shipped order without a Correos code", () => {
    const email = buildCustomerEmail({ key: "order_shipped", order: { ...order, trackingCode: null } });
    expect(email.html).toContain("hacia la dirección de envío");
    expect(email.html).not.toContain("Seguir envío en Correos");
  });

  it("puts an unsubscribe link only in newsletter emails", () => {
    for (const def of CUSTOMER_EMAILS) {
      const html = buildCustomerEmail(sampleCustomerEmailData(def.key, "https://x.test")).html;
      expect(html.includes("Darme de baja")).toBe(def.group === "newsletter");
    }
  });

  it("describes discount conditions", () => {
    expect(discountConditionsText(50, true)).toMatch(/^Válido en tu primer pedido a partir de 50,00\s€\.$/);
    expect(discountConditionsText(null, true)).toBe("Válido en tu primer pedido.");
    expect(discountConditionsText(0, false)).toBe("");
  });

  it("splits paragraphs on blank lines", () => {
    const html = textToParagraphsHtml("Uno\nsigue\n\n\nDos", {});
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).toContain("Uno<br />sigue");
  });
});
