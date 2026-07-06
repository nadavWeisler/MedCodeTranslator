"""
medcodetranslator — Python client for biomedical terminology retrieval.

Loads vocabulary JSON files from data/vocabularies/ and provides
exact, prefix, substring, fuzzy, and alias search with transparent scoring.
"""

from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from typing import Literal

try:
    from rapidfuzz import fuzz, process

    _RAPIDFUZZ = True
except ImportError:
    _RAPIDFUZZ = False


MatchMethod = Literal["exact", "prefix", "substring", "fuzzy", "alias"]

SCHEME_KEYS = [
    "atc1",
    "atc2",
    "atc3",
    "atc4",
    "atc5",
    "icd10",
    "icd9",
    "icd11",
    "loinc",
    "cpt",
    "hcpcs",
    "cvx",
]

CROSS_SCHEME_KEYS = ["icd10", "atc5", "loinc", "hcpcs", "cvx"]


@dataclass
class CodeResult:
    code: str
    name_en: str
    name_he: str | None
    score: float
    match_method: MatchMethod
    scheme: str | None = None


def _default_data_dir() -> pathlib.Path:
    repo_root = pathlib.Path(__file__).resolve().parents[3]
    bundled = repo_root / "data" / "vocabularies"
    if bundled.exists():
        return bundled
    return pathlib.Path(__file__).resolve().parents[1] / "data" / "vocabularies"


class MedCodeTranslator:
    """
    Local in-memory terminology retrieval client.

    Parameters
    ----------
    data_dir : str | pathlib.Path | None
        Path to the directory containing vocabulary JSON files.
        Defaults to the monorepo ``data/vocabularies`` directory when present.
    aliases : dict[str, str] | None
        Optional alias map (lowercase key → canonical search term).
    """

    def __init__(
        self,
        data_dir: str | pathlib.Path | None = None,
        aliases: dict[str, str] | None = None,
    ) -> None:
        self._data_dir = pathlib.Path(data_dir) if data_dir is not None else _default_data_dir()
        self._cache: dict[str, list[dict]] = {}
        self._aliases = {key.lower(): value for key, value in (aliases or {}).items()}

    @property
    def schemes(self) -> list[str]:
        return SCHEME_KEYS

    def _load(self, scheme: str) -> list[dict]:
        if scheme not in SCHEME_KEYS:
            raise ValueError(f"Unknown scheme '{scheme}'. Valid: {SCHEME_KEYS}")
        if scheme not in self._cache:
            path = self._data_dir / f"{scheme}.json"
            if not path.exists():
                raise FileNotFoundError(f"Vocabulary file not found: {path}")
            self._cache[scheme] = json.loads(path.read_text(encoding="utf-8"))
        return self._cache[scheme]

    def _resolve_alias(self, query: str) -> str | None:
        return self._aliases.get(query.strip().lower())

    def search(
        self,
        scheme: str,
        query: str,
        *,
        fuzzy: bool = True,
        limit: int = 20,
    ) -> list[CodeResult]:
        """Run layered retrieval: exact → prefix → substring → fuzzy → alias."""
        entries = self._load(scheme)
        q = query.strip().lower()
        if not q:
            return []

        seen: dict[str, CodeResult] = {}

        def _add(entry: dict, score: float, method: MatchMethod) -> None:
            code = entry["code"]
            if code not in seen or score > seen[code].score:
                seen[code] = CodeResult(
                    code=code,
                    name_en=entry["name_en"],
                    name_he=entry.get("name_he"),
                    score=round(score, 3),
                    match_method=method,
                    scheme=scheme,
                )

        for entry in entries:
            code_l = entry["code"].lower()
            name_l = entry["name_en"].lower()
            name_he_l = (entry.get("name_he") or "").lower()

            if code_l == q or name_l == q or name_he_l == q:
                _add(entry, 1.0, "exact")
            elif code_l.startswith(q) or name_l.startswith(q) or name_he_l.startswith(q):
                _add(entry, 0.9, "prefix")
            elif q in code_l or q in name_l or q in name_he_l:
                boost = 0.05 if q in code_l else 0.0
                _add(entry, 0.7 + boost, "substring")

        alias_term = self._resolve_alias(q)
        if alias_term:
            alias_results = self.search(scheme, alias_term, fuzzy=fuzzy, limit=limit)
            for result in alias_results:
                _add(
                    {
                        "code": result.code,
                        "name_en": result.name_en,
                        "name_he": result.name_he,
                    },
                    result.score,
                    "alias",
                )

        if fuzzy and _RAPIDFUZZ and len(seen) < limit:
            names = [entry["name_en"] for entry in entries]
            hits = process.extract(
                query,
                names,
                scorer=fuzz.WRatio,
                limit=limit,
                score_cutoff=55,
            )
            for _name_en, score, idx in hits:
                entry = entries[idx]
                fuzz_score = round((score / 100) * 0.65, 3)
                _add(entry, fuzz_score, "fuzzy")

        return sorted(seen.values(), key=lambda result: result.score, reverse=True)[:limit]

    def search_all(self, query: str, *, fuzzy: bool = True, limit: int = 30) -> list[CodeResult]:
        """Search representative schemes and merge with round-robin fairness."""
        per_scheme = max(3, (limit + len(CROSS_SCHEME_KEYS) - 1) // len(CROSS_SCHEME_KEYS))
        buckets = [self.search(scheme, query, fuzzy=fuzzy, limit=per_scheme) for scheme in CROSS_SCHEME_KEYS]

        merged: list[CodeResult] = []
        indices = [0] * len(buckets)
        while len(merged) < limit:
            added = False
            for bucket_idx, bucket in enumerate(buckets):
                if indices[bucket_idx] >= len(bucket):
                    continue
                merged.append(bucket[indices[bucket_idx]])
                indices[bucket_idx] += 1
                added = True
                if len(merged) >= limit:
                    break
            if not added:
                break
        return merged
