import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/_public/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto · Makrana Home Art" },
      { name: "description", content: "Habla con nosotros por WhatsApp, correo o redes sociales." },
      { property: "og:title", content: "Contacto · Makrana" },
      { property: "og:description", content: "Conecta con Makrana Home Art." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <section className="section-padded">
      <div className="container-makrana max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-accent">Conversemos</p>
        <h1 className="font-display text-5xl mt-2">Contacto</h1>
        <p className="mt-3 text-muted-foreground">
          Cuéntanos qué buscas y conversemos. Estamos en Lima, Perú.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 mt-10">
          <a
            href="https://wa.me/51999999999"
            target="_blank"
            rel="noreferrer"
            className="makrana-card p-6 text-center"
          >
            <Phone className="mx-auto text-accent" />
            <p className="mt-3 font-display text-lg">WhatsApp</p>
            <p className="text-sm text-muted-foreground">+51 999 999 999</p>
          </a>
          <a href="mailto:hola@makranahomeart.pe" className="makrana-card p-6 text-center">
            <Mail className="mx-auto text-accent" />
            <p className="mt-3 font-display text-lg">Correo</p>
            <p className="text-sm text-muted-foreground">hola@makranahomeart.pe</p>
          </a>
          <div className="makrana-card p-6 text-center">
            <MapPin className="mx-auto text-accent" />
            <p className="mt-3 font-display text-lg">Ubicación</p>
            <p className="text-sm text-muted-foreground">Lima, Perú</p>
          </div>
        </div>

        <div className="mt-10">
          <Button asChild size="lg" variant="hero">
            <a href="https://wa.me/51999999999" target="_blank" rel="noreferrer">
              Escribir por WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
