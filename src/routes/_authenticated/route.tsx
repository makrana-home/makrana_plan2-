import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getDevAdminEmail, hasDevAdminSession } from "@/lib/dev-admin";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      throw redirect({ to: "/auth" });
    }

    if (hasDevAdminSession()) {
      return { user: { id: "dev-admin", email: getDevAdminEmail() } };
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
