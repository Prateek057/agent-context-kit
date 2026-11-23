// codeprint workflow (optional accelerator for Claude Code's Workflow tool).
// Same phases and output rules as skills/codeprint/SKILL.md; adds per-phase model tiers and budget checks.
export const meta = {
  name: 'codeprint',
  version: '2.0.0',
  description: 'Application-code conventions → draft patterns + use-patterns skills (tests: testprint, infra: infraprint)',
  phases: [
    { title: 'Detect', detail: 'Topology, languages, code subtypes, context docs, output location' },
    { title: 'Extract', detail: 'Sample files, count conventions' },
    { title: 'Generate', detail: 'Write patterns and use-patterns skills, add route line' },
  ],
}

const RULES = `Output rules (from codeprint's references/generated-output.md):
- Frontmatter: only name + description. First line after it: <!-- generated-by: codeprint 2.0.0 | commit: <sha> | date: <YYYY-MM-DD> | sampled: <n> files | status: draft, review before relying on it -->
- Every convention ends with (observed n/m) or (inferred). Anti-patterns only with counts, e.g. (observed A 8/8, B 0/8).
- Conventions, not rules: never restate values (limits, timeouts, error codes, versions) that live in requirements, specs, contracts or ADRs; link the file. Values only in code: link the code file. Code-vs-spec contradictions go under "## Open questions".
- Plain concise language: bullets and short skeletons are fine; keep the reason for non-obvious rules; no telegraphic fragments or compression.
- About 200 lines max. Prefer one canonical file path over long explanations.`

// Phase 1: detection (code only)
phase('Detect')
log('[phase 1-3/6] Detecting topology, languages, code subtypes, context docs')

const detection = await agent(
  `Analyze this repository for APPLICATION CODE conventions only.
1. Topology: monorepo (several packages/services with own build files), monolith (one deployable, layered dirs) or single service.
2. Languages (with major version) and frameworks, per module.
3. Code subtypes: handlers, controllers, endpoints, services, repositories, domain models, workers/consumers, middleware, validators, mappers, DTOs, events/commands/queries, adapters, config/startup. EXCLUDE tests and infrastructure (IaC, Docker, CI/CD). Give file counts and 2-3 sample paths with real logic.
4. Context docs present: AGENTS.md, CLAUDE.md, GEMINI.md, REQUIREMENTS.md, specs/, contracts/, *.rules.yaml, openapi.*, *.schema.json, decisions/, adr/.
5. Output dir: ".claude/skills" if .claude/ exists or this is Claude Code (default here), ".gemini/skills" if only .gemini/ exists, else ".agents/skills".
6. Commit: output of git rev-parse --short HEAD, or "none".
Report structured findings. List counts and paths, not file contents.`,
  { label: 'detect:structure', phase: 'Detect', model: 'haiku', effort: 'low', schema: {
    type: 'object',
    properties: {
      topology: { type: 'string', enum: ['monorepo', 'monolith', 'single service'] },
      languages: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, version: { type: 'string' },
        frameworks: { type: 'array', items: { type: 'string' } } }, required: ['name'] } },
      subtypes: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, location: { type: 'string' }, fileCount: { type: 'number' },
        sampleFiles: { type: 'array', items: { type: 'string' } } }, required: ['name', 'location', 'sampleFiles'] } },
      contextDocs: { type: 'array', items: { type: 'string' } },
      outputDir: { type: 'string' },
      commit: { type: 'string' },
      monorepoStructure: { type: 'string' },
    },
    required: ['topology', 'languages', 'subtypes', 'outputDir'],
  } }
)

if (!detection) {
  log('Detection failed. Aborting without writing files.')
  return { error: 'Detection phase failed' }
}

const outDir = detection.outputDir || '.claude/skills'
log(`Detected: ${detection.topology} | ${detection.languages.map(l => l.name).join(', ')} | ${detection.subtypes.length} subtypes | output: ${outDir}`)

// Phase 4: extraction with counts
phase('Extract')
const topSubtypes = [...detection.subtypes].sort((a, b) => (b.fileCount || 0) - (a.fileCount || 0)).slice(0, 8)
log(`[phase 4/6] Extracting ${topSubtypes.length} subtypes (of ${detection.subtypes.length})`)

