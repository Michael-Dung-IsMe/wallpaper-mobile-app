import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { SortOption, Wallpaper } from '../api/types';
import { AppIcon } from '../components/AppIcon';
import { SafeScreen } from '../components/SafeScreen';
import { WallpaperCard } from '../components/WallpaperCard';
import { QuickPreviewModal } from '../components/modals';
import { SearchScreenNavigationProp, SearchScreenRouteProp } from '../navigation/types';
import Theme from '../theme';

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
  route: SearchScreenRouteProp;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_MARGIN = Theme.spacing.sm;
const CARD_WIDTH =
  (SCREEN_WIDTH - Theme.spacing.lg * 2 - CARD_MARGIN) / NUM_COLUMNS;


// Mock Initial Suggestions Data
const INITIAL_RECENT_SEARCHES = [
  'Abstract',
  'Jujutsu Kaisen',
  'Iron Man Armor',
  'Ronaldo',
  'Gojo Satoru',
];

const TRENDING_TAGS = [
  'Illustration',
  'AMOLED',
  'Anime',
  'Landscape',
  'DarkArt',
  'Cyberpunk',
  'Minimalist',
  'Superhero',
];

const BROWSE_CATEGORIES = [
  { id: 'cat_1', name: 'Minh họa & Art', slug: 'Illustration', color: '#818CF8' },
  { id: 'cat_2', name: 'Anime & Manga', slug: 'Anime', color: '#F43F5E' },
  { id: 'cat_3', name: 'Phong cảnh 4K', slug: 'Landscape', color: '#10B981' },
  { id: 'cat_4', name: 'Nghệ thuật tối giản', slug: 'Minimalist', color: '#38BDF8' },
  { id: 'cat_5', name: 'Viễn tưởng Cyberpunk', slug: 'Cyberpunk', color: '#A855F7' },
  { id: 'cat_6', name: 'Điện ảnh siêu anh hùng', slug: 'Superhero', color: '#F59E0B' },
];

