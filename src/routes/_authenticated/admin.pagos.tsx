import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, moneyPEN } from "@/components/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminListOrders } from "@/lib/commerce.functions";
export const Route = createFileRoute("/_authenticated/admin/pagos")({ component: Page });
function Page() {
  const fn = useServerFn(adminListOrders);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fn().then((data) => setRows(data.filter((row: any) => row.payments?.length)));
  }, [fn]);
  return (
    <div>
      <PageHeader
        title="Pagos web"
        description="Bandeja de pagos manuales de Easy Pay pendientes de validación."
      />
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-44 flex-1">
                <p className="font-mono font-semibold">{row.code}</p>
                <p className="text-sm text-muted-foreground">
                  {row.first_name} {row.last_name}
                </p>
              </div>
              <Badge>{row.payments[0].status}</Badge>
              <strong>{moneyPEN(row.total)}</strong>
              <Button asChild size="sm">
                <Link to="/admin/pedidos/$orderId" params={{ orderId: row.id }}>
                  Revisar
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
