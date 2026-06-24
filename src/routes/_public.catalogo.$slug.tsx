import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getProductBySlug, listProducts } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product-card";

const statusLabel: Record<string, string> = {
  disponible: "Disponible", por_encargo: "Por encargo", agotado: "Agotado", reservado: "Reservado",
};

const productQ = (slug: string) =>
  queryOptions({ queryKey: ["public", "product", slug], queryFn: () => getProductBySlug({ data: { slug } }) });
const relatedQ = queryOptions({ queryKey: ["public","related"], queryFn: () => listProducts({ data: { limit: 4 } }) });

export const Route = createFileRoute("/_public/catalogo/$slug")({
  head: ({ loaderData }) => {
    const p = (loaderData as any)?.product;
    return {
      meta: [
        { title: p ? `${p.name} · Makrana Home Art` : "Producto · Makrana" },
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
      <h1 className="font-display text-3xl">Producto no encontrado</h1>
      <Button asChild className="mt-6"><Link to="/catalogo">Volver al catálogo</Link></Button>
    </div>
  ),
  errorComponent: () => <div className="container-makrana py-24">Error cargando el producto.</div>,
});

function waLink(name: string) {
  const text = encodeURIComponent(`Hola Makrana, me interesa el producto "${name}".`);
  return `https://wa.me/51999999999?text=${text}`;
}

function ProductDetail() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQ(slug));
  const { data: related } = useSuspenseQuery(relatedQ);
  if (!product) return null;
  const p: any = product;
  const totalStock = (p.stock ?? []).reduce((acc: number, s: any) => acc + Number(s.quantity ?? 0), 0);
  const images: { url: string; alt?: string }[] = [];
  if (p.main_image_url) images.push({ url: p.main_image_url, alt: p.name });
  for (const im of (p.images ?? [])) images.push({ url: im.url, alt: im.alt ?? p.name });

  return (
    <section className="section-padded">
      <div className="container-makrana grid lg:grid-cols-2 gap-12">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-cream">
            {images[0] && <img src={images[0].url} alt={images[0].alt} className="h-full w-full object-cover" />}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.slice(1).map((im, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-md bg-cream">
                  <img src={im.url} alt={im.alt} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <Link to="/catalogo" className="text-sm text-accent">← Volver al catálogo</Link>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-4">{p.category?.name}</p>
          <h1 className="font-display text-4xl mt-2">{p.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-display text-3xl">S/ {Number(p.price).toFixed(2)}</span>
            <Badge>{statusLabel[p.status] ?? p.status}</Badge>
          </div>
          <p className="mt-5 text-muted-foreground whitespace-pre-line">{p.description ?? p.short_description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
            {p.measurements && (<><dt className="text-muted-foreground">Medidas</dt><dd>{p.measurements}</dd></>)}
            {p.material && (<><dt className="text-muted-foreground">Material</dt><dd>{p.material}</dd></>)}
            {p.color && (<><dt className="text-muted-foreground">Color</dt><dd>{p.color}</dd></>)}
            {p.artisan && (<><dt className="text-muted-foreground">Artesana</dt><dd>{p.artisan}</dd></>)}
            <dt className="text-muted-foreground">Stock disponible</dt>
            <dd>{totalStock > 0 ? `${totalStock} unidades` : "Consulta por encargo"}</dd>
          </dl>

          {p.presentations && p.presentations.length > 0 && (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-widest text-accent mb-2">Presentaciones</p>
              <ul className="divide-y divide-sand/60 rounded-lg border border-sand/60 overflow-hidden">
                {p.presentations.map((pr: any) => (
                  <li key={pr.id} className="flex justify-between px-4 py-3 text-sm bg-cream/40">
                    <span>{pr.label ?? pr.unit}</span>
                    <span className="font-medium">S/ {Number(pr.price).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="hero">
              <a href={waLink(p.name)} target="_blank" rel="noreferrer">Consultar por WhatsApp</a>
            </Button>
            <Button asChild size="lg" variant="outline"><Link to="/catalogo">Seguir explorando</Link></Button>
          </div>
        </div>
      </div>

      <div className="container-makrana mt-24">
        <h2 className="font-display text-3xl mb-6">También te puede gustar</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {related.filter((r: any) => r.slug !== p.slug).slice(0, 4).map((r: any) => <ProductCard key={r.id} product={r} />)}
        </div>
      </div>
    </section>
  );
}
