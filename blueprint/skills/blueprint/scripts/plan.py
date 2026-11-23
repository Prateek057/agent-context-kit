#!/usr/bin/env python3
"""blueprint plan: decide which *print tools to run, refresh or skip in a repository.

Deterministic, standard library only. It does not write anything.

  plan.py [--root PATH] [--format md|json]

For each generator (codeprint, testprint, infraprint) it reports:
  applies   the repo has enough files of that kind (code >= 5, tests >= 3, infra >= 2)
  skills    generated skills already present (.claude/.agents/.gemini skills dirs), with provenance
  status    run | refresh | review | ok | skip
            run      applies, nothing generated yet
            refresh  files of that kind changed since the provenance commit (or the commit is unknown to git)
            review   generated without a commit (commit: none), staleness cannot be checked
            ok       generated and nothing of that kind changed since
            skip     does not apply and nothing generated
"""
import argparse
import fnmatch
import json
import os
import re
import subprocess
import sys
from pathlib import Path

VERSION = "1.0.0"
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "env", "__pycache__", "dist", "build", "target",
             ".next", ".nuxt", ".idea", ".vscode", "vendor", ".tox", ".mypy_cache", ".pytest_cache",
             "coverage", ".gradle", "out", "bin", "obj", ".terraform", ".contextprint"}
KEEP_DOT = {".github", ".gitlab", ".circleci", ".buildkite", ".claude", ".agents", ".gemini"}
SKILL_ROOTS = (".claude/skills", ".agents/skills", ".gemini/skills")
CODE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".kt", ".rb", ".rs", ".cs", ".php",
            ".scala", ".swift", ".vue", ".svelte", ".ex", ".exs", ".dart", ".c", ".cpp", ".h"}
INFRA_GLOBS = ["dockerfile", "dockerfile.*", "*.dockerfile", "docker-compose*.y*ml", "compose.y*ml", "*.tf",
               "*.tfvars", "*.hcl", "chart.yaml", "values*.yaml", "kustomization.y*ml", "jenkinsfile",
               ".gitlab-ci.yml", "serverless.y*ml", "pulumi*.yaml", "cdk.json", "*.bicep", "skaffold.y*ml",
               "azure-pipelines.yml", "bitbucket-pipelines.yml", "fly.toml", "render.yaml", "app.yaml",
               "procfile", "netlify.toml", "vercel.json"]
INFRA_DIRS = {"k8s", "kubernetes", "helm", "charts", "terraform", "infra", "infrastructure", "deploy",
              "deployment", "ansible", "cloudformation", "cdk", "pulumi", ".github", ".circleci", ".buildkite"}
TEST_DIRS = {"test", "tests", "__tests__", "spec", "e2e", "acceptance", "integration"}
GENERATORS = {
    "codeprint": {"domain": "code", "names": ("patterns", "use-patterns"), "min": 5},
    "testprint": {"domain": "tests", "names": ("test-patterns", "use-test-patterns"), "min": 3},
    "infraprint": {"domain": "infra", "names": ("infra-patterns", "use-infra-patterns"), "min": 2},
}
PROVENANCE_RE = re.compile(r"(?m)^<!--\s*generated-by:\s*([\w-]+)\s+([\w.]+)(.*?)-->")


def walk(root):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and (not d.startswith(".") or d in KEEP_DOT))
        for name in sorted(filenames):
            out.append(Path(dirpath, name).relative_to(root).as_posix())
    return out


def domain(rel):
    """code | tests | infra | None (docs, config, generated skills)."""
    if rel.startswith(SKILL_ROOTS) or rel.startswith(".claude/"):
        return None
    parts = [p.lower() for p in rel.split("/")]
    b, dirs = parts[-1], parts[:-1]
    e = b[b.rfind("."):] if "." in b else ""
    if (any(fnmatch.fnmatch(b, g) for g in INFRA_GLOBS)
            or (e in (".yml", ".yaml", ".json", ".sh", ".toml") and any(d in INFRA_DIRS for d in dirs))):
        return "infra"
    if e not in CODE_EXT:
        return None
    if (b.startswith("test_") or "_test." in b or ".test." in b or ".spec." in b or b.endswith("test.java")
            or b.endswith("tests.cs") or b == "conftest.py" or any(d in TEST_DIRS for d in dirs)):
        return "tests"
    if any(d in INFRA_DIRS for d in dirs):
        return "infra"
    return "code"


