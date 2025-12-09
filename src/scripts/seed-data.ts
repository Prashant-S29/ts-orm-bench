import { faker } from '@faker-js/faker';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { databaseConfig } from '../config/database';

// Seed configuration
const SEED = 42;
const DATA_CONFIG = {
  users: 100_000,
  categories: 50,
  products: 50_000,
  tags: 200,
};

faker.seed(SEED);

interface SeedResult {
  table: string;
  count: number;
  duration: number;
}

class RawSQLSeeder {
  private pool: Pool;
  private results: SeedResult[] = [];

  constructor() {
    this.pool = new Pool({
      host: databaseConfig.host,
      port: databaseConfig.port,
      database: databaseConfig.database,
      user: databaseConfig.user,
      password: databaseConfig.password,
    });
  }

  async seedUsers(count: number): Promise<number[]> {
    logger.info(`Seeding ${count} users...`);
    const start = performance.now();

    const userIds: number[] = [];
    const batchSize = 1000;
    const usedEmails = new Set<string>();
    const usedUsernames = new Set<string>();

    for (let i = 0; i < count; i += batchSize) {
      const values: string[] = [];
      const params: any[] = [];
      const currentBatch = Math.min(batchSize, count - i);

      for (let j = 0; j < currentBatch; j++) {
        const paramOffset = params.length;
        values.push(
          `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${
            paramOffset + 4
          }, $${paramOffset + 5}, $${paramOffset + 6}, $${paramOffset + 7})`,
        );
        const batchIndex = i + j;

        // Generate unique email
        let email: string;
        do {
          email = `user${batchIndex}_${faker.internet.email()}`.toLowerCase();
        } while (usedEmails.has(email));
        usedEmails.add(email);

        // Generate unique username
        let username: string;
        do {
          username =
            `user${batchIndex}_${faker.internet.username()}`.toLowerCase();
        } while (usedUsernames.has(username));
        usedUsernames.add(username);

        params.push(
          email,
          username,
          faker.person.firstName(),
          faker.person.lastName(),
          faker.string.alphanumeric(60), // password_hash
          faker.datatype.boolean() ? true : false, // Explicitly cast to boolean
          new Date(),
        );
      }

      const query = `
        INSERT INTO users (email, username, first_name, last_name, password_hash, is_active, created_at)
        VALUES ${values.join(', ')}
        RETURNING id
      `;

      const result = await this.pool.query(query, params);
      userIds.push(...result.rows.map((r) => r.id));

      if ((i + batchSize) % 10000 === 0) {
        logger.info(`  Inserted ${i + batchSize} users...`);
      }
    }

    const duration = performance.now() - start;
    this.results.push({ table: 'users', count, duration });
    logger.success(
      `✓ Seeded ${count} users in ${(duration / 1000).toFixed(2)}s`,
    );

    return userIds;
  }

  async seedCategories(count: number): Promise<number[]> {
    logger.info(`Seeding ${count} categories...`);
    const start = performance.now();

    const categoryIds: number[] = [];
    const usedSlugs = new Set<string>();

    // Create root categories (20%)
    const rootCount = Math.floor(count * 0.2);
    const rootValues: string[] = [];
    const rootParams: any[] = [];

    for (let i = 0; i < rootCount; i++) {
      const paramOffset = rootParams.length;
      rootValues.push(
        `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3})`,
      );
      const dept = faker.commerce.department();
      const slug = `${faker.helpers.slugify(dept)}-${i}`.toLowerCase();
      usedSlugs.add(slug);
      rootParams.push(dept, slug, new Date());
    }

    const rootQuery = `
      INSERT INTO categories (name, slug, created_at)
      VALUES ${rootValues.join(', ')}
      RETURNING id
    `;

    const rootResult = await this.pool.query(rootQuery, rootParams);
    categoryIds.push(...rootResult.rows.map((r) => r.id));

    // Create child categories (80%)
    const childCount = count - rootCount;
    const childValues: string[] = [];
    const childParams: any[] = [];

    for (let i = 0; i < childCount; i++) {
      const paramOffset = childParams.length;
      childValues.push(
        `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${
          paramOffset + 4
        })`,
      );
      const dept = faker.commerce.department();
      const slug = `${faker.helpers.slugify(dept)}-${
        rootCount + i
      }`.toLowerCase();
      usedSlugs.add(slug);
      childParams.push(
        dept,
        slug,
        faker.helpers.arrayElement(categoryIds),
        new Date(),
      );
    }

    const childQuery = `
      INSERT INTO categories (name, slug, parent_id, created_at)
      VALUES ${childValues.join(', ')}
      RETURNING id
    `;

    const childResult = await this.pool.query(childQuery, childParams);
    categoryIds.push(...childResult.rows.map((r) => r.id));

    const duration = performance.now() - start;
    this.results.push({ table: 'categories', count, duration });
    logger.success(
      `✓ Seeded ${count} categories in ${(duration / 1000).toFixed(2)}s`,
    );

    return categoryIds;
  }

