import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarClock,
  Download,
  Eye,
  FileCheck2,
  QrCode,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { PageHeader, moneyPEN } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  adminCreateCreditNote,
  adminGetTaxDocument,
  adminGetTaxFileUrl,
  adminGetTaxSettings,
  adminIssueTaxDocument,
  adminListDailySummaries,
  adminListEligibleSales,
  adminListTaxDocuments,
  adminRunDailySummaryMock,
} from "@/lib/admin-tax.functions";
export const Route = createFileRoute("/_authenticated/admin/comprobantes")({ component: Page });
function Page() {
  const list = useServerFn(adminListTaxDocuments),
    eligible = useServerFn(adminListEligibleSales),
    getSettings = useServerFn(adminGetTaxSettings),
    issue = useServerFn(adminIssueTaxDocument),
    getDocument = useServerFn(adminGetTaxDocument),
    getFileUrl = useServerFn(adminGetTaxFileUrl),
    createCredit = useServerFn(adminCreateCreditNote),
    listSummaries = useServerFn(adminListDailySummaries),
    runSummary = useServerFn(adminRunDailySummaryMock);
  const [rows, setRows] = useState<any[]>([]),
    [sales, setSales] = useState<any[]>([]),
    [settings, setSettings] = useState<any>(null),
    [summaries, setSummaries] = useState<any[]>([]),
    [open, setOpen] = useState(false),
    [issuing, setIssuing] = useState(false),
    [preview, setPreview] = useState<"boleta" | "factura" | null>(null),
    [creditOpen, setCreditOpen] = useState(false),
    [creditSource, setCreditSource] = useState<any>(null),
    [summaryDate, setSummaryDate] = useState(new Date().toISOString().slice(0, 10)),
    [form, setForm] = useState<any>({
      saleId: "",
      documentType: "03",
      seriesId: "",
      scenario: "accepted",
    }),
    [creditForm, setCreditForm] = useState<any>({
      reason: "06",
      seriesId: "",
      scenario: "accepted",
      items: [],
    });
  const refresh = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([list(), eligible(), getSettings(), listSummaries()]);
    setRows(a);
    setSales(b);
    setSettings(c);
    setSummaries(d);
  }, [eligible, getSettings, list, listSummaries]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const series = (settings?.series ?? []).filter(
    (x: any) => x.document_type === form.documentType && x.active,
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (issuing) return;
    setIssuing(true);
    try {
      await issue({ data: form });
      toast.success("Comprobante guardado en el simulador");
      setOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIssuing(false);
    }
  }
  async function download(documentId: string, kind: "pdf" | "xml" | "cdr") {
    try {
      window.open(
        await getFileUrl({ data: { documentId, kind } }),
        "_blank",
        "noopener,noreferrer",
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function openCredit(row: any) {
    try {
      const source = await getDocument({ data: { id: row.id } });
      setCreditSource(source);
      const wanted = source.series.startsWith("F") ? "FC01" : "BC01";
      const noteSeries = (settings?.series ?? []).find(
        (x: any) => x.document_type === "07" && x.series === wanted,
      );
      setCreditForm({
        reason: "06",
        seriesId: noteSeries?.id ?? "",
        scenario: "accepted",
        items: source.items.map((x: any) => ({ itemId: x.id, quantity: Number(x.quantity) })),
      });
      setCreditOpen(true);
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function submitCredit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCredit({ data: { originalDocumentId: creditSource.id, ...creditForm } });
      toast.success("Nota de crédito procesada");
      setCreditOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function createSummary() {
    try {
      await runSummary({ data: { issueDate: summaryDate, scenario: "accepted" } });
      toast.success("Resumen diario simulado procesado");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        <ShieldAlert className="h-5 w-5" />
        Ambiente de prueba: no se están enviando documentos reales a SUNAT.
      </div>
      <PageHeader
        title="Boletas y facturas"
        description="Boletas, facturas y notas de crédito vinculadas a ventas confirmadas y pagadas."
        actions={
          <Button disabled={!settings} onClick={() => setOpen(true)}>
            <FileCheck2 className="h-4 w-4" />
            Generar boleta o factura
          </Button>
        }
      />
      {!settings && (
        <p className="mb-4 rounded-xl border border-sand bg-warm-white p-4 text-sm">
          Completa primero la configuración tributaria.
        </p>
      )}
      <section className="mb-5 rounded-2xl border border-sand bg-warm-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-terracotta">
              <ReceiptText className="h-3.5 w-3.5" />
              Vista previa
            </div>
            <h2 className="font-display text-xl">Conoce el formato de tus comprobantes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ejemplos referenciales con datos ficticios. No generan ni envían documentos a SUNAT.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setPreview("boleta")}>
              <Eye className="h-4 w-4" /> Ver boleta
            </Button>
            <Button variant="outline" onClick={() => setPreview("factura")}>
              <Eye className="h-4 w-4" /> Ver factura
            </Button>
          </div>
        </div>
      </section>
      <div className="overflow-hidden rounded-xl border border-sand bg-warm-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Archivos y acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aún no hay comprobantes electrónicos.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">
                  {typeLabel(r.document_type)} {r.series}-{String(r.number).padStart(8, "0")}
                </TableCell>
                <TableCell>{r.issue_date}</TableCell>
                <TableCell>{r.customer_name}</TableCell>
                <TableCell>{statusLabel(r.status)}</TableCell>
                <TableCell className="text-right">{moneyPEN(r.total_amount)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!r.pdf_path}
                      onClick={() => download(r.id, "pdf")}
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!r.signed_xml_path}
                      onClick={() => download(r.id, "xml")}
                    >
                      XML
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!r.cdr_path}
                      onClick={() => download(r.id, "cdr")}
                    >
                      Respuesta de SUNAT
                    </Button>
                    {["01", "03"].includes(r.document_type) &&
                      ["accepted", "accepted_with_observations"].includes(r.status) && (
                        <Button size="sm" variant="outline" onClick={() => openCredit(r)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Nota de crédito
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={preview !== null} onOpenChange={(isOpen) => !isOpen && setPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto bg-stone-100 p-3 sm:p-6">
          <DialogHeader className="sr-only">
            <DialogTitle>
              Ejemplo de {preview === "factura" ? "factura electrónica" : "boleta electrónica"}
            </DialogTitle>
          </DialogHeader>
          {preview && <TaxDocumentPreview type={preview} />}
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar en ambiente de prueba</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Venta pagada">
              <Select value={form.saleId} onValueChange={(saleId) => setForm({ ...form, saleId })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.quote_number ?? s.id.slice(0, 8)} ·{" "}
                      {s.customer?.full_name ?? "Consumidor final"} · {moneyPEN(s.total)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo">
              <Select
                value={form.documentType}
                onValueChange={(documentType) => setForm({ ...form, documentType, seriesId: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="03">Boleta electrónica</SelectItem>
                  <SelectItem value="01">Factura electrónica</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Serie">
              <Select
                value={form.seriesId}
                onValueChange={(seriesId) => setForm({ ...form, seriesId })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {series.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.series} · siguiente {s.last_number + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Scenario
              value={form.scenario}
              setValue={(scenario: string) => setForm({ ...form, scenario })}
            />
            <Button className="w-full" disabled={!form.saleId || !form.seriesId || issuing}>
              {issuing ? "Guardando…" : "Guardar comprobante"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <div className="mt-8">
        <PageHeader
          title="Resúmenes de boletas"
          description="Agrupación manual en ambiente de prueba. La automatización permanece desactivada."
          actions={
            <div className="flex gap-2">
              <Input
                type="date"
                value={summaryDate}
                onChange={(e) => setSummaryDate(e.target.value)}
              />
              <Button variant="outline" onClick={createSummary}>
                <CalendarClock className="h-4 w-4" />
                Generar resumen
              </Button>
            </div>
          }
        />
        <div className="grid gap-2">
          {summaries.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-sand bg-warm-white p-4 text-sm"
            >
              <span className="font-mono">{s.summary_identifier}</span>
              <span>
                {s.status} · {s.ticket}
              </span>
            </div>
          ))}
          {summaries.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin resúmenes generados.</p>
          )}
        </div>
      </div>
      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear nota de crédito simulada</DialogTitle>
          </DialogHeader>
          {creditSource && (
            <form onSubmit={submitCredit} className="space-y-4">
              <Field label="Motivo">
                <Select
                  value={creditForm.reason}
                  onValueChange={(reason) => setCreditForm({ ...creditForm, reason })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">Anulación de la operación</SelectItem>
                    <SelectItem value="02">Error en el RUC</SelectItem>
                    <SelectItem value="03">Corrección de descripción</SelectItem>
                    <SelectItem value="04">Descuento global</SelectItem>
                    <SelectItem value="06">Devolución total</SelectItem>
                    <SelectItem value="07">Devolución parcial</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Serie">
                <Select
                  value={creditForm.seriesId}
                  onValueChange={(seriesId) => setCreditForm({ ...creditForm, seriesId })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings?.series ?? [])
                      .filter((x: any) => x.document_type === "07")
                      .map((x: any) => (
                        <SelectItem key={x.id} value={x.id}>
                          {x.series}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="space-y-2">
                <Label>Cantidades a devolver</Label>
                {creditSource.items.map((item: any, index: number) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_100px] items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="text-sm">
                      {item.description} (máx. {item.quantity})
                    </span>
                    <Input
                      type="number"
                      min="0"
                      max={item.quantity}
                      step="0.01"
                      value={creditForm.items[index]?.quantity ?? 0}
                      onChange={(e) => {
                        const items = [...creditForm.items];
                        items[index] = { itemId: item.id, quantity: Number(e.target.value) };
                        setCreditForm({ ...creditForm, items });
                      }}
                    />
                  </div>
                ))}
              </div>
              <Scenario
                value={creditForm.scenario}
                setValue={(scenario: string) => setCreditForm({ ...creditForm, scenario })}
              />
              <Button className="w-full" disabled={!creditForm.seriesId}>
                Generar nota de crédito
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaxDocumentPreview({ type }: { type: "boleta" | "factura" }) {
  const isInvoice = type === "factura";
  return (
    <article className="relative overflow-hidden rounded-sm bg-white p-5 text-[11px] leading-relaxed text-stone-800 shadow-xl sm:p-8 sm:text-xs">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="-rotate-[28deg] select-none text-6xl font-black tracking-[0.18em] text-stone-200/45 sm:text-8xl">
          EJEMPLO
        </span>
      </div>
      <div className="relative">
        <header className="grid gap-5 border-b-2 border-[#80342c] pb-5 sm:grid-cols-[1fr_250px]">
          <div>
            <div className="font-display text-3xl font-semibold text-[#80342c]">Makrana</div>
            <div className="mt-1 font-semibold">MAKRANA HOME ART S.A.C.</div>
            <div>Av. Los Artesanos 245, Lima, Lima</div>
            <div>Teléfono: (01) 555-0148 · ventas@makrana.pe</div>
          </div>
          <div className="border-2 border-[#80342c] text-center">
            <div className="border-b border-[#80342c] py-2 font-bold">RUC 20601234567</div>
            <div className="bg-[#80342c] px-3 py-2 text-sm font-extrabold text-white">
              {isInvoice ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA"}
            </div>
            <div className="py-2 font-mono text-sm font-bold">
              {isInvoice ? "F001-00000018" : "B001-00000042"}
            </div>
          </div>
        </header>

        <section className="grid gap-x-5 gap-y-1 border-b border-stone-300 py-4 sm:grid-cols-2">
          <Info label="Fecha de emisión" value="27/08/2026" />
          <Info label="Moneda" value="Soles (PEN)" />
          <Info
            label={isInvoice ? "Cliente / Razón social" : "Cliente"}
            value={isInvoice ? "ESTUDIO TERRACOTA S.A.C." : "María Torres"}
          />
          <Info label={isInvoice ? "RUC" : "DNI"} value={isInvoice ? "20598765431" : "74859621"} />
          {isInvoice && <Info label="Dirección" value="Jr. Las Palmeras 180, Miraflores, Lima" />}
          <Info label="Forma de pago" value="Contado" />
        </section>

        <div className="my-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="bg-stone-100 text-left uppercase">
                <th className="border-y border-stone-300 px-2 py-2">Cant.</th>
                <th className="border-y border-stone-300 px-2 py-2">Descripción</th>
                <th className="border-y border-stone-300 px-2 py-2 text-right">V. unitario</th>
                <th className="border-y border-stone-300 px-2 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-3 align-top">1</td>
                <td className="px-2 py-3">
                  <div className="font-semibold">Jarrón artesanal Arena</div>
                  <div className="text-stone-500">Cerámica decorativa · 32 cm</div>
                </td>
                <td className="px-2 py-3 text-right align-top">S/ 169.49</td>
                <td className="px-2 py-3 text-right align-top">S/ 169.49</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid gap-5 border-t border-stone-300 pt-4 sm:grid-cols-[1fr_230px]">
          <div>
            <div className="font-semibold">SON: DOSCIENTOS Y 00/100 SOLES</div>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-20 w-20 place-items-center border border-stone-300 bg-white">
                <QrCode className="h-14 w-14 text-stone-800" aria-label="Código QR referencial" />
              </div>
              <div className="max-w-[250px] text-[10px] text-stone-500">
                Representación impresa de un comprobante electrónico. QR únicamente referencial en
                esta demostración.
              </div>
            </div>
          </div>
          <dl className="space-y-1.5">
            <Amount label="Op. gravada" value="S/ 169.49" />
            <Amount label="IGV (18%)" value="S/ 30.51" />
            <Amount label="Importe total" value="S/ 200.00" strong />
          </dl>
        </div>
        <footer className="mt-6 border-t border-stone-200 pt-3 text-center text-[10px] text-stone-500">
          Documento ficticio para visualizar el diseño. No tiene validez tributaria.
        </footer>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-bold">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function Amount({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? "border-t border-[#80342c] pt-2 text-sm font-extrabold text-[#80342c]" : ""}`}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function Field(p: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{p.label}</Label>
      {p.children}
    </div>
  );
}
function Scenario({ value, setValue }: { value: string; setValue: (value: string) => void }) {
  return (
    <Field label="Escenario de prueba">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="accepted">Aceptado por SUNAT</SelectItem>
          <SelectItem value="observed">Aceptado con observaciones</SelectItem>
          <SelectItem value="rejected">Rechazado por SUNAT</SelectItem>
          <SelectItem value="timeout">No se pudo conectar</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}
function typeLabel(s: string) {
  return (
    ({ "01": "Factura", "03": "Boleta", "07": "Nota de crédito" } as Record<string, string>)[s] ?? s
  );
}
function statusLabel(s: string) {
  return (
    (
      {
        accepted: "Aceptado por SUNAT",
        accepted_with_observations: "Aceptado con observaciones",
        rejected: "Rechazado por SUNAT",
        processing: "En revisión por SUNAT",
        connection_error: "No se pudo conectar",
      } as Record<string, string>
    )[s] ?? s
  );
}
