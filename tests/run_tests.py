#!/usr/bin/env python3
"""Toolkit consistency checks: python3 tests/run_tests.py (standard library; node optional)."""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GENERATORS = ("codeprint", "testprint", "infraprint")
SHARED_RULES = GENERATORS + ("blueprint",)
ok = True


def check(cond, msg):
    global ok
    print(("PASS " if cond else "FAIL ") + msg)
    ok &= bool(cond)


skills = sorted(ROOT.glob("*/skills/*/SKILL.md"))
tools = sorted({p.relative_to(ROOT).parts[0] for p in skills})
check(set(SHARED_RULES) | {"contextprint"} <= set(tools), f"tools discovered: {', '.join(tools)}")

# 1. one source of truth for the generated-output rules
shared = (ROOT / "_shared/generated-output.md").read_text()
for tool in SHARED_RULES:
    copies = list((ROOT / tool / "skills").glob("*/references/generated-output.md"))
    check(copies and all(c.read_text() == shared for c in copies), f"{tool}: references/generated-output.md matches _shared")

# 2. portable frontmatter: name + description only, name matches the folder
for p in skills:
    m = re.match(r"\A---\n(.*?)\n---\n", p.read_text(), re.S)
    keys = re.findall(r"(?m)^([A-Za-z_-]+)\s*:", m.group(1)) if m else []
    name = re.search(r"(?m)^name:\s*(\S+)", m.group(1)).group(1) if m else None
    rel = p.relative_to(ROOT)
    check(set(keys) == {"name", "description"} and name == p.parent.name, f"{rel}: frontmatter is name/description, name = folder")

# 3. no host lock-in in skill bodies
for p in skills:
    text = p.read_text()
    bad = [s for s in ("trigger:", "~/.claude", "SKILL-portable") if s in text]
    check(not bad, f"{p.relative_to(ROOT)}: no host-specific strings {bad or ''}".rstrip())

# 4. manifests parse and agree on the version per tool
for tool in tools:
    files = [ROOT / tool / "plugin.json", ROOT / tool / "gemini-extension.json"] + sorted((ROOT / tool / ".claude-plugin").glob("*.json"))
    versions, parsed = set(), True
    for f in files:
        try:
            data = json.loads(f.read_text())
        except (OSError, ValueError):
            parsed = False
            continue
        for v in [data.get("version")] + [p.get("version") for p in data.get("plugins", []) if isinstance(p, dict)]:
            if v:
                versions.add(v)
    check(parsed and len(versions) == 1, f"{tool}: manifests valid JSON, one version ({', '.join(sorted(versions))})")

# 5. workflow scripts compile (top-level await allowed, as the host runs them in an async function)
node = shutil.which("node")
workflows = sorted(ROOT.glob("*/workflows/*.js"))
if node and workflows:
    js = ("const fs=require('fs');const AF=Object.getPrototypeOf(async function(){}).constructor;let bad=0;"
          "for(const f of process.argv.slice(1)){try{new AF('phase','log','agent','pipeline','budget',"
          "fs.readFileSync(f,'utf8').replace(/export const meta/,'const meta'))}catch(e){console.log(f,e.message);bad=1}}"
          "process.exit(bad)")
    r = subprocess.run([node, "-e", js, *map(str, workflows)], capture_output=True, text=True)
    check(r.returncode == 0, f"workflows compile ({len(workflows)}) {r.stdout.strip()}".rstrip())
    for w in workflows:
        src = w.read_text()
        check("first 60 lines" not in src and "compressed" not in src.lower(), f"{w.relative_to(ROOT)}: no compressed-output mode")
else:
    print("SKIP workflows: node not found")

# 6. installer
r = subprocess.run(["bash", "-n", str(ROOT / "install.sh")], capture_output=True, text=True)
check(r.returncode == 0, "install.sh: bash syntax")
r = subprocess.run([str(ROOT / "install.sh"), "install", "--target", "all", "--dry-run"], capture_output=True, text=True)
check(r.returncode == 0 and all(t in r.stdout for t in tools), "install.sh: dry run covers every tool on every host")

# 7. blueprint planner: run / refresh / ok / skip
import tempfile
PLAN = ROOT / "blueprint/skills/blueprint/scripts/plan.py"
with tempfile.TemporaryDirectory() as tmp:
    t = Path(tmp)
    g = lambda *a: subprocess.run(["git", "-C", tmp, "-c", "user.email=t@t", "-c", "user.name=t", *a], capture_output=True, text=True)
    for i in range(6):
        (t / f"src/m{i}.py").parent.mkdir(exist_ok=True)
        (t / f"src/m{i}.py").write_text(f"x = {i}\n")
    for i in range(3):
        (t / f"tests/test_{i}.py").parent.mkdir(exist_ok=True)
        (t / f"tests/test_{i}.py").write_text("def test_x(): pass\n")
    (t / "AGENTS.md").write_text("# AGENTS.md\n## Conventions\n- code: .agents/skills/patterns/SKILL.md\n")
    g("init", "-q"); g("add", "-A"); g("commit", "-qm", "init")
    head = g("rev-parse", "--short", "HEAD").stdout.strip()
    for name in ("patterns", "test-patterns"):
        tool = "codeprint" if name == "patterns" else "testprint"
        (t / f".agents/skills/{name}").mkdir(parents=True)
        (t / f".agents/skills/{name}/SKILL.md").write_text(
            f"---\nname: {name}\ndescription: x\n---\n<!-- generated-by: {tool} 2.0.0 | commit: {head} | status: draft -->\n")
    (t / "src/m0.py").write_text("x = 99\n")
    g("add", "-A"); g("commit", "-qm", "change code")
    r = subprocess.run([sys.executable, str(PLAN), "--root", tmp, "--format", "json"], capture_output=True, text=True)
    p = json.loads(r.stdout)
    st = {k: v["status"] for k, v in p["tools"].items()}
    check(st == {"codeprint": "refresh", "testprint": "ok", "infraprint": "skip"}, f"blueprint plan statuses {st}")
    check(p["tools"]["codeprint"]["changed_since"] == ["src/m0.py"], "blueprint plan: changed code files listed")
    check(any("test-patterns" in w and "not routed" in w for w in p["warnings"]), "blueprint plan: unrouted skill warned")

# 8. contextprint's own suite
r = subprocess.run([sys.executable, str(ROOT / "contextprint/tests/run_tests.py")], capture_output=True, text=True)
check(r.returncode == 0, "contextprint/tests/run_tests.py passes")

print("\nALL PASSED" if ok else "\nSOME TESTS FAILED")
sys.exit(0 if ok else 1)
