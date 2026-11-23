// infraprint workflow (optional accelerator for Claude Code's Workflow tool).
// Same phases and output rules as skills/infraprint/SKILL.md.
export const meta = {
  name: 'infraprint',
  version: '2.0.0',
  description: 'Analyze repository infrastructure patterns and generate infra-patterns skill',
  phases: [
    { title: 'Detect', detail: 'IaC, Docker, CI/CD, deployment, environments' },
    { title: 'Extract', detail: 'Sample infra files, extract conventions' },
    { title: 'Generate', detail: 'Produce infra-patterns.md and use-infra-patterns.md' },
  ],
}

const RULES = `Output rules (from references/generated-output.md):
- Frontmatter: only name + description. First line after it: <!-- generated-by: infraprint 2.0.0 | commit: <sha> | date: <YYYY-MM-DD> | sampled: <n> files | status: draft, review before relying on it -->
- Every convention, pitfall and anti-pattern ends with (observed n/m) or (inferred). Anti-patterns only with counts.
- Conventions, not rules: never restate values (limits, timeouts, versions, thresholds, error codes) that live in requirements, specs, contracts or ADRs; link the file. Values only in code/config: link that file. Contradictions go under "## Open questions".
- Plain concise language: bullets and short skeletons are fine; keep the reason for non-obvious rules; no telegraphic fragments or compression.
- If AGENTS.md / CLAUDE.md / GEMINI.md defines a workflow or validate command, the executor skill follows it; its checkpoints apply only where that file is silent.`

const OUT_DETECT = `Also report: outputDir = ".claude/skills" if .claude/ exists or this is Claude Code (default here), ".gemini/skills" if only .gemini/ exists, else ".agents/skills"; commit = git rev-parse --short HEAD or "none"; contextDocs = which of AGENTS.md, REQUIREMENTS.md, specs/, contracts/, *.rules.yaml, decisions/ exist.`

const ROUTE = (outDir, names) => `If AGENTS.md exists at the repo root, add one line per generated skill under "## Conventions" (create the section at the end if missing), e.g. "- ${names}: see ${outDir}/<skill>/SKILL.md". Change nothing else. If AGENTS.md does not exist, do not create it.`

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
Report file counts and paths, not file contents.
${OUT_DETECT}`,
  { label: 'detect:infra', phase: 'Detect', model: 'haiku', effort: 'low', schema: {
    type: 'object',
    properties: {
      outputDir: { type: 'string' }, commit: { type: 'string' },
      contextDocs: { type: 'array', items: { type: 'string' } },
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

const outDir = detection.outputDir || '.claude/skills'
log(`Detected: ${detection.iacTool} | ${detection.cicd || 'no CI'} | ${detection.deployment || 'no deploy config'} | ${detection.infraTypes.length} types`)

const lowBudget = budget.total && budget.remaining() < 20000
if (lowBudget) log(`Budget low (${Math.round(budget.remaining() / 1000)}k). The executor skill will be skipped; run again for it.`)

// Phase 2: Extract per infra type (max 5)
phase('Extract')
log('Extracting infra patterns from sample files.')

const topTypes = detection.infraTypes.slice(0, 5)

const extractionPrompts = topTypes.map(it => ({
  type: it.type,
  prompt: `Extract infrastructure patterns for "${it.type}".
Sample files: ${it.sampleFiles.slice(0, 2).join(', ')}

Read enough of each sample to see its structure and one complete unit (usually under 150 lines).
COUNT each candidate convention across all files of this type with grep/glob (not by reading more files) and report n/m.
Do not copy concrete values (versions, thresholds, limits); note the file that defines them.

Extract (one short sentence each, with n/m counts):
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
  `Generate and WRITE a ${outDir}/infra-patterns/SKILL.md file for this repository.

Use this data: ${generateInput}

Rules:
- YAML frontmatter: name: infra-patterns, description (what it covers, when to use it)
- Max 200 lines
- Include: Overview, Per-Type Patterns (structure + naming + canonical + rules), Environment Strategy, Anti-Patterns (max 5), Infra Scaffold Reference
- Anti-patterns only with counts
- Minimal code templates (resource structure skeleton only)

${RULES}
${ROUTE(outDir, 'Infrastructure changes')}
IMPORTANT: Use the Write tool to save the file at ${outDir}/infra-patterns/SKILL.md (create dirs if needed). Do NOT just return the content.`,
  { label: 'generate:infra-patterns', phase: 'Generate', model: 'opus', effort: 'medium' }
)

let useInfraPatternsSkill = null
if (!lowBudget) {
  useInfraPatternsSkill = await agent(
    `Generate and WRITE a ${outDir}/use-infra-patterns/SKILL.md file for this repository.

Task executor for infra work following repo conventions:
- 3 checkpoints: Plan → Implement → Validate (plan/lint/validate only; never apply or deploy, that is a human decision)
- Human gates before: modifying shared modules, changing env configs, touching CI/CD pipelines
- Token optimization rules

Adapt to this repo:
- IaC tool: ${detection.iacTool}
- Structure: ${detection.iacStructure || 'flat'}
- CI/CD: ${detection.cicd || 'none'}
- Deployment: ${detection.deployment || 'none'}
- Env strategy: ${detection.envStrategy || 'unknown'}
- Plan/apply command: infer from IaC tool (terraform plan / cdk diff / pulumi preview)

${RULES}
${ROUTE(outDir, 'Infrastructure changes')}
IMPORTANT: Use the Write tool to save the file at ${outDir}/use-infra-patterns/SKILL.md (create dirs if needed). Do NOT just return the content.`,
    { label: 'generate:use-infra-patterns', phase: 'Generate', model: 'sonnet', effort: 'medium' }
  )
}

log(`Done. Draft skills in ${outDir}/ (review before relying on them). Code: codeprint. Tests: testprint. Infra: infraprint. Missing requirements/specs/contracts/AGENTS.md: contextprint.`)

return {
  outDir,
  detection,
  extractions: validExtractions,
  infraPatternsSkill,
  useInfraPatternsSkill
}
