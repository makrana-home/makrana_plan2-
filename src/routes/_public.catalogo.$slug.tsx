import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getProductBySlug, listProducts } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product-card";
import { getPresentationUnitLabel } from "@/lib/presentation-units";
import { addToCart } from "@/lib/cart";

const statusLabel: Record<string, string> = {
  disponible: "Disponible",
  por_encargo: "Por encargo",
  agotado: "Agotado",
  reservado: "Reservado",
};

const productQ = (slug: string) =>
  queryOptions({
    queryKey: ["public", "product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
  });
const relatedQ = queryOptions({
  queryKey: ["public", "related"],
  queryFn: () => listProducts({ data: { limit: 4 } }),
});

export const Route = createFileRoute("/_public/catalogo/$slug")({
  head: ({ loaderData }) => {
    const p = (loaderData as any)?.product;
    return {
      meta: [
        { title: p ? `${p.name} · Makrana Home Art` : "Pieza · Makrana" },
        { name: "description", content: p?.short_description ?? "Pieza artesanal en macramé." },
        { property: "og:title", content: p?.name ?? "Makrana" },
        { property: "og:description", content: p?.short_description ?? "" },
        ...(p?.main_image_url ? [{ property: "og:image", content: p.main_image_url }] : []),
      ],
    };
  },
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData(productQ(params.slug));
    if (!product) throw notFound();
    context.queryClient.ensureQueryData(relatedQ);
    return { product };
  },
  component: ProductDetail,
  notFoundComponent: () => (
    <div className="container-makrana py-24 text-center">
      <h1 className="font-display text-3xl">Pieza no encontrada</h1>
      <Button asChild className="mt-6">
        <Link to="/catalogo">Volver al catálogo</Link>
      </Button>
    </div>
  ),
  errorComponent: () => <div className="container-makrana py-24">Error cargando la pieza.</div>,
});

function waLink(name: string) {
  const text = encodeURIComponent(`Hola Makrana, me interesa la pieza "${name}".`);
  return `https://wa.me/51986608552?text=${text}`;
}

function ProductDetail() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQ(slug));
  const { data: related } = useSuspenseQuery(relatedQ);
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | undefined>(
    (product as any)?.presentations?.[0]?.id,
  );
  if (!product) return null;
  const p: any = product;
  const hasPresentations = p.type === "material" && (p.presentations ?? []).length > 0;
  const totalStock = (p.stock ?? []).reduce(
    (acc: number, s: any) => acc + Number(s.quantity ?? 0),
    0,
  );
  const images: { url: string; alt?: string }[] = [];
  if (p.main_image_url) images.push({ url: p.main_image_url, alt: p.name });
  for (const im of p.images ?? []) images.push({ url: im.url, alt: im.alt ?? p.name });

  return (
    <section className="section-padded">
      <div className="container-makrana grid lg:grid-cols-2 gap-12">
        <ProductGallery images={images} productName={p.name} />
        <div>
          <Link to="/catalogo" className="text-sm text-brand-terracotta">
            ← Volver al catálogo
          </Link>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-4">
            {p.category?.name}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{p.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {p.show_price === true && (
              <span className="font-display text-2xl leading-tight sm:text-3xl">
                {hasPresentations
                  ? "En distintas presentaciones"
                  : `S/ ${Number(p.price).toFixed(2)}`}
              </span>
            )}
            <Badge>{statusLabel[p.status] ?? p.status}</Badge>
          </div>
          <p className="mt-5 text-muted-foreground whitespace-pre-line">
            {p.description ?? p.short_description}
          </p>

          <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
            {p.measurements && (
              <>
                <dt className="text-muted-foreground">Medidas</dt>
                <dd>{p.measurements}</dd>
              </>
            )}
            {p.material && (
              <>
                <dt className="text-muted-foreground">Material</dt>
                <dd>{p.material}</dd>
              </>
            )}
            {p.color && (
              <>
                <dt className="text-muted-foreground">Color</dt>
                <dd>{p.color}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Stock disponible</dt>
            <dd>{totalStock > 0 ? `${totalStock} unidades` : "Consulta por encargo"}</dd>
          </dl>

          {p.presentations && p.presentations.length > 0 && (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-widest text-brand-terracotta mb-2">
                Presentaciones
              </p>
              <ul className="divide-y divide-sand/60 rounded-lg border border-sand/60 overflow-hidden">
                {p.presentations.map((pr: any) => (
                  <li
                    key={pr.id}
                    className={`flex cursor-pointer flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm ${selectedPresentationId === pr.id ? "bg-accent/15" : "bg-cream/40"}`}
                    onClick={() => setSelectedPresentationId(pr.id)}
                  >
                    <span className="min-w-0">{getPresentationUnitLabel(pr.unit, pr.label)}</span>
                    {p.show_price === true && (
                      <span className="font-medium">S/ {Number(pr.price).toFixed(2)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              variant="hero"
              className="w-full sm:w-auto"
              disabled={p.status === "agotado" || (hasPresentations && !selectedPresentationId)}
              onClick={() => {
                addToCart({
                  productId: p.id,
                  presentationId: selectedPresentationId,
                  name: p.name,
                  imageUrl: p.main_image_url,
                  type: p.type,
                  quantity: 1,
                });
                toast.success("Agregado al carrito");
              }}
            >
              Agregar al carrito
            </Button>
            <Button asChild size="lg" variant="hero" className="w-full sm:w-auto">
              <a href={waLink(p.name)} target="_blank" rel="noreferrer">
                Consultar por WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/catalogo">Seguir explorando</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container-makrana mt-24">
        <h2 className="font-display text-3xl mb-6">También te puede gustar</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {related
            .filter((r: any) => r.slug !== p.slug)
            .slice(0, 4)
            .map((r: any) => (
              <ProductCard key={r.id} product={r} />
            ))}
        </div>
      </div>
    </section>
  );
}

function ProductGallery({
  images,
  productName,
}: {
  images: { url: string; alt?: string }[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = images.length > 1;

  function show(index: number) {
    setActiveIndex((index + images.length) % images.length);
  }

  if (images.length === 0) {
    return <div className="aspect-square rounded-2xl bg-cream" aria-label="Producto sin imagen" />;
  }

  return (
    <div aria-label={`Galería de ${productName}`}>
      <div className="group relative aspect-square overflow-hidden rounded-2xl bg-cream">
        <img
          key={images[activeIndex].url}
          src={images[activeIndex].url}
          alt={images[activeIndex].alt || `${productName}, imagen ${activeIndex + 1}`}
          width={1000}
          height={1000}
          className="h-full w-full object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        />
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => show(activeIndex - 1)}
              aria-label="Ver imagen anterior"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-warm-white/95 text-foreground shadow-md transition hover:bg-warm-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => show(activeIndex + 1)}
              aria-label="Ver imagen siguiente"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-warm-white/95 text-foreground shadow-md transition hover:bg-warm-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/75 px-3 py-1 text-xs font-semibold text-warm-white">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {hasMultiple && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => show(index)}
              aria-label={`Ver imagen ${index + 1} de ${productName}`}
              aria-current={activeIndex === index ? "true" : undefined}
              className={`aspect-square min-h-11 overflow-hidden rounded-lg border-2 bg-cream transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                activeIndex === index
                  ? "border-accent shadow-sm"
                  : "border-transparent opacity-75 hover:opacity-100"
              }`}
            >
              <img
                src={image.url}
                alt=""
                width={160}
                height={160}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
