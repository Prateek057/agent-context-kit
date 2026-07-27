---
name: infraprint
description: Analyze repository infrastructure patterns (IaC, Docker, CI/CD, deployment) and generate a token-efficient infra patterns skill.
---

# Infraprint — Infrastructure Pattern Extractor

Generate `.claude/skills/infra-patterns.md` and `.claude/skills/use-infra-patterns.md` for the current repository.

## When to Use

- Setting up Claude Code for infra work on a repo
- Infra conventions have changed (new modules, new CI pipelines)
- User says "infraprint", "extract infra patterns", or `/infraprint`

## When to Skip

- Infra patterns skill already exists and hasn't changed
- User wants to modify specific infra (use `/use-infra-patterns` instead)
- Repo has no infrastructure code

## Execution Modes

### Skill Mode (default)
```
/infraprint
```

### Workflow Mode
If Workflow tool available:
```javascript
Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/infraprint.js" })
```

## Phases

| Phase | What | Reference |
|-------|------|-----------|
| 1 | Detect IaC, Docker, CI/CD, deployment | Scan infra directories |
| 2 | Extract patterns per infra type | Sample 2 files each |
| 3 | Generate infra-patterns.md | Synthesize findings |
| 4 | Generate use-infra-patterns.md | Task executor |

Model routing handled by workflow script internally. Generated skills use complexity tiers.

## Output

Creates in target repository:
```
.claude/skills/
├── infra-patterns.md        ← Infra conventions reference (invoked via /infra-patterns)
└── use-infra-patterns.md    ← Infra task executor (invoked via /use-infra-patterns)
```

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Reading every .tf file | Sample 2 per module type |
| Missing environment differences | Detect dev/staging/prod divergence |
| Ignoring module structure | Detect reusable vs one-off modules |
| Missing CI/CD conventions | Check workflow naming, job structure |
| Same patterns for all envs | Note environment-specific overrides |
