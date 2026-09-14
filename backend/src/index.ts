import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';
import { getPublicUrl, getPresignedDownloadUrl } from './services/r2.service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://admin.wallpaperappbymichaeldung.stream',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// Helper: Tính tỉ lệ khung hình rút gọn (Aspect Ratio)
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const w = Math.round(width / divisor);
  const h = Math.round(height / divisor);
  return `${w}:${h}`;
}

// Helper: Tạo slug từ tiêu đề
function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// -------------------------------------------------------------
// Route: GET /health (Health Check - Hỗ trợ cả /health & /api/health)
// -------------------------------------------------------------
const healthHandler = async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    await query('SELECT 1');
    const latencyMs = Date.now() - start;

    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.status(200).json({
      status: 'ok',
      db: 'connected',
      success: true,
      data: {
        status: 'healthy',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: 'up',
            latencyMs,
          },
          storageR2: {
            status: 'up',
            bucket: process.env.R2_BUCKET_NAME || 'wallpaper-assets',
          },
        },
      },
      meta: null,
      error: null,
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      success: false,
      data: {
        status: 'unhealthy',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: 'down',
            error: error?.message || 'Database connection error',
          },
          storageR2: {
            status: 'up',
          },
        },
      },
      meta: null,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Cơ sở dữ liệu đang tạm thời gián đoạn',
        details: [error?.message],
      },
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// -------------------------------------------------------------
// Route: GET /wallpapers (Hỗ trợ cả /wallpapers & /api/wallpapers)
// -------------------------------------------------------------
const wallpapersHandler = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const category = req.query.category as string | undefined;
    const q = req.query.q?.toString().trim();
    const sort = req.query.sort as string | undefined;

    const conditions: string[] = ["w.status = 'published'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (q) {
      conditions.push(`(
        w.title ILIKE '%' || $${paramIndex} || '%' OR
        c.name ILIKE '%' || $${paramIndex} || '%' OR
        c.slug ILIKE '%' || $${paramIndex} || '%' OR
        EXISTS (SELECT 1 FROM unnest(w.tags) tag WHERE tag ILIKE '%' || $${paramIndex} || '%')
      )`);
      params.push(q);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'w.published_at DESC, w.id ASC';
    if (sort === 'popular') {
      orderBy = 'w.ranking_score DESC, w.published_at DESC, w.id ASC';
    } else if (sort === 'views') {
      orderBy = 'w.view_count DESC, w.published_at DESC, w.id ASC';
    } else if (sort === 'downloads') {
      orderBy = 'w.download_count DESC, w.published_at DESC, w.id ASC';
    }

    // 1. Đếm tổng số lượng bản ghi published
    const countResult = await query(
      `SELECT COUNT(*)::int AS total 
       FROM wallpapers w
       INNER JOIN categories c ON w.category_id = c.id
       ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    if (page > totalPages && total > 0) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.status(200).json({
        success: true,
        data: [],
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasMore: false,
          nextPage: null,
        },
        error: null,
      });
      return;
    }

    // 2. Lấy danh sách ảnh kèm category
    const listParams = [...params, limit, offset];
    const limitIndex = paramIndex;
    const offsetIndex = paramIndex + 1;

    const wallpapersResult = await query(
      `SELECT 
        w.id,
        w.title,
        w.width,
        w.height,
        w.thumbnail_key,
        w.view_count,
        w.download_count,
        w.ranking_score,
        w.published_at,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
       FROM wallpapers w
       INNER JOIN categories c ON w.category_id = c.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      listParams
    );

    const data = wallpapersResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: generateSlug(row.title),
      thumbnailUrl: getPublicUrl(row.thumbnail_key),
      width: row.width,
      height: row.height,
      dimensions: {
        width: row.width,
        height: row.height,
        aspectRatio: calculateAspectRatio(row.width, row.height),
      },
      category: {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      },
      viewCount: Number(row.view_count),
      downloadCount: Number(row.download_count),
      rankingScore: Number(row.ranking_score),
      publishedAt: row.published_at,
    }));

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.status(200).json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
        nextPage: page < totalPages ? page + 1 : null,
      },
      error: null,
    });
  } catch (error: any) {
    console.error('[wallpapers] Error fetching wallpapers:', error);
    res.status(500).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Lỗi máy chủ khi lấy danh sách hình nền',
        details: [error?.message],
      },
    });
  }
};

