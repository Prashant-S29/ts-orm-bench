import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseConfig } from '../../config/database';
import * as schema from './schema';

const connectionString = `postgresql://${databaseConfig.user}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}`;

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.CONNECTION_POOL_SIZE || '20'),
});

export const db = drizzle({ client: pool, schema });

export { pool };
