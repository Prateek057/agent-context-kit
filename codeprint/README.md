# codeprint

Analyzes a repository's **application code** and generates two draft skills for any agent that reads `SKILL.md`:

| Generated skill | Role | Use when |
|---|---|---|
| `patterns` | Conventions reference: naming, structure, errors, logging, wiring per code type, with canonical files to copy from | writing, changing or reviewing application code |
| `use-patterns` | Task executor: plan → implement → wire → verify, deferring to `AGENTS.md` | building something new that should follow the conventions |

Tests → [testprint](../testprint/). Infrastructure → [infraprint](../infraprint/). Requirements, specs, contracts,
`AGENTS.md` → [contextprint](../contextprint/).

## What the output promises

- **Evidence labels.** Each convention ends with `(observed n/m)` or `(inferred)`, so a reviewer sees what was counted and what was guessed.
- **Conventions, not rules.** Values such as limits, error codes and timeouts are linked to the contract, spec or code file that holds them, never copied. Contradictions between code and specs become open questions.
- **Provenance.** A first-line comment records tool version, commit and sample size, so stale output can be detected.
- **Plain language.** Concise, but no telegraphic compression. Published research on generated instruction files found they can cost more tokens and lower success, so the output stays small, readable and reviewable.
- **One router.** If `AGENTS.md` exists, codeprint adds one route line under `## Conventions` and changes nothing else.

The output is a **draft**: review it before relying on it.

## Does it save tokens?

Not known yet. Earlier versions of this README listed savings and consistency numbers that were never measured; they
were removed. The benchmark in the research project (`bench/`) compares "no context", "hand-written conventions" and
"codeprint output" on the same tasks with hidden tests. Claims will be added only from those results.

## Install

From the toolkit root: `./install.sh --target <claude|antigravity|gemini|codex|all|auto> --tools codeprint`.

## Use

```text
"Run codeprint on this repo"
"Refresh the patterns skill"
```

Optional in Claude Code: if the Workflow tool is available, `workflows/codeprint.js` runs the same phases with
per-phase model tiers and budget checks.

## Layout

```
codeprint/
├── skills/codeprint/
│   ├── SKILL.md                      entry point (portable)
│   └── references/                   read per phase, not upfront
│       ├── generated-output.md       shared output rules (copy of _shared/)
│       ├── topology.md  languages.md  subtypes.md  extraction.md
│       ├── output-format.md          patterns skill template
│       └── use-patterns-template.md  executor template + routing + report
├── workflows/codeprint.js            optional Claude Code workflow
├── plugin.json  gemini-extension.json  .claude-plugin/
└── README.md
```

## License

MIT
