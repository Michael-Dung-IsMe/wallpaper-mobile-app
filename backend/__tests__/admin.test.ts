import request from 'supertest';
import { app } from '../src/index.js';
import { pool, query } from '../src/db.js';

describe('Admin Web REST API Test Suite (docs/api-contract.md §4.7 - §4.10)', () => {
  let adminToken: string;
  let testWallpaperId: string;
  let testCategoryId: number;

  beforeAll(async () => {
    const catRes = await query(`
      INSERT INTO categories (name, slug, description, display_order, is_active)
      VALUES ('Admin Test Category', 'admin-test-cat', 'Category for admin test', 99, true)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    testCategoryId = catRes.rows[0].id;

    const wpRes = await query(`
      INSERT INTO wallpapers (
        category_id, title, tags, source_filename, content_hash,
        width, height, file_size, format, original_key, thumbnail_key,
        status, view_count, download_count, ranking_score
      ) VALUES (
        $1, 'Initial Admin Wallpaper', ARRAY['test', 'initial'], 'admin_wp.jpg',
        'hash_admin_test_contract_999', 1080, 1920, 1048576, 'jpeg',
        'wallpapers/originals/admin_wp.jpg', 'wallpapers/thumbnails/admin_wp.webp',
        'draft', 5, 1, 8
      )
      ON CONFLICT (content_hash) DO UPDATE SET title = EXCLUDED.title, status = 'draft'
      RETURNING id;
    `, [testCategoryId]);
    testWallpaperId = wpRes.rows[0].id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('1. POST /admin/auth/login fails with invalid credentials (§4.7)', async () => {
    const res = await request(app)
      .post('/admin/auth/login')
      .send({ username: 'admin', password: 'wrong_password_123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('2. POST /admin/auth/login succeeds with valid credentials and returns accessToken & admin object (§4.7)', async () => {
    const res = await request(app)
      .post('/admin/auth/login')
      .send({ username: 'admin', password: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.tokenType).toBe('Bearer');
    expect(res.body.data.expiresIn).toBe(86400);
    expect(res.body.data.admin).toBeDefined();
    expect(res.body.data.admin.username).toBe('admin');
    expect(res.body.data.admin.role).toBe('admin');

    adminToken = res.body.data.accessToken;
  });

  it('3. GET /admin/wallpapers requires Bearer token (§4.8)', async () => {
    const res = await request(app).get('/admin/wallpapers');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('4. GET /admin/wallpapers returns all statuses with valid token (§4.8)', async () => {
    const res = await request(app)
      .get('/admin/wallpapers?status=all&sort=latest')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThan(0);

    const found = res.body.data.find((w: any) => w.id === testWallpaperId);
    expect(found).toBeDefined();
    expect(found.status).toBe('draft');

    const resAz = await request(app)
      .get('/admin/wallpapers?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAz.status).toBe(200);
    const titles = resAz.body.data.map((w: any) => w.title.toLowerCase());
    const sortedTitles = [...titles].sort();
    expect(titles).toEqual(sortedTitles);
  });

  it('5. GET /admin/wallpapers/:id returns technical info & keys (§4.9)', async () => {
    const res = await request(app)
      .get(`/admin/wallpapers/${testWallpaperId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testWallpaperId);
    expect(res.body.data.contentHash).toBe('hash_admin_test_contract_999');
    expect(res.body.data.originalKey).toBe('wallpapers/originals/admin_wp.jpg');
    expect(res.body.data.thumbnailKey).toBe('wallpapers/thumbnails/admin_wp.webp');
  });

  it('6. PUT /admin/wallpapers/:id updates metadata and status (§4.10)', async () => {
    const res = await request(app)
      .put(`/admin/wallpapers/${testWallpaperId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Son Goku Ultra Instinct Full Power',
        categoryId: testCategoryId,
        tags: ['goku', 'ultra-instinct', 'dragon-ball'],
        status: 'published',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Son Goku Ultra Instinct Full Power');
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.updatedAt).toBeDefined();
  });

  it('7. PUT /admin/wallpapers/:id can hide a wallpaper and immediately hides from public route', async () => {
    const res = await request(app)
      .put(`/admin/wallpapers/${testWallpaperId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Son Goku Ultra Instinct Full Power',
        categoryId: testCategoryId,
        tags: ['goku'],
        status: 'hidden',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('hidden');

    const publicRes = await request(app).get(`/wallpapers/${testWallpaperId}`);
    expect(publicRes.status).toBe(404);
  });

  it('8. GET /admin/analytics requires Bearer token', async () => {
    const res = await request(app).get('/admin/analytics');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('9. GET /admin/analytics returns complete stats, trends, and leaderboard with valid token', async () => {
    const res = await request(app)
      .get('/admin/analytics?range=7d')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const { summary, trends, categoryStats, formatDistribution, statusDistribution, topWallpapers, trendingTags } = res.body.data;
    
    // Summary checks
    expect(summary).toBeDefined();
    expect(typeof summary.totalWallpapers).toBe('number');
    expect(typeof summary.totalViews).toBe('number');
    expect(typeof summary.totalDownloads).toBe('number');
    expect(typeof summary.totalStorageFormatted).toBe('string');
    expect(summary.totalCategories).toBeGreaterThan(0);

    // Trends checks (7 days)
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBe(7);
    expect(trends[0].date).toBeDefined();
    expect(typeof trends[0].views).toBe('number');
    expect(typeof trends[0].downloads).toBe('number');

    // Category stats
    expect(Array.isArray(categoryStats)).toBe(true);
    expect(categoryStats.length).toBeGreaterThan(0);

    // Formats & statuses
    expect(Array.isArray(formatDistribution)).toBe(true);
    expect(Array.isArray(statusDistribution)).toBe(true);
    expect(statusDistribution.some((s: any) => s.status === 'published')).toBe(true);

    // Leaderboard & tags
    expect(Array.isArray(topWallpapers)).toBe(true);
    expect(Array.isArray(trendingTags)).toBe(true);
  });
});
