# Phase 5: Cross-Cutting Pattern Extraction

## Purpose
Identify patterns that span all subtypes — the "glue" conventions.

## Dimensions

### 1. DI/IoC Registration
- How services are registered (manual, convention-based, assembly scanning)
- Lifetime scopes (transient, scoped, singleton)
- Module/extension method grouping pattern
- Where: composition root file path

### 2. Config Management
- Options pattern vs raw IConfiguration
- Env vars vs appsettings vs secrets
- Per-environment override mechanism
- Config class naming and location

### 3. API Contracts
- Request/response shape conventions
- Error response format (ProblemDetails, custom envelope)
- Versioning strategy (URL, header, query param)
- Pagination pattern (offset/limit, cursor)

### 4. Observability
- Logging: library, format, structured fields
- Metrics: what's measured, library
- Tracing: OpenTelemetry, correlation IDs
- Health checks: liveness vs readiness

### 5. Resilience
- Retry policies (Polly, custom)
- Circuit breakers
- Timeouts (where configured, defaults)
- Bulkhead/rate limiting

### 6. Auth Patterns
- Middleware vs attribute/decorator
- Claims extraction
- Role/permission model
- Token validation location

### 7. Async Patterns
- CancellationToken propagation
- Parallel vs sequential preference
- Queue/event publishing patterns
- Background job scheduling

### 8. Mapping
- Manual vs AutoMapper vs Mapster vs custom
- Where mapping lives (handler? separate mapper class?)
- Extension method pattern (`.ToDto()`, `.ToDomain()`)

### 9. Inter-Module Communication
- Direct calls (HTTP, gRPC)
- Events (EventBridge, SQS, Kafka, RabbitMQ)
- Shared contracts/interfaces
- Service discovery

## Procedure

1. Check composition root / startup for DI patterns
2. Check config files for config approach
3. Check one endpoint for API contract shape
4. Check for resilience libs in dependencies
5. Check middleware pipeline for auth
6. Grep for CancellationToken propagation consistency