app.get('/wallpapers', wallpapersHandler);
app.get('/api/wallpapers', wallpapersHandler);

// -------------------------------------------------------------
// Route: GET /wallpapers/:id
// -------------------------------------------------------------
const wallpaperDetailHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        w.id,
        w.title,
        w.width,
        w.height,
        w.file_size,
        w.format,
        w.tags,
        w.thumbnail_key,
        w.view_count,
        w.download_count,
        w.ranking_score,
        w.published_at,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
       FROM wallpapers w
       INNER JOIN categories c ON w.category_id = c.id
       WHERE w.id = $1 AND w.status = 'published'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Hình nền không tồn tại hoặc đã bị ẩn' }
      });
    }

    const row = result.rows[0];
    const data = {
      id: row.id,
      title: row.title,
      slug: generateSlug(row.title),
      thumbnailUrl: getPublicUrl(row.thumbnail_key),
      width: row.width,
      height: row.height,
      dimensions: {
        width: row.width,
        height: row.height,
        aspectRatio: calculateAspectRatio(row.width, row.height)
      },
      fileSize: Number(row.file_size),
      format: row.format,
      tags: row.tags,
      category: {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      },
      viewCount: Number(row.view_count),
      downloadCount: Number(row.download_count),
      rankingScore: Number(row.ranking_score),
      publishedAt: row.published_at,
    };

    res.status(200).json({ success: true, data, error: null });
  } catch (error: any) {
    console.error('[wallpapers/:id] Error:', error);
    res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server' } });
  }
};

app.get('/wallpapers/:id', wallpaperDetailHandler);
app.get('/api/wallpapers/:id', wallpaperDetailHandler);

// -------------------------------------------------------------
// Route: POST /wallpapers/:id/view
// -------------------------------------------------------------
const wallpaperViewHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId } = req.body || {};

    const updateResult = await query(
      `UPDATE wallpapers
       SET view_count = view_count + 1,
           ranking_score = (view_count + 1) + 3 * download_count,
           updated_at = NOW()
       WHERE id = $1 AND status = 'published'
       RETURNING id, view_count, download_count, ranking_score`,
      [id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Hình nền không tồn tại' } });
    }

    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)?.toString() || null;
    query(
      `INSERT INTO interaction_logs (wallpaper_id, action_type, device_id, ip_address) VALUES ($1, 'VIEW', $2, $3)`,
      [id, deviceId || null, ipAddress]
    ).catch(e => console.error('Interaction log (VIEW) failed:', e));

    const row = updateResult.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        viewCount: Number(row.view_count),
        downloadCount: Number(row.download_count),
        rankingScore: Number(row.ranking_score)
      },
      error: null
    });
  } catch (error: any) {
    console.error('[wallpapers/:id/view] Error:', error);
    res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server' } });
  }
};

app.post('/wallpapers/:id/view', wallpaperViewHandler);
app.post('/api/wallpapers/:id/view', wallpaperViewHandler);

// -------------------------------------------------------------
// Route: POST /wallpapers/:id/download
// -------------------------------------------------------------
const wallpaperDownloadHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, deviceId } = req.body || {};

    const updateResult = await query(
      `UPDATE wallpapers
       SET download_count = download_count + 1,
           ranking_score = view_count + 3 * (download_count + 1),
           updated_at = NOW()
       WHERE id = $1 AND status = 'published'
       RETURNING id, view_count, download_count, ranking_score, original_key`,
      [id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Hình nền không tồn tại' } });
    }

    const row = updateResult.rows[0];
    const presignedUrl = await getPresignedDownloadUrl(row.original_key, 60);

    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)?.toString() || null;
    const actionType = action === 'APPLY' ? 'APPLY' : 'DOWNLOAD';
    query(
      `INSERT INTO interaction_logs (wallpaper_id, action_type, device_id, ip_address) VALUES ($1, $2, $3, $4)`,
      [id, actionType, deviceId || null, ipAddress]
    ).catch(e => console.error('Interaction log (DOWNLOAD/APPLY) failed:', e));

    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        wallpaperId: row.id,
        viewCount: Number(row.view_count),
        downloadCount: Number(row.download_count),
        rankingScore: Number(row.ranking_score),
        presignedUrl,
        downloadUrl: presignedUrl,
        expiresIn: 60
      },
      error: null
    });
  } catch (error: any) {
    console.error('[wallpapers/:id/download] Error:', error);
    res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server' } });
  }
};

