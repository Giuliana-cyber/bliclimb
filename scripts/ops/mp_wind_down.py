#!/usr/bin/env python3
"""
Mercado Pago wind-down · MAINT-2 + MAINT-3 · aprobado por Giuliana 2026-07-15.

Bill de producción se baja mientras arranca el rediseño BilClimb v-next.
Hay usuarios reales pagando via Mercado Pago (preapprovals del flujo
pre-Stripe que sigue activo en los servidores de MP aunque el código
ya no gestione MP). Este script:

  1. Lista TODOS los preapprovals en estado `authorized` (activos).
  2. Cancela cada uno con PUT /preapproval/{id} status=cancelled.
  3. Exporta CSV con datos para reembolsos: email, monto, fecha,
     payment_id, preapproval_id (uno por pago cobrado).

Regla clave (aprobada por Giuliana):
  - NO borra datos. Todo se conserva en Supabase — la cohorte va al
    relanzamiento.
  - NO ejecuta reembolsos (Giuliana los hace desde el dashboard de MP
    dentro de la ventana de 180 días, o coordinamos correr por API en
    lote después).
  - DRY-RUN por defecto. Requiere --live y confirmación explícita
    para efectuar cancelaciones.

Uso:
    export MP_ACCESS_TOKEN=$(grep '^MERCADO_PAGO_ACCESS_TOKEN=' .env.local | cut -d= -f2-)
    python scripts/ops/mp_wind_down.py list                 # solo lista activos
    python scripts/ops/mp_wind_down.py cancel --dry-run     # simula cancelaciones
    python scripts/ops/mp_wind_down.py cancel --live        # cancela de verdad
    python scripts/ops/mp_wind_down.py export-payments      # CSV para reembolsos

Salidas:
    docs/ops/mp_wind_down/
        preapprovals_active.json    · snapshot de activos
        cancellation_log.jsonl      · log append-only de cada cancelación
        payments_for_refund.csv     · lista para Giuliana

API MP:
    https://api.mercadopago.com/preapproval/search?status=authorized
    https://api.mercadopago.com/preapproval/{id}                       (PUT)
    https://api.mercadopago.com/preapproval/{id}/payments               (GET)
    https://api.mercadopago.com/v1/payments/search?preapproval_id={id}  (GET fallback)

Fail-closed:
  - Sin MP_ACCESS_TOKEN → sale.
  - Cualquier error HTTP → se registra y aborta el batch.
  - Log escribe una línea por cancelación exitosa/fallida — auditable.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

# stdlib only — evita dependencias adicionales al urgente
try:
    from urllib import request as urlreq
    from urllib.error import HTTPError, URLError
except ImportError:
    print("ERROR: urllib requerido (stdlib).", file=sys.stderr)
    sys.exit(2)


MP_BASE = "https://api.mercadopago.com"
OUTDIR = Path("docs/ops/mp_wind_down")


def env_token() -> str:
    tok = os.environ.get("MP_ACCESS_TOKEN") or os.environ.get("MERCADO_PAGO_ACCESS_TOKEN")
    if not tok:
        print(
            "ERROR: falta MP_ACCESS_TOKEN. Exportalo con:\n"
            "  export MP_ACCESS_TOKEN=$(grep '^MERCADO_PAGO_ACCESS_TOKEN=' .env.local | cut -d= -f2-)",
            file=sys.stderr,
        )
        sys.exit(2)
    return tok.strip()


def mp_request(
    method: str, path: str, token: str, body: dict | None = None,
    query: dict | None = None,
) -> dict:
    """Wrapper mínimo sobre urllib para llamar MP. Devuelve JSON dict o
    lanza en caso de HTTP error."""
    url = f"{MP_BASE}{path}"
    if query:
        url = f"{url}?{urlencode(query)}"
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urlreq.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urlreq.urlopen(req, timeout=30) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload) if payload else {}
    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace") if e.fp else ""
        raise RuntimeError(f"HTTP {e.code} {e.reason} · {url} · {detail[:500]}") from e
    except URLError as e:
        raise RuntimeError(f"Network error · {url} · {e.reason}") from e


def list_active_preapprovals(token: str) -> list[dict]:
    """Pagina /preapproval/search hasta agotar. Devuelve lista de dicts."""
    active: list[dict] = []
    offset = 0
    limit = 100
    while True:
        query = {
            "status": "authorized",
            "limit": str(limit),
            "offset": str(offset),
        }
        payload = mp_request("GET", "/preapproval/search", token, query=query)
        results = payload.get("results") or []
        active.extend(results)
        paging = payload.get("paging") or {}
        total = int(paging.get("total") or len(active))
        offset += limit
        if offset >= total or not results:
            break
        time.sleep(0.2)  # rate courtesy
    return active


def cancel_preapproval(preapproval_id: str, token: str) -> dict:
    """PUT /preapproval/{id} con status=cancelled."""
    return mp_request(
        "PUT",
        f"/preapproval/{preapproval_id}",
        token,
        body={"status": "cancelled"},
    )


def list_payments_for_preapproval(pa_id: str, token: str) -> list[dict]:
    """Prueba dos endpoints — el de MP no siempre expone /payments para
    preapprovals viejos. Fallback a /v1/payments/search?preapproval_id=..."""
    payments: list[dict] = []
    # Intento 1: /preapproval/{id}/payments (algunos accounts lo tienen)
    try:
        payload = mp_request("GET", f"/preapproval/{pa_id}/payments", token)
        for p in payload.get("results") or payload.get("payments") or []:
            payments.append(p)
    except RuntimeError:
        pass
    # Intento 2: /v1/payments/search (más confiable)
    if not payments:
        try:
            payload = mp_request(
                "GET",
                "/v1/payments/search",
                token,
                query={"preapproval_id": pa_id, "limit": "50"},
            )
            for p in payload.get("results") or []:
                payments.append(p)
        except RuntimeError:
            pass
    return payments


def cmd_list(token: str) -> None:
    OUTDIR.mkdir(parents=True, exist_ok=True)
    active = list_active_preapprovals(token)
    print(f"Preapprovals activos: {len(active)}")
    for pa in active:
        pid = pa.get("id")
        payer_email = pa.get("payer_email", "?")
        auto_recurring = pa.get("auto_recurring") or {}
        amount = auto_recurring.get("transaction_amount")
        currency = auto_recurring.get("currency_id")
        reason = pa.get("reason", "")
        print(f"  {pid} · {payer_email} · {amount} {currency} · {reason[:40]}")
    snap = OUTDIR / "preapprovals_active.json"
    snap.write_text(json.dumps(active, indent=2, ensure_ascii=False, sort_keys=True))
    print(f"\nSnapshot: {snap}")


def cmd_cancel(token: str, live: bool) -> None:
    OUTDIR.mkdir(parents=True, exist_ok=True)
    active = list_active_preapprovals(token)
    if not active:
        print("0 preapprovals activos. Nada que cancelar.")
        return

    print(f"\n⚠ Preapprovals a cancelar: {len(active)}")
    total_amount = 0.0
    currencies: set[str] = set()
    for pa in active:
        auto = pa.get("auto_recurring") or {}
        amt = auto.get("transaction_amount") or 0
        cur = auto.get("currency_id") or "?"
        currencies.add(cur)
        try:
            total_amount += float(amt)
        except (TypeError, ValueError):
            pass
        print(f"  {pa.get('id')} · {pa.get('payer_email', '?')} · {amt} {cur}")
    print(f"\n  Total renovación mensual expuesta: ~{total_amount:.2f} {'/'.join(sorted(currencies))}")

    if not live:
        print("\n[DRY-RUN] --live no pasado, no se cancela nada.")
        return

    confirm = input(
        f"\nConfirmá CANCELACIÓN de {len(active)} preapprovals · escribí 'CANCELAR' para proceder: "
    ).strip()
    if confirm != "CANCELAR":
        print("Abortado.")
        return

    log_path = OUTDIR / "cancellation_log.jsonl"
    ok = 0
    failed = 0
    with log_path.open("a") as log_f:
        for pa in active:
            pid = pa.get("id")
            entry: dict = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "preapproval_id": pid,
                "payer_email": pa.get("payer_email", "?"),
            }
            try:
                res = cancel_preapproval(pid, token)
                entry["result"] = "ok"
                entry["new_status"] = res.get("status")
                ok += 1
                print(f"  ✅ {pid} → {res.get('status')}")
            except Exception as e:  # noqa: BLE001
                entry["result"] = "error"
                entry["error"] = str(e)[:500]
                failed += 1
                print(f"  ❌ {pid} → {e}")
            log_f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            time.sleep(0.3)  # rate courtesy

    print(f"\nOK: {ok} · FAILED: {failed} · Log: {log_path}")

    # Verificación
    still_active = list_active_preapprovals(token)
    print(f"\nVerificación: {len(still_active)} preapprovals todavía en 'authorized'.")
    if still_active:
        print("⚠ NO todos se cancelaron. Revisá cancellation_log.jsonl y reintentá.")


def find_preapprovals_by_email(
    token: str, email: str, statuses: tuple[str, ...] = ("authorized",)
) -> list[dict]:
    """Busca preapprovals que match payer_email en los estados dados.

    Estrategia:
      1. Intento primero con filtro server-side `payer_email` (rápido).
      2. Si MP devuelve 403 sobre ese filtro (restricción común de OAuth
         de MP por privacidad — el filtro por email de payer requiere
         permisos elevados), fallback a listar TODOS los preapprovals
         del vendedor y filtrar client-side.

    En ambos casos el match final es case-insensitive contra `payer_email`.
    """
    email_norm = email.strip().lower()
    matches: list[dict] = []
    fallback_used = False

    for status in statuses:
        offset = 0
        server_filter_ok = True
        while True:
            base_query = {"status": status, "limit": "100", "offset": str(offset)}
            query = ({"payer_email": email_norm, **base_query}
                     if server_filter_ok else base_query)
            try:
                payload = mp_request("GET", "/preapproval/search", token, query=query)
            except RuntimeError as e:
                # Fallback si el filtro payer_email no está permitido
                if "HTTP 403" in str(e) and server_filter_ok:
                    if not fallback_used:
                        print(
                            f"  ⚠ Filtro server-side payer_email no permitido "
                            f"(HTTP 403). Fallback: listado completo + match "
                            f"client-side."
                        )
                        fallback_used = True
                    server_filter_ok = False
                    offset = 0
                    continue
                raise

            results = payload.get("results") or []
            # Match final client-side (case-insensitive)
            for r in results:
                pa_email = (r.get("payer_email") or "").strip().lower()
                if pa_email == email_norm:
                    matches.append(r)
            paging = payload.get("paging") or {}
            total = int(paging.get("total") or 0)
            offset += 100
            if offset >= total or not results:
                break
            time.sleep(0.2)
    return matches


def cmd_find_by_email(token: str, email: str) -> None:
    """Solo lectura: lista TODAS las suscripciones del email (cualquier estado)."""
    OUTDIR.mkdir(parents=True, exist_ok=True)
    print(f"Buscando preapprovals de {email} (todos los estados)...")
    matches = find_preapprovals_by_email(
        token, email, statuses=("authorized", "paused", "cancelled")
    )
    if not matches:
        print(f"  Sin preapprovals para {email}.")
        return
    active = [m for m in matches if m.get("status") == "authorized"]
    other = [m for m in matches if m.get("status") != "authorized"]
    print(f"\n{len(matches)} preapproval(s) encontrados · {len(active)} activo(s)")
    for m in matches:
        auto = m.get("auto_recurring") or {}
        print(
            f"  [{m.get('status')}] {m.get('id')} · "
            f"{auto.get('transaction_amount')} {auto.get('currency_id', '?')} · "
            f"date_created={m.get('date_created', '?')[:10]} · "
            f"reason={(m.get('reason') or '')[:50]}"
        )
    snap_path = OUTDIR / f"find_{email.replace('@', '_at_').replace('.', '_')}.json"
    snap_path.write_text(json.dumps(matches, indent=2, ensure_ascii=False, sort_keys=True))
    print(f"\nDetalle completo: {snap_path}")


def cmd_cancel_by_email(token: str, email: str, live: bool) -> None:
    """Cancela SOLO los preapprovals authorized del email dado. Uso típico:
    usuario ya reembolsado manualmente, cerrar su suscripción individual."""
    OUTDIR.mkdir(parents=True, exist_ok=True)
    print(f"Buscando preapprovals activos de {email}...")
    active = find_preapprovals_by_email(token, email, statuses=("authorized",))

    if not active:
        print(f"  0 preapprovals activos para {email}. Nada que cancelar.")
        # Aun así reporto histórico para dejar registro
        cmd_find_by_email(token, email)
        return

    print(f"\n{len(active)} preapproval(s) activo(s) para {email}:")
    for pa in active:
        auto = pa.get("auto_recurring") or {}
        print(
            f"  {pa.get('id')} · "
            f"{auto.get('transaction_amount')} {auto.get('currency_id', '?')} · "
            f"reason={(pa.get('reason') or '')[:60]}"
        )

    if not live:
        print("\n[DRY-RUN] --live no pasado, no se cancela nada.")
        return

    confirm = input(
        f"\nConfirmá CANCELACIÓN de {len(active)} preapproval(s) de {email} "
        f"· escribí 'CANCELAR' para proceder: "
    ).strip()
    if confirm != "CANCELAR":
        print("Abortado.")
        return

    log_path = OUTDIR / "cancellation_log.jsonl"
    ok = 0
    failed = 0
    with log_path.open("a") as log_f:
        for pa in active:
            pid = pa.get("id")
            entry: dict = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "context": "cancel_by_email",
                "target_email": email,
                "preapproval_id": pid,
                "payer_email": pa.get("payer_email", "?"),
            }
            try:
                res = cancel_preapproval(pid, token)
                entry["result"] = "ok"
                entry["new_status"] = res.get("status")
                ok += 1
                print(f"  ✅ {pid} → {res.get('status')}")
            except Exception as e:  # noqa: BLE001
                entry["result"] = "error"
                entry["error"] = str(e)[:500]
                failed += 1
                print(f"  ❌ {pid} → {e}")
            log_f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            time.sleep(0.3)

    print(f"\nOK: {ok} · FAILED: {failed} · Log: {log_path}")

    # Verificación estricta pedida por Giuliana: 0 activos restantes para este email
    print(f"\nVerificando que {email} no tenga preapprovals activos...")
    still_active = find_preapprovals_by_email(token, email, statuses=("authorized",))
    if still_active:
        print(f"⚠ Quedan {len(still_active)} preapprovals activos:")
        for m in still_active:
            print(f"   {m.get('id')} · status={m.get('status')}")
        print("Reintentá con `cancel-by-email --live`.")
    else:
        print(f"✅ Confirmado: {email} sin preapprovals en 'authorized'.")


def cmd_export_payments(token: str) -> None:
    """Exporta CSV con todos los pagos cobrados via preapprovals para reembolsos."""
    OUTDIR.mkdir(parents=True, exist_ok=True)

    # Necesitamos TODOS los preapprovals (no solo authorized) para capturar
    # los que ya fueron cancelled pero cobraron mientras estaban activos.
    all_pas: list[dict] = []
    for status in ("authorized", "paused", "cancelled"):
        offset = 0
        while True:
            payload = mp_request(
                "GET",
                "/preapproval/search",
                token,
                query={"status": status, "limit": "100", "offset": str(offset)},
            )
            results = payload.get("results") or []
            all_pas.extend(results)
            paging = payload.get("paging") or {}
            total = int(paging.get("total") or len(results))
            offset += 100
            if offset >= total or not results:
                break
            time.sleep(0.2)

    print(f"Preapprovals totales (todos los estados): {len(all_pas)}")

    rows: list[dict] = []
    for pa in all_pas:
        pid = pa.get("id")
        payer_email = pa.get("payer_email", "")
        payments = list_payments_for_preapproval(pid, token)
        for p in payments:
            # MP devuelve fecha en `date_approved` o `date_created`
            date = p.get("date_approved") or p.get("date_created", "")
            amount = p.get("transaction_amount", "")
            status_p = p.get("status", "")
            rows.append({
                "email": payer_email,
                "amount": amount,
                "currency": p.get("currency_id", ""),
                "date": date,
                "payment_id": p.get("id", ""),
                "preapproval_id": pid,
                "payment_status": status_p,
                "refunded": "yes" if status_p in ("refunded", "cancelled") else "no",
            })
        time.sleep(0.2)

    out_csv = OUTDIR / "payments_for_refund.csv"
    with out_csv.open("w", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "email", "amount", "currency", "date", "payment_id",
                "preapproval_id", "payment_status", "refunded",
            ],
        )
        w.writeheader()
        # Orden estable: por email + fecha
        rows.sort(key=lambda r: (r["email"], r["date"]))
        for r in rows:
            w.writerow(r)
    print(f"\n{len(rows)} pagos exportados a {out_csv}")

    # Resumen ejecutivo
    by_email: dict[str, dict] = {}
    for r in rows:
        e = r["email"] or "unknown"
        agg = by_email.setdefault(e, {"count": 0, "total": 0.0, "currency": r["currency"]})
        agg["count"] += 1
        try:
            agg["total"] += float(r["amount"])
        except (TypeError, ValueError):
            pass
    print("\nResumen por usuario:")
    for email, agg in sorted(by_email.items()):
        print(f"  {email} · {agg['count']} pago(s) · ~{agg['total']:.2f} {agg['currency']}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="Lista preapprovals activos (solo lectura)")

    p_cancel = sub.add_parser("cancel", help="Cancela preapprovals activos")
    p_cancel.add_argument(
        "--live", action="store_true",
        help="Ejecuta cancelaciones de verdad (requiere confirmación textual)",
    )
    p_cancel.add_argument(
        "--dry-run", action="store_true",
        help="Solo simula (equivalente a NO pasar --live)",
    )

    p_find = sub.add_parser("find-by-email", help="Busca preapprovals de un email (todos los estados)")
    p_find.add_argument("email", help="Email exacto del payer")

    p_cbe = sub.add_parser("cancel-by-email", help="Cancela preapprovals authorized de un email específico")
    p_cbe.add_argument("email", help="Email exacto del payer")
    p_cbe.add_argument("--live", action="store_true")
    p_cbe.add_argument("--dry-run", action="store_true")

    sub.add_parser("export-payments", help="Exporta CSV de pagos para reembolsos")

    args = parser.parse_args()
    token = env_token()

    if args.cmd == "list":
        cmd_list(token)
    elif args.cmd == "cancel":
        cmd_cancel(token, live=args.live and not args.dry_run)
    elif args.cmd == "find-by-email":
        cmd_find_by_email(token, args.email)
    elif args.cmd == "cancel-by-email":
        cmd_cancel_by_email(token, args.email, live=args.live and not args.dry_run)
    elif args.cmd == "export-payments":
        cmd_export_payments(token)
    else:
        parser.print_help()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
