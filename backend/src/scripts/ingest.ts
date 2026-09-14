#!/usr/bin/env node
/**
 * Pipeline Nhập Dữ Liệu Hình Nền (Wallpaper Data Ingestion & Enrichment Pipeline)
 * ================================================================================
 * Kiến trúc Clean Code & SOLID-compliant:
 * - Layer 1: Domain Entities & Data Contracts (Interfaces)
 * - Layer 2: Dedicated Single-Responsibility Services:
 *     + PathResolver: Phân giải và kiểm tra đường dẫn tập tin trong bộ dữ liệu
 *     + ZipExtractor: Giải nén an toàn file ZIP vào thư mục tạm tmp/
 *     + ChecksumService: Tính toán mã băm an toàn SHA-256 (Idempotency Key)
 *     + ImageProcessor: Thẩm định ảnh dọc (portrait) & tạo WebP thumbnail trong RAM
 *     + MetadataEnricher: Phân tầng danh mục N>=5, bóc tách tags, resolution & device facets
 *     + R2StorageService: Tải ảnh gốc & thumbnail lên Cloudflare R2
 *     + DatabaseRepository: Nạp bản ghi theo chuẩn Database 3NF (categories, wallpapers, tags, ingestion_logs)
 * - Layer 3: WallpaperPipeline (Bộ điều phối quy trình tuần tự)
 * - Layer 4: CLI Controller & Reporter (Điều phối bất đồng bộ non-blocking & xuất báo cáo JSON)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, URL } from 'url';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { pool } from '../db.js';
import { uploadBuffer, checkObjectExists } from '../services/r2.service.js';

// Tải biến môi trường
dotenv.config();

// ==============================================================================
// HẰNG SỐ CẤU HÌNH (CONFIGURATION CONSTANTS)
// ==============================================================================

const STOP_WORDS = new Set([
  'and', 'the', 'with', 'for', 'from', 'over', 'under', 'into', 'through',
  'wallpaper', 'wallpapers', 'image', 'photo', 'artwork', 'digitalart',
  '4k', '8k', '1080p', 'uhd', 'hd', 'high', 'res', 'resolution', 'desktop', 'mobile',
  'close', 'up', 'silhouette', 'minimalist', 'illustration', 'portrait', 'landscape',
]);

// ==============================================================================
// LAYER 1: DATA CONTRACTS & ENTITIES (INTERFACES)
// ==============================================================================

export interface ProcessResult {
  status: 'success' | 'skipped' | 'error';
  wallpaperId: string;
  filePath: string;
  message: string;
  data?: WallpaperRecord;
}

export interface ImageInspection {
  isPortrait: boolean;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  thumbnailBuffer: Buffer;
}

export interface EnrichedMetadata {
  subCategory: string;
  tags: string[];
  resolutionTier: string;
  deviceTarget: string;
}

export interface WallpaperRecord {
  wallpaperId: string;
  contentHash: string;
  title: string;
  category: string;
  subCategory: string;
  tags: string[];
  sourceFilename: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  resolutionTier: string;
  deviceTarget: string;
  originalKey: string;
  thumbnailKey: string;
  status: 'published' | 'draft' | 'hidden';
  viewCount: number;
  downloadCount: number;
  rankingScore: number;
}

export interface IngestionConfig {
  datasetDir: string;
  manifestPath: string;
  zipPath: string;
  workers: number;
  limit: number;
  dryRun: boolean;
  skipR2: boolean;
  skipDb: boolean;
  forceMeta: boolean;
}

export interface IngestionReportSummary {
  timestamp: string;
  durationSeconds: number;
  totalScanned: number;
  successCount: number;
  skippedCount: number;
  landscapeExcludedCount: number;
  duplicateSkippedCount: number;
  errorCount: number;
  dbSavedCount: number;
  errors: Array<{ wallpaperId: string; filePath: string; message: string }>;
}

// ==============================================================================
// LAYER 2: DEDICATED DOMAIN SERVICES (SINGLE RESPONSIBILITY)
// ==============================================================================

export class PathResolver {
  /**
   * Phân giải và kiểm tra sự tồn tại của file ảnh theo cấu trúc thư mục dữ liệu.
   */
  static resolve(datasetDir: string, relPath: string): string | null {
    const candidates = [
      path.join(datasetDir, relPath),
      path.join(datasetDir, 'images', relPath),
      path.join(datasetDir, 'wallpaper-demo-1000', relPath),
      path.join(datasetDir, 'wallpaper-demo-1000', 'images', relPath),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }
}

