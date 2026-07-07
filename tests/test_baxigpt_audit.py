"""Unit tests for exploits/baxigpt_audit.py CLI (no network)."""
import subprocess
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
AUDIT = REPO / "exploits" / "baxigpt_audit.py"


class TestBaxigptAuditCLI(unittest.TestCase):
    def test_help_exits_zero(self):
        proc = subprocess.run(
            [sys.executable, str(AUDIT), "--help"],
            capture_output=True,
            text=True,
            cwd=REPO,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("code-info", proc.stdout)

    def test_missing_subcommand_fails(self):
        proc = subprocess.run(
            [sys.executable, str(AUDIT)],
            capture_output=True,
            text=True,
            cwd=REPO,
        )
        self.assertNotEqual(proc.returncode, 0)


class TestFuzzDryRun(unittest.TestCase):
    def test_fuzz_dry_run(self):
        fuzz = REPO / "exploits" / "round8_fuzz500.py"
        proc = subprocess.run(
            [sys.executable, str(fuzz), "--dry-run"],
            capture_output=True,
            text=True,
            cwd=REPO,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("payload_count", proc.stdout)


if __name__ == "__main__":
    unittest.main()