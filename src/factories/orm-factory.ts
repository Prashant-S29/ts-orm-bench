/**
 * ORM Factory
 * Creates ORM adapters based on configuration
 */

import type { ORMConfig } from '../config/test-config';
import type { IORMAdapter } from '../adapters/orm-adapter.interface';
import { DrizzleAdapter } from '../adapters/drizzle-adapter';
import { PrismaAdapter } from '../adapters/prisma-adapter';

export class ORMFactory {
  /**
   * Create an ORM adapter based on configuration
   */
  static create(config: ORMConfig): IORMAdapter {
    switch (config.name.toLowerCase()) {
      case 'drizzle':
        return new DrizzleAdapter(config);

      case 'prisma':
        return new PrismaAdapter(config);

      default:
        throw new Error(`Unsupported ORM: ${config.name}`);
    }
  }

  /**
   * Create multiple ORM adapters
   */
  static createMany(configs: ORMConfig[]): IORMAdapter[] {
    return configs.map((config) => this.create(config));
  }

  /**
   * Create and initialize an ORM adapter
   */
  static async createAndInitialize(config: ORMConfig): Promise<IORMAdapter> {
    const adapter = this.create(config);
    await adapter.initialize();
    return adapter;
  }

  /**
   * Create and initialize multiple ORM adapters
   */
  static async createAndInitializeMany(
    configs: ORMConfig[],
  ): Promise<IORMAdapter[]> {
    const adapters = this.createMany(configs);
    await Promise.all(adapters.map((adapter) => adapter.initialize()));
    return adapters;
  }
}
