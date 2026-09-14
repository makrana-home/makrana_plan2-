import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { defaultCustomerMessage } from "@/lib/customer-message";

const templateSchema = z.string().trim().min(1).max(4000);
const metadataKey = "makrana_customer_message";

// This is a personal writing preference, never an authorization attribute.
export async function getCustomerMessage() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Inicia sesión para cargar tu mensaje.");
  const saved = templateSchema.safeParse(data.user.user_metadata?.[metadataKey]);
  return saved.success ? saved.data : defaultCustomerMessage;
}

export async function saveCustomerMessage(value: string) {
  const template = templateSchema.parse(value);
  const { error } = await supabase.auth.updateUser({ data: { [metadataKey]: template } });
  if (error) throw error;
  return template;
}
