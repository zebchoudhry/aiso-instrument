import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();