export class ZipExtractor {
  /**
   * Giải nén an toàn file ZIP vào thư mục đích tmp/
   */
  static extractZip(zipFilePath: string, destDir: string): string {
    console.log(`\n📦 Đang giải nén file ZIP: "${zipFilePath}"...`);
    console.log(`   -> Đích đến: "${destDir}"`);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(destDir, true);

    console.log(`   -> Giải nén hoàn tất thành công!`);

    // Dò tìm thư mục con nếu bên trong zip có chứa 1 folder bọc ngoài (ví dụ wallpaper-demo-1000)
    const subFolder = path.join(destDir, 'wallpaper-demo-1000');
    if (fs.existsSync(subFolder) && fs.existsSync(path.join(subFolder, 'manifest.tsv'))) {
      return subFolder;
    }
    return destDir;
  }
}

export class ChecksumService {
  /**
   * Tính toán mã băm SHA-256 an toàn từ file nhị phân (Idempotency Key).
   */
  static calculateSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}

export class ImageProcessor {
  /**
   * Thẩm định ảnh bằng sharp:
   * - Đọc width, height, format, file_size
   * - Bắt lỗi file corrupt
   * - Kiểm tra điều kiện ảnh dọc (height > width)
   * - Nén Thumbnail WebP 480px trong RAM (Zero Disk I/O)
   */
  static async inspect(filePath: string): Promise<ImageInspection> {
    const fileStats = await fs.promises.stat(filePath);
    const fileBuffer = await fs.promises.readFile(filePath);

    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const format = (metadata.format || 'webp').toLowerCase();

    // Loại trừ ảnh ngang, ảnh vuông, hoặc kích thước quá bé (Issue 6)
    let isPortrait = true;
    if (width >= height || width < 360 || height < 640) {
      isPortrait = false;
    }

    return {
      isPortrait,
      width,
      height,
      fileSize: fileStats.size,
      format,
      thumbnailBuffer: Buffer.alloc(0),
    };
  }

