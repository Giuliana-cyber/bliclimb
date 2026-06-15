'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { loadProfile } from '@/lib/profile';
import { loadTrainingPlan } from '@/lib/plan';
import { loadCheckIns } from '@/lib/checkin';
import { upsertProfile } from './profile';
import { savePlan } from './plan';
import { insertCheckIn } from './check-ins';

const MIGRATION_FLAG_KEY = 'bilclimb:migrated-to-supabase';

export type MigrationResult = {
  alreadyMigrated: boolean;
  profileMigrated: boolean;
  planMigrated: boolean;
  checkInsMigrated: number;
};

function hasMigrated() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
}

function markMigrated() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MIGRATION_FLAG_KEY, '1');
}

export async function migrateLocalToSupabase(
  supabase: SupabaseClient,
  userId: string
): Promise<MigrationResult> {
  if (hasMigrated()) {
    return {
      alreadyMigrated: true,
      profileMigrated: false,
      planMigrated: false,
      checkInsMigrated: 0
    };
  }

  let profileMigrated = false;
  let planMigrated = false;
  let checkInsMigrated = 0;

  const localProfile = loadProfile();
  if (localProfile) {
    await upsertProfile(supabase, userId, localProfile);
    profileMigrated = true;
  }

  const localPlan = loadTrainingPlan();
  if (localPlan) {
    await savePlan(supabase, userId, { ...localPlan, profileId: userId });
    planMigrated = true;
  }

  const localCheckIns = loadCheckIns();
  for (const checkIn of localCheckIns) {
    try {
      await insertCheckIn(supabase, userId, checkIn);
      checkInsMigrated += 1;
    } catch {
      // continuar con los demás aunque uno falle
    }
  }

  markMigrated();

  return {
    alreadyMigrated: false,
    profileMigrated,
    planMigrated,
    checkInsMigrated
  };
}
