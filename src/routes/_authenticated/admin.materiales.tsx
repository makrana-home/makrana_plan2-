import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, Eye, ImageIcon, PackagePlus, Plus, Trash2 } from "lucide-react";
import {
  PageHeader,
  FormDialog,
  NewButton,
  useDialog,
  slugify,
  moneyPEN,
} from "@/components/admin-ui";
import {
  ProductDetailDialog,
  ProductFormFields,
  StockByWarehouseFields,
  StockMovementDialog,
} from "./admin.productos";
import {
  adminListProducts,
  adminGetProduct,
  adminUpsertProduct,
  adminDeleteProduct,
  adminListCategories,
  adminListWarehouses,
  adminListStock,
  adminApplyMovement,
  adminUpsertPresentation,
  adminDeletePresentation,
} from "@/lib/admin.functions";
import { formatUnits } from "@/lib/format-units";
import {
  getPresentationUnitLabel,
  getUnitsInPresentation,
  PRESENTATION_UNIT_OPTIONS,
} from "@/lib/presentation-units";
import { generateNextProductSku, generatePresentationSku } from "@/lib/sku";

export const Route = createFileRoute("/_authenticated/admin/materiales")({
  component: MaterialsPage,
});

const hiddenMaterialCategoryNames = [
  "Habitación",
  "Sala",
  "Terraza",
  "Carteras",
  "Accesorios",
  "Comedor",
];

function normalizeCategoryName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getMaterialCategoryOptions(cats: any[]) {
  return cats.filter((category) => {
    if (category?.description === "scope:piece") return false;
    if (category?.description === "scope:material") return true;
    const normalized = normalizeCategoryName(category?.name ?? "");
    return !hiddenMaterialCategoryNames.some((name) => normalizeCategoryName(name) === normalized);
  });
}

