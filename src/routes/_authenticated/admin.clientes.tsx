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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { PageHeader, FormDialog, NewButton, useDialog, formatDate } from "@/components/admin-ui";
import {
  adminListCustomers,
  adminUpsertCustomer,
  adminDeleteCustomer,
  adminListLeads,
  adminConvertLead,
  adminDeleteLead,
} from "@/lib/admin-sales.functions";

export const Route = createFileRoute("/_authenticated/admin/clientes")({ component: ClientsPage });

function ClientsPage() {
  return (
    <div>
      <PageHeader
        title="Clientes y leads"
        description="Base de datos de clientes con historial de compras y leads interesados desde la web."
      />
      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>
        <TabsContent value="clientes" className="mt-4">
          <CustomersTab />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <LeadsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CustomersTab() {
  const list = useServerFn(adminListCustomers);
  const upsert = useServerFn(adminUpsertCustomer);
  const del = useServerFn(adminDeleteCustomer);
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
    if (!confirm(`¿Eliminar a ${r.full_name}?`)) return;
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
      await upsert({ data: form });
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
      <div className="flex justify-end mb-3">
        <NewButton onClick={openNew} label="Nuevo cliente" />
      </div>
      <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Sin clientes.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell className="text-sm">
                  {r.email ?? "—"}
                  <div className="text-xs text-muted-foreground">{r.phone ?? ""}</div>
                </TableCell>
                <TableCell>{r.location ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.source ?? "—"}</TableCell>
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
        title={dlg.data ? "Editar cliente" : "Nuevo cliente"}
        onSubmit={onSubmit}
        submitting={saving}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nombre completo *</Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label>Documento</Label>
            <Input
              value={form.document ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, document: e.target.value }))}
            />
          </div>
          <div>
            <Label>Ubicación</Label>
            <Input
              value={form.location ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <Label>Origen</Label>
            <Input
              value={form.source ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, source: e.target.value }))}
              placeholder="instagram, feria, recomendación..."
            />
          </div>
          <div>
            <Label>Intereses</Label>
            <Input
              value={form.interests ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, interests: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </FormDialog>
    </div>
  );
}

function blank() {
  return {
    full_name: "",
    email: "",
    phone: "",
    document: "",
    location: "",
    source: "",
    interests: "",
    notes: "",
  };
}

function LeadsTab() {
  const list = useServerFn(adminListLeads);
  const convert = useServerFn(adminConvertLead);
  const del = useServerFn(adminDeleteLead);
  const [rows, setRows] = useState<any[]>([]);
  async function refresh() {
    setRows(await list());
  }
  useEffect(() => {
    refresh(); /* eslint-disable-line */
  }, []);
  async function onConvert(r: any) {
    try {
      await convert({ data: { id: r.id } });
      toast.success("Convertido en cliente");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function onDelete(r: any) {
    if (!confirm("¿Eliminar lead?")) return;
    try {
      await del({ data: { id: r.id } });
      toast.success("Eliminado");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  return (
    <div className="border border-sand/60 rounded-xl overflow-hidden bg-warm-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Interés</TableHead>
            <TableHead>Mensaje</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Sin leads.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(r.created_at)}
              </TableCell>
              <TableCell className="font-medium">{r.full_name}</TableCell>
              <TableCell className="text-sm">
                {r.email ?? "—"}
                <div className="text-xs text-muted-foreground">{r.phone ?? ""}</div>
              </TableCell>
              <TableCell>{r.interest ?? "—"}</TableCell>
              <TableCell className="max-w-[280px] truncate text-xs" title={r.message}>
                {r.message ?? "—"}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button size="sm" variant="outline" onClick={() => onConvert(r)}>
                  <UserPlus className="h-4 w-4" /> Convertir
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
  );
}
