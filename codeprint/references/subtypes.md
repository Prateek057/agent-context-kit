# Phase 3: Subtype Identification

## Purpose
Categorize code by role/responsibility to extract per-subtype patterns.

## Common Subtypes

| Subtype | Dir/suffix signals |
|---------|-------------------|
| Handlers | `*Handler.cs`, `*Handler.ts`, `Commands/`, `Queries/` |
| Controllers | `*Controller.cs`, `controllers/`, `*Controller.java` |
| Endpoints | `*Endpoints.cs`, `routes/`, `endpoints/` |
| Services | `*Service.cs`, `services/`, `*_service.py` |
| Repositories | `*Repository.cs`, `repositories/`, `*_repo.go` |
| Domain/Entities | `domain/`, `entities/`, `models/` |
| Workers | `workers/`, `*Worker.cs`, `*Consumer.cs`, `*MessageHandler.cs` |
| Middleware | `middleware/`, `*Middleware.cs`, `interceptors/` |
| Validators | `*Validator.cs`, `validators/`, `*Schema.ts` |
| Mappers | `*Mapper.cs`, `*Converter.cs`, `mappers/` |
| DTOs | `dtos/`, `*Dto.cs`, `*Request.cs`, `*Response.cs` |
| Events/Commands/Queries | `events/`, `*Event.cs`, `*Command.cs`, `*Query.cs` |
| Tests | `tests/`, `*.test.ts`, `*Tests.cs`, `*_test.go` |
| Infrastructure | `infrastructure/`, `adapters/`, `persistence/` |
| Config/Startup | `Program.cs`, `Startup.cs`, `app.module.ts`, `main.go` |

## Procedure

1. `find` directories and file suffixes matching above patterns
2. Group by subtype
3. For each subtype with >0 files, it's "present" — will be sampled in Phase 4
4. Note grouping strategy: by-feature (folder per feature) vs by-type (folder per layer)

## Monorepo handling

- Check if all services share same subtypes (common) or diverge
- Note shared subtypes that live in `libs/` or `packages/`
