# Spec: login

Requirements: REQ-012, REQ-013 · Contract: `contracts/rules.yaml`

## Login lockout (REQ-012)
Intent: slow down guessing; never lock a real user out for long.

```yaml
contract: contracts/rules.yaml#/login_lockout
MAX_FAILED_ATTEMPTS: 5
LOCK_DURATION_S: 900
examples:
  - attempt 5 wrong   -> INVALID_CREDENTIALS
  - attempt 6 right   -> ACCOUNT_LOCKED
  - after 900 s right -> OK, counter reset
```

## Token lifetime (REQ-013)
Intent: short-lived tokens limit damage from leaks.

```yaml
TOKEN_LIFETIME_S: 600   # service clock (injectable), not the library wall clock
examples:
  - clock at issue + 599 s -> valid
  - clock at issue + 600 s -> TOKEN_EXPIRED
```
