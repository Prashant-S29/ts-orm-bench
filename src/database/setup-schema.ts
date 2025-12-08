import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { databaseConfig } from '../config/database';
import { logger } from '../utils/logger';

async function setupSchema() {
  logger.info('Setting up database schema...\n');

  const pool = new Pool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.user,
    password: databaseConfig.password,
  });

  try {
    const client = await pool.connect();

    // Read SQL file
    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

    // Execute schema
    logger.info('Executing schema SQL...');
    await client.query(schemaSQL);
    logger.success('✓ Schema created successfully');

    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    logger.success(`✓ Created ${result.rows.length} tables:`);
    result.rows.forEach((row) => {
      logger.info(`  - ${row.table_name}`);
    });

    client.release();
    await pool.end();

    logger.success('\n✓ Database schema setup complete!');
  } catch (error) {
    logger.error('✗ Schema setup failed:', error);
    await pool.end();
    process.exit(1);
  }
}

setupSchema();
