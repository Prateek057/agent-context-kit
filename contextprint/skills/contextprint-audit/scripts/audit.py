#!/usr/bin/env python3
"""contextprint audit: deterministic scanner for the contextprint approach.

Run inside (or point at) a repository. It lists which artifacts the approach needs
(requirements, architecture, ADRs, feature specs, contracts, acceptance tests,
AGENTS.md, CI enforcement, pinned versions, changelog), which exist, which are
partial, and what is wrong with them. Standard library only; PyYAML is used if present.

Usage:
  audit.py [--root PATH] [--format md|json] [--out FILE] [--json-out FILE]
           [--fail-on never|missing|error|warn] [--config FILE]

Config (optional) `.contextprint.json` at the repo root:
  {
    "ignore": ["legacy/*", "docs/archive/*"],
    "not_applicable": ["adr"],
    "paths": {"requirements": ["docs/prd.md"], "spec": ["docs/features/*.md"]},
    "req_id_pattern": "\\\\b(?:REQ|FR|NFR)-\\\\d+\\\\b"
  }
"""
import argparse
import fnmatch
import json
import os
import re
import subprocess
import sys
from pathlib import Path

VERSION = "1.1.0"

SKIP_DIRS = {
    ".git", "node_modules", ".venv", "venv", "env", "__pycache__", "dist", "build",
    "target", ".next", ".nuxt", ".idea", ".vscode", "vendor", ".tox", ".mypy_cache",
    ".pytest_cache", "coverage", ".gradle", "out", "bin", "obj", ".terraform",
    ".contextprint",
}
KEEP_DOT_DIRS = {".github", ".gitlab", ".circleci", ".agents", ".agent", ".gemini", ".buildkite", ".claude"}
# Inside .claude/ only the project skills are scanned (settings, commands and local files are not context docs).
CLAUDE_KEEP = (".claude/skills/",)
MAX_READ_BYTES = 400_000

DEFAULT_REQ_ID = r"\b(?:REQ|FR|NFR|BR|US)[-_]?\d+[a-z]?\b"

# Artifact metadata: id -> (stage, title, required, default path, scaffold template, priority)
ARTIFACTS = {
    "agents_md":        ("Routing",        "AGENTS.md (router)",            True,  "AGENTS.md",                      "AGENTS.md",        1),
    "requirements":     ("1 Requirements", "Numbered requirements",         True,  "REQUIREMENTS.md",                "REQUIREMENTS.md",  2),
    "spec":             ("3 Feature spec", "Feature specs (hybrid)",        True,  "specs/<feature>/spec.md",        "spec.md",          3),
    "contracts":        ("4 Contracts",    "Contracts (DSL)",               True,  "contracts/rules.yaml",           "rules.yaml",       4),
    "acceptance_tests": ("5 Tests",        "Acceptance tests from REQs",    True,  "tests/acceptance/",              "acceptance_test",  5),
    "ci":               ("Enforcement",    "CI + validate target",          True,  ".github/workflows/validate.yml", "ci",               6),
    "architecture":     ("2 Architecture", "architecture.md",               False, "architecture.md",                "architecture.md",  7),
    "adr":              ("2 Architecture", "Decision records (ADRs)",       False, "decisions/ADR-001-<title>.md",   "ADR.md",           8),
    "pinned_versions":  ("Environment",    "Pinned dependency versions",    False, "<lockfile>",                     None,               9),
    "changelog":        ("Keeping true",   "CHANGELOG.md",                  False, "CHANGELOG.md",                   "CHANGELOG.md",     10),
    # Optional: only checked when present (output of codeprint / testprint / infraprint, or hand-written).
    "conventions":      ("Conventions",    "Convention skills",             False, "<skills dir>/*patterns/",        None,               11),
}

VAGUE = [
    "several", "as needed", "where appropriate", "if appropriate", "reasonable", "reasonably",
    "user-friendly", "robust", "scalable", "and so on", "etc.", "tbd", "as soon as possible",
    "industry-standard", "industry standard", "loosely coupled", "resilient", "if possible",
    "a few", "some time", "quickly", "fast enough", "timely", "adequate", "sufficient",
    "state of the art", "seamless",
]
DELIBERATION = [
    "actually,", "re-reading", "on second thought", "i think", "i believe", "not sure",
    "hmm", "wait,", "???", "let me", "we could maybe", "probably",
]
FILLER = [
    "best practice", "clean code", "make sure", "be careful", "high quality", "high-quality",
    "don't forget", "do not forget", "write good", "follow conventions", "as usual",
]
CODE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".kt", ".rb", ".rs",
            ".cs", ".php", ".scala", ".swift", ".feature"}
ADR_DIRS = {"adr", "adrs", "decisions", "decision-records", "architecture-decisions", "decision_records"}
SPEC_DIRS = {"specs", "spec", "features", "feature-specs", "specifications"}
CI_PATTERNS = [".github/workflows/*.yml", ".github/workflows/*.yaml", ".gitlab-ci.yml",
               "jenkinsfile", "azure-pipelines.yml", ".circleci/config.yml",
               "bitbucket-pipelines.yml", ".buildkite/*.yml", ".drone.yml"]
LOCKFILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "pipfile.lock",
             "uv.lock", "go.sum", "cargo.lock", "gemfile.lock", "composer.lock",
             "gradle.lockfile", "packages.lock.json", "mix.lock", "pubspec.lock", "bun.lockb"}
