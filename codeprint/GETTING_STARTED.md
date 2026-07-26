# Getting Started with Codeprint

## Usage Modes

### Skill Mode (simple)

```
/codeprint
```

Uses your session's current model for all phases. The skill announces optimal model per phase — switch manually if cost-conscious.

### Workflow Mode (cost-optimized)

Say any of:
- "Run the codeprint workflow"
- "Use codeprint in workflow mode"
- "Codeprint with model routing"

Claude automatically invokes the workflow script which:
- Routes Haiku for scanning, Sonnet for extraction, Opus for generation
- Checks token budget between phases
- Degrades gracefully if budget runs low

**No dependencies needed.** Workflow scripts run in Claude Code's sandboxed runtime — no `package.json`, no npm, no Node.js APIs.

### How It Works Under the Hood

```
You type "/codeprint" or "run codeprint workflow"
    ↓
SKILL.md loads → instructs Claude on execution
    ↓
If Workflow tool available: Claude invokes workflows/codeprint.js
    ↓
Script orchestrates subagents per-phase with model routing
    ↓
Results returned → Claude writes .claude/skills/patterns.md
```

## Detection Capabilities

### Topology

| Signal | Detected As |
|--------|-------------|
| Multiple `services/`, `packages/`, `apps/` dirs with own build files | Monorepo |
| Single entry point, layered dirs (`controllers/`, `services/`, `repositories/`) | Monolith |
| Single service, shallow structure, one build file | Microservice |

### Languages

| Signal | Language |
|--------|----------|
| `.csproj`, `Program.cs`, `global.json` | C# |
| `package.json`, `tsconfig.json` | TypeScript/JS |
| `go.mod`, `go.sum` | Go |
| `Cargo.toml` | Rust |
| `pom.xml`, `build.gradle` | Java/Kotlin |
| `pyproject.toml`, `requirements.txt` | Python |
| `mix.exs` | Elixir |
| `Gemfile` | Ruby |

### Frameworks

- **C#**: ASP.NET, MediatR, FluentValidation, EF Core, Dapper
- **TypeScript**: React, Next.js, Express, NestJS, Fastify
- **Go**: Gin, Echo, Fiber, stdlib net/http
- **Python**: FastAPI, Django, Flask
- **Java**: Spring Boot, Quarkus, Micronaut

### Subtypes Identified

Handlers, Controllers, Services, Repositories, Domain/Entities, Workers/Consumers, Middleware, Validators, Mappers, DTOs, Events/Commands/Queries, Tests (Unit/Integration/E2E), Infrastructure/Adapters, Configuration/Startup.

## Model Routing (Workflow Mode)

| Phase | What happens | Model | Why |
|-------|-------------|-------|-----|
| 1-3.5 | Scan dirs, detect topology/lang/subtypes/infra | Haiku | Mechanical file listing |
| 4-5 | Read sample files, extract conventions | Sonnet | Needs code understanding |
| 6 | Detect anti-patterns (reasoning from absence) | Opus | Inference from what's NOT there |
| 7 | Generate patterns.md | Opus | Quality-critical synthesis |
| 8 | Generate use-patterns.md | Sonnet | Template-based, less creative |
| 9 | Recommend tooling | Haiku | Lookup table matching |

## Budget Awareness

| Budget remaining | What happens |
|-----------------|--------------|
| >50k tokens | Full execution, all 9 phases |
| 30-50k | Full execution, compressed output |
| 20-30k | Skip use-patterns.md + tooling recs |
| 10-20k | Generate compressed patterns.md only |
| <10k | Abort with partial output + re-run message |

You're always informed: `"Budget low (15k remaining). Compressing remaining work."`

## Example Output

For a C# CQRS microservice, codeprint generates:

```markdown
## Overview
- **Topology**: microservice
- **Languages**: C#
- **Frameworks**: ASP.NET, MediatR, FluentValidation
- **Key patterns**: CQRS, Clean Architecture

## Subtypes

### Command Handlers
- **Location**: `src/Application/Commands/`
- **Naming**: `{Action}{Entity}CommandHandler.cs`
- **Pattern**:
  ```csharp
  public class CreateElementCommandHandler(
      IElementRepository repository,
      ILogger<CreateElementCommandHandler> logger)
      : IRequestHandler<CreateElementCommand, Result<ElementResponse>>
  {
      public async Task<Result<ElementResponse>> Handle(
          CreateElementCommand request, CancellationToken ct) { ... }
  }
  ```
- **Canonical example**: `src/Application/Commands/CreateElement/CreateElementCommandHandler.cs`

## Anti-Patterns (NEVER)
- Don't return IQueryable from repositories
- Don't catch generic Exception without rethrow
- Don't put business logic in controllers
```

## Design Principles

| Principle | How |
|-----------|-----|
| Token-efficient | Max 300 lines, on-demand only |
| Model-aware | Cheapest model per phase, not blanket Opus |
| Budget-aware | Progressive degradation, never crashes empty |
| Non-opinionated | Extracts YOUR patterns, imposes nothing |
| Canonical references | Points to real files > re-explaining patterns |
| Anti-pattern aware | "Don't do X" often saves more than "do Y" |
| Informative | Always tells you what's happening and why |

## Troubleshooting

**Codeprint generates too little?**
- Repo may be too small or too uniform. Fewer patterns = fewer constraints = still valid.

**Codeprint generates wrong patterns?**
- Edit `.claude/skills/patterns.md` directly. It's your skill now — codeprint just bootstraps it.

**Want to re-run after repo evolved?**
- Run `/codeprint` again. Overwrites existing patterns skill with fresh analysis.

**Workflow mode not triggering?**
- Ensure codeprint is installed as a plugin (not just a copied SKILL.md)
- Say explicitly: "Use the codeprint workflow"
- Fallback: `/codeprint` always works in skill mode

**Budget ran out mid-run?**
- Partial output is saved. Run again with more budget to complete.

## Contributing

PRs welcome. Areas to improve:
- Additional language/framework detection signals
- Better heuristics for selecting "canonical" files
- Detect architectural patterns (hexagonal, clean, vertical slice)
- More granular model routing (e.g., Haiku for simple subtypes, Sonnet for complex)
- Workflow resume from partial completion
