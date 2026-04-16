import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  CheckSquare,
  XSquare,
  Paperclip,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Send,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { getVisitorId } from "@/lib/security";

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  zip_code: string | null;
}

interface Attachment {
  filename: string;
  content: string; // base64
  content_type: string;
}

const PAGE_SIZE = 10;
const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const AdminEmailSender = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: true, allowBase64: true }),
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none border border-gold/10 rounded-lg bg-white",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        event.preventDefault();
        Array.from(files).forEach((file) => {
          if (file.type.startsWith("image/")) {
            insertImageFromFile(file);
          } else {
            addFileAttachment(file);
          }
        });
        return true;
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        Array.from(files).forEach((file) => {
          if (file.type.startsWith("image/")) {
            insertImageFromFile(file);
          } else {
            addFileAttachment(file);
          }
        });
        return true;
      },
    },
  });

  const insertImageFromFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        editor?.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
    },
    [editor]
  );

  const addFileAttachment = useCallback((file: File) => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      toast({ title: "Límite de adjuntos alcanzado", variant: "destructive" });
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast({ title: "Archivo demasiado grande (máx 4MB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setAttachments((prev) => [
        ...prev,
        { filename: file.name, content: base64, content_type: file.type || "application/octet-stream" },
      ]);
    };
    reader.readAsDataURL(file);
  }, [attachments.length, toast]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone, city, address, zip_code", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) {
      setProfiles(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [currentPage]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      profiles.forEach((p) => {
        if (p.email) next.add(p.user_id);
      });
      return next;
    });
  };

  const deselectAll = () => setSelected(new Set());

  const openCompose = () => {
    setSubject("");
    setAttachments([]);
    editor?.commands.clearContent();
    setComposeOpen(true);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        insertImageFromFile(file);
      } else {
        addFileAttachment(file);
      }
    });
    e.target.value = "";
  };

  const addImageViaUrl = () => {
    const url = prompt("URL de la imagen:");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = prompt("URL del enlace:");
    if (url) {
      editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        insertImageFromFile(file);
      } else {
        addFileAttachment(file);
      }
    });
  };

  const sendEmails = async () => {
    const cooldownMs = cooldownUntil ? Math.max(0, cooldownUntil - Date.now()) : 0;
    if (cooldownMs > 0) {
      toast({
        title: "Espera antes de reenviar",
        description: `${Math.ceil(cooldownMs / 1000)}s`,
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !editor?.getHTML()) {
      toast({ title: "Completa el asunto y el mensaje", variant: "destructive" });
      return;
    }

    const recipientEmails = profiles
      .filter((p) => selected.has(p.user_id) && p.email)
      .map((p) => p.email!);

    // Also include selected users from other pages - fetch their emails
    const otherSelected = [...selected].filter(
      (id) => !profiles.find((p) => p.user_id === id)
    );

    const allEmails = [...recipientEmails];

    if (otherSelected.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .in("user_id", otherSelected);
      if (data) {
        allEmails.push(...data.filter((d) => d.email).map((d) => d.email!));
      }
    }

    if (allEmails.length === 0) {
      toast({ title: "No hay destinatarios con email válido", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const res = await fetch(
        `https://vanhsuisvxvclxdgutaw.supabase.co/functions/v1/send-admin-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "x-visitor-id": getVisitorId(),
          },
          body: JSON.stringify({
            recipients: allEmails,
            subject: subject.trim(),
            html: editor.getHTML(),
            attachments: attachments.length > 0 ? attachments : undefined,
          }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        toast({ title: `✅ ${result.message}` });
        setComposeOpen(false);
        setSelected(new Set());
      } else {
        if (res.status === 429) {
          setCooldownUntil(Date.now() + 30000);
        }
        toast({ title: "Error al enviar", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={selectAllOnPage}
          className="border-gold/20 text-carbon hover:bg-gold/5"
        >
          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
          Seleccionar página
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={deselectAll}
          disabled={selected.size === 0}
          className="border-gold/20 text-carbon hover:bg-gold/5"
        >
          <XSquare className="h-3.5 w-3.5 mr-1.5" />
          Deseleccionar todos
        </Button>
        <div className="flex-1" />
        {selected.size > 0 && (
          <span className="text-sm text-carbon/50">{selected.size} seleccionado(s)</span>
        )}
        <Button
          onClick={openCompose}
          disabled={selected.size === 0}
          className="bg-gold hover:bg-gold/90 text-white"
        >
          <Mail className="h-4 w-4 mr-2" />
          Enviar email
        </Button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-8 text-center text-carbon/40">No hay usuarios registrados</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gold/10">
                <TableHead className="w-10" />
                <TableHead className="text-carbon/60">Nombre</TableHead>
                <TableHead className="text-carbon/60">Email</TableHead>
                <TableHead className="text-carbon/60 hidden md:table-cell">Teléfono</TableHead>
                <TableHead className="text-carbon/60 hidden lg:table-cell">Ciudad</TableHead>
                <TableHead className="text-carbon/60 hidden xl:table-cell">Dirección</TableHead>
                <TableHead className="text-carbon/60 hidden xl:table-cell">C.P.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow
                  key={p.user_id}
                  className={`border-b border-gold/5 cursor-pointer transition-colors ${
                    selected.has(p.user_id) ? "bg-gold/5" : ""
                  }`}
                  onClick={() => toggleSelect(p.user_id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(p.user_id)}
                      onCheckedChange={() => toggleSelect(p.user_id)}
                      disabled={!p.email}
                    />
                  </TableCell>
                  <TableCell className="text-carbon font-medium text-sm">
                    {p.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-carbon/70 text-sm">{p.email || "—"}</TableCell>
                  <TableCell className="text-carbon/60 text-sm hidden md:table-cell">
                    {p.phone || "—"}
                  </TableCell>
                  <TableCell className="text-carbon/60 text-sm hidden lg:table-cell">
                    {p.city || "—"}
                  </TableCell>
                  <TableCell className="text-carbon/60 text-sm hidden xl:table-cell">
                    {p.address || "—"}
                  </TableCell>
                  <TableCell className="text-carbon/60 text-sm hidden xl:table-cell">
                    {p.zip_code || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === currentPage}
                    onClick={() => setCurrentPage(page)}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Compose dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair text-carbon">
              Enviar email a {selected.size} usuario(s)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* From */}
            <div>
              <label className="text-xs text-carbon/50 block mb-1">De</label>
              <div className="text-sm text-carbon bg-muted/30 px-3 py-2 rounded-md">
                info@shennabrows.com
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs text-carbon/50 block mb-1">Asunto</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del email..."
                className="border-gold/20 focus:border-gold"
              />
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 border border-gold/10 rounded-lg p-1.5 bg-muted/20">
              <ToolbarBtn
                icon={Bold}
                active={editor?.isActive("bold")}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                title="Negrita"
              />
              <ToolbarBtn
                icon={Italic}
                active={editor?.isActive("italic")}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                title="Cursiva"
              />
              <div className="w-px bg-gold/10 mx-0.5" />
              <ToolbarBtn
                icon={List}
                active={editor?.isActive("bulletList")}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                title="Lista"
              />
              <ToolbarBtn
                icon={ListOrdered}
                active={editor?.isActive("orderedList")}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                title="Lista numerada"
              />
              <div className="w-px bg-gold/10 mx-0.5" />
              <ToolbarBtn icon={LinkIcon} onClick={addLink} title="Enlace" />
              <ToolbarBtn icon={ImageIcon} onClick={addImageViaUrl} title="Imagen (URL)" />
              <ToolbarBtn
                icon={Paperclip}
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar archivo"
              />
              <div className="w-px bg-gold/10 mx-0.5" />
              <ToolbarBtn
                icon={Undo}
                onClick={() => editor?.chain().focus().undo().run()}
                title="Deshacer"
              />
              <ToolbarBtn
                icon={Redo}
                onClick={() => editor?.chain().focus().redo().run()}
                title="Rehacer"
              />
            </div>

            {/* Editor */}
            <div
              ref={dropZoneRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropZone}
            >
              <EditorContent editor={editor} />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-carbon/50">Adjuntos</label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-muted/30 rounded-md px-2.5 py-1.5 text-xs text-carbon/70"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[150px] truncate">{att.filename}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-carbon/40 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />

            <p className="text-xs text-carbon/40">
              Arrastra imágenes al editor para insertarlas inline, o arrastra archivos para adjuntarlos.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button
              onClick={sendEmails}
              disabled={sending || !subject.trim()}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Toolbar button helper
const ToolbarBtn = ({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      active ? "bg-gold/20 text-gold" : "text-carbon/50 hover:bg-gold/10 hover:text-carbon"
    }`}
  >
    <Icon className="h-4 w-4" />
  </button>
);

export default AdminEmailSender;
