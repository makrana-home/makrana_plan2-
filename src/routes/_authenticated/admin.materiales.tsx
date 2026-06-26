import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { PageHeader, FormDialog, NewButton, useDialog, slugify, moneyPEN } from "@/components/admin-ui";
import { ProductFormFields } from "./admin.productos";
import { adminListProducts, adminGetProduct, adminUpsertProduct, adminDeleteProduct, adminListCategories, adminUpsertPresentation, adminDeletePresentation } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/materiales")({ component: MaterialsPage });

function MaterialsPage() {
  const list = useServerFn(adminListProducts);
  const getOne = useServerFn(adminGetProduct);
  const upsert = useServerFn(adminUpsertProduct);
  const del = useServerFn(adminDeleteProduct);
  const listCats = useServerFn(adminListCategories);
  const upsertPres = useServerFn(adminUpsertPresentation);
  const delPres = useServerFn(adminDeletePresentation);

  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [pres, setPres] = useState<any[]>([]);

  async function refresh() { setRows(await list({ data: { type: "material" } })); }
  useEffect(() => { refresh(); listCats().then(setCats); /* eslint-disable-line */ }, []);

  function openNew() { setForm(blank()); setPres([]); dlg.openWith(null); }
  async function openEdit(row: any) {
    const full = await getOne({ data: { id: row.id } });
    setForm({ ...blank(), ...full });
    setPres(full?.presentations ?? []);
    dlg.openWith(full);
  }
  async function onDelete(row: any) {
    if (!confirm(`¿Eliminar "${row.name}"?`)) return;
    try { await del({ data: { id: row.id } }); toast.success("Eliminado"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, type: "material", slug: form.slug || slugify(form.name), category_id: form.category_id || null };
      for (const k of ["sku","short_description","description","main_image_url","measurements","color","material","artisan","supplier","internal_notes"]) if (payload[k]==="") payload[k]=null;
      const saved = await upsert({ data: payload });
      // save presentations
      for (const p of pres) {
        if (p._deleted) { if (p.id) await delPres({ data: { id: p.id } }); continue; }
        await upsertPres({ data: { ...p, product_id: saved.id, units_in_presentation: p.units_in_presentation || 1 } });
      }
      toast.success("Guardado"); dlg.close(); refresh();
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="Materiales" description="Hilos, accesorios y bases para macramé. Cada material puede tener varias presentaciones (unidad, metro, rollo, docena…)." actions={<NewButton onClick={openNew} label="Nuevo material" />} />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead><TableHead>SKU</TableHead><TableHead>Categoría</TableHead><TableHead>Precio base</TableHead><TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin materiales.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.sku ?? "—"}</TableCell>
                <TableCell>{r.category?.name ?? "—"}</TableCell>
                <TableCell>{moneyPEN(r.price)}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog open={dlg.open} onOpenChange={dlg.setOpen} title={dlg.data ? "Editar material" : "Nuevo material"} onSubmit={onSubmit} submitting={saving}>
        <ProductFormFields form={form} setForm={setForm} cats={cats} allowKit={false} />
        <div className="border-t border-sand/60 pt-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Presentaciones</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setPres((p) => [...p, { unit: "unidad", price: 0, units_in_presentation: 1, label: "" }])}><Plus className="h-4 w-4" /> Agregar</Button>
          </div>
          <div className="space-y-2">
            {pres.filter((p) => !p._deleted).map((p, idx) => (
              <div key={p.id ?? `n${idx}`} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-xs">Unidad</Label>
                  <Select value={p.unit} onValueChange={(v) => updPres(setPres, idx, "unit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["unidad","metro","rollo","madeja","paquete","docena","ciento","combo","otro"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-3"><Label className="text-xs">Etiqueta</Label><Input value={p.label ?? ""} onChange={(e) => updPres(setPres, idx, "label", e.target.value)} placeholder="Rollo 50m" /></div>
                <div className="col-span-2"><Label className="text-xs">Cant. base</Label><Input type="number" step="0.01" value={p.units_in_presentation ?? 1} onChange={(e) => updPres(setPres, idx, "units_in_presentation", e.target.value)} /></div>
                <div className="col-span-3"><Label className="text-xs">Precio (S/)</Label><Input type="number" step="0.01" value={p.price ?? 0} onChange={(e) => updPres(setPres, idx, "price", e.target.value)} /></div>
                <div className="col-span-1"><Button type="button" size="icon" variant="ghost" onClick={() => updPres(setPres, idx, "_deleted", true)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
              </div>
            ))}
            {pres.filter((p) => !p._deleted).length === 0 && <p className="text-xs text-muted-foreground">Sin presentaciones — los clientes verán el precio base.</p>}
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

function updPres(setPres: any, idx: number, k: string, v: any) {
  setPres((arr: any[]) => arr.map((x, i) => i === idx ? { ...x, [k]: v } : x));
}

function blank() {
  return {
    type: "material", sku: "", slug: "", name: "", short_description: "", description: "",
    category_id: "", main_image_url: "", price: 0, cost: 0, status: "disponible",
    measurements: "", color: "", material: "", artisan: "", supplier: "",
    min_stock: 0, is_visible: true, is_featured: false, internal_notes: "",
  } as any;
}
