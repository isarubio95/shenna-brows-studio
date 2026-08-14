/** Validación y cálculo de códigos promocionales (Edge Functions). */

export type DiscountCodeRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number | string;
  min_subtotal: number | string | null;
  max_uses: number | null;
  max_uses_per_email: number | null;
  first_order_only: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_welcome_offer: boolean;
};

export type AppliedDiscount = {
  id: string;
  code: string;
  amount: number;
  discountType: "fixed" | "percent";
  discountValue: number;
  minSubtotal: number | null;
};

export function computeDiscountAmount(
  row: DiscountCodeRow,
  subtotalEur: number,
): number {
  const value = Number(row.discount_value);
  if (!Number.isFinite(value) || value <= 0 || subtotalEur <= 0) return 0;

  let amount = 0;
  if (row.discount_type === "percent") {
    amount = (subtotalEur * value) / 100;
  } else {
    amount = value;
  }

  amount = Math.round(amount * 100) / 100;
  if (amount > subtotalEur) amount = Math.round(subtotalEur * 100) / 100;
  return amount;
}

export function formatDiscountLabel(row: Pick<DiscountCodeRow, "discount_type" | "discount_value">): string {
  const value = Number(row.discount_value);
  if (row.discount_type === "percent") {
    return `${value}%`;
  }
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€`;
}

type AdminClient = {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
};

const PAID_STATUSES = ["paid", "processing", "shipped", "delivered", "returned"] as const;

/**
 * Carga y valida un código para un email + subtotal.
 * Devuelve el descuento aplicado o un mensaje de error en español.
 */
export async function resolveDiscountCode(args: {
  admin: AdminClient;
  codeRaw: string;
  email: string;
  subtotalEur: number;
}): Promise<{ ok: true; discount: AppliedDiscount } | { ok: false; error: string }> {
  const code = String(args.codeRaw ?? "").trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "Introduce un código promocional" };
  }

  const { data: row, error } = await args.admin
    .from("discount_codes")
    .select(
      "id, code, description, discount_type, discount_value, min_subtotal, max_uses, max_uses_per_email, first_order_only, starts_at, ends_at, is_active, is_welcome_offer",
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("resolve_discount_code_query", error);
    return { ok: false, error: "No se pudo validar el código" };
  }
  if (!row) {
    return { ok: false, error: "Código promocional no válido" };
  }

  const discountRow = row as DiscountCodeRow;
  if (!discountRow.is_active) {
    return { ok: false, error: "Este código ya no está activo" };
  }

  const now = Date.now();
  if (discountRow.starts_at && new Date(discountRow.starts_at).getTime() > now) {
    return { ok: false, error: "Este código todavía no está disponible" };
  }
  if (discountRow.ends_at && new Date(discountRow.ends_at).getTime() < now) {
    return { ok: false, error: "Este código ha caducado" };
  }

  const minSubtotal =
    discountRow.min_subtotal == null ? null : Number(discountRow.min_subtotal);
  if (minSubtotal != null && Number.isFinite(minSubtotal) && args.subtotalEur < minSubtotal) {
    return {
      ok: false,
      error: `Este código requiere un pedido mínimo de ${minSubtotal.toLocaleString("es-ES", {
        style: "currency",
        currency: "EUR",
      })}`,
    };
  }

  if (discountRow.max_uses != null) {
    const { count, error: countErr } = await args.admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("discount_code_id", discountRow.id)
      .neq("status", "pending_payment");
    if (countErr) {
      console.error("resolve_discount_max_uses", countErr);
      return { ok: false, error: "No se pudo validar el código" };
    }
    if ((count ?? 0) >= Number(discountRow.max_uses)) {
      return { ok: false, error: "Este código ha agotado sus usos" };
    }
  }

  if (discountRow.max_uses_per_email != null) {
    const { count, error: countErr } = await args.admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("discount_code_id", discountRow.id)
      .eq("email", args.email)
      .neq("status", "pending_payment");
    if (countErr) {
      console.error("resolve_discount_per_email", countErr);
      return { ok: false, error: "No se pudo validar el código" };
    }
    if ((count ?? 0) >= Number(discountRow.max_uses_per_email)) {
      return { ok: false, error: "Ya has usado este código el máximo de veces permitido" };
    }
  }

  if (discountRow.first_order_only) {
    const { count, error: countErr } = await args.admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("email", args.email)
      .in("status", [...PAID_STATUSES]);
    if (countErr) {
      console.error("resolve_discount_first_order", countErr);
      return { ok: false, error: "No se pudo validar el código" };
    }
    if ((count ?? 0) > 0) {
      return { ok: false, error: "Este código solo es válido en tu primer pedido" };
    }
  }

  const emailNormalized = String(args.email ?? "").trim().toLowerCase();
  const { data: allowedRows, error: allowedErr } = await args.admin
    .from("discount_code_emails")
    .select("email")
    .eq("discount_code_id", discountRow.id);
  if (allowedErr) {
    console.error("resolve_discount_allowed_emails", allowedErr);
    return { ok: false, error: "No se pudo validar el código" };
  }
  if ((allowedRows ?? []).length > 0) {
    const allowed = new Set(
      (allowedRows as { email: string }[]).map((r) => String(r.email).trim().toLowerCase()),
    );
    if (!allowed.has(emailNormalized)) {
      return { ok: false, error: "Este código no está disponible para tu email" };
    }
  }

  const amount = computeDiscountAmount(discountRow, args.subtotalEur);
  if (amount <= 0) {
    return { ok: false, error: "Este código no aplica a tu pedido" };
  }

  return {
    ok: true,
    discount: {
      id: discountRow.id,
      code: discountRow.code,
      amount,
      discountType: discountRow.discount_type === "percent" ? "percent" : "fixed",
      discountValue: Number(discountRow.discount_value),
      minSubtotal,
    },
  };
}
