---
name: codeprint
description: Analyze repository coding patterns and generate a token-efficient patterns skill. Excludes tests (use testprint) and infrastructure (use infraprint). Self-contained version.
---

# Codeprint — Code Pattern Extractor (Portable)

Generate `.claude/skills/patterns/SKILL.md` and `.claude/skills/use-patterns/SKILL.md` for the current repository.

**Scope:** Application code only — handlers, services, repositories, controllers, DTOs, validators, workers, domain models, middleware. NOT tests, NOT infrastructure.

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

Find CODE subtypes only: Handlers, Controllers, Endpoints, Services, Repositories, Domain Models, Workers/Consumers, Middleware, Validators, Mappers, DTOs, Events/Commands/Queries, Config/Startup.

EXCLUDE: Test files, infrastructure (terraform, docker, CI/CD).

### Phase 4: Pattern Extraction

Per subtype (max 8, highest file count first), read FIRST 60 lines of 2 sample files. Extract:
1. Naming convention (1 sentence)
2. Constructor pattern (1 sentence)
3. Method signature pattern (1 sentence)
4. Error handling (1 sentence)
5. Key rules (3 bullets max)
6. Single canonical file path

### Phase 5: Generate patterns/SKILL.md

Write to `.claude/skills/patterns/SKILL.md` (create dirs if needed) with:
- Overview (topology, languages, frameworks)
- Subtypes (location + naming + template + canonical + rules)
- Conventions (DI, config, logging — inferred from extractions)
- Anti-Patterns (inferred from consistency, max 7 items)
- Scaffold Reference
- Preferred Dependencies

Max 300 lines. No prose — bullets + code snippets only.

### Phase 6: Generate use-patterns/SKILL.md

Write to `.claude/skills/use-patterns/SKILL.md` (create dirs if needed) — task executor with:
- Terse communication (fragments OK, no filler)
- 4 checkpoints (Plan → Implement → Wire → Verify)
- Complexity tier hints per checkpoint (Low/Medium/High)
- Human gates before irreversible decisions
- Token optimization rules
- Adapt wiring/build commands to detected repo

## Rules

- Sample 2 files per subtype only — don't read everything
- Read first 60 lines only — don't read full files
- No prose in generated output — bullets + code snippets
- Max 300 lines for patterns.md
- Prefer canonical file paths over explaining
- Keep total response under 150 words per extraction
- For tests → tell user to run `/testprint`
- For infra → tell user to run `/infraprint`
