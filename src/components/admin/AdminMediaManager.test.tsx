import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminMediaManager from "@/components/admin/AdminMediaManager";

const BASE = "https://vanhsuisvxvclxdgutaw.supabase.co/storage/v1/object/public";

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
    storage: { from: () => ({ remove: vi.fn() }) },
  },
}));

function resolved<T>(data: T) {
  return {
    select: () => resolved(data),
    in: () => Promise.resolve({ data, error: null }),
    then: (resolve: (value: { data: T; error: null }) => unknown) =>
      resolve({ data, error: null }),
  };
}

function renderMedia() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminMediaManager />
    </QueryClientProvider>,
  );
}

describe("AdminMediaManager", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    rpc.mockResolvedValue({
      data: [
        {
          bucket_id: "product-images",
          name: "pinzas-1.webp",
          created_at: "2026-09-21T10:00:00.000Z",
          updated_at: "2026-09-21T10:00:00.000Z",
          size_bytes: 2000,
          mime_type: "image/webp",
        },
        {
          bucket_id: "campaign-images",
          name: "hero-old.webp",
          created_at: "2026-09-20T10:00:00.000Z",
          updated_at: "2026-09-20T10:00:00.000Z",
          size_bytes: 9000,
          mime_type: "image/webp",
        },
      ],
      error: null,
    });
    from.mockImplementation((table: string) => {
      if (table === "products") {
        return resolved([
          {
            name: "Pinzas",
            image_url: JSON.stringify([`${BASE}/product-images/pinzas-1.webp`]),
            feature_videos: [],
          },
        ]);
      }
      return resolved([]);
    });
  });

  it("marca en uso el archivo referenciado y deja borrar solo el huérfano", async () => {
    renderMedia();

    await waitFor(() => {
      expect(screen.getByText("pinzas-1.webp")).toBeInTheDocument();
    });

    const usedRow = screen.getByText("pinzas-1.webp").closest("tr");
    const unusedRow = screen.getByText("hero-old.webp").closest("tr");
    expect(usedRow).toBeTruthy();
    expect(unusedRow).toBeTruthy();
    expect(within(usedRow!).getByText("En uso")).toBeInTheDocument();
    expect(within(unusedRow!).getByText("Sin usar")).toBeInTheDocument();
    expect(within(usedRow!).getByText("Producto: Pinzas")).toBeInTheDocument();
    expect(within(usedRow!).getByRole("button", { name: "No se puede eliminar, está en uso" })).toBeDisabled();
    expect(within(unusedRow!).getByRole("button", { name: "Eliminar" })).toBeEnabled();
  });

  it("filtra por no usados", async () => {
    renderMedia();
    await waitFor(() => {
      expect(screen.getByText("hero-old.webp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sin usar" }));
    expect(screen.getByText("hero-old.webp")).toBeInTheDocument();
    expect(screen.queryByText("pinzas-1.webp")).not.toBeInTheDocument();
  });
});
