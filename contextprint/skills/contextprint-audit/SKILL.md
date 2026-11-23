---
name: contextprint-audit
description: >-
  Analyzes the current repository against the contextprint approach
  (numbered requirements, architecture + ADRs, minimal-hybrid feature specs, DSL contracts,
  acceptance tests from requirements, AGENTS.md router, CI enforcement) and writes a report
  listing which artifacts are required, present, partial or missing, with a prioritised to-do.
  Use when the user asks to audit, analyze, assess or check a repo for context-layer readiness,
  spec/contract coverage, AGENTS.md quality, or "what docs are we missing".
---

# contextprint audit

Two stages: a deterministic scan (same result everywhere, CI-friendly), then your quality
review of what the scan found. Report only; do not create or edit project files in this skill.

The artifact model (what is required and why) is in
[references/artifact-model.md](references/artifact-model.md). Read it before the review.

## Step 1: Deterministic scan

Run from the repository root (`SKILL_DIR` = the directory containing this file):

```bash
python3 "$SKILL_DIR/scripts/audit.py" --root . \
  --out .contextprint/report.md --json-out .contextprint/report.json
```

- Python 3.8+, standard library only (PyYAML is used for YAML parsing if installed).
- If the repo uses other names or locations (e.g. `docs/prd.md`, IDs like `R12`), create
  `.contextprint.json` at the repo root and re-run. Keys: `paths` (artifact → globs),
  `ignore` (globs), `not_applicable` (artifact IDs), `req_id_pattern` (regex). Ask the user
  before marking a required artifact `not_applicable`.
- Verify: `.contextprint/report.md` exists and its table lists all 11 artifacts (`conventions` shows N/A when the repo has none).

## Step 2: Quality review (judgement)

Read [references/review-checklist.md](references/review-checklist.md). Apply checks Q1–Q16
to the files listed in the report (largest risk first: specs, contracts, AGENTS.md). Quote the
exact line for every finding; never report a problem you cannot quote. Append the table and
verdict to `.contextprint/report.md` under `## Quality review (agent)`.

Keep it honest: if a check cannot be judged from the repo (e.g. no requirements to compare
against), say "not assessable" rather than guessing.

## Step 3: Present the result

Show the user:
1. The artifact table (status per artifact) and the readiness score, labelled heuristic.
2. The top 5 to-dos, merging scanner and review findings, in this order: AGENTS.md routing,
   numbered requirements, specs (DSL block, examples, intent), contracts, acceptance tests,
   CI, then recommended artifacts.
3. A link to `.contextprint/report.md`.

Then offer, without doing it yet:
- **Scaffold** missing artifacts as templates → `contextprint-scaffold` skill (dry run first,
  never overwrites).
- **Write** the missing documents from the repo's real sources → `contextprint-writer` agent,
  passing `.contextprint/report.json`.

## CI use

```bash
python3 audit.py --fail-on missing   # exit 1 if a required artifact is missing
python3 audit.py --fail-on error     # ... or any error finding
```

Suggest adding `.contextprint/` to `.gitignore` unless the team wants to commit reports.
