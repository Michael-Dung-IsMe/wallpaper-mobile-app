import {
  ApiResponse,
  Category,
  DownloadResponse,
  FetchWallpapersParams,
  Wallpaper,
} from './types';

// Default Base URL for API
// - With real device via USB & ADB reverse (`adb reverse tcp:3000 tcp:3000`), http://localhost:3000/api works directly!
// - If using Android Emulator without adb reverse, default fallback is http://10.0.2.2:3000/api
export const DEFAULT_BASE_URL = 'https://api.wallpaperappbymichaeldung.stream';

let customBaseUrl: string | null = null;

export const setApiBaseUrl = (url: string) => {
  customBaseUrl = url;
};

export const getApiBaseUrl = (): string => {
  return customBaseUrl || DEFAULT_BASE_URL;
};

async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || `Request failed with status ${response.status}`
      );
    }

    return data as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Kết nối tới Server quá thời gian (Timeout). Vui lòng thử lại.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  /**
   * Fetch wallpapers with pagination, category filter, full-text search, and 4 sort modes
   */
  async getWallpapers(
    params: FetchWallpapersParams = {}
  ): Promise<ApiResponse<Wallpaper[]>> {
    const baseUrl = getApiBaseUrl();
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.category) searchParams.append('category', params.category);
    if (params.q) searchParams.append('q', params.q);
    if (params.sort) searchParams.append('sort', params.sort);

    const queryString = searchParams.toString();
    const fullUrl = `${baseUrl}/wallpapers${queryString ? `?${queryString}` : ''}`;

    return fetchWithTimeout<ApiResponse<Wallpaper[]>>(fullUrl);
  },

  /**
   * Fetch categories list
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    const baseUrl = getApiBaseUrl();
    return fetchWithTimeout<ApiResponse<Category[]>>(`${baseUrl}/categories`);
  },

  /**
   * Fetch single wallpaper detail by ID
   */
  async getWallpaperDetail(id: string): Promise<ApiResponse<Wallpaper>> {
    const baseUrl = getApiBaseUrl();
    return fetchWithTimeout<ApiResponse<Wallpaper>>(`${baseUrl}/wallpapers/${id}`);
  },

  /**
   * Record wallpaper view (increments view_count & recalculates ranking score)
   */
  async recordView(
    id: string
  ): Promise<ApiResponse<{ id: string; viewCount: number; rankingScore: number }>> {
    const baseUrl = getApiBaseUrl();
    return fetchWithTimeout<
      ApiResponse<{ id: string; viewCount: number; rankingScore: number }>
    >(`${baseUrl}/wallpapers/${id}/view`, {
      method: 'POST',
    });
  },

  /**
   * Record download / apply & fetch Presigned R2 URL (expires in 60s)
   */
  async recordDownload(
    id: string,
    action: 'DOWNLOAD' | 'APPLY' = 'DOWNLOAD',
    deviceId?: string
  ): Promise<ApiResponse<DownloadResponse>> {
    const baseUrl = getApiBaseUrl();
    return fetchWithTimeout<ApiResponse<DownloadResponse>>(
      `${baseUrl}/wallpapers/${id}/download`,
      {
        method: 'POST',
        body: JSON.stringify({ action, deviceId }),
      }
    );
  },
};
