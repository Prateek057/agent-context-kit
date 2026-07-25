# Phase 3.5: Infrastructure & DevOps Detection

## Purpose
Capture infra conventions so Claude generates correct Terraform, Docker, CI/CD code.

## IaC Detection

| Signal | Tool |
|--------|------|
| `*.tf`, `.terraform/`, `terragrunt.hcl` | Terraform/Terragrunt |
| `cdk.json`, `cdk.out/`, `lib/*-stack.ts` | AWS CDK |
| `Pulumi.yaml` | Pulumi |
| `*.template.json`, `serverless.yml` | CloudFormation/SAM |
| `*.bicep` | Azure Bicep |
| `crossplane/` | Crossplane |

**Extract:** module/stack structure, naming conventions, environment separation, tagging strategy, state management.

## Container Detection

| Signal | What |
|--------|------|
| `Dockerfile`, `*.dockerfile` | Container build |
| `docker-compose.yml` | Local orchestration |
| `.dockerignore` | Build context rules |

**Extract:** base image choices, multi-stage pattern, layer ordering, arg/env conventions.

## CI/CD Detection

| Signal | Platform |
|--------|----------|
| `.github/workflows/` | GitHub Actions |
| `.gitlab-ci.yml` | GitLab CI |
| `Jenkinsfile` | Jenkins |
| `.circleci/` | CircleCI |
| `azure-pipelines.yml` | Azure DevOps |
| `buildspec.yml` | AWS CodeBuild |

**Extract:** pipeline structure, job naming, stage ordering, reusable workflows, deploy triggers.

## Deployment Detection

| Signal | Mechanism |
|--------|-----------|
| `task-definition.json`, `ecs/` | ECS |
| `helm/`, `Chart.yaml` | Kubernetes/Helm |
| `k8s/`, `kustomization.yaml` | Kubernetes/Kustomize |
| `serverless.yml`, `template.yaml` | Lambda/Serverless |
| `apprunner.yaml` | App Runner |
| `fly.toml` | Fly.io |
| `render.yaml` | Render |
| `Procfile` | Heroku |

**Extract:** service binding (env vars, config maps, secrets), scaling config, resource naming.

## Environment Strategy

Detect:
- How dev/staging/prod differ (config files, env vars, feature flags)
- Secrets management (AWS Secrets Manager, Vault, .env patterns, SSM)
- Service discovery mechanism
- Folder-per-env vs branch-per-env vs config-per-env

## Procedure

1. Scan root + `infra/` + `deploy/` + `infrastructure/` dirs
2. Identify IaC tool from file extensions
3. Sample one stack/module for structure patterns
4. Read one Dockerfile for conventions
5. Read one CI workflow for pipeline structure
6. Note environment config hierarchy
