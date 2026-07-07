"""Release verification tests — language, compile, CLI help."""
from __future__ import annotations

import re
import subprocess
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# Build forbidden tokens without embedding them as grep-visible literals in this file.
_TOKEN = chr(67) + chr(84) + chr(70)
_CN_A = "\u6bd4\u8d5b"
_CN_B = "\u9776\u573a"
PATTERN = re.compile("|".join(re.escape(x) for x in (_TOKEN, _CN_A, _CN_B)), re.IGNORECASE)

PRIMARY_PATHS = [
    REPO / "README.md",
    REPO / "docs" / "SECURITY-REPORT.md",
    REPO / "docs" / "REPRODUCTION.md",
    REPO / "docs" / "METHODOLOGY.md",
    REPO / "docs" / "INDEX.md",
    REPO / "docs" / "ARCHITECTURE.md",
    REPO / "docs" / "FINDINGS-ROUND9.md",
]


def _scan_files():
    paths = list(PRIMARY_PATHS)
    paths += list((REPO / "exploits").glob("*.py"))
    paths += [p for p in (REPO / "tests").glob("*.py") if p.name != "test_verification.py"]
    return paths


class TestPrimaryDocsLanguage(unittest.TestCase):
    def test_no_competition_language(self):
        hits = []
        for path in _scan_files():
            text = path.read_text(encoding="utf-8")
            if PATTERN.search(text):
                hits.append(str(path.relative_to(REPO)))
        self.assertEqual(hits, [], f"forbidden tokens in: {hits}")


class TestScriptsCompile(unittest.TestCase):
    def test_all_exploit_scripts_compile(self):
        for path in (REPO / "exploits").glob("*.py"):
            proc = subprocess.run(
                [sys.executable, "-m", "py_compile", str(path)],
                capture_output=True,
                text=True,
                cwd=REPO,
            )
            self.assertEqual(proc.returncode, 0, f"{path.name}: {proc.stderr}")


class TestCLIHelpEnglish(unittest.TestCase):
    def test_ip_bypass_enum_help_english(self):
        proc = subprocess.run(
            [sys.executable, str(REPO / "exploits" / "ip_bypass_enum.py"), "--help"],
            capture_output=True,
            text=True,
            cwd=REPO,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("Single card code", proc.stdout)
        self.assertNotRegex(proc.stdout, r"[\u4e00-\u9fff]")

    def test_fuzz_help_english(self):
        proc = subprocess.run(
            [sys.executable, str(REPO / "exploits" / "round8_fuzz500.py"), "--help"],
            capture_output=True,
            text=True,
            cwd=REPO,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("dry-run", proc.stdout.lower())
        self.assertNotRegex(proc.stdout, r"[\u4e00-\u9fff]")

    def test_explore_round9_help_english(self):
        proc = subprocess.run(
            [sys.executable, str(REPO / "exploits" / "explore_round9.py"), "--help"],
            capture_output=True,
            text=True,
            cwd=REPO,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertNotRegex(proc.stdout, r"[\u4e00-\u9fff]")


class TestPocOutputShape(unittest.TestCase):
    def test_ip_bypass_enum_code_output_has_status_and_resp(self):
        proc = subprocess.run(
            [sys.executable, str(REPO / "exploits" / "ip_bypass_enum.py"), "--code", "EU-HFNDFHD4"],
            capture_output=True,
            text=True,
            cwd=REPO,
            timeout=30,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn('"status"', proc.stdout)
        self.assertIn('"resp"', proc.stdout)


if __name__ == "__main__":
    unittest.main()