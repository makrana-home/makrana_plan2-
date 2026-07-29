import { useEffect, useState, type ReactNode } from "react";
import { Download, Eye, MessageCircle, Printer, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLogo } from "@/components/brand-logo";
import { formatDate, moneyPEN } from "@/components/admin-ui";
import { formatUnits } from "@/lib/format-units";
import {
  getCleanSaleNotes,
  getSaleChannelDisplayName,
  getSaleCustomerDisplayName,
} from "@/lib/sale-notes";
import qrNotaVenta from "@/assets/nota-venta-qr.png";

export type ReceiptVariant = "internal" | "note" | "quote";

const receiptVariantLabels: Record<ReceiptVariant, string> = {
  internal: "Interno",
  note: "Nota de venta",
  quote: "Cotización",
};

const receiptVariantDocumentNames: Record<ReceiptVariant, string> = {
  internal: "interno",
  note: "nota de venta",
  quote: "cotización",
};

const receiptVariantArticles: Record<ReceiptVariant, string> = {
  internal: "el",
  note: "la",
  quote: "la",
};

const receiptVariantFileSlugs: Record<ReceiptVariant, string> = {
  internal: "comprobante-interno",
  note: "nota-de-venta",
  quote: "cotizacion",
};

const quotationTransferLines = [
  "Para iniciar la elaboración, se requiere el pago adelantado del 50%.",
  "DATOS PARA TRANSFERENCIA",
  "BCP - Cuenta en soles",
  "N.° de cuenta: 19323369618073",
  "CCI: 00219312336961807312",
  "BBVA - Cuenta en soles",
  "N.° de cuenta: 0011-0814-0236393327",
  "CCI: 01181400023639332712",
  "Titular: Ana María Atachagua Pérez",
];

type ReceiptPreviewDialogProps = {
  receipt: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVariant?: ReceiptVariant;
  noteOnly?: boolean;
  variantOnly?: boolean;
  showQuoteTab?: boolean;
};

