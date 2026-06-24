import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/sobre-makrana")({
  head: () => ({ meta: [
    { title: "Sobre Makrana · Macramé hecho a mano" },
    { name: "description", content: "Conoce la historia de Makrana Home Art, nuestro taller y los valores detrás de cada pieza." },
    { property: "og:title", content: "Sobre Makrana Home Art" },
    { property: "og:description", content: "La historia detrás de nuestro taller artesanal." },
  ]}),
  component: About,
});

function About() {
  return (
    <section className="section-padded">
      <div className="container-makrana max-w-4xl">
        <p className="text-xs uppercase tracking-widest text-accent">Nuestra historia</p>
        <h1 className="font-display text-5xl mt-2">Hecho con paciencia, pensado para tu hogar</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Makrana nació en una pequeña sala de Pueblo Libre, cuando Lucía empezó a tejer regalos para
          amigas. Lo que comenzó como un pasatiempo se convirtió en un taller donde el tiempo, el
          detalle y la artesanía mandan.
        </p>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <div>
            <h3 className="font-display text-xl">El macramé</h3>
            <p className="text-sm text-muted-foreground mt-2">Una técnica milenaria de tejer con nudos. Cada nudo cuenta, cada pieza es única.</p>
          </div>
          <div>
            <h3 className="font-display text-xl">Nuestros valores</h3>
            <p className="text-sm text-muted-foreground mt-2">Paciencia, detalle, hogar, artesanía y diseño. En ese orden.</p>
          </div>
          <div>
            <h3 className="font-display text-xl">El taller</h3>
            <p className="text-sm text-muted-foreground mt-2">Un espacio cálido en Lima donde tejemos, enseñamos y compartimos.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
