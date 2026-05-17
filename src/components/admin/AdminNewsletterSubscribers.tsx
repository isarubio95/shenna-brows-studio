import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";

type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  is_subscribed: boolean;
  created_at: string;
  user_id: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  footer_form: "Pie de página",
  register_form: "Registro",
  maintenance_page: "Página mantenimiento",
  public_form: "Formulario público",
};

const formatSource = (source: string) => SOURCE_LABELS[source] ?? source;

const AdminNewsletterSubscribers = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("id, email, source, is_subscribed, created_at, user_id")
      .eq("is_subscribed", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("newsletter_subscribers_list", error.message);
      setSubscribers([]);
    } else {
      setSubscribers(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const filteredSubscribers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subscribers;
    return subscribers.filter((row) => row.email.toLowerCase().includes(query));
  }, [subscribers, search]);

  return (
    <div className="mt-8">
      <h3 className="font-playfair text-lg font-semibold text-carbon mb-2">Suscriptores</h3>
      <p className="text-carbon/40 text-sm mb-4">
        Personas con consentimiento activo que recibirán las campañas de newsletter.
      </p>

      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-carbon/60">Total activos</p>
          <p className="text-carbon font-medium">
            {loading ? "Cargando..." : `${subscribers.length} suscriptor(es)`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email..."
            className="border-gold/20 focus:border-gold sm:w-64"
          />
          <Button variant="outline" onClick={fetchSubscribers} disabled={loading} className="border-gold/20">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-carbon/40 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando suscriptores...
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-8 text-center text-carbon/40">
            {subscribers.length === 0
              ? "No hay suscriptores activos todavía"
              : "Ningún resultado para la búsqueda"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gold/10">
                <TableHead className="text-carbon/60">Email</TableHead>
                <TableHead className="text-carbon/60 hidden sm:table-cell">Origen</TableHead>
                <TableHead className="text-carbon/60 hidden md:table-cell">Cuenta</TableHead>
                <TableHead className="text-carbon/60">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((row) => (
                <TableRow key={row.id} className="border-b border-gold/5">
                  <TableCell className="text-carbon text-sm font-medium">{row.email}</TableCell>
                  <TableCell className="text-carbon/70 text-sm hidden sm:table-cell">
                    {formatSource(row.source)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {row.user_id ? (
                      <Badge variant="outline" className="text-xs border-gold/30 text-gold">
                        Registrado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Sin cuenta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-carbon/60 text-sm">
                    {new Date(row.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default AdminNewsletterSubscribers;