export function ReceiptPreviewDialog({
  receipt,
  open,
  onOpenChange,
  initialVariant = "internal",
  noteOnly = false,
  variantOnly = false,
  showQuoteTab = false,
}: ReceiptPreviewDialogProps) {
  const [variant, setVariant] = useState<ReceiptVariant>(initialVariant);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  useEffect(() => {
    if (open) setVariant(noteOnly ? "note" : initialVariant);
  }, [initialVariant, noteOnly, open]);

  const isSingleVariant = noteOnly || variantOnly;
  const activeVariant = noteOnly ? "note" : variantOnly ? initialVariant : variant;
  const title = getReceiptVariantLabel(activeVariant);
  const customerPhone = receipt?.sale?.customer?.phone ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="receipt-dialog-content max-h-[94vh] max-w-5xl overflow-y-auto print:max-h-none print:max-w-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 font-display">
            <Eye className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {receipt && (
          <>
            <Tabs
              value={activeVariant}
              onValueChange={(value) => setVariant(value as ReceiptVariant)}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                {isSingleVariant ? (
                  <div className="rounded-full bg-cream px-4 py-2 text-sm font-medium">{title}</div>
                ) : (
                  <TabsList>
                    <TabsTrigger value="internal">Interno</TabsTrigger>
                    <TabsTrigger value="note">Nota de venta</TabsTrigger>
                    {showQuoteTab && <TabsTrigger value="quote">Cotización</TabsTrigger>}
                  </TabsList>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setWhatsappOpen(true)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" /> Imprimir
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => confirmAndDownloadReceiptPdf(receipt, activeVariant)}
                  >
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>

              {(!isSingleVariant || activeVariant === "internal") && (
                <TabsContent value="internal" className="m-0">
                  <InternalReceiptDocument receipt={receipt} />
                </TabsContent>
              )}
              {(!isSingleVariant || activeVariant === "note") && (
                <TabsContent value="note" className="m-0">
                  <SaleNoteDocument receipt={receipt} />
                </TabsContent>
              )}
              {(showQuoteTab || activeVariant === "quote") && (
                <TabsContent value="quote" className="m-0">
                  <SaleNoteDocument receipt={receipt} title="Cotización" variant="quote" />
                </TabsContent>
              )}
            </Tabs>
            <WhatsAppReceiptDialog
              receipt={receipt}
              variant={activeVariant}
              defaultPhone={customerPhone}
              open={whatsappOpen}
              onOpenChange={setWhatsappOpen}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function InternalReceiptDocument({ receipt }: { receipt: any }) {
  return <SaleNoteDocument receipt={receipt} title="Interno" variant="internal" />;
}

export function SaleNoteDocument({
  receipt,
  title = getReceiptVariantLabel("note"),
  variant = "note",
}: {
  receipt: any;
  title?: string;
  variant?: ReceiptVariant;
}) {
  const sale = receipt.sale ?? {};
  const isQuote = variant === "quote";
  return (
    <ReceiptPaper id="receipt-print" variant={variant}>
      <ReceiptHeader
        title={title}
        subtitle={isQuote ? "Pedidos personalizado" : undefined}
        number={receipt.number}
        date={receipt.issued_at}
      />

      <section className="grid grid-cols-2 gap-8 border-b border-sand pb-4 text-sm">
        <div>
          <SectionLabel>Cliente</SectionLabel>
          <div>{getSaleCustomerDisplayName(sale)}</div>
          <div>Canal de venta: {getSaleChannelDisplayName(sale) || "-"}</div>
        </div>
        <div className="text-right leading-relaxed">
          <SectionLabel>Contactanos</SectionLabel>
          <div>Pedidos: +51 986 608 552</div>
          <div>Redes: Makrana Home Art</div>
        </div>
      </section>

      {variant === "internal" && (
        <section
          className={`grid gap-8 border-b border-sand py-4 text-sm ${
            sale.status === "borrador" ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_180px]"
          }`}
        >
          <div>
            <SectionLabel>Nota</SectionLabel>
            <p className="whitespace-pre-wrap">
              {getCleanSaleNotes(sale.notes) || "Sin nota registrada"}
            </p>
          </div>
          {sale.status !== "borrador" && (
            <div className="text-right">
              <SectionLabel>Estado de entrega</SectionLabel>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getDeliveryStatusClass(
                  sale.delivery_status,
                )}`}
              >
                {formatDeliveryStatus(sale.delivery_status)}
              </span>
            </div>
          )}
        </section>
      )}

      <ItemsTable sale={sale} descriptionMode={isQuote ? "below" : "inline"} />
      {!isQuote && <PaymentsBlock sale={sale} />}

      {isQuote ? <QuotationTransferFooter /> : <SaleNoteFooter />}
    </ReceiptPaper>
  );
}

function SaleNoteFooter() {
  return (
    <section className="mt-auto grid grid-cols-[100px_1fr] items-end gap-8 border-t border-sand pt-5">
      <div className="text-center">
        <img src={qrNotaVenta} alt="QR Makrana Home Art" className="h-24 w-24 object-contain" />
        <p className="mt-1 text-xs font-semibold">Siguenos!!</p>
      </div>
      <p className="pb-6 text-center text-sm">Gracias por su preferencia</p>
    </section>
  );
}

function QuotationTransferFooter() {
  return (
    <section className="mt-auto grid grid-cols-[minmax(260px,310px)_1fr] gap-8 border-t border-sand pt-5">
      <div className="text-[10px] leading-relaxed">
        <p className="mb-3 font-semibold">{quotationTransferLines[0]}</p>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {quotationTransferLines[1]}
        </p>
        <div className="space-y-2">
          <div>
            <p className="font-semibold">{quotationTransferLines[2]}</p>
            <p>{quotationTransferLines[3]}</p>
            <p>{quotationTransferLines[4]}</p>
          </div>
          <div>
            <p className="font-semibold">{quotationTransferLines[5]}</p>
            <p>{quotationTransferLines[6]}</p>
            <p>{quotationTransferLines[7]}</p>
          </div>
          <p className="font-semibold">{quotationTransferLines[8]}</p>
        </div>
      </div>
      <div />
    </section>
  );
}

function ReceiptPaper({
  id,
  variant,
  children,
}: {
  id: string;
  variant: ReceiptVariant;
  children: ReactNode;
}) {
  return (
    <article
      id={id}
      data-receipt-variant={variant}
      className="receipt-print-root mx-auto flex min-h-[297mm] w-[210mm] max-w-full flex-col bg-warm-white p-[16mm] text-foreground shadow-xl print:mx-auto print:h-[297mm] print:w-[210mm] print:max-w-none print:p-[14mm] print:shadow-none"
    >
      {children}
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          :root {
            background: #ffffff !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
          body > * {
            display: none !important;
          }
          body {
            display: block !important;
          }
          [data-radix-portal],
          [data-radix-portal] > *,
          .receipt-dialog-content,
          .receipt-dialog-content > *,
          .receipt-print-root,
          .receipt-print-root * {
            display: revert !important;
            visibility: visible !important;
          }
          [data-radix-portal] {
            position: static !important;
          }
          [data-radix-portal] > *:not(.receipt-dialog-content) {
            display: none !important;
          }
          .receipt-dialog-content {
            position: fixed !important;
            inset: 0 !important;
            translate: none !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            transform: none !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          .receipt-dialog-content [role="tablist"],
          .receipt-dialog-content [data-state="inactive"],
          .receipt-dialog-content button,
          .receipt-dialog-content header[aria-hidden="true"] {
            display: none !important;
          }
          .receipt-print-root {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 14mm !important;
            box-shadow: none !important;
            transform: none !important;
            background: #fffaf2 !important;
            color: #201712 !important;
            z-index: 999999 !important;
          }
        }
      `}</style>
    </article>
  );
}

function ReceiptHeader({
  title,
  subtitle,
  number,
  date,
}: {
  title: string;
  subtitle?: string;
  number: string;
  date?: string;
}) {
  return (
    <header className="mb-6 flex items-start justify-between border-b border-sand pb-5">
      <div>
        <BrandLogo imageClassName="w-40" />
      </div>
      <div className="text-right">
        <div className="text-sm text-muted-foreground">{title}</div>
        {subtitle && <div className="text-xs font-medium text-muted-foreground">{subtitle}</div>}
        <div className="mt-1 font-mono text-lg font-bold">N° {formatReceiptNumber(number)}</div>
        <div className="text-xs text-muted-foreground">{formatDate(date)}</div>
      </div>
    </header>
  );
}

function ItemsTable({
  sale,
  descriptionMode = "inline",
}: {
  sale: any;
  descriptionMode?: "inline" | "below";
}) {
  return (
    <table className="mt-5 w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-sand">
          <th className="py-2 text-left">Detalle</th>
          <th className="w-16 py-2 text-center">Cant.</th>
          <th className="w-28 py-2 text-right">P. Unit</th>
          <th className="w-28 py-2 text-right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {(sale.items ?? []).map((item: any) => {
          const itemName = getReceiptItemName(item);
          const itemDescription = getReceiptItemDescription(item, itemName);
          return (
            <tr key={item.id} className="border-b border-sand/50">
              <td className="py-2 pr-3">
                {itemName}
                {itemDescription && descriptionMode === "inline" ? ` - ${itemDescription}` : ""}
                {itemDescription && descriptionMode === "below" && (
                  <div className="mt-1 max-w-[28rem] text-xs leading-snug text-muted-foreground">
                    {itemDescription}
                  </div>
                )}
              </td>
              <td className="py-2 text-center tabular-nums">{formatUnits(item.quantity)}</td>
              <td className="py-2 text-right tabular-nums">{moneyPEN(item.unit_price)}</td>
              <td className="py-2 text-right tabular-nums">{moneyPEN(item.subtotal)}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="pt-3 text-right">
            Subtotal
          </td>
          <td className="pt-3 text-right tabular-nums">{moneyPEN(sale.subtotal)}</td>
        </tr>
        <tr>
          <td colSpan={3} className="text-right">
            Descuento
          </td>
          <td className="text-right tabular-nums">- {moneyPEN(sale.discount)}</td>
        </tr>
        <tr className="border-t border-sand text-lg">
          <td colSpan={3} className="py-2 text-right font-semibold">
            TOTAL
          </td>
          <td className="py-2 text-right font-semibold tabular-nums">{moneyPEN(sale.total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function PaymentsBlock({ sale }: { sale: any }) {
  const payments = sale.payments ?? [];
  if (payments.length === 0) return null;

  return (
    <section className="mt-5">
      <SectionLabel>Pagos</SectionLabel>
      <div className="space-y-1 text-sm">
        {payments.map((payment: any) => (
          <div key={payment.id}>
            {String(payment.method).toUpperCase()} · {moneyPEN(payment.amount)}
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </div>
  );
}

function formatReceiptNumber(number?: string | null) {
  return String(number ?? "").replace(/^MKR\s*-?\s*/i, "");
}

function compactText(parts: Array<string | null | undefined>, separator: string) {
  return parts.filter(Boolean).join(separator);
}

function formatDeliveryStatus(status?: string | null) {
  const value = status === "cancelado" ? "entregado" : String(status ?? "").trim();
  if (!value) return "Sin estado";
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function getDeliveryStatusClass(status?: string | null) {
  const value = status === "cancelado" ? "entregado" : status;
  if (value === "entregado") return "border-emerald-200 bg-emerald-100 text-emerald-800";
  if (value === "enviado") return "border-blue-200 bg-blue-50 text-blue-800";
  if (value === "en_preparacion") return "border-violet-200 bg-violet-50 text-violet-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function getReceiptVariantLabel(variant: ReceiptVariant) {
  return receiptVariantLabels[variant];
}

function getReceiptVariantDocumentName(variant: ReceiptVariant) {
  return receiptVariantDocumentNames[variant];
}

function getReceiptVariantArticle(variant: ReceiptVariant) {
  return receiptVariantArticles[variant];
}

function getReceiptVariantFileSlug(variant: ReceiptVariant) {
  return receiptVariantFileSlugs[variant];
}

function isManualReceiptItem(item: any) {
  return Boolean(item.is_manual_item || (!item.product_id && !item.product));
}

function getReceiptItemName(item: any) {
  const name =
    item.product?.name ??
    item.manual_item_name ??
    (isManualReceiptItem(item) ? String(item.description ?? "").trim() : "");
  return name || "Articulo manual";
}

function getReceiptItemDescription(item: any, itemName = getReceiptItemName(item)) {
  const description = String(item.description ?? "").trim();
  if (!description || description.toLowerCase().startsWith("presentaci")) return "";
  if (description === itemName) return "";
  return description;
}

function WhatsAppReceiptDialog({
  receipt,
  variant,
  defaultPhone,
  open,
  onOpenChange,
}: {
  receipt: any;
  variant: ReceiptVariant;
  defaultPhone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone ?? "");
      setError("");
    }
  }, [defaultPhone, open]);

  async function sendWhatsApp() {
    const normalizedPhone = normalizeWhatsAppPhone(phone);
    if (!normalizedPhone) {
      setError("Ingresa un número de WhatsApp.");
      return;
    }

    setSending(true);
    try {
      const pdfUrl = await getReceiptPdfUrl(receipt, variant);
      if (!pdfUrl) {
        const attachmentMessage = buildWhatsAppMessage(receipt, variant, {
          attachment: true,
        });
        const shared = await shareReceiptPdfFile(receipt, variant, attachmentMessage);
        if (shared) {
          onOpenChange(false);
          return;
        }
      }

      const message = buildWhatsAppMessage(receipt, variant, { pdfUrl });
      const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!pdfUrl) await downloadReceiptPdf(receipt, variant);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto print:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <MessageCircle className="h-4 w-4" />
            Enviar por WhatsApp
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="receipt-whatsapp-phone">Número de WhatsApp</Label>
            <Input
              id="receipt-whatsapp-phone"
              type="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setError("");
              }}
              placeholder="+51 986 608 552"
              inputMode="tel"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
          <div className="grid gap-2 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="button" className="h-11" onClick={sendWhatsApp} disabled={sending}>
              <Send className="h-4 w-4" /> {sending ? "Preparando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;
  return digits;
}

function buildWhatsAppMessage(
  receipt: any,
  variant: ReceiptVariant,
  delivery: { pdfUrl?: string | null; attachment?: boolean } = {},
) {
  const sale = receipt.sale ?? {};
  const customerName = getSaleCustomerDisplayName(sale, "cliente");
  const documentName = getReceiptVariantDocumentName(variant);
  const lines = [
    `Hola ${customerName}, gracias por tu compra en Makrana Home Art.`,
    `Te compartimos tu ${documentName} ${formatReceiptNumber(receipt.number)}.`,
    `Total: ${moneyPEN(sale.total)}`,
  ];

  if (delivery.pdfUrl) {
    lines.push(`Ver PDF: ${delivery.pdfUrl}`);
  } else if (delivery.attachment) {
    lines.push("Adjunto el PDF para que puedas revisarlo.");
  } else {
    lines.push("El PDF se descargara en el dispositivo para enviarlo manualmente si lo necesitas.");
  }

  return lines.join("\n");
}

function getReceiptPdfUrl(receipt: any, _variant: ReceiptVariant) {
  return isShareableReceiptUrl(receipt.pdf_url) ? receipt.pdf_url : null;
}

function isShareableReceiptUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

async function shareReceiptPdfFile(receipt: any, variant: ReceiptVariant, message: string) {
  if (typeof navigator === "undefined" || !navigator.share) return false;

  const file = await createReceiptPdfFile(receipt, variant);
  if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;

  try {
    await navigator.share({
      title: getReceiptVariantLabel(variant),
      text: message,
      files: [file],
    });
    return true;
  } catch (error) {
    if ((error as DOMException)?.name !== "AbortError") {
      console.warn("No se pudo compartir el PDF como adjunto.", error);
    }
    return false;
  }
}

async function createReceiptPdfFile(receipt: any, variant: ReceiptVariant) {
  return new File(
    [await createReceiptPdfBlob(receipt, variant)],
    getReceiptPdfFilename(receipt, variant),
    {
      type: "application/pdf",
    },
  );
}

function getReceiptPdfFilename(receipt: any, variant: ReceiptVariant) {
  return `${getReceiptVariantFileSlug(variant)}-${formatReceiptNumber(receipt.number)}.pdf`;
}

async function downloadReceiptPdf(receipt: any, variant: ReceiptVariant) {
  const blob = await createReceiptPdfBlob(receipt, variant);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getReceiptPdfFilename(receipt, variant);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function confirmAndDownloadReceiptPdf(receipt: any, variant: ReceiptVariant) {
  if (
    !window.confirm(
      `¿Deseas descargar ${getReceiptVariantArticle(variant)} ${getReceiptVariantDocumentName(
        variant,
      )} PDF?`,
    )
  )
    return;
  await downloadReceiptPdf(receipt, variant);
}

async function createReceiptPdfBlob(receipt: any, variant: ReceiptVariant) {
  const documentElement = document.querySelector<HTMLElement>(
    `[data-receipt-variant="${variant}"][data-state="active"], [data-receipt-variant="${variant}"]`,
  );

  if (!documentElement) return createSimpleReceiptPdfBlob(receipt, variant);

  try {
    const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
    const pageWidthPx = 794;
    const pageHeightPx = 1123;
    const image = await toPng(documentElement, {
      cacheBust: true,
      pixelRatio: 2,
      width: pageWidthPx,
      height: pageHeightPx,
      backgroundColor: "#fffaf2",
      style: {
        width: `${pageWidthPx}px`,
        minWidth: `${pageWidthPx}px`,
        maxWidth: "none",
        height: `${pageHeightPx}px`,
        minHeight: `${pageHeightPx}px`,
        margin: "0",
        boxShadow: "none",
      },
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(image, "PNG", 0, 0, 210, 297, undefined, "FAST");
    return pdf.output("blob");
  } catch (error) {
    console.warn("No se pudo capturar la vista de la nota; se usará el PDF básico.", error);
    return createSimpleReceiptPdfBlob(receipt, variant);
  }
}

function createSimpleReceiptPdfBlob(receipt: any, variant: ReceiptVariant) {
  const sale = receipt.sale ?? {};
  const type = getReceiptVariantLabel(variant);
  const isQuote = variant === "quote";
  const headerNumberY = isQuote ? 738 : 750;
  const headerDateY = isQuote ? 722 : 734;
  const lines: PdfElement[] = [
    { kind: "text", text: "Makrana", x: 56, y: 770, size: 24, color: "8f342d" },
    { kind: "text", text: "Home Art", x: 88, y: 754, size: 11, bold: true, color: "8f342d" },
    { kind: "text", text: type, x: 410, y: 770, size: 11, color: "6b5b50" },
    ...(isQuote
      ? [
          {
            kind: "text" as const,
            text: "Pedidos personalizado",
            x: 410,
            y: 756,
            size: 9,
            color: "6b5b50",
          },
        ]
      : []),
    {
      kind: "text",
      text: `Nro: ${formatReceiptNumber(receipt.number)}`,
      x: 410,
      y: headerNumberY,
      size: 13,
      bold: true,
    },
    {
      kind: "text",
      text: formatDate(receipt.issued_at),
      x: 410,
      y: headerDateY,
      size: 9,
      color: "6b5b50",
    },
    { kind: "line", x1: 56, y1: 710, x2: 540, y2: 710 },
    { kind: "text", text: "CLIENTE", x: 56, y: 684, size: 8, color: "6b5b50" },
    {
      kind: "text",
      text: getSaleCustomerDisplayName(sale),
      x: 56,
      y: 668,
      size: 11,
    },
    {
      kind: "text",
      text:
        variant === "internal"
          ? compactText([sale.customer?.email, sale.customer?.phone], " - ")
          : `Canal de venta: ${getSaleChannelDisplayName(sale) || "-"}`,
      x: 56,
      y: 652,
      size: 9,
      color: "6b5b50",
    },
    {
      kind: "text",
      text: variant === "internal" ? "ALMACEN / CANAL" : "CONTACTANOS",
      x: 360,
      y: 684,
      size: 8,
      color: "6b5b50",
    },
    {
      kind: "text",
      text:
        variant === "internal"
          ? (sale.warehouse?.name ?? "Sin almacen")
          : "Pedidos: +51 986 608 552",
      x: 360,
      y: 668,
      size: 10,
    },
    {
      kind: "text",
      text:
        variant === "internal"
          ? compactText([getSaleChannelDisplayName(sale), getCleanSaleNotes(sale.notes)], " | ")
          : "Redes: Makrana Home Art",
      x: 360,
      y: 652,
      size: 10,
    },
    { kind: "line", x1: 56, y1: 632, x2: 540, y2: 632 },
    { kind: "text", text: "Detalle", x: 56, y: 604, size: 10, bold: true },
    { kind: "text", text: "Cant.", x: 340, y: 604, size: 10, bold: true },
    { kind: "text", text: "P. Unit", x: 410, y: 604, size: 10, bold: true },
    { kind: "text", text: "Subtotal", x: 490, y: 604, size: 10, bold: true },
    { kind: "line", x1: 56, y1: 590, x2: 540, y2: 590 },
  ];

  let y = 568;
  for (const item of sale.items ?? []) {
    const itemName = getReceiptItemName(item);
    const itemDescription = getReceiptItemDescription(item, itemName);
    lines.push({
      kind: "text",
      text:
        isQuote || !itemDescription
          ? itemName
          : `${itemName}${itemDescription ? ` - ${itemDescription}` : ""}`,
      x: 56,
      y,
      size: 9,
    });
    if (isQuote && itemDescription) {
      lines.push({
        kind: "text",
        text: shortenPdfText(itemDescription, 86),
        x: 56,
        y: y - 12,
        size: 8,
        color: "6b5b50",
      });
    }
    lines.push({ kind: "text", text: formatUnits(item.quantity), x: 350, y, size: 9 });
    lines.push({ kind: "text", text: moneyPEN(item.unit_price), x: 410, y, size: 9 });
    lines.push({ kind: "text", text: moneyPEN(item.subtotal), x: 490, y, size: 9 });
    y -= isQuote && itemDescription ? 34 : 24;
  }

  lines.push({ kind: "line", x1: 56, y1: y + 10, x2: 540, y2: y + 10 });
  y -= 6;
  lines.push({ kind: "text", text: "Subtotal", x: 410, y, size: 10 });
  lines.push({ kind: "text", text: moneyPEN(sale.subtotal), x: 490, y, size: 10 });
  y -= 16;
  lines.push({ kind: "text", text: "Descuento", x: 410, y, size: 10 });
  lines.push({ kind: "text", text: `- ${moneyPEN(sale.discount)}`, x: 490, y, size: 10 });
  lines.push({ kind: "line", x1: 56, y1: y - 10, x2: 540, y2: y - 10 });
  y -= 32;
  lines.push({ kind: "text", text: "TOTAL", x: 410, y, size: 14, bold: true });
  lines.push({ kind: "text", text: moneyPEN(sale.total), x: 490, y, size: 14, bold: true });

  const payments = sale.payments ?? [];
  if (!isQuote && payments.length > 0) {
    y -= 54;
    lines.push({ kind: "text", text: "PAGOS", x: 56, y, size: 8, color: "6b5b50" });
    y -= 16;
    for (const payment of payments) {
      lines.push({
        kind: "text",
        text: `${String(payment.method).toUpperCase()} - ${moneyPEN(payment.amount)}`,
        x: 56,
        y,
        size: 10,
      });
      y -= 14;
    }
  }

  if (isQuote) {
    addQuotationTransferPdf(lines);
  } else {
    lines.push({
      kind: "text",
      text:
        variant === "internal"
          ? "Documento para control de venta, almacen e inventario."
          : "Gracias por su preferencia",
      x: variant === "internal" ? 56 : 230,
      y: 80,
      size: variant === "internal" ? 8 : 10,
      color: variant === "internal" ? "6b5b50" : "201712",
    });
  }

  return buildSimplePdf(lines);
}

function addQuotationTransferPdf(lines: PdfElement[]) {
  const x = 56;
  let y = 194;
  lines.push({ kind: "line", x1: 56, y1: 212, x2: 296, y2: 212 });
  lines.push({
    kind: "text",
    text: "Para iniciar la elaboracion, se requiere",
    x,
    y,
    size: 8,
    bold: true,
  });
  y -= 11;
  lines.push({
    kind: "text",
    text: "el pago adelantado del 50%.",
    x,
    y,
    size: 8,
    bold: true,
  });
  y -= 18;
  lines.push({
    kind: "text",
    text: "DATOS PARA TRANSFERENCIA",
    x,
    y,
    size: 8,
    bold: true,
    color: "6b5b50",
  });

  const detailLines = [
    { text: "BCP - Cuenta en soles", bold: true },
    { text: "Nro. de cuenta: 19323369618073" },
    { text: "CCI: 00219312336961807312" },
    { text: "BBVA - Cuenta en soles", bold: true, gapBefore: true },
    { text: "Nro. de cuenta: 0011-0814-0236393327" },
    { text: "CCI: 01181400023639332712" },
    { text: "Titular: Ana Maria Atachagua Perez", bold: true, gapBefore: true },
  ];

  y -= 16;
  for (const line of detailLines) {
    if (line.gapBefore) y -= 8;
    lines.push({
      kind: "text",
      text: line.text,
      x,
      y,
      size: 8,
      bold: line.bold,
    });
    y -= 11;
  }
}

function shortenPdfText(value: string, maxLength: number) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

type PdfText = {
  kind: "text";
  text: string;
  x: number;
  y: number;
  size: number;
  bold?: boolean;
  color?: string;
};

type PdfRule = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
};

type PdfElement = PdfText | PdfRule;

function buildSimplePdf(elements: PdfElement[]) {
  const content = elements
    .map((element) => {
      const color = hexToRgb(element.color ?? (element.kind === "line" ? "ead8c6" : "201712"));
      if (element.kind === "line") {
        return [
          "q",
          `${element.width ?? 0.75} w`,
          `${color.join(" ")} RG`,
          `${element.x1} ${element.y1} m`,
          `${element.x2} ${element.y2} l`,
          "S",
          "Q",
        ].join("\n");
      }
      return [
        "BT",
        `/${element.bold ? "F2" : "F1"} ${element.size} Tf`,
        `${color.join(" ")} rg`,
        `${element.x} ${element.y} Td`,
        `(${escapePdfText(element.text)}) Tj`,
        "ET",
      ].join("\n");
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function escapePdfText(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  return [0, 2, 4].map((start) => {
    const value = Number.parseInt(clean.slice(start, start + 2), 16) / 255;
    return Number.isFinite(value) ? value.toFixed(3) : "0";
  });
}
