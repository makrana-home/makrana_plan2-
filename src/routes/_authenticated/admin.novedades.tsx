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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import {
  PageHeader,
  FormDialog,
  NewButton,
  useDialog,
  slugify,
  formatDate,
} from "@/components/admin-ui";
import { adminListNews, adminUpsertNews, adminDeleteNews } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/admin/novedades")({ component: NewsPage });

function NewsPage() {
  const list = useServerFn(adminListNews);
  const upsert = useServerFn(adminUpsertNews);
  const del = useServerFn(adminDeleteNews);
  const [rows, setRows] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(blank());

  async function refresh() {
    setRows(await list());
  }
  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, []);
  function openNew() {
    setForm(blank());
    dlg.openWith(null);
  }
  function openEdit(r: any) {
    setForm({ ...blank(), ...r });
    dlg.openWith(r);
  }
  async function onDelete(r: any) {
    if (!confirm(`¿Eliminar "${r.title}"?`)) return;
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
      const p = { ...form, slug: form.slug || slugify(form.title) };
      for (const k of ["cover_image_url", "summary", "content", "cta_type", "cta_url"])
        if (p[k] === "") p[k] = null;
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
        title="Novedades"
        description="Historias, lanzamientos, ferias y promociones que ven los visitantes."
        actions={<NewButton onClick={openNew} label="Nueva publicación" />}
      />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Sin publicaciones.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">/{r.slug}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "publicado" ? "default" : "outline"}>
                    {r.status}
                  </Badge>
                  {r.is_featured && (
                    <Badge variant="secondary" className="ml-1">
                      destacado
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(r.published_at)}
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
        title={dlg.data ? "Editar publicación" : "Nueva publicación"}
        onSubmit={onSubmit}
        submitting={saving}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Título *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => {
                const n = e.target.value;
                setForm((f: any) => ({ ...f, title: n, slug: f.slug || slugify(n) }));
              }}
            />
          </div>
          <div>
            <Label>Slug *</Label>
            <Input
              required
              value={form.slug}
              onChange={(e) => setForm((f: any) => ({ ...f, slug: slugify(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Categoría *</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f: any) => ({ ...f, category: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "evento",
                  "feria",
                  "taller",
                  "curso_nuevo",
                  "producto_nuevo",
                  "historia",
                  "inspiracion",
                  "promocion",
                ].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["borrador", "publicado", "oculto"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>URL imagen de portada</Label>
            <Input
              value={form.cover_image_url ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, cover_image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>CTA URL</Label>
            <Input
              value={form.cta_url ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, cta_url: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>Resumen</Label>
          <Textarea
            rows={2}
            value={form.summary ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, summary: e.target.value }))}
            maxLength={500}
          />
        </div>
        <div>
          <Label>Contenido</Label>
          <Textarea
            rows={8}
            value={form.content ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, content: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2">
          <Switch
            checked={form.is_featured}
            onCheckedChange={(v) => setForm((f: any) => ({ ...f, is_featured: v }))}
          />{" "}
          Destacar en home
        </label>
      </FormDialog>
    </div>
  );
}

function blank() {
  return {
    title: "",
    slug: "",
    category: "historia",
    cover_image_url: "",
    summary: "",
    content: "",
    status: "borrador",
    is_featured: false,
    cta_type: "",
    cta_url: "",
  };
}
