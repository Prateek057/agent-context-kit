#!/usr/bin/env python3
"""contextprint scaffold: create template files for missing context-layer artifacts.

Never overwrites an existing file. Dry run by default; pass --apply to write.

Usage:
  scaffold.py [--root PATH] [--only ID[,ID...]] [--from-report audit.json]
              [--feature NAME] [--apply]

IDs: agents_md, requirements, architecture, adr, spec, contracts,
     acceptance_tests, ci, changelog
Without --only/--from-report, every artifact whose target does not exist is proposed.
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE.parent / "templates"
AUDIT = HERE.parent.parent / "contextprint-audit" / "scripts" / "audit.py"


def plan_for(feature):
    """artifact id -> list of (source path, target relative path)."""
    return {
        "agents_md": [(TEMPLATES / "AGENTS.md", "AGENTS.md")],
        "requirements": [(TEMPLATES / "REQUIREMENTS.md", "REQUIREMENTS.md")],
        "architecture": [(TEMPLATES / "architecture.md", "architecture.md")],
        "adr": [(TEMPLATES / "ADR.md", "decisions/ADR-001-record-architecture-decisions.md")],
        "spec": [(TEMPLATES / "spec.md", f"specs/{feature}/spec.md")],
        "contracts": [(TEMPLATES / "rules.yaml", "contracts/rules.yaml")],
        "acceptance_tests": [(TEMPLATES / "acceptance" / "README.md", "tests/acceptance/README.md"),
                             (TEMPLATES / "acceptance" / "test_req_001_example.py",
                              "tests/acceptance/test_req_001_example.py")],
        "ci": [(TEMPLATES / "ci" / "validate.yml", ".github/workflows/validate.yml"),
               (TEMPLATES / "ci" / "Makefile.contextprint", "Makefile.contextprint"),
               (AUDIT, "tools/contextprint/audit.py")],
        "changelog": [(TEMPLATES / "CHANGELOG.md", "CHANGELOG.md")],
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".")
    ap.add_argument("--only", help="comma-separated artifact IDs")
    ap.add_argument("--from-report", help="audit JSON (audit.py --json-out); scaffolds MISSING artifacts")
    ap.add_argument("--feature", default="example-feature", help="feature name for specs/<feature>/spec.md")
    ap.add_argument("--apply", action="store_true", help="write files (default: dry run)")
    a = ap.parse_args(argv)

    root = Path(a.root).resolve()
    feature = re.sub(r"[^a-z0-9-]+", "-", a.feature.lower()).strip("-") or "example-feature"
    plan = plan_for(feature)

    if a.only:
        wanted = [w.strip() for w in a.only.split(",") if w.strip()]
        unknown = [w for w in wanted if w not in plan]
        if unknown:
            ap.error(f"unknown artifact id(s): {', '.join(unknown)}; choose from {', '.join(plan)}")
    elif a.from_report:
        rep = json.loads(Path(a.from_report).read_text(encoding="utf-8"))
        wanted = [k for k, s in rep["statuses"].items() if s["status"] == "MISSING" and k in plan]
    else:
        wanted = list(plan)

    created, skipped = [], []
    for art in wanted:
        for src, rel in plan[art]:
            dst = root / rel
            if dst.exists():
                skipped.append((art, rel, "exists"))
                continue
            if rel == "Makefile.contextprint" and not (root / "Makefile").exists():
                rel, dst = "Makefile", root / "Makefile"
            created.append((art, rel))
            if a.apply:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dst)

    verb = "Created" if a.apply else "Would create"
    for art, rel in created:
        print(f"{verb}: {rel}  [{art}]")
    for art, rel, why in skipped:
        print(f"Skipped: {rel}  [{art}] ({why}; never overwritten)")
    if not created:
        print("Nothing to scaffold.")
    elif not a.apply:
        print("\nDry run. Re-run with --apply to write these files.")
    else:
        print("\nTemplates contain <placeholders> and open questions. Fill them from the repo's real sources"
              " (or hand off to the contextprint-writer agent); never invent values.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
