# CRUD Operations Benchmark Results

Comparing crud operations between drizzle@1.0.0-beta.2 and prisma@7.1.0.

## Test Environment

### Hardware
- **CPU**: AMD Ryzen 5 5625U with Radeon Graphics (12 cores)
- **RAM**: 15328 MB
- **Node**: v22.16.0

## Overall Summary

| ORM | Wins | Average p50 | Average p95 | Avg RPS |
|-----|------|-------------|-------------|---------|
| **drizzle@1.0.0-beta.2** | **7/7** | **4.73ms** | **9.88ms** | **531 RPS** |
| prisma@7.1.0 | 0/7 | 7.31ms | 14.55ms | 289 RPS |

## Detailed Results

### 1. Bulk INSERT (100 records)

**Use Case**: Batch imports, data migrations

| ORM | p50 | p95 | p99 | RPS |
|-----|-----|-----|-----|-----|
| **drizzle@1.0.0-beta.2** | **15.60ms** | **17.13ms** | **18.93ms** | **64 RPS** |
| prisma@7.1.0 | 25.92ms | 27.93ms | 29.70ms | 38 RPS |

**Winner**: drizzle@1.0.0-beta.2 - **39.8% faster**

---

### 2. DELETE Single Record

**Use Case**: Account deletion, data cleanup

| ORM | p50 | p95 | p99 | RPS |
|-----|-----|-----|-----|-----|
| **drizzle@1.0.0-beta.2** | **3.45ms** | **3.95ms** | **4.73ms** | **287 RPS** |
| prisma@7.1.0 | 5.08ms | 5.70ms | 6.15ms | 195 RPS |

**Winner**: drizzle@1.0.0-beta.2 - **32.1% faster**

---

### 3. INSERT Single Record

**Use Case**: User registration, creating new records

| ORM | p50 | p95 | p99 | RPS |
|-----|-----|-----|-----|-----|
| **drizzle@1.0.0-beta.2** | **1.74ms** | **2.34ms** | **2.93ms** | **547 RPS** |
| prisma@7.1.0 | 2.65ms | 3.06ms | 3.38ms | 373 RPS |

**Winner**: drizzle@1.0.0-beta.2 - **34.2% faster**

---

### 4. SELECT by Email (Indexed)

**Use Case**: Login/authentication queries using indexed column

| ORM | p50 | p95 | p99 | RPS |
|-----|-----|-----|-----|-----|
| **drizzle@1.0.0-beta.2** | **7.41ms** | **38.70ms** | **54.02ms** | **51 RPS** |
| prisma@7.1.0 | 7.95ms | 47.46ms | 56.50ms | 43 RPS |

**Winner**: drizzle@1.0.0-beta.2 - **6.7% faster**

---

### 5. SELECT by Primary Key

**Use Case**: Fetching a single record by primary key (most common operation)

| ORM | p50 | p95 | p99 | RPS |
|-----|-----|-----|-----|-----|
| **drizzle@1.0.0-beta.2** | **0.89ms** | **1.03ms** | **1.14ms** | **1119 RPS** |
| prisma@7.1.0 | 1.37ms | 1.58ms | 1.84ms | 725 RPS |

**Winner**: drizzle@1.0.0-beta.2 - **35.2% faster**

---

### 6. SELECT with Pagination

**Use Case**: List views with offset/limit pagination

| ORM | p50 | p95 | p99 | RPS |
|-----|-----|-----|-----|-----|
| **drizzle@1.0.0-beta.2** | **3.26ms** | **5.16ms** | **5.75ms** | **306 RPS** |
| prisma@7.1.0 | 6.19ms | 13.83ms | 16.63ms | 151 RPS |

**Winner**: drizzle@1.0.0-beta.2 - **47.4% faster**

---

### 7. UPDATE Single Record

**Use Case**: Profile updates, status changes

| ORM | p50 | p95 | p99 | RPS |
|-----|-----|-----|-----|-----|
| **drizzle@1.0.0-beta.2** | **0.75ms** | **0.86ms** | **0.93ms** | **1342 RPS** |
| prisma@7.1.0 | 2.02ms | 2.31ms | 2.54ms | 498 RPS |

**Winner**: drizzle@1.0.0-beta.2 - **62.8% faster**

---

**Generated**: 2025-12-11T17:16:51.384Z
**Run ID**: 2025-12-11_19-36-03
