import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.from("categories").select("id, slug, name, sort_order").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { categorySlug?: string; featuredOnly?: boolean; limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("products")
      .select("id, slug, name, short_description, main_image_url, price, status, type, is_featured, category:categories(slug, name)")
      .eq("is_visible", true)
      .order("created_at", { ascending: false });
    if (data.featuredOnly) q = q.eq("is_featured", true);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw error;
    const filtered = data.categorySlug
      ? (rows ?? []).filter((r) => (r as any).category?.slug === data.categorySlug)
      : (rows ?? []);
    return filtered;
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: product, error } = await sb.from("products")
      .select("*, category:categories(slug, name), images:product_images(url, alt, sort_order), presentations:material_presentations(*), stock:inventory_stock(quantity, warehouse:warehouses(name, code))")
      .eq("slug", data.slug)
      .eq("is_visible", true)
      .maybeSingle();
    if (error) throw error;
    return product;
  });

export const listNews = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number; featuredOnly?: boolean } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("news_posts")
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
    const { data: post, error } = await sb.from("news_posts")
      .select("*").eq("slug", data.slug).eq("status", "publicado").maybeSingle();
    if (error) throw error;
    return post;
  });

export const listWorkshops = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("workshops")
      .select("id, slug, title, description, cover_image_url, modality, level, starts_at, location, capacity, enrolled_count, price, status")
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
    const sb = publicClient();
    const { error } = await sb.from("leads").insert({
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      location: data.location || null,
      source: data.source || null,
      interest: data.interest || null,
      message: data.message || null,
    });
    if (error) throw error;
    return { ok: true };
  });