  async seedProducts(count: number, categoryIds: number[]): Promise<number[]> {
    logger.info(`Seeding ${count} products...`);
    const start = performance.now();

    const productIds: number[] = [];
    const batchSize = 1000;
    const usedSkus = new Set<string>();

    for (let i = 0; i < count; i += batchSize) {
      const values: string[] = [];
      const params: any[] = [];
      const currentBatch = Math.min(batchSize, count - i);

      for (let j = 0; j < currentBatch; j++) {
        const paramOffset = params.length;
        values.push(
          `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${
            paramOffset + 4
          }, $${paramOffset + 5}, $${paramOffset + 6}, $${paramOffset + 7}, $${
            paramOffset + 8
          })`,
        );
        const batchIndex = i + j;

        // Generate unique SKU
        let sku: string;
        do {
          sku = `SKU-${batchIndex}-${faker.string.alphanumeric(
            6,
          )}`.toUpperCase();
        } while (usedSkus.has(sku));
        usedSkus.add(sku);

        params.push(
          sku,
          faker.commerce.productName(),
          faker.commerce.productDescription(),
          parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
          faker.helpers.arrayElement(categoryIds),
          faker.number.int({ min: 0, max: 1000 }),
          faker.datatype.boolean() ? true : false, // Explicitly cast to boolean
          new Date(),
        );
      }

      const query = `
        INSERT INTO products (sku, name, description, price, category_id, inventory_count, is_active, created_at)
        VALUES ${values.join(', ')}
        RETURNING id
      `;

      const result = await this.pool.query(query, params);
      productIds.push(...result.rows.map((r) => r.id));

      if ((i + batchSize) % 10000 === 0) {
        logger.info(`  Inserted ${i + batchSize} products...`);
      }
    }

    const duration = performance.now() - start;
    this.results.push({ table: 'products', count, duration });
    logger.success(
      `✓ Seeded ${count} products in ${(duration / 1000).toFixed(2)}s`,
    );

    return productIds;
  }

  async seedTags(count: number): Promise<number[]> {
    logger.info(`Seeding ${count} tags...`);
    const start = performance.now();

    const values: string[] = [];
    const params: any[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Generate unique tag name
      let name: string;
      let attempts = 0;
      do {
        name = faker.word.noun();
        attempts++;
        // If we can't find a unique noun after 100 attempts, append index
        if (attempts > 100) {
          name = `${faker.word.noun()}-${i}`;
          break;
        }
      } while (usedNames.has(name));

      usedNames.add(name);

      const paramOffset = params.length;
      values.push(
        `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3})`,
      );
      params.push(
        name,
        `${faker.helpers.slugify(name)}-${i}`.toLowerCase(),
        new Date(),
      );
    }

    const query = `
      INSERT INTO tags (name, slug, created_at)
      VALUES ${values.join(', ')}
      RETURNING id
    `;

    const result = await this.pool.query(query, params);
    const tagIds = result.rows.map((r) => r.id);

    const duration = performance.now() - start;
    this.results.push({ table: 'tags', count, duration });
    logger.success(
      `✓ Seeded ${count} tags in ${(duration / 1000).toFixed(2)}s`,
    );

    return tagIds;
  }

