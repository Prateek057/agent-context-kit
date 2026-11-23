# Spec: <feature>

Requirements: <REQ-IDs> · Contract: `contracts/rules.yaml` · Status: Draft — PO signs off the intent and examples

<!-- Minimal hybrid: short prose says WHY, the YAML block says WHAT MUST HOLD, examples settle
     the edge cases. Write the what, not the how: no mechanisms (e.g. timestamp ordering)
     unless a requirement asks for them. State conclusions, never deliberation.
     If the interface makes something possible (injectable clock, idempotency key, tenant id),
     write down the rule that uses it. -->

## <Rule name> (REQ-001)
Intent: <one or two sentences: why this rule exists, so edge cases can be judged.>

```yaml
contract: contracts/rules.yaml#/<RULE_KEY>
<CONSTANT_NAME>: <value>      # unit, REQ-001
<CONSTANT_NAME>: <value>      # unit, REQ-001
errors: [<ERROR_CODE>, <ERROR_CODE>]
examples:
  - <input at the limit>      -> <expected>
  - <input past the limit>    -> <expected>
  - <after reset/expiry>      -> <expected>
```

## Out of scope
- <behaviour no requirement asks for; propose it instead of building it>

## Open questions
- <question for the PO; the agent stops here instead of guessing>
