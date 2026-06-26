import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listWorkshops } from "@/lib/public.functions";
import { enrollWorkshop } from "@/lib/admin-content.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const q = queryOptions({
  queryKey: ["public", "workshops"],
  queryFn: () => listWorkshops({ data: {} }),
});

export const Route = createFileRoute("/_public/talleres")({
  head: () => ({
    meta: [
      { title: "Talleres y cursos · Makrana Home Art" },
      {
        name: "description",
        content: "Talleres presenciales, cursos online y experiencias para aprender macramé.",
      },
      { property: "og:title", content: "Talleres y cursos · Makrana Home Art" },
      { property: "og:description", content: "Aprende macramé con nosotros." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(q);
  },
  component: Workshops,
});

function Workshops() {
  const { data: items, refetch } = useSuspenseQuery(q);
  const enroll = useServerFn(enrollWorkshop);
  const [active, setActive] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function onEnroll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await enroll({ data: { workshop_id: active.id, ...form } });
      toast.success("¡Inscripción registrada! Te contactaremos pronto.");
      setActive(null);
      setForm({ full_name: "", email: "", phone: "", notes: "" });
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo registrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section-padded">
      <div className="container-makrana">
        <p className="text-xs uppercase tracking-widest text-accent">Aprende</p>
        <h1 className="font-display text-5xl mt-2">Talleres y cursos</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Vive el macramé en persona o desde casa: experiencias para todos los niveles.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          {items.map((w) => (
            <article key={w.id} className="makrana-card overflow-hidden flex flex-col">
              {w.cover_image_url && (
                <img
                  src={w.cover_image_url}
                  alt={w.title}
                  loading="lazy"
                  className="aspect-[16/10] object-cover"
                />
              )}
              <div className="p-6 flex-1 flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{w.modality}</Badge>
                  <Badge variant="outline">{w.level}</Badge>
                  <Badge>{w.status}</Badge>
                </div>
                <h2 className="font-display text-2xl mt-1">{w.title}</h2>
                <p className="text-sm text-muted-foreground line-clamp-3">{w.description}</p>
                <dl className="grid grid-cols-2 gap-y-1 text-sm mt-3">
                  <dt className="text-muted-foreground">Fecha</dt>
                  <dd>
                    {w.starts_at
                      ? new Date(w.starts_at).toLocaleDateString("es-PE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Por confirmar"}
                  </dd>
                  <dt className="text-muted-foreground">Lugar</dt>
                  <dd>{w.location ?? "—"}</dd>
                  <dt className="text-muted-foreground">Cupos</dt>
                  <dd>{w.capacity - w.enrolled_count} disponibles</dd>
                </dl>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-display text-xl">S/ {Number(w.price).toFixed(2)}</span>
                  <Button
                    variant="hero"
                    size="sm"
                    disabled={w.status !== "abierto" || w.enrolled_count >= w.capacity}
                    onClick={() => setActive(w)}
                  >
                    {w.status !== "abierto"
                      ? "No disponible"
                      : w.enrolled_count >= w.capacity
                        ? "Lleno"
                        : "Inscribirme"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {items.length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">
            Pronto publicaremos nuevos talleres.
          </p>
        )}

        <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Inscribirme: {active?.title}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={onEnroll} className="space-y-3">
              <div>
                <Label>Nombre completo *</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Teléfono / WhatsApp</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="submit" variant="hero" disabled={saving}>
                  {saving ? "Enviando…" : "Confirmar inscripción"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
