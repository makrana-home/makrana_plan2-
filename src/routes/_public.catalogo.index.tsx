import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listCategories, listProducts } from "@/lib/public.functions";
import { ProductCard } from "@/components/product-card";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getPresentationUnitLabel } from "@/lib/presentation-units";

const allQ = queryOptions({
  queryKey: ["public", "all-products"],
  queryFn: () => listProducts({ data: {} }),
});
const catsQ = queryOptions({ queryKey: ["public", "categories"], queryFn: () => listCategories() });

export const Route = createFileRoute("/_public/catalogo/")({
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
  const { data: products } = useSuspenseQuery(allQ);
  const { data: categories } = useSuspenseQuery(catsQ);
  const [activeType, setActiveType] = useState<"featured" | "pieces" | "materials" | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
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
        return {
          ...category,
          count: categoryProducts.length,
          imageUrl: categoryProducts.find((product: any) => product.main_image_url)?.main_image_url,
        };
      }),
    [categories, products],
  );

  function selectCategory(slug: string | null) {
    setActiveType(null);
    setActiveCat(slug);
    requestAnimationFrame(() =>
      document.getElementById("catalog-products")?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  return (
    <section className="bg-cream/45 px-4 py-14 sm:px-5 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-accent">Catálogo</p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl font-light leading-tight text-foreground sm:text-5xl">
          Catálogo
        </h1>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Explora por categoría
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl">Encuentra tu pieza ideal</h2>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categoryCards.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.slug)}
              className="group min-w-0 overflow-hidden rounded-2xl border border-sand/80 bg-warm-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="block aspect-square overflow-hidden bg-sand/35">
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt=""
                    width={1000}
                    height={1000}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-4 text-center font-display text-lg text-accent/70">
                    Makrana
                  </span>
                )}
              </span>
              <span className="block p-3">
                <span className="block text-sm font-semibold leading-tight text-foreground">
                  {category.name}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {category.count === 1 ? "1 pieza" : `${category.count} piezas`}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div id="catalog-products" className="mt-16 scroll-mt-24 border-t border-sand/70 pt-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
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
              className="min-h-11 self-start rounded-full border border-sand bg-warm-white px-4 text-xs font-semibold transition hover:border-accent/50 hover:text-accent"
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

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      : "bg-warm-white/75 text-foreground hover:border-accent/50 hover:text-accent",
  );
}
