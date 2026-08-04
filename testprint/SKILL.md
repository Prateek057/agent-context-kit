---
name: testprint
description: Analyze repository test patterns and generate a token-efficient test patterns skill. Detects test frameworks, fixtures, mocking strategies, and conventions per test type.
---

# Testprint — Test Pattern Extractor

Generate `.claude/skills/test-patterns.md` and `.claude/skills/use-test-patterns.md` for the current repository.

## When to Use

- Setting up Claude Code test generation for a repo
- Test conventions have changed significantly
- User says "testprint", "extract test patterns", or `/testprint`

## When to Skip

- Test patterns skill already exists and hasn't changed
- User wants to write a specific test (use `/use-test-patterns` instead)

## Execution Modes

### Skill Mode (default)
```
/testprint
```

### Workflow Mode
If Workflow tool available:
```javascript
Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/testprint.js" })
```

## Phases

| Phase | What | Reference |
|-------|------|-----------|
| 1 | Detect test framework, structure, types | Scan test directories |
| 2 | Extract patterns per test type + **subtype splitting** | Sample 2 files each |
| 2.5 | **Pitfall/gotcha extraction** | Detect what breaks on first attempt |
| 3 | Generate test-patterns.md | Synthesize findings |
| 4 | Generate use-test-patterns.md | Task executor with lookup table |

Model routing handled by workflow script internally. Generated skills use complexity tiers.

### Phase 2: Subtype Splitting

Within each test type (unit, integration, e2e), detect if MULTIPLE distinct assertion/setup styles exist:
- Different assertion libraries/methods in same test project
- Different setup patterns (constructor injection vs factory vs shared fixture)
- Different mocking granularity (full mock setup vs no mocks vs stubs)

**Heuristic:** grep test projects for multiple assertion namespaces/methods. If 2+ distinct styles found, split into subtypes and emit separate sections in output with own canonical file each.

Example subtypes within "unit tests":
- `unit:service` — mocks + standard assertions
- `unit:validator` — specialized validation test helpers
- `unit:mapper` — no mocks, input/output assertion only
- `unit:component` — render + query + interaction assertions (frontend)

### Phase 2.5: Pitfall/Gotcha Extraction

Detect patterns that break on first attempt without prior knowledge:
1. **Abstract/polymorphic types in test data** — find abstract classes, interfaces, or base types referenced by test factories/builders. Note which concrete type tests actually instantiate and which mandatory fields must be set.
2. **Specialized assertion libraries** distinct from main style — grep for additional assertion packages that require different invocation patterns (validation test helpers, mock verification APIs, snapshot testing libs, etc.).
3. **Null/empty behavior traps** — in validation logic, detect if different validator methods handle null/empty/missing differently (e.g., presence check vs custom predicate). Note which guards null and which doesn't.
4. **Mandatory/immutable properties** — find required/readonly/non-optional fields on model/entity types that test factories must satisfy. Note the minimal field set needed for a valid test object.
5. **Test data factories** — find existing factory/builder/helper classes (e.g., `create*()`, `build()`, `*Factory`, `*TestData`, `*Fixture`). Extract which concrete types they use and which fields they populate.

**Output:** A "Pitfalls" section in the generated skill with concrete gotchas and their solutions.

## Output

Creates in target repository:
```
.claude/skills/
├── test-patterns/SKILL.md        ← Test conventions reference (invoked via /test-patterns)
└── use-test-patterns/SKILL.md    ← Test task executor (invoked via /use-test-patterns)
```

### Required Sections in test-patterns.md

1. **Overview** — frameworks, test types
2. **Per-Subtype Patterns** — one section per detected subtype (not just per test type), each with:
   - Naming, setup, assertion style
   - Canonical file path (ONE file, the best example)
   - Minimal skeleton (constructor + one test method signature)
3. **Test Data Factories** — for each factory/builder found:
   - Path to factory
   - Minimal creation example showing mandatory fields and concrete types used
   - Which polymorphic/abstract base it satisfies
4. **Pitfalls** — concrete gotchas detected in Phase 2.5
5. **Anti-Patterns** — max 5
6. **Test Scaffold Lookup Table** — subtype → canonical file to copy from

### Required Sections in use-test-patterns.md

1. **Checkpoint flow** — Plan → Write → Verify
2. **"Look here first" pointers** — for each test subtype, ONE canonical file path to read before writing. Format: `Before writing a {subtype} test, read: {path}`
3. **Subtype → Canonical File lookup table** — explicit mapping, not prose
4. **Test data factory template** — minimal creation example showing mandatory fields + concrete types
5. **Human gates**

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Reading every test file | Sample 2 per test type |
| Including test data in skill | Reference fixture paths only |
| Missing shared test utilities | Detect base classes, builders, fixtures |
| Ignoring test naming conventions | Extract `MethodName_Scenario_Expected` patterns |
| Same rules for unit + integration | Detect differences — they often diverge |
| Treating all unit tests as one pattern | Split subtypes when assertion styles diverge (handler vs validator vs mapper) |
| Only extracting what works | Also extract what breaks — pitfalls save more tokens than patterns |
| Vague "copy nearest test" advice | Emit explicit lookup table: subtype → canonical file path |
| Missing test data factories | Include minimal `Create()` template with required fields + concrete types |
| No "read this first" pointers in executor | Each subtype gets ONE canonical path to read before writing |
