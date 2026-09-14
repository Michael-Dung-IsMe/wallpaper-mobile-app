import crypto from 'crypto';
import { pool } from '../db.js';

interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  icon_url: string;
  display_order: number;
}

interface SeedWallpaper {
  title: string;
  categorySlug: string;
  tags: string[];
  source_filename: string;
  width: number;
  height: number;
  file_size: number;
  format: string;
  original_key: string;
  thumbnail_key: string;
  view_count: number;
  download_count: number;
}

// Mock data

const CATEGORIES: SeedCategory[] = [
  {
    name: 'Anime',
    slug: 'anime',
    description: 'Hình nền các bộ phim Anime kinh điển và nhân vật nổi tiếng',
    icon_url: 'categories/anime.webp',
    display_order: 1,
  },
  {
    name: 'Nature',
    slug: 'nature',
    description: 'Phong cảnh thiên nhiên kỳ vĩ, núi non và đại dương',
    icon_url: 'categories/nature.webp',
    display_order: 2,
  },
  {
    name: 'Cyberpunk',
    slug: 'cyberpunk',
    description: 'Thế giới tương lai khoa học viễn tưởng và ánh đèn neon',
    icon_url: 'categories/cyberpunk.webp',
    display_order: 3,
  },
  {
    name: 'Cars',
    slug: 'cars',
    description: 'Siêu xe thể thao tốc độ và phương tiện cổ điển',
    icon_url: 'categories/cars.webp',
    display_order: 4,
  },
  {
    name: 'Minimalist',
    slug: 'minimalist',
    description: 'Phong cách tối giản tinh tế và trừu tượng',
    icon_url: 'categories/minimalist.webp',
    display_order: 5,
  },
];

const WALLPAPERS: SeedWallpaper[] = [
  {
    title: 'Son Goku Ultra Instinct',
    categorySlug: 'anime',
    tags: ['goku', 'dragon-ball', 'ultra-instinct', 'anime-boy', '4k'],
    source_filename: 'goku_ultra_instinct.jpg',
    width: 1080,
    height: 2400,
    file_size: 3145728,
    format: 'jpeg',
    original_key: 'wallpapers/originals/goku_ultra_instinct.jpg',
    thumbnail_key: 'wallpapers/thumbnails/goku_ultra_instinct.webp',
    view_count: 2450,
    download_count: 890,
  },
  {
    title: 'Roronoa Zoro King of Hell',
    categorySlug: 'anime',
    tags: ['zoro', 'one-piece', 'swordsman', 'anime', 'iphone'],
    source_filename: 'zoro_king_of_hell.jpg',
    width: 1170,
    height: 2532,
    file_size: 2890120,
    format: 'jpeg',
    original_key: 'wallpapers/originals/zoro_king_of_hell.jpg',
    thumbnail_key: 'wallpapers/thumbnails/zoro_king_of_hell.webp',
    view_count: 1820,
    download_count: 650,
  },
  {
    title: 'Majestic Alpine Lake Reflection',
    categorySlug: 'nature',
    tags: ['mountain', 'lake', 'nature', 'landscape', 'calm', '4k'],
    source_filename: 'alpine_lake_reflection.jpg',
    width: 1284,
    height: 2778,
    file_size: 4120300,
    format: 'jpeg',
    original_key: 'wallpapers/originals/alpine_lake_reflection.jpg',
    thumbnail_key: 'wallpapers/thumbnails/alpine_lake_reflection.webp',
    view_count: 1540,
    download_count: 420,
  },
  {
    title: 'Sunset Over Misty Pine Forest',
    categorySlug: 'nature',
    tags: ['forest', 'sunset', 'mist', 'fog', 'nature', 'android'],
    source_filename: 'misty_pine_forest.jpg',
    width: 1080,
    height: 2400,
    file_size: 2750000,
    format: 'jpeg',
    original_key: 'wallpapers/originals/misty_pine_forest.jpg',
    thumbnail_key: 'wallpapers/thumbnails/misty_pine_forest.webp',
    view_count: 1210,
    download_count: 310,
  },
  {
    title: 'Cyberpunk Neon City Rain Night',
    categorySlug: 'cyberpunk',
    tags: ['cyberpunk', 'neon', 'city', 'rain', 'futuristic', 'tokyo'],
    source_filename: 'cyberpunk_city_rain.jpg',
    width: 1080,
    height: 2400,
    file_size: 3450600,
    format: 'jpeg',
    original_key: 'wallpapers/originals/cyberpunk_city_rain.jpg',
    thumbnail_key: 'wallpapers/thumbnails/cyberpunk_city_rain.webp',
    view_count: 3100,
    download_count: 1150,
  },
  {
    title: 'Futuristic Mecha Samurai in Neo Tokyo',
    categorySlug: 'cyberpunk',
    tags: ['samurai', 'mecha', 'cyberpunk', 'katana', 'robot', '2k'],
    source_filename: 'mecha_samurai.png',
    width: 1440,
    height: 3120,
    file_size: 5120000,
    format: 'png',
    original_key: 'wallpapers/originals/mecha_samurai.png',
    thumbnail_key: 'wallpapers/thumbnails/mecha_samurai.webp',
    view_count: 2780,
    download_count: 980,
  },
  {
    title: 'Midnight Porsche 911 GT3 Under Streetlight',
    categorySlug: 'cars',
    tags: ['porsche', '911', 'supercar', 'speed', 'automotive', 'night'],
    source_filename: 'porsche_911_gt3.jpg',
    width: 1080,
    height: 2340,
    file_size: 2980000,
    format: 'jpeg',
    original_key: 'wallpapers/originals/porsche_911_gt3.jpg',
    thumbnail_key: 'wallpapers/thumbnails/porsche_911_gt3.webp',
    view_count: 2200,
    download_count: 740,
  },
  {
    title: 'Classic Vintage Shelby Cobra 427',
    categorySlug: 'cars',
    tags: ['shelby', 'cobra', 'classic-car', 'vintage', 'muscle-car'],
    source_filename: 'shelby_cobra_427.jpg',
    width: 1080,
    height: 2400,
    file_size: 2650000,
    format: 'jpeg',
    original_key: 'wallpapers/originals/shelby_cobra_427.jpg',
    thumbnail_key: 'wallpapers/thumbnails/shelby_cobra_427.webp',
    view_count: 980,
    download_count: 280,
  },
  {
    title: 'Minimalist Geometric Sand Dunes at Dusk',
    categorySlug: 'minimalist',
    tags: ['minimalist', 'sand', 'dunes', 'gradient', 'desert', 'clean'],
    source_filename: 'minimal_sand_dunes.jpg',
    width: 1170,
    height: 2532,
    file_size: 1950000,
    format: 'jpeg',
    original_key: 'wallpapers/originals/minimal_sand_dunes.jpg',
    thumbnail_key: 'wallpapers/thumbnails/minimal_sand_dunes.webp',
    view_count: 1420,
    download_count: 460,
  },
  {
    title: 'Abstract Dark Glass Sphere Prism',
    categorySlug: 'minimalist',
    tags: ['abstract', 'dark', 'sphere', 'glass', 'prism', 'minimalist', 'oled'],
    source_filename: 'dark_glass_sphere.png',
    width: 1290,
    height: 2796,
    file_size: 3820000,
    format: 'png',
    original_key: 'wallpapers/originals/dark_glass_sphere.png',
    thumbnail_key: 'wallpapers/thumbnails/dark_glass_sphere.webp',
    view_count: 1890,
    download_count: 610,
  },
];