def git(root, *args):
    try:
        r = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout if r.returncode == 0 else None


def provenance(path):
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    body = re.sub(r"\A---\n.*?\n---\n", "", text, count=1, flags=re.S)
    m = PROVENANCE_RE.search("\n".join(body.splitlines()[:20]))
    if not m:
        return None
    c = re.search(r"commit:\s*([0-9a-f]{6,40}|none)", m.group(3), re.I)
    return {"tool": m.group(1), "version": m.group(2), "commit": c.group(1) if c else None}


def plan(root):
    files = walk(root)
    counts = {"code": 0, "tests": 0, "infra": 0}
    for f in files:
        d = domain(f)
        if d:
            counts[d] += 1
    agents = root / "AGENTS.md"
    agents_text = agents.read_text(encoding="utf-8", errors="replace") if agents.is_file() else ""
    head = (git(root, "rev-parse", "--short", "HEAD") or "").strip() or None

    skills = []
    for sr in SKILL_ROOTS:
        for skill_md in sorted((root / sr).glob("*/SKILL.md")):
            name = skill_md.parent.name
            prov = provenance(skill_md)
            tool = prov["tool"] if prov and prov["tool"] in GENERATORS else next(
                (t for t, g in GENERATORS.items() if name in g["names"]), None)
            if tool:
                skills.append({"tool": tool, "name": name, "path": skill_md.relative_to(root).as_posix(),
                               "provenance": prov, "routed": bool(agents_text) and name in agents_text})

    tools, warnings = {}, []
    for tool, g in GENERATORS.items():
        mine = [s for s in skills if s["tool"] == tool]
        applies = counts[g["domain"]] >= g["min"]
        locations = {s["path"].rsplit("/", 2)[0] for s in mine}
        if len(locations) > 1:
            warnings.append(f"{tool}: output in several skills dirs ({', '.join(sorted(locations))}); keep one.")
        changed, status = [], None
        if not mine:
            status = "run" if applies else "skip"
        else:
            commits = {s["provenance"]["commit"] for s in mine if s["provenance"] and s["provenance"]["commit"]}
            if not commits or commits == {"none"}:
                status = "review"
            else:
                for c in sorted(commits - {"none"}):
                    out = git(root, "diff", "--name-only", f"{c}..HEAD")
                    if out is None:
                        status = "refresh"
                        warnings.append(f"{tool}: provenance commit {c} not found in git history.")
                        continue
                    changed += [f for f in out.split() if domain(f) == g["domain"]]
                changed = sorted(set(changed))
                status = status or ("refresh" if changed else "ok")
        tools[tool] = {"applies": applies, "files": counts[g["domain"]], "status": status,
                       "skills": mine, "changed_since": changed[:50]}
        for s in mine:
            if agents_text and not s["routed"]:
                warnings.append(f"{s['path']}: not routed from AGENTS.md.")

    return {"tool": "blueprint-plan", "version": VERSION, "root": str(root), "head": head,
            "agents_md": bool(agents_text), "counts": counts, "tools": tools, "warnings": warnings}


def render_md(p):
    out = ["# blueprint plan", "",
           f"Repository: `{p['root']}` · HEAD: `{p['head'] or 'not a git repo'}` · AGENTS.md: "
           f"{'yes' if p['agents_md'] else 'no'}", "",
           f"Files by kind: code {p['counts']['code']}, tests {p['counts']['tests']}, infra {p['counts']['infra']}", "",
           "| Tool | Applies | Status | Existing skills | Changed since |", "|---|---|---|---|---|"]
    for tool, t in p["tools"].items():
        sk = ", ".join(f"`{s['path']}`" for s in t["skills"]) or "—"
        ch = f"{len(t['changed_since'])} file(s)" if t["changed_since"] else "—"
        out.append(f"| {tool} | {'yes' if t['applies'] else 'no'} ({t['files']}) | **{t['status']}** | {sk} | {ch} |")
    if p["warnings"]:
        out += ["", "## Warnings", ""] + [f"- {w}" for w in p["warnings"]]
    return "\n".join(out) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Plan which *print tools to run in a repository.")
    ap.add_argument("--root", default=".")
    ap.add_argument("--format", choices=["md", "json"], default="md")
    a = ap.parse_args(argv)
    root = Path(a.root).resolve()
    if not root.is_dir():
        ap.error(f"not a directory: {root}")
    p = plan(root)
    sys.stdout.write(render_md(p) if a.format == "md" else json.dumps(p, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
