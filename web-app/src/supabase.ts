import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | undefined = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        flowType: "pkce",
        persistSession: true
      }
    })
  : undefined;

export function appOrigin(): string {
  return (import.meta.env.VITE_APP_ORIGIN as string | undefined) ?? window.location.origin;
}

export const apiGatewayUrl = (import.meta.env.VITE_API_GATEWAY_URL as string | undefined) ?? "http://localhost:8080";
