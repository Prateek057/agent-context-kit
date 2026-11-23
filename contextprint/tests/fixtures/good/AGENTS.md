# AGENTS.md

<!-- Keep this file short: it is loaded every session. For every line ask:
     (1) not available in the repo? (2) applies to most sessions? (3) still true for this model/tool?
     If any answer is no, cut the line or move it to a task-specific skill. -->

## Where to start, by task (open these files before changing anything)
- Design decision  → architecture.md → decisions/ADR-*.md (write a new ADR)
- New feature      → specs/<feature>/spec.md → contracts/*.yaml, db/schema.sql
- Change to a rule → REQUIREMENTS.md (REQ-ID) → spec.md → contract
- Bug fix          → spec.md examples → add the failing example as a test first

## Precedence when documents disagree
requirements > contracts > decisions > code comments

## Environment
- Use only APIs available in the versions pinned in requirements.txt. Check, don't recall.

## When something turns out wrong (update docs and code in the same change)
- Code ≠ spec           → fix the code; add the failing case as a test
- Spec was wrong        → fix spec.md / contract first, then the code; note it in CHANGELOG.md
- Requirement unclear   → stop; write an open question for the PO. Never edit REQUIREMENTS.md
- Decision needed       → propose a new ADR; never edit an accepted one
- Same mistake twice    → add an example to spec.md

## Rules
- Do not add behaviour no requirement asks for; propose it instead.
- Every change to contracts/ must reference a requirement ID.
- Run `make validate` (schema check + lint + acceptance tests) before proposing a change.

## Conventions
- Writing application code: follow .agents/skills/shop-patterns/SKILL.md
