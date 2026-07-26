# Codeprint

**A Claude Code skill that analyzes any repository and generates a token-efficient coding patterns skill.**

One-time analysis → `.claude/skills/patterns.md` + `.claude/skills/use-patterns.md` → token savings every future session.

## Why This Matters

### The Problem

Without explicit conventions, AI coding assistants:
- Generate code that **doesn't match your team's style** — requiring manual rewrites
- Re-discover patterns **every session** — burning tokens on exploration instead of execution
- Miss anti-patterns — producing code that passes review but violates unwritten rules
- Default to popular patterns (e.g., MediatR) when your team uses **custom alternatives**

### The Numbers

| Metric | Without codeprint | With codeprint |
|--------|------------------|----------------|
| Token cost per "scaffold new feature" task | ~15-25k tokens (exploration + generation) | ~5-8k tokens (direct generation) |
| Consistency with team conventions | ~60-70% (guesses from context) | ~95%+ (explicit rules) |
| Rework after AI generation | 3-5 manual corrections per file | 0-1 corrections |
| Onboarding a new AI session | Re-explain patterns each time | `/patterns` — instant context |
| CLAUDE.md token overhead | Loaded every message (~2-5k/msg) | Loaded only when invoked (0 when idle) |

### Why Skills > CLAUDE.md for Patterns

| | CLAUDE.md | Skill (/patterns) |
|-|-----------|-------------------|
| **Loaded** | Every single message | Only when invoked |
| **Token cost** | 2-5k per turn × all turns | 2-5k only on generation turns |
| **100-message session** | 200-500k tokens burned on patterns context | 2-5k total (invoked once or twice) |
| **Stale risk** | Lives in repo root, easily ignored | Regenerable via `/codeprint` |

### What Teams Get Wrong

1. **Putting patterns in CLAUDE.md** — great for 5-line rules, wasteful for 200-line convention docs
2. **Not documenting anti-patterns** — AI tools default to the most popular library, not yours
3. **Explaining patterns in prose** — a canonical file path teaches better than 10 paragraphs
4. **No scaffold references** — AI generates from scratch when a "copy this and adapt" would be faster and more consistent
5. **Ignoring infrastructure** — teams document code patterns but not Terraform/Docker/CI conventions, leading to infra drift

### Who Benefits Most

- **Teams with custom libraries** (custom mediator, custom exceptions, internal packages)
- **Monorepos** with consistent patterns across 5+ services
- **Teams onboarding AI tools** for the first time (patterns prevent bad habits from day one)
- **Projects with strong conventions** that aren't obvious from file structure alone
- **High-velocity teams** where multiple developers use AI coding assistants concurrently

## Install

```bash
# Option 1: Symlink (updates automatically when you pull)
./scripts/manage-skills.sh install

# Option 2: Copy (standalone, no dependency on this repo)
cp SKILL.md ~/.claude/skills/codeprint.md
```

## Usage

### Skill Mode (simple)

```
/codeprint
```
Runs using your session's model. Announces optimal model per phase — switch manually if cost-conscious.

### Workflow Mode (cost-optimized)

```
Run the codeprint workflow
```

Routes each phase to the cheapest capable model automatically:

| Phase | Model | Token cost |
|-------|-------|-----------|
| Detect (topology, languages, subtypes, infra) | Haiku | ~2-3k |
| Extract (sample files, patterns) | Sonnet | ~8-12k |
| Generate (patterns.md + use-patterns.md) | Opus | ~5-8k |
| Recommend (tooling suggestions) | Haiku | ~1-2k |

**Budget-aware:** Checks remaining tokens between phases. Degrades gracefully — compresses output, skips optional phases, never crashes without output.

**Estimated cost:** ~60-70% cheaper than running everything on Opus.

## What It Generates

Codeprint produces **two separate skills** in your repo — intentionally split for token efficiency:

### `/patterns` — The Reference (data)
```
.claude/skills/patterns.md (~300 lines)
```
- What: conventions, templates, anti-patterns, scaffold table
- When to use: checking a convention, reviewing code, onboarding
- Token cost: loaded once when invoked, 0 when idle
- Example: "What's our naming convention for validators?" → `/patterns`

### `/use-patterns` — The Executor (behavior)
```
.claude/skills/use-patterns.md (~100 lines)
```
- What: task execution with checkpoints, human gates, model routing, budget awareness
- When to use: building something new that should follow conventions
- Token cost: loads patterns internally + adds execution logic
- Example: "Add a DeleteModel command handler" → `/use-patterns Add a DeleteModel command handler`

### Why Two Skills?

| | Single merged skill | Split (current) |
|-|--------------------:|----------------:|
| Check a convention | Loads ~400 lines | Loads ~300 lines (`/patterns` only) |
| Execute a task | Loads ~400 lines | Loads ~400 lines (both) |
| 10 convention checks in a session | 4,000 lines loaded total | 3,000 lines loaded total |

Checking conventions is more frequent than executing tasks. Split saves ~25% tokens on the common case. The executor loads patterns internally when needed — you never need to invoke both manually.

## What Codeprint Does

1. Detects topology (monorepo / monolith / microservice)
2. Identifies languages and frameworks
3. Scans infrastructure & DevOps patterns
4. Samples representative files per subtype
5. Extracts conventions, cross-cutting patterns, anti-patterns
6. Generates `patterns.md` — conventions reference (~300 lines max)
7. Generates `use-patterns.md` — task executor with checkpoints
8. Recommends additional tooling (asks before installing)

## Project Structure

```
codeprint/
├── SKILL.md                    ← Main skill file (install this)
├── SKILL-portable.md           ← Self-contained version (no references/)
├── .claude-plugin/
│   └── marketplace.json        ← Plugin distribution metadata
├── workflows/
│   └── codeprint.js            ← Workflow script (model-routed, budget-aware)
├── references/                 ← Detailed phase instructions (read by AI)
│   ├── topology.md
│   ├── languages.md
│   ├── subtypes.md
│   ├── infrastructure.md
│   ├── extraction.md
│   ├── cross-cutting.md
│   ├── anti-patterns.md
│   ├── output-format.md
│   ├── use-patterns-template.md
│   └── tooling-recommendations.md
├── scripts/
│   └── manage-skills.sh        ← Install/uninstall helper
├── README.md                   ← You are here
└── GETTING_STARTED.md          ← Detailed usage guide
```

## How It Works

`SKILL.md` is the entry point. It contains:
- YAML frontmatter (name, description, trigger)
- Quick reference table linking to each phase's reference doc
- Execution flow summary
- Common mistakes table

Each `references/*.md` is read by Claude **during execution** of that phase — not loaded upfront. This keeps token usage minimal.

## Works With

- **Any language**: C#, TypeScript, Go, Rust, Java, Python, Ruby, Elixir
- **Any topology**: Monorepos, monoliths, standalone services
- **Any framework**: Detects and adapts to framework conventions
- **Any infra**: Terraform, CDK, Docker, GitHub Actions, ECS, K8s, and more

## License

MIT
