# Fase 2 · Vertical slice motor invertido (fuerza-dedos)

**Estado**: F2.1 diseño · aprobado por Giuliana 2026-07-16 para arrancar.
**Alcance**: solo categoría `fuerza-dedos`. El motor viejo sigue en producción para el resto (paralelo, no reemplazo).
**Test de oro**: GC-001 caso Giuliana (32 años, 10+ años, condición baja, hang25mm~5s, 3 domi) → plan de reconstrucción con dedos asistidos, sin máximos, narrado.

---

## 1 · Datos disponibles (auditados de v3.1 regenerada)

| Componente | Cantidad | Notas |
|---|---:|---|
| Ejercicios `fuerza-dedos` | 62 | Todos `status=active` |
| Distribución risk_level | low-medium=3 · medium=11 · medium-high=14 · high=34 | GC-001 usa ≤ medium (14 candidatos) |
| Gates `GT-FIN-*` | 30 | severity: critical=9, high=10, medium=10, low=1 |
| Protocolos `PR-HB/PR-FIN-*` | 20 | 7 active (13 en manual_review por dosis vacía o cerrada por Giuliana) |
| Relationships canónicas EX-FIN → GT-FIN | 186 | BLOCKED_BY + CONTROLLED_BY + GOVERNED_BY |

---

## 2 · Arquitectura del slice

### Módulos nuevos (en `lib/brain/motor-inverted/`)

```
lib/brain/motor-inverted/
├── catalog-loader.ts     · lee v3.1 xlsx en runtime, expone tipos + filtros
├── gate-evaluator.ts     · evalúa condition_expression contra profile
├── restrict-pool.ts      · aplica gates + risk + status a candidato-por-candidato
├── prompt-builder.ts     · genera prompt corto + Zod z.enum([...ids]) dinámico
├── assembler.ts          · construye plan desde IDs + catálogo
├── types.ts              · types compartidos (Profile, FocusObject, PlanSlice)
└── __tests__/
    ├── gate-evaluator.test.ts
    ├── restrict-pool.test.ts
    ├── assembler.test.ts
    └── gc-001-end-to-end.test.ts    · el golden
```

**Coexistencia**: no toca `lib/brain/matcher/*` ni `app/api/generate-plan/route.ts`. Vive paralelo. Cuando Fase 3 termine (escalado a las 14 categorías restantes), se hace el cutover.

### Flujo end-to-end para GC-001

```
Perfil (Giuliana)
     │
     ▼
[gate-evaluator]  Reglas §1.x/§5.x + gates GT-FIN + regla Eva López
     │
     ▼
[restrict-pool]   Del pool total (62) filtra a IDs elegibles (~14)
     │
     ▼
[prompt-builder]  Zod z.enum([...elegibleIds]) + prompt "elige N IDs para sesión de reconstrucción"
     │
     ▼
LLM (OpenAI structured output — infra existente)
     │  → devuelve array de IDs + sets/reps/notes (Zod-validated, sin invención posible)
     ▼
[assembler]       Del ID → lee catálogo: name, description, stop_signals, progression, regression, notes_dosage
     │
     ▼
PlanSlice · sesión ensamblada con contenido curado
```

**Fail-closed por construcción**: si un ID no está en el pool restringido, Zod rechaza la respuesta del LLM en el structured output — no es post-validación, es imposible por schema.

---

## 3 · Componentes en detalle

### 3.1 · `catalog-loader.ts`

Lee `docs/biblioteca-maestra-v3.1.xlsx` como fuente de verdad. En dev/build: parse una vez, cache in-memory. En prod (Supabase): se puede migrar a query, mismo shape.

