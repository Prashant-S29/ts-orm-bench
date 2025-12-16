# CRUD Operations Benchmark Results

Comparing crud operations between drizzle@0.45.0 and drizzle@1.0.0-beta.2 and prisma@6.19.0 and prisma@7.1.0.

## Test Environment

### Hardware

- **CPU**: AMD Ryzen 5 5625U with Radeon Graphics (12 cores)
- **RAM**: 15328 MB
- **Node**: v22.21.1

## Overall Summary

| ORM                      | Wins    | Average p50 | Average p95 | Avg RPS     |
| ------------------------ | ------- | ----------- | ----------- | ----------- |
| drizzle@0.45.0           | 0/7     | 8.39ms      | 13.89ms     | 373 RPS     |
| **drizzle@1.0.0-beta.2** | **7/7** | **5.54ms**  | **9.31ms**  | **539 RPS** |
| prisma@6.19.0            | 0/7     | 10.91ms     | 17.92ms     | 218 RPS     |
| prisma@7.1.0             | 0/7     | 8.70ms      | 13.55ms     | 299 RPS     |

## Detailed Results

### 1. Bulk INSERT (100 records)

**Use Case**: Batch imports, data migrations

| ORM                      | p50         | p95         | p99         | RPS        |
| ------------------------ | ----------- | ----------- | ----------- | ---------- |
| drizzle@0.45.0           | 22.87ms     | 25.24ms     | 27.52ms     | 46 RPS     |
| **drizzle@1.0.0-beta.2** | **16.79ms** | **18.94ms** | **21.65ms** | **59 RPS** |
| prisma@6.19.0            | 26.49ms     | 30.82ms     | 40.98ms     | 38 RPS     |
| prisma@7.1.0             | 26.31ms     | 28.15ms     | 30.47ms     | 39 RPS     |

**Winner**: drizzle@1.0.0-beta.2 - **26.6% faster**

---

### 2. DELETE Single Record

**Use Case**: Account deletion, data cleanup

| ORM                      | p50        | p95        | p99        | RPS         |
| ------------------------ | ---------- | ---------- | ---------- | ----------- |
| drizzle@0.45.0           | 3.69ms     | 4.84ms     | 5.49ms     | 261 RPS     |
| **drizzle@1.0.0-beta.2** | **2.95ms** | **3.89ms** | **4.40ms** | **328 RPS** |
| prisma@6.19.0            | 6.26ms     | 7.98ms     | 8.56ms     | 153 RPS     |
| prisma@7.1.0             | 4.86ms     | 6.32ms     | 6.82ms     | 200 RPS     |

**Winner**: drizzle@1.0.0-beta.2 - **20.1% faster**

---

### 3. INSERT Single Record

**Use Case**: User registration, creating new records

| ORM                      | p50        | p95        | p99        | RPS         |
| ------------------------ | ---------- | ---------- | ---------- | ----------- |
| drizzle@0.45.0           | 1.92ms     | 2.58ms     | 3.00ms     | 498 RPS     |
| **drizzle@1.0.0-beta.2** | **1.55ms** | **2.02ms** | **2.73ms** | **620 RPS** |
| prisma@6.19.0            | 3.29ms     | 4.28ms     | 4.98ms     | 290 RPS     |
| prisma@7.1.0             | 2.58ms     | 3.41ms     | 3.87ms     | 379 RPS     |

**Winner**: drizzle@1.0.0-beta.2 - **19.3% faster**

---

### 4. SELECT by Email (Indexed)

**Use Case**: Login/authentication queries using indexed column

| ORM                      | p50         | p95         | p99         | RPS        |
| ------------------------ | ----------- | ----------- | ----------- | ---------- |
| drizzle@0.45.0           | 21.95ms     | 50.43ms     | 56.75ms     | 41 RPS     |
| **drizzle@1.0.0-beta.2** | **12.21ms** | **30.41ms** | **35.89ms** | **69 RPS** |
| prisma@6.19.0            | 17.94ms     | 42.09ms     | 53.49ms     | 47 RPS     |
| prisma@7.1.0             | 15.83ms     | 35.28ms     | 48.55ms     | 56 RPS     |

**Winner**: drizzle@1.0.0-beta.2 - **44.4% faster**

---

### 5. SELECT by Primary Key

**Use Case**: Fetching a single record by primary key (most common operation)

| ORM                      | p50        | p95        | p99        | RPS          |
| ------------------------ | ---------- | ---------- | ---------- | ------------ |
| drizzle@0.45.0           | 0.95ms     | 1.13ms     | 1.30ms     | 1060 RPS     |
| **drizzle@1.0.0-beta.2** | **0.59ms** | **0.79ms** | **0.97ms** | **1640 RPS** |
| prisma@6.19.0            | 1.41ms     | 1.60ms     | 1.77ms     | 703 RPS      |
| prisma@7.1.0             | 1.08ms     | 1.37ms     | 1.66ms     | 901 RPS      |

**Winner**: drizzle@1.0.0-beta.2 - **37.7% faster**

---

### 6. SELECT with Pagination

**Use Case**: List views with offset/limit pagination

| ORM                      | p50        | p95        | p99        | RPS         |
| ------------------------ | ---------- | ---------- | ---------- | ----------- |
| drizzle@0.45.0           | 5.53ms     | 10.52ms    | 12.85ms    | 175 RPS     |
| **drizzle@1.0.0-beta.2** | **3.53ms** | **7.25ms** | **8.66ms** | **270 RPS** |
| prisma@6.19.0            | 16.91ms    | 34.09ms    | 37.61ms    | 56 RPS      |
| prisma@7.1.0             | 7.83ms     | 17.12ms    | 21.30ms    | 119 RPS     |

**Winner**: drizzle@1.0.0-beta.2 - **36.2% faster**

---

### 7. UPDATE Single Record

**Use Case**: Profile updates, status changes

| ORM                      | p50        | p95        | p99        | RPS         |
| ------------------------ | ---------- | ---------- | ---------- | ----------- |
| drizzle@0.45.0           | 1.79ms     | 2.50ms     | 2.98ms     | 528 RPS     |
| **drizzle@1.0.0-beta.2** | **1.18ms** | **1.86ms** | **2.33ms** | **786 RPS** |
| prisma@6.19.0            | 4.10ms     | 4.60ms     | 5.34ms     | 242 RPS     |
| prisma@7.1.0             | 2.41ms     | 3.19ms     | 3.74ms     | 401 RPS     |

**Winner**: drizzle@1.0.0-beta.2 - **34.3% faster**

---

**Generated**: 2025-12-13T20:30:54.090Z
**Run ID**: 2025-12-14_01-26-54
