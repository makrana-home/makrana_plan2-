import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Boxes,
  Warehouse,
  Newspaper,
  GraduationCap,
  Users,
  ShoppingCart,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const [stats, setStats] = useState<any>({});
  useEffect(() => {
    (async () => {
      const counts = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("type", "material"),
        supabase.from("warehouses").select("id", { count: "exact", head: true }),
        supabase
          .from("news_posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "publicado"),
        supabase
          .from("workshops")
          .select("id", { count: "exact", head: true })
          .eq("is_visible", true),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("sales").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        products: counts[0].count ?? 0,
        materials: counts[1].count ?? 0,
        warehouses: counts[2].count ?? 0,
        news: counts[3].count ?? 0,
        workshops: counts[4].count ?? 0,
        customers: counts[5].count ?? 0,
        sales: counts[6].count ?? 0,
      });
    })();
  }, []);

  const tiles = [
    { label: "Productos", value: stats.products ?? "—", icon: Package },
    { label: "Materiales", value: stats.materials ?? "—", icon: Boxes },
    { label: "Almacenes", value: stats.warehouses ?? "—", icon: Warehouse },
    { label: "Novedades publicadas", value: stats.news ?? "—", icon: Newspaper },
    { label: "Talleres activos", value: stats.workshops ?? "—", icon: GraduationCap },
    { label: "Clientes", value: stats.customers ?? "—", icon: Users },
    { label: "Ventas", value: stats.sales ?? "—", icon: ShoppingCart },
  ];

  return (
    <div>
      <h1 className="font-display text-4xl">Dashboard general</h1>
      <p className="text-muted-foreground mt-1">Resumen de la operación Makrana.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.label}</CardTitle>
              <t.icon className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-sand p-8 bg-cream/40">
        <h2 className="font-display text-xl">Próximas fases</h2>
        <ul className="mt-3 text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>Fase 2 — CRUD completo de productos, materiales y movimientos de stock.</li>
          <li>Fase 3 — Ventas, pagos y comprobantes PDF.</li>
          <li>Fase 4 — Admin de novedades, talleres y ferias.</li>
          <li>Fase 5 — Intranet del cliente extendida y reportes con exportación.</li>
        </ul>
      </div>
    </div>
  );
}
