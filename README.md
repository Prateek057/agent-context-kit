# Agent Context Kit

> [!NOTE]
> This repository was previously named **claude-toolkit**. It was renamed because the skills are no longer tied to one host: they run on Claude Code, Antigravity, Gemini CLI and Codex. GitHub redirects the old URL. To point an existing clone at the new name, run `git remote set-url origin git@github.com:Prateek057/agent-context-kit.git`. Then re-run `./install.sh install` from the new location, because the installed skills are symlinks to the old path.

Skills that help AI coding agents work in a repository. They run on any agent host that reads `SKILL.md` files (Claude Code, Antigravity, Gemini CLI, Codex).

## Tools

| Tool | What it does | Writes |
|------|--------------|--------|
| [blueprint](./blueprint/) | Orchestrator. Plans which tools apply, runs the contextprint audit and then the generators, reconciles the output (links instead of copied values, AGENTS.md routes, no overlap) and in refresh mode re-runs only the stale ones. | `.contextprint/blueprint.md` |
| [contextprint](./contextprint/) | Audits a repo's context layer: AGENTS.md router, requirements, architecture and ADRs, specs, contracts, acceptance tests, CI. Produces a report, templates and a writer agent for the missing docs. It also checks generated convention skills for conflicts. | `.contextprint/report.*` and docs you approve |
| [codeprint](./codeprint/) | Samples the code and writes a draft *coding conventions* skill with evidence counts. | `<skills dir>/patterns/`, `use-patterns/` |
| [testprint](./testprint/) | Samples the tests and writes a draft *testing conventions* skill. It checks traceability to requirement IDs. | `<skills dir>/test-patterns/`, `use-test-patterns/` |
| [infraprint](./infraprint/) | Samples the infrastructure and deploy code and writes a draft *infra conventions* skill. It never applies changes. | `<skills dir>/infra-patterns/`, `use-infra-patterns/` |

The skills dir is `.claude/skills/` on Claude Code, `.gemini/skills/` on Gemini CLI and `.agents/skills/` everywhere else.

## How they fit together

- **Requirements, architecture, ADRs, specs and contracts** hold the decisions and the exact values. contextprint covers them.
- **Conventions** (the `*print` output) describe how the code is written today. They link to contracts and never copy their values.
- **AGENTS.md** routes to both. A `*print` tool adds one line under `## Conventions` if AGENTS.md exists. It never creates the file.

Every generated file follows [`_shared/generated-output.md`](./_shared/generated-output.md):
- a provenance line (tool, version, commit, date, status: draft);
- `(observed n/m)` or `(inferred)` labels on each rule;
- plain sentences;
- no restated contract values;
- no token-saving claims.

> [!NOTE]
> AI-written context files are not automatically helpful. Published work found they can raise cost and lower task success. Treat generated output as a draft, review it, and measure it on your own tasks. The benchmark in the research project does this.

## Install

```bash
./install.sh status                       # what is installed where
./install.sh install                      # auto-detect hosts, link every tool
./install.sh install --target claude      # one host: claude | antigravity | gemini | codex | all
./install.sh install --tools codeprint    # selected tools only
./install.sh install --force              # replace existing copies (backed up to ~/.print-toolkit-backups)
./install.sh install --dry-run            # show what would happen
./install.sh uninstall
```

The installer creates symlinks, so a `git pull` updates every host. Restart the host app after you install.

| Host | Location |
|------|----------|
| Claude Code | `~/.claude/skills/<skill>`, `~/.claude/agents/<agent>.md` |
| Antigravity | `~/.gemini/config/plugins/<tool>` |
| Gemini CLI | `~/.gemini/skills/<skill>` |
| Codex | `~/.codex/skills/<skill>` |

## Layout

```
_shared/generated-output.md     rules for every generated file (copied into each tool's references/)
install.sh                      one installer for all tools and hosts
<tool>/
├── skills/<skill>/SKILL.md     portable skill (frontmatter: name, description only)
│   └── references/             detail read per phase
├── agents/                     optional subagents
├── workflows/                  optional Claude Code workflow scripts
├── plugin.json                 Antigravity manifest
├── gemini-extension.json       Gemini CLI manifest
├── .claude-plugin/             Claude Code manifests
└── README.md
```

New tools are picked up automatically when they follow `*/skills/*/SKILL.md`.

## Tests

```bash
python3 tests/run_tests.py               # toolkit consistency checks
python3 contextprint/tests/run_tests.py  # contextprint audit tests
```

## License

MIT
