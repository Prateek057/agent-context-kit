# Phase 7: Generate patterns.md

## Purpose
Produce the final `.claude/skills/patterns.md` — a compressed, on-demand reference skill.

## Output Location

```
<target-repo>/.claude/skills/patterns.md
```

## Template Structure

```markdown
---
name: patterns
description: Coding patterns and conventions for [repo-name]. Reference when generating or modifying code.
trigger: /patterns
---

# [Repo Name] — Coding Patterns

## Overview
- **Topology**: [monorepo|monolith|microservice]
- **Languages**: [list with versions]
- **Frameworks**: [list]
- **Key patterns**: [CQRS, Clean Architecture, etc.]

## [Monorepo only] Structure
[show top-level dir layout: services/, libs/, workers/, infra/]

## Subtypes

### [Subtype Name]
- **Location**: `path/pattern/`
- **Naming**: `{Convention}File.ext`
- **Pattern**:
```[lang]
[minimal skeleton — constructor + method signature only]
```
- **Canonical example**: `path/to/best/example.ext`
- **Rules**:
  - [3-5 bullets]

[Repeat per subtype]

## Infrastructure & DevOps
- **IaC**: [tool, structure, naming]
- **Docker**: [base image, stages]
- **CI/CD**: [platform, pipeline pattern]
- **Deployment**: [mechanism, config binding]
- **Environments**: [separation strategy]

## Cross-Cutting Conventions
[subsections per dimension found]

## Anti-Patterns (NEVER)
- [max 10 items]

## Scaffold Reference
| New... | Copy from |
|--------|-----------|
| [subtype] | `canonical/path` |

## Preferred Dependencies
| Purpose | Use | Don't use |
|---------|-----|-----------|
| [category] | [approved] | [banned] |
```

## Rules

- No prose — bullets and code snippets only
- Templates: MINIMAL (constructor + one method signature)
- Max 300 lines total
- Prefer 1 canonical file path over explaining the pattern
- Anti-patterns: max 10, most impactful
- Monorepo: shared conventions first, per-package-type sections after
- Include language version in overview (matters for available features)
