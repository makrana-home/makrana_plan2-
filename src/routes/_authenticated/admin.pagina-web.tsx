import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, CheckCircle2, Clock, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminListComplaintBookEntries,
  adminUpdateComplaintBookEntry,
} from "@/lib/complaint-book.functions";
import {
  adminGetHomeSections,
  adminUpdateHomeSections,
  homeSectionDefaults,
  type HomeSectionVisibility,
} from "@/lib/site-settings.functions";

export const Route = createFileRoute("/_authenticated/admin/pagina-web")({
  component: WebsitePage,
});

const homeSectionOptions: Array<{
  key: keyof HomeSectionVisibility;
  label: string;
  description: string;
}> = [
  { key: "hero", label: "Video principal", description: "Portada de video al inicio de la web." },
  {
    key: "benefits",
    label: "Beneficios",
    description: "Piezas únicas, hecho en Perú, diseño a medida y envíos.",
  },
  {
    key: "categories",
    label: "Categorías de piezas",
    description: "Árbol de la vida, murales inspirados en quipus y murales.",
  },
  {
    key: "welcome",
    label: "Historia de Makrana",
    description: "Bloque editorial sobre diseño, artesanía y significado.",
  },
  { key: "news", label: "Novedades", description: "Publicaciones recientes del taller." },
  {
    key: "featured",
    label: "Piezas destacadas",
    description: "Selección de productos destacados del catálogo.",
  },
  {
    key: "customProjects",
    label: "Proyectos a medida",
    description: "Proceso para interioristas, arquitectos, marcas y espacios especiales.",
  },
  { key: "workshops", label: "Talleres", description: "Invitación y disponibilidad de talleres." },
  {
    key: "testimonials",
    label: "Testimonios",
    description: "Opiniones destacadas de clientes de Makrana.",
  },
  {
    key: "showProductPrices",
    label: "Mostrar precios de venta",
    description: "Autoriza o bloquea la visualización de precios en todo el catálogo público.",
  },
];

