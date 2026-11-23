# Phase 4: Pattern extraction

## Purpose
Turn a few representative files per subtype into conventions with evidence counts.

## Procedure (per subtype, top 8 by file count)

1. Pick 2–3 samples: prefer files with real logic (validation + business logic + logging for handlers,
   several methods for repositories), and recent ones (git date) over old ones.
2. Read enough of each sample to see the imports, the constructor and one complete method (usually < 150 lines).
3. Write down candidate conventions (table below).
4. **Count** each candidate across the whole subtype with search instead of more reading, e.g.
   `grep -l "return Result" handlers/ | wc -l` vs the subtype's file count. Record `n/m`.
5. Keep candidates seen in most files. One-off variants are noted as variants or dropped.
6. Pick one canonical file: the clearest complete example.

## What to look for

| Dimension | Look for |
|---|---|
| File naming | casing, suffixes, folder grouping |
| Structure | constructor / DI style, base classes, interfaces |
| Signatures | async style, return types (`Result<T>`, `Task<T>`, errors as values?), parameter order |
| Errors | exception types vs result/error values, error-code registry, where errors are mapped |
| Validation | where it happens, which library, guard clauses |
| Logging | helper or library used, structured fields, levels |
| Wiring | where new units are registered (DI module, route table, handler registry) |
| Naming | variables, methods, constants, enums |

## Values belong to contracts

If you meet concrete values (limits, timeouts, retry counts, error codes, money rules), do not copy them. If the repo
has a contract or spec, link it. Otherwise link the code file that defines them. Differences between code and a
spec or contract go to the open questions list.

## Output per subtype (passed to phase 5)

- location (path pattern) and naming
- minimal skeleton (constructor + one method signature)
- canonical file path
- 3–5 conventions, each with `(observed n/m)` or `(inferred)`
- wiring step, if any
- open questions (contradictions, unclear intent)
