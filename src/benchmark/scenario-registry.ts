/**
 * Scenario Registry
 * Central registry for all test scenarios with ORM adapter support
 */

import type { IORMAdapter } from '../adapters/orm-adapter.interface';
import { eq, like } from 'drizzle-orm';

export type ScenarioExecuteFn = (adapter: IORMAdapter) => Promise<void>;

export class ScenarioRegistry {
  private scenarios = new Map<string, ScenarioExecuteFn>();

  constructor() {
    this.registerDefaultScenarios();
  }

  /**
   * Register a scenario
   */
  register(scenarioId: string, executeFn: ScenarioExecuteFn): void {
    this.scenarios.set(scenarioId, executeFn);
  }

  /**
   * Get a scenario
   */
  get(scenarioId: string): ScenarioExecuteFn | undefined {
    return this.scenarios.get(scenarioId);
  }

  /**
   * Get all scenarios
   */
  getAll(): Map<string, ScenarioExecuteFn> {
    return this.scenarios;
  }

  /**
   * Register default CRUD scenarios
   */
  private registerDefaultScenarios(): void {
    // SELECT by ID
    this.register('select_by_id', async (adapter: IORMAdapter) => {
      const randomId = Math.floor(Math.random() * 100000) + 1;

      if (adapter.name === 'drizzle') {
        const { db, schema } = adapter.getClient();
        await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, randomId))
          .limit(1);
      } else if (adapter.name === 'prisma') {
        const client = adapter.getClient();
        await client.user.findUnique({
          where: { id: randomId },
        });
      }
    });

    // SELECT by Email
    this.register('select_by_email', async (adapter: IORMAdapter) => {
      const randomId = Math.floor(Math.random() * 100000);
      const emailPattern = `user${randomId}_%`;

      if (adapter.name === 'drizzle') {
        const { db, schema } = adapter.getClient();
        await db
          .select()
          .from(schema.users)
          .where(like(schema.users.email, emailPattern))
          .limit(1);
      } else if (adapter.name === 'prisma') {
        const client = adapter.getClient();
        await client.user.findFirst({
          where: {
            email: {
              startsWith: `user${randomId}_`,
            },
          },
        });
      }
    });

    // SELECT with Pagination
    this.register('select_pagination', async (adapter: IORMAdapter) => {
      const randomOffset = Math.floor(Math.random() * 99950);

      if (adapter.name === 'drizzle') {
        const { db, schema } = adapter.getClient();
        await db.select().from(schema.users).limit(50).offset(randomOffset);
      } else if (adapter.name === 'prisma') {
        const client = adapter.getClient();
        await client.user.findMany({
          take: 50,
          skip: randomOffset,
        });
      }
    });

    // INSERT Single
    this.register('insert_single', async (adapter: IORMAdapter) => {
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 1000000);

      const userData = {
        email: `test_${timestamp}_${randomId}@example.com`,
        username: `test_${timestamp}_${randomId}`,
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hash123',
        isActive: true,
        createdAt: new Date(),
      };

      if (adapter.name === 'drizzle') {
        const { db, schema } = adapter.getClient();
        await db.insert(schema.users).values(userData);
      } else if (adapter.name === 'prisma') {
        const client = adapter.getClient();
        await client.user.create({
          data: userData,
        });
      }
    });

    // UPDATE Single
    this.register('update_single', async (adapter: IORMAdapter) => {
      const randomId = Math.floor(Math.random() * 100000) + 1;

      if (adapter.name === 'drizzle') {
        const { db, schema } = adapter.getClient();
        await db
          .update(schema.users)
          .set({ firstName: 'Updated' })
          .where(eq(schema.users.id, randomId));
      } else if (adapter.name === 'prisma') {
        const client = adapter.getClient();
        await client.user.updateMany({
          where: { id: randomId },
          data: { firstName: 'Updated' },
        });
      }
    });

    // DELETE Single
    this.register('delete_single', async (adapter: IORMAdapter) => {
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 1000000);
      const email = `delete_test_${timestamp}_${randomId}@example.com`;

      if (adapter.name === 'drizzle') {
        const { db, schema } = adapter.getClient();
        const result = await db
          .insert(schema.users)
          .values({
            email,
            username: `delete_test_${timestamp}_${randomId}`,
            firstName: 'Delete',
            lastName: 'Test',
            passwordHash: 'hash',
            isActive: true,
            createdAt: new Date(),
          })
          .returning({ id: schema.users.id });
        const insertedId = result[0].id;

        await db.delete(schema.users).where(eq(schema.users.id, insertedId));
      } else if (adapter.name === 'prisma') {
        const client = adapter.getClient();
        const created = await client.user.create({
          data: {
            email,
            username: `delete_test_${timestamp}_${randomId}`,
            firstName: 'Delete',
            lastName: 'Test',
            passwordHash: 'hash',
            isActive: true,
          },
        });

        await client.user.delete({
          where: { id: created.id },
        });
      }
    });

    // Bulk INSERT
    this.register('bulk_insert', async (adapter: IORMAdapter) => {
      const timestamp = Date.now();
      const users = Array.from({ length: 100 }, (_, i) => ({
        email: `bulk_${timestamp}_${i}@example.com`,
        username: `bulk_${timestamp}_${i}`,
        firstName: 'Bulk',
        lastName: 'User',
        passwordHash: 'hash',
        isActive: true,
        createdAt: new Date(),
      }));

      if (adapter.name === 'drizzle') {
        const { db, schema } = adapter.getClient();
        await db.insert(schema.users).values(users);
      } else if (adapter.name === 'prisma') {
        const client = adapter.getClient();
        await client.user.createMany({
          data: users,
        });
      }
    });
  }
}
