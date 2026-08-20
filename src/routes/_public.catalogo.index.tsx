import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listCategories, listProducts } from "@/lib/public.functions";
import { ProductCard } from "@/components/product-card";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getPresentationUnitLabel } from "@/lib/presentation-units";
import { ArrowUpRight, Sparkles } from "lucide-react";

const allQ = queryOptions({
  queryKey: ["public", "all-products"],
  queryFn: () => listProducts({ data: {} }),
});
const catsQ = queryOptions({ queryKey: ["public", "categories"], queryFn: () => listCategories() });

export const Route = createFileRoute("/_public/catalogo/")({
  validateSearch: (search: Record<string, unknown>): { categoria?: string } => ({
    categoria: typeof search.categoria === "string" ? search.categoria : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo · Makrana Home Art" },
      {
        name: "description",
        content: "Decoración, accesorios, materiales y kits de macramé hechos a mano.",
      },
      { property: "og:title", content: "Catálogo · Makrana Home Art" },
      { property: "og:description", content: "Decoración, accesorios y materiales de macramé." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(allQ);
    context.queryClient.ensureQueryData(catsQ);
  },
  component: Catalogo,
});

function Catalogo() {
  const { categoria } = Route.useSearch();
  const { data: products } = useSuspenseQuery(allQ);
  const { data: categories } = useSuspenseQuery(catsQ);
  const [activeType, setActiveType] = useState<"featured" | "pieces" | "materials" | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(categoria ?? null);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(searchTerm);
    return products.filter((p: any) => {
      const matchesType =
        activeType === null ||
        (activeType === "featured" && p.is_featured) ||
        (activeType === "pieces" && ["producto_terminado", "kit"].includes(p.type)) ||
        (activeType === "materials" && p.type === "material");
      const matchesCategory = !activeCat || p.category?.slug === activeCat;
      const searchable = normalizeSearch(
        `${p.name ?? ""} ${p.sku ?? ""} ${p.category?.name ?? ""} ${p.category?.slug ?? ""} ${(
          p.presentations ?? []
        )
          .map(
            (presentation: any) =>
              `${presentation.sku ?? ""} ${presentation.label ?? ""} ${
                presentation.unit ?? ""
              } ${getPresentationUnitLabel(presentation.unit, presentation.label)}`,
          )
          .join(" ")}`,
      );
      const matchesSearch = !q || searchable.includes(q);
      return matchesType && matchesCategory && matchesSearch;
    });
  }, [products, activeType, activeCat, searchTerm]);

  const typeFilters = [
    { value: "all", label: "Todo" },
    { value: "featured", label: "Destacados" },
    { value: "pieces", label: "Piezas" },
    { value: "materials", label: "Materiales" },
  ] as const;

  const categoryCards = useMemo(
    () =>
      categories.map((category) => {
        const categoryProducts = products.filter(
          (product: any) => product.category?.slug === category.slug,
        );
        const preferredProduct =
          category.slug === "arbol-de-la-vida"
            ? categoryProducts.find((product: any) => product.sku === "PZ-011")
            : undefined;
        return {
          ...category,
          count: categoryProducts.length,
          imageUrl:
            preferredProduct?.main_image_url ??
            categoryProducts.find((product: any) => product.main_image_url)?.main_image_url,
        };
      }),
    [categories, products],
  );
  const availableCategories = categoryCards.filter((category) => category.count > 0);
  const upcomingCategories = categoryCards.filter((category) => category.count === 0);

  function selectCategory(slug: string | null) {
    setActiveType(null);
    setActiveCat(slug);
    requestAnimationFrame(() =>
      document.getElementById("catalog-products")?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  return (
    <section className="bg-cream/45 px-4 py-14 sm:px-5 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-brand-terracotta">Catálogo</p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl font-light leading-tight text-foreground sm:text-5xl">
          Catálogo
        </h1>

        <div className="mt-12 max-w-2xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-terracotta">
              Explora por categoría
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
              Encuentra tu pieza ideal
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Descubre piezas tejidas a mano para transformar cada rincón de tu hogar.
            </p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {availableCategories.map((category) => {
            const isActive = activeCat === category.slug;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => selectCategory(category.slug)}
                aria-pressed={isActive}
                className={cn(
                  "group min-w-0 overflow-hidden rounded-[1.35rem] border bg-warm-white text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transform-none",
                  isActive
                    ? "border-accent ring-1 ring-accent/30"
                    : "border-sand/80 hover:border-accent/40",
                )}
              >
                <span className="relative block aspect-square overflow-hidden bg-sand/35">
                  <img
                    src={category.imageUrl ?? undefined}
                    alt={`Piezas de ${category.name}`}
                    width={1000}
                    height={1000}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04] motion-reduce:transform-none"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent opacity-60" />
                </span>
                <span className="flex min-h-[5.25rem] items-start justify-between gap-2 p-4">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-snug text-foreground sm:text-base">
                      {category.name}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {category.count === 1 ? "1 pieza" : `${category.count} piezas`}
                    </span>
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-brand-terracotta transition group-hover:bg-accent group-hover:text-warm-white">
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {upcomingCategories.length > 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-sand bg-warm-white/55 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-brand-terracotta">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Nuevas colecciones</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Muy pronto encontrarás más piezas.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
              {upcomingCategories.map((category) => (
                <span
                  key={category.id}
                  className="rounded-full border border-sand bg-warm-white px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  {category.name} · Próximamente
                </span>
              ))}
            </div>
          </div>
        )}

        <div id="catalog-products" className="mt-16 scroll-mt-24 border-t border-sand/70 pt-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-terracotta">
            Catálogo general
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-2xl sm:text-3xl">
              {activeCat
                ? categories.find((category) => category.slug === activeCat)?.name
                : "Todas las piezas"}
            </h2>
            <button
              type="button"
              onClick={() => selectCategory(null)}
              className="min-h-11 self-start rounded-full border border-sand bg-warm-white px-4 text-xs font-semibold transition hover:border-accent/50 hover:text-brand-terracotta"
            >
              Ver catálogo completo
            </button>
          </div>

          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar en el catálogo"
            className="mt-6 h-12 w-full max-w-xl rounded-2xl border border-sand bg-warm-white/90 px-4 text-base shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />

          <div className="mt-5 flex flex-wrap gap-2">
            {typeFilters.map((filter) => {
              const isAll = filter.value === "all";
              const active = isAll
                ? activeType === null && !activeCat
                : activeType === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    if (filter.value === "all") setActiveType(null);
                    else setActiveType(filter.value);
                    setActiveCat(null);
                  }}
                  className={filterClass(active)}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 text-center text-muted-foreground">
            No hay piezas o materiales visibles con este filtro todavía.
          </div>
        )}
      </div>
    </section>
  );
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function filterClass(active: boolean) {
  return cn(
    "rounded-full border border-sand px-4 py-2 text-xs font-semibold transition-colors",
    active
      ? "bg-accent text-warm-white shadow-sm"
      : "bg-warm-white/75 text-foreground hover:border-accent/50 hover:text-brand-terracotta",
  );
}
