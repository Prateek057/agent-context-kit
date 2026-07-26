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
  { label: 'detect:structure', phase: 'Detect', model: 'haiku', schema: {
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

const extractionPrompts = detection.subtypes.map(subtype => ({
  subtype: subtype.name,
  prompt: `Read 2-3 representative files for the "${subtype.name}" subtype.
Sample files: ${subtype.sampleFiles.join(', ')}

Extract:
1. File naming convention (casing, suffixes)
2. Class/function structure (constructor pattern, DI, base classes)
3. Method signatures (async, return types, parameters)
4. Error handling approach
5. Validation approach
6. Logging approach
7. Key rules (3-5 bullets)

Also note the single best "canonical" file path to use as a reference.
Report as structured data.`
}))

const extractions = await pipeline(
  extractionPrompts,
  item => agent(item.prompt, {
    label: `extract:${item.subtype}`,
    phase: 'Extract',
    model: 'sonnet',
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

// Cross-cutting extraction
const crossCutting = await agent(
  `Analyze cross-cutting patterns in this repository:
1. DI/IoC registration approach (check composition root / startup files)
2. Config management (options pattern, env vars, secrets)
3. API contracts (request/response shapes, error format, versioning)
4. Observability (logging library, metrics, tracing, health checks)
5. Resilience (retry, circuit breaker, timeout patterns)
6. Auth patterns
7. Async patterns (CancellationToken, queuing)
8. Mapping approach (manual vs library)
9. Inter-module communication (events, direct calls)

Focus on HOW things are done, not WHAT they do. Report conventions only.`,
  { label: 'extract:cross-cutting', phase: 'Extract', model: 'sonnet', schema: {
    type: 'object',
    properties: {
      diRegistration: { type: 'string' },
      config: { type: 'string' },
      apiContracts: { type: 'string' },
      observability: { type: 'string' },
      resilience: { type: 'string' },
      auth: { type: 'string' },
      asyncPatterns: { type: 'string' },
      mapping: { type: 'string' },
      communication: { type: 'string' }
    }
  } }
)

// Anti-pattern detection (Opus — reasoning from absence)
const antiPatterns = await agent(
  `Analyze this codebase for anti-patterns — things the team explicitly AVOIDS despite being common.

Check:
1. Linter/analyzer configs (.editorconfig, .eslintrc, stylecop, Directory.Build.props)
2. CLAUDE.md, CONTRIBUTING.md, ARCHITECTURE.md for documented don'ts
3. Infer from consistency: if pattern A is always used over common alternative B, B is likely banned

Examples: "Don't use MediatR (custom mediator exists)", "Don't mock infrastructure (use Testcontainers)"

Report max 10 anti-patterns, most impactful first. Format each as: "Don't [X] — [reason / use Y instead]"`,
  { label: 'extract:anti-patterns', phase: 'Extract', model: 'opus', schema: {
    type: 'object',
    properties: {
      antiPatterns: { type: 'array', items: { type: 'string' }, maxItems: 10 },
      preferredDeps: { type: 'array', items: { type: 'object', properties: {
        purpose: { type: 'string' },
        use: { type: 'string' },
        dontUse: { type: 'string' }
      } } }
    },
    required: ['antiPatterns']
  } }
)

// Budget check before generation
if (budget.total && budget.remaining() < 20000) {
  log(`Budget moderate (${Math.round(budget.remaining() / 1000)}k). Skipping use-patterns.md and tooling recs.`)
}

// Phase 7-8: Generate (Opus — synthesis)
phase('Generate')
log('Generating patterns.md')

const generateInput = JSON.stringify({
  detection,
  extractions: validExtractions,
  crossCutting,
  antiPatterns
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
- Include: Overview, Subtypes (with templates), Infrastructure, Cross-Cutting, Anti-Patterns, Scaffold Reference, Preferred Dependencies

Write the COMPLETE file content. It must be valid markdown ready to save.`,
  { label: 'generate:patterns', phase: 'Generate', model: 'opus' }
)

let usePatternsSkill = null
if (!budget.total || budget.remaining() > 15000) {
  usePatternsSkill = await agent(
    `Generate a .claude/skills/use-patterns.md file for this repository.

This is a task executor skill that applies the repo's coding patterns with:
- Caveman mode communication (terse, no filler)
- 4 checkpoints: Plan → Implement → Wire → Verify
- Human gates before irreversible decisions
- Token optimization rules
- Model routing table (Haiku for scanning, Sonnet for generation, Opus for complex logic)
- Budget awareness (degrade gracefully if tokens run low)

Adapt to this repo specifically:
- Topology: ${detection.topology}
- Languages: ${detection.languages.map(l => l.name).join(', ')}
- Wiring mechanism: ${crossCutting?.diRegistration || 'standard DI'}
- Build command: infer from language (dotnet build / npm run build / go build / etc.)
- Shared libs path: infer from detection data
- Infra path: ${detection.infrastructure?.iac || 'none detected'}

Write the COMPLETE file content with YAML frontmatter. Ready to save.`,
    { label: 'generate:use-patterns', phase: 'Generate', model: 'sonnet' }
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
    { label: 'recommend:tooling', phase: 'Recommend', model: 'haiku', schema: {
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
  crossCutting,
  antiPatterns,
  patternsSkill,
  usePatternsSkill,
  recommendations
}
