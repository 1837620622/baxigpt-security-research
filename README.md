# baxigpt-security-research

Independent security research and threat-intelligence documentation for **baxigpt.com** — a FastAPI-based ChatGPT Plus card-redemption gateway.

> **Note:** The GitHub repository is named `baxigpt-security-research`. Local clones may use the directory name `baxigpt-reverse`; content is identical.

This repository packages reconnaissance artifacts, inferred backend architecture, confirmed vulnerability analysis, and read-only proof-of-concept scripts suitable for security engineers, auditors, and integration partners evaluating API risk.

## Executive summary

| Item | Detail |
|------|--------|
| **Stack** | nginx/1.24.0 (Ubuntu) → FastAPI v0.1.0 → inferred PIX/BLIK upstream |
| **Purpose** | Card-code redemption using user-supplied ChatGPT `accessToken` |
| **Critical issues** | Rate-limit bypass (XFF), BOLA on `/api/query`, OpenAPI admin leak, weak admin login policy |
| **Admin access** | Not achieved; session auth resisted extensive testing |

Full analysis: **[docs/SECURITY-REPORT.md](docs/SECURITY-REPORT.md)**

## Quick reproduction

```bash
# Install: none (stdlib only)
python3 exploits/baxigpt_audit.py health
python3 exploits/baxigpt_audit.py code-info --code EU-HFNDFHD4
python3 exploits/baxigpt_audit.py query --code EU-HFNDFHD4
```

See **[docs/REPRODUCTION.md](docs/REPRODUCTION.md)** for all commands.

```bash
OUT_DIR=/tmp/baxigpt-verify ./scripts/verify_release.sh
```

## Repository layout

```
.
├── README.md                 # This file
├── LICENSE                   # MIT (scripts); research disclaimer below
├── docs/
│   ├── SECURITY-REPORT.md    # Primary findings report
│   ├── REPRODUCTION.md       # PoC commands
│   ├── ARCHITECTURE.md       # Backend reconstruction
│   ├── API-REFERENCE.md      # Endpoint documentation
│   ├── ADMIN-SURFACE.md      # Admin UI analysis
│   ├── THREAT-INTELLIGENCE.md
│   ├── METHODOLOGY.md
│   ├── INDEX.md
│   └── archive/              # Earlier working drafts
├── exploits/                 # Read-only audit scripts
├── artifacts/                # JSON probe output
├── captures/                 # Raw HTTP/HTML captures
└── recovered-code/           # Third-party API clients (GitHub)
```

## Confirmed findings (abbreviated)

1. **Rate-limit bypass** — `X-Forwarded-For` rotation avoids `HTTP 429` ([evidence](artifacts/pentest-enum-bypass.json))
2. **BOLA / privacy leak** — `POST /api/query` returns all orders and emails for a card code ([evidence](artifacts/round8-cards.json))
3. **OpenAPI exposure** — `/openapi.json` lists hidden admin routes ([capture](captures/openapi.json))
4. **Admin login policy** — No throttling observed on `/api/admin/login` ([evidence](artifacts/round7-full.json))
5. **Input validation gaps** — Type errors yield HTTP 500 ([evidence](artifacts/round8-fuzz.json))

## Scripts

| Script | Description |
|--------|-------------|
| `exploits/baxigpt_audit.py` | Unified CLI: health, code-info, query, openapi |
| `exploits/ip_bypass_enum.py` | XFF rotation + card enumeration helper |
| `exploits/round8_fuzz500.py` | Type-confusion fuzz (use sparingly) |

## Documentation map

Start at **[docs/INDEX.md](docs/INDEX.md)**.

## Threat intelligence

The service is linked to a reseller ecosystem (chirou.ai / web3chirou.com) distributing EU/PIX card codes. The site itself does not publish support contacts. Details: [docs/THREAT-INTELLIGENCE.md](docs/THREAT-INTELLIGENCE.md).

## Disclaimer

This project documents **authorized security research** techniques applied in a read-only manner. The scripts and reports are provided for defensive analysis, integration risk review, and education.

- Do **not** use these tools to brute-force card codes at scale, harvest third-party credentials, or disrupt the service.
- Captured artifacts may contain real identifiers from voluntary test traffic; handle accordingly.
- The authors are not affiliated with baxigpt.com or its operators.

## License

MIT License — see [LICENSE](LICENSE). Research text and captured third-party content remain subject to their respective terms.