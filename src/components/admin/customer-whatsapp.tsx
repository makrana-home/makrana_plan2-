import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { personalizeCustomerMessage } from "@/lib/customer-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CustomerWhatsApp({
  customer,
  template,
}: {
  customer: { full_name: string; phone?: string | null };
  template: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  // Local Peruvian mobile numbers use +51; international numbers retain their code.
  const digits = phone.replace(/[\s()+.-]/g, "").replace(/^00/, "");
  const normalizedPhone = /^9\d{8}$/.test(digits) ? `51${digits}` : digits;
  const validPhone =
    /^[1-9]\d{7,14}$/.test(normalizedPhone) &&
    (phone.trim().startsWith("+") ||
      phone.trim().startsWith("00") ||
      /^9\d{8}$/.test(digits) ||
      /^51\d{9}$/.test(digits));
  const canOpen = validPhone && message.trim().length > 0;

  function startMessage() {
    if (template === null) return;
    setPhone(customer.phone ?? "");
    setMessage(personalizeCustomerMessage(template, customer.full_name, window.location.origin));
    setOpen(true);
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-green-700/30 text-green-800 hover:bg-green-50 hover:text-green-900"
        onClick={startMessage}
        disabled={template === null}
        aria-label={`Escribir por WhatsApp a ${customer.full_name}`}
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>WhatsApp · {customer.full_name}</DialogTitle>
            <DialogDescription>
              Edita el mensaje o escribe uno nuevo. El envío se confirma en WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="customer-whatsapp-phone">Número de WhatsApp</Label>
            <Input
              id="customer-whatsapp-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ej. 987 654 321 o +51 987 654 321"
              aria-describedby="customer-whatsapp-phone-help"
              aria-invalid={!validPhone}
            />
            <p id="customer-whatsapp-phone-help" className="text-xs text-muted-foreground">
              {validPhone
                ? `Se abrirá la conversación con +${normalizedPhone}.`
                : "Ingresa un celular peruano de 9 dígitos o un número internacional con + y código de país."}{" "}
              Los cambios de número aquí solo se aplican a este mensaje.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-whatsapp-message">Mensaje</Label>
            <Textarea
              id="customer-whatsapp-message"
              rows={12}
              className="min-h-64"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setMessage(
                    personalizeCustomerMessage(
                      template ?? "",
                      customer.full_name,
                      window.location.origin,
                    ),
                  )
                }
              >
                Restablecer mensaje
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMessage("")}>
                Escribir desde cero
              </Button>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            {canOpen ? (
              <Button asChild className="bg-green-700 text-white hover:bg-green-800">
                <a
                  href={`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
                </a>
              </Button>
            ) : (
              <Button disabled>
                <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