function WebsitePage() {
  const getSections = useServerFn(adminGetHomeSections);
  const updateSections = useServerFn(adminUpdateHomeSections);
  const [sections, setSections] = useState<HomeSectionVisibility>({ ...homeSectionDefaults });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSections()
      .then(setSections)
      .catch((error: any) =>
        toast.error(error.message ?? "No se pudo cargar la configuración del inicio."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const saved = await updateSections({ data: sections });
      setSections(saved);
      toast.success("Visibilidad de la página de inicio actualizada");
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Página web"
        description="Administra la visibilidad de las secciones de la página pública."
      />
      <Tabs defaultValue="inicio" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="inicio"><Eye className="mr-2 h-4 w-4" />Página pública</TabsTrigger>
          <TabsTrigger value="reclamaciones"><BookOpen className="mr-2 h-4 w-4" />Libro de Reclamaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="inicio">
      <section className="rounded-3xl border border-sand/60 bg-warm-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-terracotta">
              <Eye className="h-3.5 w-3.5" />
              Página pública
            </div>
            <h2 className="font-display text-xl">Secciones de la página de inicio</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Activa o desactiva cada bloque. Los cambios se reflejan al recargar la web pública.
            </p>
          </div>
          <Button
            type="button"
            className="rounded-full"
            disabled={loading || saving}
            onClick={save}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {homeSectionOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between gap-5 rounded-2xl border border-sand/70 bg-cream/35 p-4"
            >
              <div>
                <Label htmlFor={`home-section-${option.key}`} className="text-sm font-semibold">
                  {option.label}
                </Label>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <Switch
                id={`home-section-${option.key}`}
                checked={sections[option.key]}
                disabled={loading}
                onCheckedChange={(checked) =>
                  setSections((current) => ({ ...current, [option.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </section>
        </TabsContent>
        <TabsContent value="reclamaciones">
          <ComplaintBookAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComplaintBookAdmin() {
  const listEntries = useServerFn(adminListComplaintBookEntries);
  const updateEntry = useServerFn(adminUpdateComplaintBookEntry);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listEntries()
      .then(setEntries)
      .catch((error: any) => toast.error(error.message ?? "No se pudieron cargar las reclamaciones."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function saveEntry(entry: any) {
    setSavingId(entry.id);
    try {
      await updateEntry({ data: { id: entry.id, status: entry.status, admin_notes: entry.admin_notes ?? "" } });
      toast.success("Reclamación actualizada");
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo actualizar la reclamación.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-sand/60 bg-warm-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-terracotta"><BookOpen className="h-3.5 w-3.5" />Registro legal</div><h2 className="font-display text-xl">Libro de Reclamaciones</h2><p className="mt-2 text-sm text-muted-foreground">Solicitudes enviadas desde el formulario público.</p></div>
        <Button type="button" variant="outline" className="rounded-full" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar</Button>
      </div>

      {loading ? <p className="mt-8 text-sm text-muted-foreground">Cargando registros...</p> : entries.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-sand p-8 text-center text-sm text-muted-foreground">Todavía no se han registrado reclamaciones.</div> : (
        <div className="mt-6 space-y-3">
          {entries.map((entry) => (
            <details key={entry.id} className="group rounded-2xl border border-sand/70 bg-cream/25 open:bg-cream/45">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                <div><div className="flex items-center gap-2"><strong className="text-sm">{entry.claim_number}</strong><StatusBadge status={entry.status} /></div><p className="mt-1 text-xs text-muted-foreground">{entry.first_name} {entry.first_surname} {entry.second_surname} · {new Date(entry.created_at).toLocaleString("es-PE")}</p></div>
                <span className="text-xs font-semibold text-brand-terracotta">Ver detalle</span>
              </summary>
              <div className="border-t border-sand/70 p-4 sm:p-5">
                <div className="grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <Data label="Documento" value={`${entry.document_type} ${entry.document_number}`} /><Data label="Contacto" value={`${entry.phone} · ${entry.email}`} /><Data label="Ubicación" value={`${entry.department}, ${entry.province}, ${entry.district}`} />
                  <Data label="Dirección" value={`${entry.address}${entry.reference ? ` · Ref.: ${entry.reference}` : ""}`} /><Data label="Tipo" value={`${entry.claim_type} · ${entry.consumption_type}`} /><Data label="Pedido" value={entry.order_number} />
                  <Data label="Fecha del reclamo" value={entry.claim_date} /><Data label="Proveedor" value={entry.provider} /><Data label="Monto reclamado" value={entry.claimed_amount == null ? "—" : `S/ ${Number(entry.claimed_amount).toFixed(2)}`} />
                  <Data label="Descripción del producto o servicio" value={entry.product_description} wide /><Data label="Fechas" value={`Compra: ${entry.purchase_date || "—"} · Consumo: ${entry.consumption_date || "—"} · Caducidad: ${entry.expiration_date || "—"}`} wide />
                  <Data label="Detalle de la reclamación / queja" value={entry.claim_detail} wide /><Data label="Pedido del cliente" value={entry.customer_request} wide />
                </div>
                <div className="mt-5 grid gap-4 border-t border-sand/70 pt-5 md:grid-cols-[14rem_1fr_auto] md:items-end">
                  <div><Label htmlFor={`status-${entry.id}`}>Estado</Label><select id={`status-${entry.id}`} value={entry.status} onChange={(e) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, status: e.target.value } : item))} className="mt-2 h-10 w-full rounded-md border border-input bg-warm-white px-3 text-sm"><option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="atendido">Atendido</option></select></div>
                  <div><Label htmlFor={`notes-${entry.id}`}>Notas administrativas</Label><Textarea id={`notes-${entry.id}`} value={entry.admin_notes ?? ""} onChange={(e) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, admin_notes: e.target.value } : item))} className="mt-2 bg-warm-white" rows={2} /></div>
                  <Button type="button" onClick={() => saveEntry(entry)} disabled={savingId === entry.id}>{savingId === entry.id ? "Guardando..." : "Guardar"}</Button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function Data({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) { return <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}><dt className="font-semibold text-foreground/70">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-foreground">{value || "—"}</dd></div>; }
function StatusBadge({ status }: { status: string }) { const attended = status === "atendido"; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${attended ? "bg-emerald-100 text-emerald-700" : status === "en_proceso" ? "bg-amber-100 text-amber-700" : "bg-sand text-foreground/70"}`}>{attended ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{status.replace("_", " ")}</span>; }
