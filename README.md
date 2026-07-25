# Claude Toolkit

A collection of reusable skills and tools for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## Available Tools

| Tool | Description | Install |
|------|-------------|---------|
| [codeprint](./codeprint/) | Analyze any repo's patterns → generate token-efficient coding patterns skill | `./codeprint/scripts/manage-skills.sh install` |

## What Are Skills?

Skills are markdown instruction files that Claude Code loads on-demand via slash commands. Unlike CLAUDE.md (loaded every message), skills only consume tokens when invoked.

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
