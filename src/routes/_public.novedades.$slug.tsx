import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getNewsBySlug } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";

const q = (slug: string) =>
  queryOptions({
    queryKey: ["public", "news", slug],
    queryFn: () => getNewsBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/_public/novedades/$slug")({
  head: ({ loaderData }) => {
    const n = (loaderData as any)?.post;
    return {
      meta: [
        { title: n ? `${n.title} · Novedades Makrana` : "Novedad" },
        { name: "description", content: n?.summary ?? "" },
        { property: "og:title", content: n?.title ?? "Makrana" },
        { property: "og:description", content: n?.summary ?? "" },
        ...(n?.cover_image_url ? [{ property: "og:image", content: n.cover_image_url }] : []),
      ],
    };
  },
  loader: async ({ params, context }) => {
    const post = await context.queryClient.ensureQueryData(q(params.slug));
    if (!post) throw notFound();
    return { post };
  },
  component: NewsDetail,
  notFoundComponent: () => (
    <div className="container-makrana py-24 text-center">
      <h1 className="font-display text-3xl">Novedad no encontrada</h1>
      <Button asChild className="mt-6">
        <Link to="/novedades">Volver</Link>
      </Button>
    </div>
  ),
  errorComponent: () => <div className="container-makrana py-24">Error cargando la novedad.</div>,
});

function NewsDetail() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(q(slug));
  if (!post) return null;
  return (
    <article className="section-padded">
      <div className="container-makrana max-w-3xl">
        <Link to="/novedades" className="text-sm text-accent">
          ← Volver a novedades
        </Link>
        <p className="text-xs uppercase tracking-widest text-accent mt-6">
          {post.category.replaceAll("_", " ")}
        </p>
        <h1 className="font-display text-5xl mt-2">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {post.published_at &&
            new Date(post.published_at).toLocaleDateString("es-PE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
        </p>
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="mt-8 rounded-2xl w-full aspect-[16/9] object-cover"
          />
        )}
        <div className="mt-8 prose prose-stone max-w-none text-foreground whitespace-pre-line">
          {post.content}
        </div>
      </div>
    </article>
  );
}
