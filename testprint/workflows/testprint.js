export const meta = {
  name: 'testprint',
  description: 'Analyze repository test patterns and generate test-patterns skill',
  phases: [
    { title: 'Detect', detail: 'Test frameworks, types, utilities' },
    { title: 'Extract', detail: 'Sample test files, split subtypes, extract conventions' },
    { title: 'Pitfalls', detail: 'Detect gotchas: polymorphic types, null traps, required fields' },
    { title: 'Generate', detail: 'Produce test-patterns.md and use-test-patterns.md' },
  ],
}

// Phase 1: Detect test structure
phase('Detect')
log('Starting testprint. Detecting test frameworks and structure.')

const detection = await agent(
  `Analyze this repository for TEST patterns only.

Do the following:
1. Find test directories (*.Tests, __tests__, test/, spec/, tests/)
2. Detect test framework from dependencies (xUnit, NUnit, Jest, Vitest, pytest, Go testing, etc.)
3. Detect assertion library (FluentAssertions, Shouldly, Chai, etc.)
4. Detect mocking library (Moq, NSubstitute, jest.mock, testify/mock, etc.)
5. Detect test data approach (builders, fixtures, AutoFixture, Bogus, Faker)
6. Detect integration test infra (Testcontainers, WebApplicationFactory, docker-compose)
7. Classify test types present: unit, integration, e2e, contract
8. Find shared test utilities (base classes, builders, custom assertions)

ONLY look at test-related files. Ignore application code.
Report file counts per test type, not file contents.`,
  { label: 'detect:tests', phase: 'Detect', model: 'haiku', effort: 'low', schema: {
    type: 'object',
    properties: {
      framework: { type: 'string' },
      assertionLib: { type: 'string' },
      mockingLib: { type: 'string' },
      dataApproach: { type: 'string' },
      integrationInfra: { type: 'string' },
      testTypes: { type: 'array', items: { type: 'object', properties: {
        type: { type: 'string' },
        location: { type: 'string' },
        fileCount: { type: 'number' },
        sampleFiles: { type: 'array', items: { type: 'string' } }
      }, required: ['type', 'location', 'sampleFiles'] } },
      sharedUtilities: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' },
        path: { type: 'string' },
        purpose: { type: 'string' }
      } } }
    },
    required: ['framework', 'testTypes']
  } }
)

if (!detection) {
  log('Detection failed. Aborting.')
  return { error: 'Test detection failed' }
}

log(`Detected: ${detection.framework} | ${detection.testTypes.length} test types | mock: ${detection.mockingLib || 'none'}`)

// Budget check
if (budget.total && budget.remaining() < 30000) {
  log(`Budget low (${Math.round(budget.remaining() / 1000)}k). Generating compressed output.`)
  const compressed = await agent(
    `Generate compressed .claude/skills/test-patterns.md. Keep under 100 lines. Data: ${JSON.stringify(detection)}`,
    { label: 'generate:compressed', phase: 'Generate', model: 'sonnet' }
  )
  return { testPatterns: compressed, mode: 'compressed', detection }
}

// Phase 2: Extract per test type with subtype splitting (max 4 types)
phase('Extract')
log('Extracting test patterns from sample files + detecting subtypes.')

const topTypes = detection.testTypes.slice(0, 4)

const extractionPrompts = topTypes.map(tt => ({
  type: tt.type,
  prompt: `Extract test patterns for "${tt.type}" tests.
Sample files: ${tt.sampleFiles.slice(0, 3).join(', ')}

IMPORTANT: Read only FIRST 60 lines of each file.

SUBTYPE DETECTION: Check if these test files use DIFFERENT assertion/setup styles.
For example, service tests might use mocks + standard assertions while validator tests use a specialized validation testing library.
If you find 2+ distinct styles, split into subtypes (e.g., "unit:service", "unit:validator", "unit:component").

Per subtype found, extract (terse — max 1 sentence each):
1. Subtype name (e.g., "unit:handler", "unit:validator", "integration:api")
2. File naming convention
3. Test method naming pattern
4. Setup/fixture approach
5. Mocking approach
6. Assertion style (SPECIFIC: which methods/classes used)
7. Key rules (3 bullets max)
8. Single BEST canonical test file path for this subtype

Keep response under 200 words.`
}))

