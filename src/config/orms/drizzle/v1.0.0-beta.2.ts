/**
 * Drizzle v1.0.0-beta.2 Configuration
 */

import type { ORMConfig } from '../../test-config';

export const drizzleV1Config: ORMConfig = {
  id: 'drizzle-v1.0.0-beta.2',
  name: 'drizzle',
  version: '1.0.0-beta.2',
  status: 'enabled',
  schemaPath: 'orms/drizzle/v1.0.0-beta.2/schema.ts',
  clientPath: 'orms/drizzle/v1.0.0-beta.2/client.ts',
  dependencies: {
    'drizzle-orm': '1.0.0-beta.2',
    pg: '^8.11.3',
  },
  settings: {
    connectionPoolSize: 20,
    logging: false,
    timeout: 30000,
  },
};
