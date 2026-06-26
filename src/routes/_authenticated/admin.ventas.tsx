import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Trash2, CheckCircle2, XCircle, FileText, Pencil } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/admin/ventas")({ component: SalesPage });

function SalesPage() {
  const listFn = useServerFn(adminListSales);
  const create = useServerFn(adminCreateSale);
  const cancel = useServerFn(adminCancelSale);
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
    channel: "Web",
    notes: "",
  });
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
          discount: 0,
        },
      });
      toast.success("Venta creada");
      newDlg.close();
      refresh();
      setOpenId(r.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function onCancel(r: any) {
    const message =
      r.status === "confirmada"
        ? "Anular venta confirmada? Se devolvera el stock al almacen."
        : "Anular venta en borrador?";
    if (!confirm(message)) return;
    try {
      await cancel({ data: { id: r.id } });
      toast.success("Venta anulada");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
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
                channel: "Web",
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
              <TableHead>Comprobante</TableHead>
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
                  {r.receipt?.[0]?.number ? (
                    <Link to="/admin/comprobantes" className="text-accent underline text-xs">
                      {r.receipt[0].number}
                    </Link>
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
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Almacén *</Label>
            <Select
              value={newForm.warehouse_id}
              onValueChange={(v) => setNewForm((f: any) => ({ ...f, warehouse_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {wh.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Canal</Label>
            <Select
              value={newForm.channel}
              onValueChange={(v) => setNewForm((f: any) => ({ ...f, channel: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Web", "WhatsApp", "Instagram", "Feria", "Showroom", "Otro"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
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
      />
    </div>
  );
}

function SaleDrawer({
  saleId,
  onClose,
  customers,
  warehouses,
}: {
  saleId: string | null;
  onClose: () => void;
  customers: any[];
  warehouses: any[];
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
    product_id: "",
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
      return toast.error("Completa producto, cantidad y precio");
    try {
      await addItem({
        data: {
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          discount: Number(item.discount ?? 0),
          description: item.description || null,
        },
      });
      setItem({ product_id: "", quantity: 1, unit_price: 0, discount: 0, description: "" });
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
    if (!confirm("Confirmar venta? Se descontará stock y se emitirá comprobante.")) return;
    try {
      const r = await confirm_({ data: { id: sale.id } });
      toast.success(`Comprobante emitido: ${r?.[0]?.receipt_number ?? ""}`);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function autoPrice(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (p) setItem((s: any) => ({ ...s, unit_price: p.price }));
  }

  return (
    <Sheet open={!!saleId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        {sale && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">Venta {sale.id.slice(0, 8)}</SheetTitle>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={sale.status === "confirmada" ? "default" : "outline"}>
                  {sale.status}
                </Badge>
                <Badge variant="secondary">pago: {sale.payment_status}</Badge>
                <Badge variant="outline">entrega: {sale.delivery_status}</Badge>
                {sale.receipt?.[0] && <Badge>Comprobante {sale.receipt[0].number}</Badge>}
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
                  onValueChange={(v) => setSale((s: any) => ({ ...s, warehouse_id: v }))}
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
                    {["pendiente", "en_preparacion", "entregado", "enviado", "cancelado"].map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ),
                    )}
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
              <h3 className="font-display text-lg mb-2">Items</h3>
              <div className="border border-sand/60 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">P. unit</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sale.items ?? []).map((it: any) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          {it.product?.name}
                          <div className="text-xs text-muted-foreground">
                            {it.description ?? ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(it.quantity).toFixed(2)}
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
                    ))}
                    {(sale.items ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-6 text-sm"
                        >
                          Sin items aún.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {sale.status === "borrador" && (
                <div className="grid grid-cols-12 gap-2 mt-3 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Producto</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(v) => {
                        setItem((s: any) => ({ ...s, product_id: v }));
                        autoPrice(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Cant.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => setItem((s: any) => ({ ...s, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">P. unit (S/)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => setItem((s: any) => ({ ...s, unit_price: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
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
                        {[
                          "efectivo",
                          "yape",
                          "plin",
                          "transferencia",
                          "tarjeta",
                          "mixto",
                          "otro",
                        ].map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
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
                  <span>− {moneyPEN(sale.discount)}</span>
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
                {sale.receipt?.[0] && (
                  <Button asChild variant="outline" className="w-full mt-2">
                    <Link to="/admin/comprobantes">
                      <FileText className="h-4 w-4" /> Ver comprobante
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
