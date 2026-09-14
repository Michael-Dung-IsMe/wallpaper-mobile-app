export interface WallpaperDimensions {
  width: number;
  height: number;
  aspectRatio: string;
}

export interface WallpaperCategory {
  id: number;
  name: string;
  slug: string;
}

export interface Wallpaper {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  originalUrl?: string;
  contentHash?: string;
  originalKey?: string;
  thumbnailKey?: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  tags: string[];
  status: 'published' | 'draft' | 'hidden';
  dimensions: WallpaperDimensions;
  category: WallpaperCategory;
  viewCount: number;
  downloadCount: number;
  rankingScore: number;
  publishedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  wallpaperCount?: number;
  displayOrder?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  nextPage?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta | null;
  error?: {
    code: string;
    message: string;
    details?: any[];
  } | null;
}

export interface AdminUser {
  id?: string;
  username: string;
  email?: string;
  fullName?: string;
  role: string;
}

export interface LoginResponseData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  admin: AdminUser;
  // Fallbacks
  token?: string;
  user?: AdminUser;
}

export interface UpdateWallpaperPayload {
  title: string;
  categoryId: number;
  tags: string[];
  status: 'published' | 'draft' | 'hidden';
}

export interface AnalyticsSummary {
  totalWallpapers: number;
  publishedCount: number;
  draftCount: number;
  hiddenCount: number;
  totalViews: number;
  totalDownloads: number;
  conversionRate: number;
  totalStorageBytes: number;
  totalStorageFormatted: string;
  totalCategories: number;
}

export interface AnalyticsTrendItem {
  date: string;
  views: number;
  downloads: number;
}

export interface CategoryStat {
  id: number;
  name: string;
  slug: string;
  wallpaperCount: number;
  views: number;
  downloads: number;
}

export interface FormatDistributionItem {
  format: string;
  count: number;
  percentage: number;
}

export interface StatusDistributionItem {
  status: 'published' | 'draft' | 'hidden';
  label: string;
  count: number;
  percentage: number;
}

export interface TopWallpaperItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  viewCount: number;
  downloadCount: number;
  rankingScore: number;
}

export interface TrendingTagItem {
  tag: string;
  count: number;
}

export interface AnalyticsData {
  range: '7d' | '30d';
  summary: AnalyticsSummary;
  trends: AnalyticsTrendItem[];
  categoryStats: CategoryStat[];
  formatDistribution: FormatDistributionItem[];
  statusDistribution: StatusDistributionItem[];
  topWallpapers: TopWallpaperItem[];
  trendingTags: TrendingTagItem[];
}

