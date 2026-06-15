'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './types';

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
