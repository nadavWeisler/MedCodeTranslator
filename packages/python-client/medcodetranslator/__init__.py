"""
medcodetranslator — Python client for biomedical terminology retrieval.

Loads vocabulary JSON files from data/vocabularies/ and provides
exact, prefix, substring, and fuzzy search with transparent scoring.
"""

from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass, field
from typing import Literal

try:
    from rapidfuzz import fuzz, process
    _RAPIDFUZZ = True
except ImportError:
    _RAPIDFUZZ = False


MatchMethod = Literal["exact", "prefix", "substring", "fuzzy"]

SCHEME_KEYS = ["atc5", "icd10", "icd9", "icd11", "loinc", "cpt", "hcpcs", "cvx"]


@dataclass
class CodeResult:
    code: str
    name_en: str
    name_he: str | None
    score: float
    match_method: MatchMethod


class MedCodeTranslator:
    """
    Local in-memory terminology retrieval client.

    Parameters
    ----------
    data_dir : str | pathlib.Path
        Path to the directory containing vocabulary JSON files.
        Defaults to ``<repo_root>/data/vocabularies``.
    """

    def __init__(self, data_dir: str | pathlib.Path | None = None) -> None:
        if data_dir is None:
            data_dir = pathlib.Path(__file__).parents[3] / "data" / "vocabularies"
        self._data_dir = pathlib.Path(data_dir)
        self._cache: dict[str, list[dict]] = {}

    @property
    def schemes(self) -> list[str]:
        return SCHEME_KEYS

    def _load(self, scheme: str) -> list[dict]:
        if scheme not in self._cache:
            path = self._data_dir / f"{scheme}.json"
            if not path.exists():
                raise FileNotFoundError(f"Vocabulary file not found: {path}")
            self._cache[scheme] = json.loads(path.read_text(encoding="utf-8"))
        return self._cache[scheme]

    def search(
        self,
        scheme: str,
        query: str,
        *,
        fuzzy: bool = True,
        limit: int = 20,
    ) -> list[CodeResult]:
        """
        Run layered retrieval: exact → prefix → substring → fuzzy.

        Returns results sorted by descending score.
        """
        if scheme not in SCHEME_KEYS:
            raise ValueError(f"Unknown scheme '{scheme}'. Valid: {SCHEME_KEYS}")
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
                )

        for e in entries:
            code_l = e["code"].lower()
            name_l = e["name_en"].lower()
            name_he_l = (e.get("name_he") or "").lower()

            if code_l == q or name_l == q or name_he_l == q:
                _add(e, 1.0, "exact")
            elif code_l.startswith(q) or name_l.startswith(q):
                _add(e, 0.9, "prefix")
            elif q in code_l or q in name_l or q in name_he_l:
                boost = 0.05 if q in code_l else 0.0
                _add(e, 0.7 + boost, "substring")

        if fuzzy and _RAPIDFUZZ and len(seen) < limit:
            names = [e["name_en"] for e in entries]
            hits = process.extract(
                query,
                names,
                scorer=fuzz.WRatio,
                limit=limit,
                score_cutoff=55,
            )
            for name_en, score, idx in hits:
                e = entries[idx]
                fuzz_score = round((score / 100) * 0.65, 3)
                _add(e, fuzz_score, "fuzzy")

        return sorted(seen.values(), key=lambda r: r.score, reverse=True)[:limit]
