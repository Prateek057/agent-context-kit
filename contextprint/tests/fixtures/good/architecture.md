# Architecture

## Why
Auth must keep working when the profile service is slow, because login is on every path.

```yaml
calls:
  - auth -> profile: GET /users/{id}
    timeout_ms: 500
    retries: 2
decided_in: decisions/ADR-001-jwt.md
```
