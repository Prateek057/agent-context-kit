#!/usr/bin/env python3
"""Self-test: python3 tests/run_tests.py (no dependencies)."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUDIT = HERE.parent / "skills" / "contextprint-audit" / "scripts" / "audit.py"
SCAFFOLD = HERE.parent / "skills" / "contextprint-scaffold" / "scripts" / "scaffold.py"


def run(*args):
    return subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)


def audit_json(root):
    r = run(AUDIT, "--root", root, "--format", "json")
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    return bool(cond)


ok = True
good = audit_json(HERE / "fixtures" / "good")
ok &= check(all(s["status"] == "PRESENT" for s in good["statuses"].values()), "good fixture: all artifacts PRESENT")
ok &= check(not [f for f in good["findings"] if f["severity"] in ("error", "warn")], "good fixture: no errors/warnings")
ok &= check(good["traceability"]["in_tests"] == 2, "good fixture: snake_case test names traced to REQ-IDs")
ok &= check(run(AUDIT, "--root", HERE / "fixtures" / "good", "--fail-on", "warn").returncode == 0, "good fixture: --fail-on warn exits 0")

bad = audit_json(HERE / "fixtures" / "bad")
st = {k: v["status"] for k, v in bad["statuses"].items()}
ok &= check(st["requirements"] == "MISSING" and st["ci"] == "MISSING", "bad fixture: requirements and CI MISSING")
ok &= check(st["agents_md"] == "PARTIAL", "bad fixture: CLAUDE.md only -> AGENTS.md PARTIAL")
ok &= check(st["spec"] == "PARTIAL", "bad fixture: prose-only spec PARTIAL")
msgs = " ".join(f["message"] for f in bad["findings"])
ok &= check("Conflicting values for MAX_FAILED_ATTEMPTS" in msgs, "bad fixture: conflicting constant detected")
ok &= check("Deliberation" in msgs and "filler" in msgs, "bad fixture: deliberation and filler detected")
ok &= check(run(AUDIT, "--root", HERE / "fixtures" / "bad", "--fail-on", "missing").returncode == 1, "bad fixture: --fail-on missing exits 1")

# convention skills (codeprint / testprint / infraprint output, or hand-written *-patterns)
ok &= check(good["statuses"]["conventions"]["count"] == 1, "conventions: .agents/skills/*-patterns detected")
conv = [f for f in bad["findings"] if f["artifact"] == "conventions"]
ok &= check(any("No evidence labels" in f["message"] for f in conv), "conventions: missing evidence labels flagged")
ok &= check(any("frontmatter" in f["message"] for f in conv), "conventions: non-standard frontmatter flagged")
ok &= check(any("MAX_FAILED_ATTEMPTS" in f["message"] and "legacy-patterns" in f["message"] for f in bad["findings"]),
            "conventions: value conflict with docs includes the .claude skill")
ok &= check(not any(".claude/commands" in (f["path"] or "") + f["message"] for f in bad["findings"]),
            "conventions: .claude/ outside skills/ is not scanned")

with tempfile.TemporaryDirectory() as tmp:
    t = Path(tmp)
    (t / "contracts").mkdir()
    (t / "contracts/rules.yaml").write_text("limits:\n  MAX_RETRIES: 3\n")
    (t / "AGENTS.md").write_text("# AGENTS.md\n")
    sk = t / ".claude/skills/app-patterns"
    sk.mkdir(parents=True)
    (t / "app.py").write_text("x = 1\n")
    git = lambda *a: subprocess.run(["git", "-C", tmp, *a], capture_output=True, text=True)
    git("init", "-q"); git("add", "-A")
    git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init")
    head = git("rev-parse", "--short", "HEAD").stdout.strip()
    (sk / "SKILL.md").write_text(
        "---\nname: app-patterns\ndescription: Conventions.\n---\n"
        f"<!-- generated-by: codeprint 2.0.0 | commit: {head} | date: 2026-11-23 | sampled: 1 files | status: draft -->\n"
        "- Retries: MAX_RETRIES: 3 (observed 1/1)\n")
    (t / "app.py").write_text("x = 2\n")
    git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qam", "change")
    msgs = " ".join(f["message"] for f in audit_json(tmp)["findings"] if f["artifact"] == "conventions")
    ok &= check("Restates contract values (MAX_RETRIES)" in msgs, "conventions: restated contract value flagged")
    ok &= check("Not routed from AGENTS.md" in msgs, "conventions: missing AGENTS.md route flagged")
    ok &= check("Possibly stale: 1 code file" in msgs, "conventions: stale since provenance commit flagged")

with tempfile.TemporaryDirectory() as tmp:
    dry = run(SCAFFOLD, "--root", tmp)
    ok &= check(dry.returncode == 0 and not any(Path(tmp).iterdir()), "scaffold: dry run writes nothing")
    run(SCAFFOLD, "--root", tmp, "--apply", "--feature", "Login Flow")
    ok &= check((Path(tmp) / "specs/login-flow/spec.md").is_file(), "scaffold: --apply creates files")
    (Path(tmp) / "AGENTS.md").write_text("custom\n")
    run(SCAFFOLD, "--root", tmp, "--apply")
    ok &= check((Path(tmp) / "AGENTS.md").read_text() == "custom\n", "scaffold: never overwrites")
    sc = audit_json(tmp)
    ok &= check(any("Template not filled in" in f["message"] for f in sc["findings"]), "audit: unfilled templates flagged")
    ok &= check(sc["statuses"]["spec"]["status"] == "PARTIAL", "audit: unfilled spec template is PARTIAL")

print("\nALL PASSED" if ok else "\nSOME TESTS FAILED")
sys.exit(0 if ok else 1)