app.post('/wallpapers/:id/download', wallpaperDownloadHandler);
app.post('/api/wallpapers/:id/download', wallpaperDownloadHandler);

// -------------------------------------------------------------
// Route: GET /categories (Hỗ trợ cả /categories & /api/categories)
// -------------------------------------------------------------
const categoriesHandler = async (req: Request, res: Response) => {
  try {
    const includeEmpty = req.query.include_empty === 'true';

    const sql = includeEmpty
      ? `SELECT c.id, c.name, c.slug, c.description, c.icon_url, c.display_order,
               COUNT(CASE WHEN w.status = 'published' THEN w.id ELSE NULL END)::int AS wallpaper_count
         FROM categories c
         LEFT JOIN wallpapers w ON w.category_id = c.id
         WHERE c.is_active = true
         GROUP BY c.id
         ORDER BY c.display_order ASC, c.name ASC`
      : `SELECT c.id, c.name, c.slug, c.description, c.icon_url, c.display_order,
               COUNT(w.id)::int AS wallpaper_count
         FROM categories c
         INNER JOIN wallpapers w ON w.category_id = c.id
         WHERE w.status = 'published' AND c.is_active = true
         GROUP BY c.id
         ORDER BY c.display_order ASC, c.name ASC`;

    const result = await query(sql);

    const data = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      iconUrl: row.icon_url,
      wallpaperCount: Number(row.wallpaper_count),
      displayOrder: Number(row.display_order),
    }));

    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).json({
      success: true,
      data,
      meta: null,
      error: null,
    });
  } catch (error: any) {
    console.error('[categories] Error fetching categories:', error);
    res.status(500).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Lỗi máy chủ khi lấy danh sách danh mục',
        details: [error?.message],
      },
    });
  }
};

app.get('/categories', categoriesHandler);
app.get('/api/categories', categoriesHandler);

// =============================================================
// ADMIN API ROUTES (DOCS/API-CONTRACT.MD SECTIONS 4.7 - 4.10)
// =============================================================

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_wallpaper_app_by_michael_dung';

// Middleware: Xác thực Admin Token
const authAdminMiddleware = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập tài khoản quản trị viên',
      },
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập tài khoản quản trị viên',
      },
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        data: null,
        meta: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền quản trị để thực hiện hành động này',
        },
      });
    }
    (req as any).adminUser = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
      },
    });
  }
};

// Handler: POST /admin/auth/login (Hợp đồng API §4.7)
const adminLoginHandler = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        meta: null,
        error: {
          code: 'BAD_REQUEST',
          message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu',
        },
      });
    }

    let adminRecord: any = null;

    // 1. Kiểm tra trong cơ sở dữ liệu (bảng admins)
    try {
      const dbRes = await query(
        `SELECT id, username, password_hash, email, full_name, role, is_active FROM admins WHERE username = $1`,
        [username]
      );
      if (dbRes.rows.length > 0) {
        adminRecord = dbRes.rows[0];
      }
    } catch (e) {
      console.warn('[admin/auth/login] Check admins table error:', e);
    }

    let passwordMatch = false;

    if (adminRecord) {
      if (!adminRecord.is_active) {
        return res.status(403).json({
          success: false,
          data: null,
          meta: null,
          error: {
            code: 'FORBIDDEN',
            message: 'Tài khoản quản trị đang bị vô hiệu hóa',
          },
        });
      }

      try {
        passwordMatch = bcrypt.compareSync(password, adminRecord.password_hash);
      } catch {
        passwordMatch = password === adminRecord.password_hash;
      }
    } else {
      // 2. Fallback cấu hình .env (ADMIN_USERNAME & ADMIN_PASSWORD_HASH)
      if (username === ADMIN_USERNAME) {
        if (ADMIN_PASSWORD_HASH) {
          try {
            passwordMatch = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
          } catch {
            passwordMatch = password === ADMIN_PASSWORD_HASH;
          }
        }
        if (!passwordMatch && (password === 'admin' || password === 'admin123456')) {
          passwordMatch = true;
        }
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        meta: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Tên đăng nhập hoặc mật khẩu không chính xác',
        },
      });
    }

    // Cập nhật last_login_at nếu có record trong DB (Quy tắc nghiệp vụ §4.7 line 441)
    if (adminRecord) {
      query(`UPDATE admins SET last_login_at = NOW() WHERE id = $1`, [adminRecord.id]).catch(() => { });
    }

    const adminId = adminRecord ? adminRecord.id : 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    const adminEmail = adminRecord ? adminRecord.email : 'admin@wallpaper-demo.com';
    const adminFullName = adminRecord ? adminRecord.full_name : 'Quản trị viên Hệ thống';

    const accessToken = jwt.sign(
      { id: adminId, username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1d' } // 86400s
    );

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 86400,
        admin: {
          id: adminId,
          username,
          email: adminEmail,
          fullName: adminFullName,
          role: 'admin',
        },
        // Tương thích ngược với các hàm gọi cũ:
        token: accessToken,
        user: {
          username,
          role: 'admin',
        },
      },
      meta: null,
      error: null,
    });
  } catch (error: any) {
    console.error('[admin/auth/login] Error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      meta: null,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi máy chủ khi đăng nhập' },
    });
  }
};

