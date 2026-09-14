import request from 'supertest';
import { app } from '../src/index.js';
import { pool, query } from '../src/db.js';
describe('Wallpapers & Core Backend REST API Test Suite', () => {
    let testCategoryId;
    let testPublishedWallpaperId;
    let testGokuWallpaperId;
    let testHiddenWallpaperId;
    beforeAll(async () => {
        // 1. Đảm bảo có category test
        const catRes = await query(`
      INSERT INTO categories (name, slug, description, display_order, is_active)
      VALUES ('Test Anime Category', 'test-anime', 'Category for testing', 1, true)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
        testCategoryId = catRes.rows[0].id;
        // 2. Insert sample published wallpaper
        const pubRes = await query(`
      INSERT INTO wallpapers (
        category_id, title, tags, source_filename, content_hash,
        width, height, file_size, format, original_key, thumbnail_key,
        status, view_count, download_count, ranking_score
      ) VALUES (
        $1, 'Test Cyberpunk Cityscape', ARRAY['cyberpunk', 'city', 'neon'], 'test1.jpg',
        'hash_test_cyberpunk_001', 1080, 1920, 1048576, 'jpeg',
        'wallpapers/originals/test1.jpg', 'wallpapers/thumbnails/test1.webp',
        'published', 10, 2, 16
      )
      ON CONFLICT (content_hash) DO UPDATE SET title = EXCLUDED.title
      RETURNING id;
    `, [testCategoryId]);
        testPublishedWallpaperId = pubRes.rows[0].id;
        // 3. Insert Goku wallpaper for search testing (SC-004)
        const gokuRes = await query(`
      INSERT INTO wallpapers (
        category_id, title, tags, source_filename, content_hash,
        width, height, file_size, format, original_key, thumbnail_key,
        status, view_count, download_count, ranking_score
      ) VALUES (
        $1, 'Goku Ultra Instinct Warrior', ARRAY['goku', 'dragonball', 'saiyan'], 'goku_test.jpg',
        'hash_test_goku_002', 1440, 2560, 2097152, 'jpeg',
        'wallpapers/originals/goku_test.jpg', 'wallpapers/thumbnails/goku_test.webp',
        'published', 50, 20, 110
      )
      ON CONFLICT (content_hash) DO UPDATE SET title = EXCLUDED.title
      RETURNING id;
    `, [testCategoryId]);
        testGokuWallpaperId = gokuRes.rows[0].id;
        // 4. Insert draft/hidden wallpaper (FR-017)
        const hiddenRes = await query(`
      INSERT INTO wallpapers (
        category_id, title, tags, source_filename, content_hash,
        width, height, file_size, format, original_key, thumbnail_key,
        status, view_count, download_count, ranking_score
      ) VALUES (
        $1, 'Secret Unreleased Draft Wallpaper', ARRAY['secret'], 'hidden_test.jpg',
        'hash_test_hidden_003', 1080, 1920, 1048576, 'jpeg',
        'wallpapers/originals/hidden_test.jpg', 'wallpapers/thumbnails/hidden_test.webp',
        'hidden', 0, 0, 0
      )
      ON CONFLICT (content_hash) DO UPDATE SET title = EXCLUDED.title
      RETURNING id;
    `, [testCategoryId]);
        testHiddenWallpaperId = hiddenRes.rows[0].id;
    });
    afterAll(async () => {
        // Dọn dẹp dữ liệu test
        if (testCategoryId) {
            await query(`DELETE FROM wallpapers WHERE content_hash IN ('hash_test_cyberpunk_001', 'hash_test_goku_002', 'hash_test_hidden_003')`);
            await query(`DELETE FROM categories WHERE id = $1`, [testCategoryId]);
        }
        await pool.end();
    });
    // 1. GET /api/health trả về 200, status healthy, latency DB và status R2
    test('1. GET /api/health returns healthy status with DB latency and R2', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('healthy');
        expect(res.body.data.services.database.status).toBe('up');
        expect(typeof res.body.data.services.database.latencyMs).toBe('number');
        expect(res.body.data.services.storageR2.status).toBe('up');
    });
    // 2. GET /api/wallpapers trả về danh sách phân trang đúng cấu trúc Envelope có hasMore và nextPage
    test('2. GET /api/wallpapers returns paginated envelope with hasMore and nextPage', async () => {
        const res = await request(app).get('/api/wallpapers?page=1&limit=5');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.meta).toHaveProperty('page', 1);
        expect(res.body.meta).toHaveProperty('limit', 5);
        expect(res.body.meta).toHaveProperty('total');
        expect(res.body.meta).toHaveProperty('totalPages');
        expect(res.body.meta).toHaveProperty('hasMore');
        expect(res.header['cache-control']).toContain('public');
    });
    // 3. Tìm kiếm q=goku và q=GoKu trả về cùng kết quả (case-insensitive)
    test('3. Search q=goku and q=GoKu returns same results (case-insensitive)', async () => {
        const resLower = await request(app).get('/api/wallpapers?q=goku');
        const resUpper = await request(app).get('/api/wallpapers?q=GoKu');
        expect(resLower.status).toBe(200);
        expect(resUpper.status).toBe(200);
        expect(resLower.body.data.length).toBeGreaterThan(0);
        expect(resLower.body.data.length).toEqual(resUpper.body.data.length);
        expect(resLower.body.data[0].id).toEqual(resUpper.body.data[0].id);
    });
    // 4. Sắp xếp sort=popular cho thứ tự giảm dần theo điểm view + 3*dl
    test('4. Sort sort=popular orders by ranking_score DESC with tie-breaker', async () => {
        const res = await request(app).get('/api/wallpapers?sort=popular&limit=10');
        expect(res.status).toBe(200);
        const data = res.body.data;
        for (let i = 0; i < data.length - 1; i++) {
            expect(data[i].rankingScore).toBeGreaterThanOrEqual(data[i + 1].rankingScore);
        }
    });
    // 5. GET /api/wallpapers/:id trả metadata và thumbnailUrl, tuyệt đối không lộ originalUrl
    test('5. GET /api/wallpapers/:id returns metadata and thumbnailUrl, without originalUrl', async () => {
        const res = await request(app).get(`/api/wallpapers/${testPublishedWallpaperId}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(testPublishedWallpaperId);
        expect(res.body.data.thumbnailUrl).toBeDefined();
        expect(res.body.data).not.toHaveProperty('originalUrl');
        expect(res.body.data).not.toHaveProperty('originalKey');
        expect(res.body.data.dimensions).toHaveProperty('aspectRatio');
    });
    // 6. POST /api/wallpapers/:id/view tăng đúng view_count và cập nhật ranking_score
    test('6. POST /api/wallpapers/:id/view atomically increments viewCount and updates rankingScore', async () => {
        const beforeRes = await request(app).get(`/api/wallpapers/${testPublishedWallpaperId}`);
        const beforeView = beforeRes.body.data.viewCount;
        const beforeDl = beforeRes.body.data.downloadCount;
        const res = await request(app).post(`/api/wallpapers/${testPublishedWallpaperId}/view`).send({
            deviceId: 'test-device-uuid-001'
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.viewCount).toBe(beforeView + 1);
        expect(res.body.data.rankingScore).toBe((beforeView + 1) + 3 * beforeDl);
    });
    // 7. POST /api/wallpapers/:id/download tăng download_count, cộng 3 điểm ranking score, trả Presigned URL (60s)
    test('7. POST /api/wallpapers/:id/download increments downloadCount, adds 3 points and returns presignedUrl', async () => {
        const beforeRes = await request(app).get(`/api/wallpapers/${testPublishedWallpaperId}`);
        const beforeView = beforeRes.body.data.viewCount;
        const beforeDl = beforeRes.body.data.downloadCount;
        const res = await request(app).post(`/api/wallpapers/${testPublishedWallpaperId}/download`).send({
            action: 'DOWNLOAD',
            deviceId: 'test-device-uuid-001'
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.downloadCount).toBe(beforeDl + 1);
        expect(res.body.data.rankingScore).toBe(beforeView + 3 * (beforeDl + 1));
        expect(res.body.data.presignedUrl).toBeDefined();
        expect(typeof res.body.data.presignedUrl).toBe('string');
        expect(res.body.data.expiresIn).toBe(60);
    });
    // 8. Truy vấn ảnh draft hoặc hidden qua API công khai trả về 404
    test('8. Public access to draft/hidden wallpaper returns 404 Not Found', async () => {
        const res = await request(app).get(`/api/wallpapers/${testHiddenWallpaperId}`);
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });
    // 9. GET /api/categories trả về danh mục với wallpaperCount
    test('9. GET /api/categories returns categories with cache headers', async () => {
        const res = await request(app).get('/api/categories');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.header['cache-control']).toContain('max-age=3600');
    });
});
//# sourceMappingURL=wallpapers.test.js.map