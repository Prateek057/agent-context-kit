# testprint

Analyzes a repository's **tests** and generates two draft skills for any agent that reads `SKILL.md`:

| Generated skill | Role |
|---|---|
| `test-patterns` | Test conventions per subtype (e.g. `unit:service`, `unit:validator`, `integration:api`), test-data factories, pitfalls that break first attempts, canonical files to copy from |
| `use-test-patterns` | Test-writing executor: "read this first" per subtype, plan → write → verify, deferring to `AGENTS.md` |

Same output promises as [codeprint](../codeprint/README.md): evidence labels, links instead of copied values,
provenance line, plain language, one route line in `AGENTS.md`. If the repo uses requirement IDs, the skill also
records how tests cite them, which matches what [contextprint](../contextprint/) checks.

The output is a **draft**: review it before relying on it.

- Install: `./install.sh --target <host> --tools testprint` (toolkit root).
- Use: "Run testprint on this repo".
- Optional in Claude Code: `workflows/testprint.js` (same phases, per-phase model tiers).

Layout: `skills/testprint/SKILL.md` (+ `references/generated-output.md`), `workflows/testprint.js`, manifests.
