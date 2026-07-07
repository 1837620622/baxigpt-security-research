# Phase-9 Supplemental Findings

**Date:** 2026-07-07  
**Script:** `exploits/explore_round9.py`  
**Evidence:** `evidence/probes/round9/round9-explore.json`

This phase extends prior work with targeted edge-case probes not fully covered in phases 1–8.

## New observations

### 1. Failed admin login does not set session cookies

`POST /api/admin/login` with an invalid password returns `401` and **no `Set-Cookie` header**. This confirms session material is only issued on successful authentication.

### 2. Duplicate JSON keys on `/api/query`

Sending raw JSON `{"code":"EU-HFNDFHD4","code":"EU-OTHER00"}` triggers **last-key-wins** parsing (observed: `{"ok":false,"msg":"卡密不存在"}` for the second code). No privilege escalation, but documents JSON duplicate-key behavior for API consumers.

### 3. Security headers remain absent on homepage

`GET /` response lacks `Strict-Transport-Security`, `Content-Security-Policy`, and `X-Frame-Options` (consistent with phase-8 observation).

### 4. Empty card code validation

`POST /api/code-info` with `{"code":""}` returns structured `{"ok":false,"msg":"请输入卡密"}` (HTTP 200) — proper validation, not a 500.

### 5. Unauthenticated admin stats unchanged

`POST /api/admin/stats` without cookie continues to return `401 {"ok":false}` — no regression from earlier phases.

## Reproduction

```bash
python3 exploits/explore_round9.py          # live probes → evidence/probes/round9/round9-explore.json
python3 exploits/explore_round9.py --dry-run
```

## Impact summary

No new critical vulnerabilities beyond those documented in [SECURITY-REPORT.md](./reports/SECURITY-REPORT.md). Phase-9 strengthens negative evidence (admin session handling, header posture) and documents JSON edge-case behavior for integrators.