export const SearchScreen: React.FC<SearchScreenProps> = ({
  navigation,
  route,
}) => {
  const initialQ = route.params?.initialQuery || '';
  const [query, setQuery] = useState(initialQ);
  const [activeQuery, setActiveQuery] = useState(initialQ);
  const [recentSearches, setRecentSearches] = useState<string[]>(
    INITIAL_RECENT_SEARCHES
  );

  const [previewWallpaper, setPreviewWallpaper] = useState<Wallpaper | null>(null);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Secondary Filter Tabs in Results State
  const [activeFilter, setActiveFilter] = useState<'all' | '4k' | 'views' | 'ranking'>('all');

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize route param change if user navigated with initialQuery
  useEffect(() => {
    if (route.params?.initialQuery !== undefined) {
      setQuery(route.params.initialQuery);
      setActiveQuery(route.params.initialQuery);
    }
  }, [route.params?.initialQuery]);

  // Handle text input changes with 300ms Debounce
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const trimmed = text.trim();
      setActiveQuery(trimmed);

      // Add to recent searches if non-empty
      if (trimmed && !recentSearches.includes(trimmed)) {
        setRecentSearches(prev => [trimmed, ...prev.slice(0, 9)]);
      }
    }, 350);
  };

  // Perform search query
  const performSearch = useCallback(
    async (q: string, targetPage: number, sort: SortOption = 'popular') => {
      if (!q) {
        setWallpapers([]);
        setIsLoading(false);
        return;
      }

      try {
        if (targetPage === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const res = await api.getWallpapers({
          page: targetPage,
          limit: 20,
          q,
          sort,
        });

        if (res.success && res.data) {
          if (targetPage === 1) {
            setWallpapers(res.data);
          } else {
            setWallpapers(prev => {
              const existingIds = new Set(prev.map(w => w.id));
              const newItems = res.data.filter(w => !existingIds.has(w.id));
              return [...prev, ...newItems];
            });
          }

          if (res.meta) {
            setHasMore(res.meta.hasMore);
            setPage(res.meta.page);
          } else {
            setHasMore(res.data.length >= 20);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi tìm kiếm hình nền');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);

    let sortMode: SortOption = 'popular';
    if (activeFilter === 'views') sortMode = 'views';
    if (activeFilter === 'ranking') sortMode = 'ranking';

    performSearch(activeQuery, 1, sortMode);
  }, [activeQuery, activeFilter, performSearch]);

  const handleSelectKeyword = (keyword: string) => {
    // Strip '#' prefix if tag
    const clean = keyword.replace(/^#/, '');
    setQuery(clean);
    setActiveQuery(clean);

    if (!recentSearches.includes(clean)) {
      setRecentSearches(prev => [clean, ...prev.slice(0, 9)]);
    }
  };

  const handleClear = () => {
    setQuery('');
    setActiveQuery('');
    setWallpapers([]);
  };

  const handleRemoveRecentItem = (itemToRemove: string) => {
    setRecentSearches(prev => prev.filter(item => item !== itemToRemove));
  };

  const handleClearAllRecent = () => {
    setRecentSearches([]);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && !isLoading && hasMore && activeQuery) {
      let sortMode: SortOption = 'popular';
      if (activeFilter === 'views') sortMode = 'views';
      if (activeFilter === 'ranking') sortMode = 'ranking';
      performSearch(activeQuery, page + 1, sortMode);
    }
  };

  const handleSelectWallpaper = (item: Wallpaper) => {
    navigation.navigate('Detail', {
      wallpaperId: item.id,
      wallpaperItem: item,
    });
  };

  // Filter wallpapers client-side if 4K is selected
  const displayedWallpapers =
    activeFilter === '4k'
      ? wallpapers.filter(w => {
        const wW = w.dimensions?.width ?? w.width ?? 0;
        const wH = w.dimensions?.height ?? w.height ?? 0;
        return wW >= 3840 || wH >= 2160 || (wW >= 2160 && wH >= 3840);
      })
      : wallpapers;

  return (
    <SafeScreen style={styles.container}>
      {/* 1. Universal Search Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <AppIcon name="back" size={22} color={Theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <AppIcon
            name="search"
            size={16}
            color={Theme.colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Tìm kiếm hình nền, từ khóa, chủ đề..."
            placeholderTextColor={Theme.colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <AppIcon name="close" size={16} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. State Switcher: Loading / Initial / Results / Empty */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>
            Đang tìm kiếm '{activeQuery}'...
          </Text>
        </View>
      ) : activeQuery.length === 0 ? (
        /* ============================================================ */
        /* STATE 1: Initial & Suggestions (Stitch e3df0d6f7b79403bb8da) */
        /* ============================================================ */
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.initialContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recent Searches Block */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="time" size={16} color={Theme.colors.primary} style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Tìm kiếm gần đây</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClearAllRecent}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearAllText}>Xóa tất cả</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recentTagsContainer}>
                {recentSearches.map(item => (
                  <View key={item} style={styles.recentChip}>
                    <TouchableOpacity
                      onPress={() => handleSelectKeyword(item)}
                      style={styles.recentChipContent}
                    >
                      <AppIcon
                        name="time"
                        size={12}
                        color={Theme.colors.textMuted}
                        style={styles.chipClock}
                      />
                      <Text style={styles.recentText}>{item}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemoveRecentItem(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.removeChipButton}
                    >
                      <AppIcon
                        name="close"
                        size={12}
                        color={Theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Trending Tags Block */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="flame" size={16} color="#F43F5E" style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Thẻ xu hướng</Text>
            </View>

            <View style={styles.trendingContainer}>
              {TRENDING_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={styles.trendingPill}
                  onPress={() => handleSelectKeyword(tag)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.trendingText}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Browse Categories Grid */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="grid" size={16} color={Theme.colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Duyệt theo danh mục</Text>
            </View>

            <View style={styles.categoriesGrid}>
              {BROWSE_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { borderColor: `${cat.color}40` },
                  ]}
                  onPress={() => handleSelectKeyword(cat.slug)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.categoryIndicator,
                      { backgroundColor: cat.color },
                    ]}
                  />
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categorySub}>Khám phá ảnh HD</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : displayedWallpapers.length === 0 ? (
        /* ============================================================ */
        /* STATE 3: Search Empty State (Stitch 8f9f2131433f418ca6c6c67) */
        /* ============================================================ */
        <View style={styles.emptyContainer}>
          {/* Glowing 72px Soft Indigo Icon Container */}
          <View style={styles.emptyGlowCircle}>
            <View style={styles.emptyInnerCircle}>
              <AppIcon name="search" size={32} color={Theme.colors.secondary} />
            </View>
          </View>

          <Text style={styles.emptyTitle}>Không tìm thấy hình nền phù hợp</Text>
          <Text style={styles.emptySubtitle}>
            Không có kết quả nào khớp với "{activeQuery}". Hãy kiểm tra lại chính tả hoặc chọn các chủ đề gợi ý bên dưới.
          </Text>

          {/* Suggested Popular Tags */}
          <View style={styles.emptySuggestedTags}>
            {TRENDING_TAGS.slice(0, 5).map(tag => (
              <TouchableOpacity
                key={tag}
                style={styles.emptyTagChip}
                onPress={() => handleSelectKeyword(tag)}
              >
                <Text style={styles.emptyTagText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA: Explore Discover */}
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
          >
            <AppIcon name="latest" size={18} color="#0F172A" style={styles.exploreIcon} />
            <Text style={styles.exploreButtonText}>Khám phá Trang chủ</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ============================================================ */
        /* STATE 2: Search Results State (Stitch 03538343f3024fd1a35b8) */
        /* ============================================================ */
        <View style={styles.resultsContainer}>
          {/* Header Info & Filter Pills Bar */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCountText}>
              Tìm thấy {displayedWallpapers.length} hình nền cho '{activeQuery}'
            </Text>

            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  activeFilter === 'all' && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter('all')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'all' && styles.filterPillTextActive,
                  ]}
                >
                  Tất cả ({wallpapers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  activeFilter === '4k' && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter('4k')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === '4k' && styles.filterPillTextActive,
                  ]}
                >
                  4K UHD
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  activeFilter === 'views' && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter('views')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'views' && styles.filterPillTextActive,
                  ]}
                >
                  Xem nhiều
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  activeFilter === 'ranking' && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter('ranking')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'ranking' && styles.filterPillTextActive,
                  ]}
                >
                  Xếp hạng
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 2-Column 9:16 Wallpapers Grid */}
          <FlatList
            data={displayedWallpapers}
            numColumns={NUM_COLUMNS}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <WallpaperCard
                wallpaper={item}
                cardWidth={CARD_WIDTH}
                onPress={handleSelectWallpaper}
                onLongPress={wp => setPreviewWallpaper(wp)}
              />
            )}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={Theme.colors.primary} size="small" />
                </View>
              ) : undefined
            }
          />
        </View>
      )}

      {/* Pop-up xem nhanh khi giữ ảnh */}
      <QuickPreviewModal
        visible={!!previewWallpaper}
        wallpaper={previewWallpaper}
        onClose={() => setPreviewWallpaper(null)}
        onOpenDetail={wp => {
          setPreviewWallpaper(null);
          handleSelectWallpaper(wp);
        }}
      />
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.cardBorder,
  },
  backButton: {
    paddingRight: Theme.spacing.md,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeSm,
    paddingVertical: 0,
  },
  clearButton: {
    padding: Theme.spacing.xs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xxl,
  },
  loadingText: {
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.fontSizeSm,
  },
  scrollContainer: {
    flex: 1,
  },
  initialContent: {
    padding: Theme.spacing.lg,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionIcon: {
    marginRight: Theme.spacing.xs,
  },
  sectionTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeMd,
    fontWeight: Theme.typography.fontWeightBold,
  },
  clearAllText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightSemiBold,
  },
  recentTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    paddingLeft: Theme.spacing.md,
    paddingRight: Theme.spacing.xs,
    paddingVertical: 6,
    marginRight: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  recentChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipClock: {
    marginRight: 4,
  },
  recentText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeXs,
    marginRight: Theme.spacing.xs,
  },
  removeChipButton: {
    padding: 4,
  },
  trendingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trendingPill: {
    backgroundColor: Theme.colors.cardBackground,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    marginRight: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  trendingText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightMedium,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (SCREEN_WIDTH - Theme.spacing.lg * 2 - Theme.spacing.sm) / 2,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
  },
  categoryIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginBottom: Theme.spacing.sm,
  },
  categoryName: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
    marginBottom: 2,
  },
  categorySub: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xxl,
  },
  emptyGlowCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderWidth: 2,
    borderColor: Theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  emptyInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeLg,
    fontWeight: Theme.typography.fontWeightBold,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.xl,
  },
  emptySuggestedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  emptyTagChip: {
    backgroundColor: Theme.colors.cardBackground,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    margin: 3,
  },
  emptyTagText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeXs,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreIcon: {
    marginRight: Theme.spacing.xs,
  },
  exploreButtonText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  resultsCountText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    marginBottom: Theme.spacing.sm,
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingBottom: Theme.spacing.xs,
  },
  filterPill: {
    backgroundColor: Theme.colors.cardBackground,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    marginRight: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterPillText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeXs,
  },
  filterPillTextActive: {
    color: '#0F172A',
    fontWeight: Theme.typography.fontWeightBold,
  },
  listContent: {
    paddingVertical: Theme.spacing.md,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
  },
  footerLoader: {
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
  },
});

export default SearchScreen;
