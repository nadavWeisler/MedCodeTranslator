#!/usr/bin/env python3
"""SQLite FTS5 lexical baseline over pinned MedCodeTranslator vocabularies.

No NLM/UTS or Athena credentials. Uses the stdlib sqlite3 FTS5 tokenizer
against the same bundled JSON files as the app.

Usage:
  python3 scripts/fts5_baseline.py --queries data/eval/heldout-queries.json --limit 10
  python3 scripts/fts5_baseline.py --self-test
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
VOCAB_DIR = ROOT / "data" / "vocabularies"

TOKEN_RE = re.compile(r"[A-Za-z0-9]+")
FTS5_TOKENIZE = 'unicode61 remove_diacritics 1'


def to_match_query(raw: str) -> str | None:
    tokens = TOKEN_RE.findall(raw)
    if not tokens:
        return None
    phrase = " ".join(tokens)
    and_expr = " AND ".join(tokens)
    return f'"{phrase}" OR ({and_expr})'


def load_vocab(scheme: str) -> list[dict[str, Any]]:
    path = VOCAB_DIR / f"{scheme}.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def build_index(entries: list[dict[str, Any]]) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute(
        f"CREATE VIRTUAL TABLE codes USING fts5("
        f"code, name_en, name_he, tokenize='{FTS5_TOKENIZE}')"
    )
    conn.executemany(
        "INSERT INTO codes (code, name_en, name_he) VALUES (?, ?, ?)",
        [
            (
                str(entry.get("code") or ""),
                str(entry.get("name_en") or ""),
                str(entry.get("name_he") or ""),
            )
            for entry in entries
        ],
    )
    return conn


def search(conn: sqlite3.Connection, query: str, limit: int) -> list[str]:
    match = to_match_query(query)
    if not match:
        return []
    try:
        rows = conn.execute(
            "SELECT code FROM codes WHERE codes MATCH ? ORDER BY rank LIMIT ?",
            (match, limit),
        ).fetchall()
    except sqlite3.OperationalError:
        return []
    return [row[0] for row in rows]


def run_queries(query_set: dict[str, Any], limit: int) -> dict[str, Any]:
    by_scheme: dict[str, list[dict[str, Any]]] = {}
    for item in query_set["queries"]:
        by_scheme.setdefault(item["scheme"], []).append(item)

    rankings: dict[str, list[str]] = {}
    for scheme, items in by_scheme.items():
        conn = build_index(load_vocab(scheme))
        try:
            for item in items:
                rankings[item["id"]] = search(conn, item["query"], limit)
        finally:
            conn.close()

    return {
        "system": "fts5",
        "tokenizer": FTS5_TOKENIZE,
        "sqlite_version": sqlite3.sqlite_version,
        "limit": limit,
        "rankings": rankings,
    }


def self_test() -> int:
    conn = sqlite3.connect(":memory:")
    conn.execute(
        f"CREATE VIRTUAL TABLE codes USING fts5("
        f"code, name_en, name_he, tokenize='{FTS5_TOKENIZE}')"
    )
    conn.executemany(
        "INSERT INTO codes (code, name_en, name_he) VALUES (?, ?, ?)",
        [
            ("A01AA01", "Sodium fluoride", ""),
            ("A10BA02", "Metformin", ""),
            ("E11.9", "Type 2 diabetes mellitus without complications", ""),
        ],
    )
    fluoride = search(conn, "Sodium fluoride", 5)
    metformin = search(conn, "Metformin", 5)
    code_hit = search(conn, "E11.9", 5)
    conn.close()
    assert fluoride[0] == "A01AA01", fluoride
    assert metformin[0] == "A10BA02", metformin
    assert code_hit[0] == "E11.9", code_hit
    print("fts5_baseline self-test passed")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queries", type=Path)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    if not args.queries:
        parser.error("--queries is required unless --self-test")

    query_set = json.loads(args.queries.read_text(encoding="utf-8"))
    result = run_queries(query_set, args.limit)
    payload = json.dumps(result, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
    else:
        sys.stdout.write(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
