/**
 * Drizzle ORM Adapter
 * Handles Drizzle-specific initialization and connection management
 */

import { BaseORMAdapter } from './orm-adapter.interface';
import type { ORMMetadata, ORMConfig } from '../config/test-config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface DrizzleClientWrapper {
  db: NodePgDatabase<any>;
  schema: any;
  pool: Pool;
}

export class DrizzleAdapter extends BaseORMAdapter {
  readonly id: string;
  readonly name: string = 'drizzle';
  readonly version: string;

  private config: ORMConfig;
  private pool?: Pool;
  private db?: NodePgDatabase<any>;
  private schema?: any;

  constructor(config: ORMConfig) {
    super();
    this.id = config.id;
    this.version = config.version;
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Dynamic import of schema based on version
      const schemaModule = await import(`../../${this.config.schemaPath}`);
      this.schema = schemaModule;

      // Get database configuration from environment
      const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

      // Create connection pool
      this.pool = new Pool({
        connectionString,
        max: this.config.settings?.connectionPoolSize || 20,
      });

      // Initialize Drizzle with schema
      this.db = drizzle({
        client: this.pool,
        schema: this.schema,
      });

      // Wrap client for compatibility with existing test scenarios
      this.client = {
        db: this.db,
        schema: this.schema,
        pool: this.pool,
      };

      this.connected = false; // Not connected until connect() is called
    } catch (error) {
      throw new Error(`Failed to initialize Drizzle adapter: ${error}`);
    }
  }

  async connect(): Promise<void> {
    this.ensureInitialized();

    try {
      // Test connection with a simple query
      await this.db!.select().from(this.schema.users).limit(1);
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect Drizzle: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      this.db = undefined;
      this.schema = undefined;
      this.pool = undefined;
      this.client = undefined;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.connected || !this.db) {
      return false;
    }

    try {
      await this.db.select().from(this.schema.users).limit(1);
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
        'SQL-like API',
        'Zero runtime overhead',
        'Edge runtime support',
      ],
      limitations: ['Manual schema management', 'No migration generation'],
    };
  }

  private ensureInitialized(): void {
    if (!this.db || !this.schema || !this.pool) {
      throw new Error(
        'Drizzle adapter not initialized. Call initialize() first.',
      );
    }
  }
}
