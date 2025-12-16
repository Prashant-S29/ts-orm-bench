import { drizzle } from 'drizzle-orm-0-45/node-postgres';
import { Pool } from 'pg';
import { databaseConfig } from '../../../config/database';
import * as schema from './schema';

const connectionString = `postgresql://${databaseConfig.user}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}`;

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.CONNECTION_POOL_SIZE || '20'),
});

const db = drizzle(pool, { schema });

export { db, pool, schema };