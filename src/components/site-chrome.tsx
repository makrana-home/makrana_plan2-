import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/novedades", label: "Novedades" },
  { to: "/talleres", label: "Talleres" },
  { to: "/sobre-makrana", label: "Sobre Makrana" },
  { to: "/contacto", label: "Contacto" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-sand/60 bg-warm-white/85 backdrop-blur">
      <div className="container-makrana flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-7 w-7 rounded-full bg-terracotta" aria-hidden />
          <span className="font-display text-xl text-foreground tracking-wide">
            Makrana <span className="text-accent">Home Art</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-foreground/80 hover:text-accent transition-colors"
              activeProps={{ className: "text-accent font-medium" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Ingresar</Link></Button>
          <Button asChild variant="hero" size="sm"><Link to="/registro">Registrarme</Link></Button>
        </div>
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <div className={cn("md:hidden border-t border-sand/60", open ? "block" : "hidden")}>
        <div className="container-makrana py-4 flex flex-col gap-3">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-foreground/80" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Button asChild variant="soft" size="sm" className="flex-1"><Link to="/auth">Ingresar</Link></Button>
            <Button asChild variant="hero" size="sm" className="flex-1"><Link to="/registro">Registrarme</Link></Button>
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
          <div className="flex items-center gap-2">
            <span className="inline-block h-6 w-6 rounded-full bg-terracotta" aria-hidden />
            <span className="font-display text-lg">Makrana Home Art</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Piezas de macramé hechas a mano en Perú. Diseño cálido, natural y artesanal para tu hogar.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3 uppercase tracking-wider text-foreground/70">Tienda</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalogo" className="hover:text-accent">Catálogo</Link></li>
            <li><Link to="/talleres" className="hover:text-accent">Talleres y cursos</Link></li>
            <li><Link to="/novedades" className="hover:text-accent">Novedades</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3 uppercase tracking-wider text-foreground/70">Makrana</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/sobre-makrana" className="hover:text-accent">Nuestra historia</Link></li>
            <li><Link to="/registro" className="hover:text-accent">Registrarme</Link></li>
            <li><Link to="/contacto" className="hover:text-accent">Contacto</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3 uppercase tracking-wider text-foreground/70">Contacto</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>WhatsApp: +51 999 999 999</li>
            <li>hola@makranahomeart.pe</li>
            <li>Lima, Perú</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand/60">
        <div className="container-makrana py-4 text-xs text-muted-foreground flex justify-between flex-wrap gap-2">
          <span>© {new Date().getFullYear()} Makrana Home Art. Hecho a mano con paciencia.</span>
          <span>Diseño artesanal · Algodón natural · Piezas únicas</span>
        </div>
      </div>
    </footer>
  );
}
