/**
 * Drizzle Client - Version 1.0.0-beta.2
 * This file is used for standalone initialization (not via adapter)
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseConfig } from '../../../config/database';
import * as schema from './schema';

const connectionString = `postgresql://${databaseConfig.user}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}`;

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.CONNECTION_POOL_SIZE || '20'),
});

const db = drizzle({ client: pool, schema });

// Export db, pool, and schema separately
export { db, pool, schema };
