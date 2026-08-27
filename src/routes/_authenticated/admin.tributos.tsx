import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Landmark, ReceiptText, Settings, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/admin-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminGetTaxDashboard } from "@/lib/admin-tax.functions";

export const Route = createFileRoute("/_authenticated/admin/tributos")({ component: Page });

function Page() {
  const load = useServerFn(adminGetTaxDashboard);
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    void load().then(setData);
  }, [load]);
  const metrics = [
    ["Boletas emitidas", data?.boletas],
    ["Facturas emitidas", data?.facturas],
    ["Documentos pendientes", data?.pending],
    ["Con observaciones", data?.observed],
    ["Rechazados", data?.rejected],
    ["Notas de crédito", data?.creditNotes],
  ];
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        <ShieldAlert className="h-5 w-5" />
        Ambiente de prueba: no se están enviando documentos reales a SUNAT.
      </div>
      <PageHeader
        title="Resumen tributario"
        description="Estado sencillo de boletas, facturas, notas, libros y conexión con SUNAT."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{value ?? "—"}</CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Status
          title="Último resumen de boletas"
          value={data?.latestSummary?.summary_identifier ?? "Sin resúmenes"}
        />
        <Status title="Estado de conexión" value="Desactivada · ambiente de prueba" />
        <Status
          title="Certificado digital"
          value={
            data?.settings?.certificate_configured ? "Registrado para validación" : "Pendiente"
          }
        />
        <Status
          title="Registro de ventas SUNAT"
          value={data?.rvie ? `${data.rvie.period} · ${data.rvie.review_status}` : "Sin comparar"}
        />
        <Status
          title="Registro de compras SUNAT"
          value={data?.rce ? `${data.rce.period} · ${data.rce.review_status}` : "Sin comparar"}
        />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Shortcut to="/admin/comprobantes" icon={ReceiptText} label="Boletas y facturas" />
        <Shortcut to="/admin/compras" icon={FileText} label="Registro de compras SUNAT" />
        <Shortcut to="/admin/sire" icon={Landmark} label="Libros SUNAT" />
        <Shortcut
          to="/admin/configuracion/tributaria"
          icon={Settings}
          label="Datos y conexión SUNAT"
        />
      </div>
    </div>
  );
}
function Status({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-sand bg-warm-white p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
function Shortcut({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to as any}
      className="flex items-center gap-3 rounded-xl border border-sand bg-warm-white p-4 font-semibold hover:border-accent"
    >
      <Icon className="h-5 w-5 text-brand-terracotta" />
      {label}
    </Link>
  );
}
