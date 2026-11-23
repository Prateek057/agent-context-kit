---
name: infraprint
description: Analyzes a repository's infrastructure (IaC, Docker, CI/CD, deployment, environments) and generates two draft skills, an infra-conventions reference (infra-patterns) and an infra-change executor (use-infra-patterns), with canonical files, environment differences, pitfalls and evidence labels. Use when an AI agent will change infrastructure in a repo, or when infra conventions changed.
---

# infraprint: infrastructure conventions

Generates `infra-patterns/SKILL.md` and `use-infra-patterns/SKILL.md` for the current repository. Works in any agent
that reads `SKILL.md` files. Application code → `codeprint`. Tests → `testprint`.
Requirements, specs, contracts, `AGENTS.md` → `contextprint`.

## When to use / skip

- Use: an agent will change infrastructure here; new modules or pipelines were added; the provenance line of an
  existing infra-patterns skill points to a commit after which infra paths changed.
- Skip: a current infra-patterns skill exists; the repo has no infrastructure code (say so and stop).

## Before you start

Read `references/generated-output.md` (where to write, provenance line, evidence labels, conventions vs rules,
style, routing, final message). Every phase follows it.

## Phases

Announce each phase as `[phase N/5] <name>`.

| # | Phase | What |
|---|---|---|
| 1 | Detect | IaC tool (`*.tf`, `cdk.json`, `Pulumi.yaml`, `*.bicep`), module structure, Dockerfiles, CI/CD (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`), deployment (K8s manifests, task definitions, serverless configs), environment strategy, secrets approach, context docs, output location, commit |
| 2 | Extract | Per infra type (max 5), 2–3 samples each: naming, module/resource structure, variables, tagging, env overrides. Count each convention with grep: `(observed n/m)` |
| 3 | Pitfalls | What breaks a first attempt (below) |
| 4 | Write `infra-patterns/SKILL.md` | Overview · per-type conventions with one canonical file and a short skeleton · environment strategy · pitfalls · Avoid (max 5, counted only) · "New … → copy from" table · Open questions |
| 5 | Write `use-infra-patterns/SKILL.md`, add route line, report | Defer to `AGENTS.md`; checkpoints Plan → Implement → Validate (real plan/lint/validate command, never apply); ask before shared modules, environment config, pipelines, secrets |

### Pitfalls (phase 3)

1. **Environment divergence:** where dev/staging/prod differ (tfvars, overlays, branches) and what must change in each.
2. **Shared vs one-off modules:** changes to shared modules affect every consumer.
3. **State and naming:** renames that force resource replacement; required tags or naming schemes.
4. **Secrets:** where they come from; never inline.
5. **CI gates:** the checks a change must pass (validate target, plan job, policy checks).

## Values

Versions, sizes, limits, thresholds and quotas stay in their files (tfvars, manifests, contracts). The skill links to
them and never copies them.

## Optional: workflow mode (Claude Code)

If the Workflow tool is available, `workflows/infraprint.js` runs the same phases with per-phase model tiers.

## Common mistakes

| Mistake | Do this instead |
|---|---|
| Reading every `.tf` / manifest | 2–3 samples per type, then grep to count |
| Missing environment differences | Detect and list per-environment overrides |
| Treating all modules alike | Separate reusable modules from one-off stacks |
| Copying versions or sizes into the skill | Link the file that defines them |
| Executor that runs apply/deploy | Plan/validate only; apply is a human decision |
| Telegraphic, compressed bullets | Short plain sentences; keep the reason for non-obvious rules |
