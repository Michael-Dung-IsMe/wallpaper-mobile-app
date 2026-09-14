import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Download, Trophy, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { wallpaperApi } from '../api/wallpaperApi';
import type { Wallpaper, Category, UpdateWallpaperPayload } from '../types';

interface WallpaperEditModalProps {
  wallpaper: Wallpaper | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: Wallpaper) => void;
}

export const WallpaperEditModal: React.FC<WallpaperEditModalProps> = ({
  wallpaper,
  categories,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [activeWallpaper, setActiveWallpaper] = useState<Wallpaper | null>(wallpaper);
  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  const [isAnimatedIn, setIsAnimatedIn] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'published' | 'draft' | 'hidden'>('published');
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Synchronize wallpaper data into active state
  useEffect(() => {
    if (wallpaper) {
      setActiveWallpaper(wallpaper);
      setTitle(wallpaper.title);
      setCategoryId(wallpaper.category.id);
      setTags(wallpaper.tags || []);
      setStatus(wallpaper.status);
      setErrorMsg(null);
      setShowSuccessPopup(false);
    }
  }, [wallpaper]);

  // Handle smooth enter/exit animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small timeout allows initial DOM mount before triggering slide-in transition
      const enterTimer = setTimeout(() => {
        setIsAnimatedIn(true);
      }, 20);
      return () => clearTimeout(enterTimer);
    } else {
      setIsAnimatedIn(false);
      setShowSuccessPopup(false);
      // Wait for slide-out transition (300ms) to complete before unmounting
      const exitTimer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(exitTimer);
    }
  }, [isOpen]);

  // Auto-dismiss success pop-up after ~2.5 seconds
  useEffect(() => {
    if (showSuccessPopup) {
      const timer = setTimeout(() => {
        setShowSuccessPopup(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessPopup]);

  // Handle Escape key to close pop-up or side peek
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showSuccessPopup) {
          setShowSuccessPopup(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showSuccessPopup, onClose]);

  if (!shouldRender || !activeWallpaper) return null;

  const currentWallpaper = activeWallpaper;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Check if any tag changed compared to active baseline
  const hasTagChanged = () => {
    const originalTags = activeWallpaper?.tags || [];
    if (tags.length !== originalTags.length) return true;
    const sortedCurrent = [...tags].sort();
    const sortedOriginal = [...originalTags].sort();
    return sortedCurrent.some((t, idx) => t !== sortedOriginal[idx]);
  };

  // Check if user made any changes to the wallpaper
  const isChanged = Boolean(
    activeWallpaper &&
      (title.trim() !== activeWallpaper.title.trim() ||
        Number(categoryId) !== activeWallpaper.category.id ||
        status !== activeWallpaper.status ||
        hasTagChanged()) &&
      title.trim().length > 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChanged || isSaving) return;

    setErrorMsg(null);
    setIsSaving(true);

    const payload: UpdateWallpaperPayload = {
      title: title.trim(),
      categoryId: Number(categoryId),
      tags,
      status,
    };

    try {
      const response = await wallpaperApi.updateWallpaper(currentWallpaper.id, payload);
      if (response.success && response.data) {
        // Cập nhật dữ liệu mới lên danh sách và reset baseline dữ liệu của modal
        onSaved(response.data);
        setActiveWallpaper(response.data);
        setTitle(response.data.title);
        setCategoryId(response.data.category.id);
        setTags(response.data.tags || []);
        setStatus(response.data.status);
        // Bật pop-up thông báo thành công (tự biến mất sau ~2.5s và ở lại side peek)
        setShowSuccessPopup(true);
      } else {
        setErrorMsg(response.error?.message || 'Không thể lưu thay đổi');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Lỗi khi lưu metadata');
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ease-in-out ${
        isAnimatedIn ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop overlay: Click anywhere outside the side peek to go back */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
      />

      {/* Slide-over Drawer Panel with Smooth slide animation */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full max-w-2xl bg-[#15111E] border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden transform transition-transform duration-300 ease-out ${
          isAnimatedIn ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Success Feedback Pop-up Overlay */}
        {showSuccessPopup && (
          <div
            onClick={() => setShowSuccessPopup(false)}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/65 backdrop-blur-sm cursor-pointer transition-all animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-[#1E1927] border border-emerald-500/30 p-7 shadow-2xl shadow-black/80 flex flex-col items-center text-center transform transition-all animate-in zoom-in-95 duration-200"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">
                Cập nhật thành công!
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed max-w-xs">
                Thông tin hình nền đã được cập nhật thành công vào hệ thống.
              </p>
              <div className="mt-5 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tự động quay lại sau 2 giây...</span>
              </div>
            </div>
          </div>
        )}

        {/* Drawer Header */}
        <div className="shrink-0 p-6 border-b border-white/5 flex items-center justify-between bg-[#1E1927]/60">
          <div>
            <span className="text-xs font-mono font-bold text-[#A78BFA] uppercase tracking-wider">
              Chỉnh sửa hình nền
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5 truncate max-w-md">
              #{currentWallpaper.id} • {currentWallpaper.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Đóng (Quay lại)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Image Preview & Read-Only Technical Stats */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 rounded-2xl bg-[#1E1927]/50 border border-white/5">
            {/* Thumbnail View */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="w-full aspect-[9/16] max-h-64 rounded-xl overflow-hidden bg-black/60 border border-white/10 relative shadow-inner">
                <img
                  src={currentWallpaper.thumbnailUrl}
                  alt={currentWallpaper.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-white">
                  {currentWallpaper.dimensions.aspectRatio || '9:16'}
                </span>
              </div>
            </div>

            {/* Read-Only Stats */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-3 text-xs">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#A8A0B8] font-semibold mb-2">
                  Thông số Kỹ thuật
                </p>
                <div className="space-y-2 bg-[#15111E]/80 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Độ phân giải:</span>
                    <span className="font-mono text-white font-medium">
                      {currentWallpaper.width} × {currentWallpaper.height} px
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dung lượng:</span>
                    <span className="font-mono text-white">
                      {formatFileSize(currentWallpaper.fileSize)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Định dạng:</span>
                    <span className="font-mono text-white uppercase">{currentWallpaper.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ngày tạo:</span>
                    <span className="text-gray-300">
                      {currentWallpaper.publishedAt
                        ? new Date(currentWallpaper.publishedAt).toLocaleDateString('vi-VN')
                        : 'Chưa công khai'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#A8A0B8] font-semibold mb-2">
                  Số liệu tương tác (Chỉ đọc)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#15111E] border border-white/5 text-center">
                    <Eye className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                    <span className="text-xs font-bold text-white">{currentWallpaper.viewCount}</span>
                    <p className="text-[10px] text-gray-400">Lượt xem</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#15111E] border border-white/5 text-center">
                    <Download className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <span className="text-xs font-bold text-white">{currentWallpaper.downloadCount}</span>
                    <p className="text-[10px] text-gray-400">Lượt tải</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#15111E] border border-white/5 text-center">
                    <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <span className="text-xs font-bold text-white">{currentWallpaper.rankingScore}</span>
                    <p className="text-[10px] text-gray-400">Điểm hạng</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Editable Fields */}
          <div className="space-y-4 pt-2">
            {/* Title Input */}
            <div>
              <label className="block text-xs font-semibold text-[#D2BBFF] uppercase tracking-wider mb-2">
                Tiêu đề hình nền *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1E1927] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-xs font-semibold text-[#D2BBFF] uppercase tracking-wider mb-2">
                Danh mục *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#1E1927] border border-white/10 text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Manager */}
            <div>
              <label className="block text-xs font-semibold text-[#D2BBFF] uppercase tracking-wider mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-xs text-[#C4B5FD]"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-white ml-1 text-gray-400"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <span className="text-xs text-gray-500 italic">Chưa có tag nào</span>
                )}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Nhập tên tag và nhấn thêm..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#1E1927] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2.5 rounded-xl bg-[#1E1927] border border-white/10 hover:border-white/20 text-xs font-medium text-white transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm tag</span>
                </button>
              </div>
            </div>

            {/* Status Radio Buttons */}
            <div>
              <label className="block text-xs font-semibold text-[#D2BBFF] uppercase tracking-wider mb-2">
                Trạng thái hiển thị *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                    status === 'published'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-[#1E1927] border-white/5 text-gray-400 hover:border-white/10'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mb-1.5" />
                  <span className="text-xs font-bold">Published</span>
                  <span className="text-[10px] text-gray-400 text-center mt-0.5">Công khai trên App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                    status === 'draft'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-[#1E1927] border-white/5 text-gray-400 hover:border-white/10'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mb-1.5" />
                  <span className="text-xs font-bold">Draft</span>
                  <span className="text-[10px] text-gray-400 text-center mt-0.5">Lưu bản nháp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('hidden')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                    status === 'hidden'
                      ? 'bg-red-500/10 border-red-500/40 text-red-400'
                      : 'bg-[#1E1927] border-white/5 text-gray-400 hover:border-white/10'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400 mb-1.5" />
                  <span className="text-xs font-bold">Hidden</span>
                  <span className="text-[10px] text-gray-400 text-center mt-0.5">Ẩn khỏi app</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Drawer Footer Actions */}
        <div className="shrink-0 p-6 border-t border-white/5 bg-[#1E1927]/60 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !isChanged}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center space-x-2 ${
              isSaving || !isChanged
                ? 'opacity-40 bg-white/10 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-[#7C3AED] to-[#9061F9] hover:from-[#6D28D9] hover:to-[#7C3AED] shadow-lg shadow-[#7C3AED]/30 hover:shadow-[#7C3AED]/50 cursor-pointer active:scale-[0.98]'
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
