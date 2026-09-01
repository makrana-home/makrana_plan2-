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
import {
  ArrowRightLeft,
  Eye,
  ImageIcon,
  LayoutGrid,
  PackagePlus,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
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
  adminEnsureHomeCategories,
  adminUpdateCategory,
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
  const updateCategory = useServerFn(adminUpdateCategory);
  const ensureHomeCategories = useServerFn(adminEnsureHomeCategories);
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [tableStock, setTableStock] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const detailDlg = useDialog<any>();
  const movementDlg = useDialog<any>();
  const categoriesDlg = useDialog<any>();
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
  const [categoryDrafts, setCategoryDrafts] = useState<any[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);
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
    (async () => {
      if (type === "producto_terminado") await ensureHomeCategories();
      setCats(await listCats());
    })(); /* eslint-disable-line */
    listWarehouses().then(setWarehouses); /* eslint-disable-line */
  }, []);

  function openNew() {
    setForm({ ...blank(type), sku: generateNextProductSku(rows, type) });
    setStockByWarehouse({});
    setInitialStockByWarehouse({});
    dlg.openWith(null);
  }
  function openHomeCategories() {
    setCategoryDrafts(
      getCategoryOptionsForType(cats, "producto_terminado")
        .filter((category: any) => category.show_on_home)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .slice(0, 3)
        .map((category: any) => ({ ...category })),
    );
    categoriesDlg.openWith(null);
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
  async function onCategoriesSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingCategories(true);
    try {
      const saved: any[] = [];
      for (const category of categoryDrafts) {
        saved.push(
          await updateCategory({
            data: {
              id: category.id,
              name: category.name,
              home_description: category.home_description || null,
              home_image_url: category.home_image_url || null,
              sort_order: Number(category.sort_order),
              show_on_home: true,
              is_active: category.is_active,
            },
          }),
        );
      }
      setCats((current) =>
        current.map((category) => saved.find((item) => item.id === category.id) ?? category),
      );
      toast.success("Categorías del inicio actualizadas");
      categoriesDlg.close();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudieron actualizar las categorías");
    } finally {
      setSavingCategories(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        eyebrow="Inventario"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {type === "producto_terminado" && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="rounded-full"
                onClick={openHomeCategories}
              >
                <LayoutGrid className="h-4 w-4" />
                Categorías del inicio
              </Button>
            )}
            <NewButton
              onClick={openNew}
              label={`Nueva ${type === "material" ? "material" : "pieza"}`}
            />
          </div>
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

      <div className="grid gap-3 xl:hidden">
        {filteredRows.length === 0 && (
          <div className="rounded-3xl border border-sand/80 bg-warm-white/75 px-5 py-10 text-center text-muted-foreground shadow-sm">
            Sin piezas con estos filtros.
          </div>
        )}
        {filteredRows.map((r) => {
          const stock = getStockSummary(r.id, tableStock, warehouses);
          return (
            <article
              key={r.id}
              role="button"
              tabIndex={0}
              aria-label={`Ver detalle de ${r.name}`}
              className="rounded-3xl border border-sand/80 bg-warm-white/75 p-4 shadow-sm transition hover:border-clay/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button, a, input, select")) return;
                void openDetail(r);
              }}
              onKeyDown={(event) => {
                if ((event.target as HTMLElement).closest("button, a, input, select")) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void openDetail(r);
                }
              }}
            >
              <div className="flex min-w-0 items-start gap-3">
                <ProductThumb product={r} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium leading-tight text-foreground">{r.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.category?.name ?? "Sin categoría"} · SKU {r.sku ?? "—"}
                      </p>
                    </div>
                    <StatusBadge status={r.status} visible={r.is_visible} />
                  </div>
                  {r.type === "kit" && (
                    <Badge variant="outline" className="mt-2">
                      Kit
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-cream/70 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Costo</p>
                  <p className="mt-0.5 tabular-nums">{moneyPEN(r.cost ?? 0)}</p>
                </div>
                <div className="rounded-2xl bg-cream/70 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Precio</p>
                  <p className="mt-0.5 font-medium tabular-nums">{moneyPEN(r.price)}</p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                {[
                  ["Total", stock.total],
                  ["SA", stock.sa],
                  ["PL", stock.pl],
                  ["FE", stock.feria],
                ].map(([label, quantity]) => (
                  <div key={label} className="rounded-xl border border-sand/70 px-1 py-2">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-0.5 text-sm font-medium tabular-nums">
                      {formatQuantity(quantity as number)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button type="button" size="sm" variant="outline" onClick={() => openDetail(r)}>
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openMovement(r, "transferencia")}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Mover
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openMovement(r, "entrada")}
                >
                  <PackagePlus className="h-4 w-4" />
                  Entrada
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onDelete(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                  Eliminar
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden max-w-full overflow-x-auto rounded-3xl border border-sand/80 bg-warm-white/75 shadow-sm xl:block">
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
                <TableRow
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver detalle de ${r.name}`}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("button, a, input, select")) return;
                    void openDetail(r);
                  }}
                  onKeyDown={(event) => {
                    if ((event.target as HTMLElement).closest("button, a, input, select")) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void openDetail(r);
                    }
                  }}
                >
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
        title={dlg.data ? "Editar pieza" : "Nueva pieza"}
        description="Completa la información por secciones. Los cambios se guardarán al final."
        onSubmit={onSubmit}
        submitting={saving}
        submitLabel="Guardar cambios"
        contentClassName="max-w-3xl bg-[#FFF9F4]"
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
      <FormDialog
        open={categoriesDlg.open}
        onOpenChange={categoriesDlg.setOpen}
        title="Categorías del inicio"
        description="Edita las tres tarjetas que aparecen debajo del video principal."
        onSubmit={onCategoriesSubmit}
        submitting={savingCategories}
        contentClassName="max-w-5xl"
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {categoryDrafts.map((category, index) => (
            <HomeCategoryEditor
              key={category.id}
              category={category}
              index={index}
              onChange={(next) =>
                setCategoryDrafts((current) =>
                  current.map((item) => (item.id === next.id ? next : item)),
                )
              }
            />
          ))}
        </div>
      </FormDialog>
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

function HomeCategoryEditor({
  category,
  index,
  onChange,
}: {
  category: any;
  index: number;
  onChange: (category: any) => void;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen no debe superar 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${category.slug}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      onChange({ ...category, home_image_url: data.publicUrl });
      toast.success("Imagen cargada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo cargar la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-sand/80 bg-cream/35">
      <div className="aspect-[5/4] bg-sand/35">
        {category.home_image_url ? (
          <img src={category.home_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 opacity-35" />
          </div>
        )}
      </div>
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor={`${inputId}-name`}>Nombre</Label>
          <Input
            id={`${inputId}-name`}
            value={category.name}
            onChange={(event) => onChange({ ...category, name: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${inputId}-description`}>Descripción breve</Label>
          <Textarea
            id={`${inputId}-description`}
            value={category.home_description ?? ""}
            rows={3}
            maxLength={180}
            onChange={(event) => onChange({ ...category, home_description: event.target.value })}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${inputId}-order`}>Orden</Label>
            <Input
              id={`${inputId}-order`}
              type="number"
              min={0}
              max={999}
              value={category.sort_order}
              onChange={(event) => onChange({ ...category, sort_order: event.target.value })}
            />
          </div>
          <div className="flex h-10 items-center gap-2">
            <Switch
              checked={category.is_active}
              onCheckedChange={(checked) => onChange({ ...category, is_active: checked })}
              aria-label={`Mostrar ${category.name}`}
            />
            <span className="text-xs">Visible</span>
          </div>
        </div>
        <Button asChild type="button" variant="outline" className="w-full">
          <label htmlFor={`${inputId}-image`} className="cursor-pointer">
            <Upload className="h-4 w-4" />
            {uploading
              ? "Subiendo..."
              : category.home_image_url
                ? "Cambiar imagen"
                : "Agregar imagen"}
          </label>
        </Button>
        <input
          id={`${inputId}-image`}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => uploadImage(event.target.files?.[0])}
        />
        <p className="text-center text-[11px] text-muted-foreground">Tarjeta {index + 1}</p>
      </div>
    </section>
  );
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
        {formatProductStatus(status)}
      </span>
      {!visible && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          oculto
        </span>
      )}
    </div>
  );
}

function formatProductStatus(status: string) {
  const labels: Record<string, string> = {
    disponible: "Disponible",
    por_encargo: "Por encargo",
    agotado: "Agotado",
    reservado: "Reservado",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function formatProductType(type?: string | null) {
  const labels: Record<string, string> = {
    producto_terminado: "Pieza terminada",
    material: "Material",
    kit: "Kit",
  };
  return type ? (labels[type] ?? type.replaceAll("_", " ")) : "—";
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
      <div className="grid gap-5 text-base sm:grid-cols-2 [&_input]:min-h-12 [&_input]:text-base [&_[role=combobox]]:min-h-12 [&_[role=combobox]]:text-base">
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
  const totalStock = itemStock.reduce((total, item) => total + Number(item.quantity ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[94vh] max-w-4xl overflow-y-auto bg-[#FFF9F4] text-base"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-8 font-display text-xl">
            <span>{product.type === "material" ? "Detalle de material" : "Detalle de pieza"}</span>
            <Button
              type="button"
              className="min-h-11 rounded-full px-5 text-base"
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

        <div className="rounded-3xl border border-sand/80 bg-warm-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-6 md:grid-cols-[180px_1fr]">
            <div>
              {product.main_image_url ? (
                <img
                  src={product.main_image_url}
                  alt={product.name}
                  className="aspect-square w-full rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-warm-white text-brand-terracotta/60">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-[#AC6454] bg-[#AC6454]/10 p-4">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-terracotta">
                  {product.type === "material" ? "Material" : "Pieza"}
                </div>
                <h2 className="mt-1 font-display text-3xl font-semibold leading-tight text-[#AC6454]">
                  {product.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    className="border-[#AC6454] bg-[#AC6454]/10 text-[#AC6454]"
                    variant="outline"
                  >
                    SKU: {product.sku || "Sin SKU"}
                  </Badge>
                  <Badge variant="outline">{product.category?.name ?? "Sin categoría"}</Badge>
                  <Badge>{formatProductStatus(product.status)}</Badge>
                  {!product.is_visible && <Badge variant="outline">Oculto en web</Badge>}
                  {product.is_featured && <Badge variant="outline">Destacado</Badge>}
                </div>
              </div>

              <DetailSectionHeading
                title="Resumen comercial"
                description="Precio, costo y control mínimo de existencias."
              />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {!hasPresentationRows && (
                  <>
                    <DetailBox label="Costo" value={moneyPEN(product.cost ?? 0)} emphasis="soft" />
                    <DetailBox
                      label="Precio"
                      value={moneyPEN(product.price ?? 0)}
                      emphasis="strong"
                    />
                  </>
                )}
                <DetailBox label="Stock total" value={formatUnits(totalStock)} emphasis="stock" />
                <DetailBox
                  label="Stock mínimo"
                  value={formatUnits(product.min_stock ?? 0)}
                  emphasis="stock"
                />
              </div>

              <DetailSectionHeading
                title="Características"
                description="Datos físicos y clasificación de la pieza."
              />
              <DetailBox label="Tipo" value={formatProductType(product.type)} />

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

          <div className="mt-7">
            <DetailSectionHeading
              title="Información adicional"
              description="Descripción para consulta y notas del equipo."
            />
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <InfoSection
              title="Descripción"
              text={product.description || "—"}
              className="md:col-span-2"
            />
            <InfoSection
              title="Notas internas"
              text={product.internal_notes || "—"}
              className="md:col-span-2"
            />
          </div>

          {hasPresentationRows && (
            <div className="mt-6 rounded-2xl border-2 border-[#80342C] bg-[#FFF9F4] p-4 shadow-sm">
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
            <div className="mt-6 rounded-2xl border border-sand/70 bg-warm-white p-4 shadow-sm">
              <DetailSectionHeading
                title="Stock por almacén"
                description="Existencias disponibles en cada ubicación."
                stock
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {warehouses.map((warehouse) => {
                  const qty = itemStock
                    .filter(
                      (item) =>
                        item.warehouse?.id === warehouse.id && !getStockPresentationId(item),
                    )
                    .reduce((total, item) => total + Number(item.quantity ?? 0), 0);
                  return (
                    <div
                      key={warehouse.id}
                      className="rounded-xl border border-[#E8BCA4] bg-[#E8BCA4]/40 p-4 transition hover:border-[#AC6454] hover:shadow-sm"
                    >
                      <div className="text-sm font-bold uppercase tracking-[0.08em] text-[#AC6454]">
                        {warehouse.code}
                      </div>
                      <div className="mt-1 text-base font-semibold">{warehouse.name}</div>
                      <div className="mt-3 text-2xl font-bold tabular-nums">{formatUnits(qty)}</div>
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
  emphasis,
}: {
  label: string;
  value: string;
  muted?: boolean;
  emphasis?: "soft" | "strong" | "stock";
}) {
  const emphasisClasses =
    emphasis === "strong"
      ? "border-[#847838] bg-[#847838]/15"
      : emphasis === "stock"
        ? "border-[#E8BCA4] bg-[#E8BCA4]/40"
        : emphasis === "soft"
          ? "border-[#847838] bg-[#847838]/15"
          : "border-sand/70 bg-warm-white";
  return (
    <div
      className={`rounded-2xl border p-3 transition-colors hover:border-clay/60 ${emphasisClasses}`}
    >
      <div
        className={`text-sm font-semibold uppercase tracking-[0.1em] ${emphasis === "stock" ? "text-[#AC6454]" : emphasis ? "text-[#847838]" : "text-foreground/75"}`}
      >
        {label}
      </div>
      <div
        className={`mt-1 font-semibold tabular-nums ${emphasis ? "text-xl" : "text-base"} ${emphasis === "stock" ? "text-[#80342C]" : emphasis ? "text-[#5F5728]" : ""} ${muted ? "text-foreground/70" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function DetailSectionHeading({
  title,
  description,
  stock = false,
}: {
  title: string;
  description: string;
  stock?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-l-4 border-[#E8BCA4] pl-3">
      <div>
        <h3
          className={`text-lg font-bold leading-tight ${stock ? "text-[#AC6454]" : "text-foreground"}`}
        >
          {title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-foreground/65">{description}</p>
      </div>
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
    <section
      className={`rounded-2xl border border-[#C87434]/45 bg-warm-white p-4 shadow-sm ${className}`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-terracotta">
        {title}
      </h3>
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
  if (description.startsWith("scope:piece")) return "piece";
  if (description.startsWith("scope:material")) return "material";
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSectionHeading
          number="1"
          title="Identificación"
          description="Datos principales para reconocer la pieza rápidamente."
        />
        <div>
          <Label className="font-semibold text-[#AC6454]">Nombre *</Label>
          <Input
            required
            className="mt-1 border-[#AC6454] bg-[#AC6454]/10 text-base font-semibold focus-visible:ring-[#AC6454]/30"
            value={form.name}
            onChange={(e) => {
              const n = e.target.value;
              setForm((f: any) => ({ ...f, name: n, slug: f.slug || slugify(n) }));
            }}
          />
        </div>
        <div>
          <Label className="font-semibold text-[#AC6454]">SKU</Label>
          <Input
            className="mt-1 border-[#AC6454] bg-[#AC6454]/10 font-medium uppercase tracking-wide focus-visible:ring-[#AC6454]/30"
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
        {form.type !== "material" && (
          <div className="flex items-center justify-between gap-5 rounded-2xl border border-sand/70 bg-cream/35 px-4 py-3 sm:col-span-2">
            <div>
              <Label htmlFor="product-made-to-order" className="font-semibold">
                Pieza bajo pedido
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Actívalo para mostrar “Bajo pedido” y “Cotizar” en la página web.
              </p>
            </div>
            <Switch
              id="product-made-to-order"
              checked={form.status === "por_encargo"}
              onCheckedChange={(checked) => upd("status", checked ? "por_encargo" : "disponible")}
            />
          </div>
        )}
        {!hideCommercialFields && (
          <>
            <FormSectionHeading
              number="2"
              title="Información comercial"
              description="Valores usados para compras y ventas."
            />
            <div>
              <Label className="font-semibold text-[#847838]">
                Precio (S/)
                {form.type === "material" && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    opcional si usas presentaciones
                  </span>
                )}
              </Label>
              <Input
                className="mt-1 border-[#847838] bg-[#847838]/15 text-lg font-semibold tabular-nums focus-visible:ring-[#847838]/30"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => upd("price", e.target.value)}
              />
            </div>
            <div>
              <Label className="font-semibold text-[#847838]">Costo (S/)</Label>
              <Input
                className="mt-1 border-[#847838] bg-[#847838]/15 text-lg font-semibold tabular-nums focus-visible:ring-[#847838]/30"
                type="number"
                step="0.01"
                value={form.cost ?? 0}
                onChange={(e) => upd("cost", e.target.value)}
              />
            </div>
          </>
        )}
        <FormSectionHeading
          number="3"
          title="Características"
          description="Información física y materiales de la pieza."
        />
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
        <FormSectionHeading
          number="4"
          title="Inventario"
          description="Define el mínimo y las cantidades disponibles por ubicación."
        />
        <div>
          <Label className="font-semibold text-[#AC6454]">Stock mínimo</Label>
          <Input
            className="mt-1 border-[#E8BCA4] bg-[#E8BCA4]/40 text-lg font-semibold tabular-nums focus-visible:ring-[#E8BCA4]/60"
            type="number"
            step="1"
            value={form.min_stock ?? 0}
            onChange={(e) => upd("min_stock", e.target.value)}
          />
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
      <section className="rounded-2xl border border-sand bg-[#FFF9F4] p-4 shadow-sm">
        <FormSectionHeading
          number="5"
          title="Imagen principal"
          description="Fotografía que identifica la pieza en el catálogo."
          nested
        />
        <ProductImageDropzone form={form} onUploaded={(url) => upd("main_image_url", url)} />
      </section>
      <section className="space-y-4 rounded-2xl border border-sand bg-[#FFF9F4] p-4 shadow-sm">
        <FormSectionHeading
          number="6"
          title="Descripción y publicación"
          description="Explica la pieza con palabras sencillas y decide cómo mostrarla."
          nested
        />
        <div>
          <Label>Descripción de la pieza (opcional)</Label>
          <Textarea
            rows={4}
            value={form.description ?? ""}
            onChange={(e) => upd("description", e.target.value)}
            placeholder="Describe sus materiales, medidas, uso o algún detalle especial."
          />
        </div>
        <div>
          <Label>Notas para el equipo</Label>
          <Textarea
            rows={2}
            value={form.internal_notes ?? ""}
            onChange={(e) => upd("internal_notes", e.target.value)}
            placeholder="Estas notas no se mostrarán a los clientes."
          />
        </div>
        <div className="flex flex-wrap gap-3 rounded-xl bg-cream/70 p-3 sm:gap-6">
          <label className="flex min-h-11 items-center gap-2 font-medium">
            <Switch checked={form.is_visible} onCheckedChange={(v) => upd("is_visible", v)} />
            Visible en web
          </label>
          <label className="flex min-h-11 items-center gap-2 font-medium">
            <Switch checked={form.is_featured} onCheckedChange={(v) => upd("is_featured", v)} />
            Mostrar como pieza destacada
          </label>
        </div>
      </section>
    </>
  );
}

function FormSectionHeading({
  number,
  title,
  description,
  nested = false,
}: {
  number: string;
  title: string;
  description: string;
  nested?: boolean;
}) {
  return (
    <div
      className={
        nested
          ? "mb-4"
          : "rounded-2xl border border-sand/70 bg-warm-white p-4 shadow-sm sm:col-span-2"
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8BCA4] text-sm font-bold text-[#80342C]">
          {number}
        </span>
        <div>
          <h3 className="text-lg font-bold leading-tight text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground/65">{description}</p>
        </div>
      </div>
    </div>
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
    <div
      className={`rounded-2xl border border-sand/70 bg-cream/20 shadow-sm ${compact ? "p-3" : "p-4"}`}
    >
      <div className={compact ? "mb-2" : "mb-3"}>
        <Label className={`${compact ? "text-base" : "text-lg"} font-bold text-[#AC6454]`}>
          {title}
        </Label>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-foreground/70">{description}</p>
        )}
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
              className={`rounded-xl border border-[#E8BCA4] bg-[#E8BCA4]/25 transition hover:border-[#AC6454] hover:shadow-sm focus-within:ring-2 focus-within:ring-[#E8BCA4]/60 ${compact ? "p-3" : "p-4"}`}
            >
              <Label className="text-sm font-bold uppercase tracking-[0.08em] text-[#AC6454]">
                {warehouse.code}
              </Label>
              <div className="mb-3 text-base font-semibold leading-tight">{warehouse.name}</div>
              <Input
                className="min-h-12 border-[#E8BCA4] bg-[#E8BCA4]/40 text-lg font-semibold tabular-nums focus-visible:ring-[#E8BCA4]/60"
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
        className="grid min-h-20 cursor-pointer grid-cols-[auto_1fr] items-center gap-3 rounded-xl border border-dashed border-sand bg-cream/40 px-4 py-3 text-left transition hover:border-accent hover:bg-cream sm:grid-cols-[auto_1fr_auto]"
      >
        {form.main_image_url ? (
          <img
            src={form.main_image_url}
            alt="Vista previa de la pieza"
            className="h-14 w-14 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warm-white text-brand-terracotta shadow-sm">
            <ImageIcon className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium">
            {uploading ? "Subiendo imagen..." : "Arrastra o selecciona una imagen"}
          </span>
          <span className="block text-xs text-muted-foreground">JPG o PNG. Máximo 6 MB.</span>
        </span>
        <span className="col-span-2 inline-flex w-fit items-center gap-1 rounded-full border border-sand bg-warm-white px-3 py-1 text-xs text-brand-terracotta sm:col-span-1">
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
