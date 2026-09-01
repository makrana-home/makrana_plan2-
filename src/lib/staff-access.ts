export const staffModuleGroups = [
  {
    key: "start",
    label: "Inicio",
    modules: [{ key: "dashboard", label: "Dashboard" }],
  },
  {
    key: "inventory",
    label: "Inventario y almacenes",
    modules: [
      { key: "products", label: "Piezas" },
      { key: "materials", label: "Materiales" },
      { key: "warehouses", label: "Almacenes y stock" },
      { key: "inventory_movements", label: "Movimientos de inventario" },
    ],
  },
  {
    key: "organization",
    label: "Organización",
    modules: [
      { key: "manual", label: "Manual" },
      { key: "calendar", label: "Calendario" },
    ],
  },
  {
    key: "sales",
    label: "Ventas",
    modules: [
      { key: "sales", label: "Nueva operación" },
      { key: "web_orders", label: "Ventas de la web" },
      { key: "customers", label: "Clientes" },
      { key: "reports", label: "Reportes" },
    ],
  },
  {
    key: "tax",
    label: "Tributos",
    modules: [
      { key: "tax_overview", label: "Resumen tributario" },
      { key: "receipts", label: "Comprobantes y notas de crédito" },
      { key: "tax_purchases", label: "Registro de compras SUNAT" },
      { key: "sire", label: "Libros SUNAT" },
    ],
  },
  {
    key: "experimental",
    label: "Funciones en desarrollo",
    modules: [
      {
        key: "electronic_invoicing",
        label: "Boleta y factura electrónica",
      },
    ],
  },
  {
    key: "website",
    label: "Página web",
    modules: [
      { key: "web_home", label: "Página de inicio" },
      { key: "news", label: "Novedades" },
      { key: "workshops", label: "Talleres" },
    ],
  },
] as const;

export type StaffModuleKey = (typeof staffModuleGroups)[number]["modules"][number]["key"];
export const staffModuleOptions = staffModuleGroups.flatMap((group) =>
  Array.from(group.modules as readonly { key: StaffModuleKey; label: string }[]),
) as { key: StaffModuleKey; label: string }[];

export const defaultModulesByRole: Record<"admin" | "ventas" | "almacen", StaffModuleKey[]> = {
  admin: staffModuleOptions
    .filter((module) => module.key !== "electronic_invoicing")
    .map((module) => module.key),
  ventas: [
    "products",
    "materials",
    "manual",
    "calendar",
    "sales",
    "web_orders",
    "customers",
    "reports",
    "tax_overview",
    "receipts",
    "tax_purchases",
    "sire",
  ],
  almacen: [
    "products",
    "materials",
    "warehouses",
    "inventory_movements",
    "manual",
    "calendar",
    "reports",
  ],
};

export function moduleForAdminPath(path: string): StaffModuleKey | "admin" | null {
  if (path === "/admin" || path === "/admin/") return "dashboard";
  if (path.startsWith("/admin/productos")) return "products";
  if (path.startsWith("/admin/materiales")) return "materials";
  if (path.startsWith("/admin/almacenes")) return "warehouses";
  if (path.startsWith("/admin/movimientos")) return "inventory_movements";
  if (path.startsWith("/admin/manual")) return "manual";
  if (path.startsWith("/admin/calendario")) return "calendar";
  if (
    path.startsWith("/admin/ventas") ||
    path.startsWith("/admin/pagos") ||
    path.startsWith("/admin/cotizaciones")
  )
    return "sales";
  if (path.startsWith("/admin/pedidos")) return "web_orders";
  if (path.startsWith("/admin/configuracion/comercio")) return "admin";
  if (path.startsWith("/admin/tributos") || path.startsWith("/admin/configuracion/tributaria"))
    return "tax_overview";
  if (path.startsWith("/admin/comprobantes")) return "receipts";
  if (path.startsWith("/admin/compras")) return "tax_purchases";
  if (path.startsWith("/admin/sire")) return "sire";
  if (path.startsWith("/admin/clientes")) return "customers";
  if (path.startsWith("/admin/reportes")) return "reports";
  if (path.startsWith("/admin/pagina-web")) return "web_home";
  if (path.startsWith("/admin/novedades")) return "news";
  if (path.startsWith("/admin/talleres") || path.startsWith("/admin/ferias")) return "workshops";
  return "admin";
}

export function canAccessAdminPath(path: string, roles: string[], modules: string[] | null) {
  const requiredModule = moduleForAdminPath(path);
  if (requiredModule === null) return true;
  if (requiredModule === "admin") return roles.includes("admin");
  if (roles.includes("admin") && modules === null) return true;
  if (modules !== null) return modules.includes(requiredModule);
  const role = roles.includes("ventas") ? "ventas" : roles.includes("almacen") ? "almacen" : null;
  return role ? defaultModulesByRole[role].includes(requiredModule) : false;
}

export function firstAccessibleAdminPath(roles: string[], modules: string[] | null) {
  const candidates = [
    "/admin/ventas",
    "/admin/calendario",
    "/admin/productos",
    "/admin/pedidos",
    "/admin/clientes",
    "/admin/reportes",
    "/admin/manual",
    "/admin",
  ];
  return candidates.find((path) => canAccessAdminPath(path, roles, modules)) ?? "/auth";
}
