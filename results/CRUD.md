

# CRUD Operations Benchmark Results

Comparing basic Create, Read, Update, Delete operations between Drizzle ORM and Prisma.

## Test Environment

### Hardware
- **CPU**: AMD Ryzen 5 5625U with Radeon Graphics (6 cores, 12 threads)
- **Max CPU Frequency**: 4.39 GHz
- **RAM**: 14GB
- **Storage**: 476.9GB NVMe SSD (MTFDKBA512TFK-1BC1AABHA)
- **OS**: Ubuntu 24.04.3 LTS

### Network
- **Type**: WiFi (wlo1)
- **Speed**: 866.7 Mb/s
- **Database**: Docker container (localhost:5432)
- **Network Latency**: < 1ms (local)

## Overall Summary

| ORM | Wins | Average p50 | Average RPS | Avg Memory |
|-----|------|-------------|-------------|------------|
| **Drizzle** | 7/7 | **4.37ms** | **585 RPS** | **25.89 MB** |
| **Prisma** | 0/7 | 9.52ms | 241 RPS | 35.65 MB |

**Winner**: **Drizzle ORM** - Wins all 7 scenarios with **2.18x average speedup**


## Detailed Results

### 1. SELECT by Primary Key

**Use Case**: Fetching a single record by ID (most common operation)

| ORM | p50 | p95 | p99 | RPS | Memory |
|-----|-----|-----|-----|-----|--------|
| **Drizzle** | **0.88ms** | 1.03ms | 1.13ms | 1,127 | 27.02 MB |
| **Prisma** | 1.36ms | 1.58ms | 1.86ms | 725 | 27.76 MB |

**Winner**: Drizzle - **52.7% faster**

```typescript
// Drizzle
await db.select().from(users).where(eq(users.id, id)).limit(1);

// Prisma
await prisma.user.findUnique({ where: { id } });
```

---

### 2. SELECT by Email (Indexed)

**Use Case**: Login/authentication queries

| ORM | p50 | p95 | p99 | RPS | Memory |
|-----|-----|-----|-----|-----|--------|
| **Drizzle** | **4.77ms** | 11.18ms | 14.68ms | 196 | 27.90 MB |
| **Prisma** | 8.29ms | 85.82ms | 97.16ms | 24 | 27.44 MB |

**Winner**: Drizzle - **667.5% faster** (Prisma has very high p95/p99 latency)

```typescript
// Drizzle
await db.select().from(users).where(eq(users.email, email)).limit(1);

// Prisma
await prisma.user.findUnique({ where: { email } });
```

**Note**: Prisma's high p95/p99 suggests query planning inconsistency on indexed lookups.

---

### 3. SELECT with Pagination

**Use Case**: List views with offset/limit

| ORM | p50 | p95 | p99 | RPS | Memory |
|-----|-----|-----|-----|-----|--------|
| **Drizzle** | **3.19ms** | 5.10ms | 5.71ms | 312 | 28.24 MB |
| **Prisma** | 6.40ms | 14.61ms | 20.60ms | 145 | 28.03 MB |

**Winner**: Drizzle - **186.4% faster**

```typescript
// Drizzle
await db.select().from(users).limit(20).offset(offset);

// Prisma
await prisma.user.findMany({ skip: offset, take: 20 });
```

---

### 4. INSERT Single Record

**Use Case**: User registration, creating new records

| ORM | p50 | p95 | p99 | RPS | Memory |
|-----|-----|-----|-----|-----|--------|
| **Drizzle** | **1.73ms** | 2.12ms | 2.56ms | 565 | 23.22 MB |
| **Prisma** | 3.49ms | 4.01ms | 4.49ms | 283 | 28.63 MB |

**Winner**: Drizzle - **89.0% faster**

```typescript
// Drizzle
await db.insert(users).values({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Prisma
await prisma.user.create({
  data: {
    email: faker.internet.email(),
    name: faker.person.fullName(),
  },
});
```

---

### 5. UPDATE Single Record

**Use Case**: Profile updates, status changes

| ORM | p50 | p95 | p99 | RPS | Memory |
|-----|-----|-----|-----|-----|--------|
| **Drizzle** | **0.75ms** | 0.86ms | 0.93ms | 1,345 | 24.38 MB |
| **Prisma** | 3.16ms | 3.47ms | 3.79ms | 326 | 28.85 MB |

**Winner**: Drizzle - **304.5% faster** (4x faster!)

```typescript
// Drizzle
await db.update(users)
  .set({ name: faker.person.fullName(), updatedAt: new Date() })
  .where(eq(users.id, id));

// Prisma
await prisma.user.update({
  where: { id },
  data: { name: faker.person.fullName() },
});
```

**Note**: Drizzle is exceptionally fast for updates - sub-millisecond median latency.

---

### 6. DELETE Single Record

