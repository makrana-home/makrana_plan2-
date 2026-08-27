import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader, moneyPEN } from "@/components/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adminGetOrder,
  adminReviewPayment,
  adminUpdateDeliveryCoordination,
} from "@/lib/commerce.functions";
export const Route = createFileRoute("/_authenticated/admin/pedidos/$orderId")({ component: Page });
function Page() {
  const { orderId } = Route.useParams();
  const get = useServerFn(adminGetOrder),
    review = useServerFn(adminReviewPayment),
    saveCoordination = useServerFn(adminUpdateDeliveryCoordination);
  const [data, setData] = useState<any>(null),
    [reason, setReason] = useState("");
  const refresh = () => get({ data: { id: orderId } }).then(setData);
  useEffect(() => {
    refresh();
  }, [orderId]);
  async function decide(approve: boolean) {
    try {
      await review({ data: { payment_id: data.payments[0].id, approve, reason } });
      toast.success(approve ? "Pago aprobado y venta creada" : "Pago rechazado y reserva liberada");
      await refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  }
  if (!data) return <p>Cargando…</p>;
  const payment = data.payments?.[0];
  const purchaseKind = getPurchaseKind(data.items ?? []);
  const hasPhysical = (data.items ?? []).some((item: any) => item.requires_inventory);
  const hasDigital = (data.items ?? []).some((item: any) =>
    ["course", "workshop"].includes(item.item_type),
  );
  return (
    <div>
      <PageHeader
        title={data.code}
        description={`${data.first_name} ${data.last_name} · ${data.email}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/pedidos">Volver</Link>
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Tipo de compra" value={purchaseKind} />
        <Summary
          label="Documento solicitado"
          value={data.receipt_type === "invoice" ? "Factura electrónica" : "Boleta electrónica"}
        />
        <Summary
          label="Entrega física"
          value={hasPhysical ? (data.delivery_method_snapshot ?? "Por coordinar") : "No aplica"}
        />
        <Summary
          label="Acceso digital"
          value={
            hasDigital
              ? data.sale?.status === "confirmada"
                ? "Solicitud preparada"
                : "Pendiente del pago"
              : "No aplica"
          }
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Pedido <Badge className="ml-2">{data.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.items.map((item: any) => (
              <div className="flex justify-between border-b pb-3" key={item.id}>
                <span>
                  {item.quantity} × {item.name_snapshot}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {itemTypeLabel(item.item_type)}
                  </span>
                </span>
                <span>{moneyPEN(item.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{moneyPEN(data.total)}</span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{data.delivery_method_snapshot}</p>
              <p>
                {data.delivery_zone_name_snapshot ?? "Sin zona"} ·{" "}
                {data.delivery_district_snapshot ?? "Sin distrito"}
              </p>
              <p>Tarifa cobrada: {moneyPEN(data.shipping_total)}</p>
              <p>Teléfono: {data.phone}</p>
              <p>Coordinación: {data.delivery_coordination_status ?? "No aplica"}</p>
            </div>
            {data.coordination?.whatsapp_coordination_enabled &&
              data.coordination.whatsapp_coordination_number &&
              data.delivery_coordination_status && (
                <Button asChild variant="outline">
                  <a
                    target="_blank"
                    rel="noreferrer"
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
                  >
                    Coordinar por WhatsApp
                  </a>
                </Button>
              )}
            {data.delivery_coordination_status && (
              <div className="grid gap-2 border-t pt-3">
                <select
                  id="coord-status"
                  className="h-10 rounded-md border bg-background px-3"
                  defaultValue={data.delivery_coordination_status}
                >
                  {[
                    "pending_coordination",
                    "contacted",
                    "scheduled",
                    "dispatched",
                    "delivered",
                    "pickup_ready",
                    "picked_up",
                    "cancelled",
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <Input
                  id="coord-scheduled"
                  type="datetime-local"
                  defaultValue={data.delivery_scheduled_at?.slice(0, 16) ?? ""}
                />
                <Input
                  id="coord-window"
                  placeholder="Franja horaria"
                  defaultValue={data.delivery_time_window ?? ""}
                />
                <Input
                  id="coord-responsible"
                  placeholder="Persona responsable"
                  defaultValue={data.delivery_responsible ?? ""}
                />
                <Input
                  id="coord-notes"
                  placeholder="Observaciones"
                  defaultValue={data.delivery_notes ?? ""}
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    const value = (id: string) =>
                      (document.getElementById(id) as HTMLInputElement).value;
                    const scheduled = value("coord-scheduled");
                    await saveCoordination({
                      data: {
                        order_id: data.id,
                        status: value("coord-status") as any,
                        scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
                        time_window: value("coord-window"),
                        responsible: value("coord-responsible"),
                        notes: value("coord-notes"),
                      },
                    });
                    toast.success("Coordinación actualizada");
                    await refresh();
                  }}
                >
                  Guardar coordinación
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Revisión del pago <Badge variant="outline">{payment?.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Referencia: <strong>{payment?.reference ?? "Sin registrar"}</strong>
            </p>
            {payment?.evidence_path && (
              <p className="mt-2 text-xs text-muted-foreground">Constancia privada registrada.</p>
            )}
            {["pending", "under_review"].includes(payment?.status) && (
              <>
                <Input
                  className="mt-5"
                  placeholder="Motivo obligatorio de la decisión"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="mt-3 flex gap-3">
                  <Button disabled={reason.trim().length < 3} onClick={() => decide(true)}>
                    Aprobar
                  </Button>
                  <Button
                    disabled={reason.trim().length < 3}
                    variant="destructive"
                    onClick={() => decide(false)}
                  >
                    Rechazar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sand bg-warm-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function getPurchaseKind(items: any[]) {
  const digital = items.some((item) => ["course", "workshop"].includes(item.item_type));
  const physical = items.some((item) => item.requires_inventory);
  if (digital && physical) return "Pedido mixto";
  if (digital && items.some((item) => item.kit_mode || item.item_type === "kit"))
    return "Curso con kit";
  return digital ? "Curso digital" : "Producto físico";
}

function itemTypeLabel(type: string) {
  return (
    (
      {
        product: "Producto",
        material: "Material",
        kit: "Kit",
        course: "Curso",
        workshop: "Taller",
      } as Record<string, string>
    )[type] ?? type
  );
}
