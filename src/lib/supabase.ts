import { createClient as createBrowserSupabaseClient } from "./supabase/client";

/**
 * Instancia singleton para consumo rápido en componentes cliente.
 */
export const supabase = typeof window !== "undefined" ? createBrowserSupabaseClient() : null;

export * from "./supabase/client";
