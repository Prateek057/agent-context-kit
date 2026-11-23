# The contextprint artifact model

Source: white paper v3.0, §11.2, §12 and §13. This file is the shared definition used by
the scanner (`scripts/audit.py`), the audit skill, the scaffold skill and the writer agent.

## The principle

- **Short prose** says *why* (intent, 1–2 sentences per area).
- **DSL** says *what must hold* (names, limits, codes, shapes) in standard formats:
  OpenAPI, JSON Schema, SQL DDL, plain YAML. Invent no notation.
- **Examples** settle the edge cases (`input -> expected`).
- Contract the *what*, not the *how*.
- Each precise value lives in **one** contract; other docs reference it.
- Changes flow **down** (requirements → spec → contract → test → code); discoveries flow
  **up** as proposals that the owner approves.

## Artifacts by stage

| # | ID | Stage | Default location | Contains | Owner | Required? |
|---|---|---|---|---|---|---|
| 1 | `requirements` | Requirements | `REQUIREMENTS.md` | Numbered REQ-IDs, limits as numbers, edge cases, "must not" rules | PO / SO | Required |
| 2 | `architecture` | Architecture | `architecture.md` | Why, boundaries, cross-service calls as values (style, contract, auth, timeout, retries, events) | Architect | Recommended |
| 3 | `adr` | Architecture | `decisions/ADR-NNN-*.md` | One decision each, with Status; superseded, never edited | Architect / SO | Recommended |
| 4 | `spec` | Feature spec | `specs/<feature>/spec.md` | Intent + rules (DSL block) + examples, REQ-IDs, link to contract | Dev + AI, PO signs off | Required |
| 5 | `contracts` | Contracts | `contracts/openapi.yaml`, `contracts/rules.yaml`, `db/schema.sql` | Precise values and shapes, each tagged with a REQ-ID | Dev + AI | Required |
| 6 | `acceptance_tests` | Tests | `tests/acceptance/` | Written from the requirements (not from the spec), tagged with REQ-IDs | AI drafts, humans check | Required |
| 7 | `agents_md` | Routing | `AGENTS.md` | Short router: task → files, precedence, "when something turns out wrong", validate command | Dev | Required |
| 8 | `ci` | Enforcement | CI config + `make validate` | Schema validation of contracts, tests, contract-vs-code check | Dev | Required |
| 9 | `pinned_versions` | Environment | lockfile | Pinned library versions the agent must check, not recall | Dev | Recommended |
| 10 | `changelog` | Keeping it true | `CHANGELOG.md` | Notes when a spec was wrong and was fixed | Dev | Recommended |
| 11 | `conventions` | Conventions | `<skills dir>/{patterns,test-patterns,infra-patterns}/SKILL.md` (+ `use-*` executors) | How code is written today, each rule labelled `(observed n/m)` or `(inferred)`; links to contracts instead of copying values; routed from AGENTS.md; provenance line for staleness | codeprint / testprint / infraprint draft, Dev reviews | Optional (checked only if present) |

## Routing (what `AGENTS.md` must say)

| Task | Start from | Then |
|---|---|---|
| Design decision | `architecture.md` | `decisions/ADR-*.md` (write a new ADR) |
| New feature | feature `spec.md` | `contracts/*`, `db/schema.sql` |
| Change to a rule | `REQUIREMENTS.md` (REQ-ID) | `spec.md` → contract → test → code |
| Bug fix | `spec.md` examples | failing example as a test first |

Precedence when documents disagree: **requirements > contracts > decisions > code comments**.

## Keeping it true

| What happened | Update first | Then | Who decides |
|---|---|---|---|
| Business rule changes | `REQUIREMENTS.md` | spec example → contract → test → code | PO |
| Edge case found while coding | Open question; agent stops | answer → spec example + test | PO |
| Bug: code ≠ spec | Code | failing case as a test | Developer |
| Bug: spec was wrong | Spec / contract | code; note in CHANGELOG | Developer + PO |
| New design decision | New ADR (supersede) | link in architecture.md; values into contract | Architect / SO |
| Same agent mistake twice | Example in spec | one line in AGENTS.md only if general | Developer |

## Quality rules the agent review checks (not fully machine-checkable)

1. Limits are numbers with units, not "several" / "as needed".
2. Every rule with an edge has 1–3 examples, and the examples agree with the rule.
3. Specs state conclusions, not deliberation ("actually, re-reading…").
4. No prescribed mechanisms unless they are real requirements (e.g. timestamp ordering).
5. Behaviour that the interface merely makes possible is written down (injectable clock,
   idempotency key, tenant id).
6. Nothing in a spec or contract that no requirement asks for.
7. `AGENTS.md`: every line passes "not in the repo? applies to most sessions? still true?".
8. Tests come from the requirements; spec-generated tests cannot catch a wrong spec.
