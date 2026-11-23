# Generated output: where, how, and what not to write

Shared by codeprint, testprint and infraprint (and checked by blueprint and contextprint). Every generated skill follows these rules.
Source of truth: `agent-context-kit/_shared/generated-output.md` (each skill keeps an identical copy in `references/`; `tests/run_tests.py` checks they match).

## 1. Where to write (one location, never duplicate)

| Signal (check in this order) | Write to |
|---|---|
| The user named a location | that location |
| Running in Claude Code, or `.claude/` exists in the repo | `.claude/skills/<name>/SKILL.md` |
| Running in Gemini CLI, or `.gemini/` exists in the repo | `.gemini/skills/<name>/SKILL.md` |
| Anything else (Antigravity, Codex, other agents) | `.agents/skills/<name>/SKILL.md` |

If more than one row matches and you are unsure, ask once. Create directories as needed.

## 2. Frontmatter

Only standard fields: `name` and `description`. The description says what the skill covers and when to use it
(it is how agents decide to load it). No `trigger:`, `arguments:` or tool-specific keys.

## 3. Provenance line (first line after the frontmatter)

```markdown
<!-- generated-by: <tool> <version> | commit: <git rev-parse --short HEAD, or none> | date: <YYYY-MM-DD> | sampled: <n> files | status: draft, review before relying on it -->
```

Tools (contextprint, blueprint) use this line to detect stale output: if files under the sampled paths changed
after `commit`, the skill should be regenerated.

## 4. Evidence labels

Every convention, rule, pitfall and anti-pattern ends with one label:

| Label | Meaning |
|---|---|
| `(observed n/m)` | seen in n of the m files you checked for it |
| `(inferred)` | reasoned from what you saw, not directly seen; keep these few |

- Anti-patterns need evidence: write "Don't use B; the repo uses A (observed 8/8, B 0/8)". If you cannot count it, leave it out.
- A rule seen in only 1 of several files is not a convention. Mention it as a variant or skip it.

## 5. Conventions, not rules

The generated skill describes **how code is written here**. It does not decide **what must be true**.

- If the repo has requirements, specs, contracts (`contracts/`, `*.rules.yaml`, OpenAPI, JSON Schema, SQL DDL) or decision records (ADRs), **do not restate their values** (limits, timeouts, error codes, retry counts, versions). Link to the file: "Lockout limits: see `contracts/user-service.rules.yaml`".
- If a value exists only in code, point to it ("see `src/config/limits.py`") instead of copying it.
- If what the code does contradicts a spec or contract, do not pick a side. List it under `## Open questions`.

## 6. Writing style

- Concise and plain: bullets and short code skeletons are fine.
- Keep the condition and the reason for any rule that is not obvious ("use `Result`, not exceptions, because handlers are composed in `pipeline.py`").
- No telegraphic fragments, no stripped articles, no compression tricks. Short is good; cryptic costs more in rework.
- Point to one canonical file instead of pasting large examples.
- Size limit: about 200 lines per generated skill.

## 7. Routing

- If `AGENTS.md` exists at the repo root, add **one line** per generated skill under a `## Conventions` section (create the section at the end if missing), for example:
  `- Writing application code: follow the patterns skill (.claude/skills/patterns/SKILL.md)`
  Change nothing else in `AGENTS.md`.
- If `AGENTS.md` (or `CLAUDE.md` / `GEMINI.md`) defines a workflow, the generated executor skill follows it; its own checkpoints apply only where that file is silent.
- If there is no `AGENTS.md`, do not create one. Tell the user that `contextprint` can audit and draft it.

## 8. Final message to the user

List the files written, how many files were sampled, the number of `(inferred)` items and open questions, and say
clearly that the output is a draft to review. Make no token-saving claims; savings are only known if measured.
