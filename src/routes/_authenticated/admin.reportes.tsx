import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, DollarSign, AlertTriangle, Award, CreditCard, Users } from "lucide-react";
import { PageHeader, moneyPEN } from "@/components/admin-ui";
import { adminReports } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/admin/reportes")({ component: ReportsPage });

function ReportsPage() {
  const fn = useServerFn(adminReports);
  const [r, setR] = useState<any>(null);
  useEffect(() => { fn().then(setR); /* eslint-disable-line */ }, []);
  if (!r) return <div className="p-8 text-center text-muted-foreground">Cargando reportes…</div>;

  const methods = Object.entries(r.paymentsByMethod ?? {});
  const totalPay = methods.reduce((a, [, v]) => a + Number(v), 0);

  return (
    <div>
      <PageHeader title="Reportes" description="Vista rápida del negocio: ventas, productos top, stock bajo y caja del mes." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={DollarSign} label="Ventas hoy" value={moneyPEN(r.sales.today)} sub={`${r.sales.todayCount} venta(s) confirmadas`} />
        <KPI icon={TrendingUp} label="Ventas del mes" value={moneyPEN(r.sales.month)} sub={`${r.sales.monthCount} venta(s) confirmadas`} />
        <KPI icon={AlertTriangle} label="Productos con stock bajo" value={String(r.lowStock.length)} sub="ítems por debajo del mínimo" />
        <KPI icon={Users} label="Clientes / leads" value={`${r.counts.customers} / ${r.counts.leads}`} sub="registrados" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Award className="h-5 w-5 text-accent" /> Top 10 productos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Unid.</TableHead><TableHead className="text-right">Ingresos</TableHead></TableRow></TableHeader>
              <TableBody>
                {r.topProducts.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">Aún no hay ventas.</TableCell></TableRow>}
                {r.topProducts.map((p: any) => (
                  <TableRow key={p.name}><TableCell>{p.name}</TableCell><TableCell className="text-right tabular-nums">{p.qty.toFixed(2)}</TableCell><TableCell className="text-right tabular-nums">{moneyPEN(p.revenue)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Stock bajo</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Almacén</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Mín.</TableHead></TableRow></TableHeader>
              <TableBody>
                {r.lowStock.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-emerald-700 py-6 text-sm">Todo el stock en orden 🌿</TableCell></TableRow>}
                {r.lowStock.map((s: any) => (
                  <TableRow key={s.product.id + s.warehouse.code}>
                    <TableCell>{s.product.name}</TableCell>
                    <TableCell className="text-xs">{s.warehouse.code}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-700 font-medium">{Number(s.quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(s.product.min_stock).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Link to="/admin/movimientos" className="text-xs text-accent underline mt-3 inline-block">Registrar movimientos →</Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><CreditCard className="h-5 w-5 text-accent" /> Caja del mes — por método de pago</CardTitle></CardHeader>
          <CardContent>
            {methods.length === 0 ? <p className="text-sm text-muted-foreground">Sin pagos registrados este mes.</p> : (
              <div className="space-y-2">
                {methods.map(([m, v]) => {
                  const pct = totalPay > 0 ? (Number(v) / totalPay) * 100 : 0;
                  return (
                    <div key={m}>
                      <div className="flex justify-between text-sm"><span className="capitalize">{m}</span><span className="tabular-nums">{moneyPEN(Number(v))} <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span></span></div>
                      <div className="h-2 bg-sand/50 rounded-full overflow-hidden mt-1"><div className="h-full bg-terracotta" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
                <div className="flex justify-between text-base font-display mt-3 pt-3 border-t border-sand"><span>Total mes</span><span>{moneyPEN(totalPay)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle><Icon className="h-4 w-4 text-accent" /></CardHeader>
      <CardContent><div className="font-display text-2xl">{value}</div><p className="text-xs text-muted-foreground mt-1">{sub}</p></CardContent>
    </Card>
  );
}
