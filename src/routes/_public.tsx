import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className={cn("flex-1", !isHome && "pt-[6.75rem] lg:pt-[7.75rem]")}>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
