-- 002_index.sql
-- Chỉ mục (Indexes) và Hàm hỗ trợ tìm kiếm cho cơ sở dữ liệu Wallpaper

-- 1. Chỉ mục lọc trạng thái công khai (FR-017)
CREATE INDEX IF NOT EXISTS idx_wallpapers_status ON wallpapers(status);

-- 2. Chỉ mục 4 tiêu chí sắp xếp kèm tie-breaker (FR-003, SC-003: published_at DESC, id ASC)
CREATE INDEX IF NOT EXISTS idx_wallpapers_latest ON wallpapers(published_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_views ON wallpapers(view_count DESC, published_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_downloads ON wallpapers(download_count DESC, published_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_ranking ON wallpapers(ranking_score DESC, published_at DESC, id ASC);

-- 3. Chỉ mục lọc theo danh mục
CREATE INDEX IF NOT EXISTS idx_wallpapers_category_id ON wallpapers(category_id);

-- 4. Chỉ mục GIN mảng tags
CREATE INDEX IF NOT EXISTS idx_wallpapers_tags ON wallpapers USING GIN(tags);

-- 5. Chỉ mục Trigram tăng tốc tìm kiếm mờ (Fuzzy / ILIKE) trên title
CREATE INDEX IF NOT EXISTS idx_wallpapers_title_trgm ON wallpapers USING GIN(title gin_trgm_ops);

-- 6. Hàm wrapper immutable để dùng trong index GIN full-text search
CREATE OR REPLACE FUNCTION wallpapers_search_vector(
    title TEXT,
    tags TEXT[]
) RETURNS tsvector AS $$
    SELECT to_tsvector('simple',
        coalesce(title, '') || ' ' ||
        array_to_string(tags, ' ')
    );
$$ LANGUAGE sql IMMUTABLE;

-- 7. Chỉ mục tìm kiếm toàn văn kết hợp (Title, Tags) đáp ứng NFR-002 < 1s
CREATE INDEX IF NOT EXISTS idx_wallpapers_search_gin ON wallpapers USING GIN(
    wallpapers_search_vector(title, tags)
);

-- 8. Chỉ mục bổ trợ cho các bảng danh mục, tags, collections và logs
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order ASC);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_wallpaper_tags_tag_id ON wallpaper_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_collection_wallpapers_wallpaper_id ON collection_wallpapers(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_wallpaper_id ON interaction_logs(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON interaction_logs(created_at DESC);