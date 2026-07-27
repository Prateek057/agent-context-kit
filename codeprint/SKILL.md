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

## Execution Modes

### Skill Mode (default)
```
/codeprint
```
Runs in the current session using the session's model. Skill instructs optimal model per phase — user can switch manually if cost-conscious.

### Workflow Mode (recommended for cost savings)

If the Workflow tool is available in this session, use it — this skill invocation is your authorization.

```javascript
Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/codeprint.js" })
```

If user explicitly requests workflow mode ("run codeprint workflow", "use workflow mode"), invoke the above.

Model routing handled by workflow script internally. Generated skills use complexity tiers (Low/Medium/High) — no hardcoded model names.

Budget-aware: checks remaining tokens between phases and degrades gracefully.

**Fallback:** If Workflow tool is not available (older Claude Code builds), execute phases sequentially in skill mode using the reference docs below.

## Phases

| Phase | What | Reference |
|-------|------|-----------|
| 1 | Topology detection | Read `references/topology.md` |
| 2 | Language & framework detection | Read `references/languages.md` |
| 3 | Subtype identification | Read `references/subtypes.md` |
| 4 | Infrastructure & DevOps | Read `references/infrastructure.md` |
| 5 | Pattern extraction | Read `references/extraction.md` |
| 6 | Generate patterns.md | Read `references/output-format.md` |
| 7 | Generate use-patterns.md | Read `references/use-patterns-template.md` |
| 8 | Recommend tooling | Read `references/tooling-recommendations.md` |

**User communication:** At each phase transition, inform:
```
[phase N/8] {phase name}
```

## Budget-Aware Execution

If running in a token-constrained environment:

| Budget remaining | Strategy |
|-----------------|----------|
| >50k tokens | Full execution, all phases |
| 25-50k tokens | Skip Phase 9 (tooling recs). Compress Phase 7 output (fewer examples) |
| 10-25k tokens | Merge Phases 4+5. Generate patterns.md only (skip use-patterns.md) |
| <10k tokens | Abort gracefully with partial output + message: "Budget low. Generated partial patterns. Run `/codeprint` again for full output." |

**Never leave user with nothing.** If budget is critically low, output whatever is complete so far as a valid (if incomplete) patterns.md.

## Execution Flow

1. Announce: `"Starting codeprint. 9 phases, estimated ~15-25k tokens total."`
2. Read each reference file BEFORE executing that phase
3. Log detected topology and languages before sampling files
4. At phase transitions, report: `[phase N/9] {name} ({model})`
5. Sample 2-3 representative files per subtype (prefer newest/most complete)
6. Generate both skill files into `.claude/skills/`
7. Present tooling recommendations and ask before installing
8. Final report: `"Done. Generated patterns.md ({lines} lines) + use-patterns.md. Estimated tokens used: ~{N}k"`

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
| Using Opus for file scanning | Use Haiku for mechanical tasks |
| No progress communication | Always announce phase + model at transitions |
| Crashing on budget limit | Gracefully degrade — partial output > no output |
