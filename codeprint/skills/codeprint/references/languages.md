# Phase 2: Language & Framework Detection

## Purpose
Identify languages and frameworks per module so pattern extraction uses correct conventions.

## Language Signals

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
| `Package.swift` | Swift |
| `*.dart`, `pubspec.yaml` | Dart/Flutter |

## Framework Detection

Read dependency files (package.json, .csproj, go.mod, etc.) and match:

- **C#**: ASP.NET (Microsoft.AspNetCore), MediatR, FluentValidation, EF Core, Dapper, HotChocolate
- **TypeScript**: React, Next.js, Express, NestJS, Fastify, Hono, tRPC
- **Go**: Gin, Echo, Fiber, Chi, stdlib net/http
- **Python**: FastAPI, Django, Flask, SQLAlchemy, Pydantic
- **Java**: Spring Boot, Quarkus, Micronaut, Jakarta EE
- **Rust**: Actix-web, Axum, Rocket, Tokio

## Procedure

1. For monorepo: detect per module/package (they may differ)
2. For monolith/microservice: detect at root
3. Read dependency manifest → match framework patterns
4. Note version (major) — conventions differ between framework versions

## Output per module

```
Language: C# (.NET 10)
Frameworks: ASP.NET Minimal APIs, FluentValidation, DynamoDB SDK
```
