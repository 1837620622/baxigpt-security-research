# Documentation Index

## Primary (start here)

| Document | Description |
|----------|-------------|
| [SECURITY-REPORT.md](./SECURITY-REPORT.md) | Executive findings, severity table, PoC references |
| [REPRODUCTION.md](./REPRODUCTION.md) | Commands to verify each finding |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Inferred backend logic and data model |
| [API-REFERENCE.md](./API-REFERENCE.md) | Public and admin endpoint contracts |
| [ADMIN-SURFACE.md](./ADMIN-SURFACE.md) | Hidden admin UI and session behavior |
| [THREAT-INTELLIGENCE.md](./THREAT-INTELLIGENCE.md) | Operator OSINT and supply chain |
| [METHODOLOGY.md](./METHODOLOGY.md) | How the assessment was conducted |
| [FINDINGS-ROUND9.md](./FINDINGS-ROUND9.md) | Phase-9 supplemental probes (cookie, headers, JSON edge cases) |
| [MASTER-ANALYSIS.md](./MASTER-ANALYSIS.md) | Consolidated technical deep-dive (phases 1–8) |

## Archive

Earlier working notes and phase reports: [archive/](./archive/)

## Evidence (repository root)

| Path | Contents |
|------|----------|
| `captures/` | Raw page and OpenAPI snapshots |
| `artifacts/` | JSON output from automated probes |
| `recovered-code/` | Third-party API client source |
| `exploits/` | Reproduction scripts |
| `scripts/verify_release.sh` | Release gate (compile, language, live PoCs, git hygiene) |