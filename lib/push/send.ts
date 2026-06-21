// Helper server-side para mandar Web Push a un usuario.
//
// Lee `push_subscriptions` del usuario, encripta el payload con sus
// claves p256dh/auth y manda HTTP POST al endpoint del browser via la
// librería `web-push` con VAPID.
//
// Si el endpoint devuelve 410 Gone (sub expirada / removida del browser)
// borramos la fila de la DB.
import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export type PushPayload = {
  title: string;
  body: string;
  /** URL a abrir cuando el usuario clickea la notificación. */
  url?: string;
  /** Tag para dedup en el OS (mismo tag = nueva reemplaza vieja). */
  tag?: string;
};

/**
 * Lee las env vars VAPID en cada llamada (no cachea) y aplica
 * setVapidDetails. Devuelve false si falta alguna.
 *
 * No cacheamos el flag porque queremos detectar cambios de env vars en
 * runtime (caso típico: env hot-swap o tests que re-stubean env).
 */
function configureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/**
 * Lee las subs del usuario y manda push a cada una.
 *
 * - Si `web-push` falla con 404/410 (sub muerta), se borra de la DB.
 * - Otros errores se loguean pero no rompen el flujo (best-effort).
 *
 * Devuelve { sent, failed, removed } para logging desde los crons.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  client: SupabaseClient = createAdminClient()
): Promise<{ sent: number; failed: number; removed: number }> {
  if (!configureVapid()) {
    console.log(
      JSON.stringify({
        kind: 'push_send_skip',
        reason: 'vapid_not_configured',
        userId
      })
    );
    return { sent: 0, failed: 0, removed: 0 };
  }

  const { data: subs, error } = await client
    .from('push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('profile_id', userId);
  if (error) throw new Error(`sendPushToUser read failed: ${error.message}`);

  const rows = (subs ?? []) as Array<{
    id: string;
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
  }>;
  if (rows.length === 0) return { sent: 0, failed: 0, removed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
          },
          body
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode ?? 0;
        if (status === 404 || status === 410) {
          // Sub muerta — borrar.
          await client.from('push_subscriptions').delete().eq('id', sub.id);
          removed += 1;
        } else {
          failed += 1;
          console.log(
            JSON.stringify({
              kind: 'push_send_failed',
              userId,
              endpoint: sub.endpoint.slice(0, 60),
              status,
              message: err instanceof Error ? err.message : 'unknown'
            })
          );
        }
      }
    })
  );

  return { sent, failed, removed };
}

/**
 * Helper que devuelve la public key VAPID al cliente para que se suscriba.
 * Usado por el componente PushOptIn. Si no está configurada, retorna null.
 */
export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}
