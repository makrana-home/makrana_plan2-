import { createFileRoute, Link } from "@tanstack/react-router";
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
  const [activeType, setActiveType] = useState<"featured" | "pieces" | "materials" | null>(
    "featured",
  );
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
    { value: "featured", label: "Destacados" },
    { value: "pieces", label: "Piezas" },
    { value: "materials", label: "Materiales" },
  ] as const;

  return (
    <section className="bg-cream/45 px-4 py-14 sm:px-5 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-accent">Catálogo</p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl font-light leading-tight text-foreground sm:text-5xl">
          Catálogo
        </h1>

        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por su nombre"
          className="mt-6 h-12 w-full max-w-xl rounded-2xl border border-sand bg-warm-white/90 px-4 text-sm shadow-sm outline-none transition focus:border-accent"
        />

        <div className="mt-8 flex flex-wrap gap-2">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setActiveType(filter.value);
                setActiveCat(null);
              }}
              className={filterClass(activeType === filter.value)}
            >
              {filter.label}
            </button>
          ))}
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/catalogo/categoria/$slug"
              params={{ slug: c.slug }}
              onClick={(e) => {
                e.preventDefault();
                setActiveType(null);
                setActiveCat(c.slug);
              }}
              className={filterClass(activeCat === c.slug)}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
