/**
 * Prisma ORM Adapter
 * Handles Prisma-specific initialization and connection management
 */

import { BaseORMAdapter } from './orm-adapter.interface';
import type { ORMMetadata, ORMConfig } from '../config/test-config';
import { Pool } from 'pg';
import * as path from 'path';

// Type definitions for both Prisma versions
type PrismaClient = any;
type PrismaPgAdapter = any;

export class PrismaAdapter extends BaseORMAdapter {
  readonly id: string;
  readonly name: string = 'prisma';
  readonly version: string;

  private config: ORMConfig;
  private pool?: Pool;
  private v6Pool?: any; // Separate pool for v6 using its own pg version
  private prisma?: PrismaClient;

  constructor(config: ORMConfig) {
    super();
    this.id = config.id;
    this.version = config.version;
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      const isV6 = this.version.startsWith('6.');

      // Get database configuration from environment
      const dbUser = process.env.DB_USER || 'benchmark';
      const dbPassword = process.env.DB_PASSWORD || 'benchmark';
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '5432';
      const dbName = process.env.DB_NAME || 'benchmark';

      const connectionString =
        process.env.DATABASE_URL ||
        `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

      console.log('[DEBUG] Prisma version:', this.version);

      if (!isV6) {
        // For v7, use root pool
        this.pool = new Pool({
          connectionString,
          max: this.config.settings?.connectionPoolSize || 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        // Test the pool connection first
        const testClient = await this.pool.connect();
        testClient.release();
      }

      // Load the appropriate Prisma client based on version
      const { PrismaClient, adapter } = await this.loadPrismaVersion(
        connectionString,
      );

      // Initialize Prisma Client with adapter
      this.prisma = new PrismaClient({
        adapter,
        log: this.config.settings?.logging
          ? ['query', 'error', 'warn']
          : ['error'],
      });

      this.client = this.prisma;
      this.connected = false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Prisma adapter: ${errorMessage}`);
    }
  }

  private async loadPrismaVersion(connectionString: string): Promise<{
    PrismaClient: any;
    adapter: any;
  }> {
    const isV6 = this.version.startsWith('6.');

    if (isV6) {
      const v6Dir = path.resolve(process.cwd(), 'src/orms/prisma/v6.19.0');

      const createRequire = await import('module').then((m) => m.createRequire);
      const v6Require = createRequire(path.join(v6Dir, 'package.json'));

      // Load ALL modules from v6's local node_modules
      const prismaClientModule = v6Require('@prisma/client');
      const prismaAdapterModule = v6Require('@prisma/adapter-pg');
      const { Pool: V6Pool } = v6Require('pg');

      const PrismaClient =
        prismaClientModule.PrismaClient ||
        prismaClientModule.default ||
        prismaClientModule;

      const PrismaPg =
        prismaAdapterModule.PrismaPg ||
        prismaAdapterModule.default ||
        prismaAdapterModule;

      // Create pool using v6's pg version - store it for later cleanup
      this.v6Pool = new V6Pool({
        connectionString,
        max: this.config.settings?.connectionPoolSize || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test v6 pool
      const testClient = await this.v6Pool.connect();
      testClient.release();

      const adapter = new PrismaPg(this.v6Pool);

      return { PrismaClient, adapter };
    } else {
      // Load Prisma v7 from root (default)
      const { PrismaClient } = await import('@prisma/client');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const adapter = new PrismaPg(this.pool!);

      return { PrismaClient, adapter };
    }
  }

  async connect(): Promise<void> {
    this.ensureInitialized();

    try {
      // Connect to Prisma
      await this.prisma!.$connect();

      // Test connection with a simple query
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
    // Disconnect v6 pool if it exists
    if (this.v6Pool) {
      await this.v6Pool.end();
    }
    // Disconnect v7 pool if it exists
    if (this.pool) {
      await this.pool.end();
    }
    this.connected = false;
    this.prisma = undefined;
    this.pool = undefined;
    this.v6Pool = undefined;
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
    if (!this.prisma) {
      throw new Error(
        'Prisma adapter not initialized. Call initialize() first.',
      );
    }
  }
}
