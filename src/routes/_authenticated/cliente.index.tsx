import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { moneyPEN, formatDate } from "@/components/admin-ui";
import { clientGetProfile } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/cliente/")({ component: ClientDashboard });

function ClientDashboard() {
  const fn = useServerFn(clientGetProfile);
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    fn().then(setD); /* eslint-disable-line */
  }, []);
  const name = d?.profile?.full_name?.split(" ")[0] ?? "";
  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-4xl">Hola{name ? `, ${name}` : ""} 👋</h1>
      <p className="text-muted-foreground mt-1">
        Tu espacio Makrana: pedidos, comprobantes y talleres.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mis pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl">{d?.sales?.length ?? 0}</div>
            <Link to="/cliente/pedidos" className="text-xs text-accent underline mt-1 inline-block">
              Ver todos →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comprobantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl">
              {(d?.sales ?? []).filter((s: any) => s.receipt?.[0]).length}
            </div>
            <Link
              to="/cliente/comprobantes"
              className="text-xs text-accent underline mt-1 inline-block"
            >
              Descargar →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Talleres inscritos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl">{d?.enrollments?.length ?? 0}</div>
            <Link
              to="/cliente/talleres"
              className="text-xs text-accent underline mt-1 inline-block"
            >
              Ver detalle →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-2xl mb-3">Últimos pedidos</h2>
        <div className="space-y-2">
          {(d?.sales ?? []).slice(0, 5).map((s: any) => (
            <div
              key={s.id}
              className="border border-sand/60 rounded-lg p-4 bg-warm-white flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(s.created_at)} · {s.status}
                </div>
                <div className="text-sm">
                  {(s.items ?? []).map((it: any) => it.product?.name).join(", ") || "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg">{moneyPEN(s.total)}</div>
                {s.receipt?.[0] && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {s.receipt[0].number}
                  </div>
                )}
              </div>
            </div>
          ))}
          {(d?.sales ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aún no tienes pedidos.{" "}
              <Link to="/catalogo" className="text-accent underline">
                Explora el catálogo
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="hero">
          <Link to="/catalogo">Ver catálogo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/talleres">Ver talleres</Link>
        </Button>
      </div>
    </div>
  );
}