function MaterialsPage() {
  const list = useServerFn(adminListProducts);
  const getOne = useServerFn(adminGetProduct);
  const upsert = useServerFn(adminUpsertProduct);
  const del = useServerFn(adminDeleteProduct);
  const listCats = useServerFn(adminListCategories);
  const listWarehouses = useServerFn(adminListWarehouses);
  const listStock = useServerFn(adminListStock);
  const applyMovement = useServerFn(adminApplyMovement);
  const upsertPres = useServerFn(adminUpsertPresentation);
  const delPres = useServerFn(adminDeletePresentation);

  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [tableStock, setTableStock] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const detailDlg = useDialog<any>();
  const movementDlg = useDialog<any>();
  const [saving, setSaving] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [movementForm, setMovementForm] = useState<any>(blankMovement());
  const [pres, setPres] = useState<any[]>([]);
  const [stockByWarehouse, setStockByWarehouse] = useState<Record<string, string>>({});
  const [initialStockByWarehouse, setInitialStockByWarehouse] = useState<Record<string, string>>(
    {},
  );
  const [presentationStockByKey, setPresentationStockByKey] = useState<
    Record<string, Record<string, string>>
  >({});
  const [initialPresentationStockByKey, setInitialPresentationStockByKey] = useState<
    Record<string, Record<string, string>>
  >({});
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("_all");
  const materialCategoryOptions = getMaterialCategoryOptions(cats);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.name?.toLowerCase().includes(q) ||
        row.sku?.toLowerCase().includes(q) ||
        row.category?.name?.toLowerCase().includes(q) ||
        row.supplier?.toLowerCase().includes(q) ||
        row.presentations?.some(
          (presentation: any) =>
            presentation.sku?.toLowerCase().includes(q) ||
            presentation.unit?.toLowerCase().includes(q) ||
            presentation.label?.toLowerCase().includes(q) ||
            getPresentationUnitLabel(presentation.unit, presentation.label)
              .toLowerCase()
              .includes(q),
        );
      const matchesCategory = categoryFilter === "_all" || row.category?.id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [rows, searchTerm, categoryFilter]);

  async function refresh() {
    const [items, stockRows] = await Promise.all([
      list({ data: { type: "material" } }),
      listStock({ data: {} }),
    ]);
    setRows(items);
    setTableStock(stockRows);
  }
  useEffect(() => {
    refresh();
    listCats().then(setCats); /* eslint-disable-line */
    listWarehouses().then(setWarehouses); /* eslint-disable-line */
  }, []);

  function openNew() {
    setForm({ ...blank(), sku: generateNextProductSku(rows, "material") });
    setPres([]);
    setStockByWarehouse({});
    setInitialStockByWarehouse({});
    setPresentationStockByKey({});
    setInitialPresentationStockByKey({});
    dlg.openWith(null);
  }
  function openMovement(row: any, movementType: "entrada" | "transferencia", presentation?: any) {
    const presentations = (row.presentations ?? []).filter((item: any) => !item._deleted);
    const presentationName = presentation
      ? getPresentationUnitLabel(presentation.unit, presentation.label)
      : "";
    setMovementForm({
      ...blankMovement(),
      movement_type: movementType,
      product_id: row.id,
      product_name: row.name,
      presentation_id: presentation?.id ?? null,
      presentation_name: presentationName,
      presentations,
      reason: movementType === "entrada" ? "Entrada de material" : "Transferencia entre almacenes",
    });
    movementDlg.openWith(row);
  }
  async function openEdit(row: any) {
    const [full, stockRows] = await Promise.all([
      getOne({ data: { id: row.id } }),
      listStock({ data: {} }),
    ]);
    const nextStock: Record<string, string> = {};
    const nextPresentationStock: Record<string, Record<string, string>> = {};
    stockRows
      .filter((item: any) => item.product?.id === row.id)
      .forEach((item: any) => {
        const warehouseId = item.warehouse?.id;
        if (!warehouseId) return;
        const presentationId = getStockPresentationId(item);
        if (presentationId) {
          const key = presentationStockKey({ id: presentationId });
          nextPresentationStock[key] = {
            ...(nextPresentationStock[key] ?? {}),
            [warehouseId]: formatStockInput(item.quantity),
          };
        } else {
          nextStock[warehouseId] = formatStockInput(item.quantity);
        }
      });
    setForm({ ...blank(), ...full, sku: full?.sku || generateNextProductSku(rows, "material") });
    setStockByWarehouse(nextStock);
    setInitialStockByWarehouse(nextStock);
    setPresentationStockByKey(nextPresentationStock);
    setInitialPresentationStockByKey(nextPresentationStock);
    setPres(full?.presentations ?? []);
    dlg.openWith(full);
  }
  async function openDetail(row: any) {
    const full = await getOne({ data: { id: row.id } });
    detailDlg.openWith(full);
  }
  async function editFromDetail(row: any) {
    try {
      await openEdit(row);
      detailDlg.close();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo abrir la edición");
    }
  }
  async function saveWarehouseStock(
    productId: string,
    presentationId: string | null,
    values: Record<string, string>,
    initialValues: Record<string, string>,
  ) {
    const changes = warehouses
      .map((warehouse: any) => {
        const raw = values[warehouse.id];
        const initial = initialValues[warehouse.id] ?? "";
        const quantity = raw === "" || raw == null ? null : Number(raw);
        return { warehouse, raw, initial, quantity };
      })
      .filter(
        ({ raw, initial, quantity }) =>
          raw !== initial &&
          raw !== "" &&
          raw != null &&
          Number.isFinite(quantity) &&
          (quantity ?? Number.NaN) >= 0,
      );

    for (const change of changes) {
      if (change.quantity == null) continue;
      await applyMovement({
        data: {
          product_id: productId,
          presentation_id: presentationId,
          movement_type: "ajuste",
          quantity: change.quantity,
          warehouse_id: change.warehouse.id,
          warehouse_dest_id: null,
          reason: "Ajuste desde ficha de pieza/material",
          notes: null,
        },
      });
    }
  }
  async function onDelete(row: any) {
    if (!confirm(`¿Eliminar "${row.name}"?`)) return;
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
      const existingSlug = slugify(form.slug ?? "");
      const generatedSlug = existingSlug.length >= 2 ? existingSlug : slugify(form.name);
      if (generatedSlug.length < 2) {
        toast.error("El nombre debe tener al menos 2 caracteres para crear la URL interna.");
        return;
      }
      const activePresentations = pres.filter((presentation) => !presentation._deleted);
      const payload = {
        ...form,
        type: "material",
        slug: generatedSlug,
        price: activePresentations.length > 0 ? 0 : form.price,
        cost: activePresentations.length > 0 ? null : form.cost,
        category_id: materialCategoryOptions.some((category) => category.id === form.category_id)
          ? form.category_id
          : null,
      };
      for (const k of [
        "sku",
        "short_description",
        "description",
        "main_image_url",
        "measurements",
        "color",
        "material",
        "artisan",
        "supplier",
        "internal_notes",
      ])
        if (payload[k] === "") payload[k] = null;
      const saved = await upsert({ data: payload });
      if (activePresentations.length === 0) {
        await saveWarehouseStock(saved.id, null, stockByWarehouse, initialStockByWarehouse);
      }
      const presentationSkuHistory = activePresentations
        .filter((presentation: any) => presentation.sku)
        .map((presentation: any) => ({ sku: presentation.sku }));
      for (const p of pres) {
        if (p._deleted) {
          if (p.id) await delPres({ data: { id: p.id } });
          continue;
        }
        const stockKey = presentationStockKey(p);
        const presentationSku = p.sku || generatePresentationSku(form.sku, presentationSkuHistory);
        presentationSkuHistory.push({ sku: presentationSku });
        const savedPresentation = await upsertPres({
          data: {
            ...p,
            sku: presentationSku,
            product_id: saved.id,
            label: p.unit === "otro" ? p.label || "otro" : p.unit,
            units_in_presentation: getUnitsInPresentation(p.unit, p.units_in_presentation),
          },
        });
        await saveWarehouseStock(
          saved.id,
          savedPresentation.id,
          presentationStockByKey[stockKey] ?? {},
          initialPresentationStockByKey[stockKey] ?? {},
        );
      }
      toast.success("Guardado");
      dlg.close();
      refresh();
    } catch (e: any) {
      toast.error(formatSaveError(e));
    } finally {
      setSaving(false);
    }
  }
  async function onMovementSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingMovement(true);
    try {
      if (
        movementForm.movement_type === "transferencia" &&
        movementForm.warehouse_id === movementForm.warehouse_dest_id
      ) {
        toast.error("El almacén origen y destino deben ser diferentes.");
        return;
      }
      await applyMovement({
        data: {
          product_id: movementForm.product_id,
          presentation_id: movementForm.presentation_id || null,
          movement_type: movementForm.movement_type,
          quantity: Number(movementForm.quantity),
          warehouse_id: movementForm.warehouse_id,
          warehouse_dest_id:
            movementForm.movement_type === "transferencia" ? movementForm.warehouse_dest_id : null,
          reason: movementForm.reason || null,
          notes: movementForm.notes || null,
        },
      });
      toast.success(
        movementForm.movement_type === "transferencia"
          ? "Transferencia registrada"
          : "Entrada registrada",
      );
      movementDlg.close();
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo registrar el movimiento");
    } finally {
      setSavingMovement(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Materiales"
        description="Hilos, accesorios y bases para macramé. Cada material puede tener varias presentaciones (unidad, metro, rollo, docena...)."
        eyebrow="Inventario"
        actions={<NewButton onClick={openNew} label="Nuevo material" />}
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-[minmax(0,360px)_minmax(220px,280px)]">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar material..."
          className="h-12 rounded-2xl border-sand/80 bg-warm-white/75 px-5 text-base shadow-md shadow-clay/10 focus-visible:border-accent focus-visible:ring-accent/20"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-12 rounded-2xl border-sand/80 bg-warm-white/75 px-5 text-base shadow-md shadow-clay/10 focus-visible:border-accent focus-visible:ring-accent/20">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las categorías</SelectItem>
            {materialCategoryOptions.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-sand/80 bg-warm-white/75 shadow-sm">
        <Table className="min-w-[1320px]">
          <TableHeader className="bg-cream/75">
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="text-right">Stock mínimo</TableHead>
              <TableHead className="text-right">Cantidad total</TableHead>
              <TableHead className="text-right">SA</TableHead>
              <TableHead className="text-right">PL</TableHead>
              <TableHead className="text-right">FE</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                  Sin materiales con estos filtros.
                </TableCell>
              </TableRow>
            )}
            {filteredRows.map((r) => {
              const stock = getStockSummary(r.id, tableStock, warehouses);
              const presentations = (r.presentations ?? []).filter((p: any) => !p._deleted);
              const hasPresentations = presentations.length > 0;
              const baseStock = getStockSummary(r.id, tableStock, warehouses, null);
              const hasBaseStock = hasPresentations && baseStock.total > 0;
              return (
                <Fragment key={r.id}>
                  <TableRow>
                    <TableCell className="text-muted-foreground">{r.sku ?? "—"}</TableCell>
                    <TableCell>
                      <ProductThumb product={r} />
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground/75 tabular-nums">
                      {hasPresentations ? "—" : moneyPEN(r.cost ?? 0)}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {hasPresentations ? "—" : moneyPEN(r.price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(r.min_stock ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(stock.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(stock.sa)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(stock.pl)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(stock.feria)}
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDetail(r)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(r)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => openMovement(r, "transferencia")}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          Mover
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => openMovement(r, "entrada")}
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          Entrada
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {presentations.map((presentation: any) => {
                    const presentationStock = getStockSummary(
                      r.id,
                      tableStock,
                      warehouses,
                      presentation.id,
                    );
                    return (
                      <TableRow
                        key={presentation.id ?? `${r.id}-${presentation.unit}`}
                        className="bg-cream/35"
                      >
                        <TableCell className="pl-10 font-mono text-xs text-muted-foreground">
                          {presentation.sku || "—"}
                        </TableCell>
                        <TableCell />
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="h-px w-5 bg-sand" />
                            <span className="font-medium capitalize">
                              {getPresentationUnitLabel(presentation.unit, presentation.label)}
                            </span>
                            <span className="text-xs text-muted-foreground">Presentación</span>
                          </div>
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-muted-foreground/75 tabular-nums">
                          {presentation.cost == null ? "—" : moneyPEN(presentation.cost)}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {moneyPEN(presentation.price ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(r.min_stock ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(presentationStock.total)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(presentationStock.sa)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(presentationStock.pl)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(presentationStock.feria)}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => openMovement(r, "transferencia", presentation)}
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              Mover
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => openMovement(r, "entrada", presentation)}
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                              Entrada
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {hasBaseStock && (
                    <TableRow className="bg-cream/20">
                      <TableCell className="pl-10 font-mono text-xs text-muted-foreground">
                        {r.sku || "—"}
                      </TableCell>
                      <TableCell />
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="h-px w-5 bg-sand" />
                          <span className="font-medium">Stock general sin presentación</span>
                        </div>
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-muted-foreground/75 tabular-nums">—</TableCell>
                      <TableCell className="text-muted-foreground/75 tabular-nums">—</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(r.min_stock ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(baseStock.total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(baseStock.sa)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(baseStock.pl)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(baseStock.feria)}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => openMovement(r, "transferencia")}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Mover
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => openMovement(r, "entrada")}
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            Entrada
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={dlg.open}
        onOpenChange={dlg.setOpen}
        title={dlg.data ? "Detalle de material" : "Nuevo material"}
        onSubmit={onSubmit}
        submitting={saving}
      >
        <ProductFormFields
          form={form}
          setForm={setForm}
          cats={cats}
          setCats={setCats}
          warehouses={warehouses}
          stockByWarehouse={stockByWarehouse}
          setStockByWarehouse={setStockByWarehouse}
          hideCommercialFields={pres.some((presentation) => !presentation._deleted)}
          hideStockFields={pres.some((presentation) => !presentation._deleted)}
          allowKit={false}
        />
        <div className="border-t border-sand/60 pt-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Presentaciones</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setPres((p) => [
                  ...p,
                  {
                    _clientKey: newPresentationKey(),
                    unit: "unidad",
                    sku: generatePresentationSku(
                      form.sku,
                      p.filter((presentation: any) => !presentation._deleted),
                    ),
                    label: "unidad",
                    cost: null,
                    price: 0,
                    units_in_presentation: getUnitsInPresentation("unidad"),
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Agregar presentación
            </Button>
          </div>
          <div className="space-y-2">
            {pres
              .filter((p) => !p._deleted)
              .map((p, idx) => {
                const stockKey = presentationStockKey(p);
                return (
                  <div
                    key={p.id ?? p._clientKey ?? `n${idx}`}
                    className="rounded-2xl border border-sand/70 p-3"
                  >
                    <div className="grid gap-2 md:grid-cols-12 md:items-end">
                      <div className="md:col-span-3">
                        <Label className="text-xs">SKU</Label>
                        <Input
                          value={p.sku ?? ""}
                          onChange={(e) => updPres(setPres, idx, "sku", e.target.value)}
                          placeholder="MAT-001-12"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs">Unidad</Label>
                        <Select
                          value={p.unit}
                          onValueChange={(v) => {
                            updPresFields(setPres, idx, {
                              unit: v,
                              label: v === "otro" ? "" : v,
                              units_in_presentation: getUnitsInPresentation(v),
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRESENTATION_UNIT_OPTIONS.filter((unit) => unit.value !== "otro").map(
                              (unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ),
                            )}
                            <SelectItem value="otro">Agregar nueva unidad</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {p.unit === "otro" && (
                        <div className="md:col-span-3">
                          <Label className="text-xs">Nueva unidad</Label>
                          <Input
                            value={p.label ?? ""}
                            onChange={(e) => updPres(setPres, idx, "label", e.target.value)}
                            placeholder="Ej. tira, sachet, aro..."
                          />
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <Label className="text-xs">Costo (S/)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={p.cost ?? ""}
                          onChange={(e) => updPres(setPres, idx, "cost", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Precio (S/)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={p.price ?? 0}
                          onChange={(e) => updPres(setPres, idx, "price", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-12 flex justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => updPres(setPres, idx, "_deleted", true)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <StockByWarehouseFields
                        warehouses={warehouses}
                        values={presentationStockByKey[stockKey] ?? {}}
                        onChange={(warehouseId, value) =>
                          setPresentationStockByKey((current) => ({
                            ...current,
                            [stockKey]: {
                              ...(current[stockKey] ?? {}),
                              [warehouseId]: value,
                            },
                          }))
                        }
                        title="Almacén de la presentación"
                        description="Selecciona la cantidad disponible por almacén para este material."
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            {pres.filter((p) => !p._deleted).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sin presentaciones — los clientes verán el precio base.
              </p>
            )}
          </div>
        </div>
      </FormDialog>
      <ProductDetailDialog
        open={detailDlg.open}
        onOpenChange={detailDlg.setOpen}
        product={detailDlg.data}
        warehouses={warehouses}
        stockRows={tableStock}
        onEdit={() => detailDlg.data && editFromDetail(detailDlg.data)}
      />
      <StockMovementDialog
        open={movementDlg.open}
        onOpenChange={movementDlg.setOpen}
        form={movementForm}
        setForm={setMovementForm}
        warehouses={warehouses}
        onSubmit={onMovementSubmit}
        submitting={savingMovement}
      />
    </div>
  );
}

function blankMovement() {
  return {
    movement_type: "entrada",
    product_id: "",
    product_name: "",
    presentation_id: null,
    presentation_name: "",
    presentations: [],
    warehouse_id: "",
    warehouse_dest_id: "",
    quantity: 1,
    reason: "",
    notes: "",
  };
}

function updPres(setPres: any, idx: number, k: string, v: any) {
  setPres((arr: any[]) => arr.map((x, i) => (i === idx ? { ...x, [k]: v } : x)));
}

function updPresFields(setPres: any, idx: number, fields: Record<string, any>) {
  setPres((arr: any[]) => arr.map((x, i) => (i === idx ? { ...x, ...fields } : x)));
}

function ProductThumb({ product }: { product: any }) {
  if (product.main_image_url) {
    return (
      <img
        src={product.main_image_url}
        alt={product.name}
        className="h-14 w-14 rounded-xl object-cover shadow-sm"
        loading="lazy"
      />
    );
  }
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cream text-brand-terracotta/60">
      <ImageIcon className="h-5 w-5" />
    </span>
  );
}

function PriceCost({ price, cost }: { price: number | string; cost?: number | string | null }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-medium tabular-nums">{moneyPEN(price)}</span>
      <span className="text-xs font-medium text-muted-foreground/70 tabular-nums">
        Costo {moneyPEN(cost ?? 0)}
      </span>
    </div>
  );
}

function getStockSummary(
  productId: string,
  stockRows: any[],
  warehouses: any[],
  presentationId?: string | null,
) {
  const matches = stockRows.filter((item) => {
    if (item.product?.id !== productId) return false;
    if (presentationId === undefined) return true;
    return getStockPresentationId(item) === presentationId;
  });
  const qtyFor = (kind: "sa" | "pl" | "feria") => {
    const warehouse = warehouses.find((item) => isWarehouseKind(item, kind));
    if (!warehouse) return 0;
    return matches
      .filter((item) => item.warehouse?.id === warehouse.id)
      .reduce((total, item) => total + Number(item.quantity ?? 0), 0);
  };
  return {
    total: matches.reduce((total, item) => total + Number(item.quantity ?? 0), 0),
    sa: qtyFor("sa"),
    pl: qtyFor("pl"),
    feria: qtyFor("feria"),
  };
}

function getStockPresentationId(item: any) {
  return item.presentation?.id ?? item.presentation_id ?? null;
}

function presentationStockKey(presentation: any) {
  return presentation?.id ? `id:${presentation.id}` : `new:${presentation?._clientKey}`;
}

function newPresentationKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isWarehouseKind(warehouse: any, kind: "sa" | "pl" | "feria") {
  const code = normalizeCategoryName(String(warehouse?.code ?? ""));
  const name = normalizeCategoryName(String(warehouse?.name ?? ""));
  if (kind === "sa") return code === "sa" || name.includes("santa anita");
  if (kind === "pl") return code === "pl" || name.includes("pueblo libre");
  return code.includes("feria") || name.includes("feria");
}

const formatQuantity = formatUnits;

function formatStockInput(value: any) {
  return formatUnits(value);
}

function formatSaveError(error: any) {
  const message = String(error?.message ?? "");
  if (message.includes('"path":["slug"]') || message.toLowerCase().includes("slug")) {
    return "El nombre debe tener al menos 2 caracteres para crear la URL interna.";
  }
  return message || "No se pudo guardar";
}

function blank() {
  return {
    type: "material",
    sku: "",
    slug: "",
    name: "",
    short_description: "",
    description: "",
    category_id: "",
    main_image_url: "",
    price: 0,
    cost: 0,
    status: "disponible",
    measurements: "",
    color: "",
    material: "",
    artisan: "",
    supplier: "",
    min_stock: 0,
    is_visible: true,
    is_featured: false,
    internal_notes: "",
  } as any;
}