  async seedProductTags(productIds: number[], tagIds: number[]): Promise<void> {
    logger.info(`Seeding product-tag relationships...`);
    const start = performance.now();

    const relations: Array<{ productId: number; tagId: number }> = [];

    for (const productId of productIds) {
      const numTags = faker.number.int({ min: 1, max: 5 });
      const selectedTags = faker.helpers.arrayElements(tagIds, numTags);

      for (const tagId of selectedTags) {
        relations.push({ productId, tagId });
      }
    }

    const batchSize = 5000;
    let count = 0;

    for (let i = 0; i < relations.length; i += batchSize) {
      const batch = relations.slice(i, i + batchSize);
      const values: string[] = [];
      const params: any[] = [];

      batch.forEach((rel) => {
        const paramOffset = params.length;
        values.push(`($${paramOffset + 1}, $${paramOffset + 2})`);
        params.push(rel.productId, rel.tagId);
      });

      const query = `
        INSERT INTO product_tags (product_id, tag_id)
        VALUES ${values.join(', ')}
      `;

      await this.pool.query(query, params);
      count += batch.length;

      if (count % 50000 === 0) {
        logger.info(`  Inserted ${count} product-tag relations...`);
      }
    }

    const duration = performance.now() - start;
    this.results.push({ table: 'product_tags', count, duration });
    logger.success(
      `✓ Seeded ${count} product-tag relations in ${(duration / 1000).toFixed(
        2,
      )}s`,
    );
  }

  async seedOrders(userIds: number[], productIds: number[]): Promise<void> {
    logger.info(`Seeding orders...`);
    const start = performance.now();

    const orderStatuses = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];
    let totalOrders = 0;
    let totalOrderItems = 0;

    const batchSize = 500;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const userBatch = userIds.slice(i, i + batchSize);
      const orderValues: string[] = [];
      const orderParams: any[] = [];

      for (const userId of userBatch) {
        const numOrders = faker.number.int({ min: 1, max: 10 });

        for (let j = 0; j < numOrders; j++) {
          const paramOffset = orderParams.length;
          const orderNum = `ORD-${Date.now()}-${userId}-${j}-${faker.string.alphanumeric(
            4,
          )}`;
          orderValues.push(
            `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${
              paramOffset + 4
            }, $${paramOffset + 5}, $${paramOffset + 6}, $${paramOffset + 7})`,
          );
          const shippingAddress = {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zip: faker.location.zipCode(),
          };
          orderParams.push(
            orderNum,
            userId,
            faker.helpers.arrayElement(orderStatuses),
            0, // total_amount (will update later)
            JSON.stringify(shippingAddress),
            JSON.stringify(shippingAddress), // billing same as shipping
            new Date(),
          );
        }
      }

      const orderQuery = `
        INSERT INTO orders (order_number, user_id, status, total_amount, shipping_address_json, billing_address_json, created_at)
        VALUES ${orderValues.join(', ')}
        RETURNING id
      `;

      const orderResult = await this.pool.query(orderQuery, orderParams);
      totalOrders += orderResult.rows.length;

      const itemValues: string[] = [];
      const itemParams: any[] = [];

      for (const order of orderResult.rows) {
        const numItems = faker.number.int({ min: 1, max: 5 });
        const selectedProducts = faker.helpers.arrayElements(
          productIds,
          numItems,
        );

        for (const productId of selectedProducts) {
          const quantity = faker.number.int({ min: 1, max: 3 });
          const unitPrice = parseFloat(
            faker.commerce.price({ min: 10, max: 500 }),
          );

          const paramOffset = itemParams.length;
          itemValues.push(
            `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${
              paramOffset + 4
            }, $${paramOffset + 5}, $${paramOffset + 6})`,
          );
          itemParams.push(
            order.id,
            productId,
            JSON.stringify({ name: faker.commerce.productName() }), // product_snapshot_json
            quantity,
            unitPrice,
            quantity * unitPrice,
          );
        }
      }

