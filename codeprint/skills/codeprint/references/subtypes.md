# Phase 3: Code subtypes

## Purpose
Group application code by role so each group gets its own conventions section.

## Common subtypes

| Subtype | Dir / suffix signals |
|---|---|
| Handlers | `*Handler.*`, `commands/`, `queries/` |
| Controllers | `*Controller.*`, `controllers/` |
| Endpoints / routes | `*Endpoints.*`, `routes/`, `endpoints/` |
| Services | `*Service.*`, `services/`, `*_service.py` |
| Repositories | `*Repository.*`, `*Repo.*`, `repositories/`, `*_repo.go` |
| Domain / entities | `domain/`, `entities/`, `models/` |
| Workers / consumers | `workers/`, `*Worker.*`, `*Consumer.*`, `*MessageHandler.*` |
| Middleware | `middleware/`, `*Middleware.*`, `interceptors/` |
| Validators | `*Validator.*`, `validators/`, `*Schema.ts` |
| Mappers | `*Mapper.*`, `*Converter.*`, `mappers/` |
| DTOs | `dtos/`, `*Dto.*`, `*Request.*`, `*Response.*` |
| Events / commands / queries | `events/`, `*Event.*`, `*Command.*`, `*Query.*` |
| Adapters / persistence | `infrastructure/`, `adapters/`, `persistence/` (application code, not IaC) |
| Config / startup | `Program.cs`, `Startup.cs`, `app.module.ts`, `main.go`, `main.py` |

## Excluded (other tools)
- Tests (`tests/`, `*.test.*`, `*Tests.*`, `*_test.*`) → testprint
- IaC, Dockerfiles, CI/CD, deployment manifests → infraprint

## Procedure
1. Find directories and file suffixes matching the table; group files by subtype.
2. Record the file count per subtype (used for the top-8 cut and for evidence counts).
3. Note the grouping strategy: by feature (folder per feature) or by layer (folder per type).
4. Monorepo: note which subtypes all packages share and where packages differ; shared code in `libs/` or
   `packages/` gets its own note.
