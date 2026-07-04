import { Link, useRouterState } from "@tanstack/react-router";
import type { SVGProps } from "react";
import { Facebook, Instagram, Menu, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/novedades", label: "Novedades" },
  { to: "/talleres", label: "Talleres" },
  { to: "/sobre-makrana", label: "Sobre Makrana" },
  { to: "/contacto", label: "Contacto" },
] as const;

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M14 3v11.2a4.2 4.2 0 1 1-3.4-4.1" />
      <path d="M14 6.2c1.2 1.7 2.8 2.7 5 2.8" />
    </svg>
  );
}

const socialLinks = [
  { label: "Instagram", href: null, icon: Instagram },
  { label: "Facebook", href: null, icon: Facebook },
  { label: "TikTok", href: null, icon: TikTokIcon },
  { label: "WhatsApp", href: "https://wa.me/51986608552", icon: MessageCircle },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sand/70 bg-warm-white/95 shadow-[0_4px_18px_rgba(128,52,44,0.08)] backdrop-blur">
      <div className="container-makrana flex min-h-20 max-w-full items-center gap-3 py-3 lg:min-h-24 lg:gap-4">
        <Link to="/" className="flex shrink-0 items-center">
          <BrandLogo variant="horizontal" imageClassName="w-40 sm:w-44 lg:w-48 xl:w-52" />
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex xl:gap-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-full px-3 py-2 text-[14px] font-semibold transition-colors xl:px-4 xl:text-[15px]",
                isActive(l.to)
                  ? "bg-accent text-warm-white shadow-sm shadow-accent/15"
                  : "text-foreground/85 hover:bg-cream hover:text-accent",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex xl:gap-3">
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="rounded-full px-3 text-[14px] font-semibold hover:bg-transparent hover:text-accent xl:px-4 xl:text-[15px]"
          >
            <Link to="/auth">Ingresar</Link>
          </Button>
          <Button
            asChild
            variant="hero"
            size="lg"
            className="rounded-2xl px-4 text-[14px] shadow-md shadow-clay/20 xl:px-6 xl:text-[15px]"
          >
            <Link to="/registro">Registrarme</Link>
          </Button>
        </div>
        <button
          className="ml-auto p-2 text-foreground lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <div className={cn("border-t border-sand/60 lg:hidden", open ? "block" : "hidden")}>
        <div className="container-makrana py-4 flex flex-col gap-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                isActive(l.to)
                  ? "bg-accent text-warm-white"
                  : "text-foreground/80 hover:bg-cream hover:text-accent",
              )}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Button asChild variant="soft" size="sm" className="flex-1">
              <Link to="/auth">Ingresar</Link>
            </Button>
            <Button asChild variant="hero" size="sm" className="flex-1">
              <Link to="/registro">Registrarme</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-sand/60 bg-cream">
      <div className="container-makrana py-14 grid gap-10 md:grid-cols-4">
        <div>
          <BrandLogo imageClassName="w-32 sm:w-36" />
          <p className="mt-3 text-sm text-muted-foreground">
            En Makrana, cada pieza es tejida a mano en Perú con dedicación y cuidado, para llevar la
            calidez, la textura y la esencia de la artesanía a tu hogar.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-foreground/70">
            Explorar
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/catalogo" className="hover:text-accent">
                Catálogo
              </Link>
            </li>
            <li>
              <Link to="/talleres" className="hover:text-accent">
                Talleres
              </Link>
            </li>
            <li>
              <Link to="/novedades" className="hover:text-accent">
                Novedades
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3 uppercase tracking-wider text-foreground/70">
            Makrana
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/sobre-makrana" className="hover:text-accent">
                Nuestra historia
              </Link>
            </li>
            <li>
              <Link to="/registro" className="hover:text-accent">
                Registrarme
              </Link>
            </li>
            <li>
              <Link to="/contacto" className="hover:text-accent">
                Contacto
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3 uppercase tracking-wider text-foreground/70">
            Contacto
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>WhatsApp: +51 986608552</li>
            <li>makrnahome@gmail.com</li>
            <li>Lima, Perú</li>
          </ul>
          <div className="mt-6">
            <h4 className="font-display text-2xl text-accent">Síguenos</h4>
            <div className="mt-4 flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                const className =
                  "inline-flex h-12 w-12 items-center justify-center rounded-full border border-sand bg-warm-white text-accent shadow-sm transition";
                return social.href ? (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className={`${className} hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-warm-white`}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ) : (
                  <span
                    key={social.label}
                    aria-label={`${social.label} no disponible`}
                    aria-disabled="true"
                    title={`${social.label} no disponible`}
                    className={`${className} cursor-not-allowed opacity-45`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-sand/60">
        <div className="container-makrana py-4 text-xs text-muted-foreground flex justify-between flex-wrap gap-2">
          <span>© {new Date().getFullYear()} Makrana Home Art.</span>
        </div>
      </div>
    </footer>
  );
}
