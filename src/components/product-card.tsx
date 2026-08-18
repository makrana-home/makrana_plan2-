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
  show_price?: boolean;
};

const statusLabel: Record<string, string> = {
  disponible: "Disponible",
  por_encargo: "Bajo pedido",
  agotado: "Agotado",
  reservado: "Reservado",
};

const statusClass: Record<string, string> = {
  disponible: "bg-emerald-100 text-emerald-700",
  por_encargo: "bg-amber-100 text-amber-700",
  agotado: "bg-rose-100 text-rose-700",
  reservado: "bg-sky-100 text-sky-700",
};

export function ProductCard({
  product,
  showPrice = true,
  actionLabel,
  minimal = false,
  portraitImage = false,
}: {
  product: Product;
  showPrice?: boolean;
  actionLabel?: string;
  minimal?: boolean;
  portraitImage?: boolean;
}) {
  const typeLabel =
    product.type === "material" ? "Material" : product.type === "kit" ? "Kit" : "Pieza";
  const hasPresentations = product.type === "material" && (product.presentations?.length ?? 0) > 0;

  return (
    <article
      className={cn(
        "group overflow-hidden bg-warm-white transition duration-300",
        minimal
          ? "border-0 shadow-none"
          : "rounded-2xl border border-sand/80 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-clay/15",
      )}
    >
      <Link
        to="/catalogo/$slug"
        params={{ slug: product.slug }}
        className={cn(
          "relative block overflow-hidden bg-cream",
          minimal || portraitImage ? "aspect-[4/5]" : "aspect-[4/3]",
        )}
      >
        <span
          className={cn(
            "absolute left-3 top-3 z-10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]",
            !minimal && "rounded-full",
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
      <div className={cn("flex min-h-36 flex-col", minimal ? "px-0 py-4" : "p-4")}>
        <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
          <Link to="/catalogo/$slug" params={{ slug: product.slug }}>
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {product.short_description || "Pieza tejida artesanalmente para tu hogar."}
        </p>
        <div
          className={cn(
            "mt-auto flex items-end gap-3 pt-4",
            showPrice || actionLabel ? "justify-between" : "justify-end",
          )}
        >
          {showPrice && product.show_price === true && (
            <span
              className={cn(
                "font-extrabold leading-tight text-accent",
                hasPresentations ? "max-w-40 text-xs" : "text-sm",
              )}
            >
              {hasPresentations
                ? "En distintas presentaciones"
                : product.status === "por_encargo"
                  ? "Cotizar"
                : `S/ ${Number(product.price).toFixed(0)}`}
            </span>
          )}
          {(!showPrice || product.show_price !== true) && actionLabel && (
            <Link
              to="/catalogo/$slug"
              params={{ slug: product.slug }}
              className="text-sm font-bold text-accent transition-colors hover:text-accent/80"
            >
              {actionLabel}
            </Link>
          )}
          <span className="text-[10px] font-semibold text-muted-foreground">
            {product.category?.name ?? typeLabel}
          </span>
        </div>
      </div>
    </article>
  );
}