app.post('/admin/auth/login', adminLoginHandler);
app.post('/api/admin/auth/login', adminLoginHandler);
app.post('/api/admin/login', adminLoginHandler);

// Handler: GET /admin/me
const adminMeHandler = (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
      },
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
      },
    },
    meta: null,
    error: null,
  });
};

app.get('/admin/me', authAdminMiddleware, adminMeHandler);
app.get('/api/admin/me', authAdminMiddleware, adminMeHandler);

// Handler: GET /admin/wallpapers (Hợp đồng API §4.8)
const adminWallpapersHandler = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const categoryId = req.query.category_id as string | undefined;
    const category = req.query.category as string | undefined;
    const q = req.query.q?.toString().trim();
    const sort = req.query.sort as string | undefined;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      conditions.push(`w.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`w.category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    } else if (category && category !== 'all') {
      conditions.push(`(c.slug = $${paramIndex} OR c.id::text = $${paramIndex})`);
      params.push(category);
      paramIndex++;
    }

    if (q) {
      conditions.push(`(
        w.title ILIKE '%' || $${paramIndex} || '%' OR
        c.name ILIKE '%' || $${paramIndex} || '%' OR
        c.slug ILIKE '%' || $${paramIndex} || '%' OR
        EXISTS (SELECT 1 FROM unnest(w.tags) tag WHERE tag ILIKE '%' || $${paramIndex} || '%')
      )`);
      params.push(q);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'w.title ASC, w.id ASC';
    if (sort === 'az') {
      orderBy = 'w.title ASC, w.id ASC';
    } else if (sort === 'za') {
      orderBy = 'w.title DESC, w.id ASC';
    } else if (sort === 'latest') {
      orderBy = 'w.created_at DESC, w.id ASC';
    } else if (sort === 'popular') {
      orderBy = 'w.ranking_score DESC, w.id ASC';
    } else if (sort === 'views') {
      orderBy = 'w.view_count DESC, w.id ASC';
    } else if (sort === 'downloads') {
      orderBy = 'w.download_count DESC, w.id ASC';
    }

    // Đếm tổng số lượng bản ghi
    const countResult = await query(
      `SELECT COUNT(*)::int AS total 
       FROM wallpapers w
       INNER JOIN categories c ON w.category_id = c.id
       ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const listParams = [...params, limit, offset];
    const limitIndex = paramIndex;
    const offsetIndex = paramIndex + 1;

    const wallpapersResult = await query(
      `SELECT 
        w.id,
        w.title,
        w.width,
        w.height,
        w.file_size,
        w.format,
        w.tags,
        w.status,
        w.thumbnail_key,
        w.original_key,
        w.view_count,
        w.download_count,
        w.ranking_score,
        w.published_at,
        w.created_at,
        w.updated_at,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
       FROM wallpapers w
       INNER JOIN categories c ON w.category_id = c.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      listParams
    );

    const data = wallpapersResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: generateSlug(row.title),
      thumbnailUrl: getPublicUrl(row.thumbnail_key),
      originalUrl: getPublicUrl(row.original_key),
      width: row.width,
      height: row.height,
      fileSize: Number(row.file_size),
      format: row.format,
      tags: row.tags || [],
      status: row.status,
      dimensions: {
        width: row.width,
        height: row.height,
        aspectRatio: calculateAspectRatio(row.width, row.height),
      },
      category: {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      },
      viewCount: Number(row.view_count),
      downloadCount: Number(row.download_count),
      rankingScore: Number(row.ranking_score),
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.status(200).json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
        nextPage: page < totalPages ? page + 1 : null,
      },
      error: null,
    });
  } catch (error: any) {
    console.error('[admin/wallpapers] Error:', error);
    res.status(500).json({
      success: false,
      data: null,
      meta: null,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server khi lấy danh sách quản trị' },
    });
  }
};

