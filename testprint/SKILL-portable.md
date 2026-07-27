---
name: testprint
description: Analyze repository test patterns and generate a token-efficient test patterns skill. Self-contained version.
---

# Testprint — Test Pattern Extractor (Portable)

Generate `.claude/skills/test-patterns.md` and `.claude/skills/use-test-patterns.md` for the current repository.

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

### Phase 2: Pattern Extraction

Per test type found (max 4 types), read FIRST 60 lines of 2 sample test files. Extract:
1. File naming convention (e.g., `{Class}Tests.cs`, `{feature}.test.ts`)
2. Test naming pattern (e.g., `MethodName_Scenario_ExpectedResult`)
3. Arrange/Act/Assert structure
4. Fixture/setup approach (constructor, SetUp, beforeEach)
5. Mocking approach (1 sentence)
6. Assertion style (1 sentence)
7. Key rules (3 bullets max)
8. Single canonical test file path

Also detect shared test utilities:
- Base test classes
- Test builders/factories
- Custom assertions
- Test fixtures/data

### Phase 3: Generate test-patterns.md

Create `.claude/skills/test-patterns.md` with:
- Overview (frameworks, test types found, coverage approach)
- Per test type: naming + structure + mocking + assertions + canonical file
- Shared utilities (builders, fixtures, base classes — paths only)
- Anti-patterns (max 5: e.g., "Don't mock what you don't own", "Don't test implementation details")
- Test scaffold reference table

Max 200 lines. No prose — bullets + code snippets only.

### Phase 4: Generate use-test-patterns.md

Create `.claude/skills/use-test-patterns.md` — test task executor with:
- Terse communication
- 3 checkpoints (Plan → Write Tests → Verify)
- Complexity tiers per checkpoint
- Human gates before: choosing between unit/integration, modifying shared fixtures
- Token optimization rules
- Adapt test runner command to detected framework

## Rules

- Sample 2 files per test type — don't read everything
- Read first 60 lines only
- No prose in generated output — bullets + code snippets
- Max 200 lines for test-patterns.md
- Prefer canonical test file paths over explaining
- For code patterns → tell user to run `/codeprint`
- For infra patterns → tell user to run `/infraprint`
