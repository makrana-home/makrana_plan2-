import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader, moneyPEN, formatDate } from "@/components/admin-ui";
import { ReceiptPreviewDialog, type ReceiptVariant } from "@/components/admin/receipt-documents";
import { adminListReceipts, adminGetReceipt } from "@/lib/admin-sales.functions";

export const Route = createFileRoute("/_authenticated/admin/comprobantes")({
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const list = useServerFn(adminListReceipts);
  const getOne = useServerFn(adminGetReceipt);
  const [rows, setRows] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [variant, setVariant] = useState<ReceiptVariant>("internal");

  useEffect(() => {
    void list().then(setRows);
  }, [list]);

  async function view(id: string, nextVariant: ReceiptVariant) {
    const receipt = await getOne({ data: { id } });
    setVariant(nextVariant);
    setActive(receipt);
  }

  return (
    <div>
      <PageHeader
        title="Comprobantes"
        description="Comprobantes internos y notas de venta generados al confirmar una venta."
      />

      <div className="overflow-hidden rounded-xl border border-sand/60 bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[260px] text-center">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Sin comprobantes emitidos aún.
                </TableCell>
              </TableRow>
            )}
            {rows.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell className="font-mono font-medium">{receipt.number}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(receipt.issued_at)}
                </TableCell>
                <TableCell>{receipt.sale?.customer?.full_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{receipt.sale?.warehouse?.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneyPEN(receipt.sale?.total)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => view(receipt.id, "internal")}
                    >
                      <Eye className="h-4 w-4" /> Interno
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => view(receipt.id, "note")}>
                      <Eye className="h-4 w-4" /> Nota de venta
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReceiptPreviewDialog
        receipt={active}
        open={!!active}
        onOpenChange={(open) => !open && setActive(null)}
        initialVariant={variant}
      />
    </div>
  );
}
