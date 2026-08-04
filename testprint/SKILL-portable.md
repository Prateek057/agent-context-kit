---
name: testprint
description: Analyze repository test patterns and generate a token-efficient test patterns skill. Self-contained version.
---

# Testprint — Test Pattern Extractor (Portable)

Generate `.claude/skills/test-patterns/SKILL.md` and `.claude/skills/use-test-patterns/SKILL.md` for the current repository.

**Scope:** Test code only — unit tests, integration tests, e2e tests, fixtures, test utilities, mocking patterns.

## Execution Steps

### Phase 1: Test Detection

Scan for test directories and frameworks:
- Find test projects/dirs (`*.Tests`, `__tests__`, `test/`, `spec/`, `tests/`)
- Detect framework from dependencies (xUnit, NUnit, MSTest, Jest, Vitest, pytest, Go testing, RSpec)
- Detect assertion library (FluentAssertions, Shouldly, Chai, assert)
- Detect mocking library (Moq, NSubstitute, FakeItEasy, jest.mock, testify/mock)
- Detect test data approach (builders, fixtures, factories, AutoFixture, Bogus, Faker)
- Detect integration test infra (Testcontainers, WebApplicationFactory, docker-compose, test DBs)
- Classify test types present: unit, integration, e2e, contract, performance

### Phase 2: Pattern Extraction + Subtype Splitting

Per test type found (max 4 types), read FIRST 60 lines of 2 sample test files. Extract:
1. File naming convention (e.g., `{Class}Tests.cs`, `{feature}.test.ts`)
2. Test naming pattern (e.g., `MethodName_Scenario_ExpectedResult`)
3. Arrange/Act/Assert structure
4. Fixture/setup approach (constructor, SetUp, beforeEach)
5. Mocking approach (1 sentence)
6. Assertion style (1 sentence)
7. Key rules (3 bullets max)
8. Single canonical test file path

**Subtype splitting:** Within each test type, detect if multiple distinct assertion/setup styles coexist:
- Grep test projects for multiple assertion namespaces/methods
- If 2+ distinct styles found, split into subtypes
- Each subtype gets its own section with own canonical file

Example splits: `unit:service`, `unit:validator`, `unit:mapper`, `unit:component`, `integration:api`, `integration:database`

Also detect shared test utilities:
- Base test classes
- Test builders/factories
- Custom assertions
- Test fixtures/data

### Phase 2.5: Pitfall/Gotcha Extraction

Detect what breaks on first attempt without prior knowledge:
1. **Polymorphic/abstract types in test data** — find abstract classes or interfaces referenced by test factories/builders. Note which concrete type tests actually use and which mandatory fields must be satisfied.
2. **Specialized assertion libraries** distinct from main style — grep for additional assertion packages that require different invocation patterns (validation test helpers, mock verification APIs, snapshot libs, etc.).
3. **Null/empty behavior traps** — in validation logic, detect if different validator methods handle null/empty/missing differently. Note which guards null and which doesn't.
4. **Mandatory/immutable properties** — find required/readonly/non-optional fields on model/entity types. Extract minimal set of fields needed to construct a valid test object.
5. **Test data factories** — find existing factory/builder/helper classes (`create*()`, `build()`, `*Factory`, `*TestData`, `*Fixture`). Extract which concrete types they use and which fields they populate.

### Phase 3: Generate test-patterns.md

Write to `.claude/skills/test-patterns/SKILL.md` (create dirs if needed) with:
- Overview (frameworks, test types found)
- **Per subtype** (not just per type): naming + structure + mocking + assertions + canonical file + minimal skeleton
- **Test data factories** — for each factory/builder found:
  - Path to factory
  - Minimal `Create()` example showing required fields and concrete types
  - Which polymorphic/abstract base it satisfies
- **Pitfalls** — concrete gotchas from Phase 2.5 (what breaks + fix)
- Shared utilities (builders, fixtures, base classes — paths only)
- Anti-patterns (max 5)
- **Test scaffold lookup table** — explicit: subtype → canonical file to copy from

Max 250 lines. No prose — bullets + code snippets only.

### Phase 4: Generate use-test-patterns/SKILL.md

Write to `.claude/skills/use-test-patterns/SKILL.md` (create dirs if needed) — test task executor with:
- Terse communication
- 3 checkpoints (Plan → Write Tests → Verify)
- Complexity tiers per checkpoint
- **"Look here first" pointers** — for each test subtype, include: `Before writing a {subtype} test, read: {canonical_path}`
- **Subtype → Canonical File lookup table** — explicit mapping for token-efficient lookups:
  ```
  | Writing a... | Copy from |
  |---|---|
  | service unit test | `path/to/ServiceTest.ext` |
  | validator unit test | `path/to/ValidatorTest.ext` |
  | integration test | `path/to/IntegrationTest.ext` |
  ```
- **Test data factory template** — minimal creation example showing mandatory fields + concrete types
- Human gates before: choosing between unit/integration, modifying shared fixtures
- Adapt test runner command to detected framework

## Rules

- Sample 2 files per test type — don't read everything
- Read first 60 lines only
- No prose in generated output — bullets + code snippets
- Max 250 lines for test-patterns.md
- Prefer canonical test file paths over explaining
- Split subtypes when assertion styles diverge within a test type
- Always include pitfalls — what breaks is more valuable than what works
- use-test-patterns must have explicit lookup table (subtype → file), not vague "copy nearest test"
- Include minimal test data factory template when polymorphic/required types detected
- For code patterns → tell user to run `/codeprint`
- For infra patterns → tell user to run `/infraprint`
