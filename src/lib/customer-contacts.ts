export type CustomerContact = {
  email: string;
  name: string;
  isRegistered: boolean;
  orderCount: number;
};

export function extractShippingName(addr: unknown): string | null {
  if (!addr || typeof addr !== "object") return null;
  const raw = addr as Record<string, unknown>;
  const keys = ["name", "full_name", "fullName", "recipient", "recipient_name"];
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

type OrderRow = {
  email: string;
  shipping_address: unknown;
  created_at?: string | null;
};

type ProfileRow = {
  email: string | null;
  full_name: string | null;
};

export function buildCustomerContacts(orders: OrderRow[], profiles: ProfileRow[]): CustomerContact[] {
  const map = new Map<string, CustomerContact & { lastOrderAt?: string }>();

  for (const order of orders) {
    const email = order.email?.trim().toLowerCase();
    if (!email) continue;

    const orderName = extractShippingName(order.shipping_address);
    const existing = map.get(email);

    if (!existing) {
      map.set(email, {
        email,
        name: orderName ?? "",
        isRegistered: false,
        orderCount: 1,
        lastOrderAt: order.created_at ?? undefined,
      });
      continue;
    }

    existing.orderCount += 1;
    const orderAt = order.created_at ?? "";
    const isNewer = !existing.lastOrderAt || orderAt > existing.lastOrderAt;
    if (orderName && isNewer) {
      existing.name = orderName;
      existing.lastOrderAt = orderAt;
    } else if (orderName && !existing.name) {
      existing.name = orderName;
    }
    if (isNewer) existing.lastOrderAt = orderAt;
  }

  for (const profile of profiles) {
    const email = profile.email?.trim().toLowerCase();
    if (!email) continue;

    const profileName = profile.full_name?.trim() ?? "";
    const existing = map.get(email);

    if (!existing) {
      map.set(email, {
        email,
        name: profileName,
        isRegistered: true,
        orderCount: 0,
      });
      continue;
    }

    existing.isRegistered = true;
    if (profileName && !existing.name) existing.name = profileName;
  }

  return Array.from(map.values()).sort((a, b) => {
    const labelA = (a.name || a.email).toLocaleLowerCase("es");
    const labelB = (b.name || b.email).toLocaleLowerCase("es");
    return labelA.localeCompare(labelB, "es");
  });
}

export function displayContactName(contact: CustomerContact): string {
  if (contact.name.trim()) return contact.name.trim();
  const local = contact.email.split("@")[0];
  return local || contact.email;
}
