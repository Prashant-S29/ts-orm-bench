/**
 * Prisma ORM Adapter
 * Handles Prisma-specific initialization and connection management
 */

import { BaseORMAdapter } from './orm-adapter.interface';
import type { ORMMetadata, ORMConfig } from '../config/test-config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export class PrismaAdapter extends BaseORMAdapter {
  readonly id: string;
  readonly name: string = 'prisma';
  readonly version: string;

  private config: ORMConfig;
  private pool?: Pool;
  private prisma?: PrismaClient;

  constructor(config: ORMConfig) {
    super();
    this.id = config.id;
    this.version = config.version;
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Get database configuration from environment
      const connectionString =
        process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

      console.log(
        '[DEBUG] Prisma connection string:',
        connectionString.replace(/:[^:@]+@/, ':***@'),
      );

      // Create connection pool with explicit configuration
      this.pool = new Pool({
        connectionString,
        max: this.config.settings?.connectionPoolSize || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test the pool connection first
      const testClient = await this.pool.connect();
      testClient.release();

      // Create Prisma adapter with pg pool
      const adapter = new PrismaPg(this.pool);

      // Initialize Prisma Client without datasource URL
      // The adapter handles the connection
      this.prisma = new PrismaClient({
        adapter,
        log: this.config.settings?.logging
          ? ['query', 'error', 'warn']
          : ['error'],
      });

      this.client = this.prisma;
      this.connected = false; // Not connected until connect() is called
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Prisma adapter: ${errorMessage}`);
    }
  }

  async connect(): Promise<void> {
    this.ensureInitialized();

    try {
      // Connect to Prisma
      await this.prisma!.$connect();

      // Test connection with a simple query
      // Use executeRaw instead of model query to avoid schema issues
      await this.prisma!.$queryRaw`SELECT 1 as test`;

      this.connected = true;
    } catch (error) {
      this.connected = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect Prisma: ${errorMessage}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    if (this.pool) {
      await this.pool.end();
    }
    this.connected = false;
    this.prisma = undefined;
    this.pool = undefined;
    this.client = undefined;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.connected || !this.prisma) {
      return false;
    }

    try {
      await this.prisma.$queryRaw`SELECT 1 as health`;
      return true;
    } catch (error) {
      return false;
    }
  }

  getMetadata(): ORMMetadata {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      dependencies: this.config.dependencies,
      features: [
        'Type-safe queries',
        'Auto-generated types',
        'Migration system',
        'Prisma Studio',
        'Relations API',
      ],
      limitations: ['Query engine overhead', 'Limited raw SQL support'],
    };
  }

  private ensureInitialized(): void {
    if (!this.prisma || !this.pool) {
      throw new Error(
        'Prisma adapter not initialized. Call initialize() first.',
      );
    }
  }
}
