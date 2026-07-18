# BilClimb · Design Definition of Done (checklist pre-ship)

Para el dev: corre esta lista contra CADA pantalla ANTES de mandar el batch a revisión de diseño. Si todo pasa, nos saltamos el ping-pong pantalla por pantalla. Es el contrato visual del MVP — derivado del DESIGN.md y de las decisiones ya tomadas.

Congelada por Giuliana el 2026-07-18. Cualquier cambio a la lista tiene que ser una edición explícita a este archivo, no una interpretación del dev.

## Color & tokens

- [ ] Todo color sale de los 8 tokens de la paleta. CERO hex hardcodeado por pantalla.
- [ ] CTA primario = token `bil-red` (`#D6463A`). El MISMO en todas las pantallas.
- [ ] Fondo = `bil-cream`. `bil-gold` solo en logro / badge / callout "¿por qué esto hoy?".
- [ ] Un solo sistema de tokens (nada de `bil-*` + Material Design 3 en paralelo).

## Botones & componentes

- [ ] Botones: misma altura (~52px) + mismo radio en toda la app.
- [ ] Primary = rojo lleno full-width. Secondary = verde outline, MISMO tamaño.
- [ ] Cards / chips / íconos: un solo tamaño reusado. Spacing solo 8 / 16 / 24.

## Coach & marca

- [ ] Avatar = `bill-avatar` / `senda-avatar` FINAL (pecho arriba, sin props), idéntico en toda pantalla. El de Hoy debe ser igual al de Welcome.
- [ ] Avatar SIEMPRE sobre superficie crema/blanca. Nunca sobre verde.
- [ ] Wordmark "BilClimb" (una L). Personaje "Bill" (dos L) en el copy.
- [ ] 3 marcas separadas: cerebro dorado (app) / emblema circular (Belay Partners) / coaches.

## Voz & copy

- [ ] Español mexicano, "tú", cálido. CERO tercera persona clínica ("el atleta", "su X").
- [ ] CERO jerga interna del motor en pantalla ("fase", "techo", "category", "medium").
- [ ] Celebra constancia (incluye descanso). Nunca intensidad ni vergüenza por días perdidos.

## Navegación

- [ ] Nav inferior = 4 items: Hoy · Plan · Progreso · Chat. Perfil va al engrane arriba-der.
- [ ] La pantalla de progreso se titula "Progreso" (nunca "Tu Perfil").

## Reglas por-pantalla especiales

- [ ] Grado (onboarding): toggle Boulder (V-scale) / Ruta (YDS) / "No sé" que cambia los chips.
- [ ] Semáforo seguridad: Verde/Ámbar/Rojo, cálido, nunca alarmante.
- [ ] Retest: enmarcado como celebración, no examen.

## Antes de mandar a review

- [ ] Screenshot mobile 375×812 de CADA pantalla del batch, juntas (para revisión cruzada).
