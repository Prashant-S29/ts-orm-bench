import { config } from 'dotenv';
config();

export const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'benchmark',
  user: process.env.DB_USER || 'benchmark',
  password: process.env.DB_PASSWORD || 'benchmark',
  connectionString: process.env.DATABASE_URL || 
    'postgresql://benchmark:benchmark@localhost:5432/benchmark',
};