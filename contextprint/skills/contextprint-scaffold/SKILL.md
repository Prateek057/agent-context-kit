---
name: contextprint-scaffold
description: >-
  Creates template files for missing context-layer artifacts (AGENTS.md router, REQUIREMENTS.md,
  architecture.md, ADR, minimal-hybrid spec.md, contracts/rules.yaml, acceptance-test stub,
  CI validate workflow + Makefile target, CHANGELOG.md) without overwriting anything. Use after
  a contextprint-audit when the user asks to scaffold, bootstrap or add templates for the missing
  artifacts, or to migrate an existing docs/ folder to the minimal hybrid format.
---

# contextprint scaffold

Templates only: they contain `<placeholders>` and open questions. Filling them with real
content is the `contextprint-writer` agent's job. Never invent values here.

## Step 1: Decide what to scaffold

Prefer the audit result. If `.contextprint/report.json` does not exist, run the
`contextprint-audit` skill first (or `audit.py --json-out .contextprint/report.json`).

## Step 2: Dry run, then confirm

```bash
python3 "$SKILL_DIR/scripts/scaffold.py" --root . --from-report .contextprint/report.json --feature <feature-name>
```

Show the user the "Would create" list. Ask which to create (they may pick a subset with
`--only agents_md,requirements,spec`). The script never overwrites; existing files are skipped.

## Step 3: Apply

```bash
python3 "$SKILL_DIR/scripts/scaffold.py" --root . --only <ids> --feature <feature-name> --apply
```

Notes:
- `ci` creates `.github/workflows/validate.yml`, a `Makefile` (or `Makefile.contextprint` to merge
  if one exists) and copies the scanner to `tools/contextprint/audit.py` for CI. If the repo uses
  another CI system, adapt the workflow by hand and tell the user.
- `acceptance_tests` creates a Python stub; replace it with the repo's language and runner.
- Upstream documents (REQUIREMENTS.md, ADRs) are created with `Status: Draft — needs approval`.

## Step 4: Verify

Re-run the audit. Scaffolded files show as **PARTIAL – Template not filled in** until the
placeholders are replaced. That is expected; offer the `contextprint-writer` agent next.

## Existing docs/ folder

If the repo already has a large `docs/` folder, do not scaffold over it. Use the four-prompt
migration in [references/migration-playbook.md](references/migration-playbook.md): triage →
convert one file with a traceability proof → independent review in a fresh session → roll-up.
Originals stay untouched; new files go to `docs-hybrid/`.
