import { logger } from './utils/logger';
import { databaseConfig } from './config/database';
import { db } from './orms/drizzle/db';
import { prisma } from './orms/prisma/client';

async function main() {
  logger.info('ORM Benchmark System');
  logger.info('Database: ' + databaseConfig.database);

  // drizzle
  try {
    await db.execute('SELECT 1');
    logger.success('✓ Drizzle connected');
  } catch (error) {
    logger.error('✗ Drizzle connection failed', error);
  }

  // prisma
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.success('✓ Prisma connected');
  } catch (error) {
    logger.error('✗ Prisma connection failed', error);
  }

  logger.success('System initialized!');

  await prisma.$disconnect();
  process.exit(0);
}

main();
