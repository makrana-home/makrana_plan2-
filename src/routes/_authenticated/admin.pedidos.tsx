import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, moneyPEN, formatDate } from "@/components/admin-ui";
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
import { adminListOrders } from "@/lib/commerce.functions";
export const Route = createFileRoute("/_authenticated/admin/pedidos")({ component: Page });
function Page() {
  const fn = useServerFn(adminListOrders);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fn().then(setRows);
  }, [fn]);
  return (
    <div>
      <PageHeader
        title="Pedidos web"
        description="Pedidos creados por el checkout antes y después de la confirmación del pago."
      />
      <div className="overflow-x-auto rounded-xl border border-sand bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.code}</TableCell>
                <TableCell>
                  {row.first_name} {row.last_name}
                  <div className="text-xs text-muted-foreground">{row.email}</div>
                </TableCell>
                <TableCell>{formatDate(row.created_at)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge>{row.payments?.[0]?.status ?? "—"}</Badge>
                </TableCell>
                <TableCell className="text-right">{moneyPEN(row.total)}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/admin/pedidos/$orderId" params={{ orderId: row.id }}>
                      Ver
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No hay pedidos web todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