INSTRUCTION_ALT = {"claude.md", "gemini.md", ".cursorrules", "copilot-instructions.md", "codex.md"}


# ---------------------------------------------------------------- discovery

def load_config(root, path):
    cfg_path = Path(path) if path else root / ".contextprint.json"
    if cfg_path.is_file():
        try:
            return json.loads(cfg_path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            print(f"warning: cannot parse {cfg_path}: {exc}", file=sys.stderr)
    return {}


def walk(root, ignore):
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(
            d for d in dirnames
            if d not in SKIP_DIRS and (not d.startswith(".") or d in KEEP_DOT_DIRS)
        )
        for name in sorted(filenames):
            rel = Path(dirpath, name).relative_to(root).as_posix()
            if any(fnmatch.fnmatch(rel, pat) for pat in ignore):
                continue
            if rel.startswith(".claude/") and not rel.startswith(CLAUDE_KEEP):
                continue
            files.append(rel)
    return files


_CACHE = {}


def read(root, rel):
    """Read a file (cached). HTML comments in Markdown are blanked, keeping line numbers."""
    key = (str(root), rel)
    if key not in _CACHE:
        try:
            with open(root / rel, "rb") as fh:
                text = fh.read(MAX_READ_BYTES).decode("utf-8", errors="replace")
        except OSError:
            text = ""
        if rel.lower().endswith(".md"):
            text = re.sub(r"<!--.*?-->", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
        _CACHE[key] = text
    return _CACHE[key]


def read_raw(root, rel):
    """Read without blanking HTML comments (needed for the generated-by provenance line)."""
    try:
        with open(root / rel, "rb") as fh:
            return fh.read(MAX_READ_BYTES).decode("utf-8", errors="replace")
    except OSError:
        return ""


def base(rel):
    return rel.rsplit("/", 1)[-1].lower()


def parts(rel):
    return [p.lower() for p in rel.split("/")[:-1]]


def ext(rel):
    b = base(rel)
    return b[b.rfind("."):] if "." in b else ""


def is_test_file(rel):
    b, ps = base(rel), parts(rel)
    if ext(rel) not in CODE_EXT:
        return False
    return (b.startswith("test_") or "_test." in b or ".test." in b or ".spec." in b
            or b.endswith("test.java") or b.endswith("tests.cs") or ext(rel) == ".feature"
            or any(p in ("test", "tests", "__tests__", "spec", "e2e", "acceptance") for p in ps))


PROVENANCE_RE = re.compile(r"(?m)^<!--\s*generated-by:\s*([\w-]+)\s+([\w.]+)(.*?)-->")
INLINE_CONST_RE = re.compile(r"\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b`?\s*[:=]\s*`?[0-9]")
LABEL_RE = re.compile(r"\((?:observed\s+\d+\s*/\s*\d+|inferred)\)", re.I)
FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.S)


def provenance(text):
    """Parse the generated-by line in the first 20 lines after the frontmatter. Returns dict or None."""
    body = FRONTMATTER_RE.sub("", text, count=1)
    head = "\n".join(body.splitlines()[:20])
    m = PROVENANCE_RE.search(head)
    if not m:
        return None
    rest = m.group(3)
    commit = re.search(r"commit:\s*([0-9a-f]{6,40}|none)", rest, re.I)
    return {"tool": m.group(1), "version": m.group(2), "commit": commit.group(1) if commit else None,
            "draft": bool(re.search(r"status:\s*draft", rest, re.I))}


def convention_skill_dirs(root, files):
    """Skill folders holding conventions: a generated-by provenance line, or a name ending in 'patterns'."""
    dirs = []
    for rel in files:
        if base(rel) != "skill.md" or "skills" not in parts(rel):
            continue
        d = rel.rsplit("/", 1)[0]
        if d.rsplit("/", 1)[-1].lower().endswith("patterns") or provenance(read_raw(root, rel)):
            dirs.append(d)
    return dirs


def classify(files, root, cfg):
    """Return dict artifact_id -> list of rel paths."""
    found = {k: [] for k in ARTIFACTS}
    found["instruction_alt"] = []
    found["test_files"] = []
    custom = cfg.get("paths", {})
    conv_dirs = convention_skill_dirs(root, files)

    for rel in files:
        b, ps, e = base(rel), parts(rel), ext(rel)
        low = rel.lower()
        hit = None
        for art, pats in custom.items():
            if any(fnmatch.fnmatch(rel, p) for p in pats):
                hit = art
                break
        if hit:
            found.setdefault(hit, []).append(rel)
            continue
        if e == ".md" and any(rel.startswith(d + "/") for d in conv_dirs):
            found["conventions"].append(rel)
            continue

        if e == ".md":
            if b == "agents.md":
                found["agents_md"].append(rel)
            elif b in INSTRUCTION_ALT:
                found["instruction_alt"].append(rel)
            elif b in ("changelog.md", "changes.md", "history.md"):
                found["changelog"].append(rel)
            elif re.match(r"^adr[-_ ]?\d+", b) or any(p in ADR_DIRS for p in ps):
                found["adr"].append(rel)
            elif re.search(r"requirements|^prd\b|[-_]prd\.md$|user[-_]stories", b):
                found["requirements"].append(rel)
            elif re.search(r"architecture|^design\.md$|system[-_]design", b):
                found["architecture"].append(rel)
            elif (b == "spec.md" or re.search(r"[._-]spec\.md$|\.hybrid\.md$", b)
                  or (any(p in SPEC_DIRS for p in ps) and b not in ("readme.md", "index.md"))):
                found["spec"].append(rel)
        elif b in INSTRUCTION_ALT:
            found["instruction_alt"].append(rel)

        # contracts
        if (re.search(r"(openapi|swagger|asyncapi)[^/]*\.(ya?ml|json)$", b)
                or re.search(r"\.openapi\.(ya?ml|json)$", b)
                or b.endswith(".schema.json") or e in (".proto", ".graphql", ".avsc")
                or re.search(r"(^|[._-])(rules|constants|contract|limits)\.ya?ml$", b)
                or ("contracts" in ps and e in (".yaml", ".yml", ".json"))):
            found["contracts"].append(rel)
        elif e == ".sql" and re.search(r"create\s+table", read(root, rel), re.I):
            found["contracts"].append(rel)

        if any(fnmatch.fnmatch(low, p) for p in CI_PATTERNS):
            found["ci"].append(rel)
        if b in LOCKFILES or b == "requirements.txt":
            found["pinned_versions"].append(rel)
        if is_test_file(rel):
            found["test_files"].append(rel)
            if (any(p in ("acceptance", "e2e", "features", "contract", "contracts") for p in ps)
                    or "acceptance" in b or e == ".feature"):
                found["acceptance_tests"].append(rel)
    return found


# ---------------------------------------------------------------- helpers for checks

FENCE_RE = re.compile(r"```([a-zA-Z0-9_+-]*)\n(.*?)```", re.S)
KV_RE = re.compile(r"^\s*[A-Za-z_][\w.-]*\s*:\s*\S", re.M)
LINK_RE = re.compile(r"(?:\]\(|`)([\w./-]+\.(?:md|ya?ml|json|sql|proto|graphql|txt|toml))(?:#[^)`]*)?[)`]")
CONST_RE = re.compile(r"(?m)^\s*(?:-\s*)?([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\s*[:=]\s*([0-9][0-9_.]*)\s*([a-zA-Z%]*)")


def norm_id(i):
    """Canonical requirement ID: 'req_012' / 'REQ012' -> 'REQ-012'."""
    return re.sub(r"^([A-Za-z]+)[-_]?", lambda m: m.group(1).upper() + "-", i.strip()).upper()


def ids_in(req_re, text, snake=False):
    if snake:  # test names like test_req_012_x
        text = text.replace("_", "-")
    return {norm_id(i) for i in req_re.findall(text)}


def words(text):
    return len(re.findall(r"\w+", text))


def hits(text, phrases, limit=5):
    """Return [(line_no, phrase, line)] for phrases found (case-insensitive, word-ish)."""
    out = []
    for no, line in enumerate(text.splitlines(), 1):
        low = line.lower()
        for ph in phrases:
            if re.search(r"(?<![\w-])" + re.escape(ph) + r"(?![\w-])", low):
                out.append((no, ph, line.strip()[:120]))
                break
        if len(out) >= limit:
            break
    return out


def count_hits(text, phrases):
    low = text.lower()
    return sum(len(re.findall(r"(?<![\w-])" + re.escape(p) + r"(?![\w-])", low)) for p in phrases)


def has_dsl_block(text):
    for lang, body in FENCE_RE.findall(text):
        if lang.lower() in ("yaml", "yml", "json", "sql", "proto", "graphql", "toml"):
            return True
        if len(KV_RE.findall(body)) >= 2:
            return True
    return False


class Report:
    def __init__(self):
        self.findings = []

    def add(self, art, sev, msg, path=None, fix=None, lines=None):
        self.findings.append({"artifact": art, "severity": sev, "message": msg,
                              "path": path, "fix": fix, "lines": lines or []})


# ---------------------------------------------------------------- checks

def check_requirements(root, found, rep, req_re):
    defined = {}
    for rel in found["requirements"]:
        text = read(root, rel)
        ids = req_re.findall(text)
        for i in ids:
            defined.setdefault(norm_id(i), rel)
        if not ids:
            rep.add("requirements", "error", "Requirements are not numbered (no REQ-IDs found).", rel,
                    "Give every requirement an ID like REQ-12; specs, contracts and tests cite it.")
        dup = sorted({i for i in ids if len(re.findall(r"(?m)^\s*(?:[-*#|]+\s*)?\**" + re.escape(i) + r"\b", text)) > 1})
        if dup:
            rep.add("requirements", "warn", f"REQ-IDs defined more than once: {', '.join(dup[:10])}", rel)
        vague = hits(text, VAGUE)
        if vague:
            rep.add("requirements", "warn", f"{count_hits(text, VAGUE)} vague phrase(s); write limits as numbers with an example.",
                    rel, "Replace e.g. 'after several attempts' with '5 consecutive failures, locked 900 s from the 5th'.", vague)
        if not re.search(r"\b(must not|shall not|never|is not allowed|are not allowed)\b", text, re.I):
            rep.add("requirements", "info", "No 'must not' requirements found; say what must not happen, too.", rel)
        if not re.search(r"\b(edge case|example|e\.g\.|given .* when|->|→)", text, re.I):
            rep.add("requirements", "info", "No edge cases or examples found; ask 'what happens at the edge?' for each rule.", rel)
    return defined


def check_architecture(root, found, rep):
    for rel in found["architecture"]:
        text = read(root, rel)
        if words(text) > 4000:
            rep.add("architecture", "warn", f"Large design document ({words(text)} words); split by stage "
                    "(requirements / architecture / spec / contracts).", rel)
        if not has_dsl_block(text):
            rep.add("architecture", "warn", "Prose only: cross-service calls have no values block "
                    "(style, contract, auth, timeout_ms, retries, events).", rel,
                    "Add a YAML block per call/event; see the architecture.md template.")
        if not re.search(r"\badr\b|decisions/", text, re.I):
            rep.add("architecture", "warn", "Does not link to decision records (ADRs).", rel)
        if not re.search(r"\b(why|intent|rationale|because)\b", text, re.I):
            rep.add("architecture", "info", "No stated rationale ('why') found.", rel)
        if re.search(r"\b(call|calls|request|http|rest|grpc|event|api)s?\b", text, re.I) and \
                not re.search(r"timeout", text, re.I):
            rep.add("architecture", "warn", "Service calls are described but no timeouts are stated.", rel)
        vague = hits(text, VAGUE)
        if vague:
            rep.add("architecture", "warn", f"{count_hits(text, VAGUE)} vague phrase(s) an agent will silently resolve.", rel, None, vague)


def check_adr(root, found, rep):
    for rel in found["adr"]:
        if base(rel) in ("readme.md", "index.md", "template.md") or "template" in base(rel):
            continue
        text = read(root, rel)
        if not re.search(r"(?im)^\W*status\W*[:|]?\s*\**\s*(accepted|proposed|superseded|deprecated|rejected|draft)", text) \
                and not re.search(r"(?im)^#+\s*status", text):
            rep.add("adr", "warn", "ADR has no Status (Proposed / Accepted / Superseded).", rel)
        if not re.search(r"(?im)^#+\s*(decision|context|consequences)", text):
            rep.add("adr", "info", "ADR lacks Context / Decision / Consequences headings.", rel)


def check_specs(root, found, rep, req_re, have_req_ids):
    with_dsl = 0
    for rel in found["spec"]:
        text = read(root, rel)
        linked_contract = any(l.endswith((".yaml", ".yml", ".json", ".sql", ".proto", ".graphql"))
                              for l in LINK_RE.findall(text))
        dsl = has_dsl_block(text) or linked_contract
        with_dsl += dsl
        if not dsl:
            rep.add("spec", "error", "Prose-only spec: rules and values are not in a DSL block or linked contract.", rel,
                    "Move limits, codes and shapes into a YAML block or contracts/*.yaml; keep 1-2 lines of intent.")
        if not re.search(r"(?im)^\W*(#+\s*)?(intent|why|purpose|goal|rationale)\b", text):
            rep.add("spec", "warn", "No intent line ('Intent: ...' / '## Why').", rel)
        if not (re.search(r"(?im)^\W*(#+\s*)?examples?\b", text) or re.search(r"->|→|\bgiven\b.*\bthen\b", text, re.I)):
            rep.add("spec", "warn", "No examples; edge cases need 1-3 'input -> expected' lines.", rel)
        if have_req_ids and not req_re.search(text):
            rep.add("spec", "warn", "Cites no REQ-IDs; rules are not traceable to requirements.", rel)
        delib = hits(text, DELIBERATION)
        if delib:
            rep.add("spec", "warn", "Deliberation in the spec ('actually', 'I think'...); state conclusions only.", rel, None, delib)
        vague = hits(text, VAGUE)
        if vague:
            rep.add("spec", "warn", f"{count_hits(text, VAGUE)} vague phrase(s).", rel, None, vague)
        n = words(text)
        if n > 2500:
            rep.add("spec", "warn", f"Large spec ({n} words); one spec per feature keeps context small.", rel)
    return with_dsl


def parse_contract(root, rel):
    text = read(root, rel)
    e = ext(rel)
    try:
        if e == ".json" or e == ".avsc":
            json.loads(text)
        elif e in (".yaml", ".yml"):
            try:
                import yaml  # type: ignore
                list(yaml.safe_load_all(text))
            except ImportError:
                if "\t" in text:
                    return text, "YAML contains tab characters"
    except Exception as exc:  # noqa: BLE001
        return text, f"does not parse: {str(exc).splitlines()[0][:120]}"
    return text, None


def check_contracts(root, found, rep, req_re, have_req_ids):
    referenced = set()
    for rel in found["contracts"]:
        text, err = parse_contract(root, rel)
        if err:
            rep.add("contracts", "error", f"Contract {err}.", rel)
        ids = ids_in(req_re, text)
        referenced |= ids
        if have_req_ids and not ids and ext(rel) not in (".proto", ".graphql"):
            rep.add("contracts", "warn", "No REQ-IDs in this contract; values are not traceable.", rel,
                    "Tag each rule/limit with its requirement, e.g. '# REQ-12' or 'x-req: REQ-12'.")
        if re.search(r"openapi|swagger", base(rel)) and not re.search(r"['\"]?4\d\d['\"]?\s*:", text):
            rep.add("contracts", "info", "OpenAPI contract defines no 4xx error responses.", rel)
    return referenced


def check_tests(root, found, rep, req_re):
    referenced = set()
    for rel in found["test_files"]:
        referenced |= ids_in(req_re, read(root, rel), snake=True)
    if found["test_files"] and not found["acceptance_tests"]:
        rep.add("acceptance_tests", "warn", f"{len(found['test_files'])} test file(s) found, but none are marked as "
                "acceptance tests written from the requirements.", None,
                "Add tests/acceptance/ with one test per REQ-ID (name or tag it with the ID).")
    return referenced


def check_agents(root, found, rep, files):
    targets = found["agents_md"]
    if not targets and found["instruction_alt"]:
        rep.add("agents_md", "warn", "No AGENTS.md, but agent-specific instruction files exist: "
                + ", ".join(found["instruction_alt"][:4]) + ". Make AGENTS.md the shared router and point the others at it.")
        targets = found["instruction_alt"]
    root_level = [t for t in targets if "/" not in t]
    for rel in (root_level or targets[:1]):
        text = read(root, rel)
        lines = [l for l in text.splitlines() if l.strip()]
        if len(lines) > 150 or words(text) > 1500:
            rep.add("agents_md", "warn", f"Long instruction file ({len(lines)} lines, {words(text)} words); "
                    "it is loaded every session. Keep only what the agent cannot learn from the code.", rel)
        routed = sum(bool(re.search(p, text, re.I)) for p in
                     [r"requirements", r"architecture", r"spec", r"contract|openapi|schema", r"adr|decision"])
        if routed < 3:
            rep.add("agents_md", "error", "No routing: does not say which documents to open per task type.", rel,
                    "Add 'Where to start, by task' (design decision / new feature / rule change / bug fix).")
        if not re.search(r"precedence|requirements\s*>\s*contracts|wins when", text, re.I):
            rep.add("agents_md", "warn", "No precedence rule (requirements > contracts > decisions > code comments).", rel)
        if not re.search(r"spec (was|is) wrong|spec first|update (the )?spec|turns out wrong", text, re.I):
            rep.add("agents_md", "warn", "No 'when something turns out wrong' update rules (fix spec first, then code).", rel)
        if not re.search(r"\b(validate|make |npm (run )?test|pytest|go test|mvn|gradle|cargo test|lint)\b", text, re.I):
            rep.add("agents_md", "warn", "No validate/test command to run before proposing a change.", rel)
        if not re.search(r"open question|stop and ask|never edit requirements|propose", text, re.I):
            rep.add("agents_md", "info", "No rule that unclear requirements become open questions (agent stops, never edits upstream).", rel)
        filler = hits(text, FILLER)
        if filler:
            rep.add("agents_md", "warn", "Generic filler lines that cost tokens every session.", rel, None, filler)
        fileset = set(files)
        missing = sorted({l for l in LINK_RE.findall(text)
                          if "<" not in l and "*" not in l
                          and l.lstrip("./") not in fileset
                          and (Path(rel).parent / l).as_posix().lstrip("./") not in fileset
                          and not any(f.endswith("/" + l.lstrip("./")) for f in fileset)})
        if missing:
            rep.add("agents_md", "warn", "Routes to files that do not exist: " + ", ".join(missing[:8]), rel)


def check_ci(root, found, rep, files):
    blob = "\n".join(read(root, r) for r in found["ci"])
    makefiles = [f for f in files if base(f) in ("makefile", "justfile", "taskfile.yml", "package.json")]
    mblob = "\n".join(read(root, r) for r in makefiles)
    has_validate = bool(re.search(r"(?m)^validate\s*:|\"validate\"\s*:|^\s*validate:", mblob))
    if not has_validate:
        rep.add("ci", "warn", "No single 'validate' entry point (make validate / npm run validate).", None,
                "Add a validate target: schema check of contracts + lint + acceptance tests.")
    if found["ci"]:
        allc = blob + "\n" + (mblob if re.search(r"make validate|run validate", blob) else "")
        if not re.search(r"openapi|schema|jsonschema|ajv|redocly|spectral|validate|contract", allc, re.I):
            rep.add("ci", "warn", "CI does not appear to validate the contracts (no schema/OpenAPI validation step).", found["ci"][0])
        if not re.search(r"test", allc, re.I):
            rep.add("ci", "warn", "CI does not appear to run tests.", found["ci"][0])


def check_pins(root, found, rep):
    lock = [f for f in found["pinned_versions"] if base(f) != "requirements.txt"]
    reqs = [f for f in found["pinned_versions"] if base(f) == "requirements.txt"]
    for rel in reqs:
        loose = [l.strip() for l in read(root, rel).splitlines()
                 if l.strip() and not l.strip().startswith(("#", "-")) and "==" not in l]
        if loose:
            rep.add("pinned_versions", "warn", f"{len(loose)} unpinned dependency line(s): {', '.join(loose[:5])}", rel)
    return bool(lock) or any(not [l for l in read(root, r).splitlines()
                                  if l.strip() and not l.strip().startswith(("#", "-")) and "==" not in l]
                             for r in reqs)


def check_values(root, found, rep):
    """One source of truth: same UPPER_SNAKE constant stated in several docs/contracts."""
    docs = set(found["requirements"] + found["architecture"] + found["spec"] + found["adr"]
               + found["contracts"] + found["agents_md"] + found["conventions"])
    seen = {}
    for rel in sorted(docs):
        for name, val, unit in CONST_RE.findall(read(root, rel)):
            seen.setdefault(name, {}).setdefault((val.rstrip("."), unit.lower()), set()).add(rel)
    for name, vals in sorted(seen.items()):
        paths = sorted(set().union(*vals.values()))
        if len(vals) > 1:
            detail = "; ".join(f"{v}{u} in {', '.join(sorted(p))}" for (v, u), p in vals.items())
            rep.add("contracts", "error", f"Conflicting values for {name}: {detail}", None,
                    "Keep the value in one contract; reference it elsewhere. Check REQUIREMENTS.md to decide which is right.")
        elif len(paths) > 2:
            rep.add("contracts", "info", f"{name} is stated in {len(paths)} files ({', '.join(paths[:4])}); "
                    "keep it in one contract and reference it.")


def git_changed_since(root, commit):
    """Files changed between commit and HEAD, or None if git is unavailable / commit unknown."""
    try:
        r = subprocess.run(["git", "-C", str(root), "diff", "--name-only", f"{commit}..HEAD"],
                           capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.split() if r.returncode == 0 else None


def check_conventions(root, found, rep):
    """Convention skills describe how code is written; they must not compete with the docs that decide."""
    if not found["conventions"]:
        return
    skills = {}
    for rel in found["conventions"]:
        d = rel.split("/skills/", 1)[0] + "/skills/" + rel.split("/skills/", 1)[1].split("/", 1)[0]
        skills.setdefault(d, []).append(rel)
    contract_names = {}
    for rel in found["contracts"]:
        for name, _v, _u in CONST_RE.findall(read(root, rel)):
            contract_names.setdefault(name, rel)
    agents = [a for a in found["agents_md"] if "/" not in a]
    agents_text = read(root, agents[0]) if agents else ""
    skill_dirs = tuple(d + "/" for d in skills)

    for d, rels in sorted(skills.items()):
        name = d.rsplit("/", 1)[-1]
        main = next((r for r in rels if base(r) == "skill.md"), rels[0])
        raw = read_raw(root, main)
        prov = provenance(raw)
        text = "\n".join(read(root, r) for r in rels)

        fm = FRONTMATTER_RE.match(raw)
        extra = sorted({k for k in re.findall(r"(?m)^([A-Za-z_-]+)\s*:", fm.group(1))} - {"name", "description"}) if fm else []
        if extra:
            rep.add("conventions", "info", f"Non-standard frontmatter keys ({', '.join(extra)}); other hosts ignore them.", main)

        # inline too ("- Retries: MAX_RETRIES = 3"); naming a constant without a value is a link, not a copy
        restated = sorted({n for r in rels for n in INLINE_CONST_RE.findall(read(root, r)) if n in contract_names})
        if restated:
            rep.add("conventions", "warn", "Restates contract values (" + ", ".join(restated[:6]) + "); two copies drift apart.",
                    main, f"Replace the values with a link, e.g. 'see `{contract_names[restated[0]]}`'.")

        bullets = len(re.findall(r"(?m)^\s*(?:[-*]|\d+\.)\s+\S", text))
        labels = LABEL_RE.findall(text)
        executor = name.lower().startswith("use-")  # use-*patterns hold steps, not conventions
        if bullets >= 5 and not labels and not executor:
            rep.add("conventions", "warn", f"No evidence labels on {bullets} rule lines; observed and invented rules look the same.",
                    main, "End each rule with (observed n/m) or (inferred), or regenerate with codeprint/testprint/infraprint.")
        elif labels:
            inferred = sum(1 for l in labels if "inferred" in l.lower())
            if inferred * 2 > len(labels):
                rep.add("conventions", "info", f"{inferred}/{len(labels)} rules are (inferred), not observed; review them first.", main)

        n_lines = len(raw.splitlines())
        if n_lines > 250:
            rep.add("conventions", "warn", f"Long convention skill ({n_lines} lines); point to canonical files instead of pasting examples.", main)

        if agents_text and name not in agents_text:
            rep.add("conventions", "warn", "Not routed from AGENTS.md; agents on other hosts will not find it.", main,
                    f"Add one line under '## Conventions' in AGENTS.md pointing to `{d}/SKILL.md`.")

        if not prov:
            rep.add("conventions", "info", "No generated-by provenance line; staleness cannot be checked.", main)
            continue
        if prov["draft"]:
            rep.add("conventions", "info", f"Generated by {prov['tool']} {prov['version']} and still marked draft; review it.", main)
        commit = prov["commit"]
        if commit and commit.lower() != "none":
            changed = git_changed_since(root, commit)
            if changed is None:
                rep.add("conventions", "warn", f"Provenance commit {commit} not found in git history; regenerate.", main)
            else:
                code = [f for f in changed if ext(f) in CODE_EXT and not f.startswith(skill_dirs)]
                if code:
                    rep.add("conventions", "warn", f"Possibly stale: {len(code)} code file(s) changed since commit {commit} "
                            f"(e.g. {', '.join(code[:3])}).", main, f"Re-run {prov['tool']} or check the changed files.")


PLACEHOLDER_RE = re.compile(r"<(?!/?(?:br|p|div|span|details|summary|img|a|b|i|em|strong|code|pre|sup|sub|table|tr|td|th|ul|ol|li|hr)\b)[a-z][^<>\n]{1,60}>", re.I)


def check_placeholders(root, found, rep):
    """Scaffolded templates that were never filled in."""
    for art in ("requirements", "architecture", "adr", "spec", "contracts", "agents_md", "changelog"):
        for rel in found.get(art, []):
            if ext(rel) not in (".md", ".yaml", ".yml"):
                continue
            text = read(root, rel)
            # ignore placeholders inside inline code / routing paths such as specs/<feature>/spec.md
            ph = [m.group(0) for m in PLACEHOLDER_RE.finditer(text)
                  if not re.search(r"[/\w]$", text[max(0, m.start() - 1):m.start()])]
            if len(ph) >= 3:
                rep.add(art, "error", f"Template not filled in: {len(ph)} placeholder(s) such as "
                        + ", ".join(dict.fromkeys(ph[:3])), rel,
                        "Fill from real sources (requirements, code, decisions); unknowns become open questions.")
            elif ph:
                rep.add(art, "warn", "Unfilled placeholder(s): " + ", ".join(dict.fromkeys(ph)), rel)


def check_big_docs(root, files, found, rep):
    classified = set().union(*[set(v) for k, v in found.items() if k != "test_files"])
    for rel in files:
        if ext(rel) == ".md" and rel not in classified:
            n = words(read(root, rel))
            if n > 4000 and base(rel) not in ("changelog.md", "license.md"):
                rep.add("spec", "info", f"Large unclassified document ({n} words). If it mixes requirements, "
                        "design and rules, split it by stage.", rel)


# ---------------------------------------------------------------- orchestration

def audit(root, cfg):
    req_re = re.compile(cfg.get("req_id_pattern", DEFAULT_REQ_ID), re.I)
    files = walk(root, cfg.get("ignore", []))
    found = classify(files, root, cfg)
    rep = Report()
    na = set(cfg.get("not_applicable", []))

    defined = check_requirements(root, found, rep, req_re)
    check_architecture(root, found, rep)
    check_adr(root, found, rep)
    spec_text = "\n".join(read(root, r) for r in found["spec"])
    in_specs = ids_in(req_re, spec_text)
    specs_with_dsl = check_specs(root, found, rep, req_re, bool(defined))
    in_contracts = check_contracts(root, found, rep, req_re, bool(defined))
    in_tests = check_tests(root, found, rep, req_re)
    check_agents(root, found, rep, files)
    check_ci(root, found, rep, files)
    has_pins = check_pins(root, found, rep)
    check_values(root, found, rep)
    check_conventions(root, found, rep)
    check_placeholders(root, found, rep)
    check_big_docs(root, files, found, rep)

    trace = None
    if defined:
        ids = set(defined)
        untested = sorted(ids - in_tests, key=_natkey)
        unspecified = sorted(ids - in_specs - in_contracts, key=_natkey)
        unknown = sorted((in_specs | in_contracts | in_tests) - ids, key=_natkey)
        trace = {"defined": len(ids), "in_specs": len(ids & in_specs), "in_contracts": len(ids & in_contracts),
                 "in_tests": len(ids & in_tests), "untested": untested, "unspecified": unspecified, "unknown": unknown}
        if found["test_files"] and untested:
            rep.add("acceptance_tests", "warn", f"{len(untested)}/{len(ids)} requirements have no test citing them: "
                    + ", ".join(untested[:15]) + (" ..." if len(untested) > 15 else ""))
        if unspecified and found["spec"]:
            rep.add("spec", "warn", f"{len(unspecified)} requirement(s) not cited by any spec or contract: "
                    + ", ".join(unspecified[:15]) + (" ..." if len(unspecified) > 15 else ""))
        if unknown:
            rep.add("requirements", "warn", "IDs cited downstream but not defined in requirements: " + ", ".join(unknown[:15]))

    statuses = {}
    for art, meta in ARTIFACTS.items():
        sevs = [f["severity"] for f in rep.findings if f["artifact"] == art]
        present = bool(found.get(art)) if art != "pinned_versions" else bool(found["pinned_versions"])
        if art in na or (art == "conventions" and not present):
            st = "N/A"  # conventions are optional; absence is not a gap
        elif art == "agents_md" and not found["agents_md"] and found["instruction_alt"]:
            st = "PARTIAL"
        elif art == "acceptance_tests" and not found["acceptance_tests"] and found["test_files"]:
            st = "PARTIAL"
        elif art == "pinned_versions" and present and not has_pins:
            st = "PARTIAL"
        elif not present:
            st = "MISSING"
        elif "error" in sevs:
            st = "PARTIAL"
        else:
            st = "PRESENT"
        statuses[art] = {"status": st, "files": found.get(art, [])[:50], "count": len(found.get(art, [])),
                         "errors": sevs.count("error"), "warnings": sevs.count("warn")}

    score = 100
    for art, s in statuses.items():
        if s["status"] == "MISSING":
            score -= 12 if ARTIFACTS[art][2] else 4
        elif s["status"] == "N/A":
            continue
    score -= sum(4 for f in rep.findings if f["severity"] == "error" and f["artifact"] not in na)
    score -= sum(1 for f in rep.findings if f["severity"] == "warn" and f["artifact"] not in na)
    return {
        "tool": "contextprint-audit", "version": VERSION, "root": str(root),
        "score": max(score, 0), "statuses": statuses, "findings": rep.findings, "traceability": trace,
        "specs_with_dsl": specs_with_dsl, "files_scanned": len(files),
    }


def _natkey(s):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]


SEV_ICON = {"error": "❌", "warn": "⚠️", "info": "ℹ️"}
ST_ICON = {"PRESENT": "✅ PRESENT", "PARTIAL": "🟡 PARTIAL", "MISSING": "❌ MISSING", "N/A": "➖ N/A"}


def todo_list(result):
    items = []
    for art, meta in sorted(ARTIFACTS.items(), key=lambda kv: kv[1][5]):
        st = result["statuses"][art]["status"]
        req = "required" if meta[2] else "recommended"
        tmpl = f" (scaffold template: `{meta[4]}`)" if meta[4] else ""
        if st == "MISSING":
            items.append(f"**Create {meta[1]}** at `{meta[3]}` — {req}{tmpl}.")
        elif st == "PARTIAL":
            errs = [f["message"] for f in result["findings"] if f["artifact"] == art and f["severity"] in ("error", "warn")]
            items.append(f"**Complete {meta[1]}** — {errs[0] if errs else 'partial'}")
    for f in result["findings"]:
        if f["severity"] == "error" and result["statuses"][f["artifact"]]["status"] == "PRESENT":
            items.append(f"**Fix** {f['message']}" + (f" (`{f['path']}`)" if f["path"] else ""))
    return items


def render_md(result):
    out = [f"# contextprint artifact audit", "",
           f"Repository: `{result['root']}` · files scanned: {result['files_scanned']} · "
           f"readiness score: **{result['score']}/100** (heuristic) · tool v{result['version']}", "",
           "## Required artifacts", "",
           "| Stage | Artifact | Required | Status | Found | Errors | Warnings |",
           "|---|---|---|---|---|---|---|"]
    for art, meta in sorted(ARTIFACTS.items(), key=lambda kv: kv[1][5]):
        s = result["statuses"][art]
        shown = ", ".join(f"`{p}`" for p in s["files"][:3]) + (f" +{s['count'] - 3} more" if s["count"] > 3 else "")
        out.append(f"| {meta[0]} | {meta[1]} | {'yes' if meta[2] else 'recommended'} | {ST_ICON[s['status']]} | "
                   f"{shown or '—'} | {s['errors']} | {s['warnings']} |")
    todo = todo_list(result)
    out += ["", "## To do (in priority order)", ""]
    out += [f"{i}. {t}" for i, t in enumerate(todo, 1)] or ["Nothing missing. Run the agent quality review next."]
    tr = result["traceability"]
    if tr:
        out += ["", "## Requirement traceability", "",
                "| Defined REQ-IDs | Cited in specs | Cited in contracts | Cited in tests |", "|---|---|---|---|",
                f"| {tr['defined']} | {tr['in_specs']} | {tr['in_contracts']} | {tr['in_tests']} |"]
        if tr["untested"]:
            out.append(f"\nNot cited by any test: {', '.join(tr['untested'][:30])}")
    out += ["", "## Findings", ""]
    for art, meta in sorted(ARTIFACTS.items(), key=lambda kv: kv[1][5]):
        fs = [f for f in result["findings"] if f["artifact"] == art]
        if not fs:
            continue
        out.append(f"### {meta[1]}")
        for f in sorted(fs, key=lambda f: ["error", "warn", "info"].index(f["severity"])):
            loc = f" — `{f['path']}`" if f["path"] else ""
            out.append(f"- {SEV_ICON[f['severity']]} {f['message']}{loc}")
            for no, ph, line in f["lines"][:3]:
                out.append(f"  - L{no} “{ph}”: `{line.replace('`', '')}`")
            if f["fix"]:
                out.append(f"  - Fix: {f['fix']}")
        out.append("")
    out += ["## Next steps", "",
            "- Agent quality review: what-not-how, example/rule agreement, invented rules (see `references/review-checklist.md`).",
            "- Scaffold missing artifacts as templates: `contextprint-scaffold` skill (never overwrites).",
            "- Draft the content of missing documents from the repo: `contextprint-writer` agent."]
    return "\n".join(out) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Audit a repository against the contextprint artifact model.")
    ap.add_argument("--root", default=".", help="repository root (default: current directory)")
    ap.add_argument("--format", choices=["md", "json"], default="md")
    ap.add_argument("--out", help="write the main report here instead of stdout")
    ap.add_argument("--json-out", help="also write the JSON result to this file")
    ap.add_argument("--config", help="config file (default: <root>/.contextprint.json)")
    ap.add_argument("--fail-on", choices=["never", "missing", "error", "warn"], default="never",
                    help="exit 1 if any required artifact is missing / any error / any warning")
    a = ap.parse_args(argv)
    root = Path(a.root).resolve()
    if not root.is_dir():
        ap.error(f"not a directory: {root}")
    result = audit(root, load_config(root, a.config))
    text = render_md(result) if a.format == "md" else json.dumps(result, indent=2)
    if a.out:
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)
    if a.json_out:
        Path(a.json_out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.json_out).write_text(json.dumps(result, indent=2), encoding="utf-8")
    missing_req = any(s["status"] == "MISSING" and ARTIFACTS[k][2] for k, s in result["statuses"].items())
    sevs = {f["severity"] for f in result["findings"]}
    fail = {"never": False, "missing": missing_req, "error": missing_req or "error" in sevs,
            "warn": missing_req or bool(sevs & {"error", "warn"})}[a.fail_on]
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
