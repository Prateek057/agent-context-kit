---
name: codeprint
description: Analyze any repository's coding patterns and generate a token-efficient patterns skill. Self-contained version — no external references needed.
---

# Codeprint — Repository Pattern Extractor (Portable)

Generate `.claude/skills/patterns.md` and `.claude/skills/use-patterns.md` for the current repository.

## Execution Steps

### Phase 1: Topology Detection

Scan root structure:
- Multiple `services/`, `packages/`, `apps/`, `libs/` with own build files → **Monorepo**
- Single entry point, layered dirs → **Monolith**
- Single service, shallow structure → **Microservice**

Log detected topology before proceeding.

### Phase 2: Language & Framework Detection

Detect per module via build files:
- `.csproj`/`Program.cs` → C# | `package.json`/`tsconfig.json` → TS | `go.mod` → Go
- `Cargo.toml` → Rust | `pom.xml`/`build.gradle` → Java | `pyproject.toml` → Python

Then detect frameworks from dependencies (ASP.NET, React, NestJS, Spring, FastAPI, Gin, etc.)

### Phase 3: Subtype Identification

Find: Handlers, Controllers, Endpoints, Services, Repositories, Domain, Workers, Middleware, Validators, Mappers, DTOs, Events/Commands/Queries, Tests, Infrastructure, Config/Startup.

### Phase 3.5: Infrastructure Detection

Detect IaC (`*.tf`, `cdk.json`, `Pulumi.yaml`), Docker, CI/CD (`.github/workflows/`, etc.), Deployment (ECS, K8s, Lambda), Environment strategy.

### Phase 4: Pattern Extraction

Per subtype, sample 2-3 files. Extract: naming, structure, method signatures, error handling, validation, logging, testing patterns, naming conventions.

### Phase 5: Cross-Cutting Conventions

Extract: DI registration, config management, API contracts, observability, resilience, auth, async patterns, mapping, inter-module communication.

### Phase 6: Anti-Pattern Detection

Check linter configs, CLAUDE.md, CONTRIBUTING.md, and infer from consistency. Max 10 items.

### Phase 7: Generate patterns.md

Create `.claude/skills/patterns.md` with: Overview, Subtypes (location + naming + template + canonical + rules), Infrastructure, Cross-Cutting, Anti-Patterns, Scaffold Reference, Preferred Dependencies. Max 300 lines. No prose.

### Phase 8: Generate use-patterns.md

Create `.claude/skills/use-patterns.md` — task executor with:
- Caveman mode communication
- 4 checkpoints (plan → implement → wire → verify)
- Human gates before irreversible decisions
- Token optimization rules
- Adapt wiring/build commands to detected repo

### Phase 9: Recommend Tooling

Check for signals (`.github/`, test framework, docker-compose, IaC, OpenAPI, migrations, monorepo, CI, commitlint). Present max 5 recommendations. Ask before installing.

## Rules

- Sample 2-3 files per subtype only — don't read everything
- No prose in generated output — bullets + code snippets
- Max 300 lines for patterns.md
- Prefer canonical file paths over explaining
- Never auto-install tooling
