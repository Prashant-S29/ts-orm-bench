import {
  db as drizzleDb,
  pool as drizzlePool,
  schema as drizzleSchema,
} from './orms/drizzle/db';
import {
  prisma as prismaClient,
  pool as prismaPool,
} from './orms/prisma/client';
import { BenchmarkSuite } from './benchmark';
import { logger } from './utils/logger';
import { ORM } from './benchmark/types';

async function main() {
  logger.info('ORM Benchmark System');
  logger.info(`Database: ${process.env.DB_NAME || 'benchmark'}`);

  // Initialize ORMs
  const drizzleORM: ORM = {
    name: 'drizzle' as const,
    version: '1.0.0-beta.2',
    client: {
      db: drizzleDb,
      schema: drizzleSchema,
    },
    disconnect: async () => {
      await drizzlePool.end();
    },
  };

  const prismaORM: ORM = {
    name: 'prisma' as const,
    version: '7.1.0', // Get from package.json
    client: prismaClient,
    disconnect: async () => {
      await prismaClient.$disconnect();
      await prismaPool.end();
    },
  };

  // Test connections
  try {
    await drizzleDb.select().from(drizzleSchema.users).limit(1);
    logger.success('✓ Drizzle connected');
  } catch (error) {
    logger.error('✗ Drizzle connection failed:', error);
    process.exit(1);
  }

  try {
    await prismaClient.user.findFirst();
    logger.success('✓ Prisma connected');
  } catch (error) {
    logger.error('✗ Prisma connection failed:', error);
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  const benchmark = new BenchmarkSuite();

  try {
    if (command === 'all' || !command) {
      // Run all tests
      await benchmark.runAll([drizzleORM, prismaORM]);
    } else if (command === 'scenario') {
      // Run specific scenario
      const scenarioId = args[1];
      if (!scenarioId) {
        logger.error('Please specify a scenario ID');
        process.exit(1);
      }
      await benchmark.runScenario(scenarioId, [drizzleORM, prismaORM]);
    } else {
      logger.error(`Unknown command: ${command}`);
      logger.info('Usage:');
      logger.info('  pnpm test           - Run all tests');
      logger.info('  pnpm test all       - Run all tests');
      logger.info('  pnpm test scenario <id> - Run specific scenario');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Benchmark failed:', error);
    process.exit(1);
  } finally {
    await drizzleORM.disconnect();
    await prismaORM.disconnect();
  }
}

main();
