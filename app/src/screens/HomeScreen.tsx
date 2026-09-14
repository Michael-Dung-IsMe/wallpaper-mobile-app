import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { Category, SortOption, Wallpaper } from '../api/types';
import { AppIcon } from '../components/AppIcon';
import { BottomNavBar, BottomNavTab } from '../components/BottomNavBar';
import { CategoryPills } from '../components/CategoryPill';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { SafeScreen } from '../components/SafeScreen';
import { SkeletonCard } from '../components/SkeletonCard';
import { SortBar } from '../components/SortBar';
import { WallpaperCard } from '../components/WallpaperCard';
import { CollectionModal, QuickPreviewModal, ShareSheet } from '../components/modals';
import { HomeScreenNavigationProp } from '../navigation/types';
import { addWallpaperToCollection } from '../services/collectionStorage';
import Theme from '../theme';

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_MARGIN = Theme.spacing.sm;
const CARD_WIDTH =
  (SCREEN_WIDTH - Theme.spacing.lg * 2 - CARD_MARGIN) / NUM_COLUMNS;

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );
  const [currentSort, setCurrentSort] = useState<SortOption>('latest');

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Navigation state
  const [previewWallpaper, setPreviewWallpaper] = useState<Wallpaper | null>(null);
  const [shareWallpaper, setShareWallpaper] = useState<Wallpaper | null>(null);
  const [selectedWallpaperForCollection, setSelectedWallpaperForCollection] =
    useState<Wallpaper | null>(null);
  const [isCollectionVisible, setIsCollectionVisible] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<BottomNavTab>('discover');

  const flatListRef = useRef<FlatList>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch categories:', err);
    }
  };

  // Main data fetching function
  const fetchWallpapers = useCallback(
    async (
      targetPage: number,
      sortMode: SortOption,
      categorySlug: string | null,
      isRefresh = false
    ) => {
      try {
        if (targetPage === 1 && !isRefresh) {
          setIsLoadingInitial(true);
        } else if (targetPage > 1) {
          setIsLoadingMore(true);
        }
        setError(null);

        const res = await api.getWallpapers({
          page: targetPage,
          limit: 20,
          sort: sortMode,
          category: categorySlug || undefined,
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
        setError(err.message || 'Không thể kết nối đến máy chủ.');
      } finally {
        setIsLoadingInitial(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // Re-fetch when sort or category changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchWallpapers(1, currentSort, selectedCategory);
  }, [currentSort, selectedCategory, fetchWallpapers]);

  // Pull to refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchWallpapers(1, currentSort, selectedCategory, true);
  };

  // Infinite scroll load more handler
  const handleLoadMore = () => {
    if (!isLoadingMore && !isLoadingInitial && hasMore) {
      fetchWallpapers(page + 1, currentSort, selectedCategory);
    }
  };

  // Navigate to Detail Screen
  const handleSelectWallpaper = (item: Wallpaper) => {
    navigation.navigate('Detail', {
      wallpaperId: item.id,
      wallpaperItem: item,
    });
  };

  // Handle Bottom Navigation Tab Clicks
  const handleTabPress = (tab: BottomNavTab) => {
    setActiveNavTab(tab);
    if (tab === 'discover') {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } else if (tab === 'categories') {
      // Toggle to popular category or open category view
      if (categories.length > 0) {
        const nextCat = selectedCategory ? null : categories[0].slug;
        setSelectedCategory(nextCat);
      }
    } else if (tab === 'search') {
      navigation.navigate('Search', {});
    } else if (tab === 'collections') {
      navigation.navigate('Collections');
    } else if (tab === 'settings') {
      navigation.navigate('Settings');
    }
  };

  // Header Component (Top Bar + Categories + SortBar)
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar with Brand & Search Shortcut */}
      <View style={styles.topBar}>
        <View style={styles.titleContainer}>
          <AppIcon name="latest" size={24} color={Theme.colors.primary} style={styles.appLogoIcon} />
          <Text style={styles.appTitle}>Wallpaper HD</Text>
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Search', {})}
        >
          <AppIcon name="search" size={16} color={Theme.colors.textMuted} style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Tìm kiếm...</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills List */}
      <CategoryPills
        categories={categories}
        selectedCategorySlug={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 4-Tab Sort Bar */}
      <SortBar
        currentSort={currentSort}
        onSelectSort={setCurrentSort}
      />
    </View>
  );

  // Footer Component (Loading More Spinner)
  const renderFooter = () => {
    if (!isLoadingMore) return undefined;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={Theme.colors.primary} size="small" />
        <Text style={styles.footerText}>Đang tải thêm hình nền...</Text>
      </View>
    );
  };

  return (
    <SafeScreen style={styles.container} edges={['top']}>
      <View style={styles.contentWrapper}>
        {isLoadingInitial ? (
          <View style={styles.loadingContainer}>
            {renderHeader()}
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <SkeletonCard key={idx} cardWidth={CARD_WIDTH} />
              ))}
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            {renderHeader()}
            <ErrorState
              message={error}
              onRetry={() => fetchWallpapers(1, currentSort, selectedCategory)}
            />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={wallpapers}
            numColumns={NUM_COLUMNS}
            keyExtractor={item => item.id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <EmptyState
                message="Không có hình nền nào trong danh mục này"
                onReset={() => {
                  setSelectedCategory(null);
                  setCurrentSort('latest');
                }}
              />
            }
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
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={Theme.colors.primary}
                colors={[Theme.colors.primary]}
              />
            }
          />
        )}
      </View>

      {/* 7. Bottom Navigation Bar (Dock) Anchored to Bottom */}
      <BottomNavBar
        activeTab={activeNavTab}
        onTabPress={handleTabPress}
      />

      {/* Pop-up xem nhanh khi nhấn giữ ảnh trên Discover */}
      <QuickPreviewModal
        visible={!!previewWallpaper}
        wallpaper={previewWallpaper}
        onClose={() => setPreviewWallpaper(null)}
        onOpenDetail={wp => {
          setPreviewWallpaper(null);
          handleSelectWallpaper(wp);
        }}
        onAddToCollection={wp => {
          setSelectedWallpaperForCollection(wp);
          setIsCollectionVisible(true);
        }}
        onShare={wp => {
          setShareWallpaper(wp);
        }}
      />

      {/* Share Sheet Modal */}
      <ShareSheet
        visible={!!shareWallpaper}
        onClose={() => setShareWallpaper(null)}
        wallpaperId={shareWallpaper?.id || ''}
        thumbnailUrl={shareWallpaper?.thumbnailUrl}
        title={shareWallpaper?.title}
      />

      {/* Collections Modal (Dùng khi user chọn lưu bộ sưu tập) */}
      <CollectionModal
        visible={isCollectionVisible}
        currentWallpaperTitle={selectedWallpaperForCollection?.title}
        onClose={() => {
          setIsCollectionVisible(false);
          setActiveNavTab('discover');
        }}
        onSave={async (colId, colName) => {
          if (selectedWallpaperForCollection) {
            try {
              const res = await addWallpaperToCollection(
                colId,
                selectedWallpaperForCollection
              );
              if (res.isDuplicate) {
                Alert.alert(
                  'Bộ sưu tập',
                  `Hình nền "${selectedWallpaperForCollection.title}" đã có sẵn trong bộ sưu tập "${colName}".`
                );
              } else {
                Alert.alert(
                  'Thành công',
                  `Đã thêm hình nền "${selectedWallpaperForCollection.title}" vào bộ sưu tập "${colName}".`
                );
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể lưu vào bộ sưu tập.');
            }
          }
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
  contentWrapper: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: Theme.spacing.xs,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appLogoIcon: {
    marginRight: Theme.spacing.xs,
  },
  appTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeLg,
    fontWeight: Theme.typography.fontWeightBold,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchPlaceholder: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
  },
  loadingContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  listContent: {
    paddingBottom: Theme.spacing.xxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  footerText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
    marginLeft: Theme.spacing.sm,
  },
});

export default HomeScreen;
