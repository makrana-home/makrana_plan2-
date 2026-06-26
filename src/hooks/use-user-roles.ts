import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "ventas" | "almacen" | "cliente";

export function useUserRoles() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (active) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!active) return;
      setRoles((data ?? []).map((r: any) => r.role as AppRole));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);
  const has = (r: AppRole) => roles.includes(r);
  const isStaff = has("admin") || has("ventas") || has("almacen");
  return { roles, has, isStaff, loading };
}
