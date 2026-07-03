import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRightLeft, Download, Pencil, Trash2 } from "lucide-react";
import { FormDialog, NewButton, PageHeader, moneyPEN, useDialog } from "@/components/admin-ui";
import {
  adminApplyMovement,
  adminDeleteWarehouse,
  adminListStock,
  adminListWarehouses,
  adminUpsertWarehouse,
} from "@/lib/admin.functions";
import { formatUnits } from "@/lib/format-units";

export const Route = createFileRoute("/_authenticated/admin/almacenes")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const list = useServerFn(adminListWarehouses);
  const upsert = useServerFn(adminUpsertWarehouse);
  const del = useServerFn(adminDeleteWarehouse);
  const listStock = useServerFn(adminListStock);
  const applyMovement = useServerFn(adminApplyMovement);
  const [rows, setRows] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [form, setForm] = useState<any>({ code: "", name: "", address: "", is_active: true });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [selectedStockIds, setSelectedStockIds] = useState<Record<string, boolean>>({});

  const selectedWarehouse = rows.find((warehouse) => warehouse.id === selectedWarehouseId);
  const visibleStock = useMemo(
    () =>
      selectedWarehouseId
        ? stock.filter((item) => item.warehouse?.id === selectedWarehouseId)
        : stock,
    [selectedWarehouseId, stock],
  );
  const selectedStockRows = visibleStock.filter((item) => selectedStockIds[item.id]);
  const allVisibleSelected =
    visibleStock.length > 0 && visibleStock.every((item) => selectedStockIds[item.id]);
  const destinationOptions = rows.filter((warehouse) => warehouse.id !== selectedWarehouseId);

  async function refresh() {
    const [nextRows, nextStock] = await Promise.all([list(), listStock({ data: {} })]);
    setRows(nextRows);
    setStock(nextStock);
    setSelectedWarehouseId((current) => current || nextRows[0]?.id || "");
  }

  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, []);

  function selectWarehouse(id: string) {
    setSelectedWarehouseId(id);
    setSelectedStockIds({});
    setDestinationWarehouseId("");
  }

  function openNew() {
    setForm({ code: "", name: "", address: "", is_active: true });
    dlg.openWith(null);
  }

  function openEdit(row: any) {
    setForm({
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address ?? "",
      is_active: row.is_active,
    });
    dlg.openWith(row);
  }

  async function onDelete(row: any) {
    if (!confirm(`¿Eliminar almacén "${row.name}"?`)) return;
    try {
      await del({ data: { id: row.id } });
      toast.success("Eliminado");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await upsert({ data: { ...form, address: form.address || null } });
      toast.success("Guardado");
      dlg.close();
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleAllVisible(value: boolean) {
    setSelectedStockIds((current) => {
      const next = { ...current };
      for (const item of visibleStock) next[item.id] = value;
      return next;
    });
  }

  function downloadWarehouseStock() {
    if (!selectedWarehouse) {
      toast.error("Selecciona un almacén para descargar su stock.");
      return;
    }
    const html = buildWarehouseStockExcel(selectedWarehouse, visibleStock);
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-${slugFilePart(selectedWarehouse.code || selectedWarehouse.name)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function transferSelectedStock() {
    if (!selectedWarehouseId || !destinationWarehouseId) {
      toast.error("Selecciona el almacén destino.");
      return;
    }
    if (selectedStockRows.length === 0) {
      toast.error("Selecciona al menos un ítem para transferir.");
      return;
    }

    setTransferring(true);
    try {
      for (const item of selectedStockRows) {
        const quantity = Number(item.quantity ?? 0);
        if (!item.product?.id || quantity <= 0) continue;
        await applyMovement({
          data: {
            product_id: item.product.id,
            movement_type: "transferencia",
            quantity,
            warehouse_id: selectedWarehouseId,
            warehouse_dest_id: destinationWarehouseId,
            reason: "Transferencia entre almacenes",
            notes: null,
          },
        });
      }
      toast.success("Transferencia registrada.");
      setSelectedStockIds({});
      setDestinationWarehouseId("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo transferir el stock.");
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Almacenes"
        description="Stock distribuido por ubicación (Taller, Showroom, Depósito, Ferias)."
        actions={<NewButton onClick={openNew} label="Nuevo almacén" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-sand/60 bg-warm-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const selected = selectedWarehouseId === row.id;
                return (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer transition ${selected ? "bg-cream" : ""}`}
                    onClick={() => selectWarehouse(row.id)}
                  >
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.address}</div>
                    </TableCell>
                    <TableCell>
                      {row.is_active ? (
                        <span className="text-xs text-emerald-700">activo</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">inactivo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(row);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(row);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="overflow-hidden rounded-xl border border-sand/60 bg-warm-white">
          <div className="border-b border-sand/60 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg">Stock por almacén</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedWarehouse
                    ? `${selectedWarehouse.code} · ${selectedWarehouse.name}`
                    : "Selecciona un almacén para ver su stock."}
                </p>
              </div>
              {selectedWarehouse && (
                <div className="flex min-w-[260px] flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={downloadWarehouseStock}
                    disabled={visibleStock.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Descargar Excel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => toggleAllVisible(!allVisibleSelected)}
                    disabled={visibleStock.length === 0}
                  >
                    {allVisibleSelected ? "Limpiar selección" : "Seleccionar todo"}
                  </Button>
                  <Select value={destinationWarehouseId} onValueChange={setDestinationWarehouseId}>
                    <SelectTrigger className="h-10 w-[190px] rounded-xl">
                      <SelectValue placeholder="Destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationOptions.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.code
                            ? `${warehouse.code} - ${warehouse.name}`
                            : warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    onClick={transferSelectedStock}
                    disabled={transferring || selectedStockRows.length === 0}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Transferir al almacén
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                      aria-label="Seleccionar todo"
                    />
                  </TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleStock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                      Sin stock registrado en este almacén.
                    </TableCell>
                  </TableRow>
                )}
                {visibleStock.map((item) => {
                  const low =
                    item.product?.min_stock != null &&
                    Number(item.quantity) <= Number(item.product.min_stock);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStockIds[item.id] === true}
                          onCheckedChange={(checked) =>
                            setSelectedStockIds((current) => ({
                              ...current,
                              [item.id]: checked === true,
                            }))
                          }
                          aria-label={`Seleccionar ${item.product?.name ?? "ítem"}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.product?.sku ?? "—"}
                      </TableCell>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {moneyPEN(item.product?.cost ?? 0)}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {moneyPEN(item.product?.price ?? 0)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.warehouse?.name}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${low ? "font-medium text-rose-700" : ""}`}
                      >
                        {formatUnits(item.quantity)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <FormDialog
        open={dlg.open}
        onOpenChange={dlg.setOpen}
        title={dlg.data ? "Editar almacén" : "Nuevo almacén"}
        onSubmit={onSubmit}
        submitting={saving}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Código *</Label>
            <Input
              required
              value={form.code}
              onChange={(e) =>
                setForm((current: any) => ({
                  ...current,
                  code: e.target.value.toUpperCase(),
                }))
              }
              placeholder="TALLER"
            />
          </div>
          <div>
            <Label>Nombre *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((current: any) => ({ ...current, name: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>Dirección</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm((current: any) => ({ ...current, address: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2">
          <Switch
            checked={form.is_active}
            onCheckedChange={(value) =>
              setForm((current: any) => ({ ...current, is_active: value }))
            }
          />{" "}
          Activo
        </label>
      </FormDialog>
    </div>
  );
}

function buildWarehouseStockExcel(warehouse: any, rows: any[]) {
  const generatedAt = new Date().toLocaleString("es-PE");
  const bodyRows = rows
    .map((item) => {
      const low =
        item.product?.min_stock != null && Number(item.quantity) <= Number(item.product.min_stock);
      return `
        <tr>
          <td>${escapeHtml(item.product?.sku ?? "")}</td>
          <td>${escapeHtml(item.product?.name ?? "")}</td>
          <td>${escapeHtml(item.product?.type ?? "")}</td>
          <td>${escapeHtml(warehouse.code ?? "")}</td>
          <td>${escapeHtml(warehouse.name ?? "")}</td>
          <td style="mso-number-format:'0.00';">${Number(item.product?.cost ?? 0).toFixed(2)}</td>
          <td style="mso-number-format:'0.00';">${Number(item.product?.price ?? 0).toFixed(2)}</td>
          <td style="mso-number-format:'0';">${formatUnits(item.quantity)}</td>
          <td style="mso-number-format:'0';">${formatUnits(item.product?.min_stock ?? 0)}</td>
          <td>${low ? "Stock bajo" : "OK"}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th { background: #80342C; color: #ffffff; text-align: left; }
          th, td { border: 1px solid #d9c8b6; padding: 8px; }
          .meta td { border: 0; padding: 3px 0; }
        </style>
      </head>
      <body>
        <h2>Stock por almacén - Makrana Home Art</h2>
        <table class="meta">
          <tr><td><strong>Almacén:</strong> ${escapeHtml(warehouse.code ?? "")} - ${escapeHtml(warehouse.name ?? "")}</td></tr>
          <tr><td><strong>Generado:</strong> ${escapeHtml(generatedAt)}</td></tr>
        </table>
        <br />
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Ítem</th>
              <th>Tipo</th>
              <th>Código almacén</th>
              <th>Almacén</th>
              <th>Costo</th>
              <th>Precio</th>
              <th>Cantidad</th>
              <th>Stock mínimo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${
              bodyRows ||
              '<tr><td colspan="10" style="text-align:center;">Sin stock registrado.</td></tr>'
            }
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugFilePart(value: string) {
  return String(value || "almacen")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
