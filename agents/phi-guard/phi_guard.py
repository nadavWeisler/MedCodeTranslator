#!/usr/bin/env python3
"""PHI guard and compliance gate for MedCodeTranslator.

Scans a unified diff for patterns that indicate:
  - PHI (patient-identifiable information) fields being added to TypeScript types
  - SAFE_SCOPE violations (clinical decision support fields, treatment logic, etc.)
  - External HTTP requests from app/db code that may transmit search queries

Pattern definitions live in patterns.json so they can be maintained without
touching this script.

Usage:
  git diff HEAD | python agents/phi-guard/phi_guard.py
  python agents/phi-guard/phi_guard.py --diff-file /tmp/pr.diff

Exit codes:
  0  No hard violations (warnings may have been printed)
  1  One or more hard violations detected
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys
from dataclasses import dataclass, field

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
PATTERNS_FILE = pathlib.Path(__file__).parent / "patterns.json"

# Only check files under these path prefixes
IN_SCOPE_PREFIXES = ("app/", "db/", "scripts/")

# Always skip these prefixes (docs, i18n, legal, this agent itself, CI config)
SKIP_PREFIXES = (
    "agents/",
    "legal/",
    "docs/",
    "i18n/",
    ".github/",
    "public/",
    "assets/",
)

# Skip these extensions regardless of path (pure data / markup files)
SKIP_EXTENSIONS = frozenset({".md", ".txt", ".json", ".yml", ".yaml", ".png", ".svg"})


@dataclass
class Violation:
    pattern_id: str
    severity: str          # "hard" | "warning"
    file_path: str
    line_content: str
    message: str


@dataclass
class _DiffParser:
    additions: list[tuple[str, str]] = field(default_factory=list)
    _current_file: str = ""

    def feed_line(self, raw: str) -> None:
        if raw.startswith("diff --git "):
            # "diff --git a/path b/path"
            parts = raw.split(" b/", 1)
            if len(parts) == 2:
                self._current_file = parts[1].strip()
        elif raw.startswith("+++ b/"):
            self._current_file = raw[6:].strip()
        elif raw.startswith("+") and not raw.startswith("+++"):
            if self._current_file:
                self.additions.append((self._current_file, raw[1:]))


def parse_diff(text: str) -> list[tuple[str, str]]:
    """Return list of (file_path, added_line_content) from a unified diff."""
    parser = _DiffParser()
    for line in text.splitlines():
        parser.feed_line(line)
    return parser.additions


def is_in_scope(file_path: str) -> bool:
    fp = file_path.lstrip("/")
    for prefix in SKIP_PREFIXES:
        if fp.startswith(prefix):
            return False
    _, ext = os.path.splitext(fp)
    if ext in SKIP_EXTENSIONS:
        return False
    for prefix in IN_SCOPE_PREFIXES:
        if fp.startswith(prefix):
            return True
    return False


def is_comment_line(line: str) -> bool:
    s = line.strip()
    return (
        s.startswith("//")
        or s.startswith("*")
        or s.startswith("#")
        or s.startswith("/*")
    )


def _compile(pat: dict) -> re.Pattern:
    flags = re.IGNORECASE if pat.get("case_insensitive") else 0
    return re.compile(pat["pattern"], flags)


def scan_additions(
    additions: list[tuple[str, str]],
    patterns: dict,
) -> list[Violation]:
    violations: list[Violation] = []

    hard_compiled = [
        (pat, _compile(pat)) for pat in patterns.get("hard_violations", [])
    ]
    warn_compiled = [
        (pat, _compile(pat)) for pat in patterns.get("warnings", [])
    ]

    for file_path, line_content in additions:
        if not is_in_scope(file_path):
            continue
        if is_comment_line(line_content):
            continue  # skip comment additions for both hard and warning patterns

        _, ext = os.path.splitext(file_path)

        for pat_def, regex in hard_compiled:
            allowed = pat_def.get("file_extensions")
            if allowed and ext not in allowed:
                continue
            if regex.search(line_content):
                violations.append(
                    Violation(
                        pattern_id=pat_def["id"],
                        severity="hard",
                        file_path=file_path,
                        line_content=line_content.rstrip(),
                        message=pat_def["message"],
                    )
                )

        for pat_def, regex in warn_compiled:
            allowed = pat_def.get("file_extensions")
            if allowed and ext not in allowed:
                continue
            if regex.search(line_content):
                violations.append(
                    Violation(
                        pattern_id=pat_def["id"],
                        severity="warning",
                        file_path=file_path,
                        line_content=line_content.rstrip(),
                        message=pat_def["message"],
                    )
                )

    return violations


def _gha_escape(s: str) -> str:
    return s.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def emit_annotation(v: Violation) -> None:
    level = "error" if v.severity == "hard" else "warning"
    msg = _gha_escape(f"[phi-guard] {v.pattern_id}: {v.message}")
    print(f"::{level} file={v.file_path}::{msg}")


def write_step_summary(path: str, hard: list[Violation], warns: list[Violation]) -> None:
    lines = ["## PHI guard", ""]
    if hard:
        lines += [
            f"**{len(hard)} hard violation(s) detected.** "
            "These changes conflict with `docs/SAFE_SCOPE.md`.",
            "",
            "| File | Pattern | Message |",
            "|---|---|---|",
        ]
        for v in hard:
            lines.append(f"| `{v.file_path}` | `{v.pattern_id}` | {v.message} |")
        lines += ["", "_Blocked by the `phi-guard` agent._"]
    elif warns:
        lines += [
            f"{len(warns)} warning(s) — review required.",
            "",
            "| File | Pattern | Message |",
            "|---|---|---|",
        ]
        for v in warns:
            lines.append(f"| `{v.file_path}` | `{v.pattern_id}` | {v.message} |")
    else:
        lines.append("No PHI or SAFE_SCOPE violations detected. ✓")
    with open(path, "a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Scan a diff for PHI and SAFE_SCOPE violations")
    p.add_argument(
        "--diff-file", type=pathlib.Path, default=None,
        help="Path to a unified diff file (reads stdin if omitted)",
    )
    p.add_argument(
        "--patterns-file", type=pathlib.Path, default=PATTERNS_FILE,
        help=f"Path to patterns JSON (default: {PATTERNS_FILE})",
    )
    p.add_argument(
        "--warn-only", action="store_true",
        help="Never exit 1, even on hard violations (dry-run mode)",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()

    if not args.patterns_file.exists():
        print(
            f"[phi-guard] Patterns file not found: {args.patterns_file}",
            file=sys.stderr,
        )
        return 1

    patterns = json.loads(args.patterns_file.read_text(encoding="utf-8"))

    diff_text = (
        args.diff_file.read_text(encoding="utf-8", errors="replace")
        if args.diff_file
        else sys.stdin.read()
    )

    if not diff_text.strip():
        print("[phi-guard] No diff content — nothing to check.")
        return 0

    additions = parse_diff(diff_text)
    violations = scan_additions(additions, patterns)

    is_gha = os.environ.get("GITHUB_ACTIONS") == "true"
    hard = [v for v in violations if v.severity == "hard"]
    warns = [v for v in violations if v.severity == "warning"]

    if not violations:
        print("[phi-guard] ✓ No violations found.")
        step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if step_summary:
            write_step_summary(step_summary, [], [])
        return 0

    if warns:
        print(f"[phi-guard] {len(warns)} warning(s):")
        for v in warns:
            print(f"  [WARN] {v.file_path}: {v.message}")
            print(f"         {v.line_content[:120]}")
            if is_gha:
                emit_annotation(v)

    if hard:
        print(f"\n[phi-guard] {len(hard)} hard violation(s):", file=sys.stderr)
        for v in hard:
            print(f"  [VIOLATION] {v.file_path}", file=sys.stderr)
            print(f"  Pattern:    {v.pattern_id}", file=sys.stderr)
            print(f"  Message:    {v.message}", file=sys.stderr)
            print(f"  Line:       {v.line_content[:120]}", file=sys.stderr)
            if is_gha:
                emit_annotation(v)

    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        write_step_summary(step_summary, hard, warns)

    if hard and not args.warn_only:
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
