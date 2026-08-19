export const staffModuleOptions = [
  { key: "inventory", label: "Piezas y materiales" },
  { key: "manual", label: "Manual" },
  { key: "calendar", label: "Calendario" },
  { key: "sales", label: "Ventas y comprobantes" },
  { key: "customers", label: "Clientes" },
  { key: "stock", label: "Almacenes y movimientos" },
  { key: "reports", label: "Reportes" },
] as const;

export type StaffModuleKey = (typeof staffModuleOptions)[number]["key"];

export const defaultModulesByRole: Record<"admin" | "ventas" | "almacen", StaffModuleKey[]> = {
  admin: staffModuleOptions.map((module) => module.key),
  ventas: ["inventory", "manual", "calendar", "sales", "customers", "reports"],
  almacen: ["inventory", "manual", "calendar", "stock", "reports"],
};

export function moduleForAdminPath(path: string): StaffModuleKey | "admin" | null {
  if (path === "/admin" || path === "/admin/") return null;
  if (path.startsWith("/admin/productos") || path.startsWith("/admin/materiales")) {
    return "inventory";
  }
  if (path.startsWith("/admin/manual")) return "manual";
  if (path.startsWith("/admin/calendario")) return "calendar";
  if (
    path.startsWith("/admin/ventas") ||
    path.startsWith("/admin/cotizaciones") ||
    path.startsWith("/admin/comprobantes")
  ) {
    return "sales";
  }
  if (path.startsWith("/admin/clientes")) return "customers";
  if (path.startsWith("/admin/almacenes") || path.startsWith("/admin/movimientos")) {
    return "stock";
  }
  if (path.startsWith("/admin/reportes")) return "reports";
  return "admin";
}

export function canAccessAdminPath(
  path: string,
  roles: string[],
  modules: string[] | null,
) {
  if (roles.includes("admin")) return true;
  const requiredModule = moduleForAdminPath(path);
  if (requiredModule === null) return true;
  if (requiredModule === "admin") return false;
  if (modules !== null) return modules.includes(requiredModule);
  const role = roles.includes("ventas") ? "ventas" : roles.includes("almacen") ? "almacen" : null;
  return role ? defaultModulesByRole[role].includes(requiredModule) : false;
}
