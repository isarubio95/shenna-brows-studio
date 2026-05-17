import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import AdminEmailComposeDialog, { type AdminEmailSendPayload } from "@/components/admin/AdminEmailComposeDialog";
import {
  buildCustomerContacts,
  displayContactName,
  type CustomerContact,
} from "@/lib/customer-contacts";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
const SEND_ADMIN_EMAIL_ENDPOINT = `${SUPABASE_URL}/functions/v1/send-admin-email`;

const AdminCustomerEmails = () => {
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerContact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, profilesRes] = await Promise.all([
        supabase.from("orders").select("email, shipping_address, created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("email, full_name").not("email", "is", null),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setContacts(buildCustomerContacts(ordersRes.data ?? [], profilesRes.data ?? []));
    } catch (error) {
      console.warn("customer_contacts_load", error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) => {
      const name = displayContactName(contact).toLowerCase();
      return name.includes(query) || contact.email.includes(query);
    });
  }, [contacts, search]);

  const openCompose = (contact: CustomerContact) => {
    setSelected(contact);
    setComposeOpen(true);
  };

  const sendToCustomer = async (payload: AdminEmailSendPayload) => {
    if (!selected) {
      return { ok: false, error: "No hay destinatario seleccionado" };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const res = await fetch(SEND_ADMIN_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipients: [selected.email],
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments,
      }),
    });

    const result = await res.json();
    if (res.ok) {
      return { ok: true, message: result.message ?? "Email enviado" };
    }
    return { ok: false, error: result.error, status: res.status };
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-carbon/60">Contactos</p>
          <p className="text-carbon font-medium">
            {loading ? "Cargando clientes..." : `${contacts.length} persona(s) con email`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="border-gold/20 focus:border-gold sm:w-64"
          />
          <Button variant="outline" onClick={fetchContacts} disabled={loading} className="border-gold/20">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-carbon/40 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando contactos...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-carbon/40">
            {contacts.length === 0 ? "No hay contactos con email todavía" : "Ningún resultado para la búsqueda"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.email}>
                  <TableCell className="font-medium text-carbon">{displayContactName(contact)}</TableCell>
                  <TableCell className="text-carbon/70">{contact.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.orderCount > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {contact.orderCount} pedido{contact.orderCount === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                      {contact.isRegistered ? (
                        <Badge variant="outline" className="text-xs border-gold/30 text-gold">
                          Registrado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Invitado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => openCompose(contact)}
                      className="bg-gold hover:bg-gold/90 text-white"
                    >
                      <Mail className="h-4 w-4 mr-1.5" />
                      Enviar email
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AdminEmailComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        title="Enviar email al cliente"
        recipientHint={
          selected ? `${displayContactName(selected)} <${selected.email}>` : undefined
        }
        sendButtonLabel="Enviar email"
        onSend={sendToCustomer}
      />
    </div>
  );
};

export default AdminCustomerEmails;
