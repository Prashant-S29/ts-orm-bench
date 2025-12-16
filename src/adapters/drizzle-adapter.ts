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
  relations: any;
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
  private relations?: any;

  constructor(config: ORMConfig) {
    super();
    this.id = config.id;
    this.version = config.version;
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Dynamic import of schema based on version
      const schemaModule = await import(`../${this.config.schemaPath}`);
      this.schema = schemaModule;

      // Dynamic import of relations based on version (optional)
      // Try to import relations, but don't fail if it doesn't exist
      try {
        const schemaDir = this.config.schemaPath.substring(
          0,
          this.config.schemaPath.lastIndexOf('/'),
        );
        const relationsModule = await import(`../${schemaDir}/relations`);
        this.relations = relationsModule.relations;
      } catch (error) {
        // Relations not available for this version (e.g., Drizzle 0.45.0)
        console.log(
          `[INFO] Relations not available for ${this.id}, skipping...`,
        );
        this.relations = undefined;
      }

      // Create connection pool
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'benchmark',
        password: process.env.DB_PASSWORD || 'benchmark',
        database: process.env.DB_NAME || 'benchmark',
        max: this.config.settings?.connectionPoolSize || 20,
      });

      // Initialize Drizzle with schema (and relations if available)
      if (this.relations) {
        // RQBv2 with relations (Drizzle v1.0+)
        this.db = drizzle({
          client: this.pool,
          schema: this.schema,
          relations: this.relations,
        });
      } else {
        // Without relations (Drizzle v0.45.0)
        this.db = drizzle({
          client: this.pool,
          schema: this.schema,
        });
      }

      // Wrap client for compatibility with existing test scenarios
      this.client = {
        db: this.db,
        schema: this.schema,
        relations: this.relations,
        pool: this.pool,
      };

      this.connected = false;
    } catch (error) {
      throw new Error(
        `Failed to initialize Drizzle adapter: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async connect(): Promise<void> {
    this.ensureInitialized();

    try {
      // Test connection with a simple query using raw SQL
      const result = await this.db!.execute('SELECT 1 as test');

      if (!result) {
        throw new Error('Connection test query returned no result');
      }

      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(
        `Failed to connect Drizzle: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      this.db = undefined;
      this.schema = undefined;
      this.relations = undefined;
      this.pool = undefined;
      this.client = undefined;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.connected || !this.db) {
      return false;
    }

    try {
      await this.db.execute('SELECT 1 as health_check');
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
        'Relational Queries v2',
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
