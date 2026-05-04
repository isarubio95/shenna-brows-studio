import { useEffect, useState, useCallback, useRef, type ChangeEvent, type ComponentType, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
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

interface Attachment {
  filename: string;
  content: string;
  content_type: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://vanhsuisvxvclxdgutaw.supabase.co";
const SEND_ADMIN_EMAIL_ENDPOINT = `${SUPABASE_URL}/functions/v1/send-admin-email`;
const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const AdminEmailSender = () => {
  const { toast } = useToast();
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      TiptapImage.configure({ inline: true, allowBase64: true }),
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none border border-gold/10 rounded-lg bg-white",
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        event.preventDefault();
        Array.from(files).forEach((file) => {
          if (file.type.startsWith("image/")) insertImageFromFile(file);
          else addFileAttachment(file);
        });
        return true;
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        Array.from(files).forEach((file) => {
          if (file.type.startsWith("image/")) insertImageFromFile(file);
          else addFileAttachment(file);
        });
        return true;
      },
    },
  });

  const fetchSubscriberCount = useCallback(async () => {
    setLoadingCount(true);
    const { count, error } = await supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("is_subscribed", true);
    if (error) {
      console.warn("newsletter_subscribers_count", error.message);
      setSubscriberCount(0);
    } else {
      setSubscriberCount(count ?? 0);
    }
    setLoadingCount(false);
  }, []);

  useEffect(() => {
    fetchSubscriberCount();
  }, [fetchSubscriberCount]);

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

  const addFileAttachment = useCallback(
    (file: File) => {
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
    },
    [attachments.length, toast]
  );

  const openCompose = () => {
    setSubject("");
    setAttachments([]);
    editor?.commands.clearContent();
    setComposeOpen(true);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) insertImageFromFile(file);
      else addFileAttachment(file);
    });
    e.target.value = "";
  };

  const addImageViaUrl = () => {
    const url = prompt("URL de la imagen:");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = prompt("URL del enlace:");
    if (url) editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleDropZone = (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) insertImageFromFile(file);
      else addFileAttachment(file);
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
    if (subscriberCount === 0) {
      toast({ title: "No hay suscriptores activos", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const res = await fetch(SEND_ADMIN_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          audience: "newsletter",
          subject: subject.trim(),
          html: editor.getHTML(),
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast({ title: `✅ ${result.message}` });
        setComposeOpen(false);
      } else {
        if (res.status === 429) setCooldownUntil(Date.now() + 30000);
        toast({ title: "Error al enviar", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-carbon/60">Audiencia</p>
          <p className="text-carbon font-medium">
            {loadingCount ? "Cargando suscriptores..." : `${subscriberCount} suscriptor(es) activos`}
          </p>
        </div>
        <Button onClick={openCompose} disabled={loadingCount || subscriberCount === 0} className="bg-gold hover:bg-gold/90 text-white">
          <Mail className="h-4 w-4 mr-2" />
          Enviar newsletter
        </Button>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair text-carbon">Enviar newsletter</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-carbon/50 block mb-1">De</label>
              <div className="text-sm text-carbon bg-muted/30 px-3 py-2 rounded-md">info@shennabrows.com</div>
            </div>

            <div>
              <label className="text-xs text-carbon/50 block mb-1">Asunto</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del email..."
                className="border-gold/20 focus:border-gold"
              />
            </div>

            <div className="flex flex-wrap gap-1 border border-gold/10 rounded-lg p-1.5 bg-muted/20">
              <ToolbarBtn icon={Bold} active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} title="Negrita" />
              <ToolbarBtn icon={Italic} active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Cursiva" />
              <div className="w-px bg-gold/10 mx-0.5" />
              <ToolbarBtn icon={List} active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Lista" />
              <ToolbarBtn icon={ListOrdered} active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Lista numerada" />
              <div className="w-px bg-gold/10 mx-0.5" />
              <ToolbarBtn icon={LinkIcon} onClick={addLink} title="Enlace" />
              <ToolbarBtn icon={ImageIcon} onClick={addImageViaUrl} title="Imagen (URL)" />
              <ToolbarBtn icon={Paperclip} onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo" />
              <div className="w-px bg-gold/10 mx-0.5" />
              <ToolbarBtn icon={Undo} onClick={() => editor?.chain().focus().undo().run()} title="Deshacer" />
              <ToolbarBtn icon={Redo} onClick={() => editor?.chain().focus().redo().run()} title="Rehacer" />
            </div>

            <div ref={dropZoneRef} onDragOver={(e) => e.preventDefault()} onDrop={handleDropZone}>
              <EditorContent editor={editor} />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-carbon/50">Adjuntos</label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/30 rounded-md px-2.5 py-1.5 text-xs text-carbon/70">
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[150px] truncate">{att.filename}</span>
                      <button onClick={() => removeAttachment(i)} className="text-carbon/40 hover:text-red-500 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
            <p className="text-xs text-carbon/40">Arrastra imágenes al editor para insertarlas inline, o arrastra archivos para adjuntarlos.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>Cancelar</Button>
            <Button onClick={sendEmails} disabled={sending || !subject.trim()} className="bg-gold hover:bg-gold/90 text-white">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
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
  icon: ComponentType<{ className?: string }>;
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
