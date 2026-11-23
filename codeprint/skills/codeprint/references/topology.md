# Phase 1: Topology Detection

## Purpose
Determine repository type before any other analysis. Topology dictates how to scan and how to structure output.

## Detection Rules

| Signal | Topology |
|--------|----------|
| Multiple `services/`, `packages/`, `apps/`, `libs/` dirs each with own build file | Monorepo |
| Single entry point, layered dirs (`controllers/`, `services/`, `repositories/`, `domain/`) | Monolith |
| Single service, shallow structure, one build file, one deployment config | Single service |

## Build file signals
`.csproj`, `package.json`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `pyproject.toml`

## Procedure

1. `ls` project root
2. Check for `services/`, `packages/`, `apps/`, `libs/` directories
3. If found, check if children have their own build files → **Monorepo**
4. If single build file at root + layered structure → **Monolith**
5. If single build file + shallow → **Single service**

## Edge Cases

- Monolith with `packages/` for shared types → still monolith if only one deployable
- Single service in a monorepo structure → treat as single service (structure is aspirational)
- Nx/Turborepo workspaces → monorepo

## Also record (used by later phases)

- Context documents: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `REQUIREMENTS.md`, `specs/`, `contracts/`, `*.rules.yaml`,
  `openapi.*`, `*.schema.json`, `decisions/`, `adr/`. The output links to these instead of restating values.
- Where generated skills go (see `generated-output.md` §1).
- Current commit: `git rev-parse --short HEAD` (or `none` outside git), for the provenance line.

## Output

Log: `Topology: [monorepo|monolith|single service] | context docs: <found list or none> | output: <skills dir>` before proceeding.
