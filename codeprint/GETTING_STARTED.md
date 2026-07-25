# Getting Started with Codeprint

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

## Works With

- **Any language**: C#, TypeScript, Go, Rust, Java, Python, Ruby, Elixir
- **Any topology**: Monorepos (mixed languages), monoliths, standalone services
- **Any framework**: Detects and adapts to framework-specific conventions

## Design Principles

| Principle | How |
|-----------|-----|
| Token-efficient | Max 300 lines, on-demand only |
| Non-opinionated | Extracts YOUR patterns, imposes nothing |
| Canonical references | Points to real files > re-explaining patterns |
| Anti-pattern aware | "Don't do X" often saves more than "do Y" |
| Topology-adaptive | Output structure matches repo structure |

## Monorepo Output Structure

For monorepos, generated skill sections are:

```
1. Shared conventions (cross-cutting)
2. Per-package-type patterns (service, lib, worker, gateway)
3. Inter-package patterns (contracts, shared libs)
```

## Troubleshooting

**Blueprint generates too little?**
- Repo may be too small or too uniform. Result is still valid — fewer patterns = fewer constraints.

**Blueprint generates wrong patterns?**
- Edit the generated `.claude/skills/patterns.md` directly. It's your skill now — codeprint just bootstraps it.

**Want to re-run after repo evolved?**
- Run `/codeprint` again. It overwrites the existing patterns skill with fresh analysis.

## Contributing

PRs welcome. Areas to improve:
- Additional language/framework detection signals
- Better heuristics for selecting "canonical" files (newest? most complete? most-imported?)
- Detect architectural patterns (hexagonal, clean, vertical slice, event-driven)
- Support for detecting infrastructure patterns (Terraform, Pulumi, CDK)
