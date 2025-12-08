import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { databaseConfig } from '../../config/database';

const connectionString = `postgresql://${databaseConfig.user}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}`;

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.CONNECTION_POOL_SIZE || '20'),
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export { pool };
