import { createFileRoute } from "@tanstack/react-router";
import { FormDialog, PageHeader, formatDate, moneyPEN, useDialog } from "@/components/admin-ui";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  defaultModulesByRole,
  staffModuleOptions,
  type StaffModuleKey,
} from "@/lib/staff-access";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminConfirmBulkImport, adminValidateBulkImport } from "@/lib/admin-bulk-import.functions";
import {
  adminCreateStaffUser,
  adminListStaffUsers,
  adminUpdateStaffUser,
} from "@/lib/admin-users.functions";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Pencil,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <div>
      <PageHeader title="Configuración" description="Ajustes generales de la plataforma Makrana." />
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border border-sand/60 rounded-xl bg-warm-white p-6">
          <h2 className="font-display text-lg mb-2">Marca</h2>
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-muted-foreground text-xs">Nombre</dt>
              <dd>Makrana Home Art</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Identidad</dt>
              <dd>Artesanal premium · paleta arena/terracota/cobre</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Tipografías</dt>
              <dd>Nunito Sans (todo el sitio)</dd>
            </div>
          </dl>
        </div>
        <div className="border border-sand/60 rounded-xl bg-warm-white p-6">
          <h2 className="font-display text-lg mb-2">Roles y accesos</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Los roles se asignan en la tabla{" "}
            <code className="text-xs bg-sand/40 px-1 rounded">user_roles</code> de Supabase.
          </p>
          <ul className="text-sm space-y-1 list-disc pl-4">
            <li>
              <b>admin</b> — control total.
            </li>
            <li>
              <b>ventas</b> — registra ventas y emite comprobantes.
            </li>
            <li>
              <b>almacen</b> — gestiona stock y movimientos.
            </li>
            <li>
              <b>cliente</b> — acceso a su intranet personal.
            </li>
          </ul>
        </div>
        <div className="border border-sand/60 rounded-xl bg-warm-white p-6 sm:col-span-2">
          <h2 className="font-display text-lg mb-2">Comprobantes</h2>
          <p className="text-sm text-muted-foreground">
            Numeración automática <span className="font-mono">MKR-00000000</span>, correlativa al
            confirmar cada venta. Son notas de venta internas <b>no fiscales</b>; para emitir
            boletas/facturas SUNAT en el futuro, se integrará un proveedor de facturación
            electrónica.
          </p>
        </div>
        <UsersAccessPanel />
        <BulkImportPanel />
      </div>
    </div>
  );
}

const staffProfiles = {
  admin: {
    label: "Administrador",
    description: "Control total de la plataforma y configuración.",
    modules: ["Todos los módulos", "Usuarios y configuración"],
  },
  ventas: {
    label: "Vendedor",
    description: "Gestiona clientes, cotizaciones, ventas y comprobantes.",
    modules: ["Piezas y materiales", "Manual", "Ventas", "Clientes", "Reportes"],
  },
  almacen: {
    label: "Logística",
    description: "Gestiona inventario, almacenes y movimientos de stock.",
    modules: ["Piezas y materiales", "Manual", "Almacenes", "Movimientos", "Reportes"],
  },
} as const;

type StaffRole = keyof typeof staffProfiles;

