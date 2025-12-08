import { logger } from './utils/logger';
import { databaseConfig } from './config/database';

logger.info('ORM Benchmark System');
logger.info('Database: ' + databaseConfig.database);
logger.success('System initialized!');
