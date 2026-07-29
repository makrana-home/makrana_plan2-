import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import {
  listHomeCategories,
  getHomeSectionVisibility,
  listNews,
  listProducts,
  listWorkshops,
} from "@/lib/public.functions";
import anaMaria from "@/assets/ana-maria-makrana.jpg";
import customProjectImage from "@/assets/hero-telar-sala.jpg";
import workshopImage from "@/assets/hero-telar.jpg";
import uniquePiecesIcon from "@/assets/benefits/piezas-unicas.png";
import madeInPeruIcon from "@/assets/benefits/hecho-en-peru.png";
import customDesignIcon from "@/assets/benefits/diseno-a-medida.png";
import nationalShippingIcon from "@/assets/benefits/envios-nacionales.png";

const featuredQ = queryOptions({
  queryKey: ["public", "featured-products"],
  queryFn: () => listProducts({ data: { featuredOnly: true, limit: 4 } }),
});
const newsQ = queryOptions({
  queryKey: ["public", "home-news"],
  queryFn: () => listNews({ data: { limit: 5 } }),
});
const workshopsQ = queryOptions({
  queryKey: ["public", "home-workshops"],
  queryFn: () => listWorkshops({ data: {} }),
});
const homeCategoriesQ = queryOptions({
  queryKey: ["public", "home-categories"],
  queryFn: () => listHomeCategories(),
});
const homeSectionsQ = queryOptions({
  queryKey: ["public", "home-section-visibility"],
  queryFn: () => getHomeSectionVisibility(),
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

const emptyFeatured = [
  "Tapices murales",
  "Maceteros colgantes",
  "Cortinas decorativas",
  "Árbol de la vida",
];

const testimonials = [
  {
    quote:
      "Llegué buscando aprender macramé y encontré mucho más. Cada clase fue un momento de calma para mí. Salía con la mente tranquila, aprendiendo algo nuevo y disfrutando el proceso.",
    author: "Andrea R.",
  },
  {
    quote:
      "Nunca había tejido antes y pensé que sería muy difícil. La forma de enseñar hizo que disfrutara cada nudo. Hoy puedo crear piezas que jamás imaginé hacer.",
    author: "Daniela P.",
  },
  {
    quote:
      "Cada taller fue un espacio para desconectarme del estrés y conectar con mi creatividad. Aprendí una técnica hermosa y me llevé una experiencia que quiero seguir viviendo.",
    author: "Sofía L.",
  },
];

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
    context.queryClient.ensureQueryData(homeCategoriesQ);
    context.queryClient.ensureQueryData(homeSectionsQ);
  },
  component: Home_,
});

