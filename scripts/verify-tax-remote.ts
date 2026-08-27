import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
const url = process.env.SUPABASE_URL,
  serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  anonKey = process.env.SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey)
  throw new Error("Faltan variables Supabase para la verificación remota");
const service = createClient(url, serviceKey, { auth: { persistSession: false } }),
  anonymous = createClient(url, anonKey, { auth: { persistSession: false } });
const suffix = randomUUID().slice(0, 8),
  email = `tax-qa-${suffix}@example.invalid`,
  password = `Qa-${randomUUID()}!`;
let userId: string | undefined, settingsId: string | undefined, seriesId: string | undefined;
const checks: Record<string, boolean> = {};
try {
  const { data: user, error: userError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Usuario ficticio QA tributaria" },
  });
  if (userError) throw userError;
  userId = user.user.id;
  const { error: roleError } = await service
    .from("user_roles")
    .insert({ user_id: userId, role: "ventas" });
  if (roleError) throw roleError;
  const { data: settings, error: settingsError } = await service
    .from("tax_settings")
    .insert({
      ruc: "20123456789",
      legal_name: "EMISOR FICTICIO QA",
      fiscal_address: "DIRECCIÓN FICTICIA QA",
      environment: "mock",
      created_by: userId,
    })
    .select("id")
    .single();
  if (settingsError) throw settingsError;
  settingsId = settings.id;
  const { data: series, error: seriesError } = await service
    .from("tax_document_series")
    .insert({
      tax_settings_id: settingsId,
      document_type: "03",
      series: "BQ99",
      environment: "mock",
      created_by: userId,
    })
    .select("id")
    .single();
  if (seriesError) throw seriesError;
  seriesId = series.id;
  const { data: anonRows, error: anonError } = await anonymous
    .from("tax_settings")
    .select("id")
    .eq("id", settingsId);
  checks.anon_cannot_read = !anonError && (anonRows?.length ?? 0) === 0;
  const authenticated = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: loginError } = await authenticated.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  const { data: staffRows, error: staffReadError } = await authenticated
    .from("tax_settings")
    .select("id")
    .eq("id", settingsId);
  checks.staff_can_read = !staffReadError && staffRows?.length === 1;
  const { error: deleteError } = await authenticated
    .from("tax_document_series")
    .delete()
    .eq("id", seriesId);
  checks.staff_cannot_delete = Boolean(deleteError);
  const reservations = await Promise.all(
    Array.from({ length: 20 }, () =>
      authenticated.rpc("reserve_tax_document_number", { _series_id: seriesId }),
    ),
  );
  if (reservations.some((x) => x.error)) throw reservations.find((x) => x.error)!.error;
  const numbers = reservations.map((x) => Number(x.data?.[0]?.number));
  checks.atomic_correlatives =
    new Set(numbers).size === 20 && Math.min(...numbers) === 1 && Math.max(...numbers) === 20;
  const { data: buckets, error: bucketError } = await service.storage.listBuckets();
  if (bucketError) throw bucketError;
  checks.private_storage = ["tax-documents", "purchase-documents", "sire-files"].every((name) =>
    buckets.some((x) => x.name === name && x.public === false),
  );
  console.log(JSON.stringify(checks));
  if (Object.values(checks).some((x) => !x)) process.exitCode = 1;
} finally {
  if (seriesId) await service.from("tax_document_series").delete().eq("id", seriesId);
  if (settingsId) await service.from("tax_settings").delete().eq("id", settingsId);
  if (userId) {
    await service.from("user_roles").delete().eq("user_id", userId);
    await service.auth.admin.deleteUser(userId);
  }
}
