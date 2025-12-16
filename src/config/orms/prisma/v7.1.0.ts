import type { ORMConfig } from '../../test-config';

export const prismaV7Config: ORMConfig = {
  id: 'prisma-v7.1.0',
  name: 'prisma',
  version: '7.1.0',
  status: 'enabled',
  schemaPath: 'orms/prisma/v7.1.0/schema.prisma',
  clientPath: 'orms/prisma/v7.1.0/client.ts',
  dependencies: {
    '@prisma/client': '7.1.0',
    '@prisma/adapter-pg': '7.1.0',
    pg: '^8.11.3',
  },
  settings: {
    connectionPoolSize: 20,
    logging: false,
    timeout: 30000,
  },
};
