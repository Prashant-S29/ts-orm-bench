import { Pool } from 'pg';
import { databaseConfig } from '../config/database';
import { logger } from '../utils/logger';

async function preflight() {
  logger.info('Running preflight checks...\n');

  try {
    const pool = new Pool(databaseConfig);
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    logger.success('✓ PostgreSQL connected');
    logger.info(`  ${result.rows[0].version.split(',')[0]}`);
    client.release();
    await pool.end();
  } catch (error) {
    logger.error('✗ PostgreSQL connection failed', error);
    process.exit(1);
  }

  logger.success('\nEnvironment ready!');
}

preflight();