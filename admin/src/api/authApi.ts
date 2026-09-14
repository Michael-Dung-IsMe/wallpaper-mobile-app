import { axiosClient } from './axiosClient';
import type { ApiResponse, LoginResponseData, AdminUser } from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<ApiResponse<LoginResponseData>> => {
    // Gọi POST /admin/auth/login theo chuẩn hợp đồng API §4.7
    const response = await axiosClient.post<ApiResponse<LoginResponseData>>('/admin/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<{ user: AdminUser; admin?: AdminUser }>> => {
    const response = await axiosClient.get<ApiResponse<{ user: AdminUser; admin?: AdminUser }>>('/admin/me');
    return response.data;
  },
};
