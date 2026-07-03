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
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChevronDown,
  Heart,
  Mail,
  MapPin,
  MessageSquareText,
  Package,
  Palette,
  Pencil,
  Phone,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
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

const sourceOptions = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Feria o evento",
  "RecomendaciÃ³n",
  "Google",
  "Otro",
];

const interestOptions: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "Piezas", label: "Piezas", icon: Package },
  { value: "Talleres", label: "Talleres", icon: BookOpen },
  { value: "Ferias", label: "Ferias", icon: Sparkles },
  { value: "Materiales", label: "Materiales", icon: Palette },
];

const fieldClass =
  "h-12 rounded-2xl border-sand/80 bg-warm-white/90 pl-11 shadow-sm transition focus-visible:border-accent focus-visible:ring-accent/20";

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
    if (!confirm(`Â¿Eliminar a ${r.full_name}?`)) return;
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
              <TableHead>UbicaciÃ³n</TableHead>
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
                  {r.email ?? "â€”"}
                  <div className="text-xs text-muted-foreground">{r.phone ?? ""}</div>
                </TableCell>
                <TableCell>{r.location ?? "â€”"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.source ?? "â€”"}</TableCell>
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
        contentClassName="max-w-5xl"
      >
        <CustomerRegistrationCard form={form} setForm={setForm} />
      </FormDialog>
    </div>
  );
}

function CustomerRegistrationCard({
  form,
  setForm,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}) {
  const selectedInterests = splitInterests(form.interests);

  function update(field: string, value: string) {
    setForm((current: any) => ({ ...current, [field]: value }));
  }

  function toggleInterest(value: string) {
    const next = selectedInterests.includes(value)
      ? selectedInterests.filter((item) => item !== value)
      : [...selectedInterests, value];
    update("interests", next.join(", "));
  }

  return (
    <div className="grid gap-6 rounded-[2rem] border border-sand/80 bg-warm-white/95 p-6 shadow-2xl shadow-clay/10 sm:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="admin_customer_full_name">Nombres y apellidos *</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              id="admin_customer_full_name"
              required
              maxLength={160}
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="Andrea Salas"
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="admin_customer_email">Correo</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              id="admin_customer_email"
              type="email"
              maxLength={160}
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value)}
              placeholder="andrea@correo.com"
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="admin_customer_phone">Celular</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              id="admin_customer_phone"
              maxLength={40}
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+51 986 608 552"
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="admin_customer_location">Ubicación</Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              id="admin_customer_location"
              maxLength={160}
              value={form.location ?? ""}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Lima, Perú"
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="admin_customer_source">¿Cómo nos conociste?</Label>
          <div className="relative">
            <Heart className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <select
              id="admin_customer_source"
              value={form.source ?? ""}
              onChange={(e) => update("source", e.target.value)}
              className="h-12 w-full appearance-none rounded-2xl border border-sand/80 bg-warm-white/90 pl-11 pr-11 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent/20"
            >
              <option value="">Selecciona una opción</option>
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Tus intereses</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {interestOptions.map((option) => {
            const Icon = option.icon;
            const selected = selectedInterests.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleInterest(option.value)}
                className={[
                  "flex h-12 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium shadow-sm transition",
                  selected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-sand/80 bg-warm-white/80 hover:border-accent/70",
                ].join(" ")}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="admin_customer_notes">Mensaje (opcional)</Label>
        <div className="relative">
          <MessageSquareText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-accent" />
          <Textarea
            id="admin_customer_notes"
            rows={4}
            maxLength={1000}
            value={form.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Cuéntanos si busca una pieza especial, un taller o una consulta puntual."
            className="min-h-32 rounded-3xl border-sand/80 bg-warm-white/90 pl-11 pt-3 shadow-sm focus-visible:border-accent focus-visible:ring-accent/20"
          />
        </div>
      </div>
    </div>
  );
}

function splitInterests(value?: string | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    if (!confirm("Â¿Eliminar lead?")) return;
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
            <TableHead>InterÃ©s</TableHead>
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
                {r.email ?? "â€”"}
                <div className="text-xs text-muted-foreground">{r.phone ?? ""}</div>
              </TableCell>
              <TableCell>{r.interest ?? "â€”"}</TableCell>
              <TableCell className="max-w-[280px] truncate text-xs" title={r.message}>
                {r.message ?? "â€”"}
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