const extractions = await pipeline(
  extractionPrompts,
  item => agent(item.prompt, {
    label: `extract:${item.type}`,
    phase: 'Extract',
    model: 'sonnet',
    effort: 'medium',
    schema: {
      type: 'object',
      properties: {
        subtypes: { type: 'array', items: { type: 'object', properties: {
          subtype: { type: 'string' },
          fileNaming: { type: 'string' },
          methodNaming: { type: 'string' },
          setup: { type: 'string' },
          mocking: { type: 'string' },
          assertions: { type: 'string' },
          rules: { type: 'array', items: { type: 'string' } },
          canonicalFile: { type: 'string' }
        }, required: ['subtype', 'fileNaming', 'methodNaming', 'canonicalFile', 'assertions'] } }
      },
      required: ['subtypes']
    }
  })
)

const validExtractions = extractions.filter(Boolean)
const allSubtypes = validExtractions.flatMap(e => e.subtypes)
log(`Extracted ${allSubtypes.length} subtypes across ${validExtractions.length} test types`)

// Phase 2.5: Pitfall/Gotcha Extraction
phase('Pitfalls')
log('Detecting pitfalls: polymorphic types, null traps, required fields, specialized assertions.')

const pitfalls = await agent(
  `Analyze test code in this repository for PITFALLS — things that break on first attempt.

Detect the following (check test data factories, models/entities, and validation tests):

1. POLYMORPHIC/ABSTRACT TYPES in test data:
   - Find abstract classes, interfaces, or base types referenced by test factories/builders
   - Which concrete type do existing tests actually instantiate?
   - Report: abstract type → concrete type used in tests

2. SPECIALIZED ASSERTION LIBRARIES distinct from main style:
   - Grep for assertion packages beyond the primary one (validation test helpers, mock verification APIs, snapshot testing libs, etc.)
   - Report: which package + how it's invoked (different from standard assertions)

3. NULL/EMPTY BEHAVIOR in validation:
   - Do validators handle null vs empty vs missing differently?
   - Does any validation method throw on null input rather than returning a validation error?
   - Report any inconsistency or null-unsafe patterns

4. MANDATORY/IMMUTABLE PROPERTIES:
   - Find required, readonly, non-optional, or non-nullable fields on model/entity types used in test data
   - What is the MINIMUM set of fields needed to construct a valid test object?
   - Report: type → required fields list

5. TEST DATA FACTORIES:
   - Find factory/builder/helper classes in test projects (create*(), build(), *Factory, *TestData, *Fixture, *Builder)
   - Extract: which fields they set, which concrete types they use
   - Report: factory path + minimal creation example

Search test directories AND model/entity/domain directories.
Be concrete — report file paths and specific type names, not generic advice.`,
  { label: 'detect:pitfalls', phase: 'Pitfalls', model: 'sonnet', effort: 'medium', schema: {
    type: 'object',
    properties: {
      polymorphicTypes: { type: 'array', items: { type: 'object', properties: {
        abstractType: { type: 'string' },
        concreteTypeUsed: { type: 'string' },
        foundIn: { type: 'string' }
      } } },
      specializedAssertions: { type: 'array', items: { type: 'object', properties: {
        library: { type: 'string' },
        invocationPattern: { type: 'string' },
        usedIn: { type: 'string' }
      } } },
      nullTraps: { type: 'array', items: { type: 'object', properties: {
        location: { type: 'string' },
        issue: { type: 'string' },
        fix: { type: 'string' }
      } } },
      requiredFields: { type: 'array', items: { type: 'object', properties: {
        entity: { type: 'string' },
        fields: { type: 'array', items: { type: 'string' } },
        path: { type: 'string' }
      } } },
      testDataFactories: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' },
        path: { type: 'string' },
        minimalExample: { type: 'string' },
        concreteTypes: { type: 'array', items: { type: 'string' } }
      } } }
    },
    required: ['requiredFields', 'testDataFactories']
  } }
)

log(`Pitfalls detected: ${pitfalls ? [
  pitfalls.polymorphicTypes?.length || 0, 'polymorphic',
  pitfalls.requiredFields?.length || 0, 'required-field entities',
  pitfalls.testDataFactories?.length || 0, 'factories'
].join(' ') : 'none'}`)

