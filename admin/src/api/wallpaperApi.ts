import { axiosClient } from './axiosClient';
import type { ApiResponse, Wallpaper, Category, UpdateWallpaperPayload, AnalyticsData } from '../types';

export interface GetWallpapersParams {
  page?: number;
  limit?: number;
  status?: string;
  category_id?: number;
  category?: string;
  q?: string;
  sort?: string;
}

export const wallpaperApi = {
  // GET /admin/wallpapers theo Hợp đồng API §4.8
  getWallpapers: async (params: GetWallpapersParams): Promise<ApiResponse<Wallpaper[]>> => {
    const response = await axiosClient.get<ApiResponse<Wallpaper[]>>('/admin/wallpapers', {
      params,
    });
    return response.data;
  },

  // GET /admin/wallpapers/:id theo Hợp đồng API §4.9
  getWallpaperDetail: async (id: string): Promise<ApiResponse<Wallpaper>> => {
    const response = await axiosClient.get<ApiResponse<Wallpaper>>(`/admin/wallpapers/${id}`);
    return response.data;
  },

  // PUT /admin/wallpapers/:id theo Hợp đồng API §4.10
  updateWallpaper: async (id: string, payload: UpdateWallpaperPayload): Promise<ApiResponse<Wallpaper>> => {
    const response = await axiosClient.put<ApiResponse<Wallpaper>>(`/admin/wallpapers/${id}`, payload);
    return response.data;
  },

  // GET /categories (hoặc /api/categories theo Hợp đồng API §4.6)
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await axiosClient.get<ApiResponse<Category[]>>('/api/categories', {
      params: { include_empty: 'true' },
    });
    return response.data;
  },

  // GET /admin/analytics (Thống kê & Số liệu Admin)
  getAnalytics: async (range: '7d' | '30d' = '30d'): Promise<ApiResponse<AnalyticsData>> => {
    const response = await axiosClient.get<ApiResponse<AnalyticsData>>('/admin/analytics', {
      params: { range },
    });
    return response.data;
  },
};

