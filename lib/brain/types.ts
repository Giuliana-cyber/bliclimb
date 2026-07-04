// Tipos base del middleware de seguridad (Doc 02).
//
// Un módulo de reglas produce Verdicts; el validator los acumula en un
// BlockingContext. Un consumidor futuro (section-02 para filtrar catálogo,
// integración con generate-plan) lee el BlockingContext y decide qué mostrar
// al usuario / qué pasar al LLM.
//
// Diseño clave: section-01 emite CATEGORÍAS semánticas ("hangboard",
// "campus"), no IDs del catálogo. La traducción categoría → ejercicio
// concreto vive en section-02.

// -------------------- Categorías bloqueables --------------------
//
// Nombres estables. Cambiarlos requiere update en el mapping de section-02.
// Vienen del texto de Doc 02 §1.1 y §1.2.
export type BlockedCategory =
  | 'hangboard'              // canal Hangboard/Fingerboard general (§1.1)
  | 'hangboard-intense'      // MaxHangs, IntHangs, Repeaters (§1.2)
  | 'campus'                 // canal Campus Board (prefijo CB-) (§1.1, §1.2)
  | 'full-crimp'             // técnica full crimp / regletas pequeñas (§1.1)
  | 'hit'                    // FM-014 HIT y variantes (§1.1, §1.2)
  | 'pullups-weighted'       // dominadas con lastre (§1.2)
  | 'max-tests'              // tests máximos (Sec 2.5, referenciado en §1.2)
  | 'finger-training-any';   // "carga directa de dedos" cubre-todo (§1.1)

// -------------------- Zonas anatómicas (para §1.3 dolor 3+) --------------------
//
// Sub-fase 1 cubre solo las 3 zonas con escala 0-10 en el perfil actual.
// Muñeca y cuello (mencionados en Doc 02 §1.3) NO tienen campo y quedan
// como deuda documentada en canonicalization-debt.md.
export type BlockedZone = 'fingers-pulleys' | 'elbow' | 'shoulder';

// -------------------- Verdict --------------------
//
// Un módulo emite un Verdict por cada regla que se dispara. En sub-fase 1
// solo hay 'block-categories' (para 1.1 y 1.2) y 'block-zone' (para 1.3).
// 'block-all' queda para 1.5 embarazo (diferido a v2).
export type Verdict =
  | {
      kind: 'block-categories';
      rule: string;            // '1.1', '1.2'
      categories: BlockedCategory[];
      userMessage: string;     // verbatim del Doc 02
      source: string;          // 'López-Rivera 2021; Saeterbakken et al. 2024'
    }
  | {
      kind: 'block-zone';
      rule: string;            // '1.3'
      zone: BlockedZone;
      userMessage: string;
      source: string;
    };

// -------------------- BlockingContext --------------------
//
// Estado acumulado tras correr todos los módulos habilitados. Consumidores
// futuros lo usan como filtro. Sub-fase 1 solo lo devuelve y testea.
export type BlockingContext = {
  blockedCategories: Set<BlockedCategory>;
  blockedZones: Set<BlockedZone>;
  derivationMessages: string[];
  ruleHits: Array<{ rule: string; kind: Verdict['kind'] }>;
};

// -------------------- Perfil mínimo para reglas --------------------
//
// Subset explícito de UserProfile para desacoplar tests y evitar
// dependencia circular con lib/profile.ts.
export type ProfileForRules = {
  age: string;                  // bucket: 'u16' | '16-25' | '26-35' | '36-45' | '46+' | ''
  climbingTime: string;         // bucket: 'start' | 'less1' | '1to3' | 'more3' | ''
  currentFingerPain: number;    // 0..10
  currentShoulderPain: number;  // 0..10
  currentElbowPain: number;     // 0..10
};

// -------------------- RuleModule --------------------
export interface RuleModule {
  readonly section: string;     // 'section-01'
  readonly ruleIds: readonly string[]; // ['1.1', '1.2', '1.3']
  check(profile: ProfileForRules): Verdict[];
}

// -------------------- Logging --------------------
export type BlockLogEvent = {
  section: string;
  rule: string;
  profileId: string | null;
  kind: Verdict['kind'];
  categories?: BlockedCategory[];
  zone?: BlockedZone;
  timestamp: string;
};

export interface LogSink {
  logBlock(event: BlockLogEvent): void;
}
