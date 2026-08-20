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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
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
  ChevronDown,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearDevAdminSession, hasDevAdminSession } from "@/lib/dev-admin";
import { BrandLogo } from "@/components/brand-logo";
import { useEffect, useState } from "react";
import { canAccessAdminPath } from "@/lib/staff-access";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") {
      throw redirect({ to: "/auth" });
    }

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
    if (!r.includes("admin")) {
      const { data: permissions } = await supabase
        .from("staff_module_permissions")
        .select("module, enabled")
        .eq("user_id", u.user.id);
      const modules = permissions?.length
        ? permissions.filter((permission) => permission.enabled).map((permission) => permission.module)
        : null;
      if (!canAccessAdminPath(location.pathname, r, modules)) throw redirect({ to: "/admin" });
    }
  },
  component: AdminShell,
});

const topItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true as boolean | undefined },
] as const;

const standaloneItems = [
  { to: "/admin/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/admin/manual", label: "Manual", icon: ClipboardList },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/reportes", label: "Reportes", icon: BarChart3 },
] as const;

const menuGroups = [
  {
    key: "inventory",
    label: "Inventario",
    icon: Boxes,
    items: [
      { to: "/admin/productos", label: "Piezas", icon: Package },
      { to: "/admin/materiales", label: "Materiales", icon: Boxes },
    ],
  },
  {
    key: "stock",
    label: "Stock y logística",
    icon: Warehouse,
    items: [
      { to: "/admin/almacenes", label: "Almacenes", icon: Warehouse },
      { to: "/admin/movimientos", label: "Movimientos", icon: ArrowLeftRight },
    ],
  },
  {
    key: "sales",
    label: "Ventas",
    icon: ShoppingCart,
    items: [{ to: "/admin/ventas", label: "Ventas", icon: ShoppingCart }],
  },
  {
    key: "web",
    label: "Página web",
    icon: Globe2,
    items: [
      { to: "/admin/pagina-web", label: "Página de inicio", icon: Globe2 },
      { to: "/admin/novedades", label: "Novedades", icon: Newspaper },
      { to: "/admin/talleres", label: "Talleres", icon: GraduationCap },
    ],
  },
] as const;

const configItems = [
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
] as const;