// Phase 3: Generate
phase('Generate')
log('Generating test-patterns.md')

const generateInput = JSON.stringify({ detection, subtypes: allSubtypes, pitfalls })

const testPatternsSkill = await agent(
  `Generate and WRITE a .claude/skills/test-patterns/SKILL.md file in the current repository.

Use this data: ${generateInput}

STRUCTURE (follow exactly):
1. YAML frontmatter: name: test-patterns, description, trigger: /test-patterns
2. Overview — frameworks, test types
3. Per-SUBTYPE Patterns — one section per detected subtype (NOT just per test type). Each section:
   - Subtype name (e.g., "unit:handler", "unit:validator", "integration:api")
   - Naming + setup + assertion style (specific methods/classes)
   - Canonical file path (ONE file, best example for this subtype)
   - Minimal skeleton (class structure + one test method signature, 5-10 lines max)
4. Test Data Factories — for each factory found:
   - Path
   - Minimal Create() example showing required fields + concrete types used
5. Pitfalls — concrete gotchas (what breaks + how to fix). Include:
   - Required/init fields that must be set
   - Null behavior differences in validators
   - Specialized assertion patterns distinct from main style
6. Anti-Patterns (max 5) — inferred from consistency
7. Test Scaffold Lookup Table:
   | Writing a... | Copy from |
   |---|---|
   | {subtype} | {canonical_file_path} |

Rules:
- Max 250 lines
- No prose — bullets and code snippets only
- Pitfalls section is MANDATORY if pitfall data exists

IMPORTANT: Use the Write tool to save the file at .claude/skills/test-patterns/SKILL.md (create dirs if needed). Do NOT just return the content.`,
  { label: 'generate:test-patterns', phase: 'Generate', model: 'opus', effort: 'medium' }
)

let useTestPatternsSkill = null
if (!budget.total || budget.remaining() > 15000) {
  const subtypeLookup = allSubtypes.map(s => `| ${s.subtype} | \`${s.canonicalFile}\` |`).join('\n')

  useTestPatternsSkill = await agent(
    `Generate and WRITE a .claude/skills/use-test-patterns/SKILL.md file for this repository.

Task executor for writing tests following repo conventions.

MUST include these sections:

1. "Look Here First" — for each test subtype, ONE line:
   "Before writing a {subtype} test, read: {canonical_path}"
${allSubtypes.map(s => `   - ${s.subtype}: ${s.canonicalFile}`).join('\n')}

2. Subtype → Canonical File lookup table:
   | Writing a... | Copy from |
   |---|---|
${subtypeLookup}

3. Test Data Factory Template — if factories detected, include minimal Create() example:
${pitfalls?.testDataFactories?.map(f => `   - ${f.name}: ${f.minimalExample}`).join('\n') || '   (none detected)'}

4. Checkpoints: Plan → Write Tests → Verify
   - Plan: identify subtype, look up canonical file, read it
   - Write: follow pattern from canonical file exactly
   - Verify: run test command

5. Human gates before: choosing unit vs integration, modifying shared fixtures, polymorphic type decisions

6. Token optimization:
   - Do NOT explore to find patterns — use lookup table above
   - Read ONE canonical file per subtype, not multiple
   - If test data factory exists, use it — don't reinvent

Adapt to this repo:
- Framework: ${detection.framework}
- Assertion lib: ${detection.assertionLib || 'default'}
- Mocking: ${detection.mockingLib || 'none'}
- Test runner command: infer from framework
- Shared utilities: ${detection.sharedUtilities?.map(u => u.path).join(', ') || 'none'}

IMPORTANT: Use the Write tool to save the file at .claude/skills/use-test-patterns/SKILL.md (create dirs if needed). Do NOT just return the content.`,
    { label: 'generate:use-test-patterns', phase: 'Generate', model: 'sonnet', effort: 'medium' }
  )
}

log('Testprint complete. Run /codeprint for code patterns, /infraprint for infra patterns.')

return {
  detection,
  extractions: validExtractions,
  testPatternsSkill,
  useTestPatternsSkill
}
