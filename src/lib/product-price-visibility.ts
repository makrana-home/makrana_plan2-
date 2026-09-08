import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function resolveProductPriceVisibility(
  value: boolean | null | undefined,
  defaultValue: boolean,
) {
  return value ?? defaultValue;
}

export async function getDefaultProductPriceVisibility(sb: SupabaseClient<Database>) {
  const { data, error } = await sb
    .from("categories")
    .select("description")
    .eq("slug", "configuracion-inicio")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data?.description?.startsWith("site-home:")) return false;
  try {
    return JSON.parse(data.description.slice("site-home:".length)).showProductPrices === true;
  } catch {
    return false;
  }
}
