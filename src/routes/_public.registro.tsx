import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createLead } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_public/registro")({
  head: () => ({ meta: [
    { title: "Registro · Makrana Home Art" },
    { name: "description", content: "Déjanos tus datos y descubre lo nuevo de Makrana: productos, talleres y novedades." },
    { property: "og:title", content: "Registro · Makrana" },
    { property: "og:description", content: "Únete a la comunidad Makrana." },
  ]}),
  component: Register,
});

function Register() {
  const submit = useServerFn(createLead);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await submit({ data: {
        full_name: String(fd.get("full_name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        location: String(fd.get("location") ?? ""),
        source: String(fd.get("source") ?? ""),
        interest: String(fd.get("interest") ?? ""),
        message: String(fd.get("message") ?? ""),
      }});
      toast.success("¡Gracias por registrarte! Te contactaremos pronto.");
      (e.target as HTMLFormElement).reset();
      router.navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error("No pudimos guardar tu registro. Intenta nuevamente.");
    } finally { setLoading(false); }
  }

  return (
    <section className="section-padded">
      <div className="container-makrana max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-accent">Comunidad Makrana</p>
        <h1 className="font-display text-5xl mt-2">Quiero registrarme</h1>
        <p className="mt-3 text-muted-foreground">Déjanos tus datos para enviarte novedades, talleres y piezas nuevas.</p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2"><Label htmlFor="full_name">Nombres y apellidos *</Label><Input id="full_name" name="full_name" required maxLength={120} /></div>
            <div className="grid gap-2"><Label htmlFor="email">Correo</Label><Input id="email" name="email" type="email" maxLength={160} /></div>
            <div className="grid gap-2"><Label htmlFor="phone">Celular</Label><Input id="phone" name="phone" maxLength={40} /></div>
            <div className="grid gap-2"><Label htmlFor="location">Ubicación</Label><Input id="location" name="location" maxLength={160} placeholder="Lima, Perú" /></div>
            <div className="grid gap-2"><Label htmlFor="source">¿Cómo nos conociste?</Label><Input id="source" name="source" maxLength={160} placeholder="Instagram, feria, recomendación..." /></div>
            <div className="grid gap-2"><Label htmlFor="interest">Interés principal</Label><Input id="interest" name="interest" maxLength={160} placeholder="Productos, talleres, materiales..." /></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="message">Mensaje (opcional)</Label><Textarea id="message" name="message" rows={4} maxLength={1000} /></div>
          <Button type="submit" variant="hero" size="lg" disabled={loading} className="justify-self-start">{loading ? "Enviando..." : "Enviar registro"}</Button>
        </form>
      </div>
    </section>
  );
}
