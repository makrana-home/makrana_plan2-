import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { moneyPEN, formatDate } from "@/components/admin-ui";
import { clientGetProfile } from "@/lib/admin-content.functions";
import { adminGetReceipt } from "@/lib/admin-sales.functions";
import { ReceiptPreviewDialog } from "@/components/admin/receipt-documents";

export const Route = createFileRoute("/_authenticated/cliente/comprobantes")({
  component: Comprobantes,
});

function Comprobantes() {
  const fn = useServerFn(clientGetProfile);
  const getOne = useServerFn(adminGetReceipt);
  const [d, setD] = useState<any>(null);
  const [active, setActive] = useState<any>(null);
  useEffect(() => {
    fn().then(setD); /* eslint-disable-line */
  }, []);
  async function view(id: string) {
    try {
      const r = await getOne({ data: { id } });
      setActive(r);
    } catch {
      /* sin permiso */
    }
  }
  const list = (d?.sales ?? []).filter((s: any) => s.receipt?.[0]);
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Mis comprobantes</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Notas de venta internas de tus compras confirmadas.
      </p>
      <ul className="mt-6 space-y-2">
        {list.length === 0 && (
          <li className="text-sm text-muted-foreground">Aún no tienes comprobantes.</li>
        )}
        {list.map((s: any) => (
          <li
            key={s.id}
            className="border border-sand/60 rounded-lg bg-warm-white p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-mono font-medium">{s.receipt[0].number}</div>
              <div className="text-xs text-muted-foreground">
                {formatDate(s.created_at)} · {moneyPEN(s.total)}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => view(s.receipt[0].id)}>
              <Eye className="h-4 w-4" /> Ver
            </Button>
          </li>
        ))}
      </ul>
      <ReceiptPreviewDialog
        receipt={active}
        open={!!active}
        onOpenChange={(open) => !open && setActive(null)}
        initialVariant="note"
      />
    </div>
  );
}
