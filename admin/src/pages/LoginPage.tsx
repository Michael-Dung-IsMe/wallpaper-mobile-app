import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, Eye, EyeOff, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/wallpapers';

  // Nếu người dùng đã có phiên đăng nhập hợp lệ, chuyển thẳng tới trang quản trị
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0F0B18]">
      {/* Background Ambient Neon Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#EC4899]/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#180429]/40 rounded-full blur-[160px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#1E1927]/85 backdrop-blur-2xl border border-white/10 p-8 shadow-2xl shadow-black/80">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] shadow-lg shadow-[#7C3AED]/30 mb-4 p-0.5">
            <div className="w-full h-full bg-[#180429] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#D2BBFF]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Wallpaper HD Admin</h1>
          <p className="text-sm text-[#A8A0B8] mt-1.5">
            Nhập thông tin xác thực quản trị viên để vào trang điều khiển
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#D2BBFF] mb-2">
              Tài khoản Quản trị
            </label>
            <div className="relative rounded-xl bg-[#15111E] border border-white/10 focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-[#7C3AED]/25 transition-all">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A0B8]">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-transparent pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#D2BBFF]">
                Mật khẩu
              </label>
            </div>
            <div className="relative rounded-xl bg-[#15111E] border border-white/10 focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-[#7C3AED]/25 transition-all">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8A0B8]">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu quản trị"
                className="w-full bg-transparent pl-11 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A8A0B8] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember session */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-[#15111E] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
              />
              <span className="text-xs text-[#A8A0B8]">Duy trì phiên đăng nhập</span>
            </label>
            <span className="text-xs text-gray-500">v1.3</span>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#7C3AED] to-[#9061F9] hover:from-[#6D28D9] hover:to-[#7C3AED] active:scale-[0.99] transition-all shadow-lg shadow-[#7C3AED]/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Đăng nhập vào Hệ thống</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center space-x-2 text-xs text-[#A8A0B8]">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Bảo vệ bởi Cloudflare Tunnel & HTTPS</span>
        </div>
      </div>
    </div>
  );
};
