# ts-orm-bench

A comprehensive benchmark suite comparing TypeScript/JavaScript ORMs with real-world scenarios and large datasets.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

**ts-orm-bench** is an unbiased, reproducible benchmark comparing popular TypeScript/JavaScript ORMs. Currently testing:

- **Drizzle ORM** (v1.0.0-beta.2)
- **Prisma** (v7.1.0)
- More ORMs coming soon!

The benchmark uses **raw SQL for seeding** to ensure no ORM gets a "warm-up" advantage, and tests against a realistic e-commerce database schema with 100K+ users, 50K+ products, and 500K+ orders.

## Benchmark Results

- [**CRUD Operations**](./results/CRUD.md) - Basic Create, Read, Update, Delete operations
- **Complex Queries** (WIP) - Joins, aggregations, subqueries
- **Transactions** (WIP) - Transaction performance and rollback scenarios
- **Relations** (WIP) - Nested queries and eager loading
- **Batch Operations** (WIP) - Bulk inserts, updates, and deletes

## What We Measure

### Performance Metrics

- **Latency Percentiles**: p50 (median), p95, p99
- **Throughput**: Requests per second (RPS)
- **Memory Usage**: Heap memory consumption during operations
- **Query Count**: Number of database queries executed

### Test Scenarios

Each ORM is tested with:

- **Warmup Phase**: 500 iterations to stabilize JIT compilation
- **Measurement Phase**: 10,000 iterations for statistical significance
- **Isolated Tests**: Each scenario runs in isolation to prevent interference

## Database Schema

The benchmark uses a realistic e-commerce schema:

```
users (100,000 records)
├── categories (50 records, 20% root, 80% nested)
├── products (50,000 records)
│   ├── product_tags (many-to-many)
│   └── reviews (~100,000 records, 20% of products)
├── orders (~500,000 records, 1-10 per user)
│   └── order_items (~1,500,000 records)
└── inventory_logs (~500,000 records)
```

**Total Records**: ~2,750,000

## 🔧 Test Environment

### Hardware

- **CPU**: AMD Ryzen 5 5625U with Radeon Graphics (6 cores, 12 threads)
- **Max CPU Frequency**: 4.39 GHz
- **RAM**: 14GB
- **Storage**: 476.9GB NVMe SSD (MTFDKBA512TFK-1BC1AABHA)
- **OS**: Ubuntu 24.04.3 LTS

### Network

- **Type**: WiFi (wlo1)
- **Speed**: 866.7 Mb/s
- **Database Connection**: localhost:5432 via Docker bridge (172.17.0.0/16)
- **Network Latency**: < 1ms (local Docker container)

### Software Stack

- **Node.js**: v22.16.0
- **PostgreSQL**: 16-alpine (Docker)
- **pnpm**: v9.0.0

### Database Configuration

```yaml
PostgreSQL Settings:
  - shared_preload_libraries: pg_stat_statements
  - max_connections: 200
  - Connection Pool Size: 20
```

## Running the Benchmark Yourself

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm 9+

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/prashant-s29/ts-orm-bench.git
   cd ts-orm-bench
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Setup environment**

   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults should work)
   ```

4. **Start PostgreSQL**

   ```bash
   pnpm db:setup
   ```

5. **Create schema**

   ```bash
   pnpm db:schema
   ```

6. **Generate ORM clients**

   ```bash
   pnpm db:generate
   ```

7. **Seed database** (takes ~5-7 minutes)

   ```bash
   pnpm db:seed
   ```

8. **Run benchmarks**
   ```bash
   pnpm test
   ```

### Configuration

Edit `.env` to customize benchmark parameters:

```env
# Database
DATABASE_URL="postgresql://benchmark:benchmark@localhost:5432/benchmark"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="benchmark"
DB_USER="benchmark"
DB_PASSWORD="benchmark"

# Benchmark Settings
WARMUP_ITERATIONS=500      # Warmup iterations before measurement
TEST_ITERATIONS=10000      # Number of test iterations
CONNECTION_POOL_SIZE=20    # Database connection pool size
LOG_LEVEL="info"           # Logging level
```

### Check Your System Specifications

Want to compare your results with ours? Check your system specs:

```bash
# Make the script executable (first time only)
chmod +x check-specs.sh

# Run the specification checker
./check-specs.sh
```

This will display:

- CPU model, cores, and max frequency
- RAM capacity
- Storage type and size
- Operating system version
- Node.js version
- PostgreSQL version
- Network configuration (WiFi/Ethernet, speed, latency)
- Docker bridge network details

**Note**: Network type (WiFi vs Ethernet) and speed can significantly impact results. For best performance, use a wired Ethernet connection.

## Project Structure

```
ts-orm-bench/
├── src/
│   ├── benchmark/           # Benchmark framework
│   │   ├── scenarios/       # Test scenarios (CRUD, joins, etc.)
│   │   ├── test-runner.ts   # Test execution engine
│   │   └── metrics-collector.ts
│   ├── orms/                # ORM implementations
│   │   ├── drizzle/
│   │   └── prisma/
│   ├── database/            # Schema definitions
│   └── scripts/             # Setup & seeding scripts
├── benchmark-results/       # JSON results from test runs
└── results/                 # Markdown result summaries
```

## Methodology

### Fair Testing Principles

1. **Neutral Seeding**: Database is seeded using raw SQL (via `pg` driver), not any ORM
2. **Isolated Tests**: Each scenario runs independently
3. **Warmup Period**: 500 iterations before measurement to stabilize JIT
4. **Statistical Significance**: 10,000 iterations per test
5. **Consistent Data**: Fixed faker seed (42) ensures reproducible data
6. **Clean Slate**: `VACUUM ANALYZE` run after seeding

### What We Don't Test (Yet)

- ❌ Schema migrations
- ❌ Code generation speed
- ❌ Developer experience
- ❌ Type safety features
- ❌ Documentation quality

This benchmark focuses purely on **runtime performance** with existing schemas.

## Understanding the Results

### Metrics Explained

- **p50 (median)**: 50% of requests complete faster than this
- **p95**: 95% of requests complete faster than this (important for SLAs)
- **p99**: 99% of requests complete faster than this (tail latency)
- **RPS**: Requests per second (throughput)
- **Memory**: Peak heap memory usage during test

### Winner Calculation

Winner is determined by **p50 latency** (lower is better). The "X% faster" metric shows:

```
% faster = ((slower_p50 - faster_p50) / faster_p50) * 100
```

## Acknowledgments

- Database seeding powered by [@faker-js/faker](https://github.com/faker-js/faker)
- Inspired by various ORM benchmarks in the community

## Disclaimer

Benchmarks are **not** the only factor in choosing an ORM. Consider:

- Developer experience
- Type safety
- Community support
- Feature set
- Your specific use case

**These results reflect performance on the test hardware and may vary in your environment.**
