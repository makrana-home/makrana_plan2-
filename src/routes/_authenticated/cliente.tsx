import { createFileRoute, Outlet, Link, useRouter, useRouterState } from "@tanstack/react-router";
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
  User,
  ShoppingBag,
  FileText,
  GraduationCap,
  BookOpen,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/_authenticated/cliente")({
  component: ClientShell,
});

const items = [
  {
    to: "/cliente",
    label: "Mi dashboard",
    icon: LayoutDashboard,
    exact: true as boolean | undefined,
  },
  { to: "/cliente/perfil", label: "Mi perfil", icon: User },
  { to: "/cliente/pedidos", label: "Mis pedidos", icon: ShoppingBag },
  { to: "/cliente/comprobantes", label: "Comprobantes", icon: FileText },
  { to: "/cliente/cursos", label: "Mis cursos", icon: BookOpen },
  { to: "/cliente/talleres", label: "Talleres inscritos", icon: GraduationCap },
] as const;

function ClientShell() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full overflow-x-clip bg-background">
        <Sidebar>
          <SidebarHeader>
            <Link to="/" className="px-2 py-3 inline-flex">
              <BrandLogo imageClassName="w-32" />
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
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-14 items-center justify-between gap-3 border-b border-sand/60 bg-warm-white px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <span className="truncate font-medium">Intranet del cliente</span>
            </div>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </header>
          <main className="min-w-0 flex-1 px-3 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
