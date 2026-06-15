import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckIn } from '@/lib/checkin';

type CheckInRow = {
  id: string;
  profile_id: string;
  session_id: string | null;
  date: string;
  rpe: number | null;
  finger_pain: number | null;
  energy: number | null;
  sleep: number | null;
  notes: string | null;
  manual_activity: CheckIn['manualActivity'];
  created_at: string;
};

function rowToCheckIn(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    sessionId: row.session_id ?? '',
    planId: '',
    date: row.date,
    completed: 'full',
    rpe: row.rpe ?? 0,
    fingerPain: row.finger_pain ?? 0,
    otherPain: [],
    energy: row.energy ?? 3,
    sleep: row.sleep ?? 3,
    notes: row.notes ?? '',
    manualActivity: row.manual_activity
  };
}

export async function fetchCheckIns(supabase: SupabaseClient, userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('profile_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => rowToCheckIn(row as CheckInRow));
}

export async function insertCheckIn(
  supabase: SupabaseClient,
  userId: string,
  checkIn: CheckIn
) {
  const { data, error } = await supabase
    .from('check_ins')
    .insert({
      profile_id: userId,
      session_id: checkIn.sessionId || null,
      date: checkIn.date,
      rpe: checkIn.rpe,
      finger_pain: checkIn.fingerPain,
      energy: checkIn.energy,
      sleep: checkIn.sleep,
      notes: checkIn.notes,
      manual_activity: checkIn.manualActivity
    })
    .select()
    .single();

  if (error) throw error;
  return rowToCheckIn(data as CheckInRow);
}
