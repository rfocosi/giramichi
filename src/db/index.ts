import dotenv from 'dotenv';
import { IDatabaseAdapter } from './types.js';
import { SqliteAdapter } from './adapters/sqliteAdapter.js';
import { PostgresAdapter } from './adapters/postgresAdapter.js';
import { MysqlAdapter } from './adapters/mysqlAdapter.js';
import { MssqlAdapter } from './adapters/mssqlAdapter.js';

dotenv.config();

function createDatabaseAdapter(): IDatabaseAdapter {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  console.log(`[Giramichi DB Factory] Initializing database backend: "${dbType}"`);

  switch (dbType) {
    case 'postgres':
    case 'postgresql':
    case 'pg':
      return new PostgresAdapter();
    case 'mysql':
    case 'mariadb':
      return new MysqlAdapter();
    case 'mssql':
    case 'sqlserver':
      return new MssqlAdapter();
    case 'sqlite':
    default:
      return new SqliteAdapter();
  }
}

export const db: IDatabaseAdapter = createDatabaseAdapter();

// Initialize the database engine automatically
await db.init().catch((err) => {
  console.error('[Giramichi DB Initialization Error]', err);
});

export * from './types.js';
