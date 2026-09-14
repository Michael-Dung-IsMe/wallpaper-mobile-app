import { Pool, type QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback nếu không truyền DATABASE_URL dạng connection string
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password123',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'wallpaper-db',
});

// Hàm query helper an toàn
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[db] executed query: { duration: ${duration}ms, rows: ${res.rowCount} }`);
    }
    return res;
  } catch (error) {
    console.error(`[db] query error:`, error);
    throw error;
  }
};
