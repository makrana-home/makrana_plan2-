import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  main_image_url: string | null;
  price: number;
  status: string;
  category?: { slug: string; name: string } | null;
};

const statusLabel: Record<string, string> = {
  disponible: "Disponible",
  por_encargo: "Por encargo",
  agotado: "Agotado",
  reservado: "Reservado",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  disponible: "default",
  por_encargo: "secondary",
  agotado: "destructive",
  reservado: "outline",
};

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="makrana-card group flex flex-col">
      <Link
        to="/catalogo/$slug"
        params={{ slug: product.slug }}
        className="block aspect-[4/5] overflow-hidden bg-cream"
      >
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
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {product.category?.name}
          </span>
          <Badge variant={statusVariant[product.status] ?? "outline"}>
            {statusLabel[product.status] ?? product.status}
          </Badge>
        </div>
        <h3 className="font-display text-lg leading-tight text-foreground">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{product.short_description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-xl text-foreground">
            S/ {Number(product.price).toFixed(2)}
          </span>
          <Button asChild size="sm" variant="soft">
            <Link to="/catalogo/$slug" params={{ slug: product.slug }}>
              Ver detalle
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
