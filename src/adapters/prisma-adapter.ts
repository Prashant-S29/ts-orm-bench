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
      const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

      // Create connection pool
      this.pool = new Pool({
        connectionString,
        max: this.config.settings?.connectionPoolSize || 20,
      });

      // Create Prisma adapter with pg pool
      const adapter = new PrismaPg(this.pool);

      // Initialize Prisma Client
      this.prisma = new PrismaClient({
        adapter,
        log: this.config.settings?.logging ? ['query', 'error', 'warn'] : [],
      });

      this.client = this.prisma;
      this.connected = false; // Not connected until connect() is called
    } catch (error) {
      throw new Error(`Failed to initialize Prisma adapter: ${error}`);
    }
  }

  async connect(): Promise<void> {
    this.ensureInitialized();

    try {
      // Test connection with a simple query
      await this.prisma!.$connect();
      await this.prisma!.user.findFirst();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect Prisma: ${error}`);
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
      await this.prisma.user.findFirst();
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
