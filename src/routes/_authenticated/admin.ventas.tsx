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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Trash2, CheckCircle2, XCircle, FileText, Pencil, Eye } from "lucide-react";
import {
  PageHeader,
  NewButton,
  useDialog,
  moneyPEN,
  formatDate,
  FormDialog,
} from "@/components/admin-ui";
import {
  adminListSales,
  adminGetSale,
  adminGetReceipt,
  adminCreateSale,
  adminUpdateSale,
  adminAddSaleItem,
  adminDeleteSaleItem,
  adminAddPayment,
  adminDeletePayment,
  adminConfirmSale,
  adminCancelSale,
  adminListCustomers,
} from "@/lib/admin-sales.functions";
import { adminListWarehouses, adminListProducts } from "@/lib/admin.functions";
import { ReceiptPreviewDialog, type ReceiptVariant } from "@/components/admin/receipt-documents";
import { formatUnits } from "@/lib/format-units";
import { getPresentationUnitLabel } from "@/lib/presentation-units";

export const Route = createFileRoute("/_authenticated/admin/ventas")({ component: SalesPage });

const deliveryStatusOptions = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_preparacion", label: "En preparación" },
  { value: "entregado", label: "Entregado" },
  { value: "enviado", label: "Enviado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

function SalesPage() {
  const listFn = useServerFn(adminListSales);
  const create = useServerFn(adminCreateSale);
  const cancel = useServerFn(adminCancelSale);
  const getReceipt = useServerFn(adminGetReceipt);
  const listWh = useServerFn(adminListWarehouses);
  const listCustomers = useServerFn(adminListCustomers);

  const [rows, setRows] = useState<any[]>([]);
  const [wh, setWh] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const newDlg = useDialog();
  const [newForm, setNewForm] = useState<any>({
    warehouse_id: "",
    customer_id: "",
    channel: "Showroom",
    delivery_status: "pendiente",
    notes: "",
  });
  const [receiptPreview, setReceiptPreview] = useState<any>(null);
  const [receiptVariant, setReceiptVariant] = useState<ReceiptVariant>("internal");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setRows(await listFn());
  }
  useEffect(() => {
    refresh();
    listWh().then(setWh);
    listCustomers().then(setCustomers); /* eslint-disable-line */
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await create({
        data: {
          warehouse_id: newForm.warehouse_id,
          customer_id: newForm.customer_id || null,
          channel: newForm.channel,
          notes: newForm.notes || null,
          delivery_status: getDefaultDeliveryStatusForWarehouse(
            wh.find((item) => item.id === newForm.warehouse_id),
            newForm.delivery_status,
          ),
          discount: 0,
        },
      });
      toast.success("Venta creada");
      newDlg.close();
      refresh();
      setOpenId(r.id);
    } catch (e: any) {
      toast.error(
        getActionErrorMessage(
          e,
          "No se pudo crear la venta. Recarga la pagina e intenta nuevamente.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  async function onCancel(r: any) {
    const message =
      r.status === "confirmada"
        ? "¿Anular venta confirmada? Se devolverá el stock al almacén."
        : "¿Anular venta en borrador?";
    if (!confirm(message)) return;
    try {
      await cancel({ data: { id: r.id } });
      toast.success("Venta anulada");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function viewReceipt(id: string, variant: ReceiptVariant) {
    try {
      const receipt = await getReceipt({ data: { id } });
      setReceiptVariant(variant);
      setReceiptPreview(receipt);
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  function selectWarehouseForSale(warehouseId: string) {
    const warehouse = wh.find((item) => item.id === warehouseId);
    setNewForm((form: any) => ({
      ...form,
      warehouse_id: warehouseId,
      channel: isFairWarehouse(warehouse)
        ? "Feria"
        : form.channel === "Feria"
          ? "Showroom"
          : form.channel,
      delivery_status: getDefaultDeliveryStatusForWarehouse(warehouse, form.delivery_status),
    }));
  }

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Registra ventas multicanal (WhatsApp, Instagram, Web, Ferias). Al confirmar se descuenta stock y se emite comprobante."
        actions={
          <NewButton
            onClick={() => {
              setNewForm({
                warehouse_id: wh[0]?.id ?? "",
                customer_id: "",
                channel: isFairWarehouse(wh[0]) ? "Feria" : "Showroom",
                delivery_status: getDefaultDeliveryStatusForWarehouse(wh[0], "pendiente"),
                notes: "",
              });
              newDlg.openWith(null);
            }}
            label="Nueva venta"
          />
        }
      />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Nota de venta</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Sin ventas.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(r.created_at)}
                </TableCell>
                <TableCell>
                  {r.customer?.full_name ?? (
                    <span className="text-muted-foreground">— sin cliente —</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">{r.warehouse?.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      r.status === "confirmada"
                        ? "default"
                        : r.status === "anulada"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.payment_status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.delivery_status}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{moneyPEN(r.total)}</TableCell>
                <TableCell>
                  {getSaleReceipt(r)?.id ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewReceipt(getSaleReceipt(r).id, "note")}
                      >
                        <Eye className="h-3.5 w-3.5" /> Nota de venta
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => setOpenId(r.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {["borrador", "confirmada"].includes(r.status) && (
                    <Button size="icon" variant="ghost" onClick={() => onCancel(r)} title="Anular">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={newDlg.open}
        onOpenChange={newDlg.setOpen}
        title="Nueva venta"
        onSubmit={onCreate}
        submitting={saving}
      >
        <div className="space-y-5">
          <div>
            <Label>Almacén *</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {wh.map((warehouse: any) => {
                const selected = newForm.warehouse_id === warehouse.id;
                return (
                  <button
                    key={warehouse.id}
                    type="button"
                    onClick={() => selectWarehouseForSale(warehouse.id)}
                    className={[
                      "rounded-2xl border p-4 text-left transition shadow-sm",
                      selected
                        ? "border-accent bg-accent text-warm-white shadow-accent/20"
                        : "border-sand bg-warm-white hover:border-accent/60 hover:bg-cream",
                    ].join(" ")}
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-75">
                      {warehouse.code || "Almacén"}
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-snug">{warehouse.name}</div>
                    {isFairWarehouse(warehouse) && (
                      <div
                        className={[
                          "mt-3 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          selected
                            ? "bg-warm-white/20 text-warm-white"
                            : "bg-accent/10 text-accent",
                        ].join(" ")}
                      >
                        Canal Feria
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Canal de venta</Label>
              {isFairWarehouse(wh.find((item) => item.id === newForm.warehouse_id)) ? (
                <Input value="Feria" disabled className="bg-cream/60 font-semibold" />
              ) : (
                <Select
                  value={newForm.channel}
                  onValueChange={(v) => setNewForm((f: any) => ({ ...f, channel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Showroom", "Instagram", "WhatsApp", "Página web", "Facebook", "TikTok"].map(
                      (channel) => (
                        <SelectItem key={channel} value={channel}>
                          {channel}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Cliente</Label>
              <Select
                value={newForm.customer_id || "_none"}
                onValueChange={(v) =>
                  setNewForm((f: any) => ({ ...f, customer_id: v === "_none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="_none">— sin cliente —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={newForm.notes}
                onChange={(e) => setNewForm((f: any) => ({ ...f, notes: e.target.value }))}
                placeholder="Detalle de la venta, pedido o coordinación con el cliente."
              />
            </div>
          </div>
        </div>
      </FormDialog>

      <SaleDrawer
        saleId={openId}
        onClose={() => {
          setOpenId(null);
          refresh();
        }}
        customers={customers}
        warehouses={wh}
        onViewReceipt={viewReceipt}
      />

      <ReceiptPreviewDialog
        receipt={receiptPreview}
        open={!!receiptPreview}
        onOpenChange={(open) => !open && setReceiptPreview(null)}
        initialVariant={receiptVariant}
        noteOnly
      />
    </div>
  );
}

function isFairWarehouse(warehouse?: any) {
  const text = `${warehouse?.code ?? ""} ${warehouse?.name ?? ""}`
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return text.includes("feria") || text.split(/\s+/).includes("fe");
}

function getDefaultDeliveryStatusForWarehouse(warehouse?: any, current = "pendiente") {
  return isFairWarehouse(warehouse) ? "cancelado" : current || "pendiente";
}

function normalizeSaleSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildSaleItemOptions(products: any[]) {
  return products.flatMap((product) => {
    const presentations =
      product.type === "material" ? (product.presentations ?? []).filter(Boolean) : [];

    if (presentations.length > 0) {
      return presentations.map((presentation: any, index: number) => {
        const presentationLabel = formatSalePresentationLabel(presentation);
        const presentationSku = presentation.sku || product.sku || "";
        return {
          value: `presentation:${product.id}:${presentation.id ?? presentationSku ?? index}`,
          product_id: product.id,
          presentation_id: presentation.id ?? null,
          label: `${product.name} - ${presentationLabel}`,
          sku: presentationSku,
          price: Number(presentation.price ?? product.price ?? 0),
          description: `Presentación: ${presentationLabel}${
            presentationSku ? ` · SKU ${presentationSku}` : ""
          }`,
          searchText: `${product.name ?? ""} ${product.sku ?? ""} ${presentationSku} ${
            presentation.label ?? ""
          } ${presentation.unit ?? ""} ${getPresentationUnitLabel(
            presentation.unit,
            presentation.label,
          )}`,
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
        price: Number(product.price ?? 0),
        description: "",
        searchText: `${product.name ?? ""} ${product.sku ?? ""}`,
      },
    ];
  });
}

function formatSalePresentationLabel(presentation: any) {
  return getPresentationUnitLabel(presentation.unit, presentation.label);
}

function getSaleItemPresentationLabel(item: any) {
  if (item.presentation) {
    return getPresentationUnitLabel(item.presentation.unit, item.presentation.label);
  }
  const description = String(item.description ?? "").trim();
  if (!description.toLowerCase().startsWith("presentaci")) return "";
  return description.split(":").slice(1).join(":").split("·")[0]?.trim() ?? "";
}

function getSaleItemDescription(item: any) {
  const description = String(item.description ?? "").trim();
  if (!description || description.toLowerCase().startsWith("presentaci")) return "";
  return description;
}

function getSaleReceipt(sale: any) {
  const receipt = sale?.receipt;
  return Array.isArray(receipt) ? receipt[0] : receipt;
}

function getActionErrorMessage(error: any, fallback: string) {
  const message = String(error?.message ?? error ?? "");
  if (message.includes("<!doctype html") || message.includes("This page didn't load")) {
    return fallback;
  }
  return message || fallback;
}

function SaleDrawer({
  saleId,
  onClose,
  customers,
  warehouses,
  onViewReceipt,
}: {
  saleId: string | null;
  onClose: () => void;
  customers: any[];
  warehouses: any[];
  onViewReceipt: (id: string, variant: ReceiptVariant) => void;
}) {
  const getSale = useServerFn(adminGetSale);
  const update = useServerFn(adminUpdateSale);
  const addItem = useServerFn(adminAddSaleItem);
  const delItem = useServerFn(adminDeleteSaleItem);
  const addPay = useServerFn(adminAddPayment);
  const delPay = useServerFn(adminDeletePayment);
  const confirm_ = useServerFn(adminConfirmSale);
  const listProducts = useServerFn(adminListProducts);

  const [sale, setSale] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [item, setItem] = useState<any>({
    product_option: "",
    product_id: "",
    presentation_id: null,
    product_search: "",
    quantity: 1,
    unit_price: 0,
    discount: 0,
    description: "",
  });
  const [pay, setPay] = useState<any>({ method: "efectivo", amount: 0, operation_code: "" });

  async function refresh() {
    if (!saleId) return;
    const s = await getSale({ data: { id: saleId } });
    setSale(s);
  }
  useEffect(() => {
    if (saleId) {
      refresh();
      Promise.all([
        listProducts({ data: { type: "producto_terminado" } }),
        listProducts({ data: { type: "material" } }),
        listProducts({ data: { type: "kit" } }),
      ]).then((arr) => setProducts(arr.flat()));
    } /* eslint-disable-line */
  }, [saleId]);
  const saleItemOptions = useMemo(() => buildSaleItemOptions(products), [products]);
  const filteredProducts = useMemo(() => {
    const q = normalizeSaleSearch(item.product_search ?? "");
    return saleItemOptions.filter((product) => {
      const searchable = normalizeSaleSearch(product.searchText);
      return !q || searchable.includes(q);
    });
  }, [item.product_search, saleItemOptions]);

  async function onSaveHeader() {
    try {
      await update({
        data: {
          id: sale.id,
          warehouse_id: sale.warehouse_id,
          customer_id: sale.customer_id,
          discount: Number(sale.discount),
          notes: sale.notes,
          delivery_status: sale.delivery_status,
        },
      });
      toast.success("Actualizado");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function onAddItem() {
    if (!item.product_id || !item.quantity || !item.unit_price)
      return toast.error("Completa pieza o material, cantidad y precio");
    try {
      await addItem({
        data: {
          sale_id: sale.id,
          product_id: item.product_id,
          presentation_id: item.presentation_id || null,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          discount: Number(item.discount ?? 0),
          description: item.description || null,
        },
      });
      setItem({
        product_option: "",
        product_id: "",
        presentation_id: null,
        product_search: "",
        quantity: 1,
        unit_price: 0,
        discount: 0,
        description: "",
      });
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function onDelItem(id: string) {
    try {
      await delItem({ data: { id } });
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function onAddPay() {
    if (!pay.amount) return toast.error("Indica un monto");
    try {
      await addPay({
        data: {
          sale_id: sale.id,
          method: pay.method,
          amount: Number(pay.amount),
          operation_code: pay.operation_code || null,
        },
      });
      setPay({ method: "efectivo", amount: 0, operation_code: "" });
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function onDelPay(id: string) {
    try {
      await delPay({ data: { id } });
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function onConfirm() {
    if (!confirm("¿Confirmar venta? Se descontará stock y se emitirá comprobante.")) return;
    try {
      const r = await confirm_({ data: { id: sale.id } });
      toast.success(`Comprobante emitido: ${r?.[0]?.receipt_number ?? ""}`);
      const updatedSale = await getSale({ data: { id: sale.id } });
      setSale(updatedSale);
      const receiptId = getSaleReceipt(updatedSale)?.id;
      if (receiptId) {
        onClose();
        onViewReceipt(receiptId, "note");
      } else {
        refresh();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function selectSaleItemOption(optionValue: string) {
    const option = saleItemOptions.find((entry) => entry.value === optionValue);
    if (!option) return;
    setItem((current: any) => ({
      ...current,
      product_option: option.value,
      product_id: option.product_id,
      presentation_id: option.presentation_id ?? null,
      unit_price: option.price,
      description: option.description,
    }));
  }

  return (
    <Sheet open={!!saleId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        {sale && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">
                Venta {getSaleReceipt(sale)?.number ?? sale.id.slice(0, 8)}
              </SheetTitle>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={sale.status === "confirmada" ? "default" : "outline"}>
                  {sale.status}
                </Badge>
                <Badge variant="secondary">pago: {sale.payment_status}</Badge>
                <Badge variant="outline">entrega: {sale.delivery_status}</Badge>
                {getSaleReceipt(sale) && <Badge>Comprobante {getSaleReceipt(sale).number}</Badge>}
              </div>
            </SheetHeader>

            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div>
                <Label>Cliente</Label>
                <Select
                  disabled={sale.status !== "borrador"}
                  value={sale.customer_id || "_none"}
                  onValueChange={(v) =>
                    setSale((s: any) => ({ ...s, customer_id: v === "_none" ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="_none">— sin cliente —</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Almacén</Label>
                <Select
                  disabled={sale.status !== "borrador"}
                  value={sale.warehouse_id}
                  onValueChange={(v) => {
                    const warehouse = warehouses.find((item) => item.id === v);
                    setSale((s: any) => ({
                      ...s,
                      warehouse_id: v,
                      delivery_status: getDefaultDeliveryStatusForWarehouse(
                        warehouse,
                        s.delivery_status,
                      ),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descuento (S/)</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={sale.status !== "borrador"}
                  value={sale.discount ?? 0}
                  onChange={(e) => setSale((s: any) => ({ ...s, discount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Estado entrega</Label>
                <Select
                  value={sale.delivery_status}
                  onValueChange={(v) => setSale((s: any) => ({ ...s, delivery_status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryStatusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Notas</Label>
                <Textarea
                  rows={2}
                  value={sale.notes ?? ""}
                  onChange={(e) => setSale((s: any) => ({ ...s, notes: e.target.value }))}
                />
              </div>
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={onSaveHeader}>
              Guardar cambios
            </Button>

            <div className="mt-8">
              <h3 className="font-display text-lg mb-2">Ítems</h3>
              <div className="border border-sand/60 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pieza</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">P. unit</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sale.items ?? []).map((it: any) => {
                      const presentationLabel = getSaleItemPresentationLabel(it);
                      const itemDescription = getSaleItemDescription(it);
                      return (
                        <TableRow key={it.id}>
                          <TableCell>
                            {it.product?.name}
                            {presentationLabel && (
                              <div className="text-xs font-medium text-muted-foreground">
                                {presentationLabel}
                              </div>
                            )}
                            {itemDescription && (
                              <div className="text-xs text-muted-foreground">{itemDescription}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatUnits(it.quantity)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {moneyPEN(it.unit_price)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {moneyPEN(it.subtotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            {sale.status === "borrador" && (
                              <Button size="icon" variant="ghost" onClick={() => onDelItem(it.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(sale.items ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-6 text-sm"
                        >
                          Sin ítems aún.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {sale.status === "borrador" && (
                <div className="grid grid-cols-12 gap-2 mt-3 items-end">
                  <div className="col-span-12 sm:col-span-4">
                    <Label className="text-xs">
                      Buscar pieza, material o presentación por SKU o nombre
                    </Label>
                    <Input
                      value={item.product_search}
                      onChange={(e) =>
                        setItem((s: any) => ({ ...s, product_search: e.target.value }))
                      }
                      placeholder="Ej. 0001 o camino de mesa"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <Label className="text-xs">Pieza, material o presentación</Label>
                    <Select
                      value={item.product_option}
                      onValueChange={(v) => selectSaleItemOption(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {filteredProducts.map((p) => (
                          <SelectItem key={p.value} value={p.value} textValue={p.label}>
                            <span className="flex flex-col gap-0.5">
                              <span>{p.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {p.sku || "Sin SKU"} · {moneyPEN(p.price)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Sin piezas, materiales o presentaciones para esa búsqueda.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <Label className="text-xs">Cant.</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => setItem((s: any) => ({ ...s, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Label className="text-xs">P. unit (S/)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => setItem((s: any) => ({ ...s, unit_price: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Button onClick={onAddItem} className="w-full">
                      <Plus className="h-4 w-4" /> Agregar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-display text-lg mb-2">Pagos</h3>
                <div className="space-y-2">
                  {(sale.payments ?? []).map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border border-sand/50 rounded-md px-3 py-2"
                    >
                      <div className="text-sm">
                        <div className="font-medium">
                          {moneyPEN(p.amount)} · {p.method}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.operation_code ?? "—"}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => onDelPay(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(sale.payments ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin pagos registrados.</p>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-2 mt-3 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Método</Label>
                    <Select
                      value={pay.method}
                      onValueChange={(v) => setPay((s: any) => ({ ...s, method: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["efectivo", "yape", "plin", "transferencia", "tarjeta", "otro"].map(
                          (m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Monto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={pay.amount}
                      onChange={(e) => setPay((s: any) => ({ ...s, amount: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Button onClick={onAddPay} className="w-full">
                      <Plus className="h-4 w-4" /> Pago
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-cream/40 border border-sand/60 rounded-xl p-4 self-start">
                <div className="flex justify-between text-sm py-1">
                  <span>Subtotal</span>
                  <span>{moneyPEN(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span>Descuento</span>
                  <span>- {moneyPEN(sale.discount)}</span>
                </div>
                <div className="flex justify-between text-lg py-2 border-t border-sand/60 mt-1 font-display">
                  <span>Total</span>
                  <span>{moneyPEN(sale.total)}</span>
                </div>
                {sale.status === "borrador" && (sale.items ?? []).length > 0 && (
                  <Button variant="hero" className="w-full mt-3" onClick={onConfirm}>
                    <CheckCircle2 className="h-4 w-4" /> Confirmar y emitir
                  </Button>
                )}
                {getSaleReceipt(sale)?.id && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onViewReceipt(getSaleReceipt(sale).id, "note")}
                    >
                      <FileText className="h-4 w-4" /> Nota de venta
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
