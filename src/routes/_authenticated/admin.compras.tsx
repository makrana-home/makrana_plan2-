import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader, moneyPEN } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminCreatePurchase, adminListPurchases } from "@/lib/admin-tax.functions";
export const Route = createFileRoute("/_authenticated/admin/compras")({ component: Page });
const blank: any = {
  supplier_name: "",
  supplier_ruc: "",
  document_type: "01",
  series: "",
  number: "",
  issue_date: new Date().toISOString().slice(0, 10),
  currency: "PEN",
  taxable_amount: "",
  igv_amount: "",
  total_amount: "",
  payment_status: "pending",
  category: "",
  tax_period: new Date().toISOString().slice(0, 7),
  status: "registered",
};
function Page() {
  const list = useServerFn(adminListPurchases),
    create = useServerFn(adminCreatePurchase);
  const [rows, setRows] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [form, setForm] = useState(blank);
  const refresh = useCallback(async () => {
    setRows(await list());
  }, [list]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create({ data: form });
      toast.success("Compra registrada");
      setOpen(false);
      setForm({ ...blank });
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  const fields = [
    ["supplier_name", "Proveedor"],
    ["supplier_ruc", "RUC proveedor"],
    ["document_type", "Tipo"],
    ["series", "Serie"],
    ["number", "Número"],
    ["issue_date", "Fecha"],
    ["tax_period", "Periodo"],
    ["category", "Categoría"],
    ["taxable_amount", "Base imponible"],
    ["igv_amount", "IGV"],
    ["total_amount", "Total"],
  ];
  return (
    <div>
      <PageHeader
        title="Registro de compras SUNAT"
        description="Registra compras para compararlas posteriormente con el registro de compras de SUNAT."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar compra
          </Button>
        }
      />
      <div className="overflow-hidden rounded-xl border border-sand bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Conciliación</TableHead>
              <TableHead className="text-right">IGV</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay compras registradas.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.supplier_name}
                  <div className="text-xs text-muted-foreground">{r.supplier_ruc}</div>
                </TableCell>
                <TableCell>
                  {r.document_type} {r.series}-{r.number}
                </TableCell>
                <TableCell>{r.issue_date}</TableCell>
                <TableCell>{r.reconciliation_status}</TableCell>
                <TableCell className="text-right">{moneyPEN(r.igv_amount)}</TableCell>
                <TableCell className="text-right">{moneyPEN(r.total_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, name]) => (
              <div key={key}>
                <Label>{name}</Label>
                <Input
                  type={
                    key === "issue_date"
                      ? "date"
                      : ["taxable_amount", "igv_amount", "total_amount"].includes(key)
                        ? "number"
                        : "text"
                  }
                  step="0.01"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={key !== "category"}
                />
              </div>
            ))}
            <Button className="sm:col-span-2">Guardar para conciliación</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
