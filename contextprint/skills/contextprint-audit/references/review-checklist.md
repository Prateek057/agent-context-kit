# Stage 2: agent quality review checklist

The scanner checks presence and simple patterns. These checks need judgement. Review only
the files the scanner found; quote the exact line for every finding. Do not edit files.

| # | Check | Applies to | How to judge | Severity if failed |
|---|---|---|---|---|
| Q1 | **Numbers, not adjectives** | requirements, spec, architecture | Every limit/timeout/size has a number and unit. "Several", "fast", "as needed" are failures. | high |
| Q2 | **Edge case answered** | requirements, spec | For each rule with a boundary, is the exact-boundary behaviour stated (e.g. 5th attempt)? | high |
| Q3 | **Examples agree with the rule** | spec | Walk each `input -> expected` line through the YAML values. One contradicting line = finding (this happened in our runs). | high |
| Q4 | **What, not how** | spec, contracts | Flag prescribed mechanisms (timestamp ordering, specific data structures, library calls such as `time.time()`) that no requirement asks for. | medium |
| Q5 | **Invented rules** | spec, contracts | Every rule traces to a REQ-ID or ADR. Flag rules with no source (e.g. "password change invalidates tokens" when no requirement says so). | high |
| Q6 | **Behaviour the interface makes possible** | spec | If the interface offers an injectable clock, idempotency key, tenant id, etc., is the rule that uses it written down? | medium |
| Q7 | **Conclusions, not deliberation** | spec | No "actually", "re-reading", "I think", hedged values ("probably 12"). | medium |
| Q8 | **One source of truth** | all | A value stated in prose and in a contract → the prose should reference the contract key. Different values → conflict (check REQUIREMENTS to decide). | high |
| Q9 | **Intent present and short** | spec, architecture | 1–2 sentences of *why* per area; not missing, not an essay. | low |
| Q10 | **Minimal, not heavy** | spec | Hybrid specs should be small: intent + YAML + examples. Flag long restatements of the YAML in prose. | low |
| Q11 | **AGENTS.md lines pass the 3 questions** | AGENTS.md | Not discoverable from the repo? Applies to most sessions? Still true? Flag lines that fail any. | medium |
| Q12 | **Routing targets exist and are right** | AGENTS.md | Each task type points to real files, in the right order (rule change starts at REQUIREMENTS). | medium |
| Q13 | **Tests come from requirements** | acceptance tests | Tests assert REQ behaviour, not spec mistakes. Spot-check 3 tests against REQUIREMENTS. | high |
| Q14 | **ADRs immutable** | ADRs | Accepted ADRs were superseded, not edited (check `git log` if available). | low |
| Q15 | **CI really enforces** | CI | The validate step validates contracts and runs acceptance tests; it is not a no-op/TODO. | medium |
| Q16 | **Conventions describe, docs decide** | convention skills (`*-patterns`, `generated-by:` line) | Spot-check 3 `(observed n/m)` rules against the code: are they really there? Flag rules that contradict a spec, contract or ADR, and "Don't do X" lines without a count. Contradictions belong under `## Open questions`, not as a rule. | high |

## Output format

Append to the report under `## Quality review (agent)`:

```markdown
| # | Check | File | Line (quote) | Finding | Suggested fix | Severity |
```

Then a 3–5 line verdict: what blocks adoption, and what is cosmetic.
