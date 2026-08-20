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
        <Sidebar className="border-r border-[#d58f6b] bg-[#edbfa5]">
          <SidebarHeader className="border-b border-[#80342c]/15 bg-transparent px-4 py-5">
            <Link to="/" className="inline-flex w-full items-center justify-center">
              <span className="inline-flex items-center justify-center">
                <BrandLogo variant="horizontal-white" imageClassName="w-40" />
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="bg-transparent">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((i) => (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={(i as any).exact ? pathname === i.to : pathname.startsWith(i.to)}
                        className="text-white/90 data-[active=true]:bg-[#80342c] data-[active=true]:text-white hover:bg-white/20 hover:text-white"
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
