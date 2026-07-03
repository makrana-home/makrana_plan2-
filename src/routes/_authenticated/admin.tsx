import {
  createFileRoute,
  Outlet,
  Link,
  useRouter,
  useRouterState,
  redirect,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  FileText,
  ClipboardList,
  Users,
  Newspaper,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearDevAdminSession, hasDevAdminSession } from "@/lib/dev-admin";
import { BrandLogo } from "@/components/brand-logo";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    if (hasDevAdminSession()) return;

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const r = (roles ?? []).map((x: any) => x.role);
    const isStaff = r.includes("admin") || r.includes("ventas") || r.includes("almacen");
    if (!isStaff) throw redirect({ to: "/cliente" });
  },
  component: AdminShell,
});

const mainItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true as boolean | undefined },
  { to: "/admin/productos", label: "Piezas", icon: Package },
  { to: "/admin/materiales", label: "Materiales", icon: Boxes },
  { to: "/admin/manual", label: "Manual", icon: ClipboardList },
  { to: "/admin/almacenes", label: "Almacenes", icon: Warehouse },
  { to: "/admin/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { to: "/admin/ventas", label: "Ventas", icon: ShoppingCart },
  { to: "/admin/comprobantes", label: "Comprobantes", icon: FileText },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/reportes", label: "Reportes", icon: BarChart3 },
] as const;

const webItems = [
  { to: "/admin/novedades", label: "Novedades", icon: Newspaper },
  { to: "/admin/talleres", label: "Talleres", icon: GraduationCap },
] as const;

const configItems = [
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
] as const;

function AdminShell() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [userName, setUserName] = useState("Usuario");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setUserName(formatUserName(user.email, user.user_metadata));
    });
  }, []);

  async function signOut() {
    clearDevAdminSession();
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-cream text-foreground">
        <Sidebar className="border-r border-sand/70 bg-cream">
          <SidebarHeader className="border-b border-sand/70 px-4 py-4">
            <Link to="/" className="flex items-center">
              <span className="min-w-0">
                <BrandLogo variant="horizontal" imageClassName="w-36" />
                <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                  Panel interno
                </span>
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-3 py-5">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2">
                  {mainItems.map((i) => (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={(i as any).exact ? pathname === i.to : pathname.startsWith(i.to)}
                        className="h-11 rounded-full px-4 text-[15px] font-semibold text-foreground/80 data-[active=true]:bg-accent data-[active=true]:text-warm-white data-[active=true]:shadow-lg data-[active=true]:shadow-accent/15 hover:bg-sand/50 hover:text-foreground"
                      >
                        <Link to={i.to}>
                          <i.icon className="h-4 w-4" />
                          {i.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <div
                      className={[
                        "mt-3 flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-bold uppercase tracking-[0.16em]",
                        webItems.some((i) => pathname.startsWith(i.to))
                          ? "bg-accent/10 text-accent"
                          : "text-foreground/55",
                      ].join(" ")}
                    >
                      <Globe2 className="h-4 w-4" />
                      Página web
                    </div>
                  </SidebarMenuItem>
                  {webItems.map((i) => (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(i.to)}
                        className="ml-5 h-10 rounded-full px-4 text-[14px] font-semibold text-foreground/75 data-[active=true]:bg-accent data-[active=true]:text-warm-white data-[active=true]:shadow-lg data-[active=true]:shadow-accent/15 hover:bg-sand/50 hover:text-foreground"
                      >
                        <Link to={i.to}>
                          <i.icon className="h-4 w-4" />
                          {i.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {configItems.map((i) => (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(i.to)}
                        className="h-11 rounded-full px-4 text-[15px] font-semibold text-foreground/80 data-[active=true]:bg-accent data-[active=true]:text-warm-white data-[active=true]:shadow-lg data-[active=true]:shadow-accent/15 hover:bg-sand/50 hover:text-foreground"
                      >
                        <Link to={i.to}>
                          <i.icon className="h-4 w-4" />
                          {i.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <header className="flex min-h-20 items-center justify-between gap-4 border-b border-sand/70 bg-warm-white/45 px-6">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <SidebarTrigger />
              <label className="relative hidden w-full max-w-[28rem] md:block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar productos, pedidos, clientes..."
                  className="h-12 w-full rounded-full border border-sand/80 bg-warm-white/70 pl-11 pr-4 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-[3px] focus:ring-accent/15"
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                className="h-11 w-11 rounded-full border-sand bg-warm-white"
                aria-label="Notificaciones"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <span className="hidden h-11 items-center rounded-full border border-sand bg-warm-white px-4 text-sm font-semibold md:inline-flex">
                {userName}
              </span>
              <span className="hidden h-11 items-center gap-2 rounded-full border border-sand bg-warm-white px-4 text-sm font-semibold md:inline-flex">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Rol Administrador
              </span>
              <Button size="sm" variant="ghost" onClick={signOut} className="rounded-full">
                <LogOut className="h-4 w-4" /> Salir
              </Button>
            </div>
          </header>
          <main className="flex-1 bg-cream px-5 py-10 sm:px-8 lg:px-10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function formatUserName(email?: string, metadata?: Record<string, any> | null) {
  const fullName = metadata?.full_name || metadata?.name || metadata?.display_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();

  if (email?.toLowerCase() === "anamaria@makrana.com") return "Ana Maria";

  const localPart = email?.split("@")[0] ?? "Usuario";
  return localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
