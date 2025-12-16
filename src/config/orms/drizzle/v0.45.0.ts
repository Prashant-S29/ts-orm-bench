import type { ORMConfig } from '../../test-config';

export const drizzleV045Config: ORMConfig = {
  id: 'drizzle-v0.45.0',
  name: 'drizzle',
  version: '0.45.0',
  status: 'enabled',
  schemaPath: 'orms/drizzle/v0.45.0/schema.ts',
  clientPath: 'orms/drizzle/v0.45.0/client.ts',
  dependencies: {
    'drizzle-orm': '0.45.0',
    pg: '^8.11.3',
  },
  settings: {
    connectionPoolSize: 20,
    logging: false,
    timeout: 30000,
  },
};
