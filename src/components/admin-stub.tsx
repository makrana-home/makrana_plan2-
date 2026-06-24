import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function AdminStub({ title, description, phase }: { title: string; description?: string; phase?: string }) {
  return (
    <div>
      <h1 className="font-display text-4xl">{title}</h1>
      {description && <p className="text-muted-foreground mt-2 max-w-prose">{description}</p>}
      <div className="mt-8 rounded-xl border border-dashed border-sand p-12 bg-cream/40">
        <p className="text-sm text-muted-foreground">Este módulo se habilitará en {phase ?? "una próxima fase"}.</p>
        <p className="text-xs text-muted-foreground mt-2">La base técnica (tablas, RLS y permisos) ya está creada — listo para construir encima.</p>
        <Button asChild variant="link" className="px-0 mt-4"><Link to="/admin">← Volver al dashboard</Link></Button>
      </div>
    </div>
  );
}

function make(title: string, description: string, phase: string) {
  return () => <AdminStub title={title} description={description} phase={phase} />;
}

export const ProductosRoute = createFileRoute("/_authenticated/admin/productos")({ component: make("Productos", "Gestión de productos terminados, kits y materiales.", "la Fase 2") });
export const MaterialesRoute = createFileRoute("/_authenticated/admin/materiales")({ component: make("Materiales", "Inventario de materiales con presentaciones (unidad, metro, rollo, docena, ciento...).", "la Fase 2") });
export const AlmacenesRoute = createFileRoute("/_authenticated/admin/almacenes")({ component: make("Almacenes", "Santa Anita, Pueblo Libre y Almacén Feriante.", "la Fase 2") });
export const MovimientosRoute = createFileRoute("/_authenticated/admin/movimientos")({ component: make("Movimientos de stock", "Entradas, salidas, transferencias, ajustes y ventas.", "la Fase 2") });
export const VentasRoute = createFileRoute("/_authenticated/admin/ventas")({ component: make("Ventas", "Registrar ventas, descontar stock del almacén y generar comprobante.", "la Fase 3") });
export const ComprobantesRoute = createFileRoute("/_authenticated/admin/comprobantes")({ component: make("Comprobantes", "Notas de venta internas con correlativo MKR-000001.", "la Fase 3") });
export const ClientesRoute = createFileRoute("/_authenticated/admin/clientes")({ component: make("Clientes", "Administrar clientes y su historial.", "la Fase 3") });
export const NovedadesRoute = createFileRoute("/_authenticated/admin/novedades")({ component: make("Novedades", "Crear, publicar y ocultar novedades del taller.", "la Fase 4") });
export const TalleresRoute = createFileRoute("/_authenticated/admin/talleres")({ component: make("Talleres y cursos", "Gestionar talleres, cursos e inscripciones.", "la Fase 4") });
export const FeriasRoute = createFileRoute("/_authenticated/admin/ferias")({ component: make("Ferias", "Stock enviado y vendido en cada feria.", "la Fase 4") });
export const ReportesRoute = createFileRoute("/_authenticated/admin/reportes")({ component: make("Reportes", "Ventas, stock, materiales más usados, talleres con más inscritos.", "la Fase 5") });
export const ConfiguracionRoute = createFileRoute("/_authenticated/admin/configuracion")({ component: make("Configuración", "Datos de la marca, usuarios internos y preferencias.", "la Fase 5") });