function UsersAccessPanel() {
  const listUsers = useServerFn(adminListStaffUsers);
  const createUser = useServerFn(adminCreateStaffUser);
  const updateUser = useServerFn(adminUpdateStaffUser);
  const dialog = useDialog();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "ventas" as StaffRole,
    modules: [...defaultModulesByRole.ventas] as StaffModuleKey[],
  });

  async function refresh() {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch (error: any) {
      toast.error(error.message ?? "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (dialog.data) {
        await updateUser({ data: { ...form, id: dialog.data.id } });
        toast.success("Usuario actualizado correctamente");
      } else {
        await createUser({ data: form });
        toast.success("Usuario creado correctamente");
      }
      dialog.close();
      await refresh();
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  const selectedProfile = staffProfiles[form.role];

  return (
    <section className="rounded-xl border border-sand/60 bg-warm-white p-6 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-terracotta">
            <Users className="h-3.5 w-3.5" />
            Usuarios
          </div>
          <h2 className="font-display text-xl">Usuarios y módulos</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Crea accesos para el equipo y asigna los módulos correspondientes a su función.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-full"
          onClick={() => {
            setForm({
              full_name: "",
              email: "",
              password: "",
              role: "ventas",
              modules: [...defaultModulesByRole.ventas],
            });
            dialog.openWith(null);
          }}
        >
          <UserPlus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-sand/70">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Actividad comercial</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando usuarios...
                </TableCell>
              </TableRow>
            )}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Todavía no hay usuarios del equipo.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              users.map((user) => {
                const role = (user.roles?.[0] ?? "ventas") as StaffRole;
                const profile = staffProfiles[role] ?? staffProfiles.ventas;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.full_name || "Sin nombre"}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-sand bg-cream text-foreground">
                        {profile.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xl flex-wrap gap-1.5">
                        {(user.modules ?? defaultModulesByRole[role]).map((module: StaffModuleKey) => (
                          <span
                            key={module}
                            className="rounded-full border border-sand/70 bg-warm-white px-2 py-1 text-xs text-muted-foreground"
                          >
                            {staffModuleOptions.find((option) => option.key === module)?.label ?? module}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{user.activity?.sales_count ?? 0} cotizaciones/ventas creadas</div>
                      <div>{user.activity?.receipts_count ?? 0} comprobantes emitidos</div>
                      <div className="font-semibold text-foreground">
                        {moneyPEN(user.activity?.total_sold ?? 0)} vendidos
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 rounded-full"
                        onClick={() => {
                          setForm({
                            full_name: user.full_name ?? "",
                            email: user.email ?? "",
                            password: "",
                            role,
                            modules: user.modules ?? [...defaultModulesByRole[role]],
                          });
                          dialog.openWith(user);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={dialog.open}
        onOpenChange={dialog.setOpen}
        title={dialog.data ? "Editar usuario" : "Crear usuario"}
        onSubmit={onSubmit}
        submitting={saving}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="staff_full_name">Nombre completo *</Label>
              <Input
                id="staff_full_name"
                required
                minLength={2}
                value={form.full_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, full_name: event.target.value }))
                }
                placeholder="Nombre del colaborador"
              />
            </div>
            <div>
              <Label htmlFor="staff_email">Correo *</Label>
              <Input
                id="staff_email"
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="usuario@makrana.com"
              />
            </div>
            <div>
              <Label htmlFor="staff_password">
                {dialog.data ? "Nueva contraseña" : "Contraseña *"}
              </Label>
              <Input
                id="staff_password"
                type="password"
                required={!dialog.data}
                minLength={8}
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder={
                  dialog.data ? "Déjala vacía para mantener la actual" : "Mínimo 8 caracteres"
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Tipo de usuario *</Label>
              <Select
                value={form.role}
                onValueChange={(role) => {
                  const nextRole = role as StaffRole;
                  setForm((current) => ({
                    ...current,
                    role: nextRole,
                    modules: [...defaultModulesByRole[nextRole]],
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(staffProfiles).map(([role, profile]) => (
                    <SelectItem key={role} value={role}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-sand/70 bg-cream/40 p-4">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-brand-terracotta" />
              Módulos de {selectedProfile.label}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{selectedProfile.description}</p>
            {form.role === "admin" ? (
              <p className="mt-3 text-sm font-medium">Acceso total a todos los módulos.</p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {staffModuleOptions.map((module) => {
                  const checked = form.modules.includes(module.key);
                  return (
                    <label
                      key={module.key}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-sand/70 bg-warm-white px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          setForm((current) => ({
                            ...current,
                            modules: nextChecked
                              ? [...current.modules, module.key]
                              : current.modules.filter((key) => key !== module.key),
                          }))
                        }
                      />
                      {module.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </FormDialog>
    </section>
  );
}

type ImportColumn = {
  key: string;
  label: string;
  example: string;
  required?: boolean;
  note?: string;
  width?: number;
};

type ImportConfig = {
  label: string;
  description: string;
  filename: string;
  sheetName: string;
  columns: readonly ImportColumn[];
};

const importTypes = {
  pieces: {
    label: "Piezas",
    description:
      "Plantilla para piezas terminadas con categoria, precio, stock inicial y visibilidad.",
    filename: "plantilla-piezas.xls",
    sheetName: "Piezas",
    columns: [
      {
        key: "sku",
        label: "SKU",
        example: "PZ-001",
        required: true,
        note: "Codigo unico.",
        width: 90,
      },
      {
        key: "nombre",
        label: "Nombre",
        example: "Tapiz Luna",
        required: true,
        note: "Nombre visible de la pieza.",
        width: 180,
      },
      {
        key: "descripcion",
        label: "Descripcion",
        example: "Tapiz tejido a mano",
        note: "Texto breve para la ficha.",
        width: 220,
      },
      {
        key: "categoria",
        label: "Categoria",
        example: "Sala",
        note: "Se crea si no existe.",
        width: 120,
      },
      { key: "medidas", label: "Medidas", example: "60 x 80 cm", width: 120 },
      { key: "color", label: "Color", example: "Natural", width: 110 },
      { key: "material_principal", label: "Material principal", example: "Algodon", width: 150 },
      { key: "costo", label: "Costo", example: "45", note: "Numero sin simbolo S/.", width: 90 },
      { key: "precio", label: "Precio", example: "120", note: "Numero sin simbolo S/.", width: 90 },
      { key: "cantidad", label: "Cantidad", example: "2", note: "Stock inicial.", width: 90 },
      {
        key: "almacen",
        label: "Almacen",
        example: "SA",
        note: "Codigo o nombre existente.",
        width: 110,
      },
      {
        key: "estado",
        label: "Estado",
        example: "disponible",
        note: "disponible, por_encargo, agotado o reservado.",
        width: 130,
      },
      {
        key: "visible_catalogo",
        label: "Visible catalogo",
        example: "si",
        note: "si/no.",
        width: 120,
      },
      { key: "observaciones", label: "Observaciones", example: "Primera carga", width: 220 },
    ],
  },
  materials: {
    label: "Materiales",
    description:
      "Plantilla para materiales con presentacion, proveedor, costo, precio y stock inicial.",
    filename: "plantilla-materiales.xls",
    sheetName: "Materiales",
    columns: [
      {
        key: "sku",
        label: "SKU",
        example: "MAT-001",
        required: true,
        note: "Codigo unico.",
        width: 100,
      },
      { key: "nombre", label: "Nombre", example: "Cordon algodon 3mm", required: true, width: 190 },
      { key: "descripcion", label: "Descripcion", example: "Cordon para macrame", width: 220 },
      {
        key: "categoria",
        label: "Categoria",
        example: "Cordones",
        note: "Se crea si no existe.",
        width: 130,
      },
      { key: "grupo_mayor", label: "Grupo mayor", example: "Hilos", width: 120 },
      {
        key: "presentacion",
        label: "Presentacion",
        example: "Rollo",
        note: "Presentacion comercial.",
        width: 130,
      },
      {
        key: "unidad",
        label: "Unidad",
        example: "metro",
        note: "metro, unidad, rollo, madeja, paquete...",
        width: 110,
      },
      { key: "color", label: "Color", example: "Crudo", width: 110 },
      { key: "grosor", label: "Grosor", example: "3 mm", width: 100 },
      { key: "costo", label: "Costo", example: "25", note: "Numero sin simbolo S/.", width: 90 },
      { key: "precio", label: "Precio", example: "40", note: "Numero sin simbolo S/.", width: 90 },
      { key: "cantidad", label: "Cantidad", example: "10", note: "Stock inicial.", width: 90 },
      {
        key: "almacen",
        label: "Almacen",
        example: "PL",
        note: "Codigo o nombre existente.",
        width: 110,
      },
      { key: "proveedor", label: "Proveedor", example: "Proveedor local", width: 160 },
      { key: "observaciones", label: "Observaciones", example: "Revisar tono", width: 220 },
    ],
  },
  customers: {
    label: "Clientes",
    description: "Plantilla para clientes y datos de contacto del CRM.",
    filename: "plantilla-clientes.xls",
    sheetName: "Clientes",
    columns: [
      { key: "codigo_cliente", label: "Codigo cliente", example: "CLI-001", width: 120 },
      {
        key: "nombre",
        label: "Nombre",
        example: "Andrea",
        note: "Usar nombre/apellido o razon social.",
        width: 130,
      },
      { key: "apellido", label: "Apellido", example: "Salas", width: 130 },
      {
        key: "razon_social",
        label: "Razon social",
        example: "",
        note: "Para empresas.",
        width: 180,
      },
      { key: "tipo_documento", label: "Tipo documento", example: "DNI", width: 130 },
      { key: "numero_documento", label: "Numero documento", example: "12345678", width: 140 },
      { key: "telefono", label: "Telefono", example: "999999999", width: 120 },
      { key: "whatsapp", label: "Whatsapp", example: "999999999", width: 120 },
      { key: "email", label: "Email", example: "andrea@example.com", width: 190 },
      { key: "direccion", label: "Direccion", example: "Av. Principal 123", width: 190 },
      { key: "distrito", label: "Distrito", example: "Miraflores", width: 120 },
      { key: "provincia", label: "Provincia", example: "Lima", width: 120 },
      { key: "departamento", label: "Departamento", example: "Lima", width: 130 },
      { key: "pais", label: "Pais", example: "Peru", width: 100 },
      { key: "como_conocio", label: "Como conocio", example: "Instagram", width: 150 },
      { key: "tipo_cliente", label: "Tipo cliente", example: "Retail", width: 130 },
      {
        key: "observaciones",
        label: "Observaciones",
        example: "Cliente interesada en talleres",
        width: 230,
      },
    ],
  },
} satisfies Record<string, ImportConfig>;

type ImportType = keyof typeof importTypes;

function BulkImportPanel() {
  const validateImport = useServerFn(adminValidateBulkImport);
  const confirmImport = useServerFn(adminConfirmBulkImport);
  const [type, setType] = useState<ImportType>("pieces");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const config = importTypes[type];
  const previewRows = useMemo(() => validation?.rows?.slice(0, 10) ?? [], [validation]);
  const canImport = validation?.summary?.valid > 0 && validation?.summary?.invalid === 0;

  function onTypeChange(nextType: ImportType) {
    setType(nextType);
    setFileName("");
    setRows([]);
    setValidation(null);
  }

  function downloadTemplate() {
    const html = buildExcelTemplate(config);
    const blob = new Blob([`\uFEFF${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = config.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onFileSelected(file?: File) {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xls")) {
      toast.error("Sube un archivo CSV o la plantilla Excel .xls descargada.");
      return;
    }

    try {
      const parsedRows = await parseImportFile(file, config);
      if (parsedRows.length === 0) {
        toast.error("El archivo no contiene filas para importar.");
        return;
      }
      setFileName(file.name);
      setRows(parsedRows);
      await validateRows(parsedRows);
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo leer el archivo.");
    }
  }

  async function validateRows(nextRows = rows) {
    setValidating(true);
    try {
      const result = await validateImport({ data: { type, rows: nextRows } });
      setValidation(result);
      if (result.summary.invalid > 0) {
        toast.error("Hay errores o duplicados por corregir antes de importar.");
      } else {
        toast.success("Archivo validado. Revisa la vista previa antes de importar.");
      }
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo validar la carga.");
    } finally {
      setValidating(false);
    }
  }

  async function confirmImportAction() {
    if (!canImport) return;
    setImporting(true);
    try {
      const result = await confirmImport({ data: { type, rows } });
      toast.success(`Importación completada: ${result.inserted} registros.`);
      setFileName("");
      setRows([]);
      setValidation({ ...validation, imported: result.inserted });
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo importar.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="border border-sand/60 rounded-xl bg-warm-white p-6 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-terracotta">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Importar datos
          </div>
          <h2 className="font-display text-xl">Carga masiva</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Importa piezas, materiales y clientes desde una plantilla Excel o CSV.
          </p>
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={downloadTemplate}>
          <Download className="h-4 w-4" /> Descargar plantilla Excel
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div>
            <Label>Tipo de carga</Label>
            <Select value={type} onValueChange={(value) => onTypeChange(value as ImportType)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pieces">Piezas</SelectItem>
                <SelectItem value="materials">Materiales</SelectItem>
                <SelectItem value="customers">Clientes</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">{config.description}</p>
          </div>

          <div>
            <Label htmlFor="bulk_import_file">Archivo Excel o CSV</Label>
            <label
              htmlFor="bulk_import_file"
              className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-sand bg-cream/35 px-4 py-5 text-center transition hover:border-accent hover:bg-cream"
            >
              <Upload className="h-5 w-5 text-brand-terracotta" />
              <span className="text-sm font-medium">
                {fileName || "Selecciona un archivo .xls o .csv"}
              </span>
              <span className="text-xs text-muted-foreground">Máximo 500 filas por carga.</span>
            </label>
            <Input
              id="bulk_import_file"
              type="file"
              accept=".xls,.csv,text/csv,application/vnd.ms-excel"
              className="sr-only"
              onChange={(event) => onFileSelected(event.target.files?.[0])}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-sand/70 bg-cream/30 p-4">
          <BulkSummary validation={validation} validating={validating} />
          <div className="mt-4 overflow-x-auto rounded-xl border border-sand/70 bg-warm-white">
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Fila</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                  <TableHead>Datos principales</TableHead>
                  <TableHead>Errores / duplicados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Sube un archivo para ver la vista previa antes de importar.
                    </TableCell>
                  </TableRow>
                )}
                {previewRows.map((row: any) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="tabular-nums">{row.rowNumber}</TableCell>
                    <TableCell>
                      {row.status === "ok" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          OK
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
                          Revisar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <PreviewMainValues type={type} values={row.values} />
                    </TableCell>
                    <TableCell className="max-w-[360px] text-xs text-muted-foreground">
                      {[...(row.errors ?? []), ...(row.warnings ?? [])].length > 0
                        ? [...(row.errors ?? []), ...(row.warnings ?? [])].join(" ")
                        : "Sin observaciones."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              La importación queda bloqueada si hay errores o duplicados.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => validateRows()}
                disabled={rows.length === 0 || validating || importing}
              >
                Validar de nuevo
              </Button>
              <Button
                type="button"
                className="rounded-full"
                onClick={confirmImportAction}
                disabled={!canImport || importing || validating}
              >
                Confirmar importación
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BulkSummary({ validation, validating }: { validation: any; validating: boolean }) {
  if (validating) return <p className="text-sm text-muted-foreground">Validando archivo...</p>;
  if (!validation) return <p className="text-sm text-muted-foreground">Sin archivo cargado.</p>;

  const summary = validation.summary;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <SummaryPill label="Filas" value={summary.total} />
      <SummaryPill label="Válidas" value={summary.valid} tone="ok" />
      <SummaryPill
        label="Errores"
        value={summary.invalid}
        tone={summary.invalid ? "error" : "ok"}
      />
      <SummaryPill
        label="Duplicados"
        value={summary.duplicates}
        tone={summary.duplicates ? "error" : "ok"}
      />
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "error";
}) {
  const Icon = tone === "error" ? XCircle : CheckCircle2;
  return (
    <div className="rounded-xl border border-sand/70 bg-warm-white p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {tone !== "neutral" && (
          <Icon
            className={`h-3.5 w-3.5 ${tone === "error" ? "text-rose-600" : "text-emerald-600"}`}
          />
        )}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PreviewMainValues({ type, values }: { type: ImportType; values: Record<string, string> }) {
  if (type === "customers") {
    return (
      <>
        <div className="font-medium">
          {values.razon_social ||
            `${values.nombre ?? ""} ${values.apellido ?? ""}`.trim() ||
            "Sin nombre"}
        </div>
        <div className="text-xs text-muted-foreground">
          {values.email || values.whatsapp || values.telefono || "Sin contacto"}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="font-medium">{values.nombre || "Sin nombre"}</div>
      <div className="text-xs text-muted-foreground">
        {values.sku || "Sin SKU"} · {values.categoria || "Sin categoria"}
      </div>
    </>
  );
}

async function parseImportFile(file: File, config: ImportConfig) {
  const text = await file.text();
  const cleanText = text.replace(/^\uFEFF/, "");
  if (file.name.toLowerCase().endsWith(".xls") || cleanText.trimStart().startsWith("<")) {
    return parseExcelHtml(cleanText, config);
  }
  return parseDelimitedText(cleanText, config);
}

function parseDelimitedText(csvText: string, config: ImportConfig) {
  const rows = parseDelimitedRows(csvText, detectDelimiter(csvText));
  return rowsToRecords(rows, config);
}

function parseExcelHtml(htmlText: string, config: ImportConfig) {
  if (typeof DOMParser === "undefined") {
    throw new Error("El navegador no pudo leer la plantilla Excel.");
  }
  const document = new DOMParser().parseFromString(htmlText, "text/html");
  const table =
    document.querySelector("table[data-template-table='true']") ?? document.querySelector("table");
  if (!table) return [];
  const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? ""),
  );
  return rowsToRecords(rows, config);
}

function rowsToRecords(rows: string[][], config: ImportConfig) {
  const expected = new Set<string>(config.columns.map((column) => column.key));
  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader).filter(Boolean);
    return normalized.filter((cell) => expected.has(cell)).length >= Math.min(3, expected.size);
  });
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map(normalizeHeader);
  return rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""])),
    )
    .filter((row) => config.columns.some((column) => textValue(row[column.key])));
}

function parseDelimitedRows(csvText: string, delimiter: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(csvText: string) {
  const firstLine = csvText.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const candidates = [",", ";", "\t"];
  return candidates.reduce((best, current) =>
    countDelimiter(firstLine, current) > countDelimiter(firstLine, best) ? current : best,
  );
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      index += 1;
      continue;
    }
    if (char === '"') inQuotes = !inQuotes;
    if (char === delimiter && !inQuotes) count += 1;
  }
  return count;
}

function buildExcelTemplate(config: ImportConfig) {
  const colGroup = config.columns
    .map((column) => `<col style="width:${column.width ?? 140}px" />`)
    .join("");
  const emptyRows = Array.from(
    { length: 25 },
    () => `<tr>${config.columns.map(() => "<td></td>").join("")}</tr>`,
  ).join("");
  const headerCells = config.columns
    .map(
      (column) =>
        `<th class="${column.required ? "required" : ""}">${escapeHtml(column.label)}</th>`,
    )
    .join("");
  const referenceRows = config.columns
    .map(
      (column) => `<tr>
        <td>${escapeHtml(column.label)}</td>
        <td>${escapeHtml(column.key)}</td>
        <td>${column.required ? "Si" : "No"}</td>
        <td>${escapeHtml(column.example)}</td>
        <td>${escapeHtml(column.note ?? "")}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #2f241d; }
    table { border-collapse: collapse; margin-bottom: 18px; }
    th, td { border: 1px solid #d8c7b4; padding: 8px; vertical-align: top; mso-number-format:"\\@"; }
    .title { background: #8f372e; color: #ffffff; font-size: 18px; font-weight: 700; text-align: left; }
    .note { background: #f5ecdf; color: #6f5a4a; }
    .header th { background: #efe2d1; color: #3b2b22; font-weight: 700; }
    .header th.required { background: #e5c2b9; color: #7d2f28; }
    .reference th { background: #f2d9c5; color: #3b2b22; }
  </style>
</head>
<body>
  <table data-template-table="true">
    ${colGroup}
    <tr><th class="title" colspan="${config.columns.length}">Carga masiva - ${escapeHtml(config.label)}</th></tr>
    <tr><td class="note" colspan="${config.columns.length}">Completa una fila por registro. Los encabezados ya estan separados por celda.</td></tr>
    <tr class="header">${headerCells}</tr>
    ${emptyRows}
  </table>
  <table class="reference">
    <tr><th>Campo</th><th>Clave interna</th><th>Requerido</th><th>Ejemplo</th><th>Nota</th></tr>
    ${referenceRows}
  </table>
</body>
</html>`;
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function textValue(value: string | undefined) {
  return String(value ?? "").trim();
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
