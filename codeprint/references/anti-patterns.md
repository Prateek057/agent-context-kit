# Phase 6: Anti-Pattern Detection

## Purpose
Capture what the team explicitly avoids. "Never do X" often saves more tokens than "always do Y."

## Sources

1. **Linter/analyzer configs**: `.editorconfig`, `.eslintrc`, `stylecop.json`, `Directory.Build.props` analyzers
2. **Documentation**: `CLAUDE.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `ADR/` docs
3. **Inference from consistency**: If every file uses pattern A and never B (despite B being common), B is likely banned

## Common Anti-Patterns to Check

| Anti-pattern | Signal it's banned |
|-------------|-------------------|
| Wrong mediator (MediatR vs custom) | Custom mediator lib exists in libs/ |
| Raw exception throws | Custom exception types consistently used |
| Business logic in controllers | Controllers/endpoints are always thin |
| Mocking infrastructure in integration tests | Testcontainers consistently used |
| String interpolation in logging | [LoggerMessage] or structured logging everywhere |
| Manual validator registration | Assembly scanning used |
| God services | Services are focused, single-purpose |
| IQueryable leaking from repos | Repos always return materialized collections |
| Catch-all exception handlers | Typed catches only |

## Procedure

1. Read linter/analyzer config for explicit rules
2. Read any `CLAUDE.md` or `CONTRIBUTING.md`
3. Check for ADR documents that document decisions
4. Infer from 3+ consistent examples (if ALL handlers use X, then not-X is banned)

## Output

Max 10 anti-patterns. Format:
```
- Don't [do X] — [because Y / use Z instead]
```

Most impactful first. Skip trivial style issues covered by linters.
