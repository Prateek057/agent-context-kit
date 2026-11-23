# Architecture

Owner: <architect / service owner> · Last reviewed: <date>

## Why
<!-- 2-4 sentences: the forces that shape this system (e.g. "orders must keep working when
     user-service is slow; each service owns its own data"). Big decisions live in ADRs. -->
<intent>

## Boundaries
| Service | Owns (data) | Exposes | Contract |
|---|---|---|---|
| <service> | <tables / aggregates> | <API / events> | `contracts/<service>.openapi.yaml` |

## Service communication
<!-- Every cross-service call and event as values. Unknown values stay as "Open question". -->
```yaml
calls:
  - <caller> → <callee>: <METHOD /path>
    style: <sync REST | gRPC | async>
    contract: contracts/<callee>.openapi.yaml
    auth: <e.g. JWT RS256, verified locally>
    timeout_ms: <number>
    retries: <number>          # which methods are safe to retry?
events:
  - <EventName>: <producer> → <consumer>
    topic: <topic>
    delivery: <at-least-once | exactly-once>
    schema: contracts/events/<event>.json
rules: [<e.g. no shared database>, <e.g. catalog never calls user-service>]
decided_in: decisions/ADR-001-<title>.md
```

## Open questions
- <phrase from the source documents that could not be resolved into a value>
