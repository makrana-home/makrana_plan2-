import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar · Makrana Home Art" },
      { name: "description", content: "Ingresa a tu cuenta Makrana o crea una nueva." },
      { property: "og:title", content: "Ingresar · Makrana" },
      { property: "og:description", content: "Acceso a la plataforma Makrana Home Art." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/cliente" });
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const full_name = String(fd.get("full_name") ?? "").trim();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name }, emailRedirectTo: `${window.location.origin}/cliente` },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Ya puedes ingresar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenida de vuelta a Makrana.");
        router.navigate({ to: "/cliente" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "No pudimos procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between bg-terracotta text-warm-white p-12">
        <Link to="/" className="font-display text-2xl">
          Makrana Home Art
        </Link>
        <div>
          <h1 className="font-display text-5xl leading-tight">
            Hecho a mano, pensado para tu hogar.
          </h1>
          <p className="mt-4 opacity-90">
            Accede a tu cuenta para ver tus pedidos, comprobantes y talleres.
          </p>
        </div>
        <p className="text-sm opacity-70">© {new Date().getFullYear()} Makrana Home Art</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="text-sm text-accent">
            ← Volver al inicio
          </Link>
          <h2 className="font-display text-3xl mt-4">
            {mode === "login" ? "Ingresa a tu cuenta" : "Crea tu cuenta"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Acceso a la plataforma Makrana." : "Únete a la comunidad Makrana."}
          </p>
          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            {mode === "signup" && (
              <div className="grid gap-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input id="full_name" name="full_name" required maxLength={120} />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" name="email" type="email" required maxLength={160} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <Button type="submit" variant="hero" size="lg" disabled={loading}>
              {loading ? "..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
            </Button>
          </form>
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 text-sm text-accent"
          >
            {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Ingresa"}
          </button>
        </div>
      </div>
    </div>
  );
}
