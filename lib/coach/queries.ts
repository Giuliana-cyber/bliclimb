// Queries server-side para el panel del coach. Usan el admin client y
// asumen que el caller ya verificó `isCoach`. Las pages también re-validan
// la pertenencia coach↔cliente antes de mostrar datos sensibles.
import { createAdminClient } from '@/lib/supabase/admin';

export type ClientSummary = {
  relationId: string;
  clientId: string;
  name: string | null;
  email: string | null;
  level: string | null;
  acceptedAt: string;
  lastCheckInAt: string | null;
  hasActivePlan: boolean;
};

export type CoachCheckIn = {
  clientId: string;
  clientName: string | null;
  date: string;
  rpe: number | null;
  fingerPain: number | null;
  energy: number | null;
  notes: string | null;
};

export type ClientDetail = {
  clientId: string;
  name: string | null;
  email: string | null;
  level: string | null;
  goals: string[];
  daysPerWeek: number | null;
  sessionDuration: number | null;
  equipment: string[];
  injuries: string[];
  pullupsBodyweight: number | null;
  hangboard20mmSeconds: number | null;
  benchPress1Rm: number | null;
  squat1Rm: number | null;
  deadlift1Rm: number | null;
  activePlan: {
    id: string;
    source: 'ai' | 'coach';
    coachId: string | null;
    totalWeeks: number;
    currentWeek: number;
    startDate: string;
  } | null;
  recentCheckIns: CoachCheckIn[];
};

/**
 * Lista de clientes activos (status='accepted') con su nombre, nivel y la
 * fecha del último check-in. No carga el plan ni todo el profile — solo lo
 * suficiente para una tabla.
 */
export async function getCoachClientSummaries(coachId: string): Promise<ClientSummary[]> {
  const admin = createAdminClient();
  const { data: relations, error } = await admin
    .from('coach_clients')
    .select('id, client_id, accepted_at')
    .eq('coach_id', coachId)
    .eq('status', 'accepted')
    .not('client_id', 'is', null)
    .order('accepted_at', { ascending: false });
  if (error) throw new Error(`getCoachClientSummaries failed: ${error.message}`);

  const rows = (relations ?? []) as Array<{
    id: string;
    client_id: string;
    accepted_at: string | null;
  }>;
  if (rows.length === 0) return [];

  const clientIds = rows.map((r) => r.client_id);

  const [profiles, lastCheckIns, activePlans, emails] = await Promise.all([
    admin.from('profiles').select('id, name, level').in('id', clientIds),
    admin
      .from('check_ins')
      .select('profile_id, date')
      .in('profile_id', clientIds)
      .order('date', { ascending: false }),
    admin
      .from('plans')
      .select('profile_id')
      .in('profile_id', clientIds)
      .eq('status', 'active'),
    // El email vive en auth.users — el admin client lo resuelve por id.
    // Lo necesitamos para mostrarlo cuando profiles.name está vacío (el
    // cliente aún no completó onboarding).
    Promise.all(
      clientIds.map((id) =>
        admin.auth.admin
          .getUserById(id)
          .then((res) => ({ id, email: res.data?.user?.email ?? null }))
          .catch(() => ({ id, email: null }))
      )
    )
  ]);

  const profileById = new Map<string, { name: string | null; level: string | null }>();
  for (const p of (profiles.data ?? []) as Array<{ id: string; name: string | null; level: string | null }>) {
    profileById.set(p.id, { name: p.name, level: p.level });
  }
  const emailById = new Map<string, string | null>();
  for (const e of emails) emailById.set(e.id, e.email);
  const lastCheckByClient = new Map<string, string>();
  for (const c of (lastCheckIns.data ?? []) as Array<{ profile_id: string; date: string }>) {
    if (!lastCheckByClient.has(c.profile_id)) lastCheckByClient.set(c.profile_id, c.date);
  }
  const activePlanSet = new Set<string>(
    ((activePlans.data ?? []) as Array<{ profile_id: string }>).map((p) => p.profile_id)
  );

  return rows.map((row) => {
    const p = profileById.get(row.client_id) ?? null;
    return {
      relationId: row.id,
      clientId: row.client_id,
      name: p?.name ?? null,
      email: emailById.get(row.client_id) ?? null,
      level: p?.level ?? null,
      acceptedAt: row.accepted_at ?? '',
      lastCheckInAt: lastCheckByClient.get(row.client_id) ?? null,
      hasActivePlan: activePlanSet.has(row.client_id)
    };
  });
}

/**
 * Últimos N check-ins agregados de todos los clientes activos del coach.
 * Útil para el feed del dashboard.
 */
