export const meta = {
  name: 'codeprint',
  description: 'Analyze repository patterns and generate token-efficient coding patterns skill with model-aware routing',
  phases: [
    { title: 'Detect', detail: 'Topology, languages, subtypes, infrastructure', model: 'haiku' },
    { title: 'Extract', detail: 'Sample files, extract patterns and conventions', model: 'sonnet' },
    { title: 'Generate', detail: 'Produce patterns.md and use-patterns.md', model: 'opus' },
    { title: 'Recommend', detail: 'Suggest additional tooling', model: 'haiku' },
  ],
}

// Phase 1-3.5: Detection (Haiku — mechanical scanning)
phase('Detect')
log('Starting codeprint. Detecting topology, languages, subtypes, infrastructure.')

const detection = await agent(
  `Analyze this repository structure and report findings.

Do the following:
1. List root directory contents
2. Detect topology: monorepo (multiple services/packages/apps with own build files), monolith (single entry point, layered dirs), or microservice (single service, shallow)
3. Detect languages by finding build files (.csproj, package.json, go.mod, Cargo.toml, pom.xml, pyproject.toml, etc.)
4. Detect frameworks from dependency manifests
5. Identify subtypes present (handlers, controllers, services, repositories, workers, validators, mappers, tests, etc.) by scanning directory names and file suffixes
6. Detect infrastructure: IaC tool (*.tf, cdk.json, Pulumi.yaml), Docker (Dockerfile patterns), CI/CD (.github/workflows/, etc.), deployment mechanism
7. Detect environment strategy (how dev/staging/prod differ)

Report structured findings. Be thorough but concise — list file counts, not file contents.`,
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
      infrastructure: { type: 'object', properties: {
        iac: { type: 'string' },
        iacStructure: { type: 'string' },
        docker: { type: 'string' },
        cicd: { type: 'string' },
        deployment: { type: 'string' },
        environments: { type: 'string' }
      } },
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
- Anti-patterns section: max 10 items
- Include: Overview, Subtypes (with templates), Infrastructure, Anti-Patterns, Scaffold Reference, Preferred Dependencies
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
- Infra path: ${detection.infrastructure?.iac || 'none detected'}


Write the COMPLETE file content with YAML frontmatter. Ready to save.`,
    { label: 'generate:use-patterns', phase: 'Generate', model: 'sonnet', effort: 'medium' }
  )
}

// Phase 9: Recommend (Haiku — lookup matching)
phase('Recommend')

let recommendations = null
if (!budget.total || budget.remaining() > 10000) {
  recommendations = await agent(
    `Based on this repo analysis, recommend up to 5 Claude Code tools/skills that would help.

Detection data: topology=${detection.topology}, languages=${detection.languages.map(l => l.name).join(',')}, cicd=${detection.infrastructure?.cicd || 'none'}, infra=${detection.infrastructure?.iac || 'none'}

Check for these signals and recommend if present:
- .github/ → GitHub MCP server
- Test framework → /run-tests skill
- docker-compose.yml → /dev-up skill
- Terraform/CDK → /plan-infra skill
- OpenAPI specs → /gen-client skill
- Migrations → /migrate skill
- Monorepo >3 services → /affected skill
- CI/CD → /ci-status skill
- Commitlint → /commit skill

Report which are applicable with one-line reason each.`,
    { label: 'recommend:tooling', phase: 'Recommend', model: 'haiku', effort: 'low', schema: {
      type: 'object',
      properties: {
        recommendations: { type: 'array', items: { type: 'object', properties: {
          name: { type: 'string' },
          reason: { type: 'string' },
          scope: { type: 'string', enum: ['global', 'project'] }
        }, required: ['name', 'reason', 'scope'] }, maxItems: 5 }
      },
      required: ['recommendations']
    } }
  )
}

log('Codeprint complete.')

return {
  detection,
  extractions: validExtractions,
  patternsSkill,
  usePatternsSkill,
  recommendations
}
