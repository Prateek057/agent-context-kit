# Phase 4: Pattern Extraction

## Purpose
Sample representative files per subtype and extract concrete conventions.

## Procedure

For each subtype identified in Phase 3:

1. List all files matching that subtype
2. Pick 2-3 samples (prefer newest by git date, or most complete by file size)
3. Read each sample and extract patterns below

## What to Extract

| Dimension | Look for |
|-----------|----------|
| File naming | Casing (PascalCase, kebab-case), suffixes, grouping strategy |
| Class/function structure | Constructor pattern, DI injection, base classes, interfaces |
| Method signatures | Async patterns, return types (Task<T>, Result<T>), parameter order |
| Error handling | Exception types, Result/Either pattern, error propagation direction |
| Validation | Where (handler? endpoint?), what library, guard clauses |
| Logging | Structured? Source-gen? What gets logged at what level? |
| Testing | Naming convention, AAA pattern, mock library, fixture approach |
| Naming | Variables (camelCase), methods (PascalCase), constants (UPPER), enums |

## Sampling Strategy

- **Don't read every file** — 2-3 per subtype is enough
- Prefer files with most logic (not just boilerplate)
- For handlers: pick one with validation + business logic + logging
- For tests: pick one unit + one integration
- For repos: pick one with multiple methods

## Output per subtype

Produce a section with:
- Location (path pattern)
- Naming convention
- Minimal code template (constructor + one method signature)
- Canonical example file path
- Key rules (3-5 bullets)