  /**
   * Nén Thumbnail WebP 480px trong RAM (Zero Disk I/O)
   */
  static async createThumbnail(
    filePath: string,
    targetWidth: number = 480,
    quality: number = 80
  ): Promise<Buffer> {
    const fileBuffer = await fs.promises.readFile(filePath);
    return await sharp(fileBuffer)
      .resize({
        width: targetWidth,
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
  }
}

export class MetadataEnricher {
  /**
   * Phân tầng danh mục thông minh:
   * - Nếu số lượng ảnh trong nhóm >= 5: Giữ nguyên Sub-category độc lập.
   * - Nếu số lượng ảnh < 5: Gom vào nhóm đại diện (Athletes & Clubs, Movie Characters, hoặc Others).
   */
  static determineSubCategory(
    rootCategory: string,
    sourceCategory: string,
    counts: Map<string, number>
  ): string {
    const count = counts.get(sourceCategory) || 0;
    if (count >= 5) {
      const cleaned = sourceCategory.replace(/[^\w\s\-&]/g, '').trim();
      return cleaned || sourceCategory;
    }

    if (rootCategory === 'Sports') {
      return 'Athletes & Clubs';
    } else if (rootCategory === 'Movies') {
      return 'Movie Characters';
    } else {
      return 'Others';
    }
  }

  /**
   * Bóc tách tokens và làm sạch từ khóa:
   * - Trích xuất từ Title, Root Category, Source Category.
   * - Bóc tách slug từ Source URL.
   * - Loại bỏ Stop-words và các ký tự nhiễu.
   */
  static extractTags(
    title: string,
    rootCategory: string,
    sourceCategory: string,
    sourceUrl: string
  ): string[] {
    const rawTokens = new Set<string>();

    // 1. Trích xuất từ Title và Danh mục
    const combinedText = `${title} ${rootCategory} ${sourceCategory}`.toLowerCase();
    const words = combinedText.match(/\b[a-zA-Z]{3,}\b/g) || [];
    for (const w of words) {
      rawTokens.add(w);
    }

    // 2. Bóc tách slug từ Source URL
    if (sourceUrl) {
      try {
        const parsed = new URL(sourceUrl);
        const filename = path.parse(parsed.pathname).name;
        const cleanFilename = filename.replace(/\b\d{6,8}\b/g, '');
        const urlTokens = cleanFilename.toLowerCase().match(/[a-zA-Z]{3,}/g) || [];
        for (const t of urlTokens) {
          rawTokens.add(t);
        }
      } catch {
        // Bỏ qua lỗi parse URL không hợp lệ
      }
    }

    // 3. Lọc bỏ stop words và số thuần túy
    const filtered = new Set<string>();
    for (const token of rawTokens) {
      if (!STOP_WORDS.has(token) && !/^\d+$/.test(token)) {
        filtered.add(token);
      }
    }

    if (rootCategory) {
      filtered.add(rootCategory.toLowerCase().replace(/[^\w\-]/g, ''));
    }

    // Luôn bảo toàn source_category gốc trong tags để phục vụ tìm kiếm toàn văn
    const cleanSrc = sourceCategory.replace(/[^\w\s\-]/g, '').toLowerCase().trim();
    if (cleanSrc) {
      filtered.add(cleanSrc.replace(/\s+/g, '-'));
    }

    return Array.from(filtered).filter(Boolean).sort();
  }

  /**
   * Phân tầng độ phân giải dựa trên kích thước pixel hoặc từ khóa
   */
  static classifyResolution(width: number, context: string): string {
    if (width >= 2160 || /\b(4k|uhd|2160p)\b/i.test(context)) {
      return '4K UHD';
    } else if (width >= 1440 || /\b(2k|qhd|1440p)\b/i.test(context)) {
      return '2K QHD';
    }
    return '1080p FHD';
  }

  /**
   * Phân loại tương thích thiết bị (iPhone tai thỏ 19.5:9 vs Universal/Android)
   */
  static classifyDevice(width: number, height: number, context: string): string {
    const ratio = width > 0 ? height / width : 0;
    if (/\b(iphone|ios|apple)\b/i.test(context) || (ratio >= 2.12 && ratio <= 2.20 && height >= 2500)) {
      return 'iPhone / iOS';
    }
    return 'Universal / Android';
  }

  /**
   * Tổng hợp quy trình làm giàu metadata
   */
  static enrich(
    row: Record<string, string>,
    width: number,
    height: number,
    counts: Map<string, number>
  ): EnrichedMetadata {
    const title = (row['title'] || '').trim();
    const rootCat = (row['root_category'] || 'General').trim();
    const srcCat = (row['source_category'] || '').trim();
    const srcUrl = (row['source_url'] || '').trim();

    const subCat = this.determineSubCategory(rootCat, srcCat, counts);
    const tags = this.extractTags(title, rootCat, srcCat, srcUrl);

    const context = `${title} ${srcUrl} ${srcCat}`;
    const resTier = this.classifyResolution(width, context);
    const devTarget = this.classifyDevice(width, height, context);

    // Bổ sung các facet kỹ thuật vào tags để tăng cường Full-text Search
    const facetTags = new Set(tags);
    if (resTier.includes('4K')) facetTags.add('4k');
    if (resTier.includes('2K')) facetTags.add('2k');
    if (resTier.includes('1080p')) facetTags.add('1080p');
    if (devTarget.includes('iPhone')) facetTags.add('iphone');
    if (devTarget.includes('Android')) facetTags.add('android');

    return {
      subCategory: subCat,
      tags: Array.from(facetTags).sort(),
      resolutionTier: resTier,
      deviceTarget: devTarget,
    };
  }
}

export class R2StorageService {
  constructor(
    private bucketName: string = process.env.R2_BUCKET_NAME || 'wallpaper-assets',
    private dryRun: boolean = false,
    private skipR2: boolean = false
  ) { }

  /**
   * Tải ảnh gốc và thumbnail lên Cloudflare R2 kèm Cache-Control tối ưu CDN
   */
  async uploadWallpaperPair(
    originalLocalPath: string,
    thumbnailBuffer: Buffer,
    contentHash: string,
    format: string = 'webp'
  ): Promise<{ originalKey: string; thumbnailKey: string }> {
    const originalKey = `wallpapers/originals/${contentHash}.${format}`;
    const thumbnailKey = `wallpapers/thumbnails/${contentHash}.webp`;

    if (this.dryRun || this.skipR2) {
      return { originalKey, thumbnailKey };
    }

    const origBuffer = await fs.promises.readFile(originalLocalPath);
    const origMime = format === 'png' ? 'image/png' : format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/webp';

    // Tải song song cả 2 ảnh lên Cloudflare R2
    await Promise.all([
      uploadBuffer(originalKey, origBuffer, origMime, this.bucketName, 'public, max-age=31536000, immutable'),
      uploadBuffer(thumbnailKey, thumbnailBuffer, 'image/webp', this.bucketName, 'public, max-age=31536000, immutable'),
    ]);

    return { originalKey, thumbnailKey };
  }
}

export class DatabaseRepository {
  private categoryCache = new Map<string, number>();

  /**
   * Tạo nhật ký nạp lô mới trong bảng ingestion_logs
   */
  async createIngestionLog(batchCode: string, totalFiles: number): Promise<string | null> {
    try {
      const res = await pool.query(
        `INSERT INTO ingestion_logs (batch_code, total_files, status)
         VALUES ($1, $2, 'processing')
         ON CONFLICT (batch_code) DO UPDATE SET total_files = EXCLUDED.total_files
         RETURNING id;`,
        [batchCode, totalFiles]
      );
      return res.rows[0]?.id || null;
    } catch (err) {
      console.warn(`[db] Không thể tạo ingestion_logs:`, err);
      return null;
    }
  }

  /**
   * Cập nhật trạng thái hoàn tất vào bảng ingestion_logs
   */
  async finalizeIngestionLog(
    batchId: string | null,
    successCount: number,
    skippedCount: number,
    failedCount: number,
    status: 'completed' | 'failed'
  ): Promise<void> {
    if (!batchId) return;
    try {
      await pool.query(
        `UPDATE ingestion_logs
         SET success_count = $1,
             skipped_count = $2,
             failed_count = $3,
             status = $4,
             completed_at = NOW()
         WHERE id = $5;`,
        [successCount, skippedCount, failedCount, status, batchId]
      );
    } catch (err) {
      console.warn(`[db] Không thể cập nhật ingestion_logs:`, err);
    }
  }

  /**
   * Tra cứu hoặc tạo mới Category (3NF Normalization), có cache in-memory
   */
  async getOrCreateCategory(categoryName: string): Promise<number> {
    const cleanName = categoryName.trim() || 'General';
    if (this.categoryCache.has(cleanName)) {
      return this.categoryCache.get(cleanName)!;
    }

    const slug = cleanName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    const res = await pool.query(
      `INSERT INTO categories (name, slug, display_order)
       VALUES ($1, $2, 0)
       ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
       RETURNING id;`,
      [cleanName, slug]
    );

    const catId = res.rows[0].id as number;
    this.categoryCache.set(cleanName, catId);
    return catId;
  }

  /**
   * Kiểm tra xem content_hash đã tồn tại trong DB chưa (Idempotency Check)
   */
  async checkContentHashExists(contentHash: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT id, original_key, thumbnail_key FROM wallpapers WHERE content_hash = $1 LIMIT 1;`,
      [contentHash]
    );
    if ((res.rowCount ?? 0) === 0) return false;

    const { original_key, thumbnail_key } = res.rows[0];

    // Kiểm tra xem objects trên R2 có còn tồn tại không
    const [origExists, thumbExists] = await Promise.all([
      checkObjectExists(original_key),
      checkObjectExists(thumbnail_key),
    ]);

    return origExists && thumbExists;
  }

  /**
   * Lưu hoặc cập nhật Wallpaper vào cơ sở dữ liệu (PostgreSQL UPSERT)
   */
  async saveWallpaper(record: WallpaperRecord, batchId: string | null): Promise<string> {
    const categoryId = await this.getOrCreateCategory(record.category);

    const upsertSql = `
      INSERT INTO wallpapers (
        category_id,
        batch_id,
        title,
        tags,
        source_filename,
        content_hash,
        width,
        height,
        file_size,
        format,
        original_key,
        thumbnail_key,
        status,
        view_count,
        download_count,
        ranking_score,
        published_at,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), NOW()
      )
      -- Lưu ý: ON CONFLICT DO UPDATE cố tình không cập nhật 'status', 'view_count', 'download_count'
      -- để tránh ghi đè dữ liệu tương tác thực tế hoặc trạng thái đã bị admin thay đổi (ví dụ hidden).
      ON CONFLICT (content_hash) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        title = EXCLUDED.title,
        tags = EXCLUDED.tags,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        file_size = EXCLUDED.file_size,
        format = EXCLUDED.format,
        original_key = EXCLUDED.original_key,
        thumbnail_key = EXCLUDED.thumbnail_key,
        ranking_score = EXCLUDED.ranking_score,
        updated_at = NOW()
      RETURNING id;
    `;

    const values = [
      categoryId,
      batchId,
      record.title,
      record.tags,
      record.sourceFilename,
      record.contentHash,
      record.width,
      record.height,
      record.fileSize,
      record.format,
      record.originalKey,
      record.thumbnailKey,
      record.status,
      record.viewCount,
      record.downloadCount,
      record.rankingScore,
    ];

    const res = await pool.query(upsertSql, values);
    const wallpaperId = res.rows[0].id as string;

    // Đồng bộ quan hệ N-N sang bảng tags và wallpaper_tags (nếu cần)
    if (record.tags && record.tags.length > 0) {
      await this.syncTags(wallpaperId, record.tags);
    }

    return wallpaperId;
  }

  /**
   * Đồng bộ mảng tags sang bảng tags và wallpaper_tags
   */
  private async syncTags(wallpaperId: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const cleanTag = tag.trim().toLowerCase();
      if (!cleanTag) continue;
      const slug = cleanTag.replace(/[^\w-]/g, '');

      try {
        const tagRes = await pool.query(
          `INSERT INTO tags (name, slug)
           VALUES ($1, $2)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id;`,
          [cleanTag, slug]
        );
        const tagId = tagRes.rows[0]?.id;
        if (tagId) {
          await pool.query(
            `INSERT INTO wallpaper_tags (wallpaper_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING;`,
            [wallpaperId, tagId]
          );
        }
      } catch {
        // Bỏ qua lỗi phụ trợ để không làm gián đoạn luồng chính
      }
    }
  }
}

// ==============================================================================
// LAYER 3: INGESTION PIPELINE (PIPELINE ORCHESTRATOR)
// ==============================================================================

export class WallpaperPipeline {
  constructor(
    private datasetDir: string,
    private categoryCountsByRoot: Map<string, Map<string, number>>,
    private storageService: R2StorageService,
    private dbRepo: DatabaseRepository,
    private config: IngestionConfig,
    private batchId: string | null
  ) { }

  /**
   * Thực thi tuần tự 4 Giai đoạn cho 1 hình nền
   */
  async processItem(row: Record<string, string>): Promise<ProcessResult> {
    const wallpaperId = row['wallpaper_id'] || 'unknown';
    const localRelPath = row['local_file'] || '';

    // Bước 1: Phân giải đường dẫn file
    const absPath = PathResolver.resolve(this.datasetDir, localRelPath);
    if (!absPath) {
      return {
        status: 'error',
        wallpaperId,
        filePath: localRelPath,
        message: `File không tồn tại: ${localRelPath}`,
      };
    }

    // Bước 2: Quét file & Kiểm tra định dạng hợp lệ, kích thước
    let inspection: ImageInspection;
    try {
      inspection = await ImageProcessor.inspect(absPath);
      if (!inspection.isPortrait) {
        return {
          status: 'skipped',
          wallpaperId,
          filePath: localRelPath,
          message: `[EXCLUDE_LANDSCAPE] Bỏ qua vì không phải ảnh dọc hoặc quá nhỏ (${inspection.width}x${inspection.height})`,
        };
      }
    } catch (err: any) {
      return {
        status: 'error',
        wallpaperId,
        filePath: localRelPath,
        message: `[CORRUPT] Lỗi xử lý ảnh: ${err?.message || err}`,
      };
    }

    // Bước 3: Tính mã băm SHA-256 (Khóa an toàn Idempotency)
    let contentHash = '';
    try {
      contentHash = await ChecksumService.calculateSha256(absPath);
    } catch (err: any) {
      return {
        status: 'error',
        wallpaperId,
        filePath: localRelPath,
        message: `Lỗi tính SHA-256: ${err?.message || err}`,
      };
    }

    // Bước 4: Kiểm tra Idempotency trước khi upload R2 (Tiết kiệm chi phí)
    if (!this.config.dryRun && !this.config.skipDb && !this.config.forceMeta) {
      try {
        const exists = await this.dbRepo.checkContentHashExists(contentHash);
        if (exists) {
          return {
            status: 'skipped',
            wallpaperId,
            filePath: localRelPath,
            message: `[SKIP] Đã tồn tại content_hash và objects trên R2: ${contentHash}`,
          };
        }
      } catch (err: any) {
        // Nếu DB lỗi kiểm tra thì tiếp tục xử lý
      }
    }

    // Bước 5: Tạo ảnh thu nhỏ WebP trong RAM
    try {
      inspection.thumbnailBuffer = await ImageProcessor.createThumbnail(absPath, 480, 80);
    } catch (err: any) {
      return {
        status: 'error',
        wallpaperId,
        filePath: localRelPath,
        message: `Lỗi tạo thumbnail: ${err?.message || err}`,
      };
    }

    // Bước 6: Làm giàu Metadata & Phân tầng danh mục
    const rootCategory = (row['root_category'] || 'General').trim();
    const counts = this.categoryCountsByRoot.get(rootCategory) || new Map<string, number>();
    const enriched = MetadataEnricher.enrich(row, inspection.width, inspection.height, counts);

    // Bước 6: Tải tập tin lên Cloudflare R2
    let originalKey = `wallpapers/originals/${contentHash}.${inspection.format}`;
    let thumbnailKey = `wallpapers/thumbnails/${contentHash}.webp`;

    try {
      const keys = await this.storageService.uploadWallpaperPair(
        absPath,
        inspection.thumbnailBuffer,
        contentHash,
        inspection.format
      );
      originalKey = keys.originalKey;
      thumbnailKey = keys.thumbnailKey;
    } catch (err: any) {
      return {
        status: 'error',
        wallpaperId,
        filePath: localRelPath,
        message: `Lỗi upload R2: ${err?.message || err}`,
      };
    }

    // Đóng gói bản ghi hoàn chỉnh
    const viewCount = parseInt(row['view_count'] || '0', 10) || 0;
    const downloadCount = parseInt(row['download_count'] || '0', 10) || 0;
    const rankingScore = viewCount + 3 * downloadCount;

    const recordData: WallpaperRecord = {
      wallpaperId,
      contentHash,
      title: (row['title'] || `Wallpaper ${wallpaperId}`).trim(),
      category: rootCategory,
      subCategory: enriched.subCategory,
      tags: enriched.tags,
      sourceFilename: localRelPath,
      width: inspection.width,
      height: inspection.height,
      fileSize: inspection.fileSize,
      format: inspection.format,
      resolutionTier: enriched.resolutionTier,
      deviceTarget: enriched.deviceTarget,
      originalKey,
      thumbnailKey,
      status: 'published',
      viewCount,
      downloadCount,
      rankingScore,
    };

    // Bước 7: Ghi cơ sở dữ liệu PostgreSQL
    if (!this.config.dryRun && !this.config.skipDb) {
      try {
        await this.dbRepo.saveWallpaper(recordData, this.batchId);
      } catch (err: any) {
        return {
          status: 'error',
          wallpaperId,
          filePath: localRelPath,
          message: `Lỗi ghi Database: ${err?.message || err}`,
        };
      }
    }

    return {
      status: 'success',
      wallpaperId,
      filePath: localRelPath,
      message: 'OK',
      data: recordData,
    };
  }
}

// ==============================================================================
// LAYER 4: CLI CONTROLLER & REPORT ENGINE
// ==============================================================================

function parseArguments(): IngestionConfig {
  const args = process.argv.slice(2);
  const config: IngestionConfig = {
    datasetDir: process.env.DATASET_DIR || '',
    manifestPath: process.env.MANIFEST_FILE || '',
    zipPath: '',
    workers: 10,
    limit: 0,
    dryRun: false,
    skipR2: false,
    skipDb: false,
    forceMeta: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Wallpaper Data Ingestion CLI (TypeScript)
=========================================
Sử dụng:
  npm run ingest -- [options]

Tùy chọn:
  --zip <path>           Đường dẫn file ZIP dữ liệu (sẽ tự động giải nén vào tmp/)
  --dataset-dir <path>   Đường dẫn thư mục chứa dataset ảnh
  --manifest <path>      Đường dẫn trực tiếp file manifest.tsv
  --workers <number>     Số luồng xử lý đồng thời (mặc định: 10)
  --limit <number>       Giới hạn số ảnh xử lý (0 = xử lý toàn bộ)
  --dry-run              Chạy thử nghiệm (không upload R2 và không ghi DB)
  --skip-r2              Bỏ qua bước upload Cloudflare R2
  --skip-db              Bỏ qua bước ghi PostgreSQL
  --force-meta           Cập nhật lại metadata cho các ảnh đã tồn tại hash
  --help, -h             Hiển thị hướng dẫn này
      `);
      process.exit(0);
    } else if (arg === '--zip' && i + 1 < args.length) {
      config.zipPath = args[++i]!;
    } else if (arg === '--dataset-dir' && i + 1 < args.length) {
      config.datasetDir = args[++i]!;
    } else if (arg === '--manifest' && i + 1 < args.length) {
      config.manifestPath = args[++i]!;
    } else if (arg === '--workers' && i + 1 < args.length) {
      config.workers = parseInt(args[++i]!, 10) || 10;
    } else if (arg === '--limit' && i + 1 < args.length) {
      config.limit = parseInt(args[++i]!, 10) || 0;
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--skip-r2') {
      config.skipR2 = true;
    } else if (arg === '--skip-db') {
      config.skipDb = true;
    } else if (arg === '--force-meta') {
      config.forceMeta = true;
    }
  }

