// DELETE /api/push/unsubscribe — borra la subscripción del navegador
// actual. Espera ?endpoint=... O body { endpoint }.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const url = new URL(request.url);
  let endpoint = url.searchParams.get('endpoint');
  if (!endpoint) {
    try {
      const body = (await request.json()) as { endpoint?: string };
      endpoint = body.endpoint ?? null;
    } catch {
      // ignore
    }
  }
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint_required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await (admin as unknown as {
    from: (t: string) => {
      delete: () => {
        eq: (col: string, value: string) => {
          eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  })
    .from('push_subscriptions')
    .delete()
    .eq('profile_id', user.id)
    .eq('endpoint', endpoint);
  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
