#!/usr/bin/env bash
# Create roadmap milestones and issues on GitHub.
# Usage: ./scripts/create_roadmap_issues.sh
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-nadavWeisler/MedCodeTranslator}"

declare -A MILESTONES=(
  ["v1.1 — Foundation"]="2026-07-01"
  ["v1.2 — Mobile beta"]="2026-08-01"
  ["v1.3 — Packages"]="2026-08-15"
  ["v1.4 — Data depth"]="2026-10-01"
  ["v2.0 — Unified search"]="2026-11-01"
  ["v2.1 — Platform"]="2026-12-01"
)

for title in "${!MILESTONES[@]}"; do
  due="${MILESTONES[$title]}"
  if ! gh api "repos/$REPO/milestones" --jq ".[] | select(.title==\"$title\") | .number" | grep -q .; then
    gh api "repos/$REPO/milestones" -f title="$title" -f due_on="${due}T00:00:00Z" -f state=open \
      -f description="Roadmap milestone from docs/ROADMAP.md" >/dev/null
    echo "Created milestone: $title"
  else
    echo "Milestone exists: $title"
  fi
done

get_ms() {
  gh api "repos/$REPO/milestones" --jq ".[] | select(.title==\"$1\") | .number"
}

create_issue() {
  local milestone_title="$1" title="$2" labels="$3" body="$4"
  local ms_num
  ms_num=$(get_ms "$milestone_title")
  if gh issue list --repo "$REPO" --search "in:title \"$title\"" --json title --jq '.[].title' | grep -Fxq "$title"; then
    echo "Issue exists: $title"
    return
  fi
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --milestone "$ms_num" --body "$body"
}

MS_V11="v1.1 — Foundation"
MS_V12="v1.2 — Mobile beta"
MS_V13="v1.3 — Packages"
MS_V14="v1.4 — Data depth"
MS_V20="v2.0 — Unified search"
MS_V21="v2.1 — Platform"

create_issue "$MS_V11" "Wire alias expansion into layered search" "type: feature,area: search,priority: P2" "See docs/ROADMAP.md §1.1"
create_issue "$MS_V11" "Commit search benchmark baselines and update README" "type: ci,area: search,priority: P2" "See docs/ROADMAP.md §1.2"
create_issue "$MS_V11" "Show dataset coverage badges (full vs demo) in UI" "type: feature,area: dataset,priority: P2" "See docs/ROADMAP.md §1.3"
create_issue "$MS_V11" "Write dataset refresh and triage runbook" "type: docs,area: dataset,priority: P2" "See docs/ROADMAP.md §1.4"
create_issue "$MS_V12" "Add EAS config and first iOS/Android preview builds" "type: ci,area: mobile,priority: P2" "See docs/ROADMAP.md §2.1"
create_issue "$MS_V12" "Refresh App Store and Play Store listing copy" "type: docs,area: mobile,priority: P3" "See docs/ROADMAP.md §2.2"
create_issue "$MS_V13" "Publish @medcode/core and @medcode/search to npm" "type: ci,area: search,priority: P2" "See docs/ROADMAP.md §2.3"
create_issue "$MS_V13" "Publish medcodetranslator to PyPI" "type: ci,area: search,priority: P2" "See docs/ROADMAP.md §2.4"
create_issue "$MS_V14" "Import LOINC common-panel subset with license docs" "type: data,area: dataset,priority: P2" "See docs/ROADMAP.md §3.1"
create_issue "$MS_V14" "Add Hebrew name_he labels for high-frequency ICD-10" "type: data,area: dataset,priority: P2" "See docs/ROADMAP.md §3.2"
create_issue "$MS_V14" "Add ICD-10 to ICD-11 reference crosswalk" "type: data,area: dataset,priority: P3" "See docs/ROADMAP.md §3.3"
create_issue "$MS_V20" "Implement cross-scheme search mode" "type: feature,area: search,priority: P2" "See docs/ROADMAP.md §4.1"
create_issue "$MS_V20" "Add copy-link and copy-code sharing actions" "type: feature,area: web,priority: P3" "See docs/ROADMAP.md §4.2"
create_issue "$MS_V20" "Optimize ICD-10 search performance" "type: feature,area: search,priority: P3" "See docs/ROADMAP.md §4.3"
create_issue "$MS_V20" "Complete manual accessibility audit checklist" "type: docs,area: compliance,priority: P3" "See docs/ROADMAP.md §4.4"
create_issue "$MS_V21" "Export vocabularies as FHIR CodeSystem JSON" "type: feature,area: dataset,priority: P3" "See docs/ROADMAP.md §5.1"
create_issue "$MS_V21" "Add optional localhost terminology query API" "type: feature,area: search,priority: P3" "See docs/ROADMAP.md §5.2"
create_issue "$MS_V21" "Tag versioned dataset releases" "type: ci,area: dataset,priority: P3" "See docs/ROADMAP.md §5.3"
create_issue "$MS_V21" "Spike: RxNorm and NDC licensing and feasibility" "type: data,area: compliance,priority: P3" "See docs/ROADMAP.md §5.4"

echo "Done."
