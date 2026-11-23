# Prompts: Move `docs/` to Minimal Hybrid (with Intent Check)

**Layout:** your originals stay untouched in `docs/`. All new files go into a mirror folder `docs-hybrid/` with the same paths. Reports go into `docs-hybrid/_reports/`.

```
docs/specs/user-service.md               (original, never edited)
docs-hybrid/specs/user-service.hybrid.md (intent + rules + examples)
docs-hybrid/specs/user-service.rules.yaml (precise values)
docs-hybrid/_reports/specs/user-service.report.md
docs-hybrid/_reports/TRIAGE.md
```

Recommended order: **Prompt 1** once, then **Prompt 2** one file at a time (highest priority first), then **Prompt 3** in a fresh session for each converted file.

---

## Prompt 1: Sort the `docs/` folder (no edits)

````text
Read every file under docs/ (recursively). Do NOT modify anything in docs/.
For each file, report in a table:
| Path | Kind (requirements / spec / contract / architecture / ADR / guide / other) | Size (words) | # precise values (limits, codes, formats, states, roles) | Has rationale/decisions? | Duplicates content from (paths) | Recommendation | Priority |

Recommendation is one of:
- CONVERT: spec-like, many precise values or rules → minimal hybrid
- EXTRACT VALUES ONLY: mostly rationale (architecture/ADR) → keep prose, move only hard values to YAML
- LEAVE AS IS: requirements, accepted ADRs, guides, or files with no precise values
- MERGE/REMOVE DUPLICATE: content already stated elsewhere (say where)

Also list:
- Contradictions between files (same value or rule stated differently; quote both sides with paths)
- Values that appear in more than one file (these should live in one YAML contract)
- A suggested AGENTS.md routing table (task type → which files to read first)

Save the result as docs-hybrid/_reports/TRIAGE.md. Do not create any other files.
````

---

## Prompt 2: Convert one file (repeat per file)

Replace `<FILE>` with a path from the triage, e.g. `docs/specs/user-service.md`.

````text
You are helping me move one project document to a "minimal hybrid" style and to PROVE nothing important was lost.
Original: <FILE>   (inside docs/; NEVER modify or delete anything in docs/)
Write outputs into docs-hybrid/ mirroring the same relative path:
- docs-hybrid/<same path>/<name>.hybrid.md (intent + rules + examples, links to the contract)
- docs-hybrid/<same path>/<name>.rules.yaml (all precise values)
- docs-hybrid/_reports/<same path>/<name>.report.md (the reports from Steps 1, 3 and 4)
You may READ other files in docs/ for context (requirements, ADRs, architecture), but the content must come from <FILE>.

DEFINITION: minimal hybrid
- Prose only for intent: 1–2 sentences per area saying what this is for and why.
- Every precise value (limits, timeouts, lengths, formats, error codes, states, roles, field names) lives in the YAML contract, not in prose.
- Edge-case rules get 1–3 examples in the form `input -> expected`.
- Each rule keeps its requirement ID (REQ-xx) if one exists anywhere in docs/.
- No implementation mechanisms unless the original requires them.
- Keep the "why" (rationale and decisions). Removing the why is a loss, not a saving.
- If a value is already defined in another docs/ file, reference it; don't copy it. Report any disagreement.

HARD RULES
- Nothing in docs/ is edited, moved or deleted.
- Do NOT invent anything. Vague, contradictory or missing points stay as "Open question"; don't resolve them yourself.
- Requirements files and accepted ADRs are the authority. If <FILE> conflicts with them, report the conflict; don't silently pick a side.
- Do not ask me questions mid-way; finish all steps and list open questions at the end.

STEP 1: Inventory the original (before writing anything)
List every atomic statement in <FILE> as a numbered item, tagged as one of:
INTENT | RULE | VALUE | EXAMPLE | DECISION/RATIONALE | CONSTRAINT | OPEN QUESTION | NOISE (repetition, filler).
Quote the original wording briefly for each item.

STEP 2: Write the new files
Create the .hybrid.md and .rules.yaml following the definition.
Each rule in the .md points to its YAML key; each YAML key has the REQ-ID or a short comment saying where it came from in <FILE>.

STEP 3: Compare the ORIGINAL file with the NEW files (mandatory)
3a. Traceability table, one row per inventory item:
    | # | Original (short quote) | Type | Where it is now (file + heading/YAML key) | Status | Note |
    Status is one of:
    CARRIED (same meaning), MOVED (same meaning, now in YAML/example),
    MERGED (combined with another item, give the #), CHANGED (meaning differs: explain),
    DROPPED (give the reason; only NOISE may be dropped without my approval).
3b. Intent check:
    - Write the purpose of the ORIGINAL in 2 sentences.
    - Then, reading ONLY the new files (pretend you never saw the original), write the purpose in 2 sentences.
    - Compare the two. Is the intent carried? YES / PARTIAL / NO, with the reason.
3c. Cold-read questions: write 8–10 questions a developer, tester or PO would ask (e.g. "what happens on the 5th failed login?", "why did we choose X?"). For each, answer from the original and then from the new files only. Mark any question where the answers differ or the new files cannot answer.
3d. Size: words (or tokens, if a tokenizer is available) of the original vs .hybrid.md + .rules.yaml combined, with the % change. A smaller result is NOT the goal; no loss is the goal.

STEP 4: Verdict
- Overall: SAFE TO ADOPT / ADOPT AFTER FIXES / KEEP ORIGINAL.
- Blockers: every CHANGED or non-noise DROPPED item and every mismatched cold-read question.
- Conflicts found with other docs/ files (quote both sides with paths).
- Open questions for the PO / owner.
- Checks that could enforce the YAML contract (schema validation, a test reading the YAML, a CI grep).
- One line for AGENTS.md routing (which task types should read this spec/contract first).

Print Steps 1, 3 and 4 in chat and save them to the report file.
````

---

## Prompt 3: Independent review (fresh session, no edits)

````text
Compare the original <FILE> (in docs/) with its conversion in docs-hybrid/ (<name>.hybrid.md + <name>.rules.yaml). Do not edit any file.
1) Everything in the original that is missing, weakened or changed in meaning in the new files (quote both sides).
2) Anything in the new files that is NOT in the original or elsewhere in docs/ (invented content).
3) Purpose of each version in 2 sentences; is the intent carried? YES / PARTIAL / NO.
4) Verdict: SAFE TO ADOPT / ADOPT AFTER FIXES / KEEP ORIGINAL, with the blockers.
Append your review to docs-hybrid/_reports/<same path>/<name>.report.md under "## Independent review".
````

---

## Optional Prompt 4: Batch roll-up (after several files)

````text
Read all reports in docs-hybrid/_reports/ (do not edit docs/ or docs-hybrid/ files other than the summary).
Write docs-hybrid/_reports/SUMMARY.md with: per file the verdict, # blockers, size change; all open questions grouped by owner;
all cross-file conflicts; and a proposed AGENTS.md (routing table + precedence: requirements > contracts > decisions > code comments + the
"when something turns out wrong" update rules). Do not change AGENTS.md itself.
````

## Tips

| Tip | Why |
|---|---|
| Convert the specs that change most often first (rules, limits, error codes) | That's where the minimal-hybrid format helped most in our tests |
| For architecture/ADRs use "EXTRACT VALUES ONLY" | Their value is the "why" |
| You review the **DROPPED/CHANGED** rows and the cold-read mismatches | The agent grading its own work is not enough; Prompt 3 helps |
| Swap `docs-hybrid/` into `docs/` only when the verdicts are SAFE and you agree | Keeps everything reversible (`git diff` stays clean until then) |
