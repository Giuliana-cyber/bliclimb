// Orquestador de hints reactivos del chat — §10.3 (sickness) + §10.4
// (seven-try). Función pura sin IO; corre en <1ms sobre el último mensaje
// del usuario.
//
// Corre DESPUÉS de §3.15 (checkWeightDerivation). Si §3.15 derivó, este
// orquestador no debe correr — Bill quedó silenciado y la respuesta fija
// ya salió. La precedencia se implementa en el caller (chat/route.ts),
// no acá.
//
// Diferencia semántica con §3.15:
//   §3.15 → derive/silencio total + mensaje fijo (regla dura, no negociable).
//   §10.3/§10.4 → hint injection: Bill responde en su voz con constraint.

import {
  detectSicknessSignal,
  type SicknessSignal
} from '../detection/sickness-keywords';
import {
  detectHighAttemptCountSignal,
  type AttemptCountSignal
} from '../detection/project-attempts-keywords';
import {
  buildAttemptsHint,
  buildSicknessHighHint,
  buildSicknessMildHint
} from '../messages/section-10-hints';

export type ChatHintLogEvent =
  | {
      kind: 'chat-hint-injected';
      rule: '10.3';
      severity: 'mild-symptoms' | 'high-symptoms';
      matched: string[];
      timestamp: string;
    }
  | {
      kind: 'chat-hint-injected';
      rule: '10.4';
      numericCount: number;
      matched: string;
      timestamp: string;
    };

export type ChatHintsResult = {
  /** Strings a inyectar como system message adicional al prompt de Bill.
   *  Vacío si nada disparó. Puede haber 1 o 2 (§10.3 y/o §10.4). */
  hints: string[];
  /** Eventos estructurados para console.log (JSON). No usa ConsoleLogSink
   *  porque estos no son "blocks" — son hints informacionales. */
  logEvents: ChatHintLogEvent[];
};

/**
 * Ejecuta detección de §10.3 + §10.4 sobre el último mensaje del usuario
 * y arma los hints + eventos de log.
 *
 * Puramente sync (sin llamadas LLM). Sirve como red rápida entre §3.15
 * (más caro por el classifier) y la llamada a Bill (streaming).
 */
export function checkChatHints(userMessage: string): ChatHintsResult {
  const hints: string[] = [];
  const logEvents: ChatHintLogEvent[] = [];
  const ts = new Date().toISOString();

  const sickness: SicknessSignal | null = detectSicknessSignal(userMessage);
  if (sickness) {
    if (sickness.kind === 'high-symptoms') {
      hints.push(buildSicknessHighHint(sickness.matched));
    } else {
      hints.push(buildSicknessMildHint(sickness.matched));
    }
    logEvents.push({
      kind: 'chat-hint-injected',
      rule: '10.3',
      severity: sickness.kind,
      matched: sickness.matched,
      timestamp: ts
    });
  }

  const attempts: AttemptCountSignal | null =
    detectHighAttemptCountSignal(userMessage);
  if (attempts) {
    hints.push(buildAttemptsHint(attempts.numericCount));
    logEvents.push({
      kind: 'chat-hint-injected',
      rule: '10.4',
      numericCount: attempts.numericCount,
      matched: attempts.matched,
      timestamp: ts
    });
  }

  return { hints, logEvents };
}
