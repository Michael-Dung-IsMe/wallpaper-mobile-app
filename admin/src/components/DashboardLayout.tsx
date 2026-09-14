import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Image as ImageIcon,
  FolderKanban,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const gmt7TimeString = timeFormatter.format(currentTime);
  const gmt7DateString = dateFormatter.format(currentTime);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Hình nền', path: '/wallpapers', icon: ImageIcon },
    { label: 'Danh mục', path: '/categories', icon: FolderKanban },
    { label: 'Thống kê', path: '/analytics', icon: BarChart3 },
    { label: 'Cài đặt', path: '/settings', icon: Settings },
  ];

  return (
    <div className="h-screen bg-[#0F0B18] text-[#F3DEFF] flex overflow-hidden">
      {/* Left Sidebar (Cố định nội dung navbar, luôn bám theo viewport) */}
      <aside className="w-64 h-screen flex-shrink-0 bg-[#15111E] border-r border-white/5 flex flex-col justify-between p-4 z-20 overflow-y-auto">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] p-0.5 shadow-lg shadow-[#7C3AED]/25 flex-shrink-0">
              <div className="w-full h-full bg-[#180429] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#D2BBFF]" />
              </div>
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-tight leading-tight">
                Wallpaper Admin
              </h2>
              <span className="text-[11px] text-[#A8A0B8] flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Super Admin Portal</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                      ? 'bg-gradient-to-r from-[#7C3AED]/25 to-transparent text-white border-l-4 border-[#7C3AED] shadow-sm'
                      : 'text-[#A8A0B8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar - User Profile & Logout */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="p-3 rounded-xl bg-[#1E1927]/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#D2BBFF] font-bold text-sm">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.username || 'admin'}
                </p>
                <p className="text-[10px] text-emerald-400 font-medium">Đang hoạt động</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <a
            href="https://wallpaperappbymichaeldung.stream"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 text-xs text-[#A8A0B8] hover:text-[#D2BBFF] transition-colors rounded-lg hover:bg-white/5"
          >
            <span>Xem website công khai</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </aside>

      {/* Main Content View (Cuộn mượt mà độc lập) */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#0F0B18]">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 border-b border-white/5 bg-[#15111E]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-gray-300">
              Hệ thống Wallpaper API & Object Storage R2 hoạt động ổn định
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs text-[#A8A0B8]">
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-[#1E1927] border border-white/10 font-mono text-[11px]">
              Cloudflare Tunnel SSL
            </span>

            {/* Real-time Tool GMT+7 (Cập nhật trực tiếp mỗi giây) */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#1E1927] border border-white/10 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-[#A78BFA] animate-pulse flex-shrink-0" />
              <span className="font-mono font-bold text-white tracking-wider text-xs">
                {gmt7TimeString}
              </span>
              <span className="hidden md:inline-block text-[11px] text-gray-400 border-l border-white/10 pl-2">
                {gmt7DateString}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#7C3AED]/25 text-[#D2BBFF] border border-[#7C3AED]/30">
                GMT+7
              </span>
            </div>
          </div>
        </header>

        {/* Routed Page Body */}
        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
