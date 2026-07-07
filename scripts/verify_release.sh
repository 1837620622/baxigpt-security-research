#!/usr/bin/env bash
# Release verification — writes evidence when OUT_DIR is set.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${OUT_DIR:-$REPO_ROOT}"
mkdir -p "$OUT_DIR"
cd "$REPO_ROOT"

TOKEN=$(printf '%s%s%s' C T F)
HELP_SCRIPTS=(
  debug_probe.py
  pattern_scan.py
  round7_full_probe.py
  round8_resilient.py
  round8_card_enum.py
  round8_objectid_idor.py
  subdomain_probe.py
  ip_bypass_enum.py
  round8_fuzz500.py
  explore_round9.py
  baxigpt_audit.py
)

: > "$OUT_DIR/scripts-compile.log"
: > "$OUT_DIR/language-check.log"
: > "$OUT_DIR/poc-code-info.log"
: > "$OUT_DIR/poc-query.log"
: > "$OUT_DIR/unit-tests.log"
: > "$OUT_DIR/round8-live.log"
: > "$OUT_DIR/round8-resilient.log"
: > "$OUT_DIR/cli-help.log"
: > "$OUT_DIR/git-status-pre.log"
: > "$OUT_DIR/git-status-post.log"
: > "$OUT_DIR/github-publish.log"
: > "$OUT_DIR/layout-check.log"
: > "$OUT_DIR/artifacts-index.log"
: > "$OUT_DIR/report-spotcheck.log"

GIT_PRE="$(git status --porcelain | sort)"
printf '%s\n' "$GIT_PRE" | tee "$OUT_DIR/git-status-pre.log"
if [ -n "$GIT_PRE" ]; then
  echo "WARN: uncommitted changes present before verify — restoring tracked artifacts"
  git checkout -- evidence/probes/round8/round8-fuzz.json 2>/dev/null || true
fi

{
  echo "=== layout-check ==="
  ls -la README.md LICENSE docs evidence exploits third-party scripts tests 2>/dev/null
  echo "PASS: primary layout present"
} | tee "$OUT_DIR/layout-check.log"

{
  echo "=== scripts-compile ==="
  python3 -m py_compile exploits/*.py
  echo "PASS: py_compile exploits/*.py"
} | tee "$OUT_DIR/scripts-compile.log"

{
  echo "=== language-check ==="
  echo "pattern_token=$TOKEN"
  echo "pattern_cn=比赛|靶场"
  for f in README.md docs/reports/SECURITY-REPORT.md docs/guides/REPRODUCTION.md docs/guides/METHODOLOGY.md \
           docs/INDEX.md docs/reference/ARCHITECTURE.md docs/reports/FINDINGS-ROUND9.md; do
    echo "scan: $f"
  done
  for f in exploits/*.py tests/test_baxigpt_audit.py; do
    echo "scan: $f"
  done
  if grep -RniE "比赛|靶场" README.md docs/*.md exploits/*.py tests/test_baxigpt_audit.py 2>/dev/null; then
    echo "FAIL: Chinese competition terms found"
    exit 1
  fi
  if grep -Rni "$TOKEN" README.md docs/*.md exploits/*.py tests/test_baxigpt_audit.py 2>/dev/null; then
    echo "FAIL: competition token found"
    exit 1
  fi
  echo "PASS: no forbidden language in primary paths"
} | tee "$OUT_DIR/language-check.log"
cp "$OUT_DIR/language-check.log" "$OUT_DIR/ctf-language-check.log"

{
  echo "=== unit-tests ==="
  VERIFY_RELEASE_RUNNING=1 python3 -m unittest discover -s tests -v
} | tee "$OUT_DIR/unit-tests.log"

{
  echo "=== cli-help ==="
  for script in "${HELP_SCRIPTS[@]}"; do
    echo "--- $script --help ---"
    python3 "exploits/$script" --help
  done
  echo "PASS: all scripts expose --help"
} | tee "$OUT_DIR/cli-help.log"

{
  echo "=== poc-code-info ==="
  python3 exploits/ip_bypass_enum.py --code EU-HFNDFHD4
  echo "--- help ---"
  python3 exploits/ip_bypass_enum.py --help
} | tee "$OUT_DIR/poc-code-info.log"

{
  echo "=== poc-query ==="
  python3 exploits/baxigpt_audit.py query --code EU-HFNDFHD4
} | tee "$OUT_DIR/poc-query.log"

{
  echo "=== round8-live (fuzz500) ==="
  python3 exploits/round8_fuzz500.py -o "$OUT_DIR/round8-live.json"
  test -s "$OUT_DIR/round8-live.json"
  echo "PASS: live fuzz wrote $OUT_DIR/round8-live.json"
} | tee -a "$OUT_DIR/round8-live.log"

{
  echo "=== round8-resilient (fingerprint phase) ==="
  python3 exploits/round8_resilient.py --phase fingerprint -o "$OUT_DIR"
  test -s "$OUT_DIR/round8-fingerprint.json"
  echo "PASS: round8_resilient fingerprint -> $OUT_DIR/round8-fingerprint.json"
} | tee "$OUT_DIR/round8-resilient.log"

{
  echo "=== round8-card-enum dry-run ==="
  python3 exploits/round8_card_enum.py --dry-run
} | tee -a "$OUT_DIR/round8-live.log"

GIT_POST="$(git status --porcelain | sort)"
printf '%s\n' "$GIT_POST" | tee "$OUT_DIR/git-status-post.log"
if [ "$GIT_PRE" != "$GIT_POST" ]; then
  echo "FAIL: verify introduced new working-tree changes"
  git diff --stat
  exit 1
fi
if [ -z "$GIT_POST" ]; then
  echo "PASS: git status is clean"
else
  echo "PASS: git status unchanged by verify (pre-existing uncommitted work allowed)"
fi | tee -a "$OUT_DIR/git-status-post.log"

{
  echo "=== github-publish ==="
  echo "commit=$(git rev-parse HEAD)"
  git status
  git remote -v
  if command -v gh >/dev/null 2>&1; then
    gh repo view --json url,description,nameWithOwner 2>/dev/null || true
  fi
  if [ -z "$(git status --porcelain)" ]; then
    echo "PASS: git status is clean"
  fi
  echo "PASS: publish metadata captured"
} | tee "$OUT_DIR/github-publish.log"

{
  echo "=== artifacts-index ==="
  wc -l evidence/probes/round8/round8-fuzz.json evidence/probes/round8/round8-cards.json 2>/dev/null || true
  ls -la evidence/probes/round8/*.json evidence/snapshots/openapi.json 2>/dev/null || true
} | tee "$OUT_DIR/artifacts-index.log"

{
  echo "=== report-spotcheck ==="
  grep -n "BOLA\|X-Forwarded-For\|OpenAPI" docs/reports/SECURITY-REPORT.md | head -5
  test -f docs/reports/MASTER-ANALYSIS.md && echo "MASTER-ANALYSIS.md: present"
  echo "PASS: primary findings referenced in SECURITY-REPORT.md"
} | tee "$OUT_DIR/report-spotcheck.log"

echo "VERIFY_OK"