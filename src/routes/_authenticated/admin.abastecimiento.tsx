import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, FileText, Package, Plus, Search, ShoppingBag, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, moneyPEN } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { adminListProducts, adminListWarehouses } from "@/lib/admin.functions";
import { getPresentationUnitLabel } from "@/lib/presentation-units";
import {
  listInventoryPurchases,
  saveInventoryPurchase,
  stockInventoryPurchase,
} from "@/lib/inventory-purchases.functions";
import {
  comparePurchasedProducts,
  inventoryPurchaseSchema,
  normalizePurchaseText,
  purchaseTotal,
  supplierKey,
  type InventoryPurchase,
  type PurchaseItem,
} from "@/lib/inventory-purchases";

export const Route = createFileRoute("/_authenticated/admin/abastecimiento")({
  component: PurchasesPage,
});
const newItem = (): PurchaseItem => ({
  name: "",
  quantity: 1,
  price: 0,
  unit: "unidad",
  photo_path: null,
});
const newPurchase = () => ({
  id: crypto.randomUUID(),
  supplier_name: "",
  supplier_phone: "",
  supplier_address: "",
  supplier_ruc: "",
  receipt_number: "",
  purchased_on: [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, "0"),
    String(new Date().getDate()).padStart(2, "0"),
  ].join("-"),
  receipt_path: null as string | null,
  notes: "",
  items: [newItem()],
});
const selectStyle = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
type Mapping = {
  product_id: string | null;
  presentation_id: string | null;
  type: "material" | "producto_terminado";
};
type Product = {
  id: string;
  name: string;
  type: string;
  presentations: { id: string; unit: string; label: string | null }[];
};
type Warehouse = { id: string; name: string; is_active: boolean };

