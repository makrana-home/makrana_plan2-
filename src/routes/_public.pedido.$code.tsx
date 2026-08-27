import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrderStatus } from "@/lib/commerce.functions";
export const Route = createFileRoute("/_public/pedido/$code")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  component: OrderStatus,
});
const labels: any = {
  pending_payment: "Pendiente de pago",
  payment_under_review: "Esperando verificación",
  paid: "Pago confirmado",
  payment_failed: "Pago rechazado",
  expired: "Pedido vencido",
  cancelled: "Cancelado",
};
function OrderStatus() {
  const { code } = Route.useParams();
  const { token: queryToken } = Route.useSearch();
  const fn = useServerFn(getOrderStatus);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  const token = queryToken || sessionStorage.getItem(`makrana:order:${code}`) || "";
  useEffect(() => {
    if (token)
      fn({ data: { code, access_token: token } })
        .then(setData)
        .catch((reason) => setError(reason.message));
    else setError("Este enlace no incluye el acceso seguro al pedido.");
  }, [code, fn, token]);
  return (
    <section className="bg-cream/45 px-4 py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl">Estado de tu pedido</h1>
        {error && <p className="mt-6 text-destructive">{error}</p>}
        {data && (
          <Card className="mt-7">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="font-mono">{data.code}</CardTitle>
                <Badge>{labels[data.status] ?? data.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between gap-4 border-b pb-3 text-sm">
                    <span>
                      {item.quantity} × {item.name_snapshot}
                    </span>
                    <span>S/ {Number(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>S/ {Number(data.total).toFixed(2)}</span>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                {data.delivery_method?.name} · {data.delivery_method?.instructions}
              </p>
              {data.coordination?.whatsapp_coordination_enabled &&
                data.coordination.whatsapp_coordination_number &&
                data.delivery_coordination_status && (
                  <Button asChild className="mt-5 w-full sm:w-auto">
                    <a
                      href={`https://wa.me/${String(data.coordination.whatsapp_coordination_number).replace(/\D/g, "")}?text=${encodeURIComponent(
                        String(data.coordination.whatsapp_coordination_message)
                          .replace("[CODIGO]", data.code)
                          .replace("[NOMBRE]", data.first_name)
                          .replace(
                            "[ENTREGA]",
                            data.delivery_district_snapshot
                              ? `envío a ${data.delivery_district_snapshot}`
                              : data.delivery_method_snapshot,
                          ),
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Coordinar entrega por WhatsApp
                    </a>
                  </Button>
                )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
