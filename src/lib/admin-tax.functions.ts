import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildDailySummaryXml,
  calculateIncludedIgv,
  calculateCreditNote,
  buildInvoiceUbl,
  creditNoteReasons,
  createSunatClient,
  generateTaxPdf,
  MockSireClient,
  MockXmlSigner,
  reconcileRecords,
  validateUbl,
  zipDailySummary,
} from "@/server/services/tax";
import logoDataUrl from "@/assets/makrana-logo.png?inline";

async function assertTaxStaff(context: any) {
  const [admin, sales] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "ventas" }),
  ]);
  if (!(admin.data || sales.data)) throw new Error("forbidden");
}
async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Solo un administrador puede modificar la configuración tributaria");
}
async function isAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return Boolean(data);
}
const db = (context: any) => context.supabase as any;
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);
const encode = (value: string) => new TextEncoder().encode(value);
const limaNow = () => {
  const now = new Date();
  return {
    issueDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
    issueTime: new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Lima",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now),
  };
};
async function uploadPrivate(
  supabase: any,
  bucket: string,
  path: string,
  body: Uint8Array,
  contentType: string,
) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType, upsert: false });
  if (error && !String(error.message).toLowerCase().includes("already exists")) throw error;
  return path;
}

export const adminListTaxDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTaxStaff(context);
    const { data, error } = await db(context)
      .from("tax_documents")
      .select("*, sale:sales(id,quote_number), customer:customers(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminGetTaxDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTaxStaff(context);
    const supabase = db(context);
    const [documents, settings, summary, rvie, rce] = await Promise.all([
      supabase.from("tax_documents").select("document_type,status"),
      supabase
        .from("tax_settings")
        .select("environment,certificate_configured")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sunat_daily_summaries")
        .select("summary_identifier,status,created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sire_periods")
        .select("period,review_status,last_synced_at")
        .eq("registry_type", "RVIE")
        .order("period", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sire_periods")
        .select("period,review_status,last_synced_at")
        .eq("registry_type", "RCE")
        .order("period", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    for (const result of [documents, settings, summary, rvie, rce])
      if (result.error) throw result.error;
    const rows = documents.data ?? [];
    return {
      boletas: rows.filter((x: any) => x.document_type === "03").length,
      facturas: rows.filter((x: any) => x.document_type === "01").length,
      creditNotes: rows.filter((x: any) => x.document_type === "07").length,
      pending: rows.filter((x: any) =>
        [
          "draft",
          "queued",
          "generated",
          "signed",
          "sent",
          "processing",
          "connection_error",
        ].includes(x.status),
      ).length,
      observed: rows.filter((x: any) => x.status === "accepted_with_observations").length,
      rejected: rows.filter((x: any) => x.status === "rejected").length,
      settings: settings.data,
      latestSummary: summary.data,
      rvie: rvie.data,
      rce: rce.data,
    };
  });

export const adminGetTaxDocument = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertTaxStaff(context);
    const { data: doc, error } = await db(context)
      .from("tax_documents")
      .select("*, items:tax_document_items(*)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return doc;
  });

export const adminListEligibleSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTaxStaff(context);
    const { data, error } = await db(context)
      .from("sales")
      .select(
        "id,quote_number,total,status,payment_status,created_at,customer:customers(id,full_name,document)",
      )
      .eq("status", "confirmada")
      .eq("payment_status", "pagado")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminIssueTaxDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        saleId: z.string().uuid(),
        documentType: z.enum(["01", "03"]),
        seriesId: z.string().uuid(),
        scenario: z.enum(["accepted", "observed", "rejected", "timeout"]).default("accepted"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTaxStaff(context);
    if (process.env.TAX_MODULE_ENABLED === "false")
      throw new Error("Módulo tributario desactivado");
    const supabase = db(context);
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select(
        "*, customer:customers(*), items:sale_items(*,product:products(name,sku)), payments:sale_payments(*)",
      )
      .eq("id", data.saleId)
      .single();
    if (saleError) throw saleError;
    if (sale.status !== "confirmada" || sale.payment_status !== "pagado")
      throw new Error("La venta debe estar confirmada y pagada");
    const customer = sale.customer;
    const document = String(customer?.document ?? "").replace(/\D/g, "");
    if (data.documentType === "01" && document.length !== 11)
      throw new Error("La factura exige un cliente con RUC de 11 dígitos");
    const customerDocumentType =
      data.documentType === "01" ? "6" : document.length === 8 ? "1" : "0";
    const customerName =
      customer?.full_name?.trim() || (data.documentType === "03" ? "CLIENTE VARIOS" : "");
    if (!customerName) throw new Error("Falta la razón social del cliente");
    const { data: series, error: seriesError } = await supabase
      .from("tax_document_series")
      .select("*, settings:tax_settings(*)")
      .eq("id", data.seriesId)
      .single();
    if (seriesError) throw seriesError;
    if (series.document_type !== data.documentType || !series.active)
      throw new Error("Serie inválida para el comprobante");
    if (series.environment !== "mock") throw new Error("Solo está habilitado el ambiente mock");
    const prefix = `${series.settings.ruc}:${data.documentType}:${series.series}:`;
    const { data: existing } = await supabase
      .from("tax_documents")
      .select("*")
      .eq("sale_id", sale.id)
      .eq("document_type", data.documentType)
      .not("status", "in", "(rejected,voided)")
      .maybeSingle();
    if (existing) return existing;
    const totals = calculateIncludedIgv(
      (sale.items ?? []).map((item: any) => ({
        description: item.description || item.manual_item_name || item.product?.name || "Producto",
        quantity: Number(item.quantity),
        unitPriceCents: cents(item.unit_price),
        discountCents: cents(item.discount),
        internalCode: item.product?.sku,
        productId: item.product_id,
      })),
    );
    if (totals.totalCents !== cents(sale.total))
      throw new Error(
        `El total comercial (${sale.total}) no coincide con el snapshot tributario (${(totals.totalCents / 100).toFixed(2)}). No se emitió.`,
      );
    const { data: reserved, error: reserveError } = await supabase.rpc(
      "reserve_tax_document_number",
      { _series_id: data.seriesId },
    );
    if (reserveError) throw reserveError;
    const number = reserved?.[0]?.number;
    if (!number) throw new Error("No se pudo reservar correlativo");
    const { issueDate, issueTime } = limaNow();
    const idempotencyKey = `${prefix}${number}:send`;
    const { data: doc, error: docError } = await supabase
      .from("tax_documents")
      .insert({
        sale_id: sale.id,
        customer_id: customer?.id ?? null,
        tax_settings_id: series.tax_settings_id,
        document_type: data.documentType,
        series: series.series,
        number,
        issue_date: issueDate,
        issue_time: issueTime,
        customer_document_type: customerDocumentType,
        customer_document_number: document || null,
        customer_name: customerName,
        subtotal: totals.taxableCents / 100,
        taxable_amount: totals.taxableCents / 100,
        discount_amount: totals.discountCents / 100,
        igv_amount: totals.igvCents / 100,
        total_amount: totals.totalCents / 100,
        payment_method: sale.payments?.[0]?.method ?? null,
        status: "generated",
        environment: "mock",
        idempotency_key: idempotencyKey,
        issued_by: context.userId,
      })
      .select("*")
      .single();
    if (docError) throw docError;
    const { error: itemsError } = await supabase.from("tax_document_items").insert(
      totals.lines.map((line, index) => ({
        tax_document_id: doc.id,
        line_number: index + 1,
        product_id: line.productId || null,
        description: line.description,
        quantity: line.quantity,
        unit_value: line.unitValueCents / 100,
        unit_price: line.unitPriceCents / 100,
        discount_amount: (line.discountCents ?? 0) / 100,
        sale_value: line.saleValueCents / 100,
        igv_amount: line.igvCents / 100,
        total_amount: line.totalCents / 100,
        internal_code: line.internalCode || null,
      })),
    );
    if (itemsError) throw itemsError;
    const xml = buildInvoiceUbl({
      ruc: series.settings.ruc,
      legalName: series.settings.legal_name,
      type: data.documentType,
      series: series.series,
      number,
      issueDate,
      customerDocumentType,
      customerDocumentNumber: document || "-",
      customerName,
      totals,
    });
    const validation = validateUbl(xml);
    if (!validation.valid) throw new Error(validation.errors.join(", "));
    const signed = await new MockXmlSigner().sign(xml);
    const fileName = `${series.settings.ruc}-${data.documentType}-${series.series}-${number}.xml`;
    const client =
      data.scenario === "accepted"
        ? createSunatClient("mock")
        : new (await import("@/server/services/tax")).MockSunatClient(data.scenario);
    const started = Date.now();
    const result = await client.send(fileName, signed.signedXml, idempotencyKey);
    await supabase.from("sunat_transmission_attempts").insert({
      tax_document_id: doc.id,
      operation: "send",
      environment: "mock",
      attempt_number: 1,
      sunat_code: result.code,
      message: result.message,
      status: result.status,
      duration_ms: Date.now() - started,
      idempotency_key: idempotencyKey,
      sanitized_response: { status: result.status, code: result.code },
    });
    const qrPayload = `${series.settings.ruc}|${data.documentType}|${series.series}|${number}|${(totals.igvCents / 100).toFixed(2)}|${(totals.totalCents / 100).toFixed(2)}|${issueDate}|${customerDocumentType}|${document}|${signed.hash}`;
    const pdf = await generateTaxPdf({
      environment: "mock",
      documentType: data.documentType,
      series: series.series,
      number,
      issueDate,
      issueTime,
      legalName: series.settings.legal_name,
      tradeName: series.settings.trade_name,
      ruc: series.settings.ruc,
      fiscalAddress: series.settings.fiscal_address,
      customerName,
      customerDocument: document || null,
      taxableAmount: totals.taxableCents / 100,
      discountAmount: totals.discountCents / 100,
      igvAmount: totals.igvCents / 100,
      totalAmount: totals.totalCents / 100,
      paymentMethod: sale.payments?.[0]?.method,
      hash: signed.hash,
      qrPayload,
      logoDataUrl,
      items: totals.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitCode: "NIU",
        unitPrice: line.unitPriceCents / 100,
        discount: (line.discountCents ?? 0) / 100,
        total: line.totalCents / 100,
      })),
    });
    const folder = `${series.settings.ruc}/${issueDate.slice(0, 4)}/${issueDate.slice(5, 7)}/${data.documentType}-${series.series}-${number}`;
    const xmlPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/${fileName}`,
      encode(xml),
      "application/xml",
    );
    const signedPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/signed-${fileName}`,
      encode(signed.signedXml),
      "application/xml",
    );
    const pdfPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/${fileName.replace(/\.xml$/, ".pdf")}`,
      pdf,
      "application/pdf",
    );
    const cdrPath = result.cdr
      ? await uploadPrivate(
          supabase,
          "tax-documents",
          `${folder}/R-${fileName}.txt`,
          encode(result.cdr),
          "text/plain",
        )
      : null;
    const final = {
      status: result.status,
      sunat_status: result.status,
      sunat_code: result.code,
      sunat_message: result.message,
      document_hash: signed.hash,
      qr_payload: qrPayload,
      xml_path: xmlPath,
      signed_xml_path: signedPath,
      cdr_path: cdrPath,
      pdf_path: pdfPath,
      accepted_at: result.status.startsWith("accepted") ? new Date().toISOString() : null,
    };
    const { data: updated, error: updateError } = await supabase
      .from("tax_documents")
      .update(final)
      .eq("id", doc.id)
      .select("*")
      .single();
    if (updateError) throw updateError;
    await supabase.from("tax_audit_log").insert({
      actor_id: context.userId,
      action: "issue",
      entity_type: "tax_document",
      entity_id: doc.id,
      previous_state: { status: "draft" },
      next_state: { status: result.status },
      correlation_id: crypto.randomUUID(),
    });
    return { ...updated, mockXml: signed.signedXml };
  });

export const adminGetTaxFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({ documentId: z.string().uuid(), kind: z.enum(["pdf", "xml", "cdr"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTaxStaff(context);
    const column = { pdf: "pdf_path", xml: "signed_xml_path", cdr: "cdr_path" }[data.kind];
    let query = db(context)
      .from("tax_documents")
      .select(`id,issued_by,${column}`)
      .eq("id", data.documentId);
    if (!(await isAdmin(context))) query = query.eq("issued_by", context.userId);
    const { data: doc, error } = await query.single();
    if (error) throw error;
    const path = doc[column];
    if (!path) throw new Error("El archivo aún no está disponible");
    const { data: signed, error: signError } = await db(context)
      .storage.from("tax-documents")
      .createSignedUrl(path, 60);
    if (signError) throw signError;
    return signed.signedUrl;
  });

export const adminCreateCreditNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        originalDocumentId: z.string().uuid(),
        seriesId: z.string().uuid(),
        reason: z.enum(["01", "02", "03", "04", "06", "07"]),
        items: z
          .array(z.object({ itemId: z.string().uuid(), quantity: z.coerce.number().positive() }))
          .default([]),
        scenario: z.enum(["accepted", "observed", "rejected", "timeout"]).default("accepted"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTaxStaff(context);
    const supabase = db(context);
    const { data: original, error } = await supabase
      .from("tax_documents")
      .select("*, settings:tax_settings(*), items:tax_document_items(*)")
      .eq("id", data.originalDocumentId)
      .single();
    if (error) throw error;
    if (
      !["accepted", "accepted_with_observations"].includes(original.status) ||
      !["01", "03"].includes(original.document_type)
    )
      throw new Error("Solo se puede aplicar una nota de crédito a una boleta o factura válida");
    const { data: prior } = await supabase
      .from("tax_documents")
      .select("total_amount")
      .eq("related_document_id", original.id)
      .eq("document_type", "07")
      .in("status", ["accepted", "accepted_with_observations", "generated", "sent", "processing"]);
    const already = (prior ?? []).reduce((s: number, x: any) => s + cents(x.total_amount), 0);
    const totals = calculateCreditNote(
      original.items.map((x: any) => ({
        id: x.id,
        description: x.description,
        quantity: Number(x.quantity),
        unitPriceCents: cents(x.unit_price),
        discountCents: cents(x.discount_amount),
        productId: x.product_id,
        internalCode: x.internal_code,
      })),
      data.items,
      data.reason,
      already,
      cents(original.total_amount),
    );
    const { data: series, error: seriesError } = await supabase
      .from("tax_document_series")
      .select("*")
      .eq("id", data.seriesId)
      .eq("document_type", "07")
      .eq("environment", "mock")
      .single();
    if (seriesError) throw seriesError;
    const existingKey = `${original.settings.ruc}:07:${series.series}:${original.id}:${data.reason}:${JSON.stringify(data.items)}`;
    const { data: duplicate } = await supabase
      .from("tax_documents")
      .select("*")
      .eq("idempotency_key", existingKey)
      .maybeSingle();
    if (duplicate) return duplicate;
    const { data: reserved, error: reserveError } = await supabase.rpc(
      "reserve_tax_document_number",
      { _series_id: data.seriesId },
    );
    if (reserveError) throw reserveError;
    const number = reserved?.[0]?.number;
    const { issueDate, issueTime } = limaNow();
    const { data: note, error: noteError } = await supabase
      .from("tax_documents")
      .insert({
        sale_id: original.sale_id,
        customer_id: original.customer_id,
        tax_settings_id: original.tax_settings_id,
        document_type: "07",
        series: series.series,
        number,
        issue_date: issueDate,
        issue_time: issueTime,
        customer_document_type: original.customer_document_type,
        customer_document_number: original.customer_document_number,
        customer_name: original.customer_name,
        subtotal: totals.taxableCents / 100,
        taxable_amount: totals.taxableCents / 100,
        discount_amount: totals.discountCents / 100,
        igv_amount: totals.igvCents / 100,
        total_amount: totals.totalCents / 100,
        payment_method: original.payment_method,
        status: "generated",
        environment: "mock",
        idempotency_key: existingKey,
        related_document_id: original.id,
        credit_note_reason_code: data.reason,
        issued_by: context.userId,
      })
      .select("*")
      .single();
    if (noteError) throw noteError;
    await supabase.from("tax_document_items").insert(
      totals.lines.map((x, i) => ({
        tax_document_id: note.id,
        line_number: i + 1,
        description: x.description,
        quantity: x.quantity,
        unit_value: x.unitValueCents / 100,
        unit_price: x.unitPriceCents / 100,
        discount_amount: (x.discountCents ?? 0) / 100,
        sale_value: x.saleValueCents / 100,
        igv_amount: x.igvCents / 100,
        total_amount: x.totalCents / 100,
        internal_code: x.internalCode,
        product_id: x.productId,
      })),
    );
    const originalNumber = `${original.series}-${String(original.number).padStart(8, "0")}`;
    const xml = buildInvoiceUbl({
      ruc: original.settings.ruc,
      legalName: original.settings.legal_name,
      type: "07",
      series: series.series,
      number,
      issueDate,
      customerDocumentType: original.customer_document_type,
      customerDocumentNumber: original.customer_document_number || "-",
      customerName: original.customer_name,
      totals,
      relatedDocument: originalNumber,
      creditReasonCode: data.reason,
      creditReason: creditNoteReasons[data.reason],
    });
    const signed = await new MockXmlSigner().sign(xml);
    const fileName = `${original.settings.ruc}-07-${series.series}-${number}.xml`;
    const client =
      data.scenario === "accepted"
        ? createSunatClient("mock")
        : new (await import("@/server/services/tax")).MockSunatClient(data.scenario);
    const result = await client.send(fileName, signed.signedXml, existingKey);
    const qrPayload = `${original.settings.ruc}|07|${series.series}|${number}|${(totals.igvCents / 100).toFixed(2)}|${(totals.totalCents / 100).toFixed(2)}|${issueDate}|${original.customer_document_type}|${original.customer_document_number || ""}|${signed.hash}`;
    const pdf = await generateTaxPdf({
      environment: "mock",
      documentType: "07",
      series: series.series,
      number,
      issueDate,
      issueTime,
      legalName: original.settings.legal_name,
      tradeName: original.settings.trade_name,
      ruc: original.settings.ruc,
      fiscalAddress: original.settings.fiscal_address,
      customerName: original.customer_name,
      customerDocument: original.customer_document_number,
      taxableAmount: totals.taxableCents / 100,
      discountAmount: totals.discountCents / 100,
      igvAmount: totals.igvCents / 100,
      totalAmount: totals.totalCents / 100,
      paymentMethod: original.payment_method,
      hash: signed.hash,
      qrPayload,
      logoDataUrl,
      relatedDocument: originalNumber,
      creditNoteReason: creditNoteReasons[data.reason],
      items: totals.lines.map((x) => ({
        description: x.description,
        quantity: x.quantity,
        unitCode: "NIU",
        unitPrice: x.unitPriceCents / 100,
        discount: (x.discountCents ?? 0) / 100,
        total: x.totalCents / 100,
      })),
    });
    const folder = `${original.settings.ruc}/${issueDate.slice(0, 4)}/${issueDate.slice(5, 7)}/07-${series.series}-${number}`;
    const xmlPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/${fileName}`,
      encode(xml),
      "application/xml",
    );
    const signedPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/signed-${fileName}`,
      encode(signed.signedXml),
      "application/xml",
    );
    const pdfPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/${fileName.replace(".xml", ".pdf")}`,
      pdf,
      "application/pdf",
    );
    const cdrPath = result.cdr
      ? await uploadPrivate(
          supabase,
          "tax-documents",
          `${folder}/R-${fileName}.txt`,
          encode(result.cdr),
          "text/plain",
        )
      : null;
    const { data: updated, error: updateError } = await supabase
      .from("tax_documents")
      .update({
        status: result.status,
        sunat_status: result.status,
        sunat_code: result.code,
        sunat_message: result.message,
        document_hash: signed.hash,
        qr_payload: qrPayload,
        xml_path: xmlPath,
        signed_xml_path: signedPath,
        pdf_path: pdfPath,
        cdr_path: cdrPath,
        accepted_at: result.status.startsWith("accepted") ? new Date().toISOString() : null,
      })
      .eq("id", note.id)
      .select("*")
      .single();
    if (updateError) throw updateError;
    if (result.status.startsWith("accepted"))
      await supabase
        .from("tax_documents")
        .update({ credited_amount: (already + totals.totalCents) / 100 })
        .eq("id", original.id);
    await supabase.from("sunat_transmission_attempts").insert({
      tax_document_id: note.id,
      operation: "credit_note_send",
      environment: "mock",
      attempt_number: 1,
      sunat_code: result.code,
      message: result.message,
      status: result.status,
      idempotency_key: existingKey,
      sanitized_response: { status: result.status, code: result.code },
    });
    await supabase.from("tax_audit_log").insert({
      actor_id: context.userId,
      action: "credit_note_issue",
      entity_type: "tax_document",
      entity_id: note.id,
      next_state: {
        status: result.status,
        original: original.id,
        amount: totals.totalCents / 100,
      },
      reason: creditNoteReasons[data.reason],
    });
    return updated;
  });

