import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Eye } from "lucide-react";
import { PageHeader, moneyPEN, formatDate } from "@/components/admin-ui";
import { adminListReceipts, adminGetReceipt } from "@/lib/admin-sales.functions";

export const Route = createFileRoute("/_authenticated/admin/comprobantes")({ component: ReceiptsPage });

function ReceiptsPage() {
  const list = useServerFn(adminListReceipts);
  const getOne = useServerFn(adminGetReceipt);
  const [rows, setRows] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);

  useEffect(() => { list().then(setRows); /* eslint-disable-line */ }, []);
  async function view(id: string) { const r = await getOne({ data: { id } }); setActive(r); }

  return (
    <div>
      <PageHeader title="Comprobantes" description="Notas de venta internas con numeración correlativa (no fiscal). Se generan al confirmar una venta." />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Almacén</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin comprobantes emitidos aún.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono font-medium">{r.number}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(r.issued_at)}</TableCell>
                <TableCell>{r.sale?.customer?.full_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.sale?.warehouse?.name}</TableCell>
                <TableCell className="text-right tabular-nums">{moneyPEN(r.sale?.total)}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => view(r.id)}><Eye className="h-4 w-4" /> Ver</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-none">
          <DialogHeader><DialogTitle className="font-display sr-only">Comprobante</DialogTitle></DialogHeader>
          {active && <ReceiptDoc r={active} />}
          <div className="flex justify-end gap-2 print:hidden mt-4">
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReceiptDoc({ r }: { r: any }) {
  const s = r.sale;
  return (
    <article className="bg-warm-white text-foreground p-6 font-sans" id="receipt-print">
      <header className="border-b border-sand pb-4 mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-terracotta">Makrana Home Art</h1>
          <p className="text-xs text-muted-foreground">Arte textil hecho a mano · Lima, Perú</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Comprobante interno</div>
          <div className="font-mono text-xl font-bold">{r.number}</div>
          <div className="text-xs text-muted-foreground">{formatDate(r.issued_at)}</div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Cliente</div>
          <div className="font-medium">{s.customer?.full_name ?? "Cliente no registrado"}</div>
          <div className="text-xs text-muted-foreground">{s.customer?.email}{s.customer?.phone ? ` · ${s.customer.phone}` : ""}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Almacén / canal</div>
          <div>{s.warehouse?.name}</div>
          {s.notes && <div className="text-xs text-muted-foreground">{s.notes}</div>}
        </div>
      </section>

      <table className="w-full text-sm border-collapse">
        <thead><tr className="border-y border-sand"><th className="text-left py-2">Detalle</th><th className="text-right py-2">Cant.</th><th className="text-right py-2">P. Unit</th><th className="text-right py-2">Subtotal</th></tr></thead>
        <tbody>
          {s.items.map((it: any) => (
            <tr key={it.id} className="border-b border-sand/40">
              <td className="py-2">{it.product?.name}{it.description ? ` — ${it.description}` : ""}</td>
              <td className="text-right tabular-nums">{Number(it.quantity).toFixed(2)}</td>
              <td className="text-right tabular-nums">{moneyPEN(it.unit_price)}</td>
              <td className="text-right tabular-nums">{moneyPEN(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-medium">
          <tr><td colSpan={3} className="text-right py-1">Subtotal</td><td className="text-right tabular-nums">{moneyPEN(s.subtotal)}</td></tr>
          <tr><td colSpan={3} className="text-right py-1">Descuento</td><td className="text-right tabular-nums">− {moneyPEN(s.discount)}</td></tr>
          <tr className="border-t border-sand text-lg"><td colSpan={3} className="text-right py-2 font-display">TOTAL</td><td className="text-right tabular-nums font-display">{moneyPEN(s.total)}</td></tr>
        </tfoot>
      </table>

      {(s.payments ?? []).length > 0 && (
        <section className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Pagos</div>
          <ul className="text-sm">
            {s.payments.map((p: any) => <li key={p.id}>{p.method.toUpperCase()} · {moneyPEN(p.amount)} {p.operation_code && `· op. ${p.operation_code}`}</li>)}
          </ul>
        </section>
      )}

      <footer className="mt-8 pt-4 border-t border-sand text-xs text-muted-foreground text-center">
        Gracias por apoyar el arte hecho a mano. Este documento es un comprobante interno no fiscal de Makrana Home Art.
      </footer>

      <style>{`@media print { body * { visibility: hidden; } #receipt-print, #receipt-print * { visibility: visible; } #receipt-print { position: absolute; inset: 0; padding: 24px; } }`}</style>
    </article>
  );
}
