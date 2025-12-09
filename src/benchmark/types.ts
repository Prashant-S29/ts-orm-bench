import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PrismaClient } from '@prisma/client';

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  category:
    | 'crud'
    | 'relations'
    | 'aggregations'
    | 'filtering'
    | 'transactions'
    | 'mixed';
  execute: (orm: ORM) => Promise<void>;
}

export interface BenchmarkMetrics {
  latency: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    p999: number;
    min: number;
    max: number;
    stddev: number;
  };
  throughput: {
    rps: number;
    totalRequests: number;
  };
  memory: {
    heapUsed: number[];
    heapTotal: number[];
    rss: number[];
    external: number[];
  };
  cpu: {
    usage: number[];
  };
  errors: {
    count: number;
    types: Record<string, number>;
  };
}

export interface TestResult {
  testId: string;
  timestamp: string;
  orm: 'drizzle' | 'prisma';
  ormVersion: string;
  scenario: string;
  metrics: BenchmarkMetrics;
  duration: number;
  iterations: number;
  warmupIterations: number;
}

// Type for Drizzle client with schema
export interface DrizzleClient {
  db: NodePgDatabase<any>;
  schema: any;
}

// Union type for ORM clients
export type ORMClient = DrizzleClient | PrismaClient;

// Discriminated union for ORM
export type ORM =
  | {
      name: 'drizzle';
      version: string;
      client: DrizzleClient;
      disconnect: () => Promise<void>;
    }
  | {
      name: 'prisma';
      version: string;
      client: PrismaClient;
      disconnect: () => Promise<void>;
    };

// Type guard functions
export function isDrizzleORM(
  orm: ORM,
): orm is ORM & { name: 'drizzle'; client: DrizzleClient } {
  return orm.name === 'drizzle';
}

export function isPrismaORM(
  orm: ORM,
): orm is ORM & { name: 'prisma'; client: PrismaClient } {
  return orm.name === 'prisma';
}
