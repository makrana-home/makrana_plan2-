import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import pieces from "@/lib/brochure-data.json";

const categories = [...new Set(pieces.map((piece) => piece.category))];
const featured = pieces.slice(0, 2);
type Piece = (typeof pieces)[number];

function whatsapp(piece?: Piece) {
  const message = piece
    ? `Hola, Makrana. Me interesa la pieza ${piece.name}${piece.measurements ? ` (${piece.measurements})` : ""}. Quisiera consultar sobre disponibilidad y personalización. https://makranahomeart.com/brochure#${piece.slug}`
    : "Hola, Makrana. Me gustaría crear una pieza personalizada. Quiero compartirles mis ideas y coordinar colores y texturas.";
  return `https://wa.me/51986608552?text=${encodeURIComponent(message)}`;
}

export const Route = createFileRoute("/brochure")({
  head: () => ({
    meta: [
      { title: "Brochure · Arte textil para tu espacio | Makrana Home Art" },
      {
        name: "description",
        content:
          "Descubre las colecciones de macramé de Makrana Home Art. Murales, espejos, decoración y piezas personalizadas. Consulta cada pieza por WhatsApp.",
      },
      { property: "og:title", content: "Makrana Home Art · El arte de habitar" },
      {
        property: "og:description",
        content:
          "Piezas de macramé hechas a mano. Explora nuestras colecciones y encuentra la tuya.",
      },
      {
        property: "og:image",
        content: "https://makranahomeart.com/brochure/nuevo-05_06_16-1280.webp",
      },
    ],
    links: [{ rel: "canonical", href: "https://makranahomeart.com/brochure" }],
  }),
  component: Brochure,
});

