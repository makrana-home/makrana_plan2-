import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { defaultCustomerMessage, personalizeCustomerMessage } from "@/lib/customer-message";
import { saveCustomerMessage } from "@/lib/customer-message-preferences";

export function CustomerMessageEditor({
  template,
  onSave,
}: {
  template: string | null;
  onSave: (template: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      onSave(await saveCustomerMessage(draft));
      toast.success("Mensaje general guardado en tu cuenta");
      setOpen(false);
    } catch {
      toast.error("No se pudo guardar el mensaje. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={template === null}
        onClick={() => {
          setDraft(template!);
          setOpen(true);
        }}
      >
        <MessageSquareText className="h-4 w-4" /> Mensaje general
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!saving) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Mensaje general para tus clientes</DialogTitle>
            <DialogDescription>
              Se guarda en tu cuenta y se usa al abrir WhatsApp con cualquier cliente. Puedes
              ajustar cada mensaje antes de enviarlo. Por ahora, confirma cada envío en WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="general-customer-message">Mensaje predeterminado</Label>
              <Textarea
                id="general-customer-message"
                rows={11}
                maxLength={4000}
                required
                disabled={saving}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-describedby="general-message-help"
              />
              <p id="general-message-help" className="text-xs text-muted-foreground">
                Usa {"{nombre}"} para el nombre de cada cliente y {"{catalogo}"} para el enlace a tu
                catálogo.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setDraft(defaultCustomerMessage)}
                >
                  Restablecer original
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setDraft("")}
                >
                  Escribir desde cero
                </Button>
              </div>
            </div>
            {open && (
              <div className="rounded-xl border border-sand/60 bg-muted/30 p-4">
                <p className="mb-2 text-sm font-medium">Vista previa · Andrea</p>
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {personalizeCustomerMessage(draft, "Andrea", window.location.origin)}
                </p>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !draft.trim()}>
                {saving ? "Guardando…" : "Guardar mensaje general"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
