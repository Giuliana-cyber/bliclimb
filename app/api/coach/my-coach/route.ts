// GET /api/coach/my-coach — devuelve el coach asignado al usuario actual
// (si tiene), para que el Dashboard pueda mostrar el banner "Entrenando con [coach]".
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientCoach } from '@/lib/coach';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ coach: null });

  const admin = createAdminClient();
  const relation = await getClientCoach(user.id, admin);
  if (!relation) return NextResponse.json({ coach: null });

  const { data: profileRow } = await admin
    .from('profiles')
    .select('name')
    .eq('id', relation.coach_id)
    .maybeSingle();
  const name = (profileRow as { name: string | null } | null)?.name ?? null;
  return NextResponse.json({
    coach: {
      coachId: relation.coach_id,
      name
    }
  });
}
