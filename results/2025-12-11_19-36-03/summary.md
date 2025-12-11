# Benchmark Results Summary

**Run ID:** 2025-12-11_19-36-03
**Date:** 12/11/2025, 7:36:03 PM
**Duration:** 857.13s
**Status:** completed

## Test Environment

### Hardware
- **CPU**: AMD Ryzen 5 5625U with Radeon Graphics
- **Cores**: 12
- **RAM**: 15328 MB
- **OS**: linux x64
- **Node**: v22.16.0

### Database
- **PostgreSQL**: Unknown
- **Connection Pool**: 20
- **Host**: localhost:5432

## Overall Summary

| ORM | Wins | Average p50 | Average p95 | Avg RPS |
|-----|------|-------------|-------------|---------|
| **drizzle@1.0.0-beta.2** | **7/7** | **4.73ms** | **9.88ms** | **531 RPS** |
| prisma@7.1.0 | 0/7 | 7.31ms | 14.55ms | 289 RPS |

**Winner**: **drizzle@1.0.0-beta.2** - Wins 7/7 scenarios with **1.55x average speedup**

## Category Breakdown

### CRUD Operations
- **Scenarios**: 7
- **Winner**: drizzle@1.0.0-beta.2 (7/7 wins)
- **Details**: [CRUD Operations Results](./CRUD.md)

## Tested ORMs

### drizzle@1.0.0-beta.2
- **Scenarios Run**: 7
- **Success Rate**: 7/7 (100.0%)

### prisma@7.1.0
- **Scenarios Run**: 7
- **Success Rate**: 7/7 (100.0%)

## Test Configuration

- **Warmup Iterations**: 500
- **Test Iterations**: 10000
- **Categories**: crud
- **Total Scenarios**: 7

## Git Information

- **Branch**: feat/modular
- **Commit**: d871ecf
- **Clean**: No (uncommitted changes)

---

**Generated**: 2025-12-11T14:24:05.841Z
**Benchmark Version**: 1.0.0