async function seedDatabase() {
  const client = await pool.connect();

  console.log('--- Starting Seed Data (Task 2.6) ---');

  try {
    await client.query('BEGIN');

    // 1. Seed Categories
    console.log(`[1/2] Seeding ${CATEGORIES.length} categories...`);
    const categoryMap = new Map<string, number>();

    for (const cat of CATEGORIES) {
      const result = await client.query(
        `INSERT INTO categories (name, slug, description, icon_url, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name,
               description = EXCLUDED.description,
               icon_url = EXCLUDED.icon_url,
               display_order = EXCLUDED.display_order
         RETURNING id, slug;`,
        [cat.name, cat.slug, cat.description, cat.icon_url, cat.display_order]
      );
      categoryMap.set(cat.slug, result.rows[0].id);
    }
    console.log(`  -> Seeded categories successfully.`);

    // 2. Seed 10 Wallpapers
    console.log(`[2/2] Seeding ${WALLPAPERS.length} wallpapers...`);
    let insertedCount = 0;

    for (const item of WALLPAPERS) {
      const categoryId = categoryMap.get(item.categorySlug);
      if (!categoryId) {
        throw new Error(`Category not found for slug: ${item.categorySlug}`);
      }

      // Generate deterministic SHA-256 content hash based on source filename
      const contentHash = crypto
        .createHash('sha256')
        .update(`seed-salt-v1-${item.source_filename}`)
        .digest('hex');

      const rankingScore = item.view_count + 3 * item.download_count;

      const res = await client.query(
        `INSERT INTO wallpapers (
          category_id,
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
          published_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published', $12, $13, $14, NOW() - (INTERVAL '1 hour' * $15)
        )
        ON CONFLICT (content_hash) DO UPDATE
          SET category_id = EXCLUDED.category_id,
              title = EXCLUDED.title,
              tags = EXCLUDED.tags,
              width = EXCLUDED.width,
              height = EXCLUDED.height,
              file_size = EXCLUDED.file_size,
              format = EXCLUDED.format,
              original_key = EXCLUDED.original_key,
              thumbnail_key = EXCLUDED.thumbnail_key,
              status = 'published',
              view_count = EXCLUDED.view_count,
              download_count = EXCLUDED.download_count,
              ranking_score = EXCLUDED.ranking_score
        RETURNING id, title;`,
        [
          categoryId,
          item.title,
          item.tags,
          item.source_filename,
          contentHash,
          item.width,
          item.height,
          item.file_size,
          item.format,
          item.original_key,
          item.thumbnail_key,
          item.view_count,
          item.download_count,
          rankingScore,
          insertedCount * 2, // stagger published_at for sorting tests
        ]
      );

      insertedCount++;
      console.log(`  [${insertedCount}/${WALLPAPERS.length}] Seeded: "${res.rows[0].title}" (${res.rows[0].id})`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Database seed completed successfully with 10 wallpapers!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Database seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
