import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  main_image_url: string | null;
  price: number;
  status: string;
  type?: string;
  category?: { slug: string; name: string } | null;
  presentations?: unknown[] | null;
};

const statusLabel: Record<string, string> = {
  disponible: "Disponible",
  por_encargo: "Por encargo",
  agotado: "Agotado",
  reservado: "Reservado",
};

const statusClass: Record<string, string> = {
  disponible: "bg-emerald-100 text-emerald-700",
  por_encargo: "bg-amber-100 text-amber-700",
  agotado: "bg-rose-100 text-rose-700",
  reservado: "bg-sky-100 text-sky-700",
};

export function ProductCard({ product }: { product: Product }) {
  const typeLabel =
    product.type === "material" ? "Material" : product.type === "kit" ? "Kit" : "Pieza";
  const hasPresentations = product.type === "material" && (product.presentations?.length ?? 0) > 0;

  return (
    <article className="group overflow-hidden rounded-2xl border border-sand/80 bg-warm-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-clay/15">
      <Link
        to="/catalogo/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-[4/3] overflow-hidden bg-cream"
      >
        <span
          className={cn(
            "absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-extrabold",
            statusClass[product.status] ?? "bg-cream text-muted-foreground",
          )}
        >
          {statusLabel[product.status] ?? product.status}
        </span>
        {product.main_image_url ? (
          <img
            src={product.main_image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-sand/40" />
        )}
      </Link>
      <div className="flex min-h-36 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
          <Link to="/catalogo/$slug" params={{ slug: product.slug }}>
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {product.short_description || "Pieza tejida artesanalmente para tu hogar."}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <span
            className={cn(
              "font-extrabold leading-tight text-accent",
              hasPresentations ? "max-w-40 text-xs" : "text-sm",
            )}
          >
            {hasPresentations
              ? "En distintas presentaciones"
              : `S/ ${Number(product.price).toFixed(0)}`}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {product.category?.name ?? typeLabel}
          </span>
        </div>
      </div>
    </article>
  );
}