function AdminShell() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [userName, setUserName] = useState("Usuario");
  const [userRoles, setUserRoles] = useState<string[]>(() =>
    hasDevAdminSession() ? ["admin"] : [],
  );
  const [userModules, setUserModules] = useState<string[] | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(menuGroups.map((group) => [group.key, isGroupActive(group, pathname)])),
  );

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      setUserName(formatUserName(user.email, user.user_metadata));
      const [{ data: roles }, { data: permissions }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("staff_module_permissions")
          .select("module, enabled")
          .eq("user_id", user.id),
      ]);
      setUserRoles((roles ?? []).map((item: any) => item.role));
      setUserModules(
        permissions?.length
          ? permissions
              .filter((permission: any) => permission.enabled)
              .map((permission: any) => permission.module)
          : null,
      );
    });
  }, []);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      for (const group of menuGroups) {
        if (isGroupActive(group, pathname)) next[group.key] = true;
      }
      return next;
    });
  }, [pathname]);

  async function signOut() {
    clearDevAdminSession();
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  function renderNavItem(i: any) {
    return (
      <SidebarMenuItem key={i.to}>
        <SidebarMenuButton
          asChild
          isActive={i.exact ? pathname === i.to : pathname.startsWith(i.to)}
          className="h-11 rounded-full px-4 text-[15px] font-semibold text-white/90 data-[active=true]:bg-[#80342c] data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-[#80342c]/20 hover:bg-white/20 hover:text-white"
        >
          <Link to={i.to}>
            <i.icon className="h-4 w-4" />
            {i.label}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  function renderNavGroup(group: (typeof menuGroups)[number]) {
    const visibleItems = group.items.filter((item) =>
      canAccessAdminPath(item.to, userRoles, userModules),
    );
    if (visibleItems.length === 0) return null;
    const GroupIcon = group.icon;
    return (
      <SidebarMenuItem key={group.key}>
        <Collapsible
          open={openGroups[group.key] ?? false}
          onOpenChange={(open) => setOpenGroups((current) => ({ ...current, [group.key]: open }))}
          className="group/collapsible"
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={isGroupActive(group, pathname)}
              className="h-11 rounded-full px-4 text-[15px] font-semibold text-white/90 data-[active=true]:bg-white/20 data-[active=true]:text-white hover:bg-white/20 hover:text-white"
            >
              <GroupIcon className="h-4 w-4" />
              <span>{group.label}</span>
              <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <SidebarMenuSub className="my-1 ml-5 gap-1 border-l-[#80342c]/20">
              {visibleItems.map((i) => (
                <SidebarMenuSubItem key={i.to}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname.startsWith(i.to)}
                    className="h-9 rounded-full px-3 text-[14px] font-semibold text-white/80 data-[active=true]:bg-[#80342c] data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-[#80342c]/20 hover:bg-white/20 hover:text-white"
                  >
                    <Link to={i.to}>
                      <i.icon className="h-4 w-4" />
                      <span>{i.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full overflow-x-clip bg-cream text-foreground">
        <Sidebar className="border-r border-[#d58f6b] bg-[#edbfa5] text-white">
          <SidebarHeader className="border-b border-[#80342c]/15 bg-transparent px-4 py-5">
            <Link to="/" className="flex w-full items-center justify-center">
              <span className="inline-flex items-center justify-center">
                <BrandLogo variant="horizontal-white" imageClassName="w-40" />
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="bg-transparent px-3 py-5">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2">
                  {topItems.map(renderNavItem)}
                  {menuGroups.slice(0, 1).map(renderNavGroup)}
                  {standaloneItems
                    .slice(0, 2)
                    .filter((item) => canAccessAdminPath(item.to, userRoles, userModules))
                    .map(renderNavItem)}
                  {menuGroups.slice(1, 3).map(renderNavGroup)}
                  {standaloneItems
                    .slice(2)
                    .filter((item) => canAccessAdminPath(item.to, userRoles, userModules))
                    .map(renderNavItem)}
                  {menuGroups.slice(3).map(renderNavGroup)}
                  {configItems
                    .filter((item) => canAccessAdminPath(item.to, userRoles, userModules))
                    .map((i) => (
                      <SidebarMenuItem key={i.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname.startsWith(i.to)}
                          className="h-11 rounded-full px-4 text-[15px] font-semibold text-white/90 data-[active=true]:bg-[#80342c] data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-[#80342c]/20 hover:bg-white/20 hover:text-white"
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
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-20 items-center justify-between gap-3 border-b border-sand/70 bg-warm-white/45 px-3 sm:gap-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <SidebarTrigger className="h-11 w-11 shrink-0" />
              <label className="relative hidden w-full max-w-[28rem] md:block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar productos, pedidos, clientes..."
                  className="h-12 w-full rounded-full border border-sand/80 bg-warm-white/70 pl-11 pr-4 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-[3px] focus:ring-accent/15"
                />
              </label>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
                {getRoleLabel(userRoles)}
              </span>
              <Button size="sm" variant="ghost" onClick={signOut} className="h-11 rounded-full">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1 bg-cream px-3 py-6 sm:px-8 sm:py-10 lg:px-10">
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

function isGroupActive(group: (typeof menuGroups)[number], pathname: string) {
  return group.items.some((item) => pathname.startsWith(item.to));
}

function getRoleLabel(roles: string[]) {
  if (roles.includes("admin")) return "Administrador";
  if (roles.includes("ventas")) return "Vendedor";
  if (roles.includes("almacen")) return "Logística";
  return "Usuario";
}
