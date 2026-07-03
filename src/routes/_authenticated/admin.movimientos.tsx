import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { formatUnits } from "@/lib/format-units";
import { getPresentationUnitLabel } from "@/lib/presentation-units";

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
    item_type: "producto_terminado",
    product_option: "",
    product_search: "",
    product_id: "",
    presentation_id: null,
    presentation_note: "",
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
  const filteredProducts = useMemo(() => {
    const q = normalizeSearch(form.product_search ?? "");
    return buildMovementItemOptions(products, form.item_type).filter((option) => {
      const searchable = normalizeSearch(option.searchText);
      return !q || searchable.includes(q);
    });
  }, [form.item_type, form.product_search, products]);

  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, []);

  function openNew() {
    setForm({
      movement_type: "entrada",
      item_type: "producto_terminado",
      product_option: "",
      product_search: "",
      product_id: "",
      presentation_id: null,
      presentation_note: "",
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
      if (form.movement_type === "transferencia" && form.warehouse_id === form.warehouse_dest_id) {
        toast.error("El almacén origen y destino deben ser diferentes.");
        return;
      }
      const notes = [form.presentation_note, form.notes].filter(Boolean).join("\n") || null;
      await apply({
        data: {
          product_id: form.product_id,
          presentation_id: form.presentation_id || null,
          movement_type: form.movement_type,
          quantity: Number(form.quantity),
          warehouse_id: form.warehouse_id,
          warehouse_dest_id: form.movement_type === "transferencia" ? form.warehouse_dest_id : null,
          reason: form.reason || null,
          notes,
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
        actions={<NewButton onClick={openNew} label="Nueva entrada" />}
      />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ítem</TableHead>
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
            {movs.map((m) => {
              const presentationLabel = getMovementPresentationLabel(m);
              return (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(m.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={badgeVariant(m.movement_type)}
                      className={
                        m.movement_type === "venta"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : undefined
                      }
                    >
                      {m.movement_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.product?.name}
                    {presentationLabel && (
                      <div className="text-xs font-medium text-muted-foreground">
                        {presentationLabel}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{m.warehouse?.code}</TableCell>
                  <TableCell className="text-xs">{m.warehouse_dest?.code ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUnits(m.quantity)}
                  </TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground max-w-[240px] truncate"
                    title={m.reason}
                  >
                    {m.reason ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={dlg.open}
        onOpenChange={dlg.setOpen}
        title={form.movement_type === "transferencia" ? "Transferir stock" : "Nuevo movimiento"}
        description={
          form.movement_type === "transferencia"
            ? "Elige el ítem, cuántas unidades quieres transferir, el almacén origen y el almacén destino."
            : "Registra una entrada, salida, devolución o ajuste de inventario."
        }
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
            <Label>Seleccionar pieza o material *</Label>
            <Select
              value={form.item_type}
              onValueChange={(v) =>
                setForm((f: any) => ({
                  ...f,
                  item_type: v,
                  product_option: "",
                  product_id: "",
                  presentation_id: null,
                  presentation_note: "",
                  product_search: "",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="producto_terminado">Piezas</SelectItem>
                <SelectItem value="material">Materiales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Buscar por nombre, SKU o presentación</Label>
            <Input
              value={form.product_search}
              onChange={(e) => setForm((f: any) => ({ ...f, product_search: e.target.value }))}
              placeholder="Escribe nombre o SKU..."
            />
          </div>
          <div>
            <Label>Ítem o presentación *</Label>
            <Select
              value={form.product_option}
              onValueChange={(value) => {
                const option = filteredProducts.find((entry) => entry.value === value);
                if (!option) return;
                setForm((f: any) => ({
                  ...f,
                  product_option: option.value,
                  product_id: option.product_id,
                  presentation_id: option.presentation_id ?? null,
                  presentation_note: option.presentationNote,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ítem" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredProducts.map((p) => (
                  <SelectItem key={p.value} value={p.value} textValue={p.label}>
                    <span className="flex flex-col gap-0.5">
                      <span>{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.sku || "Sin SKU"}</span>
                    </span>
                  </SelectItem>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Sin resultados para esa búsqueda.
                  </div>
                )}
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
            <Label>
              {form.movement_type === "transferencia"
                ? "Cantidad de unidades a transferir *"
                : "Cantidad *"}
            </Label>
            <Input
              type="number"
              min="1"
              step="1"
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

function buildMovementItemOptions(products: any[], itemType: string) {
  return products.flatMap((product) => {
    const matchesType =
      itemType === "material" ? product.type === "material" : product.type !== "material";
    if (!matchesType) return [];

    const presentations =
      product.type === "material" ? (product.presentations ?? []).filter(Boolean) : [];

    if (presentations.length > 0) {
      return presentations.map((presentation: any, index: number) => {
        const presentationLabel = getPresentationUnitLabel(presentation.unit, presentation.label);
        const sku = presentation.sku || product.sku || "";
        return {
          value: `presentation:${product.id}:${presentation.id ?? sku ?? index}`,
          product_id: product.id,
          presentation_id: presentation.id ?? null,
          label: `${product.name} - ${presentationLabel}`,
          sku,
          presentationNote: `Presentación: ${presentationLabel}${sku ? ` · SKU ${sku}` : ""}`,
          searchText: `${product.name ?? ""} ${product.sku ?? ""} ${sku} ${
            presentation.unit ?? ""
          } ${presentation.label ?? ""} ${presentationLabel}`,
        };
      });
    }

    return [
      {
        value: `product:${product.id}`,
        product_id: product.id,
        presentation_id: null,
        label: product.name ?? "Ítem",
        sku: product.sku ?? "",
        presentationNote: "",
        searchText: `${product.name ?? ""} ${product.sku ?? ""}`,
      },
    ];
  });
}

function getMovementPresentationLabel(movement: any) {
  if (movement.presentation) {
    return getPresentationUnitLabel(movement.presentation.unit, movement.presentation.label);
  }
  const line = String(movement.notes ?? "")
    .split(/\r?\n/)
    .find((entry) => entry.trim().toLowerCase().startsWith("presentaci"));
  if (!line) return "";
  return line.split(":").slice(1).join(":").split("·")[0]?.trim() ?? "";
}

function badgeVariant(t: string): any {
  if (t === "entrada" || t === "devolucion") return "default";
  if (t === "salida") return "destructive";
  if (t === "venta") return "outline";
  if (t === "transferencia") return "secondary";
  return "outline";
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
