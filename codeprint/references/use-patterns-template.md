# Phase 8: Generate use-patterns.md

## Purpose
Produce a task-executor skill that applies patterns with checkpoints and minimal tokens.

## Output Location

```
<target-repo>/.claude/skills/use-patterns.md
```

## Template

```markdown
---
name: use-patterns
description: Execute a coding task using repo patterns with checkpoints, human gates, and minimal token usage. Pass task as argument.
trigger: /use-patterns
arguments:
  - name: task
    description: The coding task to execute
    required: true
---

# Use Patterns — Task Executor

Execute the given task following repo coding patterns. Optimize for low token usage.

## Checkpoints

| # | Gate | What happens |
|---|------|-------------|
| 1 | Plan | Identify patterns, list files, state assumptions |
| 2 | Implement | Generate code following conventions |
| 3 | Wire | DI registration, config updates |
| 4 | Verify | Run build, check output |

Collapse 2+3 for simple tasks (single file). Skip 4 if no build system.

## Behavior Rules

1. **Load patterns**: Read `.claude/skills/patterns.md` — only sections relevant to task.
2. **Caveman mode**: Fragments, no filler. Code stays normal.
3. **Token efficiency**:
   - Never repeat patterns back
   - Never explain in detail — just do
   - Max 2-sentence summaries
   - Reference canonical files by path, don't paste unless modifying
4. **Checkpoints**: Pause at each for user confirmation.
5. **Human gates**: Ask before irreversible/ambiguous decisions.

## Execution Flow

### Checkpoint 1: Plan
- Identify applicable subtypes/patterns
- List files to create/modify (paths only)
- State assumptions needing confirmation
- **ASK**: "Plan correct? Proceed?"

### Checkpoint 2: Implementation
- Generate code following patterns
- Apply all conventions
- Create files
- **ASK**: "Files created. Review before wiring?" (multi-layer only)

### Checkpoint 3: Wiring
- [ADAPT: repo-specific registration mechanism]
- **ASK**: "Wiring done. Verify build?" (if applicable)

### Checkpoint 4: Verify
- [ADAPT: repo-specific build command]
- Report pass/fail
- Fix if broken

## Human Gates (always ask before)

- Choosing between multiple valid patterns
- Modifying [ADAPT: shared libs folder name]
- Changing [ADAPT: infra folder name]
- Deleting or renaming existing code
- Business logic assumptions not in task

## Token Optimization

- Skip reading files you won't modify
- Don't paste file contents — state what changed
- Edit tool (diffs) over Write (full file) for existing files
- One-sentence checkpoints
- Collapse checkpoints 2+3 for simple tasks
- Don't re-read patterns.md if loaded this session

## Output Format

[checkpoint N]: [1-line status]
- [bullet]
> [question if needed]
```

## Adaptation Rules

When generating this file, replace placeholders:

| Placeholder | Replace with |
|-------------|-------------|
| `[ADAPT: repo-specific registration mechanism]` | Actual DI/wiring found (e.g., "Update ProgramExtensions.cs", "Add to app.module.ts") |
| `[ADAPT: repo-specific build command]` | Actual build (e.g., `dotnet build`, `npm run build`, `go build ./...`) |
| `[ADAPT: shared libs folder name]` | Actual path (e.g., `libs/Ocp.*`, `packages/shared`) |
| `[ADAPT: infra folder name]` | Actual path (e.g., `infra/`, `terraform/`, `cdk/`) |
