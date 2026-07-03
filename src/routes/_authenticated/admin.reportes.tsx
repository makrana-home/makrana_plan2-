import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Award,
  CreditCard,
  DollarSign,
  Download,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader, formatDate, moneyPEN } from "@/components/admin-ui";
import { adminReports } from "@/lib/admin-content.functions";
import { formatUnits } from "@/lib/format-units";

export const Route = createFileRoute("/_authenticated/admin/reportes")({ component: ReportsPage });

type ReportPeriod = "dia" | "mes" | "anio" | "todo";
type ReportType = "ventas" | "confirmadas" | "borradores" | "anuladas" | "devoluciones";

function ReportsPage() {
  const fn = useServerFn(adminReports);
  const [r, setR] = useState<any>(null);
  const [period, setPeriod] = useState<ReportPeriod>("mes");
  const [reportType, setReportType] = useState<ReportType>("ventas");

  useEffect(() => {
    fn().then(setR); /* eslint-disable-line */
  }, []);

  const sales = useMemo(() => (r?.saleRows ?? []) as any[], [r]);
  const returns = useMemo(() => (r?.returnRows ?? []) as any[], [r]);

  const filteredSales = useMemo(
    () =>
      sales.filter((sale) => {
        if (!isInPeriod(sale.created_at, period)) return false;
        if (reportType === "confirmadas") return sale.status === "confirmada";
        if (reportType === "borradores") return sale.status === "borrador";
        if (reportType === "anuladas") return sale.status === "anulada";
        return reportType === "ventas";
      }),
    [period, reportType, sales],
  );

  const filteredReturns = useMemo(
    () =>
      returns.filter(
        (item) => reportType === "devoluciones" && isInPeriod(item.created_at, period),
      ),
    [period, reportType, returns],
  );

  const channelRows = useMemo(() => buildChannelRows(filteredSales), [filteredSales]);
  const reportRows = reportType === "devoluciones" ? filteredReturns : filteredSales;
  const reportTotal =
    reportType === "devoluciones"
      ? filteredReturns.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
      : filteredSales.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const confirmedCount = filteredSales.filter((sale) => sale.status === "confirmada").length;
  const cancelledCount = filteredSales.filter((sale) => sale.status === "anulada").length;
  const draftCount = filteredSales.filter((sale) => sale.status === "borrador").length;

  if (!r) return <div className="p-8 text-center text-muted-foreground">Cargando reportes...</div>;

  const methods = Object.entries(r.paymentsByMethod ?? {});
  const totalPay = methods.reduce((a, [, v]) => a + Number(v), 0);

  function downloadReport() {
    const csv =
      reportType === "devoluciones"
        ? buildReturnsCsv(filteredReturns)
        : buildSalesCsv(filteredSales);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `makrana-reporte-${reportType}-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Reportes de ventas por canal, estado y periodo. Filtra y descarga la información para control interno."
      />

      <div className="mb-6 grid gap-4 rounded-3xl border border-sand/80 bg-warm-white/80 p-5 shadow-sm md:grid-cols-[minmax(220px,280px)_minmax(220px,280px)_auto]">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Tipo de reporte
          </label>
          <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
            <SelectTrigger className="h-12 rounded-2xl bg-cream/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ventas">Ventas por canal</SelectItem>
              <SelectItem value="confirmadas">Ventas confirmadas</SelectItem>
              <SelectItem value="anuladas">Ventas anuladas</SelectItem>
              <SelectItem value="borradores">Ventas en borrador</SelectItem>
              <SelectItem value="devoluciones">Devoluciones</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Periodo
          </label>
          <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
            <SelectTrigger className="h-12 rounded-2xl bg-cream/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Hoy</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="anio">Este año</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" className="h-12 rounded-full px-6" onClick={downloadReport}>
            <Download className="h-4 w-4" />
            Descargar reporte
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI
          icon={DollarSign}
          label="Total filtrado"
          value={reportType === "devoluciones" ? formatUnits(reportTotal) : moneyPEN(reportTotal)}
          sub={`${reportRows.length} registro(s)`}
        />
        <KPI icon={TrendingUp} label="Confirmadas" value={String(confirmedCount)} sub="ventas" />
        <KPI icon={AlertTriangle} label="Anuladas" value={String(cancelledCount)} sub="ventas" />
        <KPI icon={Users} label="Borradores" value={String(draftCount)} sub="ventas pendientes" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              {reportType === "devoluciones" ? "Detalle de devoluciones" : "Detalle de ventas"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportType === "devoluciones" ? (
              <ReturnsTable rows={filteredReturns} />
            ) : (
              <SalesTable rows={filteredSales} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Canales</CardTitle>
          </CardHeader>
          <CardContent>
            {reportType === "devoluciones" ? (
              <p className="text-sm text-muted-foreground">
                Las devoluciones se listan por almacén y motivo.
              </p>
            ) : channelRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas en este periodo.</p>
            ) : (
              <div className="space-y-3">
                {channelRows.map((row) => (
                  <div key={row.channel} className="rounded-2xl border border-sand/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium capitalize">{row.channel}</span>
                      <span className="font-semibold tabular-nums">{moneyPEN(row.total)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{row.count} venta(s)</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" /> Top 10 piezas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pieza</TableHead>
                  <TableHead className="text-right">Unid.</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.topProducts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-6 text-sm"
                    >
                      Aún no hay ventas.
                    </TableCell>
                  </TableRow>
                )}
                {r.topProducts.map((p: any) => (
                  <TableRow key={p.name}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUnits(p.qty)}</TableCell>
                    <TableCell className="text-right tabular-nums">{moneyPEN(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pieza</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mín.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.lowStock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-emerald-700 py-6 text-sm">
                      Todo el stock está en orden.
                    </TableCell>
                  </TableRow>
                )}
                {r.lowStock.map((s: any) => (
                  <TableRow key={s.product.id + s.warehouse.code}>
                    <TableCell>{s.product.name}</TableCell>
                    <TableCell className="text-xs">{s.warehouse.code}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-700 font-medium">
                      {formatUnits(s.quantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUnits(s.product.min_stock)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Link
              to="/admin/movimientos"
              className="text-xs text-accent underline mt-3 inline-block"
            >
              Registrar movimientos →
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" /> Caja del mes por método de pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos registrados este mes.</p>
            ) : (
              <div className="space-y-2">
                {methods.map(([m, v]) => {
                  const pct = totalPay > 0 ? (Number(v) / totalPay) * 100 : 0;
                  return (
                    <div key={m}>
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{m}</span>
                        <span className="tabular-nums">
                          {moneyPEN(Number(v))}{" "}
                          <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-sand/50 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-terracotta" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between text-base font-display mt-3 pt-3 border-t border-sand">
                  <span>Total mes</span>
                  <span>{moneyPEN(totalPay)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SalesTable({ rows }: { rows: any[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[920px]">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Almacén</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                Sin ventas para este filtro.
              </TableCell>
            </TableRow>
          )}
          {rows.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(sale.created_at)}
              </TableCell>
              <TableCell>{sale.customer?.full_name ?? "Sin cliente"}</TableCell>
              <TableCell className="capitalize">{extractChannel(sale.notes)}</TableCell>
              <TableCell>{sale.status}</TableCell>
              <TableCell>{sale.payment_status}</TableCell>
              <TableCell className="text-xs">{sale.warehouse?.name ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{moneyPEN(sale.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ReturnsTable({ rows }: { rows: any[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Ítem</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Almacén</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                Sin devoluciones para este filtro.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(row.created_at)}
              </TableCell>
              <TableCell>{row.product?.name ?? "—"}</TableCell>
              <TableCell className="text-xs">{row.product?.sku ?? "—"}</TableCell>
              <TableCell>{row.warehouse?.name ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatUnits(row.quantity)}</TableCell>
              <TableCell>{row.reason ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function isInPeriod(value: string, period: ReportPeriod) {
  if (period === "todo") return true;
  const date = new Date(value);
  const now = new Date();
  if (period === "dia") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  if (period === "mes") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  return date.getFullYear() === now.getFullYear();
}

function extractChannel(notes?: string | null) {
  const match = String(notes ?? "").match(/^\[([^\]]+)\]/);
  return match?.[1]?.trim().toLowerCase() || "sin canal";
}

function buildChannelRows(rows: any[]) {
  const map = new Map<string, { channel: string; count: number; total: number }>();
  for (const row of rows) {
    const channel = extractChannel(row.notes);
    const current = map.get(channel) ?? { channel, count: 0, total: 0 };
    current.count += 1;
    current.total += Number(row.total ?? 0);
    map.set(channel, current);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function buildSalesCsv(rows: any[]) {
  const header = ["fecha", "cliente", "canal", "estado", "pago", "almacen", "total"];
  const lines = rows.map((sale) =>
    [
      formatDate(sale.created_at),
      sale.customer?.full_name ?? "",
      extractChannel(sale.notes),
      sale.status ?? "",
      sale.payment_status ?? "",
      sale.warehouse?.name ?? "",
      Number(sale.total ?? 0).toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function buildReturnsCsv(rows: any[]) {
  const header = ["fecha", "item", "sku", "almacen", "cantidad", "motivo"];
  const lines = rows.map((row) =>
    [
      formatDate(row.created_at),
      row.product?.name ?? "",
      row.product?.sku ?? "",
      row.warehouse?.name ?? "",
      formatUnits(row.quantity),
      row.reason ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function csvCell(value: any) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
