import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const homeSectionDefaults = {
  hero: true,
  benefits: true,
  categories: true,
  welcome: true,
  news: true,
  featured: true,
  customProjects: true,
  workshops: true,
  testimonials: true,
  showProductPrices: false,
};

export type HomeSectionVisibility = typeof homeSectionDefaults;

const settingsSlug = "configuracion-inicio";
const settingsMarker = "site-home:";

const visibilitySchema = z.object({
  hero: z.boolean(),
  benefits: z.boolean(),
  categories: z.boolean(),
  welcome: z.boolean(),
  news: z.boolean(),
  featured: z.boolean(),
  customProjects: z.boolean(),
  workshops: z.boolean(),
  testimonials: z.boolean(),
  showProductPrices: z.boolean(),
});

function parseSettings(description?: string | null): HomeSectionVisibility {
  if (!description?.startsWith(settingsMarker)) return { ...homeSectionDefaults };
  try {
    return {
      ...homeSectionDefaults,
      ...visibilitySchema.partial().parse(JSON.parse(description.slice(settingsMarker.length))),
    };
  } catch {
    return { ...homeSectionDefaults };
  }
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Solo el administrador general puede cambiar estas opciones.");
}

export const adminGetHomeSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("categories")
      .select("description")
      .eq("slug", settingsSlug)
      .maybeSingle();
    if (error) throw error;
    return parseSettings(data?.description);
  });

export const adminUpdateHomeSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => visibilitySchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("categories").upsert(
      {
        slug: settingsSlug,
        name: "Configuración de la página de inicio",
        description: `${settingsMarker}${JSON.stringify(data)}`,
        sort_order: 9999,
        is_active: true,
      },
      { onConflict: "slug" },
    );
    if (error) throw error;
    return data;
  });
