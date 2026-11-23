---
name: testprint
description: Analyzes a repository's tests and generates two draft skills, a test-conventions reference (test-patterns) and a test-writing executor (use-test-patterns), with per-subtype canonical files, test-data factories, pitfalls that break first attempts, and evidence labels. Use when setting up an AI coding agent to write tests in a repo, or when test conventions changed.
---

# testprint: test conventions

Generates `test-patterns/SKILL.md` and `use-test-patterns/SKILL.md` for the current repository. Works in any agent
that reads `SKILL.md` files. Application code → `codeprint`. Infrastructure → `infraprint`.
Requirements, specs, contracts, `AGENTS.md` → `contextprint`.

## When to use / skip

- Use: an agent will write tests here for the first time; test conventions changed; the provenance line of an
  existing test-patterns skill points to a commit after which the test paths changed.
- Skip: a current test-patterns skill exists; the user wants one specific test (use `use-test-patterns`).

## Before you start

Read `references/generated-output.md` (where to write, provenance line, evidence labels, conventions vs rules,
style, routing, final message). Every phase follows it.

## Phases

Announce each phase as `[phase N/5] <name>`.

| # | Phase | What |
|---|---|---|
| 1 | Detect | Test directories, framework, assertion and mocking libraries, test-data approach, integration infrastructure, test types (unit / integration / e2e / contract), shared utilities, context docs, output location, commit |
| 2 | Extract + split subtypes | Per test type (max 4), 2–3 samples each. Split into subtypes when styles differ (below). Count each convention with grep across the type: `(observed n/m)` |
| 3 | Pitfalls | What breaks a first attempt (below) |
| 4 | Write `test-patterns/SKILL.md` | Required sections below |
| 5 | Write `use-test-patterns/SKILL.md`, add route line, report | Required sections below |

Read enough of each sample to see setup and one complete test (usually under 150 lines).

### Subtype splitting (phase 2)

Within one test type, split when you find two or more distinct styles: different assertion libraries or helpers,
different setup (constructor injection vs factory vs shared fixture), different mocking depth (full mocks vs none).
Example subtypes: `unit:service` (mocks + standard assertions), `unit:validator` (validation helpers),
`unit:mapper` (no mocks, input/output only), `unit:component` (render + query + interaction).

### Pitfalls (phase 3)

1. **Abstract or polymorphic types in test data:** which concrete type tests actually instantiate, which fields must be set.
2. **Specialized assertion libraries** used differently from the main style.
3. **Null/empty traps:** validators that treat null, empty and missing differently, or throw instead of returning an error.
4. **Mandatory/immutable fields:** the minimal field set for a valid test object.
5. **Test-data factories:** `create*()`, `build()`, `*Factory`, `*Fixture`, `*Builder`: which types and fields they set.

Report file paths and type names, each with a label. Pitfalls usually save more rework than patterns.

## Required sections

**test-patterns:** Overview (frameworks, test types, where rules live) · one section per subtype (naming, setup,
assertion style, one canonical file, a short skeleton) · Test-data factories (path + minimal creation example) ·
Pitfalls · Avoid (max 5, counted only) · Requirement traceability (only if the repo has requirement IDs: how tests cite
them, with counts; link `REQUIREMENTS.md`) · "Writing a … → copy from" table · Open questions.

**use-test-patterns:** defer to `AGENTS.md` workflow if present · "Before writing a {subtype} test, read: {path}" per
subtype · subtype → canonical file table · factory template · checkpoints Plan → Write → Verify (real test command) ·
ask before: unit vs integration choice, changing shared fixtures, polymorphic type decisions.

Expected values in tests come from requirements, specs or contracts. The skill links to them and never restates them.

## Optional: workflow mode (Claude Code)

If the Workflow tool is available, `workflows/testprint.js` runs the same phases with per-phase model tiers.

## Common mistakes

| Mistake | Do this instead |
|---|---|
| Reading every test file | 2–3 samples per type, then grep to count |
| Copying test data or expected values into the skill | Link fixture files and the contract/spec |
| One pattern for all unit tests | Split subtypes when assertion or setup styles differ |
| Only extracting what works | Also extract what breaks (pitfalls) |
| Vague "copy the nearest test" | Explicit subtype → canonical file table |
| Telegraphic, compressed bullets | Short plain sentences; keep the reason for non-obvious rules |
