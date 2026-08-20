import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { SVGProps } from "react";
import { BookOpen, Facebook, Instagram, Menu, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { getHomeSectionVisibility } from "@/lib/public.functions";
import {
  homeSectionDefaults,
  type HomeSectionVisibility,
} from "@/lib/site-settings.functions";

const links = [
  { to: "/", label: "Inicio", section: null },
  { to: "/catalogo", label: "Catálogo", section: "catalog" },
  { to: "/novedades", label: "Novedades", section: "news" },
  { to: "/talleres", label: "Talleres", section: "workshops" },
  { to: "/sobre-makrana", label: "Sobre Makrana", section: "welcome" },
  { to: "/contacto", label: "Contacto", section: null },
] as const;

function linkIsVisible(
  section: (typeof links)[number]["section"],
  visibility: HomeSectionVisibility,
) {
  if (!section) return true;
  if (section === "catalog") return visibility.categories || visibility.featured;
  return visibility[section];
}

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M14 3v11.2a4.2 4.2 0 1 1-3.4-4.1" />
      <path d="M14 6.2c1.2 1.7 2.8 2.7 5 2.8" />
    </svg>
  );
}

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/makrana_homeart", icon: Instagram },
  { label: "Facebook", href: "https://www.facebook.com/homeart.vag", icon: Facebook },
  { label: "TikTok", href: "https://www.tiktok.com/@makrana.homeart", icon: TikTokIcon },
  { label: "WhatsApp", href: "https://wa.me/51986608552", icon: MessageCircle },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [hasPassedHero, setHasPassedHero] = useState(false);
  const { data: homeSections = homeSectionDefaults } = useQuery({
    queryKey: ["public", "home-section-visibility"],
    queryFn: () => getHomeSectionVisibility(),
  });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isHome = pathname === "/";
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const hideOnHero = isHome && homeSections.hero && !hasPassedHero;
  const visibleLinks = links.filter((link) => linkIsVisible(link.section, homeSections));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isHome) return;

    const updateHeaderVisibility = () => {
      setHasPassedHero(window.scrollY >= window.innerHeight - 2);
    };

    updateHeaderVisibility();
    window.addEventListener("scroll", updateHeaderVisibility, { passive: true });
    window.addEventListener("resize", updateHeaderVisibility);

    return () => {
      window.removeEventListener("scroll", updateHeaderVisibility);
      window.removeEventListener("resize", updateHeaderVisibility);
    };
  }, [isHome]);

  return (
    <>
      <aside
        className="fixed inset-x-0 top-0 z-50 flex h-7 items-center justify-center bg-[#edbfa5] px-4 text-center text-[10px] font-medium tracking-[0.025em] text-warm-white sm:text-[11px]"
        aria-label="Información de Makrana"
      >
        <span>Arte textil hecho a mano en Perú</span>
        <span className="mx-2.5 text-warm-white/55" aria-hidden="true">
          •
        </span>
        <span>Envíos y proyectos personalizados</span>
      </aside>
      <header
        className={cn(
          "fixed top-7 z-40 w-full border-b border-sand/60 bg-warm-white/95 backdrop-blur-md transition-all duration-300",
          hideOnHero
            ? "invisible pointer-events-none -translate-y-full opacity-0"
            : "visible translate-y-0 opacity-100",
        )}
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(237, 191, 165, 0.98) 0%, rgba(237, 191, 165, 0.68) 12%, rgba(237, 191, 165, 0) 27%)",
        }}
      >
        <div className="container-makrana flex min-h-20 max-w-full items-center gap-3 py-3 lg:min-h-24 lg:gap-4">
          <Link
            to="/"
            className="flex shrink-0 items-center"
          >
            <BrandLogo
              variant="horizontal-white"
              imageClassName="h-auto w-36 object-contain sm:w-40 lg:w-44 xl:w-40 2xl:w-48"
            />
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex 2xl:gap-3">
            {visibleLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors 2xl:px-4 2xl:text-[15px]",
                  isActive(l.to)
                    ? "bg-accent text-accent-foreground shadow-sm shadow-accent/15"
                    : "text-foreground/85 hover:bg-cream hover:text-brand-terracotta",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden shrink-0 items-center gap-2 xl:flex 2xl:gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-3 text-xs 2xl:h-10 2xl:px-4 2xl:text-[13px]"
            >
              <Link to="/registro">Quiero saber más</Link>
            </Button>
            <Button
              asChild
              variant="hero"
              size="sm"
              className="h-9 rounded-full px-3 text-xs shadow-md shadow-clay/20 2xl:h-10 2xl:px-4 2xl:text-[13px]"
            >
              <a
                href="https://wa.me/51986608552?text=Hola%20Makrana%2C%20quiero%20cotizar%20una%20pieza%20para%20mi%20espacio."
                target="_blank"
                rel="noreferrer"
              >
                Cotiza tu pieza
              </a>
            </Button>
          </div>
          <button
            className="ml-auto p-2 text-foreground xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <div className={cn("border-t border-sand/60 xl:hidden", open ? "block" : "hidden")}>
          <div className="container-makrana py-4 flex flex-col gap-3">
            {visibleLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                  isActive(l.to)
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/80 hover:bg-cream hover:text-brand-terracotta",
                )}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/registro">Quiero saber más</Link>
              </Button>
              <Button asChild variant="hero" size="sm" className="rounded-full">
                <a
                  href="https://wa.me/51986608552?text=Hola%20Makrana%2C%20quiero%20cotizar%20una%20pieza%20para%20mi%20espacio."
                  target="_blank"
                  rel="noreferrer"
                >
                  Cotiza tu pieza
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#d58f6b] bg-[#edbfa5] text-white">
      <div className="container-makrana grid gap-6 py-6 md:grid-cols-4 md:py-7">
        <div>
          <span className="inline-flex px-1 py-1">
            <BrandLogo variant="horizontal-white" imageClassName="w-28 sm:w-32" />
          </span>
          <p className="mt-3 text-[11px] leading-relaxed text-white/80">
            En Makrana, cada pieza es tejida a mano en Perú con dedicación y cuidado, para llevar la
            calidez, la textura y la esencia de la artesanía a tu hogar.
          </p>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">
            Explorar
          </h4>
          <ul className="space-y-1.5 text-xs">
            <li>
              <Link to="/catalogo" className="transition-colors hover:text-white/70">
                Catálogo
              </Link>
            </li>
            <li>
              <Link to="/talleres" className="transition-colors hover:text-white/70">
                Talleres
              </Link>
            </li>
            <li>
              <Link to="/novedades" className="transition-colors hover:text-white/70">
                Novedades
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">
            Makrana
          </h4>
          <ul className="space-y-1.5 text-xs">
            <li>
              <Link to="/sobre-makrana" className="transition-colors hover:text-white/70">
                Nuestra historia
              </Link>
            </li>
            <li>
              <Link to="/registro" className="transition-colors hover:text-white/70">
                Recibir novedades
              </Link>
            </li>
            <li>
              <Link to="/contacto" className="transition-colors hover:text-white/70">
                Contacto
              </Link>
            </li>
          </ul>
          <Link
            to="/libro-de-reclamaciones"
            className="mt-4 inline-flex w-full max-w-52 items-center gap-3 rounded-xl border border-[#80342c]/30 bg-white/35 px-4 py-3 text-left text-sm font-medium leading-tight text-[#542f24] transition hover:border-[#80342c] hover:bg-white/60 hover:text-[#80342c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80342c] focus-visible:ring-offset-2"
          >
            <BookOpen className="h-8 w-8 shrink-0" strokeWidth={1.6} aria-hidden="true" />
            <span>Libro de<br />Reclamaciones</span>
          </Link>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">
            Contacto
          </h4>
          <ul className="space-y-1.5 text-xs text-white/80">
            <li>WhatsApp: +51 986608552</li>
            <li>makrnahome@gmail.com</li>
            <li>Lima, Perú</li>
          </ul>
          <div className="mt-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Síguenos
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                const className =
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#80342c]/20 bg-white/45 text-[#80342c] shadow-sm transition";
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className={`${className} hover:-translate-y-0.5 hover:border-[#80342c] hover:bg-[#80342c] hover:text-white`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-[#80342c]/15">
        <div className="container-makrana flex flex-wrap justify-between gap-2 py-2.5 text-[11px] text-white/70">
          <span>© {new Date().getFullYear()} Makrana Home Art.</span>
        </div>
      </div>
    </footer>
  );
}
