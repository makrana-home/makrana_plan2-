import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Pencil,
  Eye,
  CalendarDays,
  Clock3,
} from "lucide-react";
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
  adminUpsertCustomer,
} from "@/lib/admin-sales.functions";
import { adminListWarehouses, adminListProducts } from "@/lib/admin.functions";
import { ReceiptPreviewDialog, type ReceiptVariant } from "@/components/admin/receipt-documents";
import { buildQuotationReceipt } from "@/lib/quotation-receipts";
import { formatUnits } from "@/lib/format-units";
import { getPresentationUnitLabel } from "@/lib/presentation-units";
import { formatCalendarDate, limaLocalToUtc } from "@/lib/calendar-utils";
import { adminQuickScheduleSaleEvent } from "@/lib/admin-calendar.functions";
import {
  getChannelFromSaleNotes,
  getCleanSaleNotes,
  getManualCustomerNameFromSaleNotes,
  getSaleCustomerDisplayName,
} from "@/lib/sale-notes";

export const Route = createFileRoute("/_authenticated/admin/ventas")({ component: SalesPage });

const deliveryStatusOptions = [
  { value: "pendiente", label: "Pendiente", dotClass: "bg-rose-600" },
  { value: "en_preparacion", label: "En preparación", dotClass: "bg-violet-600" },
  { value: "enviado", label: "Enviado", dotClass: "bg-blue-600" },
  { value: "entregado", label: "Entregado", dotClass: "bg-emerald-600" },
] as const;

const PROVISIONAL_SOURCE = "feria_provisional";
const internalDocumentButtonClass =
  "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-cream hover:text-foreground";
const saleNoteButtonClass =
  "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900";
const quotationButtonClass =
  "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900";

function blankSaleItem(keepManualMode = false) {
  return {
    product_option: "",
    product_id: "",
    presentation_id: null,
    product_search: "",
    is_manual_item: keepManualMode,
    manual_item_name: "",
    quantity: 1,
    unit_price: "",
    discount: "",
    description: "",
  };
}

function blankPayment() {
  return { method: "efectivo", amount: "", operation_code: "" };
}

function parsePositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeNumber(value: unknown) {
  if (value === "" || value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function getSaleConfirmationError(error: unknown) {
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();

  if (message.includes("stock insuficiente")) {
    return "No se puede emitir la nota porque uno o más artículos no tienen stock suficiente en el almacén seleccionado.";
  }
  if (message.includes("forbidden")) {
    return "Tu usuario no tiene permiso de administrador o ventas para emitir notas.";
  }
  if (message.includes("venta no tiene items")) {
    return "Agrega al menos un artículo antes de confirmar y emitir la nota.";
  }
  if (
    message.includes("ambiguous") ||
    message.includes("schema cache") ||
    message.includes("confirm_sale")
  ) {
    return "La función de emisión de notas requiere actualizarse en Supabase.";
  }

  return (error as any)?.message ?? "No se pudo confirmar ni emitir la nota de venta.";
}

function SalesPage() {
  const listFn = useServerFn(adminListSales);
  const create = useServerFn(adminCreateSale);
  const cancel = useServerFn(adminCancelSale);
  const getSale = useServerFn(adminGetSale);
  const getReceipt = useServerFn(adminGetReceipt);
  const listWh = useServerFn(adminListWarehouses);
  const listCustomers = useServerFn(adminListCustomers);
  const upsertCustomer = useServerFn(adminUpsertCustomer);

  const [rows, setRows] = useState<any[]>([]);
  const [documentFilter, setDocumentFilter] = useState<"all" | "quote" | "note">("all");
  const [wh, setWh] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const newDlg = useDialog();
  const [newForm, setNewForm] = useState<any>({
    warehouse_id: "",
    customer_id: "",
    manual_customer_name: "",
    channel: "Showroom",
    delivery_status: "pendiente",
    notes: "",
  });
  const [receiptPreview, setReceiptPreview] = useState<any>(null);
  const [receiptVariant, setReceiptVariant] = useState<ReceiptVariant>("internal");
  const [saving, setSaving] = useState(false);
  const customerDlg = useDialog();
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    document: "",
  });
  const filteredRows = useMemo(
    () =>
      rows.filter((sale) => {
        const hasSaleNote = Boolean(getSaleReceipt(sale)?.id);
        if (documentFilter === "note") return hasSaleNote;
        if (documentFilter === "quote") return !hasSaleNote;
        return true;
      }),
    [documentFilter, rows],
  );

  async function refresh() {
    setRows(await listFn());
  }
  useEffect(() => {
    refresh();
    listWh().then(setWh);
    listCustomers().then(setCustomers); /* eslint-disable-line */
    const linkedSale = new URLSearchParams(window.location.search).get("sale");
    if (linkedSale) {
      setOpenId(linkedSale);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await create({
        data: {
          warehouse_id: newForm.warehouse_id,
          customer_id: newForm.customer_id || null,
          manual_customer_name: newForm.manual_customer_name || null,
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
  async function onCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setCustomerSaving(true);
    try {
      const created = await upsertCustomer({ data: customerForm });
      const updatedCustomers = await listCustomers();
      setCustomers(updatedCustomers);
      setNewForm((form: any) => ({
        ...form,
        customer_id: created.id,
        manual_customer_name: "",
      }));
      customerDlg.close();
      toast.success("Cliente agregado y seleccionado");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo agregar el cliente");
    } finally {
      setCustomerSaving(false);
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
  async function viewQuotation(saleId: string) {
    try {
      const sale = await getSale({ data: { id: saleId } });
      previewQuotationFromSale(sale);
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  function previewQuotationFromSale(sale: any) {
    setReceiptVariant("quote");
    setReceiptPreview(buildQuotationReceipt(sale));
  }
  async function viewInternalDocument(saleId: string) {
    try {
      const sale = await getSale({ data: { id: saleId } });
      setReceiptVariant("internal");
      setReceiptPreview(buildQuotationReceipt(sale));
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
                manual_customer_name: "",
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={documentFilter === "all" ? "default" : "outline"}
          onClick={() => setDocumentFilter("all")}
        >
          Todos ({rows.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={
            documentFilter === "quote"
              ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100"
              : quotationButtonClass
          }
          onClick={() => setDocumentFilter("quote")}
        >
          <FileText className="h-3.5 w-3.5" />
          Cotizaciones ({rows.filter((sale) => !getSaleReceipt(sale)?.id).length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={
            documentFilter === "note"
              ? "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
              : saleNoteButtonClass
          }
          onClick={() => setDocumentFilter("note")}
        >
          <Eye className="h-3.5 w-3.5" />
          Notas de venta ({rows.filter((sale) => getSaleReceipt(sale)?.id).length})
        </Button>
      </div>

      <div className="grid gap-3 md:hidden">
        {filteredRows.length === 0 && (
          <div className="rounded-xl border border-sand/60 bg-warm-white px-4 py-8 text-center text-sm text-muted-foreground">
            No hay documentos en este filtro.
          </div>
        )}
        {filteredRows.map((r) => (
          <SaleMobileCard
            key={r.id}
            sale={r}
            onOpen={() => setOpenId(r.id)}
            onCancel={() => onCancel(r)}
            onViewReceipt={(id) => viewReceipt(id, "note")}
            onViewQuotation={(id) => viewQuotation(id)}
            onViewInternal={(id) => viewInternalDocument(id)}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-sand/60 bg-warm-white md:block">
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="min-w-[265px]">Documentos</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No hay documentos en este filtro.
                </TableCell>
              </TableRow>
            )}
            {filteredRows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(r.created_at)}
                </TableCell>
                <TableCell>
                  {getSaleCustomerDisplayName(r, "") || (
                    <span className="text-muted-foreground">— sin cliente —</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {r.creator?.full_name || r.creator?.email || "No registrado"}
                </TableCell>
                <TableCell className="text-xs">{r.warehouse?.name}</TableCell>
                <TableCell>
                  <SaleStatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  {r.status === "borrador" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <PaymentStatusBadge status={r.payment_status} />
                  )}
                </TableCell>
                <TableCell>
                  {r.status === "borrador" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <DeliveryStatusBadge status={r.delivery_status} />
                  )}
                </TableCell>
                <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                  <span className="line-clamp-2" title={getCleanSaleNotes(r.notes)}>
                    {getCleanSaleNotes(r.notes) || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{moneyPEN(r.total)}</TableCell>
                <TableCell>
                  <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className={internalDocumentButtonClass}
                      onClick={() => viewInternalDocument(r.id)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Interno
                    </Button>
                    {getSaleReceipt(r)?.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className={saleNoteButtonClass}
                        onClick={() => viewReceipt(getSaleReceipt(r).id, "note")}
                      >
                        <Eye className="h-3.5 w-3.5" /> Nota de venta
                      </Button>
                    ) : null}
                    {!getSaleReceipt(r)?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={quotationButtonClass}
                        onClick={() => viewQuotation(r.id)}
                      >
                        <FileText className="h-3.5 w-3.5" /> Cotización
                      </Button>
                    )}
                  </div>
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
                            : "bg-accent/10 text-brand-terracotta",
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
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <Label>Cliente</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-brand-terracotta hover:bg-accent/10 hover:text-brand-terracotta"
                  onClick={() => {
                    setCustomerForm({ full_name: "", phone: "", email: "", document: "" });
                    customerDlg.openWith(null);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar cliente
                </Button>
              </div>
              <Select
                value={newForm.customer_id || "_none"}
                onValueChange={(v) =>
                  setNewForm((f: any) => ({
                    ...f,
                    customer_id: v === "_none" ? "" : v,
                    manual_customer_name: v === "_none" ? f.manual_customer_name : "",
                  }))
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
              <Label>Cliente manual</Label>
              <Input
                value={newForm.manual_customer_name}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewForm((f: any) => ({
                    ...f,
                    customer_id: value.trim() ? "" : f.customer_id,
                    manual_customer_name: value,
                  }));
                }}
                placeholder="Nombre para cotizacion"
              />
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

      <FormDialog
        open={customerDlg.open}
        onOpenChange={customerDlg.setOpen}
        title="Agregar cliente"
        onSubmit={onCreateCustomer}
        submitting={customerSaving}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="sale_customer_name">Nombres y apellidos *</Label>
            <Input
              id="sale_customer_name"
              required
              minLength={2}
              maxLength={160}
              value={customerForm.full_name}
              onChange={(e) => setCustomerForm((form) => ({ ...form, full_name: e.target.value }))}
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <Label htmlFor="sale_customer_phone">Teléfono</Label>
            <Input
              id="sale_customer_phone"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm((form) => ({ ...form, phone: e.target.value }))}
              placeholder="999 999 999"
            />
          </div>
          <div>
            <Label htmlFor="sale_customer_document">DNI / RUC</Label>
            <Input
              id="sale_customer_document"
              value={customerForm.document}
              onChange={(e) => setCustomerForm((form) => ({ ...form, document: e.target.value }))}
              placeholder="Documento"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sale_customer_email">Correo</Label>
            <Input
              id="sale_customer_email"
              type="email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm((form) => ({ ...form, email: e.target.value }))}
              placeholder="cliente@correo.com"
            />
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
        onViewQuotation={previewQuotationFromSale}
        onViewInternal={(sale) => {
          setReceiptVariant("internal");
          setReceiptPreview(buildQuotationReceipt(sale));
        }}
      />

      <ReceiptPreviewDialog
        receipt={receiptPreview}
        open={!!receiptPreview}
        onOpenChange={(open) => !open && setReceiptPreview(null)}
        initialVariant={receiptVariant}
        variantOnly
      />
    </div>
  );
}

function SaleMobileCard({
  sale,
  onOpen,
  onCancel,
  onViewReceipt,
  onViewQuotation,
  onViewInternal,
}: {
  sale: any;
  onOpen: () => void;
  onCancel: () => void;
  onViewReceipt: (receiptId: string) => void;
  onViewQuotation: (saleId: string) => void;
  onViewInternal: (saleId: string) => void;
}) {
  const receipt = getSaleReceipt(sale);
  return (
    <article className="rounded-xl border border-sand/60 bg-warm-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</p>
          <h2 className="mt-1 truncate text-base font-semibold">
            {getSaleCustomerDisplayName(sale, "Sin cliente")}
          </h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {sale.warehouse?.name ?? "Sin almacen"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Creado por: {sale.creator?.full_name || sale.creator?.email || "No registrado"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold tabular-nums">{moneyPEN(sale.total)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <SaleStatusBadge status={sale.status} />
        {sale.status !== "borrador" && (
          <>
            <PaymentStatusBadge status={sale.payment_status} />
            <DeliveryStatusBadge status={sale.delivery_status} />
          </>
        )}
      </div>
      {getCleanSaleNotes(sale.notes) && (
        <p className="mt-3 text-sm text-muted-foreground">{getCleanSaleNotes(sale.notes)}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={onOpen}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
        {receipt?.id ? (
          <Button
            type="button"
            variant="outline"
            className={`h-11 ${saleNoteButtonClass}`}
            onClick={() => onViewReceipt(receipt.id)}
          >
            <Eye className="h-4 w-4" /> Nota
          </Button>
        ) : (
          <Button type="button" variant="outline" className="h-11" disabled>
            <FileText className="h-4 w-4" /> Nota
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className={`h-11 ${internalDocumentButtonClass}`}
          onClick={() => onViewInternal(sale.id)}
        >
          <Eye className="h-4 w-4" /> Interno
        </Button>
        {!receipt?.id && (
          <Button
            type="button"
            variant="outline"
            className={`h-11 ${quotationButtonClass}`}
            onClick={() => onViewQuotation(sale.id)}
          >
            <FileText className="h-4 w-4" /> Cotización
          </Button>
        )}
        {["borrador", "confirmada"].includes(sale.status) && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-destructive"
            onClick={onCancel}
          >
            <XCircle className="h-4 w-4" /> Anular
          </Button>
        )}
      </div>
    </article>
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
  if (isFairWarehouse(warehouse) || current === "cancelado") return "entregado";
  return current || "pendiente";
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
  if (isManualSaleItem(item)) return "";
  if (item.presentation) {
    return getPresentationUnitLabel(item.presentation.unit, item.presentation.label);
  }
  const description = String(item.description ?? "").trim();
  if (!description.toLowerCase().startsWith("presentaci")) return "";
  return description.split(":").slice(1).join(":").split("·")[0]?.trim() ?? "";
}

function isManualSaleItem(item: any) {
  return Boolean(item.is_manual_item || (!item.product_id && !item.product));
}

function getSaleItemName(item: any) {
  const name =
    item.product?.name ??
    item.manual_item_name ??
    (isManualSaleItem(item) ? String(item.description ?? "").trim() : "");
  return name || "Articulo manual";
}

function getSaleItemDescription(item: any) {
  const description = String(item.description ?? "").trim();
  if (!description || description.toLowerCase().startsWith("presentaci")) return "";
  if (isManualSaleItem(item) && description === getSaleItemName(item)) return "";
  return description;
}

function getSaleReceipt(sale: any) {
  const receipt = sale?.receipt;
  return Array.isArray(receipt) ? receipt[0] : receipt;
}

function SaleStatusBadge({ status }: { status: string }) {
  if (status === "confirmada") {
    return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Venta</Badge>;
  }
  if (status === "borrador") {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-800">Cotización</Badge>;
  }
  return <Badge variant={status === "anulada" ? "destructive" : "outline"}>{status}</Badge>;
}

function PaymentStatusBadge({ status }: { status?: string | null }) {
  if (status === "pagado") {
    return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Pagado</Badge>;
  }
  if (status === "pendiente") {
    return <Badge className="border-rose-200 bg-rose-100 text-rose-800">Pendiente</Badge>;
  }
  if (status === "parcial") {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-800">Parcial</Badge>;
  }
  return (
    <Badge className="border-sand bg-cream text-muted-foreground">{status || "Sin pago"}</Badge>
  );
}

function DeliveryStatusBadge({ status }: { status?: string | null }) {
  const normalized = status === "cancelado" ? "entregado" : status || "pendiente";
  const styles: Record<string, string> = {
    pendiente: "border-rose-200 bg-rose-50 text-rose-800",
    en_preparacion: "border-violet-200 bg-violet-50 text-violet-800",
    enviado: "border-blue-200 bg-blue-50 text-blue-800",
    entregado: "border-emerald-200 bg-emerald-100 text-emerald-800",
  };
  const label =
    deliveryStatusOptions.find((option) => option.value === normalized)?.label ?? normalized;
  return <Badge className={styles[normalized] ?? ""}>{label}</Badge>;
}

function getDeliverySelectClass(status?: string | null) {
  const normalized = status === "cancelado" ? "entregado" : status;
  if (normalized === "entregado") return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (normalized === "enviado") return "border-blue-300 bg-blue-50 text-blue-900";
  if (normalized === "en_preparacion") return "border-violet-300 bg-violet-50 text-violet-900";
  return "border-rose-300 bg-rose-50 text-rose-900";
}

function getActionErrorMessage(error: any, fallback: string) {
  const message = String(error?.message ?? error ?? "");
  if (message.includes("<!doctype html") || message.includes("This page didn't load")) {
    return fallback;
  }
  return message || fallback;
}

function prepareSaleForEdit(sale: any) {
  return {
    ...sale,
    delivery_status: sale?.delivery_status === "cancelado" ? "entregado" : sale?.delivery_status,
    channel: getChannelFromSaleNotes(sale?.notes),
    manual_customer_name: getManualCustomerNameFromSaleNotes(sale?.notes),
    notes: getCleanSaleNotes(sale?.notes),
  };
}

function SaleDrawer({
  saleId,
  onClose,
  customers,
  warehouses,
  onViewReceipt,
  onViewQuotation,
  onViewInternal,
}: {
  saleId: string | null;
  onClose: () => void;
  customers: any[];
  warehouses: any[];
  onViewReceipt: (id: string, variant: ReceiptVariant) => void;
  onViewQuotation: (sale: any) => void;
  onViewInternal: (sale: any) => void;
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
  const [item, setItem] = useState<any>(() => blankSaleItem());
  const [pay, setPay] = useState<any>(() => blankPayment());

  async function refresh() {
    if (!saleId) return;
    const s = await getSale({ data: { id: saleId } });
    setSale(prepareSaleForEdit(s));
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
          manual_customer_name: sale.manual_customer_name || null,
          channel: sale.channel,
          discount: Number(sale.discount),
          notes: sale.notes,
          delivery_status: sale.delivery_status,
          estimated_completion_at: sale.estimated_completion_at || null,
        },
      });
      toast.success("Actualizado");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function onAddItem() {
    const quantity = parsePositiveNumber(item.quantity);
    const unitPrice = parsePositiveNumber(item.unit_price);
    const discount = parseNonNegativeNumber(item.discount);
    const manualItemName = String(item.manual_item_name ?? "").trim();
    const itemDescription = String(item.description ?? "").trim();

    if (!quantity) return toast.error("Indica una cantidad mayor a 0.");
    if (!unitPrice) return toast.error("Indica un precio unitario mayor a 0.");
    if (discount === null) return toast.error("El descuento no es valido.");
    if (item.is_manual_item && !manualItemName) {
      return toast.error("Ingresa el nombre del articulo manual.");
    }
    if (!item.is_manual_item && !item.product_id) {
      return toast.error("Selecciona una pieza, material o presentacion.");
    }

    try {
      const payload: any = {
        sale_id: sale.id,
        quantity,
        unit_price: unitPrice,
        discount,
      };

      if (item.is_manual_item) {
        payload.product_id = null;
        payload.presentation_id = null;
        payload.is_manual_item = true;
        payload.manual_item_name = manualItemName;
        payload.provisional_source = PROVISIONAL_SOURCE;
        payload.description = itemDescription || manualItemName;
      } else {
        payload.product_id = item.product_id;
        payload.presentation_id = item.presentation_id || null;
        payload.description = itemDescription || null;
      }

      await addItem({
        data: payload,
      });
      setItem(blankSaleItem(Boolean(item.is_manual_item)));
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
    const amount = parsePositiveNumber(pay.amount);
    if (!amount) return toast.error("Indica un monto mayor a 0.");
    try {
      await addPay({
        data: {
          sale_id: sale.id,
          method: pay.method,
          amount,
          operation_code: pay.operation_code || null,
        },
      });
      setPay(blankPayment());
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
      setSale(prepareSaleForEdit(updatedSale));
      const receiptId = getSaleReceipt(updatedSale)?.id;
      if (receiptId) {
        onClose();
        onViewReceipt(receiptId, "note");
      } else {
        refresh();
      }
    } catch (e: any) {
      toast.error(getSaleConfirmationError(e));
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
      unit_price: option.price > 0 ? String(option.price) : "",
      description: "",
    }));
  }

  return (
    <Dialog open={!!saleId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto overflow-x-hidden rounded-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100vw-3rem)] sm:px-6 lg:px-8">
        {sale && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 text-left font-display text-xl sm:text-2xl">
                Pedido {sale.quote_number ?? getSaleReceipt(sale)?.number ?? sale.id.slice(0, 8)}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={sale.status === "confirmada" ? "default" : "outline"}>
                  {sale.status}
                </Badge>
                {sale.status !== "borrador" && (
                  <>
                    <PaymentStatusBadge status={sale.payment_status} />
                    <DeliveryStatusBadge status={sale.delivery_status} />
                  </>
                )}
                {getSaleReceipt(sale) && <Badge>Comprobante {getSaleReceipt(sale).number}</Badge>}
              </div>
            </DialogHeader>

            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div>
                <Label>Cliente</Label>
                <Select
                  disabled={sale.status !== "borrador"}
                  value={sale.customer_id || "_none"}
                  onValueChange={(v) =>
                    setSale((s: any) => ({
                      ...s,
                      customer_id: v === "_none" ? null : v,
                      manual_customer_name: v === "_none" ? s.manual_customer_name : "",
                    }))
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
                <Label>Cliente manual</Label>
                <Input
                  disabled={sale.status !== "borrador"}
                  value={sale.manual_customer_name ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSale((s: any) => ({
                      ...s,
                      customer_id: value.trim() ? null : s.customer_id,
                      manual_customer_name: value,
                    }));
                  }}
                  placeholder="Nombre para cotizacion"
                />
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
                  value={Number(sale.discount ?? 0) === 0 ? "" : sale.discount}
                  placeholder="0.00"
                  inputMode="decimal"
                  onChange={(e) => setSale((s: any) => ({ ...s, discount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Estado de entrega *</Label>
                <Select
                  required
                  value={sale.delivery_status}
                  onValueChange={(v) => setSale((s: any) => ({ ...s, delivery_status: v }))}
                >
                  <SelectTrigger className={getDeliverySelectClass(sale.delivery_status)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryStatusOptions.map((status) => (
                      <SelectItem
                        key={status.value}
                        value={status.value}
                        className="data-[state=checked]:bg-cream data-[state=checked]:text-foreground data-[highlighted]:bg-cream data-[highlighted]:text-foreground"
                      >
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
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

            {(item.is_manual_item ||
              (sale.items ?? []).some(
                (saleItem: any) =>
                  saleItem.is_manual_item || saleItem.provisional_source === PROVISIONAL_SOURCE,
              )) && <SaleAgenda sale={sale} onScheduled={refresh} />}

            <div className="mt-8">
              <h3 className="font-display text-lg mb-2">Ítems</h3>
              <div className="space-y-2 md:hidden">
                {(sale.items ?? []).map((it: any) => {
                  const presentationLabel = getSaleItemPresentationLabel(it);
                  const itemDescription = getSaleItemDescription(it);
                  return (
                    <div key={it.id} className="rounded-lg border border-sand/60 bg-warm-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 font-medium">
                            <span>{getSaleItemName(it)}</span>
                            {isManualSaleItem(it) && <Badge variant="outline">Manual</Badge>}
                          </div>
                          {presentationLabel && (
                            <p className="text-xs text-muted-foreground">{presentationLabel}</p>
                          )}
                          {itemDescription && (
                            <p className="text-xs text-muted-foreground">{itemDescription}</p>
                          )}
                        </div>
                        {sale.status === "borrador" && (
                          <Button size="icon" variant="ghost" onClick={() => onDelItem(it.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="block text-xs text-muted-foreground">Cant.</span>
                          <span className="tabular-nums">{formatUnits(it.quantity)}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground">P. unit</span>
                          <span className="tabular-nums">{moneyPEN(it.unit_price)}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs text-muted-foreground">Subtotal</span>
                          <span className="font-semibold tabular-nums">
                            {moneyPEN(it.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(sale.items ?? []).length === 0 && (
                  <div className="rounded-lg border border-dashed border-sand/70 px-4 py-6 text-center text-sm text-muted-foreground">
                    Sin items aun.
                  </div>
                )}
              </div>
              <div className="hidden overflow-hidden rounded-lg border border-sand/60 md:block">
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{getSaleItemName(it)}</span>
                              {isManualSaleItem(it) && <Badge variant="outline">Manual</Badge>}
                            </div>
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
                <>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-sand/60 bg-cream/50 px-3 py-2">
                    <Label htmlFor="manual-sale-item" className="text-sm font-semibold">
                      Pedido personalizado
                    </Label>
                    <Switch
                      id="manual-sale-item"
                      checked={Boolean(item.is_manual_item)}
                      onCheckedChange={(checked) =>
                        setItem((current: any) => ({
                          ...blankSaleItem(Boolean(checked)),
                          quantity: current.quantity || 1,
                        }))
                      }
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                    {item.is_manual_item && (
                      <div className="sm:col-span-6">
                        <Label className="text-xs">Nombre del articulo</Label>
                        <Input
                          value={item.manual_item_name}
                          onChange={(e) =>
                            setItem((s: any) => ({ ...s, manual_item_name: e.target.value }))
                          }
                          placeholder="Ej. Camino de mesa feria"
                        />
                      </div>
                    )}
                    {!item.is_manual_item && (
                      <>
                        <div className="sm:col-span-4">
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
                        <div className="sm:col-span-4">
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
                      </>
                    )}
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Cant.</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) => setItem((s: any) => ({ ...s, quantity: e.target.value }))}
                      />
                    </div>
                    <div className={item.is_manual_item ? "sm:col-span-2" : "sm:col-span-1"}>
                      <Label className="text-xs">P. unit (S/)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={item.unit_price}
                        onChange={(e) =>
                          setItem((s: any) => ({ ...s, unit_price: e.target.value }))
                        }
                        placeholder="Precio"
                      />
                    </div>
                    {item.is_manual_item && (
                      <div className="sm:col-span-10">
                        <Label className="text-xs">Descripción del artículo</Label>
                        <Textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) =>
                            setItem((s: any) => ({ ...s, description: e.target.value }))
                          }
                          placeholder="Detalle del pedido especial"
                        />
                      </div>
                    )}
                    <div className={item.is_manual_item ? "sm:col-span-2" : "sm:col-span-1"}>
                      <Button onClick={onAddItem} className="h-11 w-full">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </div>
                  </div>
                </>
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
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-5">
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
                  <div className="sm:col-span-4">
                    <Label className="text-xs">Monto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={pay.amount}
                      onChange={(e) => setPay((s: any) => ({ ...s, amount: e.target.value }))}
                      placeholder="Monto"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button onClick={onAddPay} className="h-11 w-full">
                      <Plus className="h-4 w-4" /> Pago
                    </Button>
                  </div>
                </div>
              </div>

              <div className="self-start rounded-xl border border-sand/60 bg-cream/40 p-4 max-sm:sticky max-sm:bottom-0 max-sm:z-20 max-sm:-mx-4 max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:bg-warm-white/95 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))] max-sm:shadow-[0_-8px_20px_rgba(47,33,27,0.08)]">
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
                  <Button variant="hero" className="mt-3 h-12 w-full" onClick={onConfirm}>
                    <CheckCircle2 className="h-4 w-4" /> Confirmar y emitir
                  </Button>
                )}
                <div className="mt-2 grid gap-2">
                  <Button
                    variant="outline"
                    className={`w-full ${internalDocumentButtonClass}`}
                    onClick={() => onViewInternal(sale)}
                  >
                    <Eye className="h-4 w-4" /> Interno
                  </Button>
                  {getSaleReceipt(sale)?.id && (
                    <Button
                      variant="outline"
                      className={`w-full ${saleNoteButtonClass}`}
                      onClick={() => onViewReceipt(getSaleReceipt(sale).id, "note")}
                    >
                      <FileText className="h-4 w-4" /> Nota de venta
                    </Button>
                  )}
                  {!getSaleReceipt(sale)?.id && (
                    <Button
                      variant="outline"
                      className={`w-full ${quotationButtonClass}`}
                      onClick={() => onViewQuotation(sale)}
                    >
                      <FileText className="h-4 w-4" /> Cotización
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaleAgenda({ sale, onScheduled }: { sale: any; onScheduled: () => Promise<void> }) {
  const quickSchedule = useServerFn(adminQuickScheduleSaleEvent);
  const [dates, setDates] = useState({ "presentacion-avance": "", entrega: "" });
  const [savingType, setSavingType] = useState<string | null>(null);
  const [conflictType, setConflictType] = useState<string | null>(null);
  const events = [...(sale.calendar_events ?? [])].sort(
    (a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  const actions = [
    ["Reunión", "reunion-cliente"],
    ["Avance", "presentacion-avance"],
    ["Visita", "revision-aprobacion"],
    ["Entrega", "entrega"],
    ["Instalación", "instalacion"],
  ];
  async function schedule(type: "presentacion-avance" | "entrega") {
    if (!dates[type]) return toast.error("Selecciona la fecha y hora.");
    setSavingType(type);
    setConflictType(null);
    try {
      const result = await quickSchedule({
        data: { saleId: sale.id, typeSlug: type, startsAt: limaLocalToUtc(dates[type]) },
      });
      if (!result.saved) {
        setConflictType(type);
        return toast.warning("Ese horario coincide o está cerca de otro evento.");
      }
      toast.success(type === "entrega" ? "Entrega programada" : "Avance programado");
      setDates((current) => ({ ...current, [type]: "" }));
      await onScheduled();
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo programar el evento.");
    } finally {
      setSavingType(null);
    }
  }
  return (
    <section className="mt-8 rounded-2xl border border-sand/70 bg-cream/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg">
            <CalendarDays className="h-5 w-5 text-brand-terracotta" /> Agenda y fechas importantes
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Reuniones, avances, visitas, entregas e instalaciones del pedido.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/calendario" search={{ sale: sale.id } as any}>
            Abrir calendario
          </Link>
        </Button>
      </div>
      <div className="mt-4 rounded-2xl border border-accent/25 bg-accent/5 p-3">
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">Pieza personalizada</p>
          <p className="text-xs text-muted-foreground">
            Programa rápidamente las dos fechas principales de esta cotización.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["presentacion-avance", "Programar avance"],
              ["entrega", "Programar entrega"],
            ] as const
          ).map(([type, label]) => (
            <div key={type} className="rounded-xl border border-sand/70 bg-warm-white p-3">
              <Label htmlFor={`quick-${type}`}>{label}</Label>
              <Input
                id={`quick-${type}`}
                type="datetime-local"
                className="mt-2"
                value={dates[type]}
                onChange={(event) =>
                  setDates((current) => ({ ...current, [type]: event.target.value }))
                }
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={savingType === type}
                  onClick={() => void schedule(type)}
                >
                  {savingType === type ? "Guardando…" : "Guardar fecha"}
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/admin/calendario"
                    search={{ sale: sale.id, pick: type, returnTo: "ventas" } as any}
                  >
                    Ver calendario
                  </Link>
                </Button>
              </div>
              {conflictType === type && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Hay un cruce o un evento cercano. Elige otra fecha en el calendario.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions
          .filter(([, type]) => !["presentacion-avance", "entrega"].includes(type))
          .map(([label, type]) => (
            <Button key={type} asChild size="sm" variant="outline">
              <Link
                to="/admin/calendario"
                search={
                  type === "revision-aprobacion"
                    ? ({ sale: sale.id, pick: type, returnTo: "ventas" } as any)
                    : ({ sale: sale.id, schedule: type } as any)
                }
              >
                Programar {label.toLowerCase()}
              </Link>
            </Button>
          ))}
      </div>
      <div className="mt-4 space-y-2">
        {events.length ? (
          events.map((event: any) => (
            <Link
              key={event.id}
              to="/admin/calendario"
              search={{ event: event.id } as any}
              className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-sand/60 bg-warm-white px-3 py-2 hover:border-accent/40"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{event.title}</div>
                <div className="text-xs text-muted-foreground">
                  {event.event_type?.name} ·{" "}
                  {event.responsible?.full_name || event.responsible?.email || "Sin responsable"}
                </div>
              </div>
              <div className="shrink-0 text-right text-xs">
                <div>{formatCalendarDate(event.starts_at, { day: "2-digit", month: "short" })}</div>
                <div className="text-muted-foreground">
                  {formatCalendarDate(event.starts_at, { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-sand/70 p-5 text-center text-sm text-muted-foreground">
            <Clock3 className="mx-auto mb-2 h-5 w-5" />
            Aún no hay eventos para este pedido.
          </div>
        )}
      </div>
    </section>
  );
}
