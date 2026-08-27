import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { PageHeader, moneyPEN } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListSirePeriods, adminSyncSireMock } from "@/lib/admin-tax.functions";
export const Route = createFileRoute("/_authenticated/admin/sire")({ component: Page });
function Page() {
  const list = useServerFn(adminListSirePeriods),
    sync = useServerFn(adminSyncSireMock);
  const [rows, setRows] = useState<any[]>([]),
    [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const refresh = useCallback(async () => {
    setRows(await list());
  }, [list]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function run(registryType: "RVIE" | "RCE") {
    try {
      await sync({ data: { period, registryType } });
      toast.success(`Propuesta ${registryType} simulada descargada`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        <ShieldAlert className="h-5 w-5" />
        Libros SUNAT en ambiente de prueba — presentación y reemplazo bloqueados
      </div>
      <PageHeader
        title="Libros SUNAT"
        description="Compara los registros de ventas y compras con SUNAT antes de cualquier aprobación tributaria."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <Input
          className="w-44"
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <Button variant="outline" onClick={() => run("RVIE")}>
          <RefreshCw className="h-4 w-4" />
          Comparar registro de ventas SUNAT
        </Button>
        <Button variant="outline" onClick={() => run("RCE")}>
          <RefreshCw className="h-4 w-4" />
          Comparar registro de compras SUNAT
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-sand bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periodo</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Propuesta</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Revisión</TableHead>
              <TableHead>Presentación</TableHead>
              <TableHead className="text-right">Makrana / SUNAT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Sin periodos sincronizados.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.period}</TableCell>
                <TableCell>
                  {r.registry_type === "RVIE"
                    ? "Registro de ventas SUNAT"
                    : "Registro de compras SUNAT"}
                  <div className="text-xs text-muted-foreground">
                    Información técnica: {r.registry_type}
                  </div>
                </TableCell>
                <TableCell>{r.proposal_status}</TableCell>
                <TableCell className="font-mono text-xs">{r.ticket}</TableCell>
                <TableCell>{r.review_status}</TableCell>
                <TableCell className="font-semibold text-amber-700">Bloqueada</TableCell>
                <TableCell className="text-right">
                  {moneyPEN(r.makrana_total)} / {moneyPEN(r.sunat_total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
