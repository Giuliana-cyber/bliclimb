// Verificación de auth para endpoints invocados por Vercel Cron.
// Vercel manda el secret como `Authorization: Bearer <token>`.

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization');
  if (!header) return false;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  return token.trim() === secret;
}
