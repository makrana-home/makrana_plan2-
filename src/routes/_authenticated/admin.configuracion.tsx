import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin-ui";

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
              <dd>Cormorant Garamond (display) · Inter (cuerpo)</dd>
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
            Numeración automática <span className="font-mono">MKR-000001</span>, correlativa al
            confirmar cada venta. Son notas de venta internas <b>no fiscales</b>; para emitir
            boletas/facturas SUNAT en el futuro, se integrará un proveedor de facturación
            electrónica.
          </p>
        </div>
      </div>
    </div>
  );
}