**Tipos exportados:**
```typescript
export interface Exercise {
  id: string;              // "EX-FIN-001"
  name: string;            // "Suspensión asistida en regleta grande"
  category: 'fuerza-dedos' | ...;  // enum 15 valores
  objective: string;
  levelMin?: string;
  levelMax?: string;
  environment?: string;
  equipmentTokens: string[];  // subset de los 11 tokens canónicos
  executionSummary: string;
  progression: string;
  regression: string;
  riskLevel: 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high';
  stopSignals: string;
  gates: string[];         // IDs de gates asociados (por JOIN F1.3)
  sourceTrace: string;
  sprint: string;
  status: 'active' | 'manual_review' | 'draft' | 'deprecated';
}

export interface Gate {
  id: string;              // "GT-FIN-005"
  name: string;
  category: string;
  condition: string;       // condition_expression texto
  action: CanonicalAction; // enum 13 valores
  severity: 'low' | 'medium' | 'high' | 'critical';
  isWarning: boolean;
  appliesTo: string;
  reason: string;          // user_message
  requiresValidation: boolean;
}

export interface Protocol { /* con work_min_s, work_max_s, rest_min_s, ... */ }
```

**API:**
```typescript
export async function loadCatalog(): Promise<Catalog>;
export function filterByCategory(catalog: Catalog, cat: string): Exercise[];
export function findGate(catalog: Catalog, gateId: string): Gate | undefined;
```

### 3.2 · `gate-evaluator.ts`

**Regla clave** (del canónico): "la condición actual manda, no los años".

Para GC-001 con `hang25mm = 5s < 15s`, la regla Eva López activa `GT-FIN-005` y similares → **NO dead-hangs analíticos ni MaxHangs**.

**API:**
```typescript
export interface Profile {
  age: 'u16' | 'adult';
  climbingTime: 'start' | 'less1' | '1to3' | 'more3';
  hang25mmSeconds: number | null;
  maxPullupReps: number | null;
  currentFingerPain: number;   // 0-10
  currentShoulderPain: number;
  currentElbowPain: number;
  injuries: string[];
  equipment: string[];
  character: 'bill' | 'senda';
}

export interface GateResult {
  gateId: string;
  action: CanonicalAction;
  candidateState: 'BLOCKED' | 'MANUAL_REVIEW' | 'ADAPTED' | 'HELD' | 'ELIGIBLE';
  reason: string;
}

export function evaluateGate(gate: Gate, profile: Profile): GateResult | null;
```

**Estrategia condition_expression → código**: parser mini-DSL que soporta:
- `field = value`, `field != value`, `field < N`, `field >= N`
- `AND`, `OR`
- `field IN [a, b, c]`

Suficiente para las 30 condiciones GT-FIN observadas.

### 3.3 · `restrict-pool.ts`

**API:**
```typescript
export function restrictPool(
  exercises: Exercise[],
  gates: Gate[],
  relationships: Relationship[],
  profile: Profile,
  focus: FocusObject,
): { eligible: string[]; blocked: { id: string; gateId: string; reason: string }[] };
```

**Reglas**:
1. Filtro `status=active` (nunca `manual_review` o `draft`)
2. Filtro `riskLevel ≤ focusMaxRisk` (para reconstrucción: `medium` como techo)
3. Para cada ejercicio: consultar gates asociados via `relationships.filter(r.from_id === ex.id)`; evaluar cada gate; si algún gate devuelve BLOCKED → excluir; si MANUAL_REVIEW → excluir del automático.
4. Reglas §1.x/§5.x del brain viejo (reutilizadas): u16, <2 años práctica, dolor activo.

### 3.4 · `prompt-builder.ts`

**API:**
```typescript
export function buildSlicePrompt(
  eligibleIds: string[],
  focus: FocusObject,
  nExercises: number,
): { prompt: string; schema: z.ZodSchema };
```

**Prompt template** (~50-80 líneas, corto):
```
Sos Bill, coach de escalada. Diseña UNA sesión de reconstrucción de dedos.

POOL PERMITIDO (elige exactamente {N} IDs de esta lista, ni uno más ni uno menos):
- EX-FIN-001 · Suspensión asistida en regleta grande · risk medium
- EX-FIN-005 · Suspensión con pies en el suelo · risk medium
- ...

REGLA DE ORO: NO propongas IDs fuera del pool. NO inventes nombres.
Solo devuelve IDs + sets/reps/rest/notes.
```

