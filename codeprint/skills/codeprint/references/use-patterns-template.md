# Phase 6: Write use-patterns/SKILL.md, route it, report

## Purpose
A task executor that applies the patterns skill with a few checkpoints. It defers to the repo's own workflow.

## Location
Next to the patterns skill, e.g. `.claude/skills/use-patterns/SKILL.md` or `.agents/skills/use-patterns/SKILL.md`.

## Template

````markdown
---
name: use-patterns
description: Carries out a coding task in <repo-name> following the patterns skill, with plan, implement, wire and verify checkpoints. Use for new handlers, endpoints, services or other application code.
---
<!-- generated-by: codeprint 2.0.0 | commit: <sha> | date: <YYYY-MM-DD> | sampled: <n> files | status: draft, review before relying on it -->

# Use patterns: task executor

If `AGENTS.md` (or `CLAUDE.md` / `GEMINI.md`) defines a workflow or a validate command, follow it. The
checkpoints below apply only where it is silent.

## Load only what the task needs
1. Read the patterns skill sections for the subtypes this task touches, not the whole file.
2. Read the "copy from" file for each new file you create.
3. If the task involves rules or values (limits, error codes, timeouts), read the linked contract or spec. Never
   take values from memory or from the patterns skill.

## Checkpoints

| # | Checkpoint | What happens |
|---|---|---|
| 1 | Plan | List files to create or change, the subtypes involved, and any assumption that needs confirming. |
| 2 | Implement | Write code following the conventions; start from the canonical file. |
| 3 | Wire | <ADAPT: registration step, e.g. "add the handler to handlers/registry.py"> |
| 4 | Verify | Run <ADAPT: build/test command>; fix failures before reporting. |

Merge 2 and 3 for single-file tasks. Skip 4 only if the repo has no build or test command.

## Ask before
- choosing between two valid patterns,
- changing <ADAPT: shared library path> or <ADAPT: infra path>,
- deleting or renaming existing code,
- business rules the task does not state (they belong in the spec, not in a guess).

## Report
One short paragraph: what changed, where, and the verify result. Use edits (diffs) for existing files rather than
rewriting them.
````

## Adaptation
Replace every `<ADAPT: ...>` with what the repo actually uses (registration file, build/test command, shared library
path, infra path). If unknown, write "unknown, ask the user" rather than guessing.

## Route and report
1. Routing per `generated-output.md` §7: one line per generated skill under `## Conventions` in `AGENTS.md`, if it exists.
2. Final message per §8: files written, files sampled, number of `(inferred)` items, open questions, "draft, please
   review". Also tell the user: tests → `testprint`, infrastructure → `infraprint`, missing requirements/specs/contracts/AGENTS.md → `contextprint`.
