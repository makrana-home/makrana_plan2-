import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  adminGetCommerceSettings,
  adminUpdateCommerceSettings,
  adminUpdateDeliveryMethod,
  adminUpsertDeliveryZone,
} from "@/lib/commerce.functions";
export const Route = createFileRoute("/_authenticated/admin/configuracion/comercio")({
  component: Page,
});
function Page() {
  const get = useServerFn(adminGetCommerceSettings),
    save = useServerFn(adminUpdateCommerceSettings),
    saveMethod = useServerFn(adminUpdateDeliveryMethod),
    saveZone = useServerFn(adminUpsertDeliveryZone);
  const [data, setData] = useState<any>(null),
    [form, setForm] = useState<any>(null),
    [newZone, setNewZone] = useState({ code: "", name: "", districts: "", base_fee: 10 });
  useEffect(() => {
    get().then((value) => {
      setData(value);
      setForm(value.settings);
    });
  }, [get]);
  if (!form) return <p>Cargando…</p>;
  const update = (key: string, value: any) =>
    setForm((current: any) => ({ ...current, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save({
        data: {
          reservation_minutes: Number(form.reservation_minutes),
          order_expiration_minutes: Number(form.order_expiration_minutes),
          default_web_warehouse_id: form.default_web_warehouse_id || null,
          pickup_enabled: Boolean(form.pickup_enabled),
          lima_delivery_enabled: Boolean(form.lima_delivery_enabled),
          izipay_easypay_public_url: form.izipay_easypay_public_url ?? "",
          pickup_instructions: form.pickup_instructions ?? "",
          pending_payment_message: form.pending_payment_message,
          whatsapp_coordination_enabled: Boolean(form.whatsapp_coordination_enabled),
          whatsapp_coordination_number: form.whatsapp_coordination_number ?? "",
          whatsapp_coordination_message: form.whatsapp_coordination_message,
          whatsapp_service_instructions: form.whatsapp_service_instructions ?? "",
          whatsapp_service_hours: form.whatsapp_service_hours ?? "",
        },
      });
      toast.success("Configuración comercial actualizada");
    } catch (error: any) {
      toast.error(error.message);
    }
  }
  return (
    <div>
      <PageHeader
        title="Configuración de comercio"
        description="Reservas, almacén web, entrega y modo manual de Easy Pay."
      />
      <form onSubmit={submit}>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Checkout web</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label="Reserva (minutos)">
              <Input
                type="number"
                min={5}
                max={1440}
                value={form.reservation_minutes}
                onChange={(e) => update("reservation_minutes", e.target.value)}
              />
            </Field>
            <Field label="Expiración del pedido (minutos)">
              <Input
                type="number"
                min={5}
                max={10080}
                value={form.order_expiration_minutes}
                onChange={(e) => update("order_expiration_minutes", e.target.value)}
              />
            </Field>
            <Field label="Almacén web">
              <Select
                value={form.default_web_warehouse_id ?? "none"}
                onValueChange={(value) =>
                  update("default_web_warehouse_id", value === "none" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin configurar</SelectItem>
                  {data.warehouses.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · {item.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Enlace público EasyPay (modo manual)">
              <Input
                type="url"
                placeholder="https://..."
                value={form.izipay_easypay_public_url ?? ""}
                onChange={(e) => update("izipay_easypay_public_url", e.target.value)}
              />
            </Field>
            <Toggle
              label="Recojo coordinado"
              checked={form.pickup_enabled}
              change={(value) => update("pickup_enabled", value)}
            />
            <Toggle
              label="Coordinación por WhatsApp"
              checked={form.whatsapp_coordination_enabled}
              change={(value) => update("whatsapp_coordination_enabled", value)}
            />
            <Field label="Número de WhatsApp">
              <Input
                value={form.whatsapp_coordination_number ?? ""}
                onChange={(e) => update("whatsapp_coordination_number", e.target.value)}
                placeholder="51999999999"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Mensaje de coordinación">
                <Textarea
                  value={form.whatsapp_coordination_message ?? ""}
                  onChange={(e) => update("whatsapp_coordination_message", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Horario de atención">
              <Input
                value={form.whatsapp_service_hours ?? ""}
                onChange={(e) => update("whatsapp_service_hours", e.target.value)}
              />
            </Field>
            <Field label="Instrucciones de atención">
              <Input
                value={form.whatsapp_service_instructions ?? ""}
                onChange={(e) => update("whatsapp_service_instructions", e.target.value)}
              />
            </Field>
            <Toggle
              label="Envío en Lima"
              checked={form.lima_delivery_enabled}
              change={(value) => update("lima_delivery_enabled", value)}
            />
            <div className="sm:col-span-2">
              <Field label="Instrucciones de recojo">
                <Textarea
                  value={form.pickup_instructions ?? ""}
                  onChange={(e) => update("pickup_instructions", e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Mensaje de pago pendiente">
                <Textarea
                  required
                  value={form.pending_payment_message}
                  onChange={(e) => update("pending_payment_message", e.target.value)}
                />
              </Field>
            </div>
            <Button className="sm:col-span-2">Guardar configuración</Button>
          </CardContent>
        </Card>
        <Card className="mt-6 max-w-3xl">
          <CardHeader>
            <CardTitle>Zonas y tarifas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-2">
              <Field label="Nueva zona">
                <Input
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                />
              </Field>
              <Field label="Código">
                <Input
                  value={newZone.code}
                  onChange={(e) => setNewZone({ ...newZone, code: e.target.value })}
                />
              </Field>
              <Field label="Tarifa S/">
                <Input
                  type="number"
                  min="10"
                  step="0.01"
                  value={newZone.base_fee}
                  onChange={(e) => setNewZone({ ...newZone, base_fee: Number(e.target.value) })}
                />
              </Field>
              <Field label="Distritos">
                <Input
                  value={newZone.districts}
                  onChange={(e) => setNewZone({ ...newZone, districts: e.target.value })}
                  placeholder="Distrito 1, Distrito 2"
                />
              </Field>
              <Button
                type="button"
                onClick={async () => {
                  await saveZone({
                    data: {
                      code: newZone.code,
                      name: newZone.name,
                      districts: newZone.districts
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                      base_fee: newZone.base_fee,
                      is_active: true,
                      sort_order: data.zones.length,
                      estimated_time: "",
                      notes: "",
                      requires_coordination: false,
                    },
                  });
                  toast.success("Zona creada");
                  const value = await get();
                  setData(value);
                  setForm(value.settings);
                  setNewZone({ code: "", name: "", districts: "", base_fee: 10 });
                }}
              >
                Crear zona
              </Button>
            </div>
            {data.zones.map((zone: any) => (
              <div key={zone.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
                <Field label="Zona">
                  <Input id={`zone-name-${zone.id}`} defaultValue={zone.name} />
                </Field>
                <Field label="Tarifa S/ (mínimo 10)">
                  <Input
                    id={`zone-fee-${zone.id}`}
                    type="number"
                    min="10"
                    step="0.01"
                    defaultValue={zone.base_fee}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Distritos (separados por coma)">
                    <Textarea
                      id={`zone-districts-${zone.id}`}
                      defaultValue={(zone.district_rows ?? [])
                        .filter((row: any) => row.is_active)
                        .map((row: any) => row.district)
                        .join(", ")}
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const name = (
                      document.getElementById(`zone-name-${zone.id}`) as HTMLInputElement
                    ).value;
                    const fee = Number(
                      (document.getElementById(`zone-fee-${zone.id}`) as HTMLInputElement).value,
                    );
                    const districts = (
                      document.getElementById(`zone-districts-${zone.id}`) as HTMLTextAreaElement
                    ).value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean);
                    await saveZone({
                      data: {
                        id: zone.id,
                        code: zone.code,
                        name,
                        districts,
                        base_fee: fee,
                        is_active: zone.is_active,
                        sort_order: zone.sort_order,
                        estimated_time: zone.estimated_time ?? "",
                        notes: zone.notes ?? "",
                        requires_coordination: zone.requires_coordination,
                      },
                    });
                    toast.success("Zona y tarifa actualizadas");
                  }}
                >
                  Guardar zona
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    await saveZone({
                      data: {
                        id: zone.id,
                        code: zone.code,
                        name: zone.name,
                        districts: (zone.district_rows ?? [])
                          .filter((row: any) => row.is_active)
                          .map((row: any) => row.district),
                        base_fee: Number(zone.base_fee),
                        is_active: !zone.is_active,
                        sort_order: zone.sort_order,
                        estimated_time: zone.estimated_time ?? "",
                        notes: zone.notes ?? "",
                        requires_coordination: zone.requires_coordination,
                      },
                    });
                    const value = await get();
                    setData(value);
                    setForm(value.settings);
                  }}
                >
                  {zone.is_active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="mt-6 max-w-3xl">
          <CardHeader>
            <CardTitle>Métodos y tarifas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.methods.map((method: any) => (
              <div
                key={method.id}
                className="grid gap-3 rounded-xl border border-sand p-4 sm:grid-cols-[1fr_140px_auto]"
              >
                <div>
                  <p className="font-medium">{method.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {method.kind === "pickup" ? "Recojo" : "Lima Metropolitana"}
                  </p>
                </div>
                <Field label="Tarifa S/">
                  <Input
                    id={`fee-${method.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={method.fee}
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  className="self-end"
                  onClick={async () => {
                    const input = document.getElementById(`fee-${method.id}`) as HTMLInputElement;
                    await saveMethod({
                      data: {
                        id: method.id,
                        fee: Number(input.value),
                        instructions: method.instructions ?? "",
                        is_active: method.is_active,
                      },
                    });
                    toast.success("Tarifa actualizada");
                  }}
                >
                  Actualizar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Toggle({
  label,
  checked,
  change,
}: {
  label: string;
  checked: boolean;
  change: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border p-4">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={change} />
    </label>
  );
}