      if (itemValues.length > 0) {
        const itemQuery = `
          INSERT INTO order_items (order_id, product_id, product_snapshot_json, quantity, unit_price, subtotal)
          VALUES ${itemValues.join(', ')}
        `;
        await this.pool.query(itemQuery, itemParams);
        totalOrderItems += itemValues.length;
      }

      if (totalOrders % 10000 === 0) {
        logger.info(`  Inserted ${totalOrders} orders...`);
      }
    }

    const duration = performance.now() - start;
    this.results.push({ table: 'orders', count: totalOrders, duration });
    this.results.push({
      table: 'order_items',
      count: totalOrderItems,
      duration: 0,
    });
    logger.success(
      `✓ Seeded ${totalOrders} orders with ${totalOrderItems} items in ${(
        duration / 1000
      ).toFixed(2)}s`,
    );
  }

  async seedReviews(userIds: number[], productIds: number[]): Promise<void> {
    logger.info(`Seeding reviews...`);
    const start = performance.now();

    const productsWithReviews = faker.helpers.arrayElements(
      productIds,
      Math.floor(productIds.length * 0.2),
    );

    const allReviews: any[] = [];

    for (const productId of productsWithReviews) {
      const numReviews = faker.number.int({ min: 1, max: 10 });

      for (let i = 0; i < numReviews; i++) {
        allReviews.push({
          productId,
          userId: faker.helpers.arrayElement(userIds),
          rating: faker.number.int({ min: 1, max: 5 }),
          title: faker.lorem.sentence(),
          comment: faker.lorem.paragraph(),
          helpfulCount: faker.number.int({ min: 0, max: 50 }),
          isVerifiedPurchase: faker.datatype.boolean() ? true : false,
          createdAt: faker.date.past({ years: 1 }),
        });
      }
    }

    const batchSize = 5000;
    let count = 0;

    for (let i = 0; i < allReviews.length; i += batchSize) {
      const batch = allReviews.slice(i, i + batchSize);
      const values: string[] = [];
      const params: any[] = [];

      batch.forEach((review) => {
        const paramOffset = params.length;
        values.push(
          `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${
            paramOffset + 4
          }, $${paramOffset + 5}, $${paramOffset + 6}, $${paramOffset + 7})`,
        );
        params.push(
          review.productId,
          review.userId,
          review.rating,
          review.title,
          review.comment,
          review.helpfulCount,
          review.isVerifiedPurchase,
        );
      });

      const query = `
        INSERT INTO reviews (product_id, user_id, rating, title, comment, helpful_count, is_verified_purchase)
        VALUES ${values.join(', ')}
      `;

      await this.pool.query(query, params);
      count += batch.length;

      if (count % 50000 === 0) {
        logger.info(`  Inserted ${count} reviews...`);
      }
    }

    const duration = performance.now() - start;
    this.results.push({ table: 'reviews', count, duration });
    logger.success(
      `✓ Seeded ${count} reviews in ${(duration / 1000).toFixed(2)}s`,
    );
  }

  async seedInventoryLogs(productIds: number[]): Promise<void> {
    logger.info(`Seeding inventory logs...`);
    const start = performance.now();

    const reasons = ['sale', 'restock', 'adjustment', 'return'];
    const allLogs: any[] = [];

    for (const productId of productIds) {
      const numLogs = faker.number.int({ min: 5, max: 15 });
      let currentCount = faker.number.int({ min: 100, max: 500 });

      for (let i = 0; i < numLogs; i++) {
        const changeAmount = faker.number.int({ min: -50, max: 100 });
        const previousCount = currentCount;
        currentCount = Math.max(0, currentCount + changeAmount);

        allLogs.push({
          productId,
          changeAmount,
          reason: faker.helpers.arrayElement(reasons),
          previousCount,
          newCount: currentCount,
          createdAt: faker.date.past({ years: 1 }),
        });
      }
    }

    const batchSize = 10000;
    let count = 0;

    for (let i = 0; i < allLogs.length; i += batchSize) {
      const batch = allLogs.slice(i, i + batchSize);
      const values: string[] = [];
      const params: any[] = [];

      batch.forEach((log) => {
        const paramOffset = params.length;
        values.push(
          `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${
            paramOffset + 4
          }, $${paramOffset + 5})`,
        );
        params.push(
          log.productId,
          log.changeAmount,
          log.reason,
          log.previousCount,
          log.newCount,
        );
      });

      const query = `
        INSERT INTO inventory_logs (product_id, change_amount, reason, previous_count, new_count)
        VALUES ${values.join(', ')}
      `;

      await this.pool.query(query, params);
      count += batch.length;

      if (count % 100000 === 0) {
        logger.info(`  Inserted ${count} inventory logs...`);
      }
    }

    const duration = performance.now() - start;
    this.results.push({ table: 'inventory_logs', count, duration });
    logger.success(
      `✓ Seeded ${count} inventory logs in ${(duration / 1000).toFixed(2)}s`,
    );
  }

  async clearDatabase(): Promise<void> {
    logger.info('Clearing existing data...');

    try {
      await this.pool.query('TRUNCATE TABLE inventory_logs CASCADE');
      await this.pool.query('TRUNCATE TABLE reviews CASCADE');
      await this.pool.query('TRUNCATE TABLE order_items CASCADE');
      await this.pool.query('TRUNCATE TABLE orders CASCADE');
      await this.pool.query('TRUNCATE TABLE product_tags CASCADE');
      await this.pool.query('TRUNCATE TABLE tags CASCADE');
      await this.pool.query('TRUNCATE TABLE products CASCADE');
      await this.pool.query('TRUNCATE TABLE categories CASCADE');
      await this.pool.query('TRUNCATE TABLE users CASCADE');

      logger.success('✓ Database cleared');
    } catch (error: any) {
      if (error.code === '42P01') {
        logger.warn(
          '⚠ Tables do not exist yet, skipping clear (this is normal for first run)',
        );
      } else {
        throw error;
      }
    }
  }

  printResults(): void {
    logger.info('\n=== Seeding Results ===');

    let totalDuration = 0;
    let totalRecords = 0;

    for (const result of this.results) {
      totalDuration += result.duration;
      totalRecords += result.count;
      logger.info(
        `  ${result.table.padEnd(20)} ${result.count
          .toLocaleString()
          .padStart(10)} records in ${(result.duration / 1000).toFixed(2)}s`,
      );
    }

    logger.info('\n' + '='.repeat(50));
    logger.info(`  Total Records: ${totalRecords.toLocaleString()}`);
    logger.info(`  Total Time: ${(totalDuration / 1000).toFixed(2)}s`);
    logger.info('='.repeat(50) + '\n');
  }

  async seed(): Promise<void> {
    const overallStart = performance.now();

    try {
      await this.clearDatabase();

      const userIds = await this.seedUsers(DATA_CONFIG.users);
      const categoryIds = await this.seedCategories(DATA_CONFIG.categories);
      const productIds = await this.seedProducts(
        DATA_CONFIG.products,
        categoryIds,
      );
      const tagIds = await this.seedTags(DATA_CONFIG.tags);

      await this.seedProductTags(productIds, tagIds);
      await this.seedOrders(userIds, productIds);
      await this.seedReviews(userIds, productIds);
      await this.seedInventoryLogs(productIds);

      logger.info('Running VACUUM ANALYZE...');
      await this.pool.query('VACUUM ANALYZE');
      logger.success('✓ VACUUM ANALYZE completed');

      this.printResults();

      const totalTime = (performance.now() - overallStart) / 1000;
      logger.success(
        `\n✓ Database seeding completed in ${totalTime.toFixed(2)}s`,
      );
    } catch (error) {
      logger.error('Seeding failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

async function main() {
  const seeder = new RawSQLSeeder();
  await seeder.seed();
  process.exit(0);
}

main();
