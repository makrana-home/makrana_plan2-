import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader, FormDialog, NewButton, useDialog, formatDate } from "@/components/admin-ui";
import {
  adminListProducts,
  adminListWarehouses,
  adminListMovements,
  adminApplyMovement,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/movimientos")({
  component: MovementsPage,
});

function MovementsPage() {
  const listProducts = useServerFn(adminListProducts);
  const listWarehouses = useServerFn(adminListWarehouses);
  const listMovs = useServerFn(adminListMovements);
  const apply = useServerFn(adminApplyMovement);

  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [movs, setMovs] = useState<any[]>([]);
  const dlg = useDialog();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    movement_type: "entrada",
    product_id: "",
    warehouse_id: "",
    warehouse_dest_id: "",
    quantity: 1,
    reason: "",
    notes: "",
  });

  async function refresh() {
    const [p1, p2, w, m] = await Promise.all([
      listProducts({ data: { type: "producto_terminado" } }),
      listProducts({ data: { type: "material" } }),
      listWarehouses(),
      listMovs({ data: { limit: 200 } }),
    ]);
    setProducts([...p1, ...p2]);
    setWarehouses(w);
    setMovs(m);
  }
  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, []);

  function openNew() {
    setForm({
      movement_type: "entrada",
      product_id: "",
      warehouse_id: "",
      warehouse_dest_id: "",
      quantity: 1,
      reason: "",
      notes: "",
    });
    dlg.openWith(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apply({
        data: {
          product_id: form.product_id,
          movement_type: form.movement_type,
          quantity: Number(form.quantity),
          warehouse_id: form.warehouse_id,
          warehouse_dest_id: form.movement_type === "transferencia" ? form.warehouse_dest_id : null,
          reason: form.reason || null,
          notes: form.notes || null,
        },
      });
      toast.success("Movimiento registrado");
      dlg.close();
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo registrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Movimientos de stock"
        description="Entradas, salidas, transferencias entre almacenes y ajustes manuales."
        actions={<NewButton onClick={openNew} label="Nuevo movimiento" />}
      />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Sin movimientos.
                </TableCell>
              </TableRow>
            )}
            {movs.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(m.created_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={badgeVariant(m.movement_type)}>{m.movement_type}</Badge>
                </TableCell>
                <TableCell>{m.product?.name}</TableCell>
                <TableCell className="text-xs">{m.warehouse?.code}</TableCell>
                <TableCell className="text-xs">{m.warehouse_dest?.code ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(m.quantity).toFixed(2)}
                </TableCell>
                <TableCell
                  className="text-xs text-muted-foreground max-w-[240px] truncate"
                  title={m.reason}
                >
                  {m.reason ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={dlg.open}
        onOpenChange={dlg.setOpen}
        title="Nuevo movimiento"
        onSubmit={onSubmit}
        submitting={saving}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Tipo *</Label>
            <Select
              value={form.movement_type}
              onValueChange={(v) => setForm((f: any) => ({ ...f, movement_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="ajuste">Ajuste (fija cantidad)</SelectItem>
                <SelectItem value="devolucion">Devolución</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Producto *</Label>
            <Select
              value={form.product_id}
              onValueChange={(v) => setForm((f: any) => ({ ...f, product_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.sku && `(${p.sku})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>
              {form.movement_type === "transferencia" ? "Almacén origen *" : "Almacén *"}
            </Label>
            <Select
              value={form.warehouse_id}
              onValueChange={(v) => setForm((f: any) => ({ ...f, warehouse_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.movement_type === "transferencia" && (
            <div>
              <Label>Almacén destino *</Label>
              <Select
                value={form.warehouse_dest_id}
                onValueChange={(v) => setForm((f: any) => ({ ...f, warehouse_dest_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((w) => w.id !== form.warehouse_id)
                    .map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Cantidad *</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={form.quantity}
              onChange={(e) => setForm((f: any) => ({ ...f, quantity: e.target.value }))}
            />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input
              value={form.reason}
              onChange={(e) => setForm((f: any) => ({ ...f, reason: e.target.value }))}
              placeholder="Compra proveedor, ajuste de inventario..."
            />
          </div>
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </FormDialog>
    </div>
  );
}

function badgeVariant(t: string): any {
  if (t === "entrada" || t === "devolucion") return "default";
  if (t === "salida" || t === "venta") return "destructive";
  if (t === "transferencia") return "secondary";
  return "outline";
}
