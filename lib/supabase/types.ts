export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function normalizeSupabaseUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return rawUrl.replace(/\/(rest|auth|storage)\/v\d+\/?$/, '').replace(/\/+$/, '');
  }
}

export function getSupabaseEnv(): SupabaseEnv {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno.'
    );
  }

  return { url: normalizeSupabaseUrl(rawUrl), anonKey };
}
