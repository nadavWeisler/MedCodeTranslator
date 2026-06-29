#!/usr/bin/env python3
"""Crosswalk integrity validator for MedCodeTranslator.

Validates referential integrity of the ICD-9 → ICD-10 General Equivalence Mapping
(GEM) crosswalk produced by scripts/refresh_medical_db.py:

  - Every icd9_code in the crosswalk must exist in the current icd9 dataset.
  - Every icd10_code in the crosswalk must exist in the current icd10 dataset.
  - Cardinality distribution is reported; many:many above threshold is flagged.

Integrated as a CI gate in .github/workflows/refresh-medical-db.yml so that
every dataset rebuild is automatically checked before a refresh PR is opened.

Exit codes:
  0  Passed (with optional warnings)
  1  Referential integrity failure or critical anomaly
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
DEFAULT_ICD9 = ROOT / "data" / "vocabularies" / "icd9.json"
DEFAULT_ICD10 = ROOT / "data" / "vocabularies" / "icd10.json"
DEFAULT_XWALK = ROOT / "data" / "vocabularies" / "icd9_to_icd10_gem.json"

# Alert thresholds (can be overridden via CLI args)
DEFAULT_MANY_MANY_THRESHOLD = 0.05   # alert if >5 % of pairs are many:many
DEFAULT_ORPHAN_THRESHOLD = 50        # alert if >50 orphaned source codes


def load_code_set(path: pathlib.Path) -> set[str]:
    """Return the normalised set of codes from a dataset JSON file."""
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    return {str(item.get("code", "")).strip().upper() for item in data if item.get("code")}


def load_crosswalk(path: pathlib.Path) -> list[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def validate(
    icd9_codes: set[str],
    icd10_codes: set[str],
    crosswalk: list[dict],
    many_many_threshold: float = DEFAULT_MANY_MANY_THRESHOLD,
    orphan_threshold: int = DEFAULT_ORPHAN_THRESHOLD,
) -> tuple[list[str], list[str], dict]:
    """Return (errors, warnings, stats)."""
    errors: list[str] = []
    warnings: list[str] = []

    if not crosswalk:
        warnings.append("Crosswalk is empty; no validation performed.")
        return errors, warnings, {}

    def norm(v: object) -> str:
        return str(v).strip().upper()

    orphaned_icd9: set[str] = set()
    missing_icd10: set[str] = set()
    cardinality_counter: Counter[str] = Counter()

    for row in crosswalk:
        i9 = norm(row.get("icd9_code", ""))
        i10 = norm(row.get("icd10_code", ""))
        card = str(row.get("cardinality", "unknown"))
        cardinality_counter[card] += 1

        if i9 and icd9_codes and i9 not in icd9_codes:
            orphaned_icd9.add(i9)
        if i10 and icd10_codes and i10 not in icd10_codes:
            missing_icd10.add(i10)

    total = len(crosswalk)
    many_many_count = cardinality_counter.get("many:many", 0)
    many_many_pct = many_many_count / total if total else 0.0

    # Referential integrity
    if orphaned_icd9:
        sample = ", ".join(sorted(orphaned_icd9)[:10])
        msg = (
            f"{len(orphaned_icd9)} crosswalk source code(s) not found in icd9 dataset"
            f" (sample: {sample})"
        )
        if len(orphaned_icd9) > orphan_threshold:
            errors.append(msg + f" — exceeds orphan alert threshold ({orphan_threshold})")
        else:
            warnings.append(msg)

    if missing_icd10:
        sample = ", ".join(sorted(missing_icd10)[:10])
        msg = (
            f"{len(missing_icd10)} crosswalk target code(s) not found in icd10 dataset"
            f" (sample: {sample})"
        )
        if len(missing_icd10) > orphan_threshold:
            errors.append(msg + f" — exceeds missing-target alert threshold ({orphan_threshold})")
        else:
            warnings.append(msg)

    if many_many_pct > many_many_threshold:
        warnings.append(
            f"many:many cardinality is {many_many_pct:.1%} of pairs"
            f" ({many_many_count}/{total}), above the {many_many_threshold:.0%} alert threshold"
        )

    stats = {
        "total_pairs": total,
        "orphaned_icd9_count": len(orphaned_icd9),
        "missing_icd10_target_count": len(missing_icd10),
        "cardinality": dict(cardinality_counter),
        "many_many_pct": round(many_many_pct, 4),
    }
    return errors, warnings, stats


def write_step_summary(
    path: str,
    stats: dict,
    errors: list[str],
    warnings: list[str],
) -> None:
    lines = [
        "## Crosswalk integrity",
        "",
        f"- Total pairs: {stats.get('total_pairs', 0)}",
        f"- Orphaned ICD-9 source codes: {stats.get('orphaned_icd9_count', 0)}",
        f"- Missing ICD-10 target codes: {stats.get('missing_icd10_target_count', 0)}",
        f"- many:many cardinality: {stats.get('many_many_pct', 0.0):.1%}",
    ]
    if errors:
        lines += ["", "### Errors"] + [f"- {e}" for e in errors]
    if warnings:
        lines += ["", "### Warnings"] + [f"- {w}" for w in warnings]
    if not errors and not warnings:
        lines += ["", "Crosswalk integrity check passed. ✓"]
    with open(path, "a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Validate ICD-9 → ICD-10 crosswalk referential integrity"
    )
    p.add_argument("--icd9-json", type=pathlib.Path, default=DEFAULT_ICD9)
    p.add_argument("--icd10-json", type=pathlib.Path, default=DEFAULT_ICD10)
    p.add_argument("--crosswalk-json", type=pathlib.Path, default=DEFAULT_XWALK)
    p.add_argument(
        "--many-many-threshold",
        type=float,
        default=DEFAULT_MANY_MANY_THRESHOLD,
        help="Alert if many:many cardinality fraction exceeds this value (default: 0.05)",
    )
    p.add_argument(
        "--orphan-threshold",
        type=int,
        default=DEFAULT_ORPHAN_THRESHOLD,
        help="Escalate to error when orphan count exceeds this value (default: 50)",
    )
    p.add_argument(
        "--allow-missing",
        action="store_true",
        help="Exit 0 even when the crosswalk file does not exist",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()

    if not args.crosswalk_json.exists():
        if args.allow_missing:
            print(
                f"[crosswalk-validator] Crosswalk not found at {args.crosswalk_json}"
                " — skipping (--allow-missing)."
            )
            return 0
        print(
            f"[crosswalk-validator] ERROR: Crosswalk not found: {args.crosswalk_json}",
            file=sys.stderr,
        )
        return 1

    icd9_codes = load_code_set(args.icd9_json)
    icd10_codes = load_code_set(args.icd10_json)
    crosswalk = load_crosswalk(args.crosswalk_json)

    print(f"[crosswalk-validator] ICD-9 codes:     {len(icd9_codes)}")
    print(f"[crosswalk-validator] ICD-10 codes:    {len(icd10_codes)}")
    print(f"[crosswalk-validator] Crosswalk pairs: {len(crosswalk)}")

    errors, warnings, stats = validate(
        icd9_codes, icd10_codes, crosswalk,
        args.many_many_threshold, args.orphan_threshold,
    )

    for w in warnings:
        print(f"  [WARN]  {w}")
    for e in errors:
        print(f"  [ERROR] {e}", file=sys.stderr)

    if stats.get("cardinality"):
        print("\n  Cardinality distribution:")
        total = stats["total_pairs"]
        for k, v in sorted(stats["cardinality"].items()):
            pct = v / total * 100 if total else 0
            print(f"    {k:12s}: {v:6d} ({pct:.1f}%)")

    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        write_step_summary(step_summary, stats, errors, warnings)

    if errors:
        print(
            f"\n[crosswalk-validator] FAILED — {len(errors)} error(s).",
            file=sys.stderr,
        )
        return 1

    print("\n[crosswalk-validator] Passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
