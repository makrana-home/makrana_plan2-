import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultModulesByRole, staffModuleOptions } from "@/lib/staff-access";

const staffRoleSchema = z.enum(["admin", "ventas", "almacen"]);
const staffModuleSchema = z.enum(staffModuleOptions.map((module) => module.key) as [
  string,
  ...string[],
]);

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
    const [
      { data: authData, error: authError },
      { data: roles, error: rolesError },
      { data: permissions, error: permissionsError },
      { data: sales, error: salesError },
      { data: receipts, error: receiptsError },
    ] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("staff_module_permissions").select("user_id, module, enabled"),
        supabaseAdmin.from("sales").select("created_by, total, status"),
        supabaseAdmin.from("receipts").select("created_by"),
      ]);
    if (authError) throw authError;
    if (rolesError) throw rolesError;
    if (permissionsError) throw permissionsError;
    if (salesError) throw salesError;
    if (receiptsError) throw receiptsError;

    const staffRoles = new Map<string, string[]>();
    for (const row of roles ?? []) {
      if (!["admin", "ventas", "almacen"].includes(row.role)) continue;
      staffRoles.set(row.user_id, [...(staffRoles.get(row.user_id) ?? []), row.role]);
    }

    const permissionsByUser = new Map<string, string[]>();
    const configuredUsers = new Set<string>();
    for (const permission of permissions ?? []) {
      configuredUsers.add(permission.user_id);
      if (!permission.enabled) continue;
      permissionsByUser.set(permission.user_id, [
        ...(permissionsByUser.get(permission.user_id) ?? []),
        permission.module,
      ]);
    }

    return authData.users
      .filter((user) => staffRoles.has(user.id))
      .map((user) => {
        const rolesForUser = staffRoles.get(user.id) ?? [];
        const role = rolesForUser[0] as "admin" | "ventas" | "almacen" | undefined;
        const userSales = (sales ?? []).filter((sale) => sale.created_by === user.id);
        return {
          id: user.id,
          email: user.email ?? "",
          full_name: String(user.user_metadata?.full_name ?? ""),
          roles: rolesForUser,
          modules: configuredUsers.has(user.id)
            ? (permissionsByUser.get(user.id) ?? [])
            : role
              ? defaultModulesByRole[role]
              : [],
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          activity: {
            sales_count: userSales.length,
            confirmed_sales_count: userSales.filter((sale) => sale.status === "confirmada").length,
            receipts_count: (receipts ?? []).filter((receipt) => receipt.created_by === user.id)
              .length,
            total_sold: userSales
              .filter((sale) => sale.status === "confirmada")
              .reduce((sum, sale) => sum + Number(sale.total ?? 0), 0),
          },
        };
      });
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
        modules: z.array(staffModuleSchema),
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
      await replaceModulePermissions(supabaseAdmin, created.user.id, data.modules);
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw error;
    }

    return { id: created.user.id };
  });

export const adminUpdateStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(160),
        email: z.string().trim().email().max(160),
        password: z.string().max(72).optional(),
        role: staffRoleSchema,
        modules: z.array(staffModuleSchema),
      })
      .refine((data) => !data.password || data.password.length >= 8, {
        message: "La nueva contraseña debe tener al menos 8 caracteres.",
        path: ["password"],
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: currentRoles, error: currentRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.id);
    if (currentRolesError) throw currentRolesError;

    const isCurrentAdmin = (currentRoles ?? []).some((row) => row.role === "admin");
    if (isCurrentAdmin && data.role !== "admin") {
      const { count, error: adminCountError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (adminCountError) throw adminCountError;
      if ((count ?? 0) <= 1) throw new Error("Debe existir al menos un administrador.");
    }

    const authChanges: {
      email: string;
      password?: string;
      user_metadata: { full_name: string };
    } = {
      email: data.email,
      user_metadata: { full_name: data.full_name },
    };
    if (data.password) authChanges.password = data.password;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      data.id,
      authChanges,
    );
    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.id, full_name: data.full_name });
    if (profileError) throw profileError;

    const { error: deleteRolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.id);
    if (deleteRolesError) throw deleteRolesError;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.role });
    if (roleError) throw roleError;
    await replaceModulePermissions(supabaseAdmin, data.id, data.modules);

    return { id: data.id };
  });

async function replaceModulePermissions(supabaseAdmin: any, userId: string, modules: string[]) {
  const rows = staffModuleOptions.map((module) => ({
    user_id: userId,
    module: module.key,
    enabled: modules.includes(module.key),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin
    .from("staff_module_permissions")
    .upsert(rows, { onConflict: "user_id,module" });
  if (error) throw error;
}
