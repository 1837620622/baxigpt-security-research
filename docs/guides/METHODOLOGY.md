# Assessment Methodology

This project documents a structured security review of the baxigpt.com web application and API surface.

## Phases

### 1. Passive reconnaissance

- DNS resolution and certificate transparency (`crt.sh`)
- HTTP header and TLS fingerprinting
- OpenAPI schema harvest (`/openapi.json`)
- HTML/JS capture of user and admin pages

### 2. Application mapping

- Frontend JavaScript static analysis (inline bundles)
- OpenAPI `operationId` → inferred Python handler names
- Third-party client recovery from public Git repositories (`third-party/`)

### 3. Authorization testing

- BOLA/IDOR on public endpoints (`/api/query`, `/api/status`)
- Broken function-level authorization on `/api/admin/*`
- Header and cookie forgery against admin session

### 4. Input validation

- Type confusion and malformed JSON (documented in `evidence/probes/round8/round8-fuzz.json`)
- HTTP method matrix (public API is POST-only for JSON routes)

### 5. Infrastructure

- nginx version banner analysis (no direct CVE chain identified)
- Virtual host and subdomain enumeration
- Rate-limit behavior with and without `X-Forwarded-For`

### 6. Threat intelligence

- Operator and reseller chain correlation (chirou / web3chirou)
- Fingerprint search for duplicate deployments

## Tooling in this repository

| Tool | Location |
|------|----------|
| Unified audit CLI | `exploits/baxigpt_audit.py` |
| Rate-limit bypass probe | `exploits/ip_bypass_enum.py` |
| Subdomain scanner | `exploits/subdomain_probe.py` |
| Type-confusion fuzzer | `exploits/round8_fuzz500.py` |

## Evidence retention

- **evidence/snapshots/** — raw HTTP/HTML/JSON snapshots
- **evidence/probes/** — machine-readable probe output (JSON), by phase
- **docs/archive/** — earlier draft reports superseded by `docs/reports/SECURITY-REPORT.md`

## Ethical constraints

Assessment traffic was limited to read-only API calls and small proof-of-concept volumes. No administrative compromise was achieved; no large-scale denial-of-service was performed.