export async function getCoachRecentCheckIns(
  coachId: string,
  limit = 8
): Promise<CoachCheckIn[]> {
  const admin = createAdminClient();
  const { data: relations } = await admin
    .from('coach_clients')
    .select('client_id')
    .eq('coach_id', coachId)
    .eq('status', 'accepted')
    .not('client_id', 'is', null);
  const clientIds = ((relations ?? []) as Array<{ client_id: string }>).map((r) => r.client_id);
  if (clientIds.length === 0) return [];

  const [{ data: checks }, { data: profiles }] = await Promise.all([
    admin
      .from('check_ins')
      .select('profile_id, date, rpe, finger_pain, energy, notes')
      .in('profile_id', clientIds)
      .order('date', { ascending: false })
      .limit(limit),
    admin.from('profiles').select('id, name').in('id', clientIds)
  ]);

  const nameById = new Map<string, string | null>();
  for (const p of (profiles ?? []) as Array<{ id: string; name: string | null }>) {
    nameById.set(p.id, p.name);
  }

  return ((checks ?? []) as Array<{
    profile_id: string;
    date: string;
    rpe: number | null;
    finger_pain: number | null;
    energy: number | null;
    notes: string | null;
  }>).map((c) => ({
    clientId: c.profile_id,
    clientName: nameById.get(c.profile_id) ?? null,
    date: c.date,
    rpe: c.rpe,
    fingerPain: c.finger_pain,
    energy: c.energy,
    notes: c.notes
  }));
}

/**
 * Carga el detalle completo de un cliente, asumiendo que el caller ya
 * verificó la relación (coach es dueño del cliente). Devuelve `null` si el
 * cliente no existe.
 */
export async function getClientDetailForCoach(
  coachId: string,
  clientId: string
): Promise<ClientDetail | null> {
  const admin = createAdminClient();

  // Validar relación
  const { data: rel } = await admin
    .from('coach_clients')
    .select('id')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .eq('status', 'accepted')
    .maybeSingle();
  if (!rel) return null;

  const [{ data: profile }, { data: planRow }, { data: checks }, { data: user }] =
    await Promise.all([
      admin.from('profiles').select('*').eq('id', clientId).maybeSingle(),
      admin
        .from('plans')
        .select('id, source, coach_id, total_weeks, current_week, start_date, status')
        .eq('profile_id', clientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('check_ins')
        .select('date, rpe, finger_pain, energy, notes, profile_id')
        .eq('profile_id', clientId)
        .order('date', { ascending: false })
        .limit(10),
      admin.auth.admin.getUserById(clientId)
    ]);

  if (!profile) return null;

  const p = profile as Record<string, unknown>;
  const recentCheckIns = ((checks ?? []) as Array<{
    date: string;
    rpe: number | null;
    finger_pain: number | null;
    energy: number | null;
    notes: string | null;
    profile_id: string;
  }>).map((c) => ({
    clientId: c.profile_id,
    clientName: (p.name as string | null) ?? null,
    date: c.date,
    rpe: c.rpe,
    fingerPain: c.finger_pain,
    energy: c.energy,
    notes: c.notes
  }));

  return {
    clientId,
    name: (p.name as string | null) ?? null,
    email: user?.user?.email ?? null,
    level: (p.level as string | null) ?? null,
    goals: ((p.goals as string[] | null) ?? []) as string[],
    daysPerWeek: (p.days_per_week as number | null) ?? null,
    sessionDuration: (p.session_duration as number | null) ?? null,
    equipment: ((p.equipment as string[] | null) ?? []) as string[],
    injuries: ((p.injuries as string[] | null) ?? []) as string[],
    pullupsBodyweight: (p.pullups_bodyweight as number | null) ?? null,
    hangboard20mmSeconds: (p.hangboard_20mm_seconds as number | null) ?? null,
    benchPress1Rm: (p.bench_press_1rm as number | null) ?? null,
    squat1Rm: (p.squat_1rm as number | null) ?? null,
    deadlift1Rm: (p.deadlift_1rm as number | null) ?? null,
    activePlan: planRow
      ? {
          id: (planRow as Record<string, unknown>).id as string,
          source: ((planRow as Record<string, unknown>).source as 'ai' | 'coach') ?? 'ai',
          coachId: ((planRow as Record<string, unknown>).coach_id as string | null) ?? null,
          totalWeeks: (planRow as Record<string, unknown>).total_weeks as number,
          currentWeek: (planRow as Record<string, unknown>).current_week as number,
          startDate: (planRow as Record<string, unknown>).start_date as string
        }
      : null,
    recentCheckIns
  };
}
