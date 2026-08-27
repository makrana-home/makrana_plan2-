import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, Layers3, Package, Search } from "lucide-react";
import { PageHeader, formatDate, moneyPEN } from "@/components/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListOrders } from "@/lib/commerce.functions";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({ component: Page });

function Page() {
  return <WebOrdersView showHeader />;
}

export function WebOrdersView({ showHeader = false }: { showHeader?: boolean }) {
  const listOrders = useServerFn(adminListOrders);
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void listOrders().then(setRows);
  }, [listOrders]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.code, row.first_name, row.last_name, row.email]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(needle)),
    );
  }, [query, rows]);
  const paid = rows.filter((row) => row.payments?.[0]?.status === "approved").length;
  const physical = rows.filter((row) => hasPhysicalItems(row)).length;

  return (
    <div>
      {showHeader && (
        <PageHeader
          title="Ventas de la web"
          description="Pedidos físicos, cursos y compras mixtas creados desde el checkout de Makrana."
        />
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Pedidos web" value={rows.length} />
        <Metric label="Pagos aprobados" value={paid} />
        <Metric label="Con entrega física" value={physical} />
      </div>
      <label className="relative mb-4 block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por pedido, cliente o correo"
          className="pl-10"
          aria-label="Buscar ventas de la web"
        />
      </label>
      <div className="grid gap-3 md:hidden">
        {filteredRows.map((row) => (
          <Card key={row.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{row.code}</p>
                  <p className="text-sm">
                    {row.first_name} {row.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(row.created_at)}</p>
                </div>
                <PurchaseKindBadge row={row} />
              </div>
              <OrderSummary row={row} />
              <div className="flex items-center justify-between">
                <strong>{moneyPEN(row.total)}</strong>
                <OrderLink id={row.id} />
              </div>
            </CardContent>
          </Card>
        ))}
        {!filteredRows.length && <EmptyState hasRows={rows.length > 0} />}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-sand bg-warm-white md:block">
        <Table className="min-w-[1280px]">
          <TableHeader>
            <TableRow>
              <TableHead>Pedido / fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo de compra</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Documento solicitado</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Entrega física</TableHead>
              <TableHead>Acceso digital</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="font-mono text-xs">{row.code}</span>
                  <div className="text-xs text-muted-foreground">{formatDate(row.created_at)}</div>
                </TableCell>
                <TableCell>
                  {row.first_name} {row.last_name}
                  <div className="text-xs text-muted-foreground">{row.email}</div>
                </TableCell>
                <TableCell>
                  <PurchaseKindBadge row={row} />
                </TableCell>
                <TableCell className="max-w-[250px]">
                  <OrderItems row={row} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{paymentLabel(row.payments?.[0]?.status)}</Badge>
                </TableCell>
                <TableCell>
                  {row.receipt_type === "invoice" ? "Factura electrónica" : "Boleta electrónica"}
                </TableCell>
                <TableCell>
                  {row.sale?.tax_document?.[0]?.status ? (
                    <Badge variant="outline">{row.sale.tax_document[0].status}</Badge>
                  ) : (
                    <span className="text-muted-foreground">No emitido</span>
                  )}
                </TableCell>
                <TableCell>
                  {hasPhysicalItems(row)
                    ? (row.delivery_method_snapshot ?? "Por coordinar")
                    : "No aplica"}
                </TableCell>
                <TableCell>
                  {hasDigitalItems(row) ? digitalAccessLabel(row) : "No aplica"}
                </TableCell>
                <TableCell className="text-right font-semibold">{moneyPEN(row.total)}</TableCell>
                <TableCell>
                  <OrderLink id={row.id} />
                </TableCell>
              </TableRow>
            ))}
            {!filteredRows.length && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  {rows.length
                    ? "No hay resultados para esta búsqueda."
                    : "No hay ventas web todavía."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-sand bg-warm-white p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
function EmptyState({ hasRows }: { hasRows: boolean }) {
  return (
    <div className="rounded-xl border border-sand bg-warm-white p-8 text-center text-sm text-muted-foreground">
      {hasRows ? "No hay resultados para esta búsqueda." : "No hay ventas web todavía."}
    </div>
  );
}
function OrderLink({ id }: { id: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link to="/admin/pedidos/$orderId" params={{ orderId: id }}>
        Ver detalle
      </Link>
    </Button>
  );
}
function OrderItems({ row }: { row: any }) {
  const items = row.items ?? [];
  if (!items.length) return <span className="text-muted-foreground">Sin detalle disponible</span>;
  return (
    <span className="text-sm">
      {items
        .slice(0, 2)
        .map((item: any) => `${item.quantity} × ${item.name_snapshot}`)
        .join(" · ")}
      {items.length > 2 ? ` · +${items.length - 2}` : ""}
    </span>
  );
}
function OrderSummary({ row }: { row: any }) {
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <OrderItems row={row} />
      <p>
        Pago: {paymentLabel(row.payments?.[0]?.status)} · Documento:{" "}
        {row.receipt_type === "invoice" ? "Factura" : "Boleta"}
      </p>
      <p>
        {hasPhysicalItems(row)
          ? `Entrega: ${row.delivery_method_snapshot ?? "por coordinar"}`
          : "Entrega física: no aplica"}{" "}
        ·{" "}
        {hasDigitalItems(row) ? `Acceso: ${digitalAccessLabel(row)}` : "Acceso digital: no aplica"}
      </p>
    </div>
  );
}
function PurchaseKindBadge({ row }: { row: any }) {
  const kind = getPurchaseKind(row);
  const config =
    kind === "mixed"
      ? ["Pedido mixto", Layers3]
      : kind === "digital"
        ? ["Curso digital", GraduationCap]
        : kind === "kit"
          ? ["Curso con kit", Package]
          : ["Producto físico", Package];
  const Icon = config[1] as typeof Package;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {config[0] as string}
    </Badge>
  );
}
function hasDigitalItems(row: any) {
  return (row.items ?? []).some((item: any) => ["course", "workshop"].includes(item.item_type));
}
function hasPhysicalItems(row: any) {
  return (row.items ?? []).some(
    (item: any) =>
      item.requires_inventory !== false && !["course", "workshop"].includes(item.item_type),
  );
}
function getPurchaseKind(row: any): "physical" | "digital" | "kit" | "mixed" {
  const digital = hasDigitalItems(row),
    physical = hasPhysicalItems(row);
  if (digital && physical) return "mixed";
  if (digital && (row.items ?? []).some((item: any) => item.kit_mode || item.item_type === "kit"))
    return "kit";
  return digital ? "digital" : "physical";
}
function digitalAccessLabel(row: any) {
  if (!row.sale?.id) return "Pendiente del pago";
  return row.sale.status === "confirmada" ? "Solicitud preparada" : "Pendiente";
}
function paymentLabel(status?: string | null) {
  return (
    (
      {
        approved: "Aprobado",
        pending: "Pendiente",
        under_review: "En revisión",
        rejected: "Rechazado",
        cancelled: "Cancelado",
        expired: "Vencido",
      } as Record<string, string>
    )[status ?? ""] ??
    status ??
    "Sin pago"
  );
}
