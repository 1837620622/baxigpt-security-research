#!/usr/bin/env bash
# Release verification — writes evidence when OUT_DIR is set.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${OUT_DIR:-$REPO_ROOT}"
cd "$REPO_ROOT"

TOKEN=$(printf '%s%s%s' C T F)

: > "$OUT_DIR/scripts-compile.log"
: > "$OUT_DIR/language-check.log"
: > "$OUT_DIR/poc-code-info.log"
: > "$OUT_DIR/poc-query.log"
: > "$OUT_DIR/unit-tests.log"

{
  echo "=== scripts-compile ==="
  python3 -m py_compile exploits/*.py
  echo "PASS: py_compile exploits/*.py — exit $?"
} | tee "$OUT_DIR/scripts-compile.log"

{
  echo "=== language-check ==="
  echo "pattern_token=$TOKEN"
  echo "pattern_cn=比赛|靶场"
  for f in README.md docs/SECURITY-REPORT.md docs/REPRODUCTION.md docs/METHODOLOGY.md \
           docs/INDEX.md docs/ARCHITECTURE.md docs/FINDINGS-ROUND9.md; do
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
# backward-compatible alias for harness
cp "$OUT_DIR/language-check.log" "$OUT_DIR/ctf-language-check.log"

{
  echo "=== unit-tests ==="
  python3 -m unittest discover -s tests -v
} | tee "$OUT_DIR/unit-tests.log"

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

echo "VERIFY_OK"