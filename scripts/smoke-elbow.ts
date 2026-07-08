// Smoke determinístico: usuario con lesión de codo declarada.
// Corre los módulos brain reales (§1 + §5) contra un ProfileForRules
// construido igual que /api/generate-plan lo arma en prod.
//
// Uso: npx tsx scripts/smoke-elbow.ts

import { section01ProfileFilters } from '@/lib/brain/rules/section-01-profile-filters';
import { section05HealthDerivation } from '@/lib/brain/rules/section-05-health-derivation';
import {
  deriveElbowPain,
  deriveFingerPain,
  deriveShoulderPain
} from '@/lib/brain/derive-pain-signals';
import type { ProfileForRules } from '@/lib/brain/types';

type BaseProfile = {
  age: string;
  climbingTime: string;
  injuries: string[];
  sleep: string;
  currentFingerPain: number | null;
  currentElbowPain: number | null;
  currentShoulderPain: number | null;
};

const profileWithElbow: BaseProfile = {
  age: '26-35',
  climbingTime: '1to3',
  injuries: ['elbows'],
  sleep: 'good',
  currentFingerPain: null,
  currentElbowPain: null,
  currentShoulderPain: null
};

const profileNoInjury: BaseProfile = {
  age: '26-35',
  climbingTime: '1to3',
  injuries: ['none'],
  sleep: 'good',
  currentFingerPain: null,
  currentElbowPain: null,
  currentShoulderPain: null
};

function buildProfileForRules(base: BaseProfile): ProfileForRules {
  return {
    age: base.age,
    climbingTime: base.climbingTime,
    injuries: base.injuries,
    sleep: base.sleep,
    currentFingerPain: deriveFingerPain(base.injuries, null, base),
    currentElbowPain: deriveElbowPain(base.injuries, base),
    currentShoulderPain: deriveShoulderPain(base.injuries, base),
    character: 'bill'
  };
}

function runSmoke(label: string, base: BaseProfile) {
  const p = buildProfileForRules(base);
  const v01 = section01ProfileFilters.check(p);
  const v05 = section05HealthDerivation.check(p);
  console.log(`\n===== ${label} =====`);
  console.log('ProfileForRules:', JSON.stringify(p, null, 2));
  console.log('§1 verdicts:', JSON.stringify(v01, null, 2));
  console.log('§5 verdicts:', JSON.stringify(v05, null, 2));
  return { p, v01, v05 };
}

const a = runSmoke('A · injuries=["elbows"]', profileWithElbow);
const b = runSmoke('B · control injuries=["none"]', profileNoInjury);

console.log('\n===== Diff A vs B =====');
console.log('currentElbowPain — A:', a.p.currentElbowPain, '· B:', b.p.currentElbowPain);
console.log(
  '§1.3 elbow verdict emitido en A?',
  a.v01.some(
    (v) =>
      v.rule === '1.3' &&
      v.kind === 'block-zone' &&
      (v as { zone?: string }).zone === 'elbow'
  )
);
console.log(
  '§1.3 elbow verdict emitido en B?',
  b.v01.some(
    (v) =>
      v.rule === '1.3' &&
      v.kind === 'block-zone' &&
      (v as { zone?: string }).zone === 'elbow'
  )
);
console.log(
  '§5.3 extensors-before-traction en A?',
  a.v05.some((v) => v.rule === '5.3' && v.kind === 'add-training-priority')
);
console.log(
  '§5.3 reduce-traction-volume en A?',
  a.v05.some((v) => v.rule === '5.3' && v.kind === 'add-intensity-adjustment')
);
console.log(
  '§5.3 en B (control)?',
  b.v05.some((v) => v.rule === '5.3')
);
