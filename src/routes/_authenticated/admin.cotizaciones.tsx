import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, formatDate, moneyPEN } from "@/components/admin-ui";
import { adminGetSale, adminListSales } from "@/lib/admin-sales.functions";
import { ReceiptPreviewDialog } from "@/components/admin/receipt-documents";
import { buildQuotationReceipt } from "@/lib/quotation-receipts";
import { getSaleCustomerDisplayName } from "@/lib/sale-notes";

export const Route = createFileRoute("/_authenticated/admin/cotizaciones")({
  component: QuotationsPage,
});

function QuotationsPage() {
  const listSales = useServerFn(adminListSales);
  const getSale = useServerFn(adminGetSale);
  const [rows, setRows] = useState<any[]>([]);
  const [activeQuotation, setActiveQuotation] = useState<any>(null);

  useEffect(() => {
    void listSales().then(setRows);
  }, [listSales]);

  async function viewQuotation(saleId: string) {
    try {
      const sale = await getSale({ data: { id: saleId } });
      setActiveQuotation(buildQuotationReceipt(sale));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Cotización"
        description="Genera y descarga cotizaciones con el mismo formato de la nota de venta."
        actions={
          <Button asChild variant="hero" size="lg" className="w-full rounded-full px-6 sm:w-auto">
            <Link to="/admin/ventas">
              <Plus className="h-4 w-4" /> Nueva cotización
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 md:hidden">
        {rows.length === 0 && (
          <div className="rounded-xl border border-sand/60 bg-warm-white px-4 py-8 text-center text-sm text-muted-foreground">
            Sin ventas para cotizar.
          </div>
        )}
        {rows.map((sale) => (
          <QuotationMobileCard key={sale.id} sale={sale} onViewQuotation={viewQuotation} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-sand/60 bg-warm-white md:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[190px] text-center">Cotización</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Sin ventas para cotizar.
                </TableCell>
              </TableRow>
            )}
            {rows.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(sale.created_at)}
                </TableCell>
                <TableCell className="font-mono text-xs font-medium">
                  COT-{String(sale.quote_number ?? 0).padStart(8, "0")}
                </TableCell>
                <TableCell>
                  {getSaleCustomerDisplayName(sale, "") || (
                    <span className="text-muted-foreground">— sin cliente —</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">{getCreatorName(sale)}</TableCell>
                <TableCell className="text-xs">{sale.warehouse?.name}</TableCell>
                <TableCell>
                  <SaleStatusBadge status={sale.status} />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{sale.payment_status}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{moneyPEN(sale.total)}</TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Button size="sm" variant="outline" onClick={() => viewQuotation(sale.id)}>
                      <FileText className="h-3.5 w-3.5" /> Cotización
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReceiptPreviewDialog
        receipt={activeQuotation}
        open={!!activeQuotation}
        onOpenChange={(open) => !open && setActiveQuotation(null)}
        initialVariant="quote"
        variantOnly
      />
    </div>
  );
}

function QuotationMobileCard({
  sale,
  onViewQuotation,
}: {
  sale: any;
  onViewQuotation: (saleId: string) => void;
}) {
  return (
    <article className="rounded-xl border border-sand/60 bg-warm-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</p>
          <h2 className="mt-1 truncate text-base font-semibold">
            {getSaleCustomerDisplayName(sale, "Sin cliente")}
          </h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {sale.warehouse?.name ?? "Sin almacén"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Creado por: {getCreatorName(sale)}</p>
        </div>
        <p className="shrink-0 text-lg font-semibold tabular-nums">{moneyPEN(sale.total)}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <SaleStatusBadge status={sale.status} />
        <Badge variant="secondary">{sale.payment_status}</Badge>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-4 h-11 w-full"
        onClick={() => onViewQuotation(sale.id)}
      >
        <Eye className="h-4 w-4" /> Ver cotización
      </Button>
    </article>
  );
}

function getCreatorName(sale: any) {
  return sale.creator?.full_name || sale.creator?.email || "No registrado";
}

function SaleStatusBadge({ status }: { status?: string }) {
  return (
    <Badge
      variant={
        status === "confirmada" ? "default" : status === "anulada" ? "destructive" : "outline"
      }
    >
      {status ?? "borrador"}
    </Badge>
  );
}
