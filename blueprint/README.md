# blueprint

Runs the print tools as one job and keeps their output consistent.

1. **Plan**: `scripts/plan.py` (deterministic, no writes) reports which generators apply and what is stale. It also runs the contextprint audit. You pick what to run.
2. **Run**: contextprint documents first if you ask for them, then codeprint, testprint and infraprint, all into one skills dir.
3. **Reconcile**: re-audit. Restated contract values become links, conflicts become open questions, AGENTS.md gets the missing route lines and overlaps between skills are removed.
4. **Report**: `.contextprint/blueprint.md`.

**Refresh mode** re-runs only the tools whose files (code, tests or infra) changed since the commit in their provenance line.

```bash
python3 skills/blueprint/scripts/plan.py --root /path/to/repo          # markdown
python3 skills/blueprint/scripts/plan.py --root /path/to/repo --format json
```

Statuses: `run` (applies, nothing generated), `refresh` (changed since provenance commit), `review` (no commit recorded), `ok`, `skip` (does not apply). Thresholds: code ≥ 5 files, tests ≥ 3, infra ≥ 2.

blueprint needs the other print tools installed next to it: `./install.sh install` from the toolkit root installs all of them.
The output of every tool is a draft. Whether it helps agents on your tasks is only known if you measure it.
