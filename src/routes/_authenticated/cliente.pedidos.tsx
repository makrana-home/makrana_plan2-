import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { moneyPEN, formatDate } from "@/components/admin-ui";
import { clientGetProfile } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/cliente/pedidos")({ component: Pedidos });

function Pedidos() {
  const fn = useServerFn(clientGetProfile);
  const [d, setD] = useState<any>(null);
  useEffect(() => { fn().then(setD); /* eslint-disable-line */ }, []);
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Mis pedidos</h1>
      <div className="mt-6 border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Detalle</TableHead><TableHead>Estado</TableHead><TableHead>Entrega</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Comprobante</TableHead></TableRow></TableHeader>
          <TableBody>
            {(d?.sales ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aún no tienes pedidos.</TableCell></TableRow>}
            {(d?.sales ?? []).map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="text-xs text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                <TableCell className="text-sm">{(s.items ?? []).map((it: any) => `${it.product?.name} ×${Number(it.quantity).toFixed(0)}`).join(", ")}</TableCell>
                <TableCell><Badge variant={s.status === "confirmada" ? "default" : "outline"}>{s.status}</Badge></TableCell>
                <TableCell><Badge variant="outline">{s.delivery_status}</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{moneyPEN(s.total)}</TableCell>
                <TableCell>{s.receipt?.[0] ? <Link to="/cliente/comprobantes" className="text-accent underline text-xs">{s.receipt[0].number}</Link> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
