---
name: blueprint
description: Sets up or refreshes the whole agent context layer of a repository by running the print tools in the right order - contextprint audit first, then codeprint, testprint and infraprint where they apply - and reconciling the results into one report with AGENTS.md routing to everything. Use when onboarding a repository for AI coding agents, when asked to "set up context", "run all the prints", or to refresh generated convention skills after the code changed.
---

# blueprint

Orchestrates the print tools. It writes nothing itself except the final report; each tool writes its own output
under its own rules. The rules for generated files are in
[references/generated-output.md](references/generated-output.md).

| Tool | Owns | Decides or describes |
|---|---|---|
| contextprint | AGENTS.md, requirements, architecture, ADRs, specs, contracts, acceptance tests, CI | decides (what must be true) |
| codeprint | `patterns`, `use-patterns` | describes application code |
| testprint | `test-patterns`, `use-test-patterns` | describes tests |
| infraprint | `infra-patterns`, `use-infra-patterns` | describes infrastructure |

Documents that decide win over skills that describe. A generated skill links to a contract; it never copies it.

## Modes

- **setup** (default): first run in a repository.
- **refresh**: re-run only the tools whose files changed since the commit recorded in their provenance line.

## Before you start

- Find the sibling skills. They are installed next to this one (`../contextprint-audit/`, `../codeprint/`,
  `../testprint/`, `../infraprint/`), or under the host's plugin folder. If one is missing, say so and continue
  without it; do not imitate a missing tool from memory.
- `SKILL_DIR` = the directory containing this file.

## Phase 1: Plan (no writes)

1. Run `python3 "$SKILL_DIR/scripts/plan.py" --root . --format json`. It reports, per generator, whether it applies,
   what already exists, and a status: `run`, `refresh`, `review`, `ok` or `skip`.
2. Run the contextprint audit (follow the `contextprint-audit` skill, Step 1 only) to get `.contextprint/report.json`.
3. Show the user one table: tool, status, reason, what it will write. Include the audit score and the top three
   missing artifacts. In refresh mode, list only `refresh` and `review` rows.
4. Ask once: which rows to run, and whether contextprint should also draft missing documents (that is a larger job
   done by the `contextprint-writer` agent, one document at a time). Default: generators only.

## Phase 2: Run the tools (in this order)

1. **contextprint**, only if the user asked for it: scaffold or write the approved documents first, so the
   generators can link to contracts instead of inventing values.
2. **codeprint**, **testprint**, **infraprint** for the approved rows: open each tool's `SKILL.md` and follow it
   fully. Use one skills dir for all of them (pick it once, per the generated-output rules).
3. Between tools, carry over only facts: the skills dir, the AGENTS.md path, the contracts list. Do not pass one
   tool's conventions to the next.

## Phase 3: Reconcile

1. Re-run the contextprint audit. Fix every `conventions` finding the tools caused:
   - restated contract value: replace it with a link to the contract;
   - value conflict: do not pick a side; move it to `## Open questions` in the generated skill;
   - not routed: add the missing line under `## Conventions` in AGENTS.md (only if AGENTS.md exists).
2. Overlap: if the same rule appears in two generated skills (for example error handling in `patterns` and
   `test-patterns`), keep it in the skill of the domain it belongs to and link from the other.
3. Run `plan.py` again. Every row you ran should now be `ok` or `review`.

Do not edit requirements, ADRs, specs or contracts in this phase. Problems there become open questions.

## Phase 4: Report

Write `.contextprint/blueprint.md` and show it:
- Table: tool, status before, action taken, files written.
- Audit score before and after (heuristic, not a quality measure).
- Open questions collected from all tools (contradictions between code and docs).
- Count of `(inferred)` rules per generated skill; these need review first.
- A plain note that generated skills are drafts. Make no token or cost claims; they are only known if measured on
  the team's own tasks.

## Common mistakes

| Mistake | Instead |
|---|---|
| Running generators before contracts exist, then copying values from code | Run them, but link to the code file holding the value; list missing contracts in the report |
| Regenerating everything in refresh mode | Only `refresh` and `review` rows |
| Two skills dirs (`.claude/skills` and `.agents/skills`) with the same skill | One dir; the plan warns about duplicates |
| Creating AGENTS.md from blueprint | Only contextprint drafts AGENTS.md, and only when the user approves |
| Treating the audit score as proof of quality | It counts artifacts and findings; it does not measure agent success |
