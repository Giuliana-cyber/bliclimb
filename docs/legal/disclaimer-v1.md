# Disclaimer BilClimb · v1

**Aprobado por Giuliana 2026-07-21.** Aplicable a lanzamiento v1 gratis.

## Encuadre general

**BilClimb no es un servicio de salud.** Bill (y Senda) son personajes que representan una inteligencia entrenadora en escalada. **No diagnostican, no tratan, y no reemplazan atención médica profesional.** Toda la información y sugerencias que produce la app son de carácter educativo y de entrenamiento.

## Edad mínima

**BilClimb v1 no está disponible para menores de 16 años.** Durante el onboarding, si declaras una edad menor a 16, no completas el registro. Bloqueo automático, mensaje cálido: *"BilClimb está pensado para escaladores de 16 años en adelante. Cuando cumplas 16 podemos armar tu plan."*

**Razón**: los rangos de carga y las decisiones de dosificación del motor no están calibradas para poblaciones pediátricas o adolescentes en fases sensibles de crecimiento óseo. La curación editorial se hizo con rangos de adultos.

## Derivación profesional

Cuando reportas dolor en `/dolor`, si la intensidad es **7 o mayor**, la app te lleva a una pantalla de "Hablemos" que:

- Reconoce lo que sientes con lenguaje cálido, no clínico.
- Te ofrece **opciones seguras alternativas** (movilidad suave, respiración, cuidado post-sesión).
- Te enmarca la sugerencia: *"Un dolor así merece que lo revise un profesional pronto. Mientras tanto, nada que cargue la zona."*
- **No nombra un aliado profesional específico.** El copy es genérico: "consulta a un profesional de salud". Si en el futuro cerramos una red de aliados, actualizamos.

Si la intensidad es menor a 7 pero el dolor persiste, el mensaje es: *"Si sigue molestando en 48 horas, consulta a un profesional de salud."*

## Chat

El chat con Bill/Senda **jamás da consejo médico**. Cualquier mensaje del usuario que contenga las palabras clave `duele`, `dolor`, `lesión`, `lastim`, `molestia`, `inflam` (ver `isPainMessage()` en `app/chat-v2/ChatView.tsx`) redirige inmediatamente a `/dolor` — sin generar respuesta LLM.

## Datos personales

- **Datos capturados en el onboarding**: nombre (opcional), edad (rango), grado, hang, dominadas, equipo, estilos, lesiones activas, dolor actual, embarazo (solo "no aplica / sí"), energía.
- **Almacenados en Supabase** (`profiles` + `session_events`). Solo el usuario ve sus propios datos (Row Level Security activa).
- **Nunca compartidos** con terceros ni usados para publicidad.
- **Copy en pantalla de energía**: *"Solo Bill y Senda leen esto. Nadie más."*

## Modelo económico

**v1 se lanza gratis.** No hay cobrador, no hay país de facturación aún. La superficie de suscripción existe en el código pero está desactivada. Se activa en fast-follow con precios en MXN reales.

## Contacto

- **Belay Partners** · empresa detrás de BilClimb · dueña de la marca.
- Email de contacto y soporte: `belaypartnersorg@gmail.com`.
- No hay dirección física publicada (empresa remota).

## Cambios de estos términos

Cualquier cambio material a este disclaimer (edad mínima, política de derivación, monetización) debe registrarse aquí como `disclaimer-v{N+1}.md` con fecha, y el usuario existente debe ver un banner de notificación en `/hoy` cuando entre después del cambio.
