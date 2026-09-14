import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Wallpaper } from '../api/types';
import { AppIcon } from '../components/AppIcon';
import { SafeScreen } from '../components/SafeScreen';
import { WallpaperCard } from '../components/WallpaperCard';
import {
  CollectionDetailScreenNavigationProp,
  CollectionDetailScreenRouteProp,
} from '../navigation/types';
import {
  deleteCollection,
  getCollectionDetail,
  removeWallpaperFromCollection,
  UserCollection,
} from '../services/collectionStorage';
import Theme from '../theme';

interface CollectionDetailScreenProps {
  navigation: CollectionDetailScreenNavigationProp;
  route: CollectionDetailScreenRouteProp;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_MARGIN = Theme.spacing.sm;
const CARD_WIDTH =
  (SCREEN_WIDTH - Theme.spacing.lg * 2 - CARD_MARGIN) / NUM_COLUMNS;

export const CollectionDetailScreen: React.FC<CollectionDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { collectionId, collectionName } = route.params;
  const [collection, setCollection] = useState<UserCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCollectionDetail(collectionId);
      setCollection(data);
    } catch (err) {
      console.warn('Lỗi khi tải chi tiết bộ sưu tập:', err);
    } finally {
      setIsLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleSelectWallpaper = (item: Wallpaper) => {
    navigation.navigate('Detail', {
      wallpaperId: item.id,
      wallpaperItem: item,
    });
  };

  const handleRemoveWallpaper = (wallpaper: Wallpaper) => {
    Alert.alert(
      'Gỡ hình nền',
      `Bạn có chắc chắn muốn xóa "${wallpaper.title}" khỏi bộ sưu tập này?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await removeWallpaperFromCollection(collectionId, wallpaper.id);
            loadData();
          },
        },
      ]
    );
  };

  const handleDeleteCollection = () => {
    Alert.alert(
      'Xóa bộ sưu tập',
      `Bạn có chắc chắn muốn xóa bộ sưu tập "${collection?.name || collectionName}"? Thao tác này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(collectionId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const wallpapers = collection?.wallpapers || [];

  return (
    <SafeScreen style={styles.container} edges={['top']}>
      {/* Top Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AppIcon name="back" size={22} color={Theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {collection?.name || collectionName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {wallpapers.length} hình nền đã lưu
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteCollection}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AppIcon name="trash" size={20} color={Theme.colors.statusError} />
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : wallpapers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <AppIcon name="image" size={36} color={Theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có hình nền nào</Text>
          <Text style={styles.emptyText}>
            Bộ sưu tập này hiện đang trống. Hãy duyệt danh mục và bấm biểu tượng
            trái tim để thêm hình nền yêu thích vào đây nhé!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
          >
            <AppIcon name="explore" size={18} color="#0F172A" />
            <Text style={styles.exploreButtonText}>Khám phá hình nền</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wallpapers}
          keyExtractor={item => item.id}
          numColumns={NUM_COLUMNS}
          renderItem={({ item }) => (
            <WallpaperCard
              wallpaper={item}
              cardWidth={CARD_WIDTH}
              onPress={handleSelectWallpaper}
              onLongPress={handleRemoveWallpaper}
            />
          )}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.cardBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: Theme.spacing.md,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeLg,
    fontWeight: Theme.typography.fontWeightBold,
  },
  headerSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    marginTop: 2,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  listContent: {
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: CARD_MARGIN,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  emptyTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeLg,
    fontWeight: Theme.typography.fontWeightBold,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm + 2,
    borderRadius: Theme.borderRadius.full,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
    marginLeft: Theme.spacing.xs,
  },
});

export default CollectionDetailScreen;