function PieceCard({ piece, priority = false }: { piece: Piece; priority?: boolean }) {
  return (
    <article id={piece.slug} className="scroll-mt-56">
      <a
        href={whatsapp(piece)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Consultar ${piece.name} por WhatsApp (abre en otra pestaña)`}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#80342c]"
      >
        <div className="relative flex aspect-[0.78] items-center justify-center overflow-hidden bg-[#f6f0e9]">
          <img
            src={`/brochure/${piece.slug}-1280.webp`}
            srcSet={`/brochure/${piece.slug}-640.webp 640w, /brochure/${piece.slug}-1280.webp 1280w`}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt={piece.name}
            width={piece.width}
            height={piece.height}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={`h-full w-full ${piece.fit === "contain" ? "object-contain" : "object-cover"} motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.015]`}
          />
          <span className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs text-[#473a32] shadow-sm md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100 motion-safe:transition-all">
            <MessageCircle size={15} aria-hidden="true" /> Consultar
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 px-1 pt-3">
          <div>
            <h3 className="font-serif text-base font-normal leading-snug text-[#3f352f] sm:text-lg">
              {piece.name}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#74655b]">
              {piece.measurements || `${piece.category} · Consulta las medidas`}
            </p>
          </div>
          <ArrowUpRight size={17} className="mt-1 shrink-0 text-[#80342c]" aria-hidden="true" />
        </div>
      </a>
    </article>
  );
}

function Brochure() {
  const [category, setCategory] = useState("Todas");
  const groups = categories.filter((name) => category === "Todas" || category === name);
  const count =
    category === "Todas"
      ? pieces.length
      : pieces.filter((piece) => piece.category === category).length;

  return (
    <div className="bg-[#fffaf5] text-[#3f352f]">
      <section
        className="mx-auto grid max-w-[1600px] md:min-h-[430px] md:grid-cols-2"
        aria-labelledby="brochure-title"
      >
        <div className="flex min-h-60 items-center justify-center bg-[#f7bea3] px-14 py-16 md:min-h-96">
          <BrandLogo variant="horizontal-white" imageClassName="!w-full max-w-[350px]" />
        </div>
        <div className="flex flex-col justify-center px-7 py-12 sm:px-12 lg:px-20">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#80342c]">
            Makrana Home Art · Colecciones
          </p>
          <h1
            id="brochure-title"
            className="mt-5 font-serif text-4xl font-normal leading-[1.08] sm:text-5xl lg:text-6xl"
          >
            Arte que habita
            <br />
            tu espacio.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-[#74655b]">
            Creamos piezas de macramé hechas a mano que aportan textura, calidez y personalidad a
            cada espacio.
          </p>
          <a
            href="#colecciones"
            className="mt-8 inline-flex w-fit items-center gap-4 py-2 text-sm text-[#80342c] underline-offset-4 hover:underline focus-visible:outline-2"
          >
            <span>Descubre las piezas</span>
            <ArrowDown size={17} aria-hidden="true" />
          </a>
        </div>
      </section>

      <div id="colecciones" className="scroll-mt-36">
        <nav
          aria-label="Categorías del brochure"
          className="sticky top-0 z-20 border-b border-[#e6d9ce] bg-[#fffaf5]/95 backdrop-blur-sm"
        >
          <div className="mx-auto flex max-w-[1600px] gap-5 overflow-x-auto px-5 py-4 sm:px-8">
            {["Todas", ...categories].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                aria-pressed={category === name}
                className={`min-h-11 shrink-0 border-b px-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${category === name ? "border-[#80342c] text-[#80342c]" : "border-transparent text-[#74655b] hover:text-[#80342c]"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </nav>
        <div className="mx-auto max-w-[1600px] px-3 pb-20 pt-7 sm:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#74655b]">
            <p aria-live="polite">
              {count} piezas · {category === "Todas" ? "Todas las colecciones" : category}
            </p>
            <p>
              Toca una imagen para consultar por WhatsApp{" "}
              <ArrowUpRight className="ml-1 inline" size={13} aria-hidden="true" />
            </p>
          </div>

          {category === "Todas" && (
            <section
              aria-label="Piezas principales"
              className="mb-16 grid gap-x-4 gap-y-10 md:grid-cols-2"
            >
              {featured.map((piece) => (
                <PieceCard key={piece.slug} piece={piece} priority />
              ))}
            </section>
          )}

          {groups.map((name) => {
            const rows = pieces.filter(
              (piece) =>
                piece.category === name && (category !== "Todas" || !featured.includes(piece)),
            );
            if (!rows.length) return null;
            return (
              <section key={name} aria-label={name} className="mb-16 last:mb-0">
                <h2 className="mb-5 px-1 font-serif text-2xl font-normal sm:text-3xl">{name}</h2>
                <div className="grid gap-x-4 gap-y-10 md:grid-cols-2">
                  {rows.map((piece) => (
                    <PieceCard key={piece.slug} piece={piece} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <section
        className="mx-auto grid max-w-[1440px] gap-10 border-t border-[#e6d9ce] px-7 py-16 md:grid-cols-2 sm:px-12 lg:px-20"
        aria-labelledby="custom-title"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#80342c]">
            Piezas personalizadas
          </p>
          <h2 id="custom-title" className="mt-4 font-serif text-4xl font-normal">
            Tus ideas,
            <br />
            hechas a mano.
          </h2>
          <a
            href={whatsapp()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-11 items-center gap-3 text-sm text-[#80342c] underline underline-offset-4"
          >
            Conversemos por WhatsApp <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <ol className="space-y-7">
          {[
            [
              "Comparte tus ideas",
              "Envíanos tus referencias y cuéntanos qué imaginas para tu espacio.",
            ],
            [
              "Elegimos colores y texturas",
              "Coordinamos contigo una paleta de colores y las texturas que necesita tu proyecto.",
            ],
            ["Creamos tu pieza", "Damos forma a tu diseño con los detalles que acordamos juntos."],
          ].map(([title, description], index) => (
            <li key={title} className="flex gap-5">
              <span className="pt-1 text-xs text-[#80342c]">0{index + 1}</span>
              <div>
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#74655b]">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 px-7 py-8 text-xs text-[#74655b] sm:px-12 lg:px-20">
        <span>Makrana Home Art · Lima, Perú</span>
        <a href="mailto:makrnahome@gmail.com" className="hover:underline">
          makrnahome@gmail.com
        </a>
        <a href={whatsapp()} target="_blank" rel="noopener noreferrer" className="hover:underline">
          WhatsApp +51 986 608 552
        </a>
      </footer>
    </div>
  );
}
