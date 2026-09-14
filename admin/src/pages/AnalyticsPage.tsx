import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Image as ImageIcon,
  Eye,
  Download,
  HardDrive,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  FolderKanban,
  Tag,
  Edit3,
  Layers,
  Sparkles,
} from 'lucide-react';
import { wallpaperApi } from '../api/wallpaperApi';
import { WallpaperEditModal } from '../components/WallpaperEditModal';
import type { AnalyticsData, Wallpaper, Category } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Hover state for Trend Chart Tooltip
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Edit modal state for Top Wallpapers
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await wallpaperApi.getAnalytics(range);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setErrorMsg(res.error?.message || 'Không thể tải dữ liệu thống kê');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Lỗi khi gọi API Analytics');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    wallpaperApi.getCategories().then((res) => {
      if (res.success && res.data) {
        setCategories(res.data);
      }
    }).catch((e) => console.warn('Không tải được danh mục:', e));
  }, []);

  const handleOpenEdit = async (id: string) => {
    try {
      const res = await wallpaperApi.getWallpaperDetail(id);
      if (res.success && res.data) {
        setSelectedWallpaper(res.data);
        setIsEditModalOpen(true);
      }
    } catch (e) {
      console.error('Lỗi khi mở chi tiết hình nền:', e);
    }
  };

  const handleSavedWallpaper = () => {
    fetchAnalytics();
  };

  // Tính toán tọa độ cho SVG Trend Chart
  const renderTrendChart = () => {
    if (!data || !data.trends || data.trends.length === 0) return null;

    const trends = data.trends;
    const maxVal = Math.max(
      ...trends.map((t) => Math.max(t.views, t.downloads)),
      10 // Tối thiểu 10 để tránh chia cho 0
    );

    const svgWidth = 800;
    const svgHeight = 240;
    const paddingX = 40;
    const paddingY = 30;
    const chartW = svgWidth - paddingX * 2;
    const chartH = svgHeight - paddingY * 2;

    const getX = (index: number) => paddingX + (index / (trends.length - 1 || 1)) * chartW;
    const getY = (val: number) => paddingY + chartH - (val / maxVal) * chartH;

    // Tạo chuỗi tọa độ cho đường Views
    const viewsPoints = trends.map((t, idx) => ({ x: getX(idx), y: getY(t.views) }));
    const downloadsPoints = trends.map((t, idx) => ({ x: getX(idx), y: getY(t.downloads) }));

    const viewsLinePath = viewsPoints.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`),
      ''
    );
    const viewsAreaPath = `${viewsLinePath} L ${viewsPoints[viewsPoints.length - 1].x},${paddingY + chartH} L ${viewsPoints[0].x},${paddingY + chartH} Z`;

    const downloadsLinePath = downloadsPoints.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`),
      ''
    );
    const downloadsAreaPath = `${downloadsLinePath} L ${downloadsPoints[downloadsPoints.length - 1].x},${paddingY + chartH} L ${downloadsPoints[0].x},${paddingY + chartH} Z`;

    // 4 đường kẻ ngang gridline
    const gridLines = [0, 0.33, 0.66, 1].map((ratio) => {
      const y = paddingY + chartH * (1 - ratio);
      const val = Math.round(maxVal * ratio);
      return { y, val };
    });

    const hoveredItem = hoveredTrendIndex !== null ? trends[hoveredTrendIndex] : null;

    return (
      <div className="relative w-full">
        {/* SVG Canvas */}
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-56 sm:h-64"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="downloadsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {gridLines.map((gl, i) => (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={gl.y}
                  x2={svgWidth - paddingX}
                  y2={gl.y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={gl.y + 4}
                  fill="#71717A"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {gl.val}
                </text>
              </g>
            ))}

            {/* Area Fill Views */}
            <path d={viewsAreaPath} fill="url(#viewsGrad)" />
            {/* Line Views */}
            <path
              d={viewsLinePath}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Area Fill Downloads */}
            <path d={downloadsAreaPath} fill="url(#downloadsGrad)" />
            {/* Line Downloads */}
            <path
              d={downloadsLinePath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Vertical Guide Line */}
            {hoveredTrendIndex !== null && (
              <line
                x1={getX(hoveredTrendIndex)}
                y1={paddingY}
                x2={getX(hoveredTrendIndex)}
                y2={paddingY + chartH}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="3 3"
              />
            )}

            {/* Data point dots */}
            {trends.map((t, idx) => {
              const vx = getX(idx);
              const vy = getY(t.views);
              const dx = getX(idx);
              const dy = getY(t.downloads);
              const isHovered = hoveredTrendIndex === idx;

              return (
                <g key={idx}>
                  {/* Invisible touch/hover target column */}
                  <rect
                    x={vx - chartW / (trends.length * 2)}
                    y={paddingY}
                    width={chartW / trends.length}
                    height={chartH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredTrendIndex(idx)}
                  />

                  {/* Views Dot */}
                  <circle
                    cx={vx}
                    cy={vy}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#15111E"
                    stroke="#8B5CF6"
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-150 pointer-events-none"
                  />

                  {/* Downloads Dot */}
                  <circle
                    cx={dx}
                    cy={dy}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#15111E"
                    stroke="#10B981"
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-150 pointer-events-none"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* X-Axis Date Labels */}
        <div className="flex justify-between px-10 text-[10px] font-mono text-gray-500 pt-1 border-t border-white/5">
          <span>{trends[0]?.date ? new Date(trends[0].date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''}</span>
          {trends.length > 2 && (
            <span>
              {trends[Math.floor(trends.length / 2)]?.date
                ? new Date(trends[Math.floor(trends.length / 2)].date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                : ''}
            </span>
          )}
          <span>{trends[trends.length - 1]?.date ? new Date(trends[trends.length - 1].date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''}</span>
        </div>

        {/* Tooltip Overlay */}
        {hoveredItem && (
          <div className="mt-3 p-3 rounded-xl bg-[#1E1927]/90 border border-white/10 backdrop-blur-md text-xs flex items-center justify-between shadow-xl max-w-sm mx-auto">
            <div className="font-mono text-gray-300">
              📅 Ngày: <span className="font-bold text-white">{hoveredItem.date}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5 text-violet-400">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                <span>Xem: <strong>{hoveredItem.views.toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Tải: <strong>{hoveredItem.downloads.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Thống kê & Số liệu</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-xs text-[#D2BBFF] font-mono font-medium">
              Real-time Analytics
            </span>
          </div>
          <p className="text-xs text-[#A8A0B8] mt-1">
            Báo cáo hiệu suất lượt xem, lượt tải và phân tích kho hình nền hệ thống
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className="flex rounded-xl bg-[#15111E] border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setRange('7d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === '7d'
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#9061F9] text-white shadow-md shadow-[#7C3AED]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              7 ngày
            </button>
            <button
              type="button"
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === '30d'
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#9061F9] text-white shadow-md shadow-[#7C3AED]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              30 ngày
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-[#15111E] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#7C3AED]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 5 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Wallpapers */}
        <div className="p-5 rounded-2xl bg-[#15111E] border border-white/5 relative overflow-hidden flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-[#A8A0B8]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Kho hình nền</span>
            <div className="p-2 rounded-xl bg-[#7C3AED]/15 text-[#A78BFA]">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white tracking-tight">
              {isLoading ? '...' : (data?.summary.totalWallpapers || 0).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                {data?.summary.publishedCount || 0} hiện
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
                {data?.summary.draftCount || 0} nháp
              </span>
              <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">
                {data?.summary.hiddenCount || 0} ẩn
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Views */}
        <div className="p-5 rounded-2xl bg-[#15111E] border border-white/5 relative overflow-hidden flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-[#A8A0B8]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Tổng lượt xem</span>
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white tracking-tight">
              {isLoading ? '...' : (data?.summary.totalViews || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Toàn bộ lượt xem trên App</p>
          </div>
        </div>

        {/* Metric 3: Total Downloads */}
        <div className="p-5 rounded-2xl bg-[#15111E] border border-white/5 relative overflow-hidden flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-[#A8A0B8]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Tổng lượt tải</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white tracking-tight">
              {isLoading ? '...' : (data?.summary.totalDownloads || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Lượt tải về máy & Set ảnh</p>
          </div>
        </div>

        {/* Metric 4: Conversion Rate */}
        <div className="p-5 rounded-2xl bg-[#15111E] border border-white/5 relative overflow-hidden flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-[#A8A0B8]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Tỷ lệ chuyển đổi</span>
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white tracking-tight">
              {isLoading ? '...' : `${data?.summary.conversionRate || 0}%`}
            </p>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-violet-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, data?.summary.conversionRate || 0)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Lượt tải / Lượt xem</p>
          </div>
        </div>

        {/* Metric 5: Storage R2 */}
        <div className="p-5 rounded-2xl bg-[#15111E] border border-white/5 relative overflow-hidden flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-[#A8A0B8]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Lưu trữ R2 CDN</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white tracking-tight">
              {isLoading ? '...' : data?.summary.totalStorageFormatted || '0 B'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Cloudflare R2 • {data?.summary.totalCategories || 0} danh mục
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart: Time-series Trend */}
      <div className="p-6 rounded-2xl bg-[#15111E] border border-white/5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
              <span>Xu hướng Lượt xem vs Lượt tải</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Dữ liệu tương tác thực tế ghi nhận từ người dùng ứng dụng ({range === '7d' ? '7 ngày qua' : '30 ngày qua'})
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
              <span className="text-gray-300 font-medium">Lượt xem (Views)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span className="text-gray-300 font-medium">Lượt tải (Downloads)</span>
            </div>
          </div>
        </div>

        {/* Render Chart */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#7C3AED]" />
            <span>Đang tổng hợp dữ liệu thời gian...</span>
          </div>
        ) : (
          renderTrendChart()
        )}
      </div>

      {/* Category Performance & Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Performance (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#15111E] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <FolderKanban className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-base font-bold text-white">Hiệu suất theo Danh mục</h2>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {data?.categoryStats.length || 0} danh mục
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-gray-500">Đang tải danh mục...</div>
            ) : !data?.categoryStats || data.categoryStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">Chưa có số liệu danh mục</div>
            ) : (
              data.categoryStats.map((cat) => {
                const maxDownloads = Math.max(...data.categoryStats.map((c) => c.downloads), 1);
                const percent = Math.min(100, Math.round((cat.downloads / maxDownloads) * 100));

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{cat.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">({cat.wallpaperCount} ảnh)</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] font-mono">
                        <span className="text-gray-400">{cat.views.toLocaleString()} views</span>
                        <span className="text-emerald-400 font-semibold">{cat.downloads.toLocaleString()} tải</span>
                      </div>
                    </div>
                    {/* Horizontal Bar */}
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Breakdown: Status & Format (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#15111E] border border-white/5 shadow-xl space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
              <Layers className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-base font-bold text-white">Phân bố Kho nội dung</h2>
            </div>

            {/* Status Breakdown */}
            <div className="mt-4 space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                Trạng thái hiển thị
              </p>
              <div className="grid grid-cols-3 gap-2">
                {data?.statusDistribution.map((item) => (
                  <div
                    key={item.status}
                    className="p-3 rounded-xl bg-[#1E1927]/60 border border-white/5 text-center"
                  >
                    <div className="text-base font-bold font-mono text-white">
                      {item.count.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-400 capitalize mt-0.5">{item.status}</div>
                    <div className="text-[10px] font-mono text-[#A78BFA] mt-1">{item.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Format Breakdown */}
            <div className="mt-6 space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                Định dạng tập tin
              </p>
              <div className="space-y-2">
                {data?.formatDistribution.map((fmt) => (
                  <div
                    key={fmt.format}
                    className="p-3 rounded-xl bg-[#1E1927]/60 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="font-mono uppercase font-bold text-white">{fmt.format}</span>
                    </div>
                    <div className="flex items-center space-x-3 font-mono">
                      <span className="text-gray-400">{fmt.count.toLocaleString()} file</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px]">
                        {fmt.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
            <span>Tối ưu hóa nén tự động</span>
            <span className="text-emerald-400 font-mono">WebP Lossless Cache</span>
          </div>
        </div>
      </div>

      {/* Top 10 Wallpapers Leaderboard Table */}
      <div className="rounded-2xl bg-[#15111E] border border-white/5 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#1E1927]/40">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Top 10 Hình nền xuất sắc nhất</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Xếp hạng theo công thức chuẩn: <code className="text-amber-400 font-mono">ranking_score = views + 3 × downloads</code>
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold">
            Leaderboard
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1E1927]/80 text-[#A8A0B8] border-b border-white/5 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Hạng</th>
                <th className="py-3.5 px-4 w-16">Ảnh</th>
                <th className="py-3.5 px-4">Tiêu đề & Danh mục</th>
                <th className="py-3.5 px-4 text-center">Lượt xem</th>
                <th className="py-3.5 px-4 text-center">Lượt tải</th>
                <th className="py-3.5 px-4 text-center">Điểm Score</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Đang tải danh sách bảng xếp hạng...
                  </td>
                </tr>
              ) : !data?.topWallpapers || data.topWallpapers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Chưa có hình nền nào trong bảng xếp hạng
                  </td>
                </tr>
              ) : (
                data.topWallpapers.map((wp, index) => {
                  const rank = index + 1;
                  return (
                    <tr
                      key={wp.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Rank Badge */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {rank === 1 && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40 text-xs shadow-sm shadow-amber-400/20">
                            1
                          </span>
                        )}
                        {rank === 2 && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-bold border border-slate-300/40 text-xs">
                            2
                          </span>
                        )}
                        {rank === 3 && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 font-bold border border-amber-700/40 text-xs">
                            3
                          </span>
                        )}
                        {rank > 3 && (
                          <span className="text-gray-500 font-semibold">{rank}</span>
                        )}
                      </td>

                      {/* Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="w-12 aspect-[9/16] rounded-lg overflow-hidden bg-black/50 border border-white/10 shadow-sm relative">
                          <img
                            src={wp.thumbnailUrl}
                            alt={wp.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      </td>

                      {/* Title & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white line-clamp-1 max-w-xs sm:max-w-md">
                          {wp.title}
                        </div>
                        <div className="mt-1 flex items-center space-x-1.5 text-[11px] text-gray-400">
                          <span className="px-2 py-0.5 rounded-md bg-[#1E1927] border border-white/5 text-gray-300">
                            {wp.category.name}
                          </span>
                        </div>
                      </td>

                      {/* Views */}
                      <td className="py-3.5 px-4 text-center font-mono text-gray-300">
                        {wp.viewCount.toLocaleString()}
                      </td>

                      {/* Downloads */}
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-400 font-medium">
                        {wp.downloadCount.toLocaleString()}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-xs font-mono font-bold text-[#D2BBFF]">
                          <Sparkles className="w-3 h-3 text-[#A78BFA]" />
                          <span>{wp.rankingScore.toLocaleString()}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(wp.id)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#7C3AED]/20 hover:text-[#D2BBFF] text-gray-300 border border-white/5 transition-all text-xs flex items-center space-x-1.5 ml-auto cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trending Tags Cloud */}
      <div className="p-6 rounded-2xl bg-[#15111E] border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-[#7C3AED]" />
            <h2 className="text-base font-bold text-white">Từ khóa thịnh hành (Trending Tags)</h2>
          </div>
          <span className="text-xs text-gray-400">Top 15 thẻ phổ biến</span>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {isLoading ? (
            <div className="text-xs text-gray-500 py-4">Đang tải thẻ từ khóa...</div>
          ) : !data?.trendingTags || data.trendingTags.length === 0 ? (
            <div className="text-xs text-gray-500 py-4">Chưa có thẻ từ khóa nào</div>
          ) : (
            data.trendingTags.map((t) => (
              <span
                key={t.tag}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E1927] border border-white/10 hover:border-[#7C3AED]/50 text-xs font-medium text-gray-300 hover:text-white transition-all cursor-default shadow-sm"
              >
                <span className="text-[#A78BFA]">#</span>
                <span>{t.tag}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/5 text-[10px] font-mono text-gray-400">
                  {t.count}
                </span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Wallpaper Edit Modal */}
      <WallpaperEditModal
        isOpen={isEditModalOpen}
        wallpaper={selectedWallpaper}
        categories={categories}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWallpaper(null);
        }}
        onSaved={handleSavedWallpaper}
      />
    </div>
  );
};
