import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './types';

let cachedAdmin: ReturnType<typeof createSupabaseClient> | null = null;

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY. Solo úsala en código server-side.');
  }

  if (cachedAdmin) {
    return cachedAdmin;
  }

  const { url } = getSupabaseEnv();
  cachedAdmin = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedAdmin;
}
