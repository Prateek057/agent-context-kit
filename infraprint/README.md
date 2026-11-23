# infraprint

Analyzes a repository's **infrastructure** (IaC, Docker, CI/CD, deployment, environments) and generates two draft
skills for any agent that reads `SKILL.md`:

| Generated skill | Role |
|---|---|
| `infra-patterns` | Infra conventions per type, environment strategy, pitfalls (env divergence, shared modules, renames that replace resources, secrets, CI gates), canonical files |
| `use-infra-patterns` | Infra-change executor: plan → implement → validate (never apply), deferring to `AGENTS.md` |

Same output promises as [codeprint](../codeprint/README.md): evidence labels, links instead of copied values
(versions, sizes, limits), provenance line, plain language, one route line in `AGENTS.md`.

The output is a **draft**: review it before relying on it.

- Install: `./install.sh --target <host> --tools infraprint` (toolkit root).
- Use: "Run infraprint on this repo".
- Optional in Claude Code: `workflows/infraprint.js` (same phases, per-phase model tiers).

Layout: `skills/infraprint/SKILL.md` (+ `references/generated-output.md`), `workflows/infraprint.js`, manifests.