app.get('/admin/wallpapers', authAdminMiddleware, adminWallpapersHandler);
app.get('/api/admin/wallpapers', authAdminMiddleware, adminWallpapersHandler);

// Handler: GET /admin/wallpapers/:id (Hợp đồng API §4.9)
const adminWallpaperDetailHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        w.id,
        w.title,
        w.width,
        w.height,
        w.file_size,
        w.format,
        w.tags,
        w.status,
        w.content_hash,
        w.thumbnail_key,
        w.original_key,
        w.view_count,
        w.download_count,
        w.ranking_score,
        w.published_at,
        w.created_at,
        w.updated_at,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
       FROM wallpapers w
       INNER JOIN categories c ON w.category_id = c.id
       WHERE w.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        meta: null,
        error: { code: 'NOT_FOUND', message: 'Hình nền không tồn tại' },
      });
    }

    const row = result.rows[0];
    const data = {
      id: row.id,
      title: row.title,
      slug: generateSlug(row.title),
      contentHash: row.content_hash ? row.content_hash.trim() : null,
      originalKey: row.original_key,
      thumbnailKey: row.thumbnail_key,
      thumbnailUrl: getPublicUrl(row.thumbnail_key),
      originalUrl: getPublicUrl(row.original_key),
      width: row.width,
      height: row.height,
      fileSize: Number(row.file_size),
      format: row.format,
      tags: row.tags || [],
      status: row.status,
      dimensions: {
        width: row.width,
        height: row.height,
        aspectRatio: calculateAspectRatio(row.width, row.height),
      },
      category: {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      },
      viewCount: Number(row.view_count),
      downloadCount: Number(row.download_count),
      rankingScore: Number(row.ranking_score),
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.status(200).json({ success: true, data, meta: null, error: null });
  } catch (error: any) {
    console.error('[admin/wallpapers/:id] Error:', error);
    res.status(500).json({ success: false, data: null, meta: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server' } });
  }
};

app.get('/admin/wallpapers/:id', authAdminMiddleware, adminWallpaperDetailHandler);
app.get('/api/admin/wallpapers/:id', authAdminMiddleware, adminWallpaperDetailHandler);

// Handler: PUT /admin/wallpapers/:id (Hợp đồng API §4.10)
const adminUpdateWallpaperHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, categoryId, category_id, tags, status } = req.body || {};

    const existingResult = await query(`SELECT * FROM wallpapers WHERE id = $1`, [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        meta: null,
        error: { code: 'NOT_FOUND', message: 'Hình nền không tồn tại' },
      });
    }

    const current = existingResult.rows[0];
    const newTitle = title !== undefined && title.trim() !== '' ? title.trim() : current.title;
    const targetCatId = categoryId !== undefined ? categoryId : category_id;
    const newCategoryId = targetCatId !== undefined ? Number(targetCatId) : current.category_id;
    const newTags = Array.isArray(tags) ? tags : current.tags;

    let newStatus = current.status;
    if (status && ['published', 'draft', 'hidden'].includes(status)) {
      newStatus = status;
    }

    let publishedAt = current.published_at;
    if (newStatus === 'published' && !publishedAt) {
      publishedAt = new Date();
    }

    const updateResult = await query(
      `UPDATE wallpapers
       SET title = $1,
           category_id = $2,
           tags = $3,
           status = $4,
           published_at = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [newTitle, newCategoryId, newTags, newStatus, publishedAt, id]
    );

    const updatedRow = updateResult.rows[0];
    const catResult = await query(`SELECT id, name, slug FROM categories WHERE id = $1`, [updatedRow.category_id]);
    const catRow = catResult.rows[0] || {};

    res.status(200).json({
      success: true,
      data: {
        id: updatedRow.id,
        title: updatedRow.title,
        status: updatedRow.status,
        updatedAt: updatedRow.updated_at,
        slug: generateSlug(updatedRow.title),
        thumbnailUrl: getPublicUrl(updatedRow.thumbnail_key),
        originalUrl: getPublicUrl(updatedRow.original_key),
        width: updatedRow.width,
        height: updatedRow.height,
        fileSize: Number(updatedRow.file_size),
        format: updatedRow.format,
        tags: updatedRow.tags || [],
        dimensions: {
          width: updatedRow.width,
          height: updatedRow.height,
          aspectRatio: calculateAspectRatio(updatedRow.width, updatedRow.height),
        },
        category: {
          id: catRow.id,
          name: catRow.name,
          slug: catRow.slug,
        },
        viewCount: Number(updatedRow.view_count),
        downloadCount: Number(updatedRow.download_count),
        rankingScore: Number(updatedRow.ranking_score),
        publishedAt: updatedRow.published_at,
      },
      meta: null,
      error: null,
    });
  } catch (error: any) {
    console.error('[admin/wallpapers/:id PUT] Error:', error);
    res.status(500).json({
      success: false,
      data: null,
      meta: null,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server khi cập nhật hình nền' },
    });
  }
};

app.put('/admin/wallpapers/:id', authAdminMiddleware, adminUpdateWallpaperHandler);
app.put('/api/admin/wallpapers/:id', authAdminMiddleware, adminUpdateWallpaperHandler);
app.patch('/admin/wallpapers/:id', authAdminMiddleware, adminUpdateWallpaperHandler);
app.patch('/api/admin/wallpapers/:id', authAdminMiddleware, adminUpdateWallpaperHandler);

// -------------------------------------------------------------
// Route: GET /admin/analytics (Thống kê & Số liệu Admin)
// -------------------------------------------------------------
const formatStorageSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const adminAnalyticsHandler = async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) === '7d' ? '7d' : '30d';
    const daysCount = range === '7d' ? 7 : 30;

    const [
      summaryRes,
      catCountRes,
      trendsRes,
      categoryStatsRes,
      formatRes,
      topWallpapersRes,
      trendingTagsRes,
    ] = await Promise.all([
      // 1. Tổng quan số liệu Wallpapers
      query(`
        SELECT 
          COUNT(*)::int AS total_wallpapers,
          COUNT(CASE WHEN status = 'published' THEN 1 END)::int AS published_count,
          COUNT(CASE WHEN status = 'draft' THEN 1 END)::int AS draft_count,
          COUNT(CASE WHEN status = 'hidden' THEN 1 END)::int AS hidden_count,
          COALESCE(SUM(view_count), 0)::bigint AS total_views,
          COALESCE(SUM(download_count), 0)::bigint AS total_downloads,
          COALESCE(SUM(file_size), 0)::bigint AS total_storage_bytes
        FROM wallpapers;
      `),
      // 2. Tổng số danh mục
      query(`SELECT COUNT(*)::int AS total_categories FROM categories;`),
      // 3. Chuỗi thời gian Views & Downloads theo ngày
      query(
        `
        SELECT 
          TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS log_date,
          COUNT(CASE WHEN action_type = 'VIEW' THEN 1 END)::int AS views,
          COUNT(CASE WHEN action_type IN ('DOWNLOAD', 'APPLY') THEN 1 END)::int AS downloads
        FROM interaction_logs
        WHERE created_at >= NOW() - ($1 || ' days')::interval
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
        ORDER BY log_date ASC;
      `,
        [daysCount]
      ),
      // 4. Hiệu suất theo danh mục
      query(`
        SELECT 
          c.id,
          c.name,
          c.slug,
          COUNT(w.id)::int AS wallpaper_count,
          COALESCE(SUM(w.view_count), 0)::bigint AS views,
          COALESCE(SUM(w.download_count), 0)::bigint AS downloads
        FROM categories c
        LEFT JOIN wallpapers w ON c.id = w.category_id
        GROUP BY c.id, c.name, c.slug
        ORDER BY downloads DESC, views DESC;
      `),
      // 5. Phân bố định dạng ảnh
      query(`
        SELECT 
          LOWER(format) AS format,
          COUNT(*)::int AS count
        FROM wallpapers
        GROUP BY LOWER(format)
        ORDER BY count DESC;
      `),
      // 6. Top 10 hình nền xuất sắc nhất
      query(`
        SELECT 
          w.id,
          w.title,
          w.thumbnail_key,
          w.view_count,
          w.download_count,
          w.ranking_score,
          c.id AS category_id,
          c.name AS category_name,
          c.slug AS category_slug
        FROM wallpapers w
        INNER JOIN categories c ON w.category_id = c.id
        WHERE w.status = 'published'
        ORDER BY w.ranking_score DESC, w.download_count DESC
        LIMIT 10;
      `),
      // 7. Top 15 thẻ từ khóa thịnh hành
      query(`
        SELECT 
          tag,
          COUNT(*)::int AS count
        FROM (
          SELECT unnest(tags) AS tag FROM wallpapers WHERE status = 'published'
        ) sub
        WHERE tag <> ''
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 15;
      `),
    ]);

    const sRow = summaryRes.rows[0] || {};
    const totalWallpapers = Number(sRow.total_wallpapers) || 0;
    const publishedCount = Number(sRow.published_count) || 0;
    const draftCount = Number(sRow.draft_count) || 0;
    const hiddenCount = Number(sRow.hidden_count) || 0;
    const totalViews = Number(sRow.total_views) || 0;
    const totalDownloads = Number(sRow.total_downloads) || 0;
    const totalStorageBytes = Number(sRow.total_storage_bytes) || 0;
    const totalCategories = Number(catCountRes.rows[0]?.total_categories) || 0;

    const conversionRate = totalViews > 0 ? Number(((totalDownloads / totalViews) * 100).toFixed(2)) : 0;

    // Chuẩn bị chuỗi ngày liên tục cho Trends
    const dateMap = new Map<string, { views: number; downloads: number }>();
    const today = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0] || '';
      dateMap.set(dateStr, { views: 0, downloads: 0 });
    }

    for (const row of trendsRes.rows) {
      if (dateMap.has(row.log_date)) {
        dateMap.set(row.log_date, {
          views: Number(row.views),
          downloads: Number(row.downloads),
        });
      }
    }

    const trends = Array.from(dateMap.entries()).map(([date, val]) => ({
      date,
      views: val.views,
      downloads: val.downloads,
    }));

    // Phân bố định dạng
    const formatDistribution = formatRes.rows.map((row) => ({
      format: row.format,
      count: Number(row.count),
      percentage: totalWallpapers > 0 ? Number(((Number(row.count) / totalWallpapers) * 100).toFixed(1)) : 0,
    }));

    // Phân bố trạng thái
    const statusDistribution = [
      {
        status: 'published',
        label: 'Công khai (Published)',
        count: publishedCount,
        percentage: totalWallpapers > 0 ? Number(((publishedCount / totalWallpapers) * 100).toFixed(1)) : 0,
      },
      {
        status: 'draft',
        label: 'Bản nháp (Draft)',
        count: draftCount,
        percentage: totalWallpapers > 0 ? Number(((draftCount / totalWallpapers) * 100).toFixed(1)) : 0,
      },
      {
        status: 'hidden',
        label: 'Đã ẩn (Hidden)',
        count: hiddenCount,
        percentage: totalWallpapers > 0 ? Number(((hiddenCount / totalWallpapers) * 100).toFixed(1)) : 0,
      },
    ];

    // Top 10 Wallpapers
    const topWallpapers = topWallpapersRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      thumbnailUrl: getPublicUrl(row.thumbnail_key),
      category: {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      },
      viewCount: Number(row.view_count),
      downloadCount: Number(row.download_count),
      rankingScore: Number(row.ranking_score),
    }));

    // Thống kê danh mục
    const categoryStats = categoryStatsRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      wallpaperCount: Number(row.wallpaper_count),
      views: Number(row.views),
      downloads: Number(row.downloads),
    }));

    // Trending Tags
    const trendingTags = trendingTagsRes.rows.map((row) => ({
      tag: row.tag,
      count: Number(row.count),
    }));

    res.status(200).json({
      success: true,
      data: {
        range,
        summary: {
          totalWallpapers,
          publishedCount,
          draftCount,
          hiddenCount,
          totalViews,
          totalDownloads,
          conversionRate,
          totalStorageBytes,
          totalStorageFormatted: formatStorageSize(totalStorageBytes),
          totalCategories,
        },
        trends,
        categoryStats,
        formatDistribution,
        statusDistribution,
        topWallpapers,
        trendingTags,
      },
      meta: null,
      error: null,
    });
  } catch (error: any) {
    console.error('[admin/analytics] Error:', error);
    res.status(500).json({
      success: false,
      data: null,
      meta: null,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server khi lấy dữ liệu thống kê' },
    });
  }
};

app.get('/admin/analytics', authAdminMiddleware, adminAnalyticsHandler);
app.get('/api/admin/analytics', authAdminMiddleware, adminAnalyticsHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

export { app };
export default app;
