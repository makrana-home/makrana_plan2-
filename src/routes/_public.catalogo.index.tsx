import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listCategories, listProducts } from "@/lib/public.functions";
import { ProductCard } from "@/components/product-card";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const allQ = queryOptions({
  queryKey: ["public", "all-products"],
  queryFn: () => listProducts({ data: {} }),
});
const catsQ = queryOptions({ queryKey: ["public", "categories"], queryFn: () => listCategories() });

export const Route = createFileRoute("/_public/catalogo/")({
  head: () => ({
    meta: [
      { title: "Catálogo · Makrana Home Art" },
      { name: "description", content: "Decoración, accesorios, materiales y kits de macramé hechos a mano." },
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
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeCat) return products;
    return products.filter((p: any) => p.category?.slug === activeCat);
  }, [products, activeCat]);

  return (
    <section className="section-padded">
      <div className="container-makrana">
        <p className="text-xs uppercase tracking-widest text-accent">Catálogo</p>
        <h1 className="font-display text-5xl mt-2">Nuestras piezas</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Decoración, accesorios y materiales tejidos a mano en algodón natural. Filtra por categoría
          para descubrir lo que se acomoda a tu hogar.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat(null)}
            className={cn(
              "px-4 py-2 rounded-full text-sm border border-sand transition-colors",
              activeCat === null ? "bg-foreground text-warm-white" : "bg-cream/60 hover:bg-cream",
            )}
          >Todo</button>
          {categories.map((c) => (
            <Link key={c.id} to="/catalogo/categoria/$slug" params={{ slug: c.slug }}
              onClick={(e) => { e.preventDefault(); setActiveCat(c.slug); }}
              className={cn(
                "px-4 py-2 rounded-full text-sm border border-sand transition-colors",
                activeCat === c.slug ? "bg-foreground text-warm-white" : "bg-cream/60 hover:bg-cream",
              )}>{c.name}</Link>
          ))}
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
        {filtered.length === 0 && (
          <div className="mt-16 text-center text-muted-foreground">No hay productos en esta categoría todavía.</div>
        )}
      </div>
    </section>
  );
}
