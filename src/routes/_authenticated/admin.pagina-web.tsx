import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
      <section className="rounded-3xl border border-sand/60 bg-warm-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
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
    </div>
  );
}