**Schema** — Zod con `z.enum([...eligibleIds])`:
```typescript
z.object({
  exercises: z.array(z.object({
    exerciseId: z.enum([...eligibleIds] as [string, ...string[]]),
    sets: z.number().int().positive(),
    reps: z.string(),   // libre: "5" o "3-5" o "AMRAP"
    rest: z.string(),
    notes: z.string().max(200),
  })).length(nExercises),
})
```

### 3.5 · `assembler.ts`

```typescript
export interface AssembledExercise {
  exerciseId: string;
  name: string;               // del catálogo
  execution: string;          // catálogo · execution_summary
  progression: string;        // catálogo
  regression: string;         // catálogo
  stopSignals: string;        // catálogo
  riskLevel: string;
  gates: string[];            // IDs de gates activados (info para UI)
  sets: number;               // del LLM
  reps: string;               // del LLM
  rest: string;               // del LLM
  llmNotes: string;           // del LLM (personalización)
  dosageNotes: string;        // del catálogo (protocolo) — "buffer casi 0", etc.
}

export function assemble(
  llmResponse: LlmResponse,
  catalog: Catalog,
): AssembledExercise[];
```

---

## 4 · GC-001 · caso Giuliana

**Input (perfil):**
```json
{
  "age": "adult",
  "climbingTime": "more3",
  "hang25mmSeconds": 5,
  "maxPullupReps": 3,
  "currentFingerPain": 0,
  "currentShoulderPain": 0,
  "currentElbowPain": 0,
  "injuries": [],
  "equipment": ["gym", "hangboard", "home"],
  "character": "bill"
}
```

**Focus esperado** (del GoldenCases del v3.0):
```json
{
  "phase": "reconstruccion",
  "primary_priority": "Tolerancia y técnica en muro",
  "secondary_priority": "Dedos asistidos",
  "avoid": ["Máximos", "Borde mínimo", "Lastre"],
  "narrative": "Tu historial no define tu condición actual; reconstruimos desde donde estás."
}
```

**Contenido permitido** (según GC-001):
- Dedos asistidos ✅
- Técnica en muro ✅
- Complemento compatible con roca ✅

**Must NOT happen**:
- ❌ MaxHangs
- ❌ Borde mínimo
- ❌ Interpretar 10 años como permiso

**Pool esperado** (verificado en la auditoría):
Del pool total (62), tras aplicar `status=active + risk ≤ medium + GT-FIN-005 (hang<15s bloquea dead-hangs analíticos)`, deberían quedar ~10-14 IDs elegibles.

Ejemplos esperados en el pool restringido:
- EX-FIN-001 (Suspensión asistida en regleta grande)
- EX-FIN-005 (Suspensión con pies en el suelo)
- EX-FIN-050 (Hangboard técnico de hombros activos)
- EX-FIN-047 (Extensión de dedos con banda) · antagonista

Ejemplos que NO deben aparecer:
- EX-FIN-006+ típicos MaxHangs
- Cualquier `risk=high` sin manual_review

---

## 5 · Cierre F2 · criterios de aceptación

1. **Pool restringido para GC-001**: 8-14 IDs elegibles, todos `risk ≤ medium`, ninguno con action=BLOCK activada.
2. **Plan generado**: 3-5 ejercicios elegidos por el LLM del pool, con dosis personalizada + copy narrativo Bill.
3. **Fail-closed verificado**: si el LLM devuelve un ID fuera del pool, el structured output de OpenAI lo rechaza (Zod enum falla). Test que fuerza esto con mock.
4. **GoldenCase output**:
   - `focus.phase === 'reconstruccion'`
   - Ningún ejercicio con `MaxHang` o similar en el nombre
   - Todos los ejercicios seleccionados presentes en el pool restringido
5. **Suite verde**: gate-evaluator (unit), restrict-pool (unit), assembler (unit), gc-001-end-to-end (integration)

---

## 6 · Fuera de alcance de Fase 2

- Persistencia del plan (Supabase) — Fase 4
- UI para consumir el PlanSlice — Fase 4
- Regeneración por check-in — v2
- Las 14 categorías restantes — Fase 4
- Coach panel — Visión

Fase 2 produce un test end-to-end verde con el pool restringido correcto y el plan armado desde catálogo, ejecutable con `npm test`.
