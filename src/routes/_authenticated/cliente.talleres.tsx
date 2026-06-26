import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moneyPEN, formatDate } from "@/components/admin-ui";
import { clientGetProfile } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/cliente/talleres")({ component: Talleres });

function Talleres() {
  const fn = useServerFn(clientGetProfile);
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    fn().then(setD); /* eslint-disable-line */
  }, []);
  const enrolls = d?.enrollments ?? [];
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Talleres inscritos</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Todas tus inscripciones a talleres y cursos Makrana.
      </p>

      {enrolls.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-sand p-12 text-center bg-cream/40">
          <p className="text-muted-foreground">Aún no estás inscrita a ningún taller.</p>
          <Button asChild variant="hero" className="mt-4">
            <Link to="/talleres">Ver talleres disponibles</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {enrolls.map((e: any) => (
            <li key={e.id} className="border border-sand/60 rounded-xl bg-warm-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg">{e.workshop?.title}</h3>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(e.workshop?.starts_at)} · {e.workshop?.modality} ·{" "}
                    {e.workshop?.level}
                  </div>
                  {e.workshop?.location && (
                    <div className="text-xs text-muted-foreground">📍 {e.workshop.location}</div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={e.payment_status === "pagado" ? "default" : "outline"}>
                    pago: {e.payment_status}
                  </Badge>
                  <div className="text-sm tabular-nums">
                    {moneyPEN(e.amount || e.workshop?.price)}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
