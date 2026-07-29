import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const staffRoleSchema = z.enum(["admin", "ventas", "almacen"]);

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Solo un administrador puede gestionar usuarios.");
}

export const adminListStaffUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: authData, error: authError }, { data: roles, error: rolesError }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
      ]);
    if (authError) throw authError;
    if (rolesError) throw rolesError;

    const staffRoles = new Map<string, string[]>();
    for (const row of roles ?? []) {
      if (!["admin", "ventas", "almacen"].includes(row.role)) continue;
      staffRoles.set(row.user_id, [...(staffRoles.get(row.user_id) ?? []), row.role]);
    }

    return authData.users
      .filter((user) => staffRoles.has(user.id))
      .map((user) => ({
        id: user.id,
        email: user.email ?? "",
        full_name: String(user.user_metadata?.full_name ?? ""),
        roles: staffRoles.get(user.id) ?? [],
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      }));
  });

export const adminCreateStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(160),
        email: z.string().trim().email().max(160),
        password: z.string().min(8).max(72),
        role: staffRoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error("No se pudo crear el usuario.");

    try {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: created.user.id, full_name: data.full_name });
      if (profileError) throw profileError;

      const { error: deleteRolesError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", created.user.id);
      if (deleteRolesError) throw deleteRolesError;

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: created.user.id, role: data.role });
      if (roleError) throw roleError;
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw error;
    }

    return { id: created.user.id };
  });
