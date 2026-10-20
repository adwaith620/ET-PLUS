import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns true if Supabase connection details are present in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY;
  return Boolean(url && key);
}

/**
 * Retrieves a singleton Supabase client instance configured with service-role or anon keys.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY;

  if (!url || !key) {
    return null;
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseInstance;
}

/**
 * Checks whether local filesystem read/write operations (e.g. process.cwd()/data) are permitted.
 * In serverless environments like Vercel, the filesystem is strictly read-only and ephemeral,
 * so filesystem writes are explicitly prohibited.
 */
export function isFilesystemStorageAvailable(): boolean {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return true;
}
