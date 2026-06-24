import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listWorkshops } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const q = queryOptions({ queryKey: ["public","workshops"], queryFn: () => listWorkshops({ data: {} }) });

export const Route = createFileRoute("/_public/talleres")({
  head: () => ({ meta: [
    { title: "Talleres y cursos · Makrana Home Art" },
    { name: "description", content: "Talleres presenciales, cursos online y experiencias para aprender macramé." },
    { property: "og:title", content: "Talleres y cursos · Makrana Home Art" },
    { property: "og:description", content: "Aprende macramé con nosotros." },
  ]}),
  loader: ({ context }) => { context.queryClient.ensureQueryData(q); },
  component: Workshops,
});

function Workshops() {
  const { data: items } = useSuspenseQuery(q);
  return (
    <section className="section-padded">
      <div className="container-makrana">
        <p className="text-xs uppercase tracking-widest text-accent">Aprende</p>
        <h1 className="font-display text-5xl mt-2">Talleres y cursos</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">Vive el macramé en persona o desde casa: experiencias para todos los niveles.</p>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          {items.map((w) => (
            <article key={w.id} className="makrana-card overflow-hidden flex flex-col">
              {w.cover_image_url && <img src={w.cover_image_url} alt={w.title} loading="lazy" className="aspect-[16/10] object-cover" />}
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
                  <dd>{w.starts_at ? new Date(w.starts_at).toLocaleDateString("es-PE",{year:"numeric",month:"long",day:"numeric"}) : "Por confirmar"}</dd>
                  <dt className="text-muted-foreground">Lugar</dt><dd>{w.location ?? "—"}</dd>
                  <dt className="text-muted-foreground">Cupos</dt><dd>{w.capacity - w.enrolled_count} disponibles</dd>
                </dl>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-display text-xl">S/ {Number(w.price).toFixed(2)}</span>
                  <Button asChild variant="hero" size="sm">
                    <a href={`https://wa.me/51999999999?text=${encodeURIComponent(`Hola, quiero inscribirme al taller "${w.title}".`)}`} target="_blank" rel="noreferrer">Inscribirme</a>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {items.length === 0 && <p className="mt-12 text-center text-muted-foreground">Pronto publicaremos nuevos talleres.</p>}
      </div>
    </section>
  );
}
