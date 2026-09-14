import React from 'react';
import { Shield, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Cài đặt Hệ thống</h1>
        <p className="text-xs text-[#A8A0B8] mt-1">
          Thông tin cấu hình máy chủ, hạ tầng mạng và tài khoản quản trị
        </p>
      </div>

      <div className="space-y-4">
        {/* Admin Account */}
        <div className="p-6 rounded-2xl bg-[#15111E] border border-white/5 space-y-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-[#7C3AED]" />
            <h3 className="font-bold text-white text-sm">Tài khoản Quản trị viên</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#1E1927] border border-white/5">
              <span className="text-gray-400">Tên người dùng:</span>
              <p className="font-mono text-white font-semibold mt-1">{user?.username || 'admin'}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#1E1927] border border-white/5">
              <span className="text-gray-400">Vai trò (Role):</span>
              <p className="font-mono text-emerald-400 font-semibold mt-1">{user?.role || 'admin'}</p>
            </div>
          </div>
        </div>

        {/* Infrastructure Specs */}
        <div className="p-6 rounded-2xl bg-[#15111E] border border-white/5 space-y-4">
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-sm">Thông tin Hạ tầng VPS & Mạng</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E1927] border border-white/5">
              <span className="text-gray-400">Tên miền Quản trị (Admin Hostname):</span>
              <span className="font-mono text-[#D2BBFF]">admin.wallpaperappbymichaeldung.stream</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E1927] border border-white/5">
              <span className="text-gray-400">Tên miền API (Public Backend API):</span>
              <span className="font-mono text-[#D2BBFF]">api.wallpaperappbymichaeldung.stream</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E1927] border border-white/5">
              <span className="text-gray-400">Bảo mật & Chứng chỉ SSL:</span>
              <span className="text-emerald-400 font-medium">Cloudflare Zero Trust Tunnel HTTPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
