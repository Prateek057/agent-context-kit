# Claude Toolkit

A collection of token-efficient, model-aware skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## Core Philosophy

### 1. Token Efficiency First

Every skill in this toolkit is designed to minimize token consumption:
- **On-demand loading** — skills load only when invoked, not every message
- **Reference splitting** — detailed docs in `references/` are read per-phase, not all upfront
- **Compressed output** — bullets + code snippets, never prose
- **Canonical pointers** — "copy from `path/to/file`" instead of re-explaining patterns

### 2. Model-Aware Routing

Not every task needs the most expensive model. Skills in this toolkit specify which model tier is appropriate for each phase:

| Task type | Model tier | Why |
|-----------|-----------|-----|
| File listing, pattern matching, simple lookups | Haiku | Mechanical — no reasoning needed |
| Code reading, classification, extraction | Sonnet | Needs understanding, not deep synthesis |
| Synthesis, generation, complex reasoning | Opus | Quality-critical output |
| Build verification, pass/fail checks | Haiku | Binary result, no reasoning |

**In workflow mode**, model routing happens automatically via `agent()` opts. **In skill mode**, the skill informs the user which model tier is optimal for the current phase, so they can switch if cost-conscious.

### 3. Graceful Budget Awareness

Skills are designed to complete even when token budget is tight:

- **Budget detection** — in workflow mode, check `budget.remaining()` before spawning expensive phases
- **Progressive degradation** — if budget runs low mid-task:
  1. Downshift to cheaper model for remaining phases
  2. Compress output (fewer examples, shorter templates)
  3. Skip optional phases (tooling recommendations, scaffolding)
  4. Always complete the critical output — never leave a half-written skill
- **User transparency** — inform user when degrading: `"Budget low. Switching to Sonnet for remaining phases. Output will be compressed."`

### 4. Inform, Don't Surprise

Skills communicate actively:
- Announce which model tier is being used for each phase
- Report token estimates before expensive operations
- Flag when switching models or compressing output
- Show progress: `[phase 3/9] Extracting patterns (Sonnet)`

## Available Tools

| Tool | Description | Install |
|------|-------------|---------|
| [codeprint](./codeprint/) | Analyze any repo's patterns → generate token-efficient coding patterns skill | `./codeprint/scripts/manage-skills.sh install` |

## Model Tier Reference

For users who want to manually switch models during skill execution:

| Tier | Model | Use for | Approx cost/1M tokens |
|------|-------|---------|----------------------|
| **Haiku** | `claude-haiku-4-5-20251001` | Scanning, listing, simple extraction | $0.25 in / $1.25 out |
| **Sonnet** | `claude-sonnet-5` | Code understanding, pattern recognition | $3 in / $15 out |
| **Opus** | `claude-opus-4-8` | Synthesis, generation, complex reasoning | $15 in / $75 out |

**Rule of thumb:** If a phase could be done by a junior dev with a checklist → Haiku. If it needs a senior dev reading code → Sonnet. If it needs an architect synthesizing → Opus.

## Structure (neatskills convention)

Each tool follows the [neatskills](https://github.com/neatskills) format:

```
tool-name/
├── SKILL.md                ← Main skill (frontmatter + quick reference + flow)
├── SKILL-portable.md       ← Self-contained version (no external deps)
├── .claude-plugin/
│   └── marketplace.json    ← Distribution metadata
├── references/             ← Detailed docs read by AI during execution
├── scripts/                ← Install/utility scripts
├── README.md               ← Human documentation
└── GETTING_STARTED.md      ← Detailed usage guide
```

## Install Any Tool

```bash
# Symlink (auto-updates on pull)
./tool-name/scripts/manage-skills.sh install

# Or copy (standalone)
cp tool-name/SKILL.md ~/.claude/skills/tool-name.md
```

## License

MIT