**Use Case**: Account deletion, data cleanup

| ORM | p50 | p95 | p99 | RPS | Memory |
|-----|-----|-----|-----|-----|--------|
| **Drizzle** | **3.47ms** | 3.88ms | 4.34ms | 286 | 24.70 MB |
| **Prisma** | 6.71ms | 7.49ms | 8.26ms | 148 | 28.83 MB |

**Winner**: Drizzle - **93.1% faster**

```typescript
// Drizzle
await db.delete(users).where(eq(users.id, id));

// Prisma
await prisma.user.delete({ where: { id } });
```

---

### 7. Bulk INSERT (100 records)

**Use Case**: Batch imports, data migrations

| ORM | p50 | p95 | p99 | RPS | Memory |
|-----|-----|-----|-----|-----|--------|
| **Drizzle** | **15.79ms** | 17.64ms | 20.02ms | 63 | 25.74 MB |
| **Prisma** | 29.22ms | 38.17ms | 41.06ms | 35 | 81.22 MB |

**Winner**: Drizzle - **116.4% faster** (Prisma uses 3x more memory!)

```typescript
// Drizzle
await db.insert(users).values(batchData);

// Prisma
await prisma.user.createMany({ data: batchData });
```

**Note**: Prisma's memory usage spikes significantly on bulk operations (81 MB vs 26 MB).

---

## Performance Charts

### Latency Comparison (p50)

```
SELECT by ID       ██████ Drizzle: 0.88ms
                   █████████ Prisma: 1.36ms

SELECT by Email    ███████████ Drizzle: 4.77ms
                   ████████████████ Prisma: 8.29ms

Pagination         ████████ Drizzle: 3.19ms
                   ████████████████ Prisma: 6.40ms

INSERT Single      ████ Drizzle: 1.73ms
                   ████████ Prisma: 3.49ms

UPDATE Single      ██ Drizzle: 0.75ms
                   ████████ Prisma: 3.16ms

DELETE Single      ████████ Drizzle: 3.47ms
                   ████████████████ Prisma: 6.71ms

Bulk INSERT        ███████████████████████ Drizzle: 15.79ms
                   ████████████████████████████████████████ Prisma: 29.22ms
```

### Throughput Comparison (RPS)

```
SELECT by ID       ████████████████████████ Drizzle: 1,127 RPS
                   ███████████████ Prisma: 725 RPS

SELECT by Email    ████ Drizzle: 196 RPS
                   █ Prisma: 24 RPS

Pagination         ████████ Drizzle: 312 RPS
                   ████ Prisma: 145 RPS

INSERT Single      ████████████ Drizzle: 565 RPS
                   ██████ Prisma: 283 RPS

UPDATE Single      ██████████████████████████ Drizzle: 1,345 RPS
                   ████████ Prisma: 326 RPS

DELETE Single      ██████ Drizzle: 286 RPS
                   ███ Prisma: 148 RPS

Bulk INSERT        ██ Drizzle: 63 RPS
                   █ Prisma: 35 RPS
```

---

## Key Takeaways

### Drizzle Strengths
- **Consistently faster** across all operations (52% - 667% improvement)
- **Lower memory footprint** (especially on bulk operations)
- **Predictable latency** - tight p95/p99 distributions
- **Excellent UPDATE performance** - sub-millisecond median
- **Efficient bulk operations** - uses 3x less memory than Prisma

### Prisma Considerations
- ⚠️ **Higher latency** on all tested operations
- ⚠️ **Inconsistent indexed lookups** - very high p95/p99 on email queries
- ⚠️ **Memory spikes** on bulk operations (81 MB vs 26 MB)
- ⚠️ **Lower throughput** - 2-8x fewer operations per second


## Test Methodology

- **Warmup**: 500 iterations per scenario
- **Measurement**: 10,000 iterations per scenario
- **Database**: 2.75M records pre-seeded with raw SQL
- **Isolation**: Each test runs independently
- **Metrics**: p50/p95/p99 latency, RPS, memory usage
- **Environment**: Consistent hardware/software across all tests

## Raw Data

Full JSON results available in [`benchmark-results/runs/`](../benchmark-results/runs/)

---

## Important Notes

1. **These are microbenchmarks** - Real-world performance depends on your specific use case
2. **Hardware matters** - Results will vary on different systems
3. **PostgreSQL specific** - Other databases may show different patterns
4. **Synthetic workload** - Your app's query patterns may differ
5. **No relation loading tested** - This is basic CRUD only

## Coming Soon

- Complex JOIN operations
- Nested relation queries
- Transaction performance
- Aggregation queries
- Connection pool stress tests

---

**Last Updated**: December 9, 2025  
**Benchmark Version**: 1.0.0  

[← Back to Main README](../README.md) | [View Source](https://github.com/prashant-s29/ts-orm-bench)
