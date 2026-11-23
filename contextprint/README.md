# contextprint — audit, scaffold and write context-layer artifacts

Portable plugin that applies the white paper's playbook (§11–13, Appendix C) to any repository.

| Component | Type | What it does |
|---|---|---|
| `contextprint-audit` | skill + `audit.py` | Stage 1: deterministic scan (stdlib Python, CI-ready). Stage 2: agent quality review (Q1–Q16). Also checks convention skills from codeprint/testprint/infraprint: value conflicts, evidence labels, AGENTS.md routing, staleness. Writes `.contextprint/report.md` + `.json`. |
| `contextprint-scaffold` | skill + `scaffold.py` | Creates templates for missing artifacts. Dry run by default, never overwrites. |
| `contextprint-writer` | agent | Reads the audit JSON and writes the missing documents from real sources, with a traceability log and open questions instead of invented values. |

## Artifacts checked

Required: `AGENTS.md` router · numbered `REQUIREMENTS.md` · minimal-hybrid feature specs ·
DSL contracts (OpenAPI / JSON Schema / SQL DDL / `rules.yaml`) · acceptance tests citing REQ-IDs ·
CI + `validate` target. Recommended: `architecture.md` · ADRs · pinned versions · `CHANGELOG.md`.
Plus cross-checks: REQ-ID traceability (requirements → specs → contracts → tests), conflicting
constants across docs, vague phrases, deliberation in specs, filler in AGENTS.md, broken routes,
unfilled templates. Full model: `skills/contextprint-audit/references/artifact-model.md`.

## Install

Quick install (all detected hosts, via symlinks), from the toolkit root: `./install.sh install --tools contextprint` (`status`, `uninstall`).

| Host | How |
|---|---|
| Antigravity | Copy or symlink this folder to `~/.gemini/config/plugins/contextprint/` (or a workspace `.agents/plugins/contextprint/`), then restart. |
| Gemini CLI | `gemini extensions install <path-or-git-url>` (uses `gemini-extension.json`; skills in `skills/`, agent in `agents/`). |
| Claude Code | Add as a plugin (uses `.claude-plugin/plugin.json`; skills in `skills/`, agent in `agents/`). |
| Any agent | Point it at `skills/contextprint-audit/SKILL.md`; the skills follow the open `SKILL.md` format. |
| No agent / CI | `python3 skills/contextprint-audit/scripts/audit.py --root <repo> --fail-on missing` |

## Use

```text
"Audit this repo for context-layer readiness"          -> report + top to-dos
"Scaffold the missing artifacts"                       -> dry run, then --apply
"Have the contextprint-writer agent write the missing docs" -> drafts + writer-log + open questions
```

CLI:

```bash
python3 skills/contextprint-audit/scripts/audit.py --root . --out .contextprint/report.md --json-out .contextprint/report.json
python3 skills/contextprint-scaffold/scripts/scaffold.py --root . --from-report .contextprint/report.json --feature login
python3 skills/contextprint-scaffold/scripts/scaffold.py --root . --only agents_md,spec --feature login --apply
```

Repo-specific layout: add `.contextprint.json` at the repo root:

```json
{
  "paths": {"requirements": ["docs/prd.md"], "spec": ["docs/features/*.md"]},
  "ignore": ["legacy/*"],
  "not_applicable": ["adr"],
  "req_id_pattern": "\\b(?:REQ|R)-?\\d+\\b"
}
```

Exit codes with `--fail-on`: `missing` (a required artifact is missing), `error`, `warn`; default `never`.
The readiness score is a heuristic for tracking progress, not a measurement.

## Tests

```bash
python3 tests/run_tests.py
```

## Limits

- The scanner uses file names and text patterns; unusual layouts need `.contextprint.json`.
- It cannot judge whether a spec is *right*. That needs the requirements, human review and
  held-out acceptance tests (white paper §13.2). The agent review (stage 2) and the writer's
  open questions are aids, not a substitute for the owner's sign-off.
