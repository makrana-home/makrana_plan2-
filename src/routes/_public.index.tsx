import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listProducts, listNews, listWorkshops } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { Sparkles, Leaf, Heart, Home } from "lucide-react";
import hero from "@/assets/hero-makrana.jpg";

const featuredQ = queryOptions({
  queryKey: ["public", "featured-products"],
  queryFn: () => listProducts({ data: { featuredOnly: true, limit: 4 } }),
});
const newsQ = queryOptions({
  queryKey: ["public", "home-news"],
  queryFn: () => listNews({ data: { limit: 3 } }),
});
const workshopsQ = queryOptions({
  queryKey: ["public", "home-workshops"],
  queryFn: () => listWorkshops({ data: { limit: 2 } }),
});

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "Makrana Home Art — Macramé artesanal premium" },
      { name: "description", content: "Piezas de macramé hechas a mano, decoración para el hogar, materiales, talleres y cursos." },
      { property: "og:title", content: "Makrana Home Art" },
      { property: "og:description", content: "Decoración artesanal en macramé, materiales y talleres." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(featuredQ);
    context.queryClient.ensureQueryData(newsQ);
    context.queryClient.ensureQueryData(workshopsQ);
  },
  component: Home_,
});

function Home_() {
  const { data: featured } = useSuspenseQuery(featuredQ);
  const { data: news } = useSuspenseQuery(newsQ);
  const { data: workshops } = useSuspenseQuery(workshopsQ);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-cream">
        <div className="container-makrana grid md:grid-cols-2 gap-10 items-center py-16 md:py-24">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">Hecho a mano · Perú</p>
            <h1 className="mt-4 font-display text-5xl md:text-6xl text-balance leading-[1.05] text-foreground">
              Makrana <span className="text-accent italic">Home Art</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-prose text-balance">
              Decoración en macramé tejida nudo por nudo, con algodón natural. Piezas únicas para hacer
              de tu hogar un espacio cálido, vivo y personal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="hero"><Link to="/catalogo">Ver catálogo</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/talleres">Ver talleres</Link></Button>
              <Button asChild size="lg" variant="ghost"><Link to="/registro">Registrarme</Link></Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={hero}
              alt="Tapiz de macramé artesanal en algodón natural"
              width={1600}
              height={1100}
              className="rounded-2xl shadow-2xl shadow-clay/20 object-cover aspect-[4/3]"
            />
            <div className="hidden md:block absolute -bottom-6 -left-6 bg-warm-white border border-sand px-6 py-4 rounded-xl shadow-lg">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Algodón 100%</p>
              <p className="font-display text-lg text-foreground">Tejido a mano</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bienvenida */}
      <section className="section-padded">
        <div className="container-makrana grid md:grid-cols-3 gap-8 text-center">
          <div>
            <Heart className="mx-auto text-accent" />
            <h3 className="font-display text-xl mt-3">Hecho con paciencia</h3>
            <p className="text-sm text-muted-foreground mt-2">Cada nudo se trabaja a mano, con tiempo y detalle.</p>
          </div>
          <div>
            <Leaf className="mx-auto text-accent" />
            <h3 className="font-display text-xl mt-3">Algodón natural</h3>
            <p className="text-sm text-muted-foreground mt-2">Trabajamos con fibras nobles, suaves y sostenibles.</p>
          </div>
          <div>
            <Home className="mx-auto text-accent" />
            <h3 className="font-display text-xl mt-3">Diseño para el hogar</h3>
            <p className="text-sm text-muted-foreground mt-2">Piezas pensadas para vivir contigo todos los días.</p>
          </div>
        </div>
      </section>

      {/* Destacados */}
      <section className="section-padded bg-cream/60">
        <div className="container-makrana">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <p className="text-xs uppercase tracking-widest text-accent">Selección</p>
              <h2 className="font-display text-4xl mt-2">Piezas destacadas</h2>
            </div>
            <Button asChild variant="link"><Link to="/catalogo">Ver todo el catálogo →</Link></Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p) => <ProductCard key={p.id} product={p as any} />)}
          </div>
        </div>
      </section>

      {/* Novedades */}
      <section className="section-padded">
        <div className="container-makrana">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <p className="text-xs uppercase tracking-widest text-accent">Del taller</p>
              <h2 className="font-display text-4xl mt-2">Novedades recientes</h2>
            </div>
            <Button asChild variant="link"><Link to="/novedades">Ver todas →</Link></Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {news.map((n) => (
              <Link key={n.id} to="/novedades/$slug" params={{ slug: n.slug }} className="makrana-card group block">
                <div className="aspect-[16/10] overflow-hidden bg-cream">
                  {n.cover_image_url && <img src={n.cover_image_url} alt={n.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <div className="p-5">
                  <span className="text-xs uppercase tracking-wider text-accent">{n.category.replaceAll("_", " ")}</span>
                  <h3 className="font-display text-xl mt-2">{n.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{n.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Talleres */}
      <section className="section-padded bg-cream/60">
        <div className="container-makrana">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <p className="text-xs uppercase tracking-widest text-accent">Aprende con nosotros</p>
              <h2 className="font-display text-4xl mt-2">Próximos talleres</h2>
            </div>
            <Button asChild variant="link"><Link to="/talleres">Ver todos →</Link></Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {workshops.map((w) => (
              <article key={w.id} className="makrana-card flex flex-col md:flex-row overflow-hidden">
                {w.cover_image_url && <img src={w.cover_image_url} alt={w.title} loading="lazy" className="md:w-1/2 object-cover aspect-[4/3]" />}
                <div className="p-6 flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-accent">{w.modality} · {w.level}</span>
                  <h3 className="font-display text-2xl">{w.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{w.description}</p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="font-display text-xl">S/ {Number(w.price).toFixed(2)}</span>
                    <Button asChild variant="hero" size="sm"><Link to="/talleres">Inscribirme</Link></Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padded">
        <div className="container-makrana">
          <div className="rounded-3xl bg-terracotta text-warm-white p-10 md:p-16 text-center">
            <Sparkles className="mx-auto mb-4" />
            <h2 className="font-display text-4xl">Pieza única para tu hogar</h2>
            <p className="mt-3 max-w-xl mx-auto opacity-90">¿Buscas algo a medida? Podemos tejer para ti. Cuéntanos tu idea y la creamos juntos.</p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <Button asChild size="lg" variant="copper"><Link to="/contacto">Hablar por WhatsApp</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-warm-white text-warm-white hover:bg-warm-white/10"><Link to="/registro">Quiero registrarme</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
