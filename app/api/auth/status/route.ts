import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!hasSupabaseEnv) {
    return NextResponse.json({
      supabaseConfigured: false,
      authenticated: false
    });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return NextResponse.json({
    supabaseConfigured: true,
    authenticated: Boolean(user),
    userId: user?.id ?? null,
    email: user?.email ?? null
  });
}
