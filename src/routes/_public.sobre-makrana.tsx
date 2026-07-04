import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/sobre-makrana")({
  head: () => ({
    meta: [
      { title: "Sobre Makrana · Macramé artesanal" },
      {
        name: "description",
        content:
          "Conoce la historia de Makrana Home Art, nuestro taller y los valores detrás de cada pieza.",
      },
      { property: "og:title", content: "Sobre Makrana Home Art" },
      { property: "og:description", content: "La historia detrás de nuestro taller artesanal." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <section className="section-padded">
      <div className="container-makrana max-w-4xl">
        <p className="text-xs uppercase tracking-widest text-accent">NUESTRA HISTORIA</p>
        <h1 className="font-display text-5xl mt-2">Hecho con paciencia, pensado para tu hogar.</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Makrana Home Art nace de la pasión de Ana María por el arte, el macramé y la belleza de
          los detalles. Fascinada por las texturas, la combinación de colores y el diseño artesanal,
          encontró en cada nudo una forma de crear piezas que transmiten calidez y personalidad.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Cada proyecto representa un nuevo reto. Desde pequeñas decoraciones hasta grandes
          instalaciones para ambientar espacios, cada creación es elaborada a mano con dedicación,
          creatividad y el deseo de transformar cualquier rincón en un lugar único. Además de crear,
          Ana María disfruta compartir su conocimiento a través de talleres, convencida de que el
          arte del macramé cobra aún más valor cuando se enseña y se transmite a otras personas.
        </p>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <div>
            <h3 className="font-display text-xl">El macramé</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Una técnica milenaria de tejer con nudos. Cada nudo cuenta, cada pieza es única.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl">Nuestros valores</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Paciencia, detalle, hogar, artesanía y diseño.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl">El taller</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Un espacio cálido en Lima donde tejemos, enseñamos y compartimos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
