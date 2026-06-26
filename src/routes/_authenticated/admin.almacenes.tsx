import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader, FormDialog, NewButton, useDialog } from "@/components/admin-ui";
import { adminListWarehouses, adminUpsertWarehouse, adminDeleteWarehouse, adminListStock } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/almacenes")({ component: WarehousesPage });

function WarehousesPage() {
  const list = useServerFn(adminListWarehouses);
  const upsert = useServerFn(adminUpsertWarehouse);
  const del = useServerFn(adminDeleteWarehouse);
  const listStock = useServerFn(adminListStock);
  const [rows, setRows] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ code: "", name: "", address: "", is_active: true });

  async function refresh() { setRows(await list()); setStock(await listStock({ data: {} })); }
  useEffect(() => { refresh(); /* eslint-disable-line */ }, []);

  function openNew() { setForm({ code: "", name: "", address: "", is_active: true }); dlg.openWith(null); }
  function openEdit(r: any) { setForm({ id: r.id, code: r.code, name: r.name, address: r.address ?? "", is_active: r.is_active }); dlg.openWith(r); }
  async function onDelete(r: any) {
    if (!confirm(`¿Eliminar almacén "${r.name}"?`)) return;
    try { await del({ data: { id: r.id } }); toast.success("Eliminado"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await upsert({ data: { ...form, address: form.address || null } }); toast.success("Guardado"); dlg.close(); refresh(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="Almacenes" description="Stock distribuido por ubicación (Taller, Showroom, Depósito, Ferias)." actions={<NewButton onClick={openNew} label="Nuevo almacén" />} />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.address}</div></TableCell>
                  <TableCell>{r.is_active ? <span className="text-emerald-700 text-xs">activo</span> : <span className="text-muted-foreground text-xs">inactivo</span>}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
          <div className="px-4 py-3 border-b border-sand/60"><h2 className="font-display text-lg">Stock por almacén</h2></div>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Almacén</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
              <TableBody>
                {stock.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin stock registrado.</TableCell></TableRow>}
                {stock.map((s) => {
                  const low = s.product?.min_stock != null && Number(s.quantity) <= Number(s.product.min_stock);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.product?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.warehouse?.name}</TableCell>
                      <TableCell className={`text-right tabular-nums ${low ? "text-rose-700 font-medium" : ""}`}>{Number(s.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <FormDialog open={dlg.open} onOpenChange={dlg.setOpen} title={dlg.data ? "Editar almacén" : "Nuevo almacén"} onSubmit={onSubmit} submitting={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Código *</Label><Input required value={form.code} onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="TALLER" /></div>
          <div><Label>Nombre *</Label><Input required value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
        </div>
        <div><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))} /></div>
        <label className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm((f: any) => ({ ...f, is_active: v }))} /> Activo</label>
      </FormDialog>
    </div>
  );
}
