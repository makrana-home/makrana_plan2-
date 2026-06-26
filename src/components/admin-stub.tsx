import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function AdminStub({
  title,
  description,
  phase,
}: {
  title: string;
  description?: string;
  phase?: string;
}) {
  return (
    <div>
      <h1 className="font-display text-4xl">{title}</h1>
      {description && <p className="text-muted-foreground mt-2 max-w-prose">{description}</p>}
      <div className="mt-8 rounded-xl border border-dashed border-sand p-12 bg-cream/40">
        <p className="text-sm text-muted-foreground">
          Este módulo se habilitará en {phase ?? "una próxima fase"}.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          La base técnica (tablas, RLS y permisos) ya está creada — listo para construir encima.
        </p>
        <Button asChild variant="link" className="px-0 mt-4">
          <Link to="/admin">← Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