function InventoryMapping({
  mapping,
  products,
  onChange,
}: {
  mapping: Mapping;
  products: Product[];
  onChange: (mapping: Mapping) => void;
}) {
  const selected = products.find((p) => p.id === mapping.product_id);
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        Producto de inventario
        <select
          className={selectStyle}
          value={mapping.product_id ?? `new:${mapping.type}`}
          onChange={(e) =>
            onChange(
              e.target.value.startsWith("new:")
                ? {
                    product_id: null,
                    presentation_id: null,
                    type: e.target.value.slice(4) as Mapping["type"],
                  }
                : { ...mapping, product_id: e.target.value, presentation_id: null },
            )
          }
        >
          <option value="new:material">Crear nuevo material</option>
          <option value="new:producto_terminado">Crear nueva pieza</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type === "material" ? "material" : "pieza"})
            </option>
          ))}
        </select>
      </label>
      {!!selected?.presentations.length && (
        <label className="block text-sm">
          Presentación
          <select
            className={selectStyle}
            value={mapping.presentation_id ?? ""}
            onChange={(e) => onChange({ ...mapping, presentation_id: e.target.value || null })}
          >
            <option value="">Unidad base</option>
            {selected.presentations.map((p) => (
              <option key={p.id} value={p.id}>
                {getPresentationUnitLabel(p.unit, p.label)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function Attachment({ path, image = false }: { path: string | null; image?: boolean }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    setUrl("");
    if (path)
      void supabase.storage
        .from("purchase-files")
        .createSignedUrl(path, 3600)
        .then(({ data }) => {
          if (active) setUrl(data?.signedUrl ?? "");
        });
    return () => {
      active = false;
    };
  }, [path]);
  if (!path) return null;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-sm text-primary underline"
      onClick={async () => {
        const { data, error } = await supabase.storage
          .from("purchase-files")
          .createSignedUrl(path, 300);
        if (error) {
          toast.error("No se pudo abrir el archivo");
          return;
        }
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }}
    >
      {image && url ? (
        <img
          src={url}
          alt="Foto del producto comprado"
          className="h-16 w-16 rounded-lg object-cover"
        />
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Ver {image ? "foto" : "boleta"}
        </>
      )}
    </button>
  );
}

function PurchasesPage() {
  const list = useServerFn(listInventoryPurchases),
    save = useServerFn(saveInventoryPurchase),
    stock = useServerFn(stockInventoryPurchase);
  const listProducts = useServerFn(adminListProducts),
    listWarehouses = useServerFn(adminListWarehouses);
  const [rows, setRows] = useState<InventoryPurchase[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [view, setView] = useState<"purchases" | "suppliers" | "products">("purchases");
  const [search, setSearch] = useState(""),
    [supplier, setSupplier] = useState<string | null>(null);
  const [open, setOpen] = useState(false),
    [form, setForm] = useState<ReturnType<typeof newPurchase> | null>(null);
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const [detail, setDetail] = useState<InventoryPurchase | null>(null),
    [receiving, setReceiving] = useState<InventoryPurchase | null>(null);
  const [products, setProducts] = useState<Product[]>([]),
    [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouse, setWarehouse] = useState(""),
    [mappings, setMappings] = useState<Mapping[]>([]);
  const [addToStock, setAddToStock] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [lookup, setLookup] = useState<number | "supplier" | null>(null);
  const [lookupSearch, setLookupSearch] = useState("");
  async function loadInventory() {
    setInventoryLoading(true);
    setInventoryError("");
    try {
      const [p, w] = await Promise.all([listProducts({ data: {} }), listWarehouses()]);
      setProducts(
        p.filter(
          (p) => p.type === "material" || p.type === "producto_terminado",
        ) as unknown as Product[],
      );
      setWarehouses(w.filter((w) => w.is_active) as Warehouse[]);
    } catch {
      setInventoryError(
        "No se pudo cargar el inventario. Reintenta o desactiva el ingreso al stock.",
      );
    } finally {
      setInventoryLoading(false);
    }
  }
  function openLookup(target: number | "supplier") {
    setLookupSearch("");
    setLookup(target);
  }
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las compras");
    } finally {
      setLoading(false);
    }
  }, [list]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (p) =>
          (!supplier || supplierKey(p) === supplier) &&
          normalizePurchaseText(
            [p.supplier_name, p.supplier_ruc, p.receipt_number, ...p.items.map((i) => i.name)].join(
              " ",
            ),
          ).includes(normalizePurchaseText(search)),
      ),
    [rows, search, supplier],
  );
  const suppliers = useMemo(() => {
    const map = new Map<string, InventoryPurchase[]>();
    for (const p of filtered) map.set(supplierKey(p), [...(map.get(supplierKey(p)) ?? []), p]);
    return [...map.entries()];
  }, [filtered]);
  const comparisons = useMemo(() => comparePurchasedProducts(filtered), [filtered]);
  function updateItem(index: number, patch: Partial<PurchaseItem>) {
    setForm(
      (f) =>
        f && {
          ...f,
          items: f.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        },
    );
  }
  async function upload(file: File | undefined, index?: number) {
    if (!file || !form) return;
    const allowed =
      index === undefined
        ? ["image/jpeg", "image/png", "image/webp", "application/pdf"]
        : ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) {
      toast.error("Usa JPG, PNG, WebP o una boleta PDF de hasta 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Inicia sesión para subir archivos");
      const path = `${user.id}/${form.id}/${crypto.randomUUID()}.${file.type === "application/pdf" ? "pdf" : file.type.split("/")[1]}`;
      const { error } = await supabase.storage
        .from("purchase-files")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      if (index === undefined) setForm((f) => f && { ...f, receipt_path: path });
      else updateItem(index, { photo_path: path });
      toast.success("Archivo adjuntado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || busy || uploading) return;
    const parsed = inventoryPurchaseSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (addToStock && (!warehouse || inventoryLoading || inventoryError)) {
      toast.error("Selecciona un almacén y revisa los productos de inventario antes de guardar.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: parsed.data });
      if (addToStock) {
        try {
          await stock({ data: { id: parsed.data.id, warehouse_id: warehouse, mappings } });
        } catch (e) {
          setOpen(false);
          setForm(null);
          setReceiving({
            ...parsed.data,
            total: purchaseTotal(parsed.data.items),
            stocked_at: null,
            warehouse_id: null,
          });
          toast.error(
            "La compra quedó guardada, pero no ingresó al inventario. Puedes reintentar el ingreso sin duplicar la compra. " +
              (e instanceof Error ? e.message : ""),
          );
          await refresh();
          return;
        }
      }
      setOpen(false);
      setForm(null);
      toast.success(
        addToStock
          ? "Compra guardada y añadida al inventario."
          : "Compra guardada sin modificar el inventario.",
      );
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  async function startReceiving(p: InventoryPurchase) {
    setBusy(true);
    try {
      const [products, warehouses] = await Promise.all([
        listProducts({ data: {} }),
        listWarehouses(),
      ]);
      setProducts(
        products.filter(
          (p) => p.type === "material" || p.type === "producto_terminado",
        ) as unknown as Product[],
      );
      setWarehouses(warehouses.filter((w) => w.is_active) as Warehouse[]);
      setWarehouse("");
      setMappings(
        p.items.map(() => ({ product_id: null, presentation_id: null, type: "material" })),
      );
      setDetail(null);
      setReceiving(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar el inventario");
    } finally {
      setBusy(false);
    }
  }
  async function receive(e: React.FormEvent) {
    e.preventDefault();
    if (!receiving || busy) return;
    setBusy(true);
    try {
      await stock({ data: { id: receiving.id, warehouse_id: warehouse, mappings } });
      setReceiving(null);
      toast.success("Compra añadida al inventario");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo ingresar al inventario");
    } finally {
      setBusy(false);
    }
  }
  const itemList = (p: InventoryPurchase) => (
    <div className="divide-y">
      {p.items.map((item, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Attachment path={item.photo_path} image />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.quantity} {item.unit} × {moneyPEN(item.price)}
            </p>
          </div>
          <strong>{moneyPEN(purchaseTotal([item]))}</strong>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras"
        description="Tus boletas, proveedores y precios en un solo lugar. Tú decides cuándo ingresar la compra al stock."
        actions={
          <Button
            onClick={() => {
              setForm(newPurchase());
              setAddToStock(false);
              setWarehouse("");
              setMappings([{ product_id: null, presentation_id: null, type: "material" }]);
              setInventoryError("");
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva compra
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Compras registradas", rows.length],
          ["Proveedores", new Set(rows.map(supplierKey)).size],
          ["Pendientes de ingresar al stock", rows.filter((p) => !p.stocked_at).length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-sand bg-warm-white p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex flex-wrap gap-2" aria-label="Vistas de compras">
          {(
            [
              ["purchases", "Compras", ShoppingBag],
              ["suppliers", "Proveedores", Users],
              ["products", "Productos y precios", Package],
            ] as const
          ).map(([key, label, Icon]) => (
            <Button
              key={key}
              variant={view === key ? "default" : "outline"}
              aria-pressed={view === key}
              onClick={() => {
                setView(key);
                setSupplier(null);
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        <Input
          aria-label="Buscar compras"
          placeholder="Buscar proveedor, RUC o producto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>
      {supplier && (
        <Button
          variant="outline"
          onClick={() => {
            setSupplier(null);
            setView("suppliers");
          }}
        >
          ← Todos los proveedores
        </Button>
      )}
      {loading ? (
        <p role="status">Cargando compras…</p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive p-5">
          <p>{error}</p>
          <Button variant="outline" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : !filtered.length ? (
        <div className="rounded-xl border border-dashed border-sand p-12 text-center">
          <ShoppingBag className="mx-auto mb-4 h-9 w-9 text-muted-foreground" />
          <h2 className="font-semibold">
            {rows.length ? "No hay coincidencias" : "Guarda tu primera compra"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Adjunta la boleta, registra sus productos y empieza a comparar proveedores.
          </p>
        </div>
      ) : (
        <>
          {view === "purchases" && (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((p) => (
                <article key={p.id} className="rounded-xl border border-sand bg-warm-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <button className="text-left" onClick={() => setDetail(p)}>
                      <h2 className="text-lg font-semibold underline-offset-4 hover:underline">
                        {p.supplier_name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {p.purchased_on} · {p.receipt_number || "Sin número de boleta"}
                      </p>
                    </button>
                    <Badge variant={p.stocked_at ? "secondary" : "outline"}>
                      {p.stocked_at ? "En inventario" : "Sin ingresar"}
                    </Badge>
                  </div>
                  <p className="my-4 line-clamp-2 text-sm">
                    {p.items.map((i) => i.name).join(" · ")}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-xl">{moneyPEN(p.total)}</strong>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setDetail(p)}>
                        Ver compra
                      </Button>
                      {!p.stocked_at && (
                        <Button disabled={busy} onClick={() => void startReceiving(p)}>
                          Añadir al inventario
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {view === "suppliers" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {suppliers.map(([key, purchases]) => {
                const p = purchases[0];
                return (
                  <button
                    key={key}
                    className="rounded-xl border border-sand bg-warm-white p-5 text-left transition hover:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => {
                      setSupplier(key);
                      setView("purchases");
                    }}
                  >
                    <Users className="mb-3 h-6 w-6 text-primary" />
                    <h2 className="text-lg font-semibold">{p.supplier_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {p.supplier_ruc ? `RUC ${p.supplier_ruc}` : "Sin RUC registrado"}
                    </p>
                    <p className="mt-2 text-sm">{p.supplier_phone || "Sin teléfono"}</p>
                    <p className="text-sm">{p.supplier_address || "Sin dirección"}</p>
                    <div className="mt-4 flex justify-between border-t pt-3 text-sm">
                      <span>{purchases.length} compras</span>
                      <strong>
                        {moneyPEN(purchases.reduce((total, p) => total + Number(p.total), 0))}
                      </strong>
                    </div>
                    <p className="mt-3 text-sm text-primary">Ver productos y compras →</p>
                  </button>
                );
              })}
            </div>
          )}
          {view === "products" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Precios unitarios históricos en soles. Se comparan productos con el mismo nombre y
                unidad; usa nombres y presentaciones consistentes.
              </p>
              {comparisons.map((group) => (
                <article
                  key={group.name + group.unit}
                  className="overflow-hidden rounded-xl border border-sand bg-warm-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-sand/20 p-5">
                    <div>
                      <h2 className="font-semibold">{group.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Por {group.unit} ·{" "}
                        {new Set(group.offers.map((o) => supplierKey(o.purchase))).size} proveedores
                      </p>
                    </div>
                    <Badge>Menor precio: {moneyPEN(group.offers[0].item.price)}</Badge>
                  </div>
                  <div className="divide-y px-5">
                    {group.offers.map(({ purchase: p, item }, i) => (
                      <button
                        key={`${p.id}-${i}`}
                        onClick={() => setDetail(p)}
                        className="flex w-full items-center gap-3 py-4 text-left hover:bg-sand/10"
                      >
                        <span className="flex-1">
                          <span className="block font-medium">{p.supplier_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.purchased_on} · {item.quantity} {item.unit}
                          </span>
                        </span>
                        <span
                          className={
                            item.price === group.offers[0].item.price
                              ? "font-semibold text-primary"
                              : ""
                          }
                        >
                          {moneyPEN(item.price)}
                        </span>
                        <span className="text-sm">Ver compra →</span>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy && !uploading) setOpen(v);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva compra</DialogTitle>
            <DialogDescription>
              Adjunta la boleta original y completa sus productos. Los archivos se guardan para
              consulta; no se transcriben automáticamente.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <form onSubmit={submit} className="space-y-6">
              <fieldset disabled={busy || uploading} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sand bg-warm-white p-4">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                    <Switch
                      checked={addToStock}
                      disabled={busy || uploading}
                      onCheckedChange={(value) => {
                        setAddToStock(value);
                        if (value) void loadInventory();
                      }}
                    />
                    Añadir al inventario al guardar
                  </label>
                  <Button
                    type="submit"
                    disabled={addToStock && (inventoryLoading || !!inventoryError || !warehouse)}
                  >
                    {busy ? "Guardando…" : uploading ? "Subiendo archivo…" : "Guardar compra"}
                  </Button>
                </div>
                {addToStock && (
                  <div className="space-y-3 rounded-xl border border-sand p-4">
                    <p className="text-sm text-muted-foreground">
                      Autorizas el ingreso al guardar. Selecciona el almacén y vincula cada producto
                      abajo.
                    </p>
                    {inventoryLoading ? (
                      <p role="status">Cargando inventario…</p>
                    ) : inventoryError ? (
                      <div role="alert">
                        <p>{inventoryError}</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void loadInventory()}
                        >
                          Reintentar
                        </Button>
                      </div>
                    ) : (
                      <>
                        <label className="block space-y-2 text-sm">
                          Almacén de destino
                          <select
                            required
                            className={selectStyle}
                            value={warehouse}
                            onChange={(e) => setWarehouse(e.target.value)}
                          >
                            <option value="">Selecciona un almacén</option>
                            {warehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {!warehouses.length && (
                          <p role="alert" className="text-sm text-destructive">
                            Crea un almacén activo o desactiva el ingreso al inventario para guardar
                            solo la compra.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
                {rows.length > 0 && (
                  <label className="block space-y-2 text-sm font-medium">
                    Usar un proveedor registrado
                    <select
                      className={selectStyle}
                      defaultValue=""
                      onChange={(e) => {
                        const previous = rows.find((p) => p.id === e.target.value);
                        if (previous)
                          setForm({
                            ...form,
                            supplier_name: previous.supplier_name,
                            supplier_ruc: previous.supplier_ruc,
                            supplier_phone: previous.supplier_phone,
                            supplier_address: previous.supplier_address,
                          });
                      }}
                    >
                      <option value="" disabled>
                        Selecciona un proveedor o completa los datos abajo
                      </option>
                      {[
                        ...new Map([...rows].reverse().map((p) => [supplierKey(p), p])).values(),
                      ].map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.supplier_name}
                          {p.supplier_ruc ? ` · ${p.supplier_ruc}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["supplier_name", "Nombre del proveedor", "text"],
                      ["supplier_phone", "Teléfono / número de contacto", "tel"],
                      ["supplier_address", "Lugar / dirección", "text"],
                      ["supplier_ruc", "RUC (opcional)", "text"],
                      ["receipt_number", "Número de boleta o factura", "text"],
                      ["purchased_on", "Fecha de compra", "date"],
                    ] as const
                  ).map(([key, label, type]) => (
                    <div key={key} className="space-y-1 text-sm font-medium">
                      <label htmlFor={`purchase-${key}`}>{label}</label>
                      <div className="flex gap-2">
                        <Input
                          id={`purchase-${key}`}
                          type={type}
                          required={key === "supplier_name" || key === "purchased_on"}
                          maxLength={
                            key === "supplier_ruc"
                              ? 11
                              : key === "supplier_address"
                                ? 300
                                : key === "supplier_phone"
                                  ? 40
                                  : key === "receipt_number"
                                    ? 80
                                    : 160
                          }
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        />
                        {key === "supplier_name" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Buscar proveedor de compras anteriores"
                            onClick={() => openLookup("supplier")}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-sand p-4">
                  <label className="block space-y-2 text-sm font-medium">
                    Boleta original (foto o PDF, máximo 10 MB)
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                  </label>
                  <Attachment path={form.receipt_path} />
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Productos de la compra</h3>
                  {form.items.map((item, index) => (
                    <div key={index} className="space-y-3 rounded-xl border border-sand p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Producto {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar producto ${index + 1}`}
                          disabled={form.items.length === 1}
                          onClick={() => {
                            setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
                            setMappings((current) => current.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm">
                        <label htmlFor={`purchase-item-${index}`}>Nombre del producto</label>
                        <div className="flex gap-2">
                          <Input
                            id={`purchase-item-${index}`}
                            required
                            minLength={2}
                            maxLength={160}
                            list="purchase-product-names"
                            value={item.name}
                            onChange={(e) => updateItem(index, { name: e.target.value })}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Buscar producto comprado para la línea ${index + 1}`}
                            onClick={() => openLookup(index)}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <label className="text-sm">
                          Cantidad
                          <Input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            max="999999"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, { quantity: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          Unidad / presentación
                          <Input
                            required
                            maxLength={60}
                            placeholder="unidad, kg, rollo 100 m"
                            value={item.unit}
                            onChange={(e) => updateItem(index, { unit: e.target.value })}
                          />
                        </label>
                        <label className="text-sm">
                          Precio unitario S/
                          <Input
                            required
                            type="number"
                            min="0"
                            max="999999"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(index, { price: Number(e.target.value) })}
                          />
                        </label>
                        <div className="text-sm">
                          Subtotal
                          <p className="py-2 font-semibold">{moneyPEN(purchaseTotal([item]))}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">
                          <Camera className="h-4 w-4" />
                          Tomar foto
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            onChange={(e) => void upload(e.target.files?.[0], index)}
                          />
                        </label>
                        <label className="cursor-pointer text-sm text-primary underline">
                          Subir imagen
                          <input
                            className="sr-only"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => void upload(e.target.files?.[0], index)}
                          />
                        </label>
                        <Attachment path={item.photo_path} image />
                      </div>
                      {addToStock && !inventoryLoading && !inventoryError && mappings[index] && (
                        <div className="space-y-2 border-t pt-3">
                          <InventoryMapping
                            mapping={mappings[index]}
                            products={products}
                            onChange={(mapping) =>
                              setMappings((current) =>
                                current.map((m, i) => (i === index ? mapping : m)),
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Comprueba que la unidad de stock corresponda a {item.unit}. Los
                            productos nuevos se crean ocultos en el catálogo.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  <datalist id="purchase-product-names">
                    {[...new Set(rows.flatMap((p) => p.items.map((i) => i.name)))].map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={form.items.length >= 100}
                    onClick={() => {
                      setForm({ ...form, items: [...form.items, newItem()] });
                      setMappings((current) => [
                        ...current,
                        { product_id: null, presentation_id: null, type: "material" },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Agregar otro producto
                  </Button>
                </div>
                <label className="block text-sm">
                  Notas
                  <Input
                    maxLength={2000}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                  <p className="text-lg font-semibold">
                    Total: {moneyPEN(purchaseTotal(form.items))}
                  </p>
                  <Button
                    type="submit"
                    disabled={addToStock && (inventoryLoading || !!inventoryError || !warehouse)}
                  >
                    {busy ? "Guardando…" : uploading ? "Subiendo archivo…" : "Guardar compra"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  El precio unitario debe incluir los impuestos y descuentos de tu boleta.{" "}
                  {addToStock
                    ? "Al guardar se registrará la compra y se ingresarán sus productos al almacén elegido."
                    : "El inventario no se modificará mientras el interruptor esté desactivado."}
                </p>
              </fieldset>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={lookup !== null}
        onOpenChange={(value) => {
          if (!value) setLookup(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {lookup === "supplier" ? "Buscar proveedor" : "Buscar producto comprado"}
            </DialogTitle>
            <DialogDescription>
              {lookup === "supplier"
                ? "Selecciona un proveedor para completar sus datos de contacto."
                : "Busca en todo tu historial. Se copiarán el nombre, la presentación y el precio; revisa el precio antes de guardar."}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-9"
              aria-label="Buscar en compras anteriores"
              placeholder={
                lookup === "supplier" ? "Nombre, RUC o teléfono…" : "Producto o proveedor…"
              }
              value={lookupSearch}
              onChange={(e) => setLookupSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {lookup === "supplier"
              ? [...new Map([...rows].reverse().map((p) => [supplierKey(p), p])).values()]
                  .filter((p) =>
                    normalizePurchaseText(
                      `${p.supplier_name} ${p.supplier_ruc} ${p.supplier_phone}`,
                    ).includes(normalizePurchaseText(lookupSearch)),
                  )
                  .map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                      onClick={() => {
                        setForm(
                          (f) =>
                            f && {
                              ...f,
                              supplier_name: p.supplier_name,
                              supplier_ruc: p.supplier_ruc,
                              supplier_phone: p.supplier_phone,
                              supplier_address: p.supplier_address,
                            },
                        );
                        setLookup(null);
                      }}
                    >
                      <span>
                        <span className="block font-semibold">{p.supplier_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.supplier_ruc} · {p.supplier_phone} · {p.supplier_address}
                        </span>
                      </span>
                    </Button>
                  ))
              : rows
                  .flatMap((p) => p.items.map((item, i) => ({ p, item, i })))
                  .filter(({ p, item }) =>
                    normalizePurchaseText(`${item.name} ${item.unit} ${p.supplier_name}`).includes(
                      normalizePurchaseText(lookupSearch),
                    ),
                  )
                  .map(({ p, item, i }) => (
                    <Button
                      key={`${p.id}-${i}`}
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-between gap-3 whitespace-normal p-3 text-left"
                      onClick={() => {
                        if (typeof lookup === "number") {
                          updateItem(lookup, {
                            name: item.name,
                            unit: item.unit,
                            price: item.price,
                            photo_path: null,
                          });
                          setMappings((current) =>
                            current.map((m, index) =>
                              index === lookup
                                ? { product_id: null, presentation_id: null, type: "material" }
                                : m,
                            ),
                          );
                        }
                        setLookup(null);
                      }}
                    >
                      <span>
                        <span className="block font-semibold">{item.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.supplier_name} · {p.purchased_on} · {item.unit}
                        </span>
                      </span>
                      <span>{moneyPEN(item.price)}</span>
                    </Button>
                  ))}
            {!rows.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {error
                  ? "No se pudo cargar el historial de compras. Inicia sesión con tu cuenta para consultarlo."
                  : "Todavía no hay compras registradas."}
              </p>
            )}
            {!!rows.length &&
              !rows.some((p) =>
                lookup === "supplier"
                  ? normalizePurchaseText(
                      `${p.supplier_name} ${p.supplier_ruc} ${p.supplier_phone}`,
                    ).includes(normalizePurchaseText(lookupSearch))
                  : p.items.some((item) =>
                      normalizePurchaseText(
                        `${item.name} ${item.unit} ${p.supplier_name}`,
                      ).includes(normalizePurchaseText(lookupSearch)),
                    ),
              ) && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay coincidencias. Prueba con otro nombre.
                </p>
              )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.supplier_name}</DialogTitle>
            <DialogDescription>
              {detail?.purchased_on} · {detail?.receipt_number || "Compra sin número"}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <>
              <p className="text-sm">
                {[
                  detail.supplier_ruc && `RUC ${detail.supplier_ruc}`,
                  detail.supplier_phone,
                  detail.supplier_address,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <Attachment path={detail.receipt_path} />
              {itemList(detail)}
              <p className="text-right text-xl font-semibold">Total: {moneyPEN(detail.total)}</p>
              {detail.notes && <p className="text-sm text-muted-foreground">{detail.notes}</p>}
              {detail.stocked_at ? (
                <Badge variant="secondary">Ingresada al inventario</Badge>
              ) : (
                <Button disabled={busy} onClick={() => void startReceiving(detail)}>
                  Añadir al inventario
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!receiving}
        onOpenChange={(v) => {
          if (!v && !busy) setReceiving(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir compra al inventario</DialogTitle>
            <DialogDescription>
              Vincula cada línea a su producto y presentación. Verifica que la cantidad comprada
              corresponda a esa unidad de stock. Los nuevos productos se crean ocultos en el
              catálogo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={receive} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <label className="block space-y-2 text-sm">
                Almacén de destino
                <select
                  required
                  className={selectStyle}
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                >
                  <option value="">Selecciona un almacén</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              {!warehouses.length && (
                <p role="alert" className="text-sm text-destructive">
                  Crea un almacén activo en Almacenes y stock para continuar.
                </p>
              )}
              {receiving?.items.map((item, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <p className="font-medium">
                    {item.name} · {item.quantity} {item.unit}
                  </p>
                  <label className="block text-sm">
                    Producto de inventario
                    <select
                      className={selectStyle}
                      value={mappings[i]?.product_id ?? `new:${mappings[i]?.type}`}
                      onChange={(e) =>
                        setMappings((current) =>
                          current.map((m, j) =>
                            j !== i
                              ? m
                              : e.target.value.startsWith("new:")
                                ? {
                                    product_id: null,
                                    presentation_id: null,
                                    type: e.target.value.slice(4) as Mapping["type"],
                                  }
                                : { ...m, product_id: e.target.value, presentation_id: null },
                          ),
                        )
                      }
                    >
                      <option value="new:material">Crear nuevo material</option>
                      <option value="new:producto_terminado">Crear nueva pieza</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.type === "material" ? "material" : "pieza"})
                        </option>
                      ))}
                    </select>
                  </label>
                  {!!products.find((p) => p.id === mappings[i]?.product_id)?.presentations
                    ?.length && (
                    <label className="block text-sm">
                      Presentación
                      <select
                        className={selectStyle}
                        value={mappings[i].presentation_id ?? ""}
                        onChange={(e) =>
                          setMappings((current) =>
                            current.map((m, j) =>
                              j === i ? { ...m, presentation_id: e.target.value || null } : m,
                            ),
                          )
                        }
                      >
                        <option value="">Unidad base</option>
                        {products
                          .find((p) => p.id === mappings[i].product_id)
                          ?.presentations.map((p) => (
                            <option key={p.id} value={p.id}>
                              {getPresentationUnitLabel(p.unit, p.label)}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </div>
              ))}
              <Button type="submit" disabled={!warehouse || busy} className="w-full">
                {busy ? "Ingresando…" : "Confirmar ingreso al inventario"}
              </Button>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
