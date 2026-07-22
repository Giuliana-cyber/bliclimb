/**
 * Perfil · #19 · Fase 4 UI · Batch 4.
 *
 * Accedido desde el engrane (top bar de Hoy/Plan/Progreso/Sesion).
 * Con back button, sin nav inferior.
 * Secciones (Giuliana 2026-07-21):
 *   - Mi coach (cambiar Bill/Senda)
 *   - Mi perfil (grado · dedos · lesión — editar lesión re-gatea el motor)
 *   - Preferencias (notificaciones · idioma · datos)
 *   - Suscripción
 *   - Cuenta (cerrar sesión · borrar cuenta)
 */

import { PerfilView } from './PerfilView';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function PerfilPage() {
  return (
    <PerfilView
      character="bill"
      profile={{
        grado: 'V4-V6',
        colgado25mm: 5,
        pullups: 3,
        lesionActiva: false,
        equipo: ['gym', 'hangboard', 'home', 'bands', 'weights'],
      }}
    />
  );
}
