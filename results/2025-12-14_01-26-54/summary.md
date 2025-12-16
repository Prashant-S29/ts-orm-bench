# Benchmark Results Summary

**Run ID:** 2025-12-14_01-26-54
**Date:** 12/14/2025, 1:26:54 AM
**Duration:** 1874.11s
**Status:** completed

## Test Environment

### Hardware
- **CPU**: AMD Ryzen 5 5625U with Radeon Graphics
- **Cores**: 12
- **RAM**: 15328 MB
- **OS**: linux x64
- **Node**: v22.21.1

### Database
- **PostgreSQL**: Unknown
- **Connection Pool**: 20
- **Host**: localhost:5432

## Overall Summary

| ORM | Wins | Average p50 | Average p95 | Avg RPS |
|-----|------|-------------|-------------|---------|
| drizzle@0.45.0 | 0/7 | 8.39ms | 13.89ms | 373 RPS |
| **drizzle@1.0.0-beta.2** | **7/7** | **5.54ms** | **9.31ms** | **539 RPS** |
| prisma@6.19.0 | 0/7 | 10.91ms | 17.92ms | 218 RPS |
| prisma@7.1.0 | 0/7 | 8.70ms | 13.55ms | 299 RPS |

**Winner**: **drizzle@1.0.0-beta.2** - Wins 7/7 scenarios with **1.51x average speedup**

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

### prisma@6.19.0
- **Scenarios Run**: 7
- **Success Rate**: 7/7 (100.0%)

### drizzle@0.45.0
- **Scenarios Run**: 7
- **Success Rate**: 7/7 (100.0%)

## Test Configuration

- **Warmup Iterations**: 500
- **Test Iterations**: 10000
- **Categories**: crud
- **Total Scenarios**: 7

## Git Information

- **Branch**: main
- **Commit**: 8b10437
- **Clean**: No (uncommitted changes)

---

**Generated**: 2025-12-13T20:30:54.069Z
**Benchmark Version**: 1.0.0
