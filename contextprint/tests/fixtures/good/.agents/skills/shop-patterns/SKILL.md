---
name: shop-patterns
description: Coding conventions of this repo. Use when writing or changing application code.
---
<!-- generated-by: codeprint 2.0.0 | commit: none | date: 2026-11-23 | sampled: 6 files | status: draft, review before relying on it -->

# Coding conventions

Follow AGENTS.md first. Values (limits, timeouts) live in `contracts/rules.yaml`; this file never repeats them.

## Conventions
- Handlers return a result object and do not raise for expected failures (observed 5/6)
- Login lockout: see `contracts/rules.yaml` (observed 2/2)
- Tests are named after the requirement, e.g. `test_req_1_...` (observed 2/2)
- Logging goes through one module-level logger per file (inferred)

## Open questions
- None.
