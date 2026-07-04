import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { BookOpen, Calendar, Hand, Heart, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { listNews, listProducts, listWorkshops } from "@/lib/public.functions";
import anaMaria from "@/assets/ana-maria-makrana.jpg";
import hero from "@/assets/portada-makrana.jpg";

const featuredQ = queryOptions({
  queryKey: ["public", "featured-products"],
  queryFn: () => listProducts({ data: { featuredOnly: true, limit: 3 } }),
});
const newsQ = queryOptions({
  queryKey: ["public", "home-news"],
  queryFn: () => listNews({ data: { limit: 5 } }),
});
const workshopsQ = queryOptions({
  queryKey: ["public", "home-workshops"],
  queryFn: () => listWorkshops({ data: {} }),
});

const emptyNews = [
  {
    tag: "Colección",
    title: "Nuevas piezas en preparación",
    text: "Muy pronto publicaremos novedades del taller, ferias y piezas listas para tu hogar.",
  },
  {
    tag: "Taller",
    title: "Cursos de macramé",
    text: "Estamos preparando fechas y experiencias para aprender con calma y materiales nobles.",
  },
  {
    tag: "Feria",
    title: "Próximas fechas",
    text: "Aquí aparecerán los eventos y puntos de encuentro donde podrás ver las piezas en persona.",
  },
];

const emptyFeatured = ["Tapices murales", "Maceteros colgantes", "Cortinas decorativas"];

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "Makrana Home Art - Macramé artesanal para tu hogar" },
      {
        name: "description",
        content: "Piezas de macramé hechas a mano: decoración, accesorios, talleres y cursos.",
      },
      { property: "og:title", content: "Makrana Home Art" },
      { property: "og:description", content: "Macramé artesanal premium para tu hogar." },
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
  const availableWorkshops = workshops.filter((workshop) => workshop.status === "abierto");
  const inPersonWorkshops = availableWorkshops.filter(
    (workshop) => workshop.modality === "presencial" || workshop.modality === "hibrido",
  ).length;
  const virtualWorkshops = availableWorkshops.filter(
    (workshop) => workshop.modality === "virtual" || workshop.modality === "hibrido",
  ).length;

  return (
    <>
      <section className="relative min-h-[520px] overflow-hidden bg-cream md:min-h-[560px] lg:min-h-[600px]">
        <div className="absolute inset-0">
          <img
            src={hero}
            alt="Hojas decorativas de macramé artesanal en colores cálidos"
            width={1456}
            height={1088}
            className="h-full w-full object-cover object-[68%_center]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, var(--cream) 0%, oklch(0.965 0.018 78 / 0.96) 30%, oklch(0.965 0.018 78 / 0.58) 46%, transparent 68%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cream/10" />
        </div>

        <div className="container-makrana relative flex min-h-[520px] items-center py-16 md:min-h-[560px] lg:min-h-[600px] lg:py-20">
          <div className="max-w-[23rem]">
            <h1>
              <span className="sr-only">Makrana Home Art</span>
              <BrandLogo imageClassName="w-full max-w-[20rem] sm:max-w-[21rem] md:max-w-[22rem]" />
            </h1>
            <p className="mt-5 max-w-[22rem] text-[15px] leading-7 text-foreground md:text-base md:leading-8">
              Piezas creadas nudo a nudo, donde la paciencia y el detalle se transforman en diseños
              únicos. Artesanía que aporta calidez, autenticidad y estilo a cada rincón de tu hogar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <Button
                asChild
                size="lg"
                variant="hero"
                className="h-12 w-full rounded-xl px-8 sm:w-auto"
              >
                <Link to="/catalogo">Ver catálogo</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-xl border-accent bg-warm-white/70 px-8 text-accent hover:bg-warm-white sm:w-auto"
              >
                <Link to="/talleres">Talleres</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padded bg-warm-white">
        <div className="container-makrana grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent">Bienvenida</div>
            <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl md:text-5xl">
              Cada nudo cuenta una historia.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Makrana nace del tiempo, las manos y la dedicación. Cada pieza es tejida
              artesanalmente para llenar tu hogar de calidez, textura y autenticidad. Diseños únicos
              que transforman cualquier espacio en un lugar más acogedor.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <FeaturePill icon={Hand} label="Tejido artesanal" />
              <FeaturePill icon={Heart} label="Algodón natural" />
              <FeaturePill icon={Sparkles} label="Piezas únicas" />
            </div>
          </div>
          <div className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-sand/70 bg-cream shadow-2xl shadow-clay/20 lg:ml-auto lg:max-w-[34rem]">
            <img
              src={anaMaria}
              alt="Ana María presentando piezas de macramé artesanal"
              width={1085}
              height={1450}
              loading="lazy"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section className="bg-sand/45">
        <div className="container-makrana py-16 md:py-20">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent">Novedades</div>
            <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
              Lo que está pasando en el taller
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.length > 0
              ? news.map((n) => (
                  <Link
                    key={n.id}
                    to="/novedades/$slug"
                    params={{ slug: n.slug }}
                    className="rounded-3xl border border-sand/70 bg-warm-white/90 p-6 shadow-lg shadow-clay/10 transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-accent">
                      {n.category.replaceAll("_", " ")}
                    </span>
                    <h3 className="mt-4 font-display text-2xl leading-snug">{n.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {n.summary}
                    </p>
                  </Link>
                ))
              : emptyNews.map((n) => (
                  <article
                    key={n.title}
                    className="rounded-3xl border border-sand/70 bg-warm-white/90 p-6 shadow-lg shadow-clay/10"
                  >
                    <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-accent">
                      {n.tag}
                    </span>
                    <h3 className="mt-4 font-display text-2xl leading-snug">{n.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.text}</p>
                  </article>
                ))}
          </div>
        </div>
      </section>

      <section className="section-padded bg-warm-white">
        <div className="container-makrana">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-accent">Catálogo</div>
              <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
                Piezas destacadas
              </h2>
            </div>
            <Link
              to="/catalogo"
              className="shrink-0 text-sm font-medium text-accent hover:underline"
            >
              Ver todo
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.length > 0
              ? featured.map((p) => <ProductCard key={p.id} product={p as any} />)
              : emptyFeatured.map((name) => (
                  <article
                    key={name}
                    className="overflow-hidden rounded-3xl border border-sand/70 bg-card shadow-lg shadow-clay/10"
                  >
                    <div className="aspect-square bg-gradient-to-br from-cream via-sand/45 to-warm-white" />
                    <div className="p-5">
                      <div className="font-display text-xl">{name}</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Muy pronto agregaremos piezas publicadas desde el catálogo.
                      </p>
                      <div className="mt-4 text-sm font-medium text-accent">Próximamente</div>
                    </div>
                  </article>
                ))}
          </div>
        </div>
      </section>

      <section className="container-makrana pb-20">
        <div className="grid gap-8 overflow-hidden rounded-3xl border border-sand/70 bg-cream/80 p-8 shadow-xl shadow-clay/10 md:grid-cols-2 md:p-12">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent">
              APRENDE CON NOSOTRAS
            </div>
            <h2 className="mt-2 font-display text-3xl">
              Talleres de macramé para crear con tus propias manos
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Descubre el arte del macramé en nuestros talleres presenciales y virtuales. Aprende
              paso a paso, sin importar tu nivel, y crea piezas únicas con el acompañamiento de una
              instructora.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="w-full rounded-full sm:w-auto" variant="hero">
                <Link to="/talleres">
                  <Calendar className="h-4 w-4" />
                  Ver talleres
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-full sm:w-auto">
                <Link to="/registro">
                  <BookOpen className="h-4 w-4" />
                  Solicitar información
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 self-center sm:grid-cols-2">
            <StatCard value={inPersonWorkshops} label="talleres presenciales disponibles" />
            <StatCard value={virtualWorkshops} label="talleres virtuales disponibles" />
          </div>
        </div>
      </section>
    </>
  );
}

function FeaturePill({ icon: Icon, label }: { icon: typeof Hand; label: string }) {
  return (
    <div className="rounded-2xl border border-sand/70 bg-card p-4 text-center shadow-sm">
      <Icon className="mx-auto h-5 w-5 text-accent" />
      <div className="mt-2 text-sm font-medium">{label}</div>
    </div>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-warm-white p-5 shadow-sm">
      <div className="font-display text-3xl text-accent">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
