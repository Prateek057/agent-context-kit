export const meta = {
  name: 'testprint',
  description: 'Analyze repository test patterns and generate test-patterns skill',
  phases: [
    { title: 'Detect', detail: 'Test frameworks, types, utilities' },
    { title: 'Extract', detail: 'Sample test files, extract conventions' },
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

// Phase 2: Extract per test type (max 4)
phase('Extract')
log('Extracting test patterns from sample files.')

const topTypes = detection.testTypes.slice(0, 4)

const extractionPrompts = topTypes.map(tt => ({
  type: tt.type,
  prompt: `Extract test patterns for "${tt.type}" tests.
Sample files: ${tt.sampleFiles.slice(0, 2).join(', ')}

IMPORTANT: Read only FIRST 60 lines of each file.

Extract (terse — max 1 sentence each):
1. File naming convention
2. Test method naming pattern
3. Setup/fixture approach
4. Mocking approach
5. Assertion style
6. Key rules (3 bullets max)

Pick single best canonical test file path.
Keep response under 150 words.`
}))

const extractions = await pipeline(
  extractionPrompts,
  item => agent(item.prompt, {
    label: `extract:${item.type}`,
    phase: 'Extract',
    model: 'sonnet',
    effort: 'low',
    schema: {
      type: 'object',
      properties: {
        testType: { type: 'string' },
        fileNaming: { type: 'string' },
        methodNaming: { type: 'string' },
        setup: { type: 'string' },
        mocking: { type: 'string' },
        assertions: { type: 'string' },
        rules: { type: 'array', items: { type: 'string' } },
        canonicalFile: { type: 'string' }
      },
      required: ['testType', 'fileNaming', 'methodNaming', 'canonicalFile', 'rules']
    }
  })
)

const validExtractions = extractions.filter(Boolean)
log(`Extracted patterns for ${validExtractions.length}/${topTypes.length} test types`)

// Phase 3: Generate
phase('Generate')
log('Generating test-patterns.md')

const generateInput = JSON.stringify({ detection, extractions: validExtractions })

const testPatternsSkill = await agent(
  `Generate a .claude/skills/test-patterns.md file for this repository.

Use this data: ${generateInput}

Rules:
- YAML frontmatter: name: test-patterns, description, trigger: /test-patterns
- Max 200 lines
- No prose — bullets and code snippets only
- Include: Overview, Per-Type Patterns (naming + structure + canonical), Shared Utilities, Anti-Patterns (max 5), Test Scaffold Reference
- Infer anti-patterns from consistency
- Minimal code templates (test structure skeleton only)

Write COMPLETE file content. Valid markdown ready to save.`,
  { label: 'generate:test-patterns', phase: 'Generate', model: 'opus', effort: 'medium' }
)

let useTestPatternsSkill = null
if (!budget.total || budget.remaining() > 15000) {
  useTestPatternsSkill = await agent(
    `Generate a .claude/skills/use-test-patterns.md file for this repository.

Task executor for writing tests following repo conventions:
- Terse communication (fragments OK, no filler)
- 3 checkpoints: Plan → Write Tests → Verify
- Complexity tier hints per checkpoint (Low/Medium/High)
- Human gates before: choosing unit vs integration, modifying shared fixtures
- Token optimization rules

Adapt to this repo:
- Framework: ${detection.framework}
- Assertion lib: ${detection.assertionLib || 'default'}
- Mocking: ${detection.mockingLib || 'none'}
- Test runner command: infer from framework
- Shared utilities: ${detection.sharedUtilities?.map(u => u.path).join(', ') || 'none'}

Write COMPLETE file content with YAML frontmatter. Ready to save.`,
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
