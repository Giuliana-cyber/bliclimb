// Derivaciones clínicas de Senda — 3 mensajes VERBATIM aprobados por
// Giuliana 2026-07-07 (mensajes-tono-belay-partners.md).
//
// FUENTE ÚNICA DE VERDAD. Estos textos NO pasan por el LLM — se sirven
// determinísticamente por el servidor cuando el detector correspondiente
// dispara. El LLM solo puede agregar UNA línea de calidez ANTES del núcleo
// (opción A del compositor híbrido). El cuerpo del mensaje va literal.
//
// Consumidores:
//   - senda-derivation-orchestrator.ts (chat runtime — señales de ciclo)
//   - section-01-profile-filters.ts vía section-01.ts activePainSenda
//     (perfil — dolor ≥3/10 con character='senda')
//
// PROHIBIDO editar sin coordinar con Giuliana. Cualquier cambio afecta
// el tono de un momento crítico (RED-S, amenorrea, dolor severo).

export const SENDA_DERIVATION_1_RED_S =
  'Gracias por contarme esto — y me alegra que lo notes, porque es importante. ' +
  'Que el ciclo desaparezca cuando subes la carga de entrenamiento no es algo para ' +
  'dejar pasar ni para resolver acá entre nosotras: es una señal de que tu cuerpo ' +
  'puede estar bajo más estrés del que puede sostener, y eso lo tiene que ver un ' +
  'profesional de salud. No es para asustarte, es para cuidarte. Mientras tanto ' +
  'seguimos con tu escalada, pero este tema vale una consulta de verdad.';

export const SENDA_DERIVATION_2_AMENORRHEA =
  'Gracias por confiarme esto. Que la menstruación no aparezca por varios meses es ' +
  'de esas cosas que conviene mirar con alguien de salud — no para alarmarte, sino ' +
  'porque tu cuerpo te está contando algo y vale la pena entender qué. No es un ' +
  'tema para resolver solo con el entrenamiento. Yo te acompaño con tu escalada ' +
  'como siempre, pero esto merece una consulta con un profesional que pueda verte ' +
  'de verdad.';

export const SENDA_DERIVATION_3_SEVERE_PAIN =
  'Eso que me cuentas no suena a molestia normal, y no quiero que lo aguantes como ' +
  'si lo fuera. Un dolor que te frena o que es fuerte de verdad lo tiene que ver ' +
  'un profesional de salud — no es algo que debamos manejar acá entre las dos. ' +
  'Seguimos con tu entrenamiento en lo que puedas, pero por favor no dejes pasar ' +
  'ese dolor. Que alguien lo revise es cuidarte, no exagerar.';

export type SendaDerivationKind = 'red-s' | 'amenorrhea' | 'severe-pain';

export function getSendaDerivation(kind: SendaDerivationKind): string {
  switch (kind) {
    case 'red-s':
      return SENDA_DERIVATION_1_RED_S;
    case 'amenorrhea':
      return SENDA_DERIVATION_2_AMENORRHEA;
    case 'severe-pain':
      return SENDA_DERIVATION_3_SEVERE_PAIN;
  }
}
