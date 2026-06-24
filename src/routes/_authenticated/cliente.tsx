import { createFileRoute, Outlet, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, SidebarHeader } from "@/components/ui/sidebar";
import { LayoutDashboard, User, ShoppingBag, FileText, GraduationCap, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cliente")({
  component: ClientShell,
});

const items = [
  { to: "/cliente", label: "Mi dashboard", icon: LayoutDashboard, exact: true as boolean | undefined },
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
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader>
            <Link to="/" className="font-display text-xl px-2 py-3">Makrana</Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((i) => (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton asChild isActive={(i as any).exact ? pathname === i.to : pathname.startsWith(i.to)}>
                        <Link to={i.to}><i.icon className="h-4 w-4" />{i.label}</Link>
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
            <div className="flex items-center gap-2"><SidebarTrigger /><span className="font-medium">Intranet del cliente</span></div>
            <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /> Salir</Button>
          </header>
          <main className="flex-1 p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
