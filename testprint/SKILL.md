---
name: testprint
description: Analyze repository test patterns and generate a token-efficient test patterns skill. Detects test frameworks, fixtures, mocking strategies, and conventions per test type.
---

# Testprint — Test Pattern Extractor

Generate `.claude/skills/test-patterns.md` and `.claude/skills/use-test-patterns.md` for the current repository.

## When to Use

- Setting up Claude Code test generation for a repo
- Test conventions have changed significantly
- User says "testprint", "extract test patterns", or `/testprint`

## When to Skip

- Test patterns skill already exists and hasn't changed
- User wants to write a specific test (use `/use-test-patterns` instead)

## Execution Modes

### Skill Mode (default)
```
/testprint
```

### Workflow Mode
If Workflow tool available:
```javascript
Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/testprint.js" })
```

## Phases

| Phase | What | Reference |
|-------|------|-----------|
| 1 | Detect test framework, structure, types | Scan test directories |
| 2 | Extract patterns per test type | Sample 2 files each |
| 3 | Generate test-patterns.md | Synthesize findings |
| 4 | Generate use-test-patterns.md | Task executor |

Model routing handled by workflow script internally. Generated skills use complexity tiers.

## Output

Creates in target repository:
```
.claude/skills/
├── test-patterns/SKILL.md        ← Test conventions reference (invoked via /test-patterns)
└── use-test-patterns/SKILL.md    ← Test task executor (invoked via /use-test-patterns)
```

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Reading every test file | Sample 2 per test type |
| Including test data in skill | Reference fixture paths only |
| Missing shared test utilities | Detect base classes, builders, fixtures |
| Ignoring test naming conventions | Extract `MethodName_Scenario_Expected` patterns |
| Same rules for unit + integration | Detect differences — they often diverge |
