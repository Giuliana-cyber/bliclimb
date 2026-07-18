---
name: BilClimb
colors:
  surface: '#fef9ef'
  surface-dim: '#dedad0'
  surface-bright: '#fef9ef'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3e9'
  surface-container: '#f2ede3'
  surface-container-high: '#ede8de'
  surface-container-highest: '#e7e2d8'
  on-surface: '#1d1c16'
  on-surface-variant: '#3f4944'
  inverse-surface: '#32302a'
  inverse-on-surface: '#f5f0e6'
  outline: '#6f7974'
  outline-variant: '#bec9c2'
  surface-tint: '#176b52'
  primary: '#0a644b'
  on-primary: '#ffffff'
  primary-container: '#2f7d63'
  on-primary-container: '#d2ffea'
  inverse-primary: '#89d6b7'
  secondary: '#b12b23'
  on-secondary: '#ffffff'
  secondary-container: '#fd6253'
  on-secondary-container: '#650003'
  tertiary: '#755000'
  on-tertiary: '#ffffff'
  tertiary-container: '#956700'
  on-tertiary-container: '#fff3e5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a5f2d2'
  primary-fixed-dim: '#89d6b7'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513c'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4aa'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#8f100e'
  tertiary-fixed: '#ffdeac'
  tertiary-fixed-dim: '#fcbb44'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#fef9ef'
  on-background: '#1d1c16'
  surface-variant: '#e7e2d8'
typography:
  display-lg:
    fontFamily: Nunito Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Nunito Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Nunito Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Nunito Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Nunito Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 20px
  margin-desktop: 40px
  gutter: 16px
  card-padding: 24px
  touch-target: 48px
  button-height: 52px
---

# DESIGN.md — BilClimb (by Belay Partners)

> Línea gráfica / identidad visual de la app. Pegar o subir en herramientas de diseño (Stitch, tools de DESIGN.md, etc.). Referencia para dev y diseñador. Adjuntar: logo BilClimb (cerebro dorado) + Bill.png + Senda.png.

## Product
BilClimb is a mobile-first (Android-first PWA) climbing-training coach app for
Spanish-speaking climbers in Mexico and Latin America. An AI coach reads the
user's **current condition — not their years of experience** — and delivers a
safe, personalized climbing plan, explained in plain, warm language. All UI copy
is in **Mexican Spanish (use "tú")**, never clinical, no jargon.

## Brand personality
Warm, honest, encouraging. A trusted friend who happens to be a great coach — a
mountain guide in your pocket, not a hardcore gym. Celebrates consistency, never
glorifies pain or intensity. Safety first. Every recommendation can answer
"¿por qué esto hoy?".

**Tagline (hero):**
> **Nunca entrenas solo.**
> Una inteligencia que te acompaña en tu entrenamiento de escalada: lee cómo estás hoy, arma tu plan y sabe cuándo cuidarte.

**Two coach personas (same app, user chooses one):**
- **Bill** — direct, clear, reassuring. Guides you.
- **Senda** — introspective, "juntas" framing, process-as-discovery. Accompanies you.

Voice examples:
- Bill: *"Hoy dedos asistidos, no a tope. Con 5s en 25mm tu mejor entrenamiento todavía es escalar — esto es exposición con margen."*
- Senda: *"Hoy vamos a escuchar tus dedos. Colgados suaves, con margen — no se trata de aguantar, sino de construir. Vamos viendo juntas cómo responde tu cuerpo."*

## Color palette
| Token | Hex | Use |
|---|---|---|
| `green/primary` | `#2F7D63` | Primary brand, headers, primary buttons |
| `green/deep` | `#24614D` | Dark surfaces, pressed states |
| `red/energy` | `#D6463A` | Energy accent, CTAs, streaks |
| `amber/gold` | `#F2B23C` | Achievements, highlights, badges, logo |
| `cream/base` | `#F2EDE3` | App background (light, warm) |
| `wood/tan` | `#CDA96E` | Warm accents, illustration surfaces |
| `navy/senda` | `#21395A` | Senda's secondary accent (progress/growth, her chat) |
| `ink` | `#241F1C` | Text and illustration outlines |