  return config;
}

/**
 * Đọc file TSV thành mảng đối tượng
 */
function parseTsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0]!.split('\t').map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split('\t');
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = (parts[j] || '').trim();
    }
    rows.push(row);
  }

  return rows;
}

export async function main() {
  const config = parseArguments();

  console.log('='.repeat(70));
  console.log('  WALLPAPER DATA INGESTION & METADATA ENRICHMENT PIPELINE (TYPESCRIPT)');
  console.log('='.repeat(70));

  // 1. Tự động xử lý file ZIP nếu được chỉ định hoặc tự động phát hiện
  const projectRoot = path.resolve(process.cwd(), '..');
  const possibleZipPaths = [
    config.zipPath,
    path.join(process.cwd(), config.zipPath),
    path.join(projectRoot, config.zipPath),
    path.join(projectRoot, 'wallpaper-demo-1000.zip'),
    path.join(process.cwd(), 'wallpaper-demo-1000.zip'),
  ].filter(Boolean);

  let targetZipPath = '';
  for (const z of possibleZipPaths) {
    if (z && fs.existsSync(z) && fs.statSync(z).isFile() && z.endsWith('.zip')) {
      targetZipPath = z;
      break;
    }
  }

  const tmpExtractDir = path.resolve(projectRoot, 'tmp');

  if (targetZipPath) {
    const manifestInTmp = path.join(tmpExtractDir, 'wallpaper-demo-1000', 'manifest.tsv');
    const directManifest = path.join(tmpExtractDir, 'manifest.tsv');

    // Kiểm tra nếu đã giải nén trước đó rồi
    if (fs.existsSync(manifestInTmp)) {
      console.log(`📁 Tìm thấy thư mục đã giải nén sẵn tại: ${path.dirname(manifestInTmp)}`);
      config.datasetDir = path.dirname(manifestInTmp);
      config.manifestPath = manifestInTmp;
    } else if (fs.existsSync(directManifest)) {
      console.log(`📁 Tìm thấy thư mục đã giải nén sẵn tại: ${tmpExtractDir}`);
      config.datasetDir = tmpExtractDir;
      config.manifestPath = directManifest;
    } else {
      const extractedDir = ZipExtractor.extractZip(targetZipPath, tmpExtractDir);
      config.datasetDir = extractedDir;
    }
  }

  // 2. Tự động dò tìm file manifest.tsv
  const manifestCandidates = [
    config.manifestPath,
    path.join(config.datasetDir, 'manifest.tsv'),
    path.join(config.datasetDir, 'wallpaper-demo-1000', 'manifest.tsv'),
    path.join(tmpExtractDir, 'manifest.tsv'),
    path.join(tmpExtractDir, 'wallpaper-demo-1000', 'manifest.tsv'),
    'd:/projects/wallpaper-demo-1000/manifest.tsv',
  ].filter(Boolean);

  let resolvedManifest = '';
  for (const cand of manifestCandidates) {
    if (cand && fs.existsSync(cand)) {
      resolvedManifest = path.resolve(cand);
      break;
    }
  }

  if (!resolvedManifest) {
    console.error(`❌ Lỗi: Không tìm thấy file manifest.tsv tại các vị trí khả dĩ.`);
    console.error(`   Vui lòng truyền đường dẫn: npm run ingest -- --manifest <path> hoặc --zip <path>`);
    process.exit(1);
  }

  config.manifestPath = resolvedManifest;
  if (!config.datasetDir) {
    config.datasetDir = path.dirname(resolvedManifest);
  }

  console.log(`📁 Thư mục Dataset: ${path.resolve(config.datasetDir)}`);
  console.log(`📄 Tập tin Manifest: ${config.manifestPath}`);
  console.log(`⚡ Concurrency Workers: ${config.workers}`);
  console.log(`🛡️ Chế độ Dry-Run: ${config.dryRun ? 'BẬT (Không ghi DB/R2)' : 'TẮT'}`);
  console.log('-'.repeat(70));

  // 3. Đọc dữ liệu từ manifest.tsv
  const manifestContent = await fs.promises.readFile(config.manifestPath, 'utf-8');
  let rows = parseTsv(manifestContent);
  const totalInManifest = rows.length;

  if (config.limit > 0) {
    rows = rows.slice(0, config.limit);
  }
  console.log(`📊 Tìm thấy tổng cộng ${totalInManifest} bản ghi. Sẽ xử lý: ${rows.length} ảnh.`);

  // 4. Thống kê phân bố danh mục phục vụ ngưỡng tần suất N >= 5
  const categoryCountsByRoot = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const root = (r['root_category'] || 'General').trim();
    const src = (r['source_category'] || '').trim();

    if (!categoryCountsByRoot.has(root)) {
      categoryCountsByRoot.set(root, new Map<string, number>());
    }
    const rootMap = categoryCountsByRoot.get(root)!;
    rootMap.set(src, (rootMap.get(src) || 0) + 1);
  }

  // 5. Khởi tạo Services
  const storageService = new R2StorageService(
    process.env.R2_BUCKET_NAME || 'wallpaper-assets',
    config.dryRun,
    config.skipR2
  );
  const dbRepo = new DatabaseRepository();

  const batchCode = `BATCH_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`;
  let batchId: string | null = null;
  if (!config.dryRun && !config.skipDb) {
    batchId = await dbRepo.createIngestionLog(batchCode, rows.length);
  }

  const pipeline = new WallpaperPipeline(
    config.datasetDir,
    categoryCountsByRoot,
    storageService,
    dbRepo,
    config,
    batchId
  );

  // 6. Thực thi đa luồng đồng thời (Asynchronous Concurrency Pool)
  console.log('\n🚀 Bắt đầu quá trình nạp dữ liệu...');
  const startTime = Date.now();
  const results: ProcessResult[] = [];

  let completedCount = 0;
  const queue = [...rows];
  const activeWorkers: Promise<void>[] = [];

  const worker = async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) break;

      const res = await pipeline.processItem(row);
      results.push(res);

      completedCount++;
      if (completedCount % 50 === 0 || completedCount === rows.length) {
        const percent = ((completedCount / rows.length) * 100).toFixed(1);
        console.log(`  -> Đã xử lý [${completedCount}/${rows.length}] ảnh (${percent}%)`);
      }
    }
  };

  const numWorkers = Math.min(config.workers, rows.length);
  for (let i = 0; i < numWorkers; i++) {
    activeWorkers.push(worker());
  }

  await Promise.all(activeWorkers);
  const duration = (Date.now() - startTime) / 1000;

  // 7. Thống kê kết quả
  let successCount = 0;
  let skippedCount = 0;
  let landscapeCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const errorsList: Array<{ wallpaperId: string; filePath: string; message: string }> = [];

  for (const r of results) {
    if (r.status === 'success') {
      successCount++;
    } else if (r.status === 'skipped') {
      skippedCount++;
      if (r.message.includes('EXCLUDE_LANDSCAPE')) {
        landscapeCount++;
      } else {
        duplicateCount++;
      }
    } else {
      errorCount++;
      errorsList.push({
        wallpaperId: r.wallpaperId,
        filePath: r.filePath,
        message: r.message,
      });
    }
  }

  // Cập nhật ingestion_logs
  if (!config.dryRun && !config.skipDb && batchId) {
    await dbRepo.finalizeIngestionLog(
      batchId,
      successCount,
      skippedCount,
      errorCount,
      errorCount === 0 ? 'completed' : 'failed'
    );
  }

  // 8. Xuất báo cáo tổng kết ra file JSON
  const reportDir = path.resolve(projectRoot, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportData: IngestionReportSummary = {
    timestamp: new Date().toISOString(),
    durationSeconds: parseFloat(duration.toFixed(2)),
    totalScanned: rows.length,
    successCount,
    skippedCount,
    landscapeExcludedCount: landscapeCount,
    duplicateSkippedCount: duplicateCount,
    errorCount,
    dbSavedCount: config.dryRun || config.skipDb ? 0 : successCount,
    errors: errorsList.slice(0, 100),
  };

  const reportPath = path.join(reportDir, 'ingestion-report.json');
  await fs.promises.writeFile(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');

  // In kết quả ra console
  console.log('\n' + '='.repeat(70));
  console.log('  BÁO CÁO TỔNG KẾT NẠP DỮ LIỆU (INGESTION REPORT)');
  console.log('='.repeat(70));
  console.log(`⏱️  Thời gian thực thi   : ${duration.toFixed(2)} giây (~${(rows.length / (duration || 1)).toFixed(1)} ảnh/giây)`);
  console.log(`🔢 Tổng số ảnh đã quét  : ${rows.length}`);
  console.log(`✅ Thành công (Success) : ${successCount} ảnh`);
  console.log(`⏭️  Bỏ qua (Skipped)    : ${skippedCount} ảnh (ngang: ${landscapeCount}, trùng hash: ${duplicateCount})`);
  console.log(`❌ Thất bại (Errors)    : ${errorCount} ảnh`);
  console.log(`📄 File báo cáo JSON    : ${reportPath}`);
  console.log('='.repeat(70));

  if (errorsList.length > 0) {
    console.log('\n🔍 Chi tiết một số mục bị lỗi:');
    for (const e of errorsList.slice(0, 10)) {
      console.log(`  - [${e.wallpaperId}] ${e.filePath}: ${e.message}`);
    }
  }

  // Đóng kết nối database pool để kết thúc tiến trình sạch sẽ
  await pool.end();
}

// Chạy trực tiếp CLI
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('/ingest.ts') ||
  process.argv[1]?.replace(/\\/g, '/').endsWith('/ingest.js');

if (isDirectRun) {
  main().catch((err) => {
    console.error('\n❌ Ingestion Pipeline gặp lỗi nghiêm trọng:', err);
    process.exit(1);
  });
}
