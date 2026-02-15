import { products } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AnimatedSection from "@/components/AnimatedSection";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const mockOrders = [
  { id: "ORD-001", customer: "María García", total: 64.98, status: "paid", date: "2026-02-14" },
  { id: "ORD-002", customer: "Laura Martínez", total: 34.99, status: "shipped", date: "2026-02-13" },
  { id: "ORD-003", customer: "Ana López", total: 83.97, status: "pending", date: "2026-02-12" },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
};

const Admin = () => {
  const [editedProducts, setEditedProducts] = useState(
    products.map((p) => ({ ...p }))
  );

  const updateField = (id: string, field: "price" | "stock", value: string) => {
    setEditedProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [field]: field === "price" ? parseFloat(value) || 0 : parseInt(value) || 0 } : p
      )
    );
  };

  return (
    <main className="min-h-screen bg-cream pt-28 pb-16">
      <div className="container mx-auto px-6 max-w-5xl">
        <AnimatedSection>
          <h1 className="font-playfair text-3xl font-bold text-carbon mb-2">Panel de Administración</h1>
          <p className="text-carbon/50 text-sm mb-10">Gestiona productos y pedidos.</p>
        </AnimatedSection>

        {/* Orders */}
        <AnimatedSection delay={0.05}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Pedidos Recientes</h2>
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden mb-12">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gold/10">
                  <TableHead className="text-carbon/60">ID</TableHead>
                  <TableHead className="text-carbon/60">Cliente</TableHead>
                  <TableHead className="text-carbon/60">Total</TableHead>
                  <TableHead className="text-carbon/60">Estado</TableHead>
                  <TableHead className="text-carbon/60">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockOrders.map((o) => (
                  <TableRow key={o.id} className="border-b border-gold/5">
                    <TableCell className="font-mono text-sm text-carbon/70">{o.id}</TableCell>
                    <TableCell className="text-carbon">{o.customer}</TableCell>
                    <TableCell className="text-carbon font-medium">€{o.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[o.status]}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-carbon/60 text-sm">{o.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AnimatedSection>

        {/* Products */}
        <AnimatedSection delay={0.1}>
          <h2 className="font-playfair text-xl font-semibold text-carbon mb-4">Editar Productos</h2>
          <div className="space-y-4">
            {editedProducts.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-carbon">{p.name}</h3>
                  <p className="text-xs text-carbon/40">{p.category}</p>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-carbon/50">Precio €</span>
                    <Input
                      type="number"
                      value={p.price}
                      onChange={(e) => updateField(p.id, "price", e.target.value)}
                      className="w-24 bg-cream/50 border-gold/15 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-carbon/50">Stock</span>
                    <Input
                      type="number"
                      value={p.stock}
                      onChange={(e) => updateField(p.id, "stock", e.target.value)}
                      className="w-20 bg-cream/50 border-gold/15 text-sm"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="border-gold/20 text-gold hover:bg-gold/5">
                    Guardar
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-carbon/30 mt-4">Los cambios se guardarán cuando se conecte el backend.</p>
        </AnimatedSection>
      </div>
    </main>
  );
};

export default Admin;
