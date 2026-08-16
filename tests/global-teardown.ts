import fs from 'fs';
import path from 'path';

async function globalTeardown() {
  const dbDir = path.resolve(process.cwd(), process.env.DB_DIR || 'data');
  const testDbFiles = [
    path.join(dbDir, 'giramichi-test.db'),
    path.join(dbDir, 'giramichi-test.db-wal'),
    path.join(dbDir, 'giramichi-test.db-shm'),
  ];

  for (const file of testDbFiles) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`[Playwright Teardown] Removed test database file: ${path.basename(file)}`);
      } catch (err: any) {
        console.warn(`[Playwright Teardown] Could not delete ${path.basename(file)}:`, err.message);
      }
    }
  }
}

export default globalTeardown;
