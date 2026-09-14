import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, RefreshCw, ArrowRight } from 'lucide-react';
import { wallpaperApi } from '../api/wallpaperApi';
import type { Category } from '../types';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCats = async () => {
    setIsLoading(true);
    try {
      const res = await wallpaperApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const handleCategoryClick = (slug: string) => {
    // Chuyển hướng sang trang danh sách hình nền đã lọc theo danh mục này
    navigate(`/wallpapers?category=${slug}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Danh mục Hình nền</h1>
          <p className="text-xs text-[#A8A0B8] mt-1">
            Bấm vào bất kỳ danh mục nào để xem toàn bộ danh sách hình nền thuộc danh mục đó
          </p>
        </div>
        <button
          onClick={fetchCats}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1E1927] border border-white/10 text-xs font-medium text-gray-300 hover:text-white cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? [...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#15111E] border border-white/5 animate-pulse space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 bg-white/5 rounded" />
                      <div className="h-3 w-16 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-14 bg-white/5 rounded-full" />
                </div>
                <div className="h-4 w-full bg-white/5 rounded" />
              </div>
            ))
          : categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className="p-5 rounded-2xl bg-[#15111E] border border-white/5 hover:border-[#7C3AED]/60 hover:bg-[#1E1927]/60 hover:shadow-xl hover:shadow-[#7C3AED]/10 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group"
                title={`Xem tất cả hình nền thuộc danh mục "${cat.name}"`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#D2BBFF] group-hover:scale-110 transition-transform flex-shrink-0">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-[#D2BBFF] transition-colors">
                        {cat.name}
                      </h3>
                      <p className="font-mono text-xs text-gray-500 mt-0.5">slug: {cat.slug}</p>
                      {cat.description && (
                        <p className="text-xs text-[#A8A0B8] mt-1.5 line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#1E1927] border border-white/10 text-xs font-mono text-emerald-400 whitespace-nowrap flex-shrink-0">
                    {cat.wallpaperCount || 0} ảnh
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#A8A0B8] group-hover:text-[#D2BBFF]">
                  <span className="font-medium">Xem danh sách hình nền</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-[#A78BFA]" />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
};
