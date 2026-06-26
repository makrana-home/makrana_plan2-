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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pencil, Trash2, Users } from "lucide-react";
import {
  PageHeader,
  FormDialog,
  NewButton,
  useDialog,
  slugify,
  formatDate,
  moneyPEN,
} from "@/components/admin-ui";
import {
  adminListWorkshops,
  adminUpsertWorkshop,
  adminDeleteWorkshop,
  adminListEnrollments,
  adminUpdateEnrollmentPayment,
  adminDeleteEnrollment,
} from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/admin/talleres")({
  component: WorkshopsPage,
});

function WorkshopsPage() {
  const list = useServerFn(adminListWorkshops);
  const upsert = useServerFn(adminUpsertWorkshop);
  const del = useServerFn(adminDeleteWorkshop);
  const [rows, setRows] = useState<any[]>([]);
  const dlg = useDialog<any>();
  const [enrollWid, setEnrollWid] = useState<string | null>(null);
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
    setForm({
      ...blank(),
      ...r,
      starts_at: toLocalInput(r.starts_at),
      ends_at: toLocalInput(r.ends_at),
    });
    dlg.openWith(r);
  }
  async function onDelete(r: any) {
    if (!confirm(`¿Eliminar taller "${r.title}"?`)) return;
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
      const p: any = { ...form, slug: form.slug || slugify(form.title) };
      for (const k of ["description", "cover_image_url", "location", "materials_included"])
        if (p[k] === "") p[k] = null;
      p.starts_at = p.starts_at ? new Date(p.starts_at).toISOString() : null;
      p.ends_at = p.ends_at ? new Date(p.ends_at).toISOString() : null;
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
        title="Talleres y cursos"
        description="Programa talleres presenciales y virtuales. Las inscripciones desde la web aparecen aquí automáticamente."
        actions={<NewButton onClick={openNew} label="Nuevo taller" />}
      />

      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Taller</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Cupos</TableHead>
              <TableHead>Modalidad</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Sin talleres.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">/{r.slug}</div>
                </TableCell>
                <TableCell className="text-xs">{formatDate(r.starts_at)}</TableCell>
                <TableCell className="text-sm">
                  {r.enrolled_count}/{r.capacity}
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline">{r.modality}</Badge> {r.level}
                </TableCell>
                <TableCell>{moneyPEN(r.price)}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "abierto" ? "default" : "outline"}>{r.status}</Badge>
                  {!r.is_visible && (
                    <Badge variant="secondary" className="ml-1">
                      oculto
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEnrollWid(r.id)}
                    title="Inscritos"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
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
        title={dlg.data ? "Editar taller" : "Nuevo taller"}
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
            <Label>Modalidad</Label>
            <Select
              value={form.modality}
              onValueChange={(v) => setForm((f: any) => ({ ...f, modality: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["presencial", "virtual", "hibrido"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nivel</Label>
            <Select
              value={form.level}
              onValueChange={(v) => setForm((f: any) => ({ ...f, level: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["basico", "intermedio", "avanzado"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
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
                {["abierto", "lleno", "finalizado", "cancelado"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Inicio</Label>
            <Input
              type="datetime-local"
              value={form.starts_at ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, starts_at: e.target.value }))}
            />
          </div>
          <div>
            <Label>Fin</Label>
            <Input
              type="datetime-local"
              value={form.ends_at ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, ends_at: e.target.value }))}
            />
          </div>
          <div>
            <Label>Lugar</Label>
            <Input
              value={form.location ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <Label>Cupos *</Label>
            <Input
              type="number"
              required
              value={form.capacity}
              onChange={(e) => setForm((f: any) => ({ ...f, capacity: e.target.value }))}
            />
          </div>
          <div>
            <Label>Precio (S/)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f: any) => ({ ...f, price: e.target.value }))}
            />
          </div>
          <div>
            <Label>URL portada</Label>
            <Input
              value={form.cover_image_url ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, cover_image_url: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>Descripción</Label>
          <Textarea
            rows={4}
            value={form.description ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <Label>Materiales incluidos</Label>
          <Textarea
            rows={2}
            value={form.materials_included ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, materials_included: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2">
          <Switch
            checked={form.is_visible}
            onCheckedChange={(v) => setForm((f: any) => ({ ...f, is_visible: v }))}
          />{" "}
          Visible en web
        </label>
      </FormDialog>

      <EnrollmentsSheet workshopId={enrollWid} onClose={() => setEnrollWid(null)} />
    </div>
  );
}

function blank() {
  return {
    title: "",
    slug: "",
    description: "",
    cover_image_url: "",
    modality: "presencial",
    level: "basico",
    starts_at: "",
    ends_at: "",
    location: "",
    capacity: 10,
    price: 0,
    materials_included: "",
    status: "abierto",
    is_visible: true,
  };
}
function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function EnrollmentsSheet({
  workshopId,
  onClose,
}: {
  workshopId: string | null;
  onClose: () => void;
}) {
  const list = useServerFn(adminListEnrollments);
  const upd = useServerFn(adminUpdateEnrollmentPayment);
  const del = useServerFn(adminDeleteEnrollment);
  const [rows, setRows] = useState<any[]>([]);
  async function refresh() {
    if (workshopId) setRows(await list({ data: { workshopId } }));
  }
  useEffect(() => {
    if (workshopId) refresh(); /* eslint-disable-line */
  }, [workshopId]);
  return (
    <Sheet open={!!workshopId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Inscripciones</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                    Sin inscritos.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.full_name}</TableCell>
                  <TableCell className="text-xs">
                    {r.email ?? "—"}
                    <div className="text-muted-foreground">{r.phone ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.payment_status}
                      onValueChange={async (v) => {
                        await upd({ data: { id: r.id, payment_status: v as any } });
                        refresh();
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["pendiente", "parcial", "pagado", "anulado"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm("¿Eliminar inscripción?")) {
                          await del({ data: { id: r.id } });
                          refresh();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
