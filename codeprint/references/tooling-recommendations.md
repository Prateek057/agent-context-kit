# Phase 9: Recommend Tooling & Skills

## Purpose
Suggest additional tools/skills that would improve the Claude Code experience for this repo. Never auto-install.

## Detection Matrix

| Signal | Recommend | Purpose |
|--------|-----------|---------|
| `.github/` present | GitHub MCP server | PR/issue context in CLI |
| Test framework detected | `/run-tests` skill | Run + parse test output |
| `docker-compose.yml` present | `/dev-up` skill | Start/stop local env |
| Terraform/CDK/Pulumi in infra/ | `/plan-infra` skill | Plan with summary |
| OpenAPI/Swagger specs | `/gen-client` skill | Regenerate API clients |
| EF Migrations/Flyway/Alembic | `/migrate` skill | Create + apply migrations |
| Monorepo (>3 services) | `/affected` skill | Detect changed services |
| CI/CD workflows | `/ci-status` skill | Check pipeline status |
| Commitlint config present | `/commit` skill | Conventional commit messages |
| `.editorconfig`/linter config | Pre-commit hook | Auto-format |

## Procedure

1. Check which signals are present
2. Check `.claude/settings.json` for already-installed tools
3. Filter to max 5 most impactful
4. Present recommendations table
5. Wait for user selection

## Output Format

```
## Recommended Tooling

| # | Tool/Skill | Why | Scope |
|---|-----------|-----|-------|
| 1 | [name] | [one-line] | global/project |
| 2 | [name] | [one-line] | global/project |

Install any? (numbers, or "skip")
```

## Installation Actions

| Type | Action |
|------|--------|
| MCP server | Add to `.claude/settings.json` → `mcpServers` |
| Generated skill | Create `.claude/skills/{name}.md` |
| External skill | Copy to `~/.claude/skills/` |
| Hook | Add to `.claude/settings.json` → `hooks` |

## Rules

- Max 5 recommendations
- Never install without explicit yes
- "all" = install all, but confirm once first
- Generated skills follow same token-efficiency principles
- Don't recommend what's already configured
