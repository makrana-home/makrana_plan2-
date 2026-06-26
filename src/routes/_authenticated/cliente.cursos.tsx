import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cliente/cursos")({
  component: () => (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">Mis cursos</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Próximamente: lecciones grabadas y materiales descargables de tus cursos virtuales.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-sand p-12 text-center bg-cream/40">
        <p className="text-muted-foreground">
          Mientras tanto, revisa tus inscripciones a talleres.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/cliente/talleres">Mis talleres</Link>
        </Button>
      </div>
    </div>
  ),
});
