import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createLead } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChevronDown,
  Heart,
  Mail,
  MapPin,
  MessageSquareText,
  Package,
  Palette,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_public/registro")({
  head: () => ({
    meta: [
      { title: "Recibe novedades · Makrana Home Art" },
      {
        name: "description",
        content: "Déjanos tus datos y descubre lo nuevo de Makrana: piezas, talleres y novedades.",
      },
      { property: "og:title", content: "Recibe novedades · Makrana" },
      { property: "og:description", content: "Únete a la comunidad Makrana." },
    ],
  }),
  component: Register,
});

const sourceOptions = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Feria o evento",
  "Recomendación",
  "Google",
  "Otro",
];

const interestOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "Piezas", label: "Piezas", icon: Package },
  { value: "Talleres", label: "Talleres", icon: BookOpen },
  { value: "Ferias", label: "Ferias", icon: Sparkles },
  { value: "Materiales", label: "Materiales", icon: Palette },
];

const fieldClass =
  "h-12 rounded-2xl border-sand/80 bg-warm-white/90 pl-11 shadow-sm transition focus-visible:border-accent focus-visible:ring-accent/20";

function Register() {
  const submit = useServerFn(createLead);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const interests = fd
      .getAll("interest")
      .map((value) => String(value))
      .filter(Boolean);
    setLoading(true);
    try {
      await submit({
        data: {
          full_name: String(fd.get("full_name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          location: String(fd.get("location") ?? ""),
          source: String(fd.get("source") ?? ""),
          interest: interests.join(", "),
          message: String(fd.get("message") ?? ""),
        },
      });
      toast.success("¡Gracias por compartir tus datos! Te contactaremos pronto.");
      (e.target as HTMLFormElement).reset();
      router.navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error("No pudimos guardar tu registro. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-padded bg-gradient-to-b from-warm-white via-cream/30 to-warm-white">
      <div className="container-makrana max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-brand-terracotta">
            Comunidad Makrana
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
            Inspírate con Makrana
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Déjanos tus datos y cuéntanos qué te interesa para enviarte piezas, talleres y noticias
            pensadas para ti.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-10 grid max-w-4xl gap-6 rounded-[2rem] border border-sand/80 bg-warm-white/95 p-6 shadow-2xl shadow-clay/10 sm:p-8 lg:p-10"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nombres y apellidos *</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-terracotta" />
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  maxLength={120}
                  placeholder="Andrea Salas"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-terracotta" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  maxLength={160}
                  placeholder="andrea@correo.com"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Celular</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-terracotta" />
                <Input
                  id="phone"
                  name="phone"
                  maxLength={40}
                  placeholder="+51 986 608 552"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Ubicación</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-terracotta" />
                <Input
                  id="location"
                  name="location"
                  maxLength={160}
                  placeholder="Lima, Perú"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="source">¿Cómo nos conociste?</Label>
              <div className="relative">
                <Heart className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-terracotta" />
                <select
                  id="source"
                  name="source"
                  className="h-12 w-full appearance-none rounded-2xl border border-sand/80 bg-warm-white/90 pl-11 pr-11 text-sm shadow-sm transition outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/20"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecciona una opción
                  </option>
                  {sourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Tus intereses</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {interestOptions.map((option, index) => {
                const Icon = option.icon;
                return (
                  <label key={option.value} className="group cursor-pointer">
                    <input
                      type="checkbox"
                      name="interest"
                      value={option.value}
                      defaultChecked={index === 0}
                      className="peer sr-only"
                    />
                    <span className="flex h-12 items-center justify-center gap-2 rounded-full border border-sand/80 bg-warm-white/80 px-4 text-sm font-medium shadow-sm transition peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-brand-terracotta hover:border-accent/70">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message">Mensaje (opcional)</Label>
            <div className="relative">
              <MessageSquareText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-brand-terracotta" />
              <Textarea
                id="message"
                name="message"
                rows={4}
                maxLength={1000}
                placeholder="Cuéntanos si buscas una pieza especial, un taller o una consulta puntual."
                className="min-h-32 rounded-3xl border-sand/80 bg-warm-white/90 pl-11 pt-3 shadow-sm focus-visible:border-accent focus-visible:ring-accent/20"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            disabled={loading}
            className="h-12 w-full rounded-full text-base shadow-xl shadow-clay/20"
          >
            {loading ? "Enviando..." : "Quiero recibir novedades"}
          </Button>
        </form>
      </div>
    </section>
  );
}
