---
name: infraprint
description: Analyze repository infrastructure patterns (IaC, Docker, CI/CD, deployment) and generate infra patterns skill. Self-contained version.
---

# Infraprint — Infrastructure Pattern Extractor (Portable)

Generate `.claude/skills/infra-patterns/SKILL.md` and `.claude/skills/use-infra-patterns/SKILL.md` for the current repository.

**Scope:** Infrastructure only — IaC (Terraform/CDK/Pulumi), Docker, CI/CD pipelines, deployment configs, environment strategy. NOT application code, NOT tests.

## Execution Steps

### Phase 1: Infrastructure Detection

Scan for infra patterns:
- IaC tool: `*.tf` → Terraform | `cdk.json` → CDK | `Pulumi.yaml` → Pulumi | `*.bicep` → Bicep
- IaC structure: flat vs modular, mono vs per-service, shared modules
- Docker: Dockerfile patterns (multi-stage, base images, build args)
- CI/CD: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `buildspec.yml`
- Deployment: ECS task defs, K8s manifests, Lambda configs, serverless.yml
- Environment strategy: how dev/staging/prod differ (tfvars, overlays, branches)
- Secrets management: Vault, SSM, Secrets Manager, sealed secrets

ONLY look at infra-related files. Ignore application code and tests.

### Phase 2: Pattern Extraction

Per infra type found (max 5 types), read FIRST 60 lines of 2 sample files. Extract:
1. File/dir naming convention
2. Module/resource structure pattern
3. Variable/parameter conventions
4. Tagging/labeling strategy
5. Key rules (3 bullets max)
6. Single canonical file path

Types to check: IaC modules, Docker, CI/CD workflows, deployment configs, environment configs.

### Phase 3: Generate infra-patterns/SKILL.md

Write to `.claude/skills/infra-patterns/SKILL.md` (create dirs if needed) with:
- Overview (IaC tool, deployment target, CI/CD platform, env strategy)
- Per-type patterns (structure + naming + canonical + rules)
- Environment strategy (how envs differ, what's shared)
- Anti-patterns (max 5: e.g., "Don't hardcode account IDs", "Don't skip tagging")
- Infra scaffold reference

Max 200 lines. No prose — bullets + code snippets only.

### Phase 4: Generate use-infra-patterns/SKILL.md

Write to `.claude/skills/use-infra-patterns/SKILL.md` (create dirs if needed) — infra task executor with:
- Terse communication
- 3 checkpoints (Plan → Implement → Validate)
- Complexity tier hints per checkpoint
- Human gates before: modifying shared modules, changing env configs, touching CI/CD
- Token optimization rules
- Adapt plan/apply commands to detected IaC tool

## Rules

- Sample 2 files per infra type — don't read everything
- Read first 60 lines only
- No prose in generated output — bullets + code snippets
- Max 200 lines for infra-patterns.md
- Prefer canonical file paths over explaining
- For code patterns → tell user to run `/codeprint`
- For test patterns → tell user to run `/testprint`
