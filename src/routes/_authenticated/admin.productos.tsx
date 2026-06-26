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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
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
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/productos")({
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <ProductTypeManager
      type="producto_terminado"
      title="Productos terminados"
      description="Catálogo de piezas terminadas de Makrana (macramé, decoración, accesorios)."
      allowKit
    />
  );
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
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(blank(type));

  async function refresh() {
    const types = allowKit ? ["producto_terminado", "kit"] : [type];
    const out: any[] = [];
    for (const t of types) {
      const r = await list({ data: { type: t as any } });
      out.push(...r);
    }
    setRows(out);
  }
  useEffect(() => {
    refresh();
    listCats().then(setCats); /* eslint-disable-line */
  }, []);

  function openNew() {
    setForm(blank(type));
    dlg.openWith(null);
  }
  async function openEdit(row: any) {
    const full = await getOne({ data: { id: row.id } });
    setForm({ ...blank(type), ...full });
    dlg.openWith(full);
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
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
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
      await upsert({ data: payload });
      toast.success("Guardado");
      dlg.close();
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <NewButton
            onClick={openNew}
            label={`Nuevo ${type === "material" ? "material" : "producto"}`}
          />
        }
      />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sin registros.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.name}{" "}
                  {r.type === "kit" && (
                    <Badge variant="outline" className="ml-2">
                      Kit
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.sku ?? "—"}</TableCell>
                <TableCell>{r.category?.name ?? "—"}</TableCell>
                <TableCell>{moneyPEN(r.price)}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} visible={r.is_visible} />
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
        title={dlg.data ? "Editar" : "Nuevo registro"}
        onSubmit={onSubmit}
        submitting={saving}
      >
        <ProductFormFields form={form} setForm={setForm} cats={cats} allowKit={allowKit} />
      </FormDialog>
    </div>
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

export function ProductFormFields({ form, setForm, cats, allowKit }: any) {
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
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
          <Input value={form.sku ?? ""} onChange={(e) => upd("sku", e.target.value)} />
        </div>
        <div>
          <Label>Slug *</Label>
          <Input
            required
            value={form.slug}
            onChange={(e) => upd("slug", slugify(e.target.value))}
          />
        </div>
        <div>
          <Label>Categoría</Label>
          <Select
            value={form.category_id || "_none"}
            onValueChange={(v) => upd("category_id", v === "_none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sin categoría</SelectItem>
              {cats.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {allowKit && (
          <div>
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => upd("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="producto_terminado">Producto terminado</SelectItem>
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
        <div>
          <Label>Precio (S/) *</Label>
          <Input
            type="number"
            step="0.01"
            required
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
        <div>
          <Label>Stock mínimo</Label>
          <Input
            type="number"
            step="0.01"
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
        <div>
          <Label>Artesana</Label>
          <Input value={form.artisan ?? ""} onChange={(e) => upd("artisan", e.target.value)} />
        </div>
        <div>
          <Label>Proveedor</Label>
          <Input value={form.supplier ?? ""} onChange={(e) => upd("supplier", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>URL imagen principal</Label>
        <Input
          value={form.main_image_url ?? ""}
          onChange={(e) => upd("main_image_url", e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label>Descripción corta</Label>
        <Input
          value={form.short_description ?? ""}
          onChange={(e) => upd("short_description", e.target.value)}
          maxLength={280}
        />
      </div>
      <div>
        <Label>Descripción</Label>
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
          Destacado
        </label>
      </div>
    </>
  );
}
