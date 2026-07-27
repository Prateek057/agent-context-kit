export const meta = {
  name: 'infraprint',
  description: 'Analyze repository infrastructure patterns and generate infra-patterns skill',
  phases: [
    { title: 'Detect', detail: 'IaC, Docker, CI/CD, deployment, environments' },
    { title: 'Extract', detail: 'Sample infra files, extract conventions' },
    { title: 'Generate', detail: 'Produce infra-patterns.md and use-infra-patterns.md' },
  ],
}

// Phase 1: Detect infrastructure
phase('Detect')
log('Starting infraprint. Detecting IaC, Docker, CI/CD, deployment patterns.')

const detection = await agent(
  `Analyze this repository for INFRASTRUCTURE patterns only.

Do the following:
1. Detect IaC tool: *.tf (Terraform), cdk.json (CDK), Pulumi.yaml, *.bicep
2. Detect IaC structure: flat vs modular, shared modules, per-service modules
3. Detect Docker patterns: Dockerfile locations, multi-stage builds, base images
4. Detect CI/CD: .github/workflows/, .gitlab-ci.yml, Jenkinsfile, buildspec.yml
5. Detect deployment: ECS task defs, K8s manifests, Lambda, serverless configs
6. Detect environment strategy: how dev/staging/prod differ (tfvars, overlays, branches)
7. Detect secrets management approach

ONLY look at infra-related files. Ignore application code and tests.
Report file counts and paths, not file contents.`,
  { label: 'detect:infra', phase: 'Detect', model: 'haiku', effort: 'low', schema: {
    type: 'object',
    properties: {
      iacTool: { type: 'string' },
      iacStructure: { type: 'string' },
      docker: { type: 'string' },
      cicd: { type: 'string' },
      deployment: { type: 'string' },
      envStrategy: { type: 'string' },
      secrets: { type: 'string' },
      infraTypes: { type: 'array', items: { type: 'object', properties: {
        type: { type: 'string' },
        location: { type: 'string' },
        fileCount: { type: 'number' },
        sampleFiles: { type: 'array', items: { type: 'string' } }
      }, required: ['type', 'location', 'sampleFiles'] } }
    },
    required: ['iacTool', 'infraTypes']
  } }
)

if (!detection) {
  log('Detection failed. Aborting.')
  return { error: 'Infra detection failed' }
}

if (!detection.infraTypes.length) {
  log('No infrastructure code detected in this repository.')
  return { error: 'No infra found', detection }
}

log(`Detected: ${detection.iacTool} | ${detection.cicd || 'no CI'} | ${detection.deployment || 'no deploy config'} | ${detection.infraTypes.length} types`)

// Budget check
if (budget.total && budget.remaining() < 30000) {
  log(`Budget low (${Math.round(budget.remaining() / 1000)}k). Generating compressed output.`)
  const compressed = await agent(
    `Generate compressed .claude/skills/infra-patterns.md. Keep under 100 lines. Data: ${JSON.stringify(detection)}`,
    { label: 'generate:compressed', phase: 'Generate', model: 'sonnet' }
  )
  return { infraPatterns: compressed, mode: 'compressed', detection }
}

// Phase 2: Extract per infra type (max 5)
phase('Extract')
log('Extracting infra patterns from sample files.')

const topTypes = detection.infraTypes.slice(0, 5)

const extractionPrompts = topTypes.map(it => ({
  type: it.type,
  prompt: `Extract infrastructure patterns for "${it.type}".
Sample files: ${it.sampleFiles.slice(0, 2).join(', ')}

IMPORTANT: Read only FIRST 60 lines of each file.

Extract (terse — max 1 sentence each):
1. File/dir naming convention
2. Resource/module structure pattern
3. Variable/parameter conventions
4. Tagging/labeling strategy (if applicable)
5. Key rules (3 bullets max)

Pick single best canonical file path.
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
        infraType: { type: 'string' },
        naming: { type: 'string' },
        structure: { type: 'string' },
        variables: { type: 'string' },
        tagging: { type: 'string' },
        rules: { type: 'array', items: { type: 'string' } },
        canonicalFile: { type: 'string' }
      },
      required: ['infraType', 'naming', 'structure', 'canonicalFile', 'rules']
    }
  })
)

const validExtractions = extractions.filter(Boolean)
log(`Extracted patterns for ${validExtractions.length}/${topTypes.length} infra types`)

// Phase 3: Generate
phase('Generate')
log('Generating infra-patterns.md')

const generateInput = JSON.stringify({ detection, extractions: validExtractions })

const infraPatternsSkill = await agent(
  `Generate a .claude/skills/infra-patterns.md file for this repository.

Use this data: ${generateInput}

Rules:
- YAML frontmatter: name: infra-patterns, description, trigger: /infra-patterns
- Max 200 lines
- No prose — bullets and code snippets only
- Include: Overview, Per-Type Patterns (structure + naming + canonical + rules), Environment Strategy, Anti-Patterns (max 5), Infra Scaffold Reference
- Infer anti-patterns from consistency
- Minimal code templates (resource structure skeleton only)

Write COMPLETE file content. Valid markdown ready to save.`,
  { label: 'generate:infra-patterns', phase: 'Generate', model: 'opus', effort: 'medium' }
)

let useInfraPatternsSkill = null
if (!budget.total || budget.remaining() > 15000) {
  useInfraPatternsSkill = await agent(
    `Generate a .claude/skills/use-infra-patterns.md file for this repository.

Task executor for infra work following repo conventions:
- Terse communication (fragments OK, no filler)
- 3 checkpoints: Plan → Implement → Validate
- Complexity tier hints per checkpoint (Low/Medium/High)
- Human gates before: modifying shared modules, changing env configs, touching CI/CD pipelines
- Token optimization rules

Adapt to this repo:
- IaC tool: ${detection.iacTool}
- Structure: ${detection.iacStructure || 'flat'}
- CI/CD: ${detection.cicd || 'none'}
- Deployment: ${detection.deployment || 'none'}
- Env strategy: ${detection.envStrategy || 'unknown'}
- Plan/apply command: infer from IaC tool (terraform plan / cdk diff / pulumi preview)

Write COMPLETE file content with YAML frontmatter. Ready to save.`,
    { label: 'generate:use-infra-patterns', phase: 'Generate', model: 'sonnet', effort: 'medium' }
  )
}

log('Infraprint complete. Run /codeprint for code patterns, /testprint for test patterns.')

return {
  detection,
  extractions: validExtractions,
  infraPatternsSkill,
  useInfraPatternsSkill
}
