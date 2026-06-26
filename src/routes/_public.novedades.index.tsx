import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listNews } from "@/lib/public.functions";

const q = queryOptions({ queryKey: ["public", "news"], queryFn: () => listNews({ data: {} }) });

export const Route = createFileRoute("/_public/novedades/")({
  head: () => ({
    meta: [
      { title: "Novedades · Makrana Home Art" },
      { name: "description", content: "Eventos, ferias, talleres y novedades del taller Makrana." },
      { property: "og:title", content: "Novedades · Makrana Home Art" },
      { property: "og:description", content: "Eventos, ferias y novedades del taller." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(q);
  },
  component: NewsIndex,
});

function NewsIndex() {
  const { data: news } = useSuspenseQuery(q);
  return (
    <section className="section-padded">
      <div className="container-makrana">
        <p className="text-xs uppercase tracking-widest text-accent">Del taller</p>
        <h1 className="font-display text-5xl mt-2">Novedades</h1>
        <p className="mt-3 text-muted-foreground max-w-prose">
          Eventos, ferias, talleres y nuevas colecciones de Makrana Home Art.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {news.map((n) => (
            <Link
              key={n.id}
              to="/novedades/$slug"
              params={{ slug: n.slug }}
              className="makrana-card group"
            >
              <div className="aspect-[16/10] overflow-hidden bg-cream">
                {n.cover_image_url && (
                  <img
                    src={n.cover_image_url}
                    alt={n.title}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
              </div>
              <div className="p-5">
                <span className="text-xs uppercase tracking-wider text-accent">
                  {n.category.replaceAll("_", " ")}
                </span>
                <h2 className="font-display text-xl mt-2">{n.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{n.summary}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {n.published_at &&
                    new Date(n.published_at).toLocaleDateString("es-PE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {news.length === 0 && (
          <p className="mt-16 text-center text-muted-foreground">
            Aún no hay novedades publicadas.
          </p>
        )}
      </div>
    </section>
  );
}
