import type { ORMConfig } from '../../test-config';

export const prismaV6Config: ORMConfig = {
  id: 'prisma-v6.19.0',
  name: 'prisma',
  version: '6.19.0',
  status: 'enabled',
  schemaPath: 'orms/prisma/v6.19.0/schema.prisma',
  clientPath: 'orms/prisma/v6.19.0/client.ts',
  dependencies: {
    '@prisma/client': '6.19.0',
    '@prisma/adapter-pg': '6.19.0',
    pg: '^8.11.3',
  },
  settings: {
    connectionPoolSize: 20,
    logging: false,
    timeout: 30000,
  },
};
