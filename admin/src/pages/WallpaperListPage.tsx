import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Edit3,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  X,
} from 'lucide-react';
import { wallpaperApi } from '../api/wallpaperApi';
import { WallpaperEditModal } from '../components/WallpaperEditModal';
import type { Wallpaper, Category } from '../types';

export const WallpaperListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const initialCategory = searchParams.get('category') || 'all';

  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Pagination State (Mặc định sắp xếp A-Z)
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [sortOption, setSortOption] = useState<string>('az');

  // Selected wallpaper for edit modal
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Load Categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await wallpaperApi.getCategories();
        if (res.success && res.data) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Wallpapers list
  const fetchWallpapers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await wallpaperApi.getWallpapers({
        page,
        limit,
        q: searchQuery.trim() || undefined,
        status: statusFilter,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        sort: sortOption,
      });

      if (res.success && res.data) {
        setWallpapers(res.data);
        if (res.meta) {
          setTotalCount(res.meta.total);
          setTotalPages(res.meta.totalPages);
        }
      } else {
        setErrorMsg(res.error?.message || 'Không thể tải danh sách hình nền');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchQuery, statusFilter, categoryFilter, sortOption]);

  useEffect(() => {
    fetchWallpapers();
  }, [fetchWallpapers]);

  // Đồng bộ category từ URL
  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    setCategoryFilter(cat);
  }, [searchParams]);

  const handleCategoryFilterChange = (catSlug: string) => {
    setCategoryFilter(catSlug);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (catSlug === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', catSlug);
    }
    navigate(`?${newParams.toString()}`);
  };

  const currentCategoryObj = categories.find(
    (c) => c.slug === categoryFilter || String(c.id) === categoryFilter
  );
  const currentCategoryName = currentCategoryObj ? currentCategoryObj.name : categoryFilter;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWallpapers();
  };

  // Đồng bộ trạng thái mở Side Peek với tham số URL (?edit=<id>)
  useEffect(() => {
    if (editId) {
      const found = wallpapers.find((w) => String(w.id) === String(editId));
      if (found) {
        setSelectedWallpaper(found);
        setIsEditModalOpen(true);
      } else {
        wallpaperApi
          .getWallpaperDetail(editId)
          .then((res) => {
            if (res.success && res.data) {
              setSelectedWallpaper(res.data);
              setIsEditModalOpen(true);
            }
          })
          .catch((err) => {
            console.error('Không tải được chi tiết ảnh:', err);
          });
      }
    } else {
      setIsEditModalOpen(false);
    }
  }, [editId, wallpapers]);

  const handleOpenEdit = (wallpaper: Wallpaper) => {
    setSelectedWallpaper(wallpaper);
    setIsEditModalOpen(true);
    // Chèn history state để người dùng có thể dùng nút Back trình duyệt hoặc bấm ra ngoài để Go Back
    const newParams = new URLSearchParams(searchParams);
    newParams.set('edit', String(wallpaper.id));
    navigate(`?${newParams.toString()}`);
  };

  const handleCloseEdit = () => {
    if (searchParams.has('edit')) {
      // Đúng yêu cầu: Quay về lịch sử (Go Back) thay vì chèn đường dẫn /wallpapers rồi forward
      navigate(-1);
    } else {
      setIsEditModalOpen(false);
      setSelectedWallpaper(null);
    }
  };

  const handleWallpaperSaved = (updated: Wallpaper) => {
    setWallpapers((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    setSelectedWallpaper(updated);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Published</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Draft</span>
          </span>
        );
      case 'hidden':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>Hidden</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Quản lý hình nền</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-xs text-[#D2BBFF] font-mono font-medium">
              {totalCount} ảnh
            </span>
          </div>
          <p className="text-xs text-[#A8A0B8] mt-1">
            Xem, tìm kiếm, lọc trạng thái và chỉnh sửa metadata đồng bộ với Mobile App
          </p>
        </div>

        <button
          onClick={() => fetchWallpapers()}
          disabled={isLoading}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1E1927] border border-white/10 text-xs font-medium text-gray-300 hover:text-white hover:border-white/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-[#15111E] border border-white/5 space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, danh mục, từ khóa tag (#goku, #4k)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1E1927] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1E1927] border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Published (Công khai)</option>
              <option value="draft">Draft (Bản nháp)</option>
              <option value="hidden">Hidden (Đã ẩn)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1E1927] border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name} ({cat.wallpaperCount || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="lg:col-span-2">
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1E1927] border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="az">Tiêu đề: A - Z</option>
              <option value="za">Tiêu đề: Z - A</option>
              <option value="latest">Mới nhất</option>
              <option value="popular">Điểm xếp hạng cao nhất</option>
              <option value="views">Lượt xem nhiều nhất</option>
              <option value="downloads">Lượt tải nhiều nhất</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="lg:col-span-1">
            <button
              type="submit"
              className="w-full h-full py-2.5 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              Tìm
            </button>
          </div>
        </form>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Category Filter Active Banner */}
      {categoryFilter !== 'all' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#7C3AED]/20 to-[#EC4899]/10 border border-[#7C3AED]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/25 border border-[#7C3AED]/40 flex items-center justify-center text-[#D2BBFF] flex-shrink-0">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <p className="text-white font-semibold flex items-center space-x-2">
                <span>Đang hiển thị danh mục:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#7C3AED]/40 text-[#D2BBFF] font-bold">
                  {currentCategoryName}
                </span>
              </p>
              <p className="text-[#A8A0B8] text-[11px] mt-0.5">
                Tổng cộng <span className="text-white font-medium">{totalCount}</span> hình nền trong danh mục này
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => handleCategoryFilterChange('all')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xem tất cả</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="px-3 py-1.5 rounded-xl bg-[#1E1927] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              Về trang Danh mục
            </button>
          </div>
        </div>
      )}

      {/* Wallpaper Data Table */}
      <div className="rounded-2xl bg-[#15111E] border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1E1927]/80 text-[#A8A0B8] border-b border-white/5 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-16">Ảnh</th>
                <th className="py-3.5 px-4">Tiêu đề & Thẻ</th>
                <th className="py-3.5 px-4 text-center">Danh mục</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Lượt xem</th>
                <th className="py-3.5 px-4 text-center">Lượt tải</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                // Skeleton loading rows
                [...Array(6)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="w-12 h-16 rounded-lg bg-white/5" />
                    </td>
                    <td className="py-3 px-4 space-y-2">
                      <div className="h-3 w-48 bg-white/5 rounded" />
                      <div className="h-2 w-28 bg-white/5 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 w-20 bg-white/5 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-16 bg-white/5 rounded-full" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-3 w-8 mx-auto bg-white/5 rounded" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-3 w-8 mx-auto bg-white/5 rounded" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-3 w-10 mx-auto bg-white/5 rounded" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-6 w-16 ml-auto bg-white/5 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : wallpapers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="font-medium">Không tìm thấy hình nền phù hợp</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái
                    </p>
                  </td>
                </tr>
              ) : (
                wallpapers.map((wallpaper) => (
                  <tr
                    key={wallpaper.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/60 border border-white/10 relative shadow-sm">
                        <img
                          src={wallpaper.thumbnailUrl}
                          alt={wallpaper.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    </td>

                    {/* Title & Tags */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-white truncate group-hover:text-[#D2BBFF] transition-colors">
                        {wallpaper.title}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1 overflow-hidden">
                        <span className="font-mono text-[10px] text-gray-400">#{wallpaper.id}</span>
                        {wallpaper.tags && wallpaper.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-[#A8A0B8] bg-white/5 px-1.5 py-0.5 rounded truncate"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 max-w-[180px] sm:max-w-[220px] text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryFilterChange(wallpaper.category.slug);
                        }}
                        className="inline-block px-2.5 py-1.5 rounded-lg bg-[#1E1927] border border-white/10 hover:border-[#7C3AED]/60 hover:bg-[#7C3AED]/15 hover:text-white text-gray-300 font-medium text-xs whitespace-normal break-words leading-relaxed shadow-sm transition-all cursor-pointer group/cat"
                        title={`Bấm để mở danh sách hình nền thuộc danh mục "${wallpaper.category.name}"`}
                      >
                        <span className="group-hover/cat:underline">{wallpaper.category.name}</span>
                      </button>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {getStatusBadge(wallpaper.status)}
                    </td>

                    {/* Views */}
                    <td className="py-3 px-4 text-center font-mono text-gray-300">
                      {wallpaper.viewCount.toLocaleString()}
                    </td>

                    {/* Downloads */}
                    <td className="py-3 px-4 text-center font-mono text-gray-300">
                      {wallpaper.downloadCount.toLocaleString()}
                    </td>

                    {/* Ranking Score */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-[#D2BBFF]">
                        {wallpaper.rankingScore.toLocaleString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(wallpaper)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#7C3AED]/25 hover:text-[#D2BBFF] border border-white/10 transition-all text-xs font-medium cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/5 bg-[#1E1927]/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A8A0B8]">
          <div>
            Hiển thị <span className="font-semibold text-white">{wallpapers.length}</span> /{' '}
            <span className="font-semibold text-white">{totalCount}</span> hình nền
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-2 rounded-lg bg-[#15111E] border border-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 rounded-lg bg-[#15111E] border border-white/10 font-mono text-white">
              Trang {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-2 rounded-lg bg-[#15111E] border border-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal / Drawer */}
      <WallpaperEditModal
        isOpen={isEditModalOpen}
        wallpaper={selectedWallpaper}
        categories={categories}
        onClose={handleCloseEdit}
        onSaved={handleWallpaperSaved}
      />
    </div>
  );
};
