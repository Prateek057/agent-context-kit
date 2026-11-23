---
name: codeprint
description: Analyzes a repository's application code (not tests, not infrastructure) and generates two draft skills for it, a conventions reference (patterns) and a task executor (use-patterns), with evidence labels and links to contracts instead of copied values. Use when setting up an AI coding agent on a repo, or when conventions changed and the patterns skill is stale.
---

# codeprint: application-code conventions

Generates `patterns/SKILL.md` (how code is written here) and `use-patterns/SKILL.md` (how to carry out a coding
task with those conventions) for the current repository. Works in any agent that reads `SKILL.md` files.

**Scope:** application code only: handlers, controllers, endpoints, services, repositories, domain models,
workers/consumers, middleware, validators, mappers, DTOs, events/commands/queries, config/startup.
Tests → `testprint`. Infrastructure (IaC, Docker, CI/CD, deployment) → `infraprint`.
Requirements, specs, contracts, `AGENTS.md` → `contextprint`.

## When to use / skip

- Use: first time an agent works on this repo; conventions changed; the provenance line of an existing
  patterns skill points to a commit after which the sampled paths changed.
- Skip: a current patterns skill exists; the user only wants one small change (use `use-patterns`).

## Before you start

Read `references/generated-output.md`. It defines where to write, the provenance line, evidence labels,
"conventions, not rules", writing style, routing and the final message. Every phase below follows it.

## Phases

Announce each phase as `[phase N/6] <name>`. Read the phase's reference file just before running it, not upfront.

| # | Phase | Reference |
|---|---|---|
| 1 | Topology (monorepo / monolith / single service) | `references/topology.md` |
| 2 | Languages and frameworks, per module | `references/languages.md` |
| 3 | Code subtypes (and which to skip) | `references/subtypes.md` |
| 4 | Pattern extraction from samples, with counts | `references/extraction.md` |
| 5 | Write `patterns/SKILL.md` | `references/output-format.md` |
| 6 | Write `use-patterns/SKILL.md`, add the route line, report | `references/use-patterns-template.md` |

Also check in phase 1 whether the repo has requirements, specs, contracts or ADRs (for example `REQUIREMENTS.md`,
`specs/`, `contracts/`, `*.rules.yaml`, `openapi.*`, `decisions/`, `adr/`). If so, the output links to them and
never restates their values.

## Sampling budget

- At most 8 subtypes (highest file count first). Note any you skipped.
- 2–3 files per subtype, preferring files with real logic. Read enough of each file to see the constructor and
  one complete method (usually under 150 lines), not the whole file.
- To count a convention, use search (grep/glob) across the subtype instead of reading more files. Counts feed
  the `(observed n/m)` labels.

## Optional: workflow mode (Claude Code)

If the Workflow tool is available, `workflows/codeprint.js` runs the same phases with per-phase model tiers.
Otherwise run the phases above in the session. The output rules are identical.

## Common mistakes

| Mistake | Do this instead |
|---|---|
| Reading every file | 2–3 samples per subtype, then grep to count |
| Copying limits, codes or timeouts into the skill | Link to the contract or the code file that holds them |
| "Anti-patterns" guessed from a single file | Only with counts, e.g. `(observed 8/8, B 0/8)` |
| Telegraphic, compressed bullets | Short plain sentences; keep the reason for non-obvious rules |
| Same patterns for every monorepo package | Check whether packages differ; note differences per package |
| Tests or infra sections in patterns | Tell the user to run testprint / infraprint |
| Claiming token savings | Report what was generated; savings are only known if measured |
