-- ==========================================================
-- Xóa bảng và kiểu dữ liệu cũ nếu đã tồn tại (Clean Reset)
-- ==========================================================
DROP TABLE IF EXISTS collection_wallpapers CASCADE;
DROP TABLE IF EXISTS wallpaper_tags CASCADE;
DROP TABLE IF EXISTS interaction_logs CASCADE;
DROP TABLE IF EXISTS wallpapers CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS ingestion_logs CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

DROP TYPE IF EXISTS wallpaper_status CASCADE;
DROP TYPE IF EXISTS ingestion_status CASCADE;
DROP TYPE IF EXISTS interaction_action CASCADE;

-- ==========================================================
-- Kích hoạt tiện ích mở rộng
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================================
-- Định nghĩa các kiểu ENUM
-- ==========================================================
CREATE TYPE wallpaper_status AS ENUM ('draft', 'published', 'hidden');
CREATE TYPE ingestion_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE interaction_action AS ENUM ('VIEW', 'DOWNLOAD', 'APPLY');


-- ==========================================================
-- Khởi tạo các bảng
-- ==========================================================

-- 1. Bảng Quản trị viên (Admin Users)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng Danh mục hình nền (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    icon_url VARCHAR(500) NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng Thẻ từ khóa (Tags)
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng Nhật ký nạp lô dữ liệu (Ingestion Logs)
CREATE TABLE IF NOT EXISTS ingestion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    total_files INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    skipped_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    status ingestion_status NOT NULL DEFAULT 'processing',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- 5. Bảng Hình nền chính (Wallpapers) - Chứa các Khóa Ngoại FK rõ ràng
CREATE TABLE IF NOT EXISTS wallpapers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    created_by UUID NULL REFERENCES admins(id) ON DELETE SET NULL,
    batch_id UUID NULL REFERENCES ingestion_logs(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    source_filename VARCHAR(255) NOT NULL,
    content_hash CHAR(64) UNIQUE NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size BIGINT NOT NULL,
    format VARCHAR(20) NOT NULL,
    original_key VARCHAR(500) NOT NULL,
    thumbnail_key VARCHAR(500) NOT NULL,
    status wallpaper_status NOT NULL DEFAULT 'published',
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    ranking_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Bảng Trung gian Hình nền - Thẻ (Wallpaper Tags N-N)
CREATE TABLE IF NOT EXISTS wallpaper_tags (
    wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (wallpaper_id, tag_id)
);

-- 7. Bảng Bộ sưu tập / Album (Collections)
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    cover_image_url VARCHAR(500) NULL,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_by UUID NULL REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Bảng Trung gian Bộ sưu tập - Hình nền (Collection Wallpapers N-N)
CREATE TABLE IF NOT EXISTS collection_wallpapers (
    collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (collection_id, wallpaper_id)
);

-- 9. Bảng Nhật ký tương tác vô danh (Interaction Logs)
CREATE TABLE IF NOT EXISTS interaction_logs (
    id BIGSERIAL PRIMARY KEY,
    wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
    action_type interaction_action NOT NULL,
    device_id VARCHAR(100) NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Bảng Cấu hình hệ thống (System Config)
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);