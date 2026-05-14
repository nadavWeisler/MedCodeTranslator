#!/usr/bin/env python3
"""Upstream source sentinel for MedCodeTranslator.

Probes all dataset source URLs listed in assets/data/source-metadata.json, plus
CMS ICD-10-CM and HCPCS annual file URLs for surrounding years. Reports availability
and detects when new CMS annual files are published before the weekly refresh runs.

Optionally creates a GitHub Issue when sources are unreachable (requires GITHUB_TOKEN).

Exit codes:
  0  Probe completed (use --strict to exit 1 on failures)
  1  One or more sources unreachable and --strict flag was provided
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from typing import TypedDict

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
DEFAULT_ASSETS_DIR = ROOT / "assets" / "data"
DEFAULT_REPORT_DIR = ROOT / "build" / "upstream-sentinel"


class ProbeResult(TypedDict):
    dataset: str
    url: str
    status: str           # "ok" | "error" | "redirect"
    http_status: int | None
    note: str
    probed_at_utc: str


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def probe_url(url: str, timeout: int = 20) -> tuple[str, int | None, str]:
    """Probe a URL with HEAD (fallback to GET). Returns (status, http_code, note)."""
    headers = {"User-Agent": "MedCodeTranslator upstream-sentinel/1.0"}
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers=headers)
            if method == "GET":
                req.add_header("Range", "bytes=0-0")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                code = getattr(resp, "status", 200)
                if 200 <= code < 400:
                    return "ok", code, ""
                return "error", code, f"HTTP {code}"
        except urllib.error.HTTPError as exc:
            if exc.code == 416:
                # Range Not Satisfiable — the URL exists, Range just isn't supported
                return "ok", 416, "accessible (Range header not supported)"
            if exc.code in (301, 302, 303, 307, 308):
                location = exc.headers.get("Location", "")
                return "redirect", exc.code, f"Redirect → {location}"
            return "error", exc.code, f"HTTP {exc.code}: {exc.reason}"
        except urllib.error.URLError as exc:
            if method == "HEAD":
                continue  # retry with GET
            return "error", None, f"URL error: {exc.reason}"
        except Exception as exc:  # noqa: BLE001
            if method == "HEAD":
                continue
            return "error", None, f"Unexpected error: {exc}"
    return "error", None, "Both HEAD and GET probes failed"


def cms_icd10_url(year: int) -> str:
    return f"https://www.cms.gov/files/zip/{year}-code-descriptions-tabular-order.zip"


def cms_hcpcs_url(year: int) -> str:
    return f"https://www.cms.gov/files/zip/{year}-alpha-numeric-hcpcs-file.zip"


def probe_cms_annual_files(timeout: int = 20) -> list[ProbeResult]:
    """Probe CMS ICD-10-CM and HCPCS for nearby annual file availability."""
    results: list[ProbeResult] = []
    now_year = dt.datetime.now(dt.timezone.utc).year
    for year_offset in (-1, 0, 1, 2):
        year = now_year + year_offset
        for label, url_fn in (
            ("CMS ICD-10-CM", cms_icd10_url),
            ("CMS HCPCS", cms_hcpcs_url),
        ):
            url = url_fn(year)
            status, code, note = probe_url(url, timeout)
            tag = "future" if year_offset > 0 else ("current" if year_offset == 0 else "prior")
            results.append(
                ProbeResult(
                    dataset=f"{label}-{year}",
                    url=url,
                    status=status,
                    http_status=code,
                    note=f"[{tag} year] {note}" if note else f"[{tag} year] available",
                    probed_at_utc=utc_now(),
                )
            )
    return results


def load_metadata_sources(assets_dir: pathlib.Path) -> list[dict]:
    path = assets_dir / "source-metadata.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8")).get("sources", [])


def create_github_issue(repo: str, title: str, body: str, labels: list[str]) -> bool:
    """Create a GitHub Issue via REST API. Requires GITHUB_TOKEN env var."""
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        return False
    payload = json.dumps({"title": title, "body": body, "labels": labels}).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/issues",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status in (200, 201)
    except Exception as exc:  # noqa: BLE001
        print(f"[sentinel] GitHub Issue creation failed: {exc}", file=sys.stderr)
        return False


def build_issue_body(failures: list[ProbeResult], available_future: list[ProbeResult]) -> str:
    lines = [
        "## Upstream sentinel report",
        "",
        f"Probe timestamp: {utc_now()}",
        "",
    ]
    if failures:
        lines += ["### ⚠️ Unreachable sources", ""]
        for r in failures:
            lines.append(f"- **{r['dataset']}**: {r['note']} (`{r['url']}`)")
        lines.append("")
    if available_future:
        lines += ["### 📦 New CMS annual files available", ""]
        for r in available_future:
            lines.append(f"- **{r['dataset']}**: {r['note']} (`{r['url']}`)")
        lines.append("")
    lines += [
        "### Action",
        "- Review the `refresh-medical-db` workflow before the next scheduled run.",
        "- Update URL resolvers in `scripts/refresh_medical_db.py` if needed.",
        "",
        "_Opened automatically by the `upstream-sentinel` agent._",
    ]
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Probe upstream dataset source URLs")
    p.add_argument("--assets-dir", type=pathlib.Path, default=DEFAULT_ASSETS_DIR)
    p.add_argument("--report-dir", type=pathlib.Path, default=DEFAULT_REPORT_DIR)
    p.add_argument("--repo", default="nadavWeisler/MedCodeTranslator")
    p.add_argument("--create-issue", action="store_true",
                   help="Create a GitHub Issue when sources are unreachable")
    p.add_argument("--strict", action="store_true",
                   help="Exit 1 if any monitored source is unreachable")
    p.add_argument("--timeout", type=int, default=20)
    return p.parse_args()


def main() -> int:
    args = parse_args()

    sources = load_metadata_sources(args.assets_dir)
    all_results: list[ProbeResult] = []
    seen_urls: set[str] = set()

    # --- Probe URLs from source-metadata.json ---
    print("Probing sources from source-metadata.json...")
    for entry in sources:
        url = entry.get("url", "").strip()
        dataset = entry.get("dataset", "unknown")
        if not url or not url.startswith("http") or url in seen_urls:
            continue
        seen_urls.add(url)
        status, code, note = probe_url(url, args.timeout)
        result = ProbeResult(
            dataset=dataset,
            url=url,
            status=status,
            http_status=code,
            note=note,
            probed_at_utc=utc_now(),
        )
        all_results.append(result)
        icon = "✓" if status == "ok" else "✗"
        suffix = f" ({note})" if note else ""
        print(f"  [{icon}] {dataset}: {status}{suffix}")

    # --- Probe CMS annual files ---
    print("\nProbing CMS annual file availability...")
    cms_results = probe_cms_annual_files(args.timeout)
    all_results.extend(cms_results)
    now_year = dt.datetime.now(dt.timezone.utc).year
    for r in cms_results:
        icon = "✓" if r["status"] == "ok" else "–"
        print(f"  [{icon}] {r['dataset']}: {r['note']}")

    # --- Classify ---
    failures = [r for r in all_results if r["status"] == "error"]
    available_future_cms = [
        r for r in cms_results
        if r["status"] == "ok" and str(now_year + 1) in r["dataset"] or str(now_year + 2) in r["dataset"]
    ]

    # --- Write report ---
    args.report_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "generated_at_utc": utc_now(),
        "probed_count": len(all_results),
        "failure_count": len(failures),
        "results": all_results,
    }
    report_path = args.report_dir / "sentinel-report.json"
    report_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"\nReport written to {report_path}")

    # --- GitHub step summary ---
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        lines = [
            "## Upstream sentinel",
            "",
            f"- Sources probed: {len(all_results)}",
            f"- Failures: {len(failures)}",
            "",
        ]
        if failures:
            lines.append("### Unreachable sources")
            for r in failures:
                lines.append(f"- **{r['dataset']}**: {r['note']}")
        else:
            lines.append("All monitored sources are reachable. ✓")
        if available_future_cms:
            lines += ["", "### New CMS annual files detected"]
            for r in available_future_cms:
                lines.append(f"- **{r['dataset']}**: {r['note']}")
        with open(step_summary, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")

    # --- Optionally create GitHub Issue ---
    if failures and args.create_issue:
        body = build_issue_body(failures, available_future_cms)
        title = f"[sentinel] {len(failures)} upstream dataset source(s) unreachable"
        created = create_github_issue(
            args.repo, title, body,
            ["type: data", "area: dataset", "needs-triage"],
        )
        if created:
            print("GitHub Issue created.")
        else:
            print("Skipped GitHub Issue creation (no GITHUB_TOKEN or API error).")

    if failures and args.strict:
        print(
            f"\n[sentinel] {len(failures)} source(s) unreachable — exiting 1 (--strict).",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
