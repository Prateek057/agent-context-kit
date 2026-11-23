# Phase 5: Write patterns/SKILL.md

## Purpose
A conventions reference that an agent loads only when it writes or reviews application code.

## Location
Per `generated-output.md` §1, e.g. `.claude/skills/patterns/SKILL.md` or `.agents/skills/patterns/SKILL.md`.

## Template

````markdown
---
name: patterns
description: How application code is written in <repo-name> (naming, structure, errors, logging, wiring per code type), with canonical files to copy from. Use when writing, changing or reviewing application code. Tests and infrastructure have their own skills.
---
<!-- generated-by: codeprint 2.0.0 | commit: <sha> | date: <YYYY-MM-DD> | sampled: <n> files | status: draft, review before relying on it -->

# <Repo name>: application-code conventions

## Overview
- Topology: <monorepo | monolith | single service>
- Languages: <name + major version>; frameworks: <list>
- Grouping: <by feature | by layer>
- Rules and values live in: <links to REQUIREMENTS.md / specs / contracts / ADRs, or "none found">

## <Subtype>
- Location: `path/pattern/`; naming: `<Convention>.ext`
- Skeleton:
```<lang>
<constructor + one method signature>
```
- Copy from: `path/to/canonical.ext`
- <convention> (observed n/m)
- <convention, with the reason if not obvious> (observed n/m)
- Wiring: <where to register a new one> (observed n/m)

<repeat per subtype, max 8>

## Shared conventions
- Errors: <...> (observed n/m)
- Logging: <...> (observed n/m)
- Configuration / DI: <...> (observed n/m)

## Avoid
- Don't use <B>; the repo uses <A> (observed A n/m, B 0/m)
<max 7, only with counts>

## New file? Copy from
| New ... | Copy from |
|---|---|
| <subtype> | `canonical/path` |

## Open questions
- <code vs spec/contract contradictions, unclear intent; empty if none>
````

## Rules
- Follow `generated-output.md` (§3 provenance, §4 labels, §5 no copied values, §6 style).
- About 200 lines at most; one canonical file beats a long explanation.
- No test or infrastructure sections (testprint / infraprint).
- Monorepo: shared conventions first, then per-package differences.
