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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pencil, Trash2, Plus, Boxes } from "lucide-react";
import { PageHeader, FormDialog, NewButton, useDialog, formatDate } from "@/components/admin-ui";
import {
  adminListFairs,
  adminUpsertFair,
  adminDeleteFair,
  adminUpsertFairItem,
  adminDeleteFairItem,
} from "@/lib/admin-content.functions";
import { adminListWarehouses, adminListProducts } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/ferias")({ component: FairsPage });

function FairsPage() {
  const list = useServerFn(adminListFairs);
  const upsert = useServerFn(adminUpsertFair);
  const del = useServerFn(adminDeleteFair);
  const listWh = useServerFn(adminListWarehouses);
  const [rows, setRows] = useState<any[]>([]);
  const [wh, setWh] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const [openItemsFair, setOpenItemsFair] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(blank());

  async function refresh() {
    setRows(await list());
  }
  useEffect(() => {
    refresh();
    listWh().then(setWh); /* eslint-disable-line */
  }, []);
  function openNew() {
    setForm(blank());
    dlg.openWith(null);
  }
  function openEdit(r: any) {
    setForm({
      id: r.id,
      name: r.name,
      location: r.location ?? "",
      warehouse_origin_id: r.warehouse_origin_id ?? "",
      starts_at: toLocalInput(r.starts_at),
      ends_at: toLocalInput(r.ends_at),
      notes: r.notes ?? "",
    });
    dlg.openWith(r);
  }
  async function onDelete(r: any) {
    if (!confirm(`¿Eliminar "${r.name}"?`)) return;
    try {
      await del({ data: { id: r.id } });
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
      const p: any = { ...form, warehouse_origin_id: form.warehouse_origin_id || null };
      p.starts_at = p.starts_at ? new Date(p.starts_at).toISOString() : null;
      p.ends_at = p.ends_at ? new Date(p.ends_at).toISOString() : null;
      for (const k of ["location", "notes"]) if (p[k] === "") p[k] = null;
      await upsert({ data: p });
      toast.success("Guardado");
      dlg.close();
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Ferias"
        description="Lleva control del stock enviado, vendido y devuelto en cada feria o evento."
        actions={<NewButton onClick={openNew} label="Nueva feria" />}
      />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feria</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead>Items</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Sin ferias registradas.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.warehouse?.name}</div>
                </TableCell>
                <TableCell>{r.location ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {formatDate(r.starts_at)} → {formatDate(r.ends_at)}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setOpenItemsFair(r)}>
                    <Boxes className="h-4 w-4" /> {r.items?.length ?? 0} items
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={dlg.open}
        onOpenChange={dlg.setOpen}
        title={dlg.data ? "Editar feria" : "Nueva feria"}
        onSubmit={onSubmit}
        submitting={saving}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nombre *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label>Ubicación</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <Label>Almacén origen</Label>
            <Select
              value={form.warehouse_origin_id || "_none"}
              onValueChange={(v) =>
                setForm((f: any) => ({ ...f, warehouse_origin_id: v === "_none" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {wh.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Inicio</Label>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm((f: any) => ({ ...f, starts_at: e.target.value }))}
            />
          </div>
          <div>
            <Label>Fin</Label>
            <Input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm((f: any) => ({ ...f, ends_at: e.target.value }))}
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

      <FairItemsSheet
        fair={openItemsFair}
        onClose={() => {
          setOpenItemsFair(null);
          refresh();
        }}
      />
    </div>
  );
}
function blank() {
  return { name: "", location: "", warehouse_origin_id: "", starts_at: "", ends_at: "", notes: "" };
}
function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function FairItemsSheet({ fair, onClose }: { fair: any; onClose: () => void }) {
  const upsertItem = useServerFn(adminUpsertFairItem);
  const delItem = useServerFn(adminDeleteFairItem);
  const listProducts = useServerFn(adminListProducts);
  const [products, setProducts] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>({
    product_id: "",
    qty_sent: 0,
    qty_sold: 0,
    qty_returned: 0,
  });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!fair) return;
    setItems(fair.items ?? []);
    Promise.all([
      listProducts({ data: { type: "producto_terminado" } }),
      listProducts({ data: { type: "material" } }),
    ]).then((a) => setProducts(a.flat()));
  }, [fair]); // eslint-disable-line

  async function save(it: any) {
    try {
      await upsertItem({
        data: {
          id: it.id,
          fair_id: fair.id,
          product_id: it.product_id ?? it.product?.id,
          qty_sent: Number(it.qty_sent),
          qty_sold: Number(it.qty_sold),
          qty_returned: Number(it.qty_returned),
        },
      });
      toast.success("Guardado");
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function add() {
    if (!draft.product_id) return toast.error("Selecciona producto");
    try {
      await upsertItem({
        data: {
          fair_id: fair.id,
          product_id: draft.product_id,
          qty_sent: Number(draft.qty_sent),
          qty_sold: Number(draft.qty_sold),
          qty_returned: Number(draft.qty_returned),
        },
      });
      setDraft({ product_id: "", qty_sent: 0, qty_sold: 0, qty_returned: 0 });
      toast.success("Agregado");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function remove(id: string) {
    try {
      await delItem({ data: { id } });
      setItems((arr) => arr.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Sheet open={!!fair} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Items: {fair?.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Sin items.</p>}
          {items.map((it: any, idx) => (
            <div
              key={it.id}
              className="grid grid-cols-12 gap-2 items-end border border-sand/40 rounded-md p-2"
            >
              <div className="col-span-5 text-sm font-medium">{it.product?.name}</div>
              <div className="col-span-2">
                <Label className="text-xs">Enviado</Label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={it.qty_sent}
                  onBlur={(e) => save({ ...it, qty_sent: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Vendido</Label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={it.qty_sold}
                  onBlur={(e) => save({ ...it, qty_sold: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Devuelto</Label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={it.qty_returned}
                  onBlur={(e) => save({ ...it, qty_returned: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <Button size="icon" variant="ghost" onClick={() => remove(it.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="border-t border-sand pt-4 mt-4">
            <Label className="text-sm">Agregar item</Label>
            <div className="grid grid-cols-12 gap-2 items-end mt-2">
              <div className="col-span-5">
                <Select
                  value={draft.product_id}
                  onValueChange={(v) => setDraft((s: any) => ({ ...s, product_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Producto" />
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
                <Input
                  type="number"
                  placeholder="Enviado"
                  value={draft.qty_sent}
                  onChange={(e) => setDraft((s: any) => ({ ...s, qty_sent: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Vendido"
                  value={draft.qty_sold}
                  onChange={(e) => setDraft((s: any) => ({ ...s, qty_sold: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Devuelto"
                  value={draft.qty_returned}
                  onChange={(e) => setDraft((s: any) => ({ ...s, qty_returned: e.target.value }))}
                />
              </div>
              <div className="col-span-1">
                <Button size="icon" onClick={add}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
