# Acceptance tests

Written from **REQUIREMENTS.md**, not from the spec: tests generated from a spec copy the
spec's mistakes and cannot catch a wrong spec. Keep them held out from the agent that
implements, or at least review them against the requirements.

Conventions:
- One test (or more) per requirement; put the REQ-ID in the test name or a tag
  (e.g. `test_req_001_fifth_failure_starts_lock`). The audit counts which REQ-IDs have tests.
- Spec examples may be added as tests only after the PO has signed off the spec.
- Use the injectable clock / fakes the interface provides; never sleep on the wall clock.
