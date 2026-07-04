import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Eye, ImageIcon, PackagePlus, Pencil, Trash2, Upload } from "lucide-react";
import {
  PageHeader,
  FormDialog,
  NewButton,
  useDialog,
  slugify,
  moneyPEN,
} from "@/components/admin-ui";
import {
  adminListProducts,
  adminGetProduct,
  adminUpsertProduct,
  adminDeleteProduct,
  adminListCategories,
  adminCreateCategory,
  adminListWarehouses,
  adminListStock,
  adminApplyMovement,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatUnits } from "@/lib/format-units";
import { getPresentationUnitLabel } from "@/lib/presentation-units";
import { generateNextProductSku, getProductSkuPrefix } from "@/lib/sku";

export const Route = createFileRoute("/_authenticated/admin/productos")({
  component: ProductsPage,
});

function ProductsPage() {
  return <ProductTypeManager type="producto_terminado" title="Piezas" description="" allowKit />;
}

export function ProductTypeManager({
  type,
  title,
  description,
  allowKit = false,
}: {
  type: "producto_terminado" | "material";
  title: string;
  description: string;
  allowKit?: boolean;
}) {
  const list = useServerFn(adminListProducts);
  const upsert = useServerFn(adminUpsertProduct);
  const del = useServerFn(adminDeleteProduct);
  const getOne = useServerFn(adminGetProduct);
  const listCats = useServerFn(adminListCategories);
  const listWarehouses = useServerFn(adminListWarehouses);
  const listStock = useServerFn(adminListStock);
  const applyMovement = useServerFn(adminApplyMovement);
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [tableStock, setTableStock] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const detailDlg = useDialog<any>();
  const movementDlg = useDialog<any>();
  const [saving, setSaving] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [form, setForm] = useState<any>(blank(type));
  const [movementForm, setMovementForm] = useState<any>(blankMovement());
  const [stockByWarehouse, setStockByWarehouse] = useState<Record<string, string>>({});
  const [initialStockByWarehouse, setInitialStockByWarehouse] = useState<Record<string, string>>(
    {},
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("_all");
  const categoryOptions = getCategoryOptionsForType(cats, type);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.name?.toLowerCase().includes(q) ||
        row.sku?.toLowerCase().includes(q) ||
        row.category?.name?.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "_all" || row.category?.id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [rows, searchTerm, categoryFilter]);

  async function refresh() {
    const types = allowKit ? ["producto_terminado", "kit"] : [type];
    const out: any[] = [];
    for (const t of types) {
      const r = await list({ data: { type: t as any } });
      out.push(...r);
    }
    setRows(out);
    const stockRows = await listStock({ data: {} });
    setTableStock(stockRows);
  }
  useEffect(() => {
    refresh();
    listCats().then(setCats); /* eslint-disable-line */
    listWarehouses().then(setWarehouses); /* eslint-disable-line */
  }, []);

  function openNew() {
    setForm({ ...blank(type), sku: generateNextProductSku(rows, type) });
    setStockByWarehouse({});
    setInitialStockByWarehouse({});
    dlg.openWith(null);
  }
  function openMovement(row: any, movementType: "entrada" | "transferencia") {
    setMovementForm({
      ...blankMovement(),
      movement_type: movementType,
      product_id: row.id,
      product_name: row.name,
      presentations: (row.presentations ?? []).filter(Boolean),
      reason:
        movementType === "entrada"
          ? `Entrada de ${type === "material" ? "material" : "pieza"}`
          : "Transferencia entre almacenes",
    });
    movementDlg.openWith(row);
  }
  async function openEdit(row: any) {
    const [full, stockRows] = await Promise.all([
      getOne({ data: { id: row.id } }),
      listStock({ data: {} }),
    ]);
    const nextStock: Record<string, string> = {};
    stockRows
      .filter((item: any) => item.product?.id === row.id && !getStockPresentationId(item))
      .forEach((item: any) => {
        nextStock[item.warehouse?.id] = formatStockInput(item.quantity);
      });
    setForm({
      ...blank(type),
      ...full,
      sku: full?.sku || generateNextProductSku(rows, full?.type ?? type),
    });
    setStockByWarehouse(nextStock);
    setInitialStockByWarehouse(nextStock);
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
  async function saveWarehouseStock(productId: string) {
    const changes = warehouses
      .map((warehouse: any) => {
        const raw = stockByWarehouse[warehouse.id];
        const initial = initialStockByWarehouse[warehouse.id] ?? "";
        return {
          warehouse,
          raw,
          initial,
          quantity: raw === "" || raw == null ? null : Number(raw),
        };
      })
      .filter(
        ({ raw, initial, quantity }) =>
          raw !== initial &&
          raw !== "" &&
          raw != null &&
          Number.isFinite(quantity) &&
          quantity! >= 0,
      );

    for (const change of changes) {
      await applyMovement({
        data: {
          product_id: productId,
          movement_type: "ajuste",
          quantity: change.quantity!,
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
      toast.error(e.message ?? "Error al eliminar");
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
      const payload = {
        ...form,
        slug: generatedSlug,
        category_id: form.category_id || null,
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
      await saveWarehouseStock(saved.id);
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
        title={title}
        description={description}
        eyebrow="Inventario"
        actions={
          <NewButton
            onClick={openNew}
            label={`Nueva ${type === "material" ? "material" : "pieza"}`}
          />
        }
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-[minmax(0,360px)_minmax(220px,280px)]">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar pieza..."
          className="h-12 rounded-2xl border-sand/80 bg-warm-white/75 px-5 text-base shadow-md shadow-clay/10 focus-visible:border-accent focus-visible:ring-accent/20"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-12 rounded-2xl border-sand/80 bg-warm-white/75 px-5 text-base shadow-md shadow-clay/10 focus-visible:border-accent focus-visible:ring-accent/20">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las categorías</SelectItem>
            {categoryOptions.map((c: any) => (
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
                <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                  Sin piezas con estos filtros.
                </TableCell>
              </TableRow>
            )}
            {filteredRows.map((r) => {
              const stock = getStockSummary(r.id, tableStock, warehouses);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{r.sku ?? "—"}</TableCell>
                  <TableCell>
                    <ProductThumb product={r} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.name}{" "}
                    {r.type === "kit" && (
                      <Badge variant="outline" className="ml-2">
                        Kit
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground/75 tabular-nums">
                    {moneyPEN(r.cost ?? 0)}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{moneyPEN(r.price)}</TableCell>
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
                    <StatusBadge status={r.status} visible={r.is_visible} />
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
              );
            })}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={dlg.open}
        onOpenChange={dlg.setOpen}
        title={dlg.data ? "Detalle de pieza" : "Nueva pieza"}
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
          allowKit={allowKit}
        />
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

function blank(type: "producto_terminado" | "material") {
  return {
    type,
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

function StatusBadge({ status, visible }: { status: string; visible: boolean }) {
  const map: Record<string, string> = {
    disponible: "bg-emerald-100 text-emerald-800",
    por_encargo: "bg-amber-100 text-amber-800",
    agotado: "bg-rose-100 text-rose-800",
    reservado: "bg-sky-100 text-sky-800",
  };
  return (
    <div className="flex gap-1">
      <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] ?? "bg-muted"}`}>
        {status}
      </span>
      {!visible && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          oculto
        </span>
      )}
    </div>
  );
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
    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cream text-accent/60">
      <ImageIcon className="h-5 w-5" />
    </span>
  );
}

export function StockMovementDialog({
  open,
  onOpenChange,
  form,
  setForm,
  warehouses,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: any;
  setForm: (updater: any) => void;
  warehouses: any[];
  onSubmit: (event: React.FormEvent) => void;
  submitting?: boolean;
}) {
  const isTransfer = form.movement_type === "transferencia";
  const title = isTransfer ? "Mover entre almacenes" : "Registrar entrada";
  const submitLabel = isTransfer ? "Mover stock" : "Registrar entrada";
  const presentationOptions = Array.isArray(form.presentations)
    ? form.presentations.filter(Boolean)
    : [];
  const registeredWarehouses = useMemo(
    () =>
      [...warehouses].sort((a: any, b: any) => {
        const activeSort = Number(b.is_active ?? true) - Number(a.is_active ?? true);
        if (activeSort !== 0) return activeSort;
        return String(a.code ?? a.name ?? "").localeCompare(String(b.code ?? b.name ?? ""));
      }),
    [warehouses],
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={form.product_name ? `Ítem: ${form.product_name}` : undefined}
      onSubmit={onSubmit}
      submitting={submitting}
      submitLabel={submitLabel}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {presentationOptions.length > 0 && (
          <div className="sm:col-span-2">
            <Label>Presentación *</Label>
            <Select
              value={form.presentation_id || "_base"}
              onValueChange={(value) => {
                const presentation =
                  value === "_base"
                    ? null
                    : presentationOptions.find((item: any) => item.id === value);
                setForm((current: any) => ({
                  ...current,
                  presentation_id: value === "_base" ? null : value,
                  presentation_name: presentation
                    ? getPresentationUnitLabel(presentation.unit, presentation.label)
                    : "",
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona presentación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_base">Stock general sin presentación</SelectItem>
                {presentationOptions.map((presentation: any) => (
                  <SelectItem key={presentation.id} value={presentation.id}>
                    {getPresentationUnitLabel(presentation.unit, presentation.label)}
                    {presentation.sku ? ` · ${presentation.sku}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>{isTransfer ? "Almacén origen *" : "Almacén *"}</Label>
          <Select
            value={form.warehouse_id}
            onValueChange={(value) =>
              setForm((current: any) => ({ ...current, warehouse_id: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona almacén" />
            </SelectTrigger>
            <SelectContent>
              {registeredWarehouses.map((warehouse: any) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.code ? `${warehouse.code} - ${warehouse.name}` : warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isTransfer && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {registeredWarehouses.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Primero registra almacenes en el módulo Almacenes.
                </span>
              ) : (
                registeredWarehouses.map((warehouse: any) => (
                  <span
                    key={warehouse.id}
                    className="rounded-full border border-sand/70 bg-cream/70 px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {warehouse.code ? `${warehouse.code} · ${warehouse.name}` : warehouse.name}
                  </span>
                ))
              )}
            </div>
          )}
        </div>
        {isTransfer && (
          <div>
            <Label>Almacén destino *</Label>
            <Select
              value={form.warehouse_dest_id}
              onValueChange={(value) =>
                setForm((current: any) => ({ ...current, warehouse_dest_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona destino" />
              </SelectTrigger>
              <SelectContent>
                {registeredWarehouses
                  .filter((warehouse: any) => warehouse.id !== form.warehouse_id)
                  .map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.code ? `${warehouse.code} - ${warehouse.name}` : warehouse.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Cantidad de unidades *</Label>
          <Input
            type="number"
            min="1"
            step="1"
            required
            value={form.quantity}
            onChange={(event) =>
              setForm((current: any) => ({ ...current, quantity: event.target.value }))
            }
          />
        </div>
        <div>
          <Label>Motivo</Label>
          <Input
            value={form.reason ?? ""}
            onChange={(event) =>
              setForm((current: any) => ({ ...current, reason: event.target.value }))
            }
            placeholder={
              isTransfer ? "Reposición entre sedes" : "Compra, producción, devolución..."
            }
          />
        </div>
      </div>
      <div>
        <Label>Notas</Label>
        <Textarea
          rows={2}
          value={form.notes ?? ""}
          onChange={(event) =>
            setForm((current: any) => ({ ...current, notes: event.target.value }))
          }
          placeholder="Detalle opcional para revisar luego en Movimientos."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Este registro actualizará el stock y aparecerá en el historial del módulo Movimientos.
      </p>
    </FormDialog>
  );
}

export function ProductDetailDialog({
  open,
  onOpenChange,
  product,
  warehouses,
  stockRows,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  warehouses: any[];
  stockRows: any[];
  onEdit: () => void;
}) {
  if (!product) return null;
  const itemStock = stockRows.filter((item) => item.product?.id === product.id);
  const presentationRows =
    product.type === "material" ? (product.presentations ?? []).filter(Boolean) : [];
  const hasPresentationRows = presentationRows.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-4xl overflow-y-auto"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-8 font-display">
            <span>{product.type === "material" ? "Detalle de material" : "Detalle de pieza"}</span>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-3xl border border-sand/80 bg-cream/35 p-5">
          <div className="grid gap-6 md:grid-cols-[180px_1fr]">
            <div>
              {product.main_image_url ? (
                <img
                  src={product.main_image_url}
                  alt={product.name}
                  className="aspect-square w-full rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-warm-white text-accent/60">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-accent">
                  {product.type === "material" ? "Material" : "Pieza"}
                </div>
                <h2 className="mt-1 font-display text-3xl">{product.name}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">SKU: {product.sku || "Sin SKU"}</Badge>
                  <Badge variant="outline">{product.category?.name ?? "Sin categoría"}</Badge>
                  <Badge>{product.status}</Badge>
                  {!product.is_visible && <Badge variant="outline">Oculto en web</Badge>}
                  {product.is_featured && <Badge variant="outline">Destacado</Badge>}
                </div>
              </div>

              <div
                className={`grid gap-3 ${hasPresentationRows ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}
              >
                {!hasPresentationRows && (
                  <>
                    <DetailBox label="Costo" value={moneyPEN(product.cost ?? 0)} muted />
                    <DetailBox label="Precio" value={moneyPEN(product.price ?? 0)} />
                  </>
                )}
                <DetailBox label="Stock mínimo" value={formatUnits(product.min_stock ?? 0)} />
                <DetailBox label="Tipo" value={product.type ?? "—"} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <DetailBox label="Medidas" value={product.measurements || "—"} />
                <DetailBox label="Color" value={product.color || "—"} />
                <DetailBox label="Material principal" value={product.material || "—"} />
              </div>

              {product.type === "material" && (
                <DetailBox label="Proveedor" value={product.supplier || "—"} />
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoSection title="Descripción corta" text={product.short_description || "—"} />
            <InfoSection title="Notas internas" text={product.internal_notes || "—"} />
            <InfoSection
              title="Descripción"
              text={product.description || "—"}
              className="md:col-span-2"
            />
          </div>

          {hasPresentationRows && (
            <div className="mt-6 rounded-2xl border border-sand/70 bg-warm-white p-4">
              <h3 className="font-display text-lg">Presentaciones</h3>
              <div className="mt-3 grid gap-3">
                {presentationRows.map((presentation: any) => (
                  <div
                    key={presentation.id}
                    className="rounded-xl border border-sand/60 p-3 text-sm"
                  >
                    <div className="grid gap-3 sm:grid-cols-5">
                      <DetailBox label="SKU" value={presentation.sku || "Sin SKU"} muted />
                      <DetailBox
                        label="Presentación"
                        value={getPresentationUnitLabel(presentation.unit, presentation.label)}
                      />
                      <DetailBox
                        label="Costo"
                        value={presentation.cost == null ? "—" : moneyPEN(presentation.cost)}
                        muted
                      />
                      <DetailBox label="Precio" value={moneyPEN(presentation.price ?? 0)} />
                      <DetailBox label="Stock mínimo" value={formatUnits(product.min_stock ?? 0)} />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {warehouses.map((warehouse) => {
                        const qty = itemStock
                          .filter(
                            (item) =>
                              item.warehouse?.id === warehouse.id &&
                              getStockPresentationId(item) === presentation.id,
                          )
                          .reduce((total, item) => total + Number(item.quantity ?? 0), 0);
                        return (
                          <div key={warehouse.id} className="rounded-lg border border-sand/60 p-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {warehouse.code}
                            </div>
                            <div className="truncate text-xs font-medium">{warehouse.name}</div>
                            <div className="mt-1 text-lg tabular-nums">{formatUnits(qty)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasPresentationRows && (
            <div className="mt-6 rounded-2xl border border-sand/70 bg-warm-white p-4">
              <h3 className="font-display text-lg">Stock por almacén</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {warehouses.map((warehouse) => {
                  const qty = itemStock
                    .filter(
                      (item) =>
                        item.warehouse?.id === warehouse.id && !getStockPresentationId(item),
                    )
                    .reduce((total, item) => total + Number(item.quantity ?? 0), 0);
                  return (
                    <div key={warehouse.id} className="rounded-xl border border-sand/60 p-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {warehouse.code}
                      </div>
                      <div className="truncate text-sm font-medium">{warehouse.name}</div>
                      <div className="mt-2 text-xl tabular-nums">{formatUnits(qty)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailBox({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-sand/70 bg-warm-white p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-medium ${muted ? "text-muted-foreground" : ""}`}>{value}</div>
    </div>
  );
}

function InfoSection({
  title,
  text,
  className = "",
}: {
  title: string;
  text: string;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-sand/70 bg-warm-white p-4 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{title}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {text}
      </p>
    </section>
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

function getStockSummary(productId: string, stockRows: any[], warehouses: any[]) {
  const matches = stockRows.filter((item) => item.product?.id === productId);
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

function getStockPresentationId(item: any) {
  return item.presentation?.id ?? item.presentation_id ?? null;
}

const defaultPieceCategories = ["Habitación", "Sala", "Terraza", "Carteras", "Accesorios"];
const materialHiddenCategoryNames = [...defaultPieceCategories, "Comedor"];

function normalizeCategoryName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function categoryScope(category: any) {
  const description = String(category?.description ?? "");
  if (description === "scope:piece") return "piece";
  if (description === "scope:material") return "material";
  return null;
}

function isHiddenFromMaterials(category: any) {
  if (categoryScope(category) === "piece") return true;
  if (categoryScope(category) === "material") return false;
  const normalized = normalizeCategoryName(category?.name ?? "");
  return materialHiddenCategoryNames.some((name) => normalizeCategoryName(name) === normalized);
}

function getPieceCategoryOptions(cats: any[]) {
  return cats.filter((category) => categoryScope(category) !== "material");
}

function getMaterialCategoryOptions(cats: any[]) {
  return cats.filter((category) => !isHiddenFromMaterials(category));
}

function getCategoryOptionsForType(cats: any[], type: "producto_terminado" | "material") {
  return type === "material" ? getMaterialCategoryOptions(cats) : getPieceCategoryOptions(cats);
}

export function ProductFormFields({
  form,
  setForm,
  cats,
  setCats,
  warehouses = [],
  stockByWarehouse = {},
  setStockByWarehouse,
  allowKit,
  hideCommercialFields = false,
  hideStockFields = false,
}: any) {
  const createCategory = useServerFn(adminCreateCategory);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const pieceCategoryOptions =
    form.type === "material"
      ? getMaterialCategoryOptions(cats)
      : [
          ...getPieceCategoryOptions(cats),
          ...defaultPieceCategories
            .filter(
              (name) =>
                !getPieceCategoryOptions(cats).some(
                  (c: any) => normalizeCategoryName(c.name) === normalizeCategoryName(name),
                ),
            )
            .map((name) => ({ id: `preset:${name}`, name })),
        ];
  const selectedCategoryValue = pieceCategoryOptions.some(
    (category: any) => category.id === form.category_id,
  )
    ? form.category_id
    : "_none";

  async function onCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const row = await createCategory({
        data: { name, scope: form.type === "material" ? "material" : "piece" },
      });
      setCats?.((items: any[]) => {
        const exists = items.some((item) => item.id === row.id || item.slug === row.slug);
        return exists ? items : [...items, row].sort((a, b) => a.name.localeCompare(b.name));
      });
      upd("category_id", row.id);
      setNewCategoryName("");
      toast.success("Categoría creada.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo crear la categoría.");
    } finally {
      setCreatingCategory(false);
    }
  }
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Nombre *</Label>
          <Input
            required
            value={form.name}
            onChange={(e) => {
              const n = e.target.value;
              setForm((f: any) => ({ ...f, name: n, slug: f.slug || slugify(n) }));
            }}
          />
        </div>
        <div>
          <Label>SKU</Label>
          <Input
            value={form.sku ?? ""}
            onChange={(e) => upd("sku", e.target.value.toUpperCase())}
            placeholder={`${getProductSkuPrefix(form.type)}-00001`}
          />
        </div>
        <div>
          <Label>Categoría</Label>
          <Select
            value={selectedCategoryValue}
            onValueChange={async (v) => {
              if (v === "_none") return upd("category_id", null);
              if (v.startsWith("preset:")) {
                const name = v.replace("preset:", "");
                setCreatingCategory(true);
                try {
                  const row = await createCategory({ data: { name, scope: "piece" } });
                  setCats?.((items: any[]) => {
                    const exists = items.some(
                      (item) => item.id === row.id || item.slug === row.slug,
                    );
                    return exists
                      ? items
                      : [...items, row].sort((a, b) => a.name.localeCompare(b.name));
                  });
                  upd("category_id", row.id);
                } catch (e: any) {
                  toast.error(e.message ?? "No se pudo crear la categoría.");
                } finally {
                  setCreatingCategory(false);
                }
                return;
              }
              upd("category_id", v);
            }}
            disabled={creatingCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sin categoría</SelectItem>
              {pieceCategoryOptions.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-2 flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Crear categoría nueva"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCreateCategory();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onCreateCategory}
              disabled={creatingCategory || !newCategoryName.trim()}
            >
              Crear
            </Button>
          </div>
        </div>
        {allowKit && (
          <div>
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => upd("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="producto_terminado">Pieza terminada</SelectItem>
                <SelectItem value="kit">Kit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={(v) => upd("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="por_encargo">Por encargo</SelectItem>
              <SelectItem value="agotado">Agotado</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!hideCommercialFields && (
          <>
            <div>
              <Label>
                Precio (S/)
                {form.type === "material" && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    opcional si usas presentaciones
                  </span>
                )}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => upd("price", e.target.value)}
              />
            </div>
            <div>
              <Label>Costo (S/)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost ?? 0}
                onChange={(e) => upd("cost", e.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <Label>Stock mínimo</Label>
          <Input
            type="number"
            step="1"
            value={form.min_stock ?? 0}
            onChange={(e) => upd("min_stock", e.target.value)}
          />
        </div>
        <div>
          <Label>Medidas</Label>
          <Input
            value={form.measurements ?? ""}
            onChange={(e) => upd("measurements", e.target.value)}
            placeholder="60 x 80 cm"
          />
        </div>
        <div>
          <Label>Color</Label>
          <Input value={form.color ?? ""} onChange={(e) => upd("color", e.target.value)} />
        </div>
        <div>
          <Label>Material principal</Label>
          <Input value={form.material ?? ""} onChange={(e) => upd("material", e.target.value)} />
        </div>
        {!hideStockFields && (
          <div className="sm:col-span-2">
            <StockByWarehouseFields
              warehouses={warehouses}
              values={stockByWarehouse}
              onChange={(warehouseId, value) =>
                setStockByWarehouse?.((current: Record<string, string>) => ({
                  ...current,
                  [warehouseId]: value,
                }))
              }
              title={form.type === "material" ? "Cantidad por almacén" : "Stock por almacén"}
              description={
                form.type === "material"
                  ? "Registra la cantidad disponible del material en cada almacén."
                  : undefined
              }
            />
          </div>
        )}
        {form.type === "material" && (
          <div>
            <Label>Proveedor</Label>
            <Input value={form.supplier ?? ""} onChange={(e) => upd("supplier", e.target.value)} />
          </div>
        )}
      </div>
      <ProductImageDropzone form={form} onUploaded={(url) => upd("main_image_url", url)} />
      <div>
        <Label>Descripción corta (opcional)</Label>
        <Input
          value={form.short_description ?? ""}
          onChange={(e) => upd("short_description", e.target.value)}
          maxLength={280}
        />
      </div>
      <div>
        <Label>Descripción (opcional)</Label>
        <Textarea
          rows={4}
          value={form.description ?? ""}
          onChange={(e) => upd("description", e.target.value)}
        />
      </div>
      <div>
        <Label>Notas internas</Label>
        <Textarea
          rows={2}
          value={form.internal_notes ?? ""}
          onChange={(e) => upd("internal_notes", e.target.value)}
        />
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <Switch checked={form.is_visible} onCheckedChange={(v) => upd("is_visible", v)} /> Visible
          en web
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={form.is_featured} onCheckedChange={(v) => upd("is_featured", v)} />{" "}
          Mostrar como pieza destacada
        </label>
      </div>
    </>
  );
}

export function StockByWarehouseFields({
  warehouses,
  values,
  onChange,
  title = "Stock por almacén",
  description = "Registra la cantidad disponible en cada ubicación: SA Santa Anita, PL Pueblo Libre y Feria.",
  compact = false,
}: {
  warehouses: any[];
  values: Record<string, string>;
  onChange: (warehouseId: string, value: string) => void;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-sand/70 bg-cream/35 ${compact ? "p-3" : "p-4"}`}>
      <div className={compact ? "mb-2" : "mb-3"}>
        <Label className={compact ? "text-sm" : "text-base"}>{title}</Label>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {warehouses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Primero crea los almacenes en el módulo Almacenes.
        </p>
      ) : (
        <div
          className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-3"}`}
        >
          {warehouses.map((warehouse: any) => (
            <div
              key={warehouse.id}
              className={`rounded-xl border border-sand/70 bg-warm-white ${compact ? "p-2" : "p-3"}`}
            >
              <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {warehouse.code}
              </Label>
              <div className="mb-2 truncate text-sm font-medium">{warehouse.name}</div>
              <Input
                type="number"
                min="0"
                step="1"
                value={values[warehouse.id] ?? ""}
                onChange={(e) => onChange(warehouse.id, e.target.value)}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSaveError(error: any) {
  const message = String(error?.message ?? "");
  if (message.includes('"path":["slug"]') || message.toLowerCase().includes("slug")) {
    return "El nombre debe tener al menos 2 caracteres para crear la URL interna.";
  }
  return message || "No se pudo guardar";
}

function ProductImageDropzone({
  form,
  onUploaded,
}: {
  form: any;
  onUploaded: (url: string) => void;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const bucket = form.type === "material" ? "material-images" : "product-images";

  async function uploadFile(file?: File) {
    if (!file) return;
    const isAllowed = ["image/jpeg", "image/png"].includes(file.type);
    if (!isAllowed) {
      toast.error("Sube una imagen JPG o PNG.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("La imagen debe pesar máximo 6 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const base = slugify(form.name || "pieza");
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now();
      const path = `${form.type === "material" ? "materiales" : "piezas"}/${base}-${id}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
      toast.success("Imagen cargada.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo cargar la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Agregar imagen principal (JPG o PNG)</Label>
      <label
        htmlFor={inputId}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          uploadFile(e.dataTransfer.files?.[0]);
        }}
        className="grid min-h-20 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-dashed border-sand bg-cream/40 px-4 py-3 text-left transition hover:border-accent hover:bg-cream"
      >
        {form.main_image_url ? (
          <img
            src={form.main_image_url}
            alt="Vista previa de la pieza"
            className="h-14 w-14 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warm-white text-accent shadow-sm">
            <ImageIcon className="h-5 w-5" />
          </span>
        )}
        <span>
          <span className="block text-sm font-medium">
            {uploading ? "Subiendo imagen..." : "Arrastra o selecciona una imagen"}
          </span>
          <span className="block text-xs text-muted-foreground">JPG o PNG. Máximo 6 MB.</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sand bg-warm-white px-3 py-1 text-xs text-accent">
          <Upload className="h-3.5 w-3.5" /> Agregar imagen
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={(e) => uploadFile(e.target.files?.[0])}
      />
    </div>
  );
}