Light theme by default — warm, never sterile. (Dark variant optional: deep green
`#24614D` background, cream text.)

## Typography
Friendly rounded geometric sans-serif (Nunito Sans / Poppins vibe). Large, highly
legible, clear hierarchy. Headings bold and warm; body comfortable for Spanish.

## Component consistency (apply on EVERY screen)
- **Buttons:** all share ONE height (~52px) and ONE corner radius. Primary = filled
  red `#D6463A`, full-width; secondary = outlined green, SAME size; tertiary = text
  button. Never vary button sizes arbitrarily.
- **Spacing:** one 8 / 16 / 24 px scale, used consistently.
- **Cards & chips:** one card corner radius + padding; one chip size. Reuse the same
  components at the same sizes across all screens.
- **Type:** one scale — headline / body / label — reused everywhere. One icon size.
- **Goal:** every screen must look like the same app. No arbitrary size differences.

## Layout & shape language
Generous rounded corners, chunky pill buttons, card-based layout, lots of breathing
room, soft shadows. Mobile-first, one-handed. Avoid the cold corporate SaaS /
fintech look — warm, outdoorsy-but-modern, a little playful, trustworthy.

## Iconography & illustration
Simple line icons with rounded ends. Warm **flat-vector spot illustrations** in
the mascots' exact style (bold clean dark outlines, flat colors, soft shading,
sticker-like) for empty states, onboarding, and achievements.

## Signature motif
Progress shown as a **mountain path / chapters**: the week is a titled chapter
(e.g. "Entrada controlada"), sessions are steps up the path. Consistency streaks
(never intensity) as small warm badges.

## Brand marks, mascots & logo (three DISTINCT marks — don't mix them)
- **BilClimb app logo:** a **gold circuit-board brain** icon (represents "una
  inteligencia que te acompaña"). This is the primary app mark — use with the
  "BilClimb" wordmark in the header and as the app icon. Attach the uploaded PNG.
- **Belay Partners logo:** a circular line-art belayer/climber emblem — the PARENT
  brand. Small, secondary ("BilClimb by Belay Partners"). Appears on the mascots'
  helmets/hoodies.
- **Coaches (mascots):** **Bill** (male climber, green helmet with round golden Belay
  Partners badge, red hoodie, holds hangboard + "PLAN" notebook) and **Senda**
  (female climber, green helmet with golden headlamp, ponytail, gold hoops, red
  hoodie, holds hangboard + navy "PLAN · ENTRENA · PROGRESA" notebook). Use the exact
  uploaded Bill.png / Senda.png as avatars on every screen — bold flat-vector style,
  never generic / watercolor / realistic.

## Key screens (MVP)
1. **Onboarding conversacional** — 4 momentos + momento seguridad (semáforo).
2. **Hoy** — ONE clear decision for today, its "por qué", big "Empezar sesión".
3. **Sesión** — exercise cards + "¿Algo te duele hoy?" line + "¿por qué?" + regression + timer.
4. **Semana como capítulo** (Plan) — mountain path, chapter, streak, "tú eliges cuándo".
5. **Progreso / retest** — progress as story; retest as celebration, not exam.
6. **Chat con Bill/Senda** — warm bubbles, quick-reply chips, contextual answers.

## Accessibility
High contrast text on cream, large tap targets, legible type sizes, Android-first
and offline-friendly. Never rely on color alone.

## Do / Don't
- DO: warm, human, encouraging, safe, plain Spanish, consistent components.
- DON'T: cold corporate SaaS look, jargon, glorifying intensity, shaming missed days,
  generic mascot avatars, inconsistent button sizes.