import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import type { AdminUser } from '../types';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Nếu không có token nào trong localStorage thì không cần chờ loading xác thực
    return !!localStorage.getItem('admin_token');
  });

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('admin_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          const verifiedUser = response.data.admin || response.data.user;
          setUser(verifiedUser);
          localStorage.setItem('admin_user', JSON.stringify(verifiedUser));
        } else {
          logout();
        }
      } catch (err: any) {
        // Chỉ đăng xuất khi máy chủ trả về lỗi xác thực 401 hoặc 403 (token hết hạn/sai)
        // Nếu là lỗi mất mạng tạm thời, giữ nguyên phiên đăng nhập của người dùng
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    if (response.success && response.data) {
      const newToken = response.data.accessToken || response.data.token;
      const newUser = response.data.admin || response.data.user;
      if (!newToken || !newUser) {
        throw new Error('Dữ liệu xác thực không hợp lệ từ máy chủ');
      }
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('admin_token', newToken);
      localStorage.setItem('admin_user', JSON.stringify(newUser));
    } else {
      throw new Error(response.error?.message || 'Đăng nhập không thành công');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
