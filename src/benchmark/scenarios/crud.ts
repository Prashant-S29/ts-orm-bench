import { eq, like } from 'drizzle-orm';
import type { TestScenario, ORM } from '../types';

/**
 * Test: Single record SELECT by primary key
 * Purpose: Measure baseline ORM overhead with simplest query
 * Expected: Sub-millisecond latency, minimal memory allocation
 * Note: IDs 1-100000 exist from seeding
 */
export const selectByIdScenario: TestScenario = {
  id: 'select_by_id',
  name: 'SELECT by Primary Key',
  description: 'Fetch a single user by ID',
  category: 'crud',
  execute: async (orm: ORM) => {
    // Random ID between 1 and 100000 (all exist from seeding)
    const randomId = Math.floor(Math.random() * 100000) + 1;

    if (orm.name === 'drizzle') {
      const { db, schema } = orm.client;
      await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, randomId))
        .limit(1);
    } else {
      await orm.client.user.findUnique({
        where: { id: randomId },
      });
    }
  },
};

/**
 * Test: Single record SELECT with WHERE clause
 * Purpose: Test query with indexed email column
 */
export const selectByEmailScenario: TestScenario = {
  id: 'select_by_email',
  name: 'SELECT by Email (Indexed)',
  description: 'Fetch a single user by email pattern',
  category: 'crud',
  execute: async (orm: ORM) => {
    const randomId = Math.floor(Math.random() * 100000);
    // Match the seeding pattern: user{index}_{faker.email}
    const emailPattern = `user${randomId}_%`;

    if (orm.name === 'drizzle') {
      const { db, schema } = orm.client;
      await db
        .select()
        .from(schema.users)
        .where(like(schema.users.email, emailPattern))
        .limit(1);
    } else {
      await orm.client.user.findFirst({
        where: {
          email: {
            startsWith: `user${randomId}_`,
          },
        },
      });
    }
  },
};

/**
 * Test: Multiple records with pagination
 * Purpose: Test LIMIT/OFFSET performance
 */
export const selectWithPaginationScenario: TestScenario = {
  id: 'select_pagination',
  name: 'SELECT with Pagination',
  description: 'Fetch 50 users with offset',
  category: 'crud',
  execute: async (orm: ORM) => {
    // Max offset: 100000 - 50 = 99950
    const randomOffset = Math.floor(Math.random() * 99950);

    if (orm.name === 'drizzle') {
      const { db, schema } = orm.client;
      await db.select().from(schema.users).limit(50).offset(randomOffset);
    } else {
      await orm.client.user.findMany({
        take: 50,
        skip: randomOffset,
      });
    }
  },
};

/**
 * Test: Single record INSERT
 * Purpose: Measure write performance
 */
export const insertSingleScenario: TestScenario = {
  id: 'insert_single',
  name: 'INSERT Single Record',
  description: 'Insert a single user',
  category: 'crud',
  execute: async (orm: ORM) => {
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

    if (orm.name === 'drizzle') {
      const { db, schema } = orm.client;
      await db.insert(schema.users).values(userData);
    } else {
      await orm.client.user.create({
        data: userData,
      });
    }
  },
};

/**
 * Test: Single record UPDATE
 * Purpose: Measure update performance on EXISTING records
 * Note: Uses only IDs 1-100000 which are guaranteed to exist from seeding
 */
export const updateSingleScenario: TestScenario = {
  id: 'update_single',
  name: 'UPDATE Single Record',
  description: 'Update a single existing user',
  category: 'crud',
  execute: async (orm: ORM) => {
    // Only use IDs 1-100000 which exist from seeding
    const randomId = Math.floor(Math.random() * 100000) + 1;

    if (orm.name === 'drizzle') {
      const { db, schema } = orm.client;
      await db
        .update(schema.users)
        .set({ firstName: 'Updated' })
        .where(eq(schema.users.id, randomId));
    } else {
      // Use updateMany to match Drizzle's behavior (no error if not found)
      // This is fair because both ORMs now have identical behavior
      await orm.client.user.updateMany({
        where: { id: randomId },
        data: { firstName: 'Updated' },
      });
    }
  },
};

/**
 * Test: Single record DELETE
 * Purpose: Measure delete performance
 * Note: Inserts then deletes to ensure fair comparison
 */
export const deleteSingleScenario: TestScenario = {
  id: 'delete_single',
  name: 'DELETE Single Record',
  description: 'Delete a single user (insert + delete)',
  category: 'crud',
  execute: async (orm: ORM) => {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 1000000);
    const email = `delete_test_${timestamp}_${randomId}@example.com`;

    if (orm.name === 'drizzle') {
      const { db, schema } = orm.client;
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
    } else {
      const created = await orm.client.user.create({
        data: {
          email,
          username: `delete_test_${timestamp}_${randomId}`,
          firstName: 'Delete',
          lastName: 'Test',
          passwordHash: 'hash',
          isActive: true,
        },
      });

      await orm.client.user.delete({
        where: { id: created.id },
      });
    }
  },
};

/**
 * Test: Bulk INSERT
 * Purpose: Test batch insert performance
 */
export const bulkInsertScenario: TestScenario = {
  id: 'bulk_insert',
  name: 'Bulk INSERT (100 records)',
  description: 'Insert 100 users in one operation',
  category: 'crud',
  execute: async (orm: ORM) => {
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

    if (orm.name === 'drizzle') {
      const { db, schema } = orm.client;
      await db.insert(schema.users).values(users);
    } else {
      await orm.client.user.createMany({
        data: users,
      });
    }
  },
};

// Export all CRUD scenarios
export const crudScenarios: TestScenario[] = [
  selectByIdScenario,
  selectByEmailScenario,
  selectWithPaginationScenario,
  insertSingleScenario,
  updateSingleScenario,
  deleteSingleScenario,
  bulkInsertScenario,
];
