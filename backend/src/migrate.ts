import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();

async function runMigrations() {
    const client = await pool.connect();
    const migrationsDir = path.join(import.meta.dirname, '../migrations');

    console.log('Starting database migration...');
    console.log(`Scanning migrations directory: ${migrationsDir}`);

    try {
        if (!fs.existsSync(migrationsDir)) {
            throw new Error(`Migrations directory not found at: ${migrationsDir}`);
        }

        // Đọc và sắp xếp các file .sql theo thứ tự tăng dần (001, 002,...)
        const files = fs
            .readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('!! No .sql migration files found.');
            return;
        }

        console.log(`Found ${files.length} migration file(s): ${files.join(', ')}`);

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            console.log(`\n Executing migration: ${file}...`);

            const sqlContent = fs.readFileSync(filePath, 'utf-8');

            // Thực thi nội dung file SQL trong transaction an toàn
            await client.query('BEGIN');
            try {
                await client.query(sqlContent);
                await client.query('COMMIT');
                console.log(`Completed migration: ${file}`);
            } catch (sqlError) {
                await client.query('ROLLBACK');
                console.error(`Failed to execute migration in ${file}:`);
                throw sqlError;
            }
        }

        console.log('\nAll migrations executed successfully!');
    } catch (err) {
        console.error('\nMigration failed with error:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();