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
type ReportType =
  | "ventas"
  | "pendientes"
  | "confirmadas"
  | "borradores"
  | "anuladas"
  | "devoluciones";

const reportTypeLabels: Record<ReportType, string> = {
  ventas: "Ventas pagadas",
  pendientes: "Ventas pendientes de pago",
  confirmadas: "Ventas confirmadas",
  borradores: "Ventas en borrador",
  anuladas: "Ventas anuladas",
  devoluciones: "Devoluciones",
};

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

  const periodSales = useMemo(
    () => sales.filter((sale) => isInPeriod(sale.created_at, period)),
    [period, sales],
  );
  const paidSales = useMemo(() => periodSales.filter(isPaidSale), [periodSales]);
  const pendingSales = useMemo(() => periodSales.filter(isPendingPaymentSale), [periodSales]);
  const paidTotal = useMemo(
    () => paidSales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0),
    [paidSales],
  );
  const pendingTotal = useMemo(
    () => pendingSales.reduce((sum, sale) => sum + getPendingAmount(sale), 0),
    [pendingSales],
  );

  const filteredSales = useMemo(
    () =>
      periodSales.filter((sale) => {
        if (reportType === "ventas") return isPaidSale(sale);
        if (reportType === "pendientes") return isPendingPaymentSale(sale);
        if (reportType === "confirmadas") return sale.status === "confirmada";
        if (reportType === "borradores") return sale.status === "borrador";
        if (reportType === "anuladas") return sale.status === "anulada";
        return false;
      }),
    [periodSales, reportType],
  );

  const filteredReturns = useMemo(
    () =>
      returns.filter(
        (item) => reportType === "devoluciones" && isInPeriod(item.created_at, period),
      ),
    [period, reportType, returns],
  );

  const channelRows = useMemo(() => buildChannelRows(filteredSales), [filteredSales]);
  const paymentMethodRows = useMemo(() => buildPaymentMethodRows(filteredSales), [filteredSales]);
  const reportRows = reportType === "devoluciones" ? filteredReturns : filteredSales;
  const reportTotal =
    reportType === "devoluciones"
      ? filteredReturns.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
      : filteredSales.reduce(
          (sum, row) =>
            sum + (reportType === "pendientes" ? getPendingAmount(row) : Number(row.total ?? 0)),
          0,
        );
  const confirmedCount = periodSales.filter((sale) => sale.status === "confirmada").length;
  const cancelledCount = periodSales.filter((sale) => sale.status === "anulada").length;
  const draftCount = periodSales.filter((sale) => sale.status === "borrador").length;

  if (!r) return <div className="p-8 text-center text-muted-foreground">Cargando reportes...</div>;

  const totalPay = paymentMethodRows.reduce((a, row) => a + row.total, 0);
  const selectedPendingTotal =
    reportType === "devoluciones"
      ? 0
      : filteredSales.reduce((sum, sale) => sum + getPendingAmount(sale), 0);

  function downloadReport() {
    const html =
      reportType === "devoluciones"
        ? buildReturnsWorkbook(filteredReturns, { period, reportType })
        : buildSalesWorkbook({
            selectedRows: filteredSales,
            paidRows: paidSales,
            pendingRows: pendingSales,
            period,
            reportType,
          });
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `makrana-reporte-${reportType}-${period}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Reportes de ventas pagadas, pendientes y devoluciones. Filtra por periodo y descarga el detalle para control interno."
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
              <SelectItem value="ventas">Ventas pagadas</SelectItem>
              <SelectItem value="pendientes">Ventas pendientes de pago</SelectItem>
              <SelectItem value="confirmadas">Ventas confirmadas (todas)</SelectItem>
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
          label="Vendido pagado"
          value={moneyPEN(paidTotal)}
          sub={`${paidSales.length} venta(s) pagada(s)`}
        />
        <KPI
          icon={CreditCard}
          label="Pendiente de cobro"
          value={moneyPEN(pendingTotal)}
          sub={`${pendingSales.length} venta(s) pendiente(s)`}
        />
        <KPI
          icon={TrendingUp}
          label="Total del filtro"
          value={reportType === "devoluciones" ? formatUnits(reportTotal) : moneyPEN(reportTotal)}
          sub={`${reportRows.length} registro(s) · ${reportTypeLabels[reportType]}`}
        />
        <KPI
          icon={Users}
          label="Control de estado"
          value={`${confirmedCount} / ${cancelledCount} / ${draftCount}`}
          sub="confirmadas / anuladas / borrador"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              {reportType === "devoluciones"
                ? "Detalle de devoluciones"
                : reportTypeLabels[reportType]}
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
              <CreditCard className="h-5 w-5 text-accent" /> Pagos del filtro por método
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethodRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin pagos registrados para el filtro actual.
                </p>
              ) : (
                paymentMethodRows.map((row) => {
                  const pct = totalPay > 0 ? (row.total / totalPay) * 100 : 0;
                  return (
                    <div key={row.method}>
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{row.method}</span>
                        <span className="tabular-nums">
                          {moneyPEN(row.total)}{" "}
                          <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{row.count} pago(s)</p>
                      <div className="h-2 bg-sand/50 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-terracotta" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
              <div className="grid gap-2 border-t border-sand pt-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4 rounded-2xl bg-cream/50 px-3 py-2">
                  <span>Total cobrado</span>
                  <span className="font-semibold tabular-nums">{moneyPEN(totalPay)}</span>
                </div>
                <div className="flex justify-between gap-4 rounded-2xl bg-cream/50 px-3 py-2">
                  <span>Saldo pendiente</span>
                  <span className="font-semibold tabular-nums">
                    {moneyPEN(selectedPendingTotal)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SalesTable({ rows }: { rows: any[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1220px]">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Método de pago</TableHead>
            <TableHead className="text-right">Pagado</TableHead>
            <TableHead className="text-right">Pendiente</TableHead>
            <TableHead>Almacén</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
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
              <TableCell className="max-w-[280px] text-xs">{formatPaymentDetails(sale)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {moneyPEN(getPaidAmount(sale))}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {moneyPEN(getPendingAmount(sale))}
              </TableCell>
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

function isPaidSale(sale: any) {
  return sale.status === "confirmada" && sale.payment_status === "pagado";
}

function isPendingPaymentSale(sale: any) {
  return (
    sale.status === "confirmada" &&
    (sale.payment_status === "pendiente" || sale.payment_status === "parcial")
  );
}

function getPaymentEntries(sale: any) {
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  if (payments.length > 0) return payments;
  if (isPaidSale(sale)) {
    return [
      {
        method: "sin método registrado",
        amount: Number(sale.total ?? 0),
        paid_at: sale.confirmed_at ?? sale.created_at,
      },
    ];
  }
  return [];
}

function getPaidAmount(sale: any) {
  const total = Number(sale.total ?? 0);
  const paid = getPaymentEntries(sale).reduce(
    (sum: number, payment: any) => sum + Number(payment.amount ?? 0),
    0,
  );
  if (paid > 0) return paid;
  return isPaidSale(sale) ? total : 0;
}

function getPendingAmount(sale: any) {
  if (sale.status === "anulada") return 0;
  return Math.max(Number(sale.total ?? 0) - getPaidAmount(sale), 0);
}

function formatPaymentDetails(sale: any) {
  const entries = getPaymentEntries(sale);
  if (entries.length === 0) return "Sin pagos registrados";
  return entries
    .map((payment: any) => {
      const method = formatPaymentMethod(payment.method);
      const paidAt = payment.paid_at ? ` · ${formatDate(payment.paid_at)}` : "";
      return `${method}: ${moneyPEN(Number(payment.amount ?? 0))}${paidAt}`;
    })
    .join("; ");
}

function formatPaymentMethods(sale: any) {
  const methods = [
    ...new Set(getPaymentEntries(sale).map((payment: any) => formatPaymentMethod(payment.method))),
  ];
  return methods.length > 0 ? methods.join(", ") : "Sin método";
}

function formatPaymentMethod(method: any) {
  return String(method ?? "sin método").replace(/_/g, " ");
}

function buildPaymentMethodRows(rows: any[]) {
  const map = new Map<string, { method: string; count: number; total: number }>();
  for (const sale of rows) {
    for (const payment of getPaymentEntries(sale)) {
      const method = formatPaymentMethod(payment.method);
      const current = map.get(method) ?? { method, count: 0, total: 0 };
      current.count += 1;
      current.total += Number(payment.amount ?? 0);
      map.set(method, current);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function formatSaleItems(sale: any) {
  const items = Array.isArray(sale.items) ? sale.items : [];
  if (items.length === 0) return "";
  return items
    .map((item: any) => {
      const name = item.product?.name ?? "Ítem";
      const sku = item.product?.sku ? ` (${item.product.sku})` : "";
      return `${item.product?.name ?? item.description ?? name}${sku} x ${formatUnits(item.quantity)} = ${moneyPEN(Number(item.subtotal ?? 0))}`;
    })
    .join("; ");
}

function buildSalesWorkbook({
  selectedRows,
  paidRows,
  pendingRows,
  period,
  reportType,
}: {
  selectedRows: any[];
  paidRows: any[];
  pendingRows: any[];
  period: ReportPeriod;
  reportType: ReportType;
}) {
  const selectedPaid = selectedRows.reduce((sum, sale) => sum + getPaidAmount(sale), 0);
  const selectedPending = selectedRows.reduce((sum, sale) => sum + getPendingAmount(sale), 0);
  const paymentRows = buildPaymentMethodRows(selectedRows).map((row) => [
    row.method,
    row.count,
    row.total,
  ]);

  return excelDocument([
    {
      title: "Resumen del reporte",
      headers: ["Concepto", "Valor"],
      rows: [
        ["Reporte", reportTypeLabels[reportType]],
        ["Periodo", periodLabels[period]],
        ["Fecha de descarga", new Date().toLocaleString("es-PE")],
        ["Registros del filtro", selectedRows.length],
        ["Cobrado en el filtro", selectedPaid],
        ["Saldo pendiente en el filtro", selectedPending],
        ["Ventas pagadas del periodo", paidRows.length],
        [
          "Total vendido pagado del periodo",
          paidRows.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0),
        ],
        ["Ventas pendientes del periodo", pendingRows.length],
        [
          "Saldo pendiente del periodo",
          pendingRows.reduce((sum, sale) => sum + getPendingAmount(sale), 0),
        ],
      ],
    },
    {
      title: "Métodos de pago del filtro",
      headers: ["Método", "Cantidad de pagos", "Total cobrado (S/)"],
      rows: paymentRows,
    },
    {
      title: `Detalle seleccionado - ${reportTypeLabels[reportType]}`,
      headers: salesExportHeaders,
      rows: selectedRows.map(saleExportRow),
    },
    {
      title: "Ventas pagadas del periodo",
      headers: salesExportHeaders,
      rows: paidRows.map(saleExportRow),
    },
    {
      title: "Ventas pendientes de pago del periodo",
      headers: salesExportHeaders,
      rows: pendingRows.map(saleExportRow),
    },
  ]);
}

function buildReturnsWorkbook(
  rows: any[],
  { period, reportType }: { period: ReportPeriod; reportType: ReportType },
) {
  return excelDocument([
    {
      title: "Resumen del reporte",
      headers: ["Concepto", "Valor"],
      rows: [
        ["Reporte", reportTypeLabels[reportType]],
        ["Periodo", periodLabels[period]],
        ["Fecha de descarga", new Date().toLocaleString("es-PE")],
        ["Registros", rows.length],
        ["Unidades devueltas", rows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)],
      ],
    },
    {
      title: "Detalle de devoluciones",
      headers: ["Fecha", "Ítem", "SKU", "Almacén", "Cantidad", "Motivo", "Notas"],
      rows: rows.map((row) => [
        formatDate(row.created_at),
        row.product?.name ?? "",
        row.product?.sku ?? "",
        row.warehouse?.name ?? "",
        Number(row.quantity ?? 0),
        row.reason ?? "",
        row.notes ?? "",
      ]),
    },
  ]);
}

const periodLabels: Record<ReportPeriod, string> = {
  dia: "Hoy",
  mes: "Este mes",
  anio: "Este año",
  todo: "Todo",
};

const salesExportHeaders = [
  "Fecha",
  "Confirmada",
  "Cliente",
  "Email",
  "Teléfono",
  "Canal",
  "Estado de venta",
  "Estado de pago",
  "Método(s) de pago",
  "Detalle de pagos",
  "Almacén",
  "Comprobante",
  "Ítems",
  "Subtotal (S/)",
  "Descuento (S/)",
  "Total (S/)",
  "Pagado (S/)",
  "Pendiente (S/)",
  "Notas",
];

function saleExportRow(sale: any) {
  return [
    formatDate(sale.created_at),
    sale.confirmed_at ? formatDate(sale.confirmed_at) : "",
    sale.customer?.full_name ?? "Sin cliente",
    sale.customer?.email ?? "",
    sale.customer?.phone ?? "",
    extractChannel(sale.notes),
    sale.status ?? "",
    sale.payment_status ?? "",
    formatPaymentMethods(sale),
    formatPaymentDetails(sale),
    sale.warehouse?.name ?? "",
    sale.receipt?.number ?? "",
    formatSaleItems(sale),
    Number(sale.subtotal ?? 0),
    Number(sale.discount ?? 0),
    Number(sale.total ?? 0),
    getPaidAmount(sale),
    getPendingAmount(sale),
    sale.notes ?? "",
  ];
}

function excelDocument(
  sections: Array<{
    title: string;
    headers: string[];
    rows: any[][];
  }>,
) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #2f211b; }
    h2 { margin: 22px 0 8px; color: #5c2d24; }
    table { border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #d8c9b8; padding: 7px 9px; vertical-align: top; }
    th { background: #8f332b; color: #ffffff; font-weight: 700; }
    td.number { mso-number-format: "0.00"; text-align: right; }
    td.empty { color: #7a6b60; text-align: center; }
  </style>
</head>
<body>
  <h1>Makrana - Reporte</h1>
  ${sections.map(excelSection).join("")}
</body>
</html>`;
}

function excelSection(section: { title: string; headers: string[]; rows: any[][] }) {
  const body =
    section.rows.length > 0
      ? section.rows.map((row) => `<tr>${row.map(excelCell).join("")}</tr>`).join("")
      : `<tr><td class="empty" colspan="${section.headers.length}">Sin registros</td></tr>`;
  return `<h2>${escapeHtml(section.title)}</h2>
<table>
  <thead><tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
  <tbody>${body}</tbody>
</table>`;
}

function excelCell(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<td class="number">${value.toFixed(2)}</td>`;
  }
  return `<td>${escapeHtml(value)}</td>`;
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
