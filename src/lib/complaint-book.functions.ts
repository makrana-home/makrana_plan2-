import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const optionalDate = z.string().optional().or(z.literal(""));
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const complaintBookSchema = z.object({
  first_name: z.string().trim().min(2).max(100),
  first_surname: z.string().trim().min(2).max(100),
  second_surname: z.string().trim().min(2).max(100),
  document_type: z.enum(["DNI", "RUC", "CE", "Pasaporte"]),
  document_number: z.string().trim().min(5).max(20),
  phone: z.string().trim().min(6).max(30),
  department: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  address: z.string().trim().min(3).max(250),
  reference: optionalText(250),
  email: z.string().trim().email().max(160),
  claim_type: z.enum(["Reclamación", "Queja"]),
  consumption_type: z.enum(["Producto", "Servicio"]),
  order_number: z.string().trim().min(1).max(80),
  claim_date: z.string().date(),
  provider: optionalText(160),
  claimed_amount: z
    .union([z.coerce.number().nonnegative().max(9999999999), z.literal("")])
    .optional(),
  product_description: optionalText(2000),
  purchase_date: optionalDate,
  consumption_date: optionalDate,
  expiration_date: optionalDate,
  claim_detail: z.string().trim().min(10).max(5000),
  customer_request: z.string().trim().min(5).max(3000),
  sworn_declaration: z.literal(true),
  contact_authorization: z.boolean(),
});

export type ComplaintBookInput = z.infer<typeof complaintBookSchema>;

export const submitComplaintBookEntry = createServerFn({ method: "POST" })
  .validator((data) => complaintBookSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claimNumber = `LR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const payload = {
      ...data,
      claim_number: claimNumber,
      reference: data.reference || null,
      provider: data.provider || null,
      claimed_amount:
        data.claimed_amount === "" || data.claimed_amount == null ? null : data.claimed_amount,
      product_description: data.product_description || null,
      purchase_date: data.purchase_date || null,
      consumption_date: data.consumption_date || null,
      expiration_date: data.expiration_date || null,
    };
    const { error } = await supabaseAdmin
      .from("complaint_book_entries" as any)
      .insert(payload as any);
    if (error) throw error;
    return { ok: true, claimNumber };
  });

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw error;
  if (!data) throw new Error("No tienes permiso para ver el Libro de Reclamaciones.");
}

export const adminListComplaintBookEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("complaint_book_entries" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as any[];
  });

export const adminUpdateComplaintBookEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pendiente", "en_proceso", "atendido"]),
        admin_notes: optionalText(3000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("complaint_book_entries" as any)
      .update({ status: data.status, admin_notes: data.admin_notes || null } as any)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
