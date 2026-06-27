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
  Users,
  Newspaper,
  GraduationCap,
  Tent,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearDevAdminSession, hasDevAdminSession } from "@/lib/dev-admin";

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

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true as boolean | undefined },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/materiales", label: "Materiales", icon: Boxes },
  { to: "/admin/almacenes", label: "Almacenes", icon: Warehouse },
  { to: "/admin/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { to: "/admin/ventas", label: "Ventas", icon: ShoppingCart },
  { to: "/admin/comprobantes", label: "Comprobantes", icon: FileText },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/novedades", label: "Novedades", icon: Newspaper },
  { to: "/admin/talleres", label: "Talleres", icon: GraduationCap },
  { to: "/admin/ferias", label: "Ferias", icon: Tent },
  { to: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
] as const;

function AdminShell() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  async function signOut() {
    clearDevAdminSession();
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader>
            <Link to="/" className="px-2 py-3 flex items-center gap-2">
              <span className="inline-block h-5 w-5 rounded-full bg-terracotta" />
              <span className="font-display text-lg">Makrana · Admin</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((i) => (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={(i as any).exact ? pathname === i.to : pathname.startsWith(i.to)}
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
          <header className="h-14 border-b border-sand/60 flex items-center justify-between px-4 bg-warm-white">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-medium">Plataforma interna</span>
            </div>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