const purchaseSchema = z.object({
  supplier_name: z.string().trim().min(2),
  supplier_ruc: z.string().regex(/^\d{11}$/),
  document_type: z.string().min(2).max(4),
  series: z.string().trim().min(1).max(10),
  number: z.string().trim().min(1).max(20),
  issue_date: z.string(),
  due_date: z.string().optional().nullable(),
  currency: z.string().default("PEN"),
  taxable_amount: z.coerce.number().nonnegative(),
  igv_amount: z.coerce.number().nonnegative(),
  total_amount: z.coerce.number().positive(),
  payment_status: z.string().default("pending"),
  category: z.string().optional().nullable(),
  tax_period: z.string().regex(/^\d{4}-\d{2}$/),
  status: z.enum(["draft", "registered"]).default("registered"),
});
export const adminListPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTaxStaff(context);
    const { data, error } = await db(context)
      .from("purchases")
      .select("*")
      .order("issue_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
export const adminCreatePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => purchaseSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertTaxStaff(context);
    if (Math.abs(data.taxable_amount + data.igv_amount - data.total_amount) > 0.02)
      throw new Error("Base imponible + IGV no coincide con el total");
    const { data: row, error } = await db(context)
      .from("purchases")
      .insert({
        ...data,
        source: "manual",
        reconciliation_status: "pending",
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const adminListSirePeriods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTaxStaff(context);
    const { data, error } = await db(context)
      .from("sire_periods")
      .select("*, inconsistencies:sire_inconsistencies(count)")
      .order("period", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminListDailySummaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTaxStaff(context);
    const { data, error } = await db(context)
      .from("sunat_daily_summaries")
      .select("*, items:sunat_daily_summary_items(count)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
export const adminRunDailySummaryMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        scenario: z.enum(["accepted", "rejected", "timeout"]).default("accepted"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (
      process.env.SUNAT_DAILY_SUMMARY_ENABLED === "true" &&
      process.env.SUNAT_ENVIRONMENT !== "mock"
    )
      throw new Error("El resumen diario real permanece bloqueado");
    const supabase = db(context);
    const { data: settings, error: settingsError } = await supabase
      .from("tax_settings")
      .select("*")
      .eq("environment", "mock")
      .limit(1)
      .single();
    if (settingsError) throw settingsError;
    const identifier = `RC-${data.issueDate.replaceAll("-", "")}-001`;
    const { data: existing } = await supabase
      .from("sunat_daily_summaries")
      .select("*")
      .eq("tax_settings_id", settings.id)
      .eq("summary_identifier", identifier)
      .maybeSingle();
    if (existing) return existing;
    const { data: boletas, error: boletaError } = await supabase
      .from("tax_documents")
      .select("*")
      .eq("tax_settings_id", settings.id)
      .eq("document_type", "03")
      .eq("issue_date", data.issueDate)
      .in("status", ["accepted", "accepted_with_observations", "void_requested", "voided"]);
    if (boletaError) throw boletaError;
    if (!(boletas ?? []).length) throw new Error("No existen boletas elegibles para esa fecha");
    const ids = boletas.map((x: any) => x.id);
    const { data: used } = await supabase
      .from("sunat_daily_summary_items")
      .select("tax_document_id, summary:sunat_daily_summaries!inner(status)")
      .in("tax_document_id", ids)
      .not("summary.status", "in", "(rejected,voided)");
    const usedIds = new Set((used ?? []).map((x: any) => x.tax_document_id));
    const eligible = boletas.filter((x: any) => !usedIds.has(x.id));
    if (!eligible.length) throw new Error("Las boletas ya pertenecen a un resumen activo");
    const { issueDate: today } = limaNow();
    const xml = buildDailySummaryXml({
      ruc: settings.ruc,
      legalName: settings.legal_name,
      identifier,
      referenceDate: data.issueDate,
      issueDate: today,
      items: eligible.map((x: any) => ({
        documentType: "03",
        series: x.series,
        number: Number(x.number),
        customerDocumentType: x.customer_document_type,
        customerDocumentNumber: x.customer_document_number,
        taxableAmount: Number(x.taxable_amount),
        igvAmount: Number(x.igv_amount),
        totalAmount: Number(x.total_amount),
        action: x.status === "void_requested" || x.status === "voided" ? "void" : "add",
      })),
    });
    const signed = await new MockXmlSigner().sign(xml);
    const fileName = `${settings.ruc}-${identifier}.xml`;
    const zipped = zipDailySummary(fileName, signed.signedXml);
    const ticket = `MOCK-TICKET-${identifier}`;
    const result =
      data.scenario === "timeout"
        ? { status: "connection_error", code: "TIMEOUT", message: "Timeout simulado", cdr: null }
        : data.scenario === "rejected"
          ? {
              status: "rejected",
              code: "2335",
              message: "Resumen rechazado (simulado)",
              cdr: `R-${fileName}`,
            }
          : await createSunatClient("mock").query(ticket);
    const folder = `${settings.ruc}/${data.issueDate.slice(0, 4)}/${data.issueDate.slice(5, 7)}/summaries/${identifier}`;
    const xmlPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/${fileName}`,
      encode(xml),
      "application/xml",
    );
    const signedPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/signed-${fileName}`,
      encode(signed.signedXml),
      "application/xml",
    );
    const zipPath = await uploadPrivate(
      supabase,
      "tax-documents",
      `${folder}/${fileName.replace(".xml", ".zip")}`,
      zipped.bytes,
      "application/zip",
    );
    const cdrPath = result.cdr
      ? await uploadPrivate(
          supabase,
          "tax-documents",
          `${folder}/R-${fileName}.txt`,
          encode(result.cdr),
          "text/plain",
        )
      : null;
    const { data: summary, error: summaryError } = await supabase
      .from("sunat_daily_summaries")
      .insert({
        tax_settings_id: settings.id,
        issue_date: data.issueDate,
        summary_identifier: identifier,
        ticket,
        status: result.status,
        attempt_count: 1,
        xml_path: xmlPath,
        signed_xml_path: signedPath,
        zip_path: zipPath,
        cdr_path: cdrPath,
        document_hash: zipped.hash,
      })
      .select("*")
      .single();
    if (summaryError) throw summaryError;
    await supabase.from("sunat_daily_summary_items").insert(
      eligible.map((x: any) => ({
        summary_id: summary.id,
        tax_document_id: x.id,
        action: x.status === "void_requested" || x.status === "voided" ? "void" : "add",
        status: result.status,
      })),
    );
    await supabase.from("tax_audit_log").insert({
      actor_id: context.userId,
      action: "daily_summary_send",
      entity_type: "sunat_daily_summary",
      entity_id: summary.id,
      next_state: { status: result.status, ticket, documents: eligible.length },
    });
    return summary;
  });
export const adminSyncSireMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({ period: z.string().regex(/^\d{4}-\d{2}$/), registryType: z.enum(["RVIE", "RCE"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTaxStaff(context);
    if (process.env.SIRE_SYNC_ENABLED === "true" && process.env.SUNAT_ENVIRONMENT !== "mock")
      throw new Error("SIRE real bloqueado");
    const supabase = db(context);
    const [year, month] = data.period.split("-").map(Number);
    const start = `${data.period}-01`;
    const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    let source: any[] = [];
    if (data.registryType === "RCE") {
      const { data: rows, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("tax_period", data.period)
        .neq("status", "draft");
      if (error) throw error;
      source = rows ?? [];
    } else {
      const { data: rows, error } = await supabase
        .from("tax_documents")
        .select("*")
        .gte("issue_date", start)
        .lt("issue_date", end)
        .in("status", ["accepted", "accepted_with_observations", "voided"]);
      if (error) throw error;
      source = rows ?? [];
    }
    const internal = source.map((x: any) => ({
      key:
        data.registryType === "RCE"
          ? `${x.supplier_ruc}|${x.document_type}|${x.series}|${x.number}`
          : `${x.customer_document_number || "0"}|${x.document_type}|${x.series}|${x.number}`,
      taxableCents: cents(x.taxable_amount),
      igvCents: cents(x.igv_amount),
      totalCents: cents(x.total_amount),
      partyDocument: data.registryType === "RCE" ? x.supplier_ruc : x.customer_document_number,
      documentType: x.document_type,
      status: x.status === "voided" ? ("voided" as const) : ("active" as const),
      raw: x,
    }));
    const proposal = await new MockSireClient().downloadProposal(
      data.period,
      data.registryType,
      internal.map(({ raw: _, ...x }: any) => x),
    );
    const comparison = reconcileRecords(internal, proposal.records as any[]);
    const makranaTotal = internal.reduce((sum, x) => sum + x.totalCents, 0) / 100;
    const sunatTotal =
      (proposal.records as any[]).reduce((sum, x) => sum + Number(x.totalCents), 0) / 100;
    const { data: row, error } = await supabase
      .from("sire_periods")
      .upsert(
        {
          period: data.period,
          registry_type: data.registryType,
          proposal_status: "downloaded_mock",
          ticket: proposal.ticket,
          review_status: "pending",
          submission_status: "blocked",
          makrana_total: makranaTotal,
          sunat_total: sunatTotal,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "period,registry_type" },
      )
      .select("*")
      .single();
    if (error) throw error;
    const started = new Date().toISOString();
    const { data: run, error: runError } = await supabase
      .from("sire_sync_runs")
      .insert({
        sire_period_id: row.id,
        started_at: started,
        finished_at: new Date().toISOString(),
        status: "completed_mock",
        ticket: proposal.ticket,
        records_count: proposal.records.length,
        initiated_by: context.userId,
      })
      .select("id")
      .single();
    if (runError) throw runError;
    const records = [
      ...internal.map((x: any) => ({
        sire_period_id: row.id,
        source: "makrana",
        external_key: x.key,
        supplier_or_customer_document: x.partyDocument,
        document_type: x.documentType,
        series: x.raw.series,
        number: String(x.raw.number),
        issue_date: x.raw.issue_date,
        taxable_amount: x.taxableCents / 100,
        igv_amount: x.igvCents / 100,
        total_amount: x.totalCents / 100,
        raw_data: { mock: true, status: x.status },
      })),
      ...(proposal.records as any[]).map((x: any, index: number) => {
        const raw = source[index] ?? {};
        return {
          sire_period_id: row.id,
          source: "sunat",
          external_key: x.key,
          supplier_or_customer_document: x.partyDocument,
          document_type: x.documentType,
          series: raw.series ?? "MOCK",
          number: String(raw.number ?? index + 1),
          issue_date: raw.issue_date ?? start,
          taxable_amount: x.taxableCents / 100,
          igv_amount: x.igvCents / 100,
          total_amount: x.totalCents / 100,
          raw_data: { mock: true, status: x.status },
        };
      }),
    ];
    if (records.length) {
      const { error: recordError } = await supabase
        .from("sire_records")
        .upsert(records, { onConflict: "sire_period_id,source,external_key" });
      if (recordError) throw recordError;
    }
    const differences = comparison.filter((x) => x.status !== "matched");
    if (differences.length) {
      const { error: diffError } = await supabase.from("sire_inconsistencies").insert(
        differences.map((x) => ({
          sire_period_id: row.id,
          inconsistency_type: x.status,
          details: { key: x.key, run_id: run.id, mock: true },
        })),
      );
      if (diffError) throw diffError;
    }
    await supabase.from("tax_audit_log").insert({
      actor_id: context.userId,
      action: "sire_mock_sync",
      entity_type: "sire_period",
      entity_id: row.id,
      next_state: {
        registry: data.registryType,
        records: records.length,
        differences: differences.length,
        ticket: proposal.ticket,
      },
    });
    return row;
  });

export const adminGetTaxSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTaxStaff(context);
    const { data, error } = await db(context)
      .from("tax_settings")
      .select("*, series:tax_document_series(*)")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  });
export const adminSaveTaxSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        ruc: z.string().regex(/^\d{11}$/),
        legal_name: z.string().trim().min(2),
        trade_name: z.string().optional().nullable(),
        fiscal_address: z.string().trim().min(3),
        ubigeo: z.string().optional().nullable(),
        department: z.string().optional().nullable(),
        province: z.string().optional().nullable(),
        district: z.string().optional().nullable(),
        tax_regime: z.string().optional().nullable(),
        igv_rate: z.coerce.number().min(0).max(100),
        prices_include_igv: z.boolean().optional().nullable(),
        tax_email: z.string().email().optional().or(z.literal("")).nullable(),
        certificate_expires_at: z.string().optional().or(z.literal("")).nullable(),
        readiness_statuses: z
          .record(
            z.string(),
            z.enum(["pending", "registered", "owner_validated", "accountant_validated"]),
          )
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabase = db(context);
    const payload = {
      ...data,
      environment: "mock",
      electronic_issuer_enabled: false,
      certificate_configured: false,
      sire_configured: false,
      updated_by: context.userId,
      ...(!data.id ? { created_by: context.userId } : {}),
    };
    const { data: row, error } = await supabase
      .from("tax_settings")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    for (const series of [
      { document_type: "01", series: "F001" },
      { document_type: "03", series: "B001" },
      { document_type: "07", series: "FC01" },
      { document_type: "07", series: "BC01" },
    ])
      await supabase
        .from("tax_document_series")
        .upsert(
          { tax_settings_id: row.id, ...series, environment: "mock", created_by: context.userId },
          { onConflict: "tax_settings_id,document_type,series,environment" },
        );
    return row;
  });