function Home_() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const { data: featured } = useSuspenseQuery(featuredQ);
  const { data: news } = useSuspenseQuery(newsQ);
  const { data: workshops } = useSuspenseQuery(workshopsQ);
  const { data: homeCategories } = useSuspenseQuery(homeCategoriesQ);
  const { data: homeSections } = useSuspenseQuery(homeSectionsQ);
  const availableWorkshops = workshops.filter((workshop) => workshop.status === "abierto");
  const inPersonWorkshops = availableWorkshops.filter(
    (workshop) => workshop.modality === "presencial" || workshop.modality === "hibrido",
  ).length;
  const virtualWorkshops = availableWorkshops.filter(
    (workshop) => workshop.modality === "virtual" || workshop.modality === "hibrido",
  ).length;

  const editorialColumn = (index: number, total = 3) => {
    if (total === 1) return "lg:col-span-12";
    if (total === 2) return index === 0 ? "lg:col-span-5" : "lg:col-span-7";
    return index === 0 ? "lg:col-span-4" : index === 1 ? "lg:col-span-5" : "lg:col-span-3";
  };

  const EditorialImage = ({
    src,
    alt,
    index,
  }: {
    src: string | null;
    alt: string;
    index: number;
  }) => {
    const ratio =
      index === 1 ? "aspect-[4/5]" : index === 2 ? "aspect-[4/3]" : "aspect-[5/4]";

    return (
      <div className={`overflow-hidden rounded-2xl bg-cream ${ratio}`}>
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-cream via-sand/70 to-clay/20" />
        )}
      </div>
    );
  };

  return (
    <>
      {homeSections.hero && (
        <section className="relative isolate min-h-[100svh] overflow-hidden bg-primary">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <video
            className="absolute inset-0 h-full w-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/portada-makrana.svg"
          >
            <source src="/portada-makrana.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="container-makrana relative z-10 flex min-h-[100svh] items-center">
          <div className="w-full max-w-2xl pb-8 pt-20 text-left sm:pt-24 md:-translate-y-6 lg:max-w-[42rem]">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white sm:text-xs">
              Arte textil contemporáneo
            </p>
            <h1 className="mt-4 max-w-[15ch] font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] text-white">
              Piezas de macramé que transforman espacios
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              Descubre piezas de macramé hechas a mano, encarga un diseño pensado para tu espacio
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-5">
              <Button asChild variant="hero" size="lg" className="rounded-xl px-7">
                <Link to="/catalogo">Explorar piezas</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="rounded-xl px-5 font-semibold text-white hover:bg-white/15 hover:text-white"
              >
                <a
                  href="https://wa.me/51986608552?text=Hola%20Makrana%2C%20quiero%20cotizar%20un%20proyecto%20para%20mi%20espacio."
                  target="_blank"
                  rel="noreferrer"
                >
                  Cotizar un proyecto
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
        </section>
      )}

      {homeSections.benefits && (
        <section
          className="border-b border-sand/60 bg-warm-white"
          aria-label="Características de Makrana"
        >
        <div className="container-makrana grid grid-cols-2 py-2 sm:py-3 lg:grid-cols-4 lg:py-2">
          <MakranaBenefit
            iconSrc={uniquePiecesIcon}
            title="Piezas únicas"
            description="Ninguna pieza es igual a otra."
          />
          <MakranaBenefit
            iconSrc={madeInPeruIcon}
            title="Hecho en Perú"
            description="Arte textil hecho localmente."
            className="border-l border-sand/80"
          />
          <MakranaBenefit
            iconSrc={customDesignIcon}
            title="Diseño a medida"
            description="Creamos según tu visión."
            className="border-t border-sand/80 lg:border-l lg:border-t-0"
          />
          <MakranaBenefit
            iconSrc={nationalShippingIcon}
            title="Envíos nacionales"
            description="Seguros y confiables."
            className="border-l border-t border-sand/80 lg:border-t-0"
          />
        </div>
        </section>
      )}

      {homeSections.categories && (
        <section className="bg-warm-white py-16 sm:py-20">
        <div className="container-makrana">
          <h2 className="text-center font-display text-2xl leading-tight sm:text-3xl">
            Encuentra una pieza para tu espacio
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {homeCategories.map((category) => (
              <Link
                key={category.id}
                to="/catalogo/categoria/$slug"
                params={{ slug: category.slug }}
                className="group overflow-hidden rounded-xl border border-sand/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-clay/15"
              >
                <div className="aspect-[5/4] overflow-hidden bg-gradient-to-br from-cream via-sand/60 to-clay/20">
                  {category.home_image_url ? (
                    <img
                      src={category.home_image_url}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImagePlaceholder />
                    </div>
                  )}
                </div>
                <div className="flex min-h-24 items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <h3 className="font-display text-base leading-tight">{category.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {category.home_description || "Piezas artesanales para transformar tu espacio."}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
        </section>
      )}

      {homeSections.welcome && (
        <section className="bg-terracotta py-12 text-warm-white sm:py-16 md:py-20">
          <div className="container-makrana grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-14">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream shadow-xl shadow-black/10 lg:-my-4">
              <img
                src={anaMaria}
                alt="Ana María trabajando una pieza de macramé artesanal"
                width={1085}
                height={1450}
                loading="lazy"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="max-w-xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-warm-white/75">
                Diseño · Artesanía · Significado
              </div>
              <h2 className="mt-4 font-display text-3xl leading-[1.08] text-warm-white sm:text-4xl md:text-5xl">
                Arte tejido para
                <br className="hidden sm:block" /> habitar con calma
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-warm-white/80 sm:text-base">
                En Makrana, cada pieza nace del encuentro entre la tradición textil peruana y el
                diseño contemporáneo. Trabajamos con fibras naturales y técnicas ancestrales para
                crear obras que transforman espacios y acompañan historias.
              </p>
              <Link
                to="/sobre-makrana"
                className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-warm-white transition-opacity hover:opacity-75"
              >
                Conoce nuestro proceso
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {homeSections.news && (
        <section className="border-y border-sand/60 bg-sand/45">
        <div className="container-makrana py-24 md:py-28">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-accent">Novedades</div>
            <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
              Lo que está pasando en el taller
            </h2>
          </div>
          <div className="mt-12 grid items-start gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-12">
            {news.length > 0
              ? news.slice(0, 3).map((n, index) => (
                  <Link
                    key={n.id}
                    to="/novedades/$slug"
                    params={{ slug: n.slug }}
                    className={`group block ${editorialColumn(index)}`}
                  >
                    <EditorialImage src={n.cover_image_url} alt={n.title} index={index} />
                    <div className="flex items-start justify-between gap-4 pt-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.16em] text-accent">
                          {n.category.replaceAll("_", " ")}
                        </span>
                        <h3 className="mt-1 font-display text-lg leading-snug">{n.title}</h3>
                      </div>
                      <span className="shrink-0 pt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Ver más
                      </span>
                    </div>
                  </Link>
                ))
              : emptyNews.map((n, index) => (
                  <article key={n.title} className={editorialColumn(index)}>
                    <EditorialImage src={null} alt="" index={index} />
                    <span className="mt-3 block text-[10px] uppercase tracking-[0.16em] text-accent">
                      {n.tag}
                    </span>
                    <h3 className="mt-1 font-display text-lg leading-snug">{n.title}</h3>
                  </article>
                ))}
          </div>
        </div>
        </section>
      )}

      {homeSections.featured && (
        <section className="bg-warm-white py-16 md:py-20">
        <div className="container-makrana overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-tight sm:text-4xl">
                Piezas destacadas
              </h2>
            </div>
            <Link
              to="/catalogo"
              className="group inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-accent"
            >
              Ver catálogo completo
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="-mx-4 mt-7 overflow-x-auto px-4 pb-4 sm:-mx-5 sm:px-5 lg:mx-0 lg:overflow-visible lg:px-0">
            <div className="grid min-w-max grid-cols-[repeat(4,15.5rem)] gap-4 lg:min-w-0 lg:grid-cols-4">
            {featured.length > 0
              ? featured.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product as any}
                  />
                ))
              : emptyFeatured.map((name, index) => (
                  <article
                    key={name}
                    className="overflow-hidden rounded-2xl border border-sand/80 bg-warm-white"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-cream via-sand/60 to-clay/20" />
                    <div className="min-h-32 p-4">
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold uppercase text-amber-700">
                        Por encargo
                      </span>
                      <h3 className="mt-3 font-display text-lg">{name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pieza tejida artesanalmente para tu hogar.
                      </p>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </div>
        </section>
      )}

      {homeSections.customProjects && (
        <section className="bg-primary py-8 text-primary-foreground sm:py-10 md:py-14">
          <div className="container-makrana grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-clay/25">
              <img
                src={customProjectImage}
                alt="Proyecto de macramé creado a medida para un espacio"
                loading="lazy"
                className="h-full w-full object-cover object-[center_35%]"
              />
            </div>
            <div className="py-2 lg:pl-6">
              <div className="text-[10px] uppercase tracking-[0.28em] text-primary-foreground/70">
                Proyectos a medida
              </div>
              <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
                Creamos una pieza ideal para tu proyecto
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/75">
                Colaboramos con interioristas, arquitectos y marcas para diseñar piezas textiles
                únicas que elevan cada espacio.
              </p>
              <ol className="mt-7 grid gap-4 sm:grid-cols-3">
                {[
                  ["1", "Cuéntanos", "tu espacio"],
                  ["2", "Diseñamos", "la propuesta"],
                  ["3", "Tejemos", "tu pieza"],
                ].map(([number, title, text]) => (
                  <li key={number} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-foreground/55 font-display text-lg">
                      {number}
                    </span>
                    <span className="text-xs leading-snug">
                      <strong className="block font-semibold">{title}</strong>
                      <span className="text-primary-foreground/70">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Button asChild variant="secondary" className="mt-8 rounded-full px-6">
                <a
                  href="https://wa.me/51986608552?text=Hola%20Makrana%2C%20quiero%20solicitar%20una%20propuesta%20para%20un%20proyecto%20a%20medida."
                  target="_blank"
                  rel="noreferrer"
                >
                  Solicitar propuesta
                </a>
              </Button>
            </div>
          </div>
        </section>
      )}

      {(homeSections.workshops || homeSections.testimonials) && (
        <section className="border-b border-sand/60 bg-cream/45 py-16 md:py-20">
          <div
            className={`container-makrana grid gap-12 ${
              homeSections.workshops && homeSections.testimonials
                ? "lg:grid-cols-[1.12fr_0.88fr]"
                : ""
            }`}
          >
            {homeSections.workshops && (
              <article className="grid gap-7 sm:grid-cols-[0.82fr_1.18fr] sm:items-center">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-accent">
                    Talleres presenciales
                  </div>
                  <h2 className="mt-3 font-display text-3xl leading-tight">
                    Aprende a crear con tus propias manos
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Vive la experiencia Makrana en nuestros talleres de macramé. Técnicas,
                    materiales y comunidad en un ambiente inspirador.
                  </p>
                  <Button asChild variant="outline" className="mt-6 rounded-full">
                    <Link to="/talleres">
                      <Calendar className="h-4 w-4" />
                      Ver próximos talleres
                    </Link>
                  </Button>
                  <div className="mt-5 flex gap-4 text-[11px] text-muted-foreground">
                    <span>{inPersonWorkshops} presenciales</span>
                    <span>{virtualWorkshops} virtuales</span>
                  </div>
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-sand/50">
                  <img
                    src={workshopImage}
                    alt="Taller presencial de macramé Makrana"
                    loading="lazy"
                    className="h-full w-full object-cover object-[center_25%]"
                  />
                </div>
              </article>
            )}

            {homeSections.testimonials && (
              <article className="flex flex-col justify-center border-t border-sand/70 pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
                <div className="text-[10px] uppercase tracking-[0.25em] text-accent">
                  Lo que dicen nuestros clientes
                </div>
                <blockquote className="relative mt-7 pl-10">
                  <span
                    className="absolute left-0 top-[-0.35rem] font-display text-6xl leading-none text-accent/70"
                    aria-hidden="true"
                  >
                    “
                  </span>
                  <p className="font-display text-xl leading-relaxed text-foreground sm:text-2xl">
                    {testimonials[activeTestimonial].quote}
                  </p>
                  <footer className="mt-5 text-xs font-medium text-muted-foreground">
                    — {testimonials[activeTestimonial].author}
                  </footer>
                </blockquote>
                <div className="mt-8 flex items-center gap-2 pl-10" aria-label="Testimonios">
                  {testimonials.map((testimonial, index) => (
                    <button
                      key={testimonial.author}
                      type="button"
                      className={`rounded-full transition-all ${
                        index === activeTestimonial
                          ? "h-2.5 w-2.5 bg-accent"
                          : "h-2 w-2 bg-sand hover:bg-clay"
                      }`}
                      onClick={() => setActiveTestimonial(index)}
                      aria-label={`Ver testimonio de ${testimonial.author}`}
                      aria-pressed={index === activeTestimonial}
                    />
                  ))}
                </div>
              </article>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function MakranaBenefit({
  iconSrc,
  title,
  description,
  className = "",
}: {
  iconSrc: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <article
      className={`flex min-h-28 items-center justify-center gap-3 px-3 py-3 text-center sm:px-5 lg:min-h-24 lg:py-2 ${className}`}
    >
      <img
        src={iconSrc}
        alt=""
        className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
        aria-hidden="true"
      />
      <div>
        <h2 className="font-display text-sm leading-tight text-foreground sm:text-base">{title}</h2>
        <p className="mt-1 max-w-36 text-[11px] leading-snug text-muted-foreground sm:text-xs">
          {description}
        </p>
      </div>
    </article>
  );
}

function ImagePlaceholder() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-24 w-24 text-accent/35"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="35" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M60 88V35m0 18-15-13m15 28 19-17M60 58 44 70m16 2 13 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