const extractions = await pipeline(
  topSubtypes,
  s => agent(
    `Extract conventions for the "${s.name}" subtype (${s.fileCount || '?'} files under ${s.location}).
Samples: ${s.sampleFiles.slice(0, 3).join(', ')}
1. Read enough of each sample to see imports, constructor and one complete method (usually under 150 lines).
2. List candidate conventions: naming, structure/DI, signatures and return types, error handling, validation, logging, wiring/registration.
3. COUNT each candidate across all files of the subtype with grep/glob (not by reading more files). Record n/m.
4. Keep conventions seen in most files. Pick one canonical file.
5. Do not copy concrete values (limits, codes, timeouts); note the file that defines them. Note contradictions with specs/contracts as open questions.`,
    { label: `extract:${s.name}`, phase: 'Extract', model: 'sonnet', effort: 'low', schema: {
      type: 'object',
      properties: {
        subtype: { type: 'string' }, location: { type: 'string' }, naming: { type: 'string' },
        skeleton: { type: 'string' }, canonicalFile: { type: 'string' },
        conventions: { type: 'array', items: { type: 'object', properties: {
          text: { type: 'string' }, observed: { type: 'number' }, total: { type: 'number' }, inferred: { type: 'boolean' } },
          required: ['text'] } },
        wiring: { type: 'string' },
        openQuestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['subtype', 'location', 'naming', 'canonicalFile', 'conventions'],
    } }
  )
)
const valid = extractions.filter(Boolean)
log(`Extracted ${valid.length}/${topSubtypes.length} subtypes`)

// Phase 5-6: generation
phase('Generate')
const data = JSON.stringify({ detection, extractions: valid })
const lowBudget = budget.total && budget.remaining() < 20000
if (lowBudget) log(`Budget low (${Math.round(budget.remaining() / 1000)}k). Writing the patterns skill only; run codeprint again for use-patterns.`)

log('[phase 5/6] Writing patterns skill')
const patternsSkill = await agent(
  `Write ${outDir}/patterns/SKILL.md (create dirs) for this repository from this data: ${data}
Sections: Overview (topology, languages, grouping, where rules/values live: link context docs), one section per subtype (location, naming, skeleton, "Copy from", labelled conventions, wiring), Shared conventions, Avoid (max 7, counted only), "New file? Copy from" table, Open questions.
No test or infrastructure sections.
${RULES}
Use the Write tool to save the file. Do not just return the content.`,
  { label: 'generate:patterns', phase: 'Generate', model: 'opus', effort: 'medium' }
)

let usePatternsSkill = null
if (!lowBudget) {
  log('[phase 6/6] Writing use-patterns skill and route line')
  usePatternsSkill = await agent(
    `1. Write ${outDir}/use-patterns/SKILL.md (create dirs): a task executor for this repo.
   - Frontmatter name: use-patterns; description: carries out a coding task following the patterns skill.
   - First instruction: if AGENTS.md / CLAUDE.md / GEMINI.md defines a workflow or validate command, follow it; the checkpoints apply only where it is silent.
   - Load only the patterns sections for the subtypes the task touches, plus the "copy from" files; read rules/values from the linked contract or spec, never from memory.
   - Checkpoints: Plan, Implement, Wire (${detection.topology}; registration step inferred from: ${JSON.stringify(valid.map(v => v.wiring).filter(Boolean))}), Verify (real build/test command; "unknown, ask the user" if not found).
   - Ask before: choosing between valid patterns, changing shared libraries or infra, deleting/renaming code, business rules the task does not state.
   ${RULES}
2. If AGENTS.md exists at the repo root, add one line per generated skill under "## Conventions" (create the section at the end if missing), e.g. "- Writing application code: follow the patterns skill (${outDir}/patterns/SKILL.md)". Change nothing else. If AGENTS.md does not exist, do not create it.
Use the Write/Edit tools.`,
    { label: 'generate:use-patterns', phase: 'Generate', model: 'sonnet', effort: 'medium' }
  )
}

log(`Done. Draft skills in ${outDir}/ (review before relying on them). Tests: testprint. Infra: infraprint. Missing requirements/specs/contracts/AGENTS.md: contextprint.`)
return { detection, extractions: valid, patternsSkill, usePatternsSkill, outDir }
