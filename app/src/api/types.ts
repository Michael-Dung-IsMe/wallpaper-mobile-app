export type SortOption = 'latest' | 'popular' | 'views' | 'downloads' | 'ranking';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  displayOrder?: number;
  wallpaperCount?: number;
}

export interface WallpaperCategoryInfo {
  id: number;
  name: string;
  slug: string;
}

export interface WallpaperDimensions {
  width: number;
  height: number;
  aspectRatio?: string;
}

export interface Wallpaper {
  id: string;
  categoryId: number;
  title: string;
  slug: string;
  tags: string[];
  dimensions?: WallpaperDimensions;
  width?: number;
  height?: number;
  fileSize: number;
  format: string;
  thumbnailUrl: string;
  status: 'draft' | 'published' | 'hidden';
  viewCount: number;
  downloadCount: number;
  rankingScore: number;
  publishedAt: string;
  category?: WallpaperCategoryInfo;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  nextPage: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: string | null;
}

export interface DownloadResponse {
  wallpaperId?: string;
  id?: string;
  downloadUrl?: string;
  presignedUrl?: string;
  expiresIn: number;
  downloadCount: number;
  rankingScore: number;
}

export interface FetchWallpapersParams {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
  sort?: SortOption;
}
