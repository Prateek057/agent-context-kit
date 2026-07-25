---
name: codeprint
description: Analyze any repository's coding patterns and generate a token-efficient patterns skill. Detects topology (monorepo/monolith/microservice), languages, frameworks, infrastructure, and extracts conventions per subtype. Use when setting up Claude Code for a new repo or refreshing an existing patterns skill.
---

# Codeprint — Repository Pattern Extractor

Generate `.claude/skills/patterns.md` and `.claude/skills/use-patterns.md` for the current repository.

## When to Use

- First time using Claude Code on a repo
- Repo conventions have changed significantly
- User says "codeprint", "extract patterns", "generate patterns skill", or `/codeprint`

## When to Skip

- Patterns skill already exists and repo hasn't changed
- User only wants a quick code fix (use `/use-patterns` instead)

## Quick Reference

| Phase | What | Reference |
|-------|------|-----------|
| 1 | Topology detection | **REQUIRED:** Read `references/topology.md` |
| 2 | Language & framework detection | **REQUIRED:** Read `references/languages.md` |
| 3 | Subtype identification | **REQUIRED:** Read `references/subtypes.md` |
| 3.5 | Infrastructure & DevOps | **REQUIRED:** Read `references/infrastructure.md` |
| 4 | Pattern extraction | **REQUIRED:** Read `references/extraction.md` |
| 5 | Cross-cutting conventions | **REQUIRED:** Read `references/cross-cutting.md` |
| 6 | Anti-pattern detection | **REQUIRED:** Read `references/anti-patterns.md` |
| 7 | Generate patterns.md | **REQUIRED:** Read `references/output-format.md` |
| 8 | Generate use-patterns.md | **REQUIRED:** Read `references/use-patterns-template.md` |
| 9 | Recommend tooling | **REQUIRED:** Read `references/tooling-recommendations.md` |

## Execution Flow

1. Read each reference file BEFORE executing that phase
2. Log detected topology and languages before sampling files
3. Sample 2-3 representative files per subtype (prefer newest/most complete)
4. Generate both skill files into `.claude/skills/`
5. Present tooling recommendations and ask before installing

## Output

Creates in the target repository:
```
.claude/skills/
├── patterns.md       ← Conventions reference (invoked via /patterns)
└── use-patterns.md   ← Task executor with checkpoints (invoked via /use-patterns)
```

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Reading every file in repo | Sample 2-3 per subtype only |
| Including prose in generated skill | Bullets + code snippets only |
| Generating >300 lines | Compress — prefer canonical file paths over explaining |
| Auto-installing tools | Always ask first (Phase 9) |
| Missing partial class for logging | Detect [LoggerMessage] usage → note partial requirement |
| Same patterns for all monorepo services | Check if services diverge; note differences |
