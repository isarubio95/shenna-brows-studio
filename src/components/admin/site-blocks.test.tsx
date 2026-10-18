import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSiteBlockEditor from "@/components/admin/AdminSiteBlockEditor";
import {
  BRAND_VALUES_BLOCK,
  COLLECTION_INTRO_BLOCK,
  ELIXIR_SPOTLIGHT_BLOCK,
  TRUST_STRIP_BLOCK,
  VALUE_PROPOSITION_BLOCK,
} from "@/components/admin/site-blocks";

const writes: Array<{ op: string; payload: unknown }> = [];

/** Builder encadenable que se resuelve como una consulta de PostgREST. */
function query(result: { data: unknown; error: null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit", "range"]) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = () => Promise.resolve(result);
  builder.single = () => Promise.resolve(result);
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      ...query({ data: null, error: null }),
      insert: (payload: unknown) => {
        writes.push({ op: "insert", payload });
        return query({ data: { id: "nuevo", content: null }, error: null });
      },
      update: (payload: unknown) => {
        writes.push({ op: "update", payload });
        return query({ data: null, error: null });
      },
    }),
  },
}));

function renderEditor() {
  return render(
    <MemoryRouter>
      <AdminSiteBlockEditor definition={TRUST_STRIP_BLOCK} />
    </MemoryRouter>,
  );
}

describe("editor de bloques de marketing", () => {
  beforeEach(() => {
    writes.length = 0;
  });

  it("carga los valores por defecto sin escribir nada en la base de datos", async () => {
    renderEditor();

    expect(await screen.findByText("Franja de confianza — Todas las páginas")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tus ventajas al comprar en Shenna")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Envío gratis").length).toBeGreaterThan(0);
    expect(writes).toEqual([]);
  });

  it("marca el plazo de entrega como pendiente de confirmar", async () => {
    renderEditor();

    expect(await screen.findByText(/Plazo pendiente de confirmar/)).toBeInTheDocument();
  });

  it("crea la fila al guardar por primera vez", async () => {
    renderEditor();

    fireEvent.click(await screen.findByRole("button", { name: /Guardar/ }));

    await vi.waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      op: "insert",
      payload: { key: "site_trust_strip", title: "Franja de confianza" },
    });
  });
});

describe("editor de «Nuestros valores»", () => {
  it("avisa de que las fotos de serie son provisionales", async () => {
    render(
      <MemoryRouter>
        <AdminSiteBlockEditor definition={BRAND_VALUES_BLOCK} />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue("La esencia que define Shenna BROWS")).toBeInTheDocument();
    expect(screen.getAllByText(/Foto provisional recortada de la maqueta/)).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: /Subir foto/ })).toHaveLength(4);
  });
});

describe("editor del producto protagonista", () => {
  it("ofrece los cinco beneficios de Elixir para editar", async () => {
    render(
      <MemoryRouter>
        <AdminSiteBlockEditor definition={ELIXIR_SPOTLIGHT_BLOCK} />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue("Fijación con acabado natural")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox", { name: /Beneficio \d/ })).toHaveLength(5);
    expect(screen.getByDisplayValue("Añadir al carrito")).toBeInTheDocument();
  });
});

describe("textos pendientes de la clienta", () => {
  it("marca como provisional el subtítulo de la colección", async () => {
    render(
      <MemoryRouter>
        <AdminSiteBlockEditor definition={COLLECTION_INTRO_BLOCK} />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue("Nuestra colección")).toBeInTheDocument();
    expect(screen.getByText(/pendiente del texto nuevo/)).toBeInTheDocument();
  });

  it("deja la propuesta de valor oculta y marcada como provisional", async () => {
    render(
      <MemoryRouter>
        <AdminSiteBlockEditor definition={VALUE_PROPOSITION_BLOCK} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("switch", { name: "Mostrar en la web" })).not.toBeChecked();
    expect(screen.getByText(/Texto provisional, montado con frases de la tienda/)).toBeInTheDocument();
    expect(screen.getByText(/Ahora mismo está oculta en la web/)).toBeInTheDocument();
  });

  it("quita el aviso en cuanto se escribe el texto definitivo", async () => {
    render(
      <MemoryRouter>
        <AdminSiteBlockEditor definition={VALUE_PROPOSITION_BLOCK} />
      </MemoryRouter>,
    );

    const textarea = await screen.findByDisplayValue(/Menos pasos, más tú/);
    fireEvent.change(textarea, { target: { value: "La belleza de unas cejas cuidadas, en casa." } });
    expect(screen.queryByText(/Texto provisional, montado/)).toBeNull();
  });
});
