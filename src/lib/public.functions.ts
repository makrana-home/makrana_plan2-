import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { homeSectionDefaults, type HomeSectionVisibility } from "@/lib/site-settings.functions";

const publicCatalogCategorySlugs = [
  "murales",
  "murales-inspirados-en-quipus",
  "arbol-de-la-vida",
  "atrapasuenos",
  "murales-de-hojas",
  "decoracion-de-casa",
  "espejos",
  "navidad",
  "adornos-de-munecos",
  "carteras",
];

function publicClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createClient<Database>(supabaseUrl, supabasePublicKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function getProductPriceVisibility(sb: ReturnType<typeof publicClient>) {
  const { data, error } = await sb
    .from("categories")
    .select("description")
    .eq("slug", "configuracion-inicio")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data?.description?.startsWith("site-home:")) return false;
  try {
    return JSON.parse(data.description.slice("site-home:".length)).showProductPrices === true;
  } catch {
    return false;
  }
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("categories")
    .select("id, slug, name, sort_order")
    .eq("is_active", true)
    .neq("slug", "configuracion-inicio")
    .in("slug", publicCatalogCategorySlugs)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export const getHomeSectionVisibility = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("categories")
    .select("description")
    .eq("slug", "configuracion-inicio")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data?.description?.startsWith("site-home:")) return { ...homeSectionDefaults };
  try {
    return {
      ...homeSectionDefaults,
      ...(JSON.parse(
        data.description.slice("site-home:".length),
      ) as Partial<HomeSectionVisibility>),
    };
  } catch {
    return { ...homeSectionDefaults };
  }
});

export const listHomeCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [categoriesResult, muralFerResult] = await Promise.all([
    sb
      .from("categories")
      .select("id, slug, name, description, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    sb
      .from("products")
      .select("main_image_url")
      .eq("slug", "mural-fer-pz-024")
      .eq("is_visible", true)
      .maybeSingle(),
  ]);
  const { data, error } = categoriesResult;
  if (error) throw error;
  if (muralFerResult.error) throw muralFerResult.error;
  const muralFerImageUrl = muralFerResult.data?.main_image_url ?? null;
  const configured = (data ?? [])
    .map((category) => {
      const home = readCategoryHome(category.description);
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        sort_order: category.sort_order,
        home_description: home?.description ?? null,
        home_image_url:
          category.slug === "murales" && muralFerImageUrl
            ? muralFerImageUrl
            : (home?.imageUrl ?? null),
        show_on_home: home?.visible === true,
      };
    })
    .filter((category) => category.show_on_home)
    .slice(0, 3);
  if (configured.length > 0) return configured;
  return [
    {
      id: "home-arbol-de-la-vida",
      slug: "arbol-de-la-vida",
      name: "Árbol de la vida",
      sort_order: 10,
      home_description: "Símbolos de conexión y equilibrio.",
      home_image_url: null,
      show_on_home: true,
    },
    {
      id: "home-murales-inspirados-en-quipus",
      slug: "murales-inspirados-en-quipus",
      name: "Murales inspirados en quipus",
      sort_order: 20,
      home_description: "Texturas, nudos y tradición reinterpretada.",
      home_image_url: null,
      show_on_home: true,
    },
    {
      id: "home-murales",
      slug: "murales",
      name: "Murales",
      sort_order: 30,
      home_description: "Composiciones que cuentan historias.",
      home_image_url: muralFerImageUrl,
      show_on_home: true,
    },
  ];
});

function readCategoryHome(description: string | null) {
  const marker = "\nHOME:";
  const start = description?.indexOf(marker) ?? -1;
  if (start < 0) return null;
  try {
    return JSON.parse(description!.slice(start + marker.length)) as {
      description?: string;
      imageUrl?: string;
      visible?: boolean;
    };
  } catch {
    return null;
  }
}

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { categorySlug?: string; featuredOnly?: boolean; limit?: number } | undefined) => d ?? {},
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("products")
      .select(
        "id, sku, slug, name, short_description, main_image_url, price, status, type, is_featured, category:categories(slug, name), presentations:material_presentations(id, unit, label, price)",
      )
      .eq("is_visible", true)
      .order("created_at", { ascending: false });
    if (data.featuredOnly) q = q.eq("is_featured", true);
    if (data.limit) q = q.limit(data.limit);
    const [{ data: rows, error }, showPrice] = await Promise.all([
      q,
      getProductPriceVisibility(sb),
    ]);
    if (error) throw error;
    const filtered = data.categorySlug
      ? (rows ?? []).filter((r) => (r as any).category?.slug === data.categorySlug)
      : (rows ?? []);
    return filtered.map((row) => ({ ...row, show_price: showPrice }));
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [{ data: product, error }, showPrice] = await Promise.all([
      sb
        .from("products")
        .select(
          "*, category:categories(slug, name), images:product_images(url, alt, sort_order), presentations:material_presentations(*), stock:inventory_stock(quantity, warehouse:warehouses(name, code))",
        )
        .eq("slug", data.slug)
        .eq("is_visible", true)
        .maybeSingle(),
      getProductPriceVisibility(sb),
    ]);
    if (error) throw error;
    return product ? { ...product, show_price: showPrice } : null;
  });

export const listNews = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number; featuredOnly?: boolean } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("news_posts")
      .select("id, slug, title, category, cover_image_url, summary, published_at, is_featured")
      .eq("status", "publicado")
      .order("published_at", { ascending: false });
    if (data.featuredOnly) q = q.eq("is_featured", true);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getNewsBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: post, error } = await sb
      .from("news_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "publicado")
      .maybeSingle();
    if (error) throw error;
    return post;
  });

export const listWorkshops = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("workshops")
      .select(
        "id, slug, title, description, cover_image_url, modality, level, starts_at, location, capacity, enrolled_count, price, status",
      )
      .eq("is_visible", true)
      .order("starts_at", { ascending: true });
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

const leadSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(40).optional().or(z.literal("")),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  source: z.string().trim().max(160).optional().or(z.literal("")),
  interest: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const createLead = createServerFn({ method: "POST" })
  .inputValidator((d) => leadSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      location: data.location || null,
      source: data.source || "registro web",
      interests: data.interest || null,
      notes: data.message || null,
    };

    let existingId: string | null = null;
    if (payload.email) {
      const { data: existingByEmail, error: findEmailError } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("email", payload.email)
        .maybeSingle();
      if (findEmailError) throw findEmailError;
      existingId = existingByEmail?.id ?? null;
    }
    if (!existingId && payload.phone) {
      const { data: existingByPhone, error: findPhoneError } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("phone", payload.phone)
        .maybeSingle();
      if (findPhoneError) throw findPhoneError;
      existingId = existingByPhone?.id ?? null;
    }

    const query = existingId
      ? supabaseAdmin.from("customers").update(payload).eq("id", existingId)
      : supabaseAdmin.from("customers").insert(payload);

    const { error } = await query;
    if (error) throw error;
    return { ok: true };
  });
