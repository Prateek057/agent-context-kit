export const meta = {
  name: 'codeprint',
  description: 'Analyze repository coding patterns (excludes tests and infra — use testprint/infraprint for those)',
  phases: [
    { title: 'Detect', detail: 'Topology, languages, code subtypes' },
    { title: 'Extract', detail: 'Sample files, extract conventions' },
    { title: 'Generate', detail: 'Produce patterns.md and use-patterns.md' },
  ],
}

// Phase 1: Detection (code subtypes only — no tests, no infra)
phase('Detect')
log('Starting codeprint. Detecting topology, languages, code subtypes.')

const detection = await agent(
  `Analyze this repository structure for CODE patterns only.

Do the following:
1. List root directory contents
2. Detect topology: monorepo (multiple services/packages/apps with own build files), monolith (single entry point, layered dirs), or microservice (single service, shallow)
3. Detect languages by finding build files (.csproj, package.json, go.mod, Cargo.toml, pom.xml, pyproject.toml, etc.)
4. Detect frameworks from dependency manifests
5. Identify CODE subtypes only: handlers, controllers, services, repositories, workers, validators, mappers, DTOs, domain models, middleware, consumers
   EXCLUDE: test files, infrastructure (terraform, docker, CI/CD), config files

Report structured findings. List file counts, not file contents.`,
  { label: 'detect:structure', phase: 'Detect', model: 'haiku', effort: 'low', schema: {
    type: 'object',
    properties: {
      topology: { type: 'string', enum: ['monorepo', 'monolith', 'microservice'] },
      languages: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' },
        version: { type: 'string' },
        frameworks: { type: 'array', items: { type: 'string' } }
      }, required: ['name'] } },
      subtypes: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' },
        location: { type: 'string' },
        fileCount: { type: 'number' },
        sampleFiles: { type: 'array', items: { type: 'string' } }
      }, required: ['name', 'location', 'sampleFiles'] } },
      monorepoStructure: { type: 'string' }
    },
    required: ['topology', 'languages', 'subtypes']
  } }
)

if (!detection) {
  log('Detection failed. Aborting.')
  return { error: 'Detection phase failed' }
}

log(`Detected: ${detection.topology} | ${detection.languages.map(l => l.name).join(', ')} | ${detection.subtypes.length} subtypes`)

// Budget check before expensive phases
if (budget.total && budget.remaining() < 30000) {
  log(`Budget low (${Math.round(budget.remaining() / 1000)}k remaining). Generating compressed output.`)
  const compressed = await agent(
    `Generate a compressed .claude/skills/patterns.md based on this detection data. Keep under 150 lines. Detection: ${JSON.stringify(detection)}`,
    { label: 'generate:compressed', phase: 'Generate', model: 'sonnet' }
  )
  return { patterns: compressed, mode: 'compressed', detection }
}

// Phase 4-5: Extraction (Sonnet — needs code understanding)
phase('Extract')
log('Extracting patterns from representative files.')

// Cap subtypes to 8 most important (highest file count = most representative)
const topSubtypes = detection.subtypes
  .sort((a, b) => (b.fileCount || 0) - (a.fileCount || 0))
  .slice(0, 8)
log(`Extracting top ${topSubtypes.length} subtypes (of ${detection.subtypes.length} detected)`)

const extractionPrompts = topSubtypes.map(subtype => ({
  subtype: subtype.name,
  prompt: `Extract coding patterns for "${subtype.name}" subtype.
Sample files: ${subtype.sampleFiles.slice(0, 2).join(', ')}

IMPORTANT: Read only the FIRST 60 lines of each file. Do NOT read entire files.

Extract (terse — each answer max 1 sentence):
1. Naming convention (casing, suffix)
2. Constructor pattern (DI style)
3. Method signature pattern (async, return type)
4. Error handling (1 sentence)
5. Key rules (3 bullets max)

Pick the single best canonical file path.
Keep total response under 150 words.`
}))

const extractions = await pipeline(
  extractionPrompts,
  item => agent(item.prompt, {
    label: `extract:${item.subtype}`,
    phase: 'Extract',
    model: 'sonnet',
    effort: 'low',
    schema: {
      type: 'object',
      properties: {
        subtype: { type: 'string' },
        location: { type: 'string' },
        naming: { type: 'string' },
        template: { type: 'string' },
        canonicalFile: { type: 'string' },
        rules: { type: 'array', items: { type: 'string' } },
        errorHandling: { type: 'string' },
        validation: { type: 'string' },
        logging: { type: 'string' }
      },
      required: ['subtype', 'location', 'naming', 'canonicalFile', 'rules']
    }
  })
)

const validExtractions = extractions.filter(Boolean)
log(`Extracted patterns for ${validExtractions.length}/${detection.subtypes.length} subtypes`)

// Cross-cutting inferred from extraction data during generation — no separate agent

// Anti-patterns inferred during generation from extraction consistency — no separate agent

// Budget check before generation
if (budget.total && budget.remaining() < 20000) {
  log(`Budget moderate (${Math.round(budget.remaining() / 1000)}k). Skipping use-patterns.md and tooling recs.`)
}

// Phase 7-8: Generate (Opus — synthesis)
phase('Generate')
log('Generating patterns.md')

const generateInput = JSON.stringify({
  detection,
  extractions: validExtractions
})

const patternsSkill = await agent(
  `Generate a .claude/skills/patterns.md file for this repository.

Use this data: ${generateInput}

Follow these rules strictly:
- YAML frontmatter: name: patterns, description, trigger: /patterns
- Max 300 lines
- No prose — bullets and code snippets only
- Minimal code templates (constructor + one method signature)
- Prefer canonical file paths over re-explaining
- Anti-patterns section: max 7 items
- Include: Overview, Subtypes (with templates), Conventions, Anti-Patterns, Scaffold Reference, Preferred Dependencies
- NO infrastructure/test sections (those are handled by infraprint/testprint)
- Infer cross-cutting conventions (DI, config, logging) from extraction data — brief "Conventions" section
- Infer anti-patterns from consistency (if pattern A always used over common alternative B → "Don't use B"). Max 7 items.

Write the COMPLETE file content. It must be valid markdown ready to save.`,
  { label: 'generate:patterns', phase: 'Generate', model: 'opus', effort: 'medium' }
)

let usePatternsSkill = null
if (!budget.total || budget.remaining() > 15000) {
  usePatternsSkill = await agent(
    `Generate a .claude/skills/use-patterns.md file for this repository.

This is a task executor skill that applies the repo's coding patterns with:
- Terse communication (fragments OK, no filler)
- 4 checkpoints: Plan → Implement → Wire → Verify
- Human gates before irreversible decisions
- Token optimization rules (don't re-read, don't repeat back, use Edit not Write)
- Complexity tier hints per checkpoint (Low/Medium/High — user picks model)

Adapt to this repo specifically:
- Topology: ${detection.topology}
- Languages: ${detection.languages.map(l => l.name).join(', ')}
- Wiring mechanism: infer from extraction data
- Build command: infer from language (dotnet build / npm run build / go build / etc.)
- Shared libs path: infer from detection data
- Note: infra patterns handled separately by /infraprint


Write the COMPLETE file content with YAML frontmatter. Ready to save.`,
    { label: 'generate:use-patterns', phase: 'Generate', model: 'sonnet', effort: 'medium' }
  )
}

log('Codeprint complete. Run /testprint for test patterns, /infraprint for infra patterns.')

return {
  detection,
  extractions: validExtractions,
  patternsSkill,
  usePatternsSkill
}
