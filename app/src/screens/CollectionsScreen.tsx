import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { BottomNavBar, BottomNavTab } from '../components/BottomNavBar';
import { SafeScreen } from '../components/SafeScreen';
import { CollectionModal } from '../components/modals';
import { CollectionsScreenNavigationProp } from '../navigation/types';
import {
  deleteCollection,
  getCollections,
  UserCollection,
} from '../services/collectionStorage';
import Theme from '../theme';

interface CollectionsScreenProps {
  navigation: CollectionsScreenNavigationProp;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_MARGIN = Theme.spacing.sm;
const CARD_WIDTH =
  (SCREEN_WIDTH - Theme.spacing.lg * 2 - CARD_MARGIN) / NUM_COLUMNS;

export const CollectionsScreen: React.FC<CollectionsScreenProps> = ({
  navigation,
}) => {
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load collections from local storage
  const loadCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCollections();
      setCollections(data);
    } catch (err) {
      console.warn('Lỗi khi nạp danh sách bộ sưu tập:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
    const unsubscribe = navigation.addListener('focus', loadCollections);
    return unsubscribe;
  }, [navigation, loadCollections]);



  // Filter collections
  const filteredCollections = collections.filter(c => {
    if (activeTab === 'favorites') {
      return (
        c.name.toLowerCase().includes('yêu thích') ||
        c.name.toLowerCase().includes('favorite')
      );
    }
    return true;
  });

  const totalWallpapersCount = collections.reduce(
    (sum, c) => sum + (c.wallpapers ? c.wallpapers.length : 0),
    0
  );

  const handleBottomNav = (tab: BottomNavTab) => {
    if (tab === 'discover' || tab === 'categories') {
      navigation.navigate('Home');
    } else if (tab === 'search') {
      navigation.navigate('Search', {});
    } else if (tab === 'collections') {
      // already here
    } else if (tab === 'settings') {
      navigation.navigate('Settings');
    }
  };

  const handleOpenCollection = (item: UserCollection) => {
    navigation.navigate('CollectionDetail', {
      collectionId: item.id,
      collectionName: item.name,
    });
  };

  const handleDeleteCollection = (item: UserCollection) => {
    Alert.alert(
      'Xóa bộ sưu tập',
      `Bạn có chắc chắn muốn xóa bộ sưu tập "${item.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(item.id);
            loadCollections();
          },
        },
      ]
    );
  };

  return (
    <SafeScreen style={styles.container} edges={['top']}>
      <View style={styles.contentWrapper}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Bộ sưu tập</Text>
            <Text style={styles.headerSubtitle}>
              {collections.length} bộ sưu tập • {totalWallpapersCount} hình nền
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newButton}
            onPress={() => setIsCreateModalVisible(true)}
            activeOpacity={0.85}
          >
            <AppIcon name="add" size={16} color="#0F172A" style={styles.newIcon} />
            <Text style={styles.newButtonText}>Tạo mới</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeTab === 'all' && styles.filterTabActive,
            ]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'all' && styles.filterTabTextActive,
              ]}
            >
              Tất cả ({collections.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              activeTab === 'favorites' && styles.filterTabActive,
            ]}
            onPress={() => setActiveTab('favorites')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'favorites' && styles.filterTabTextActive,
              ]}
            >
              Yêu thích
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collection Grid or Empty State */}
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          </View>
        ) : filteredCollections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="bookmarks" size={38} color={Theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có bộ sưu tập nào</Text>
            <Text style={styles.emptySubtitle}>
              Lưu giữ những tác phẩm hình nền yêu thích theo chủ đề riêng của bạn
              bằng cách tạo bộ sưu tập đầu tiên.
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={() => setIsCreateModalVisible(true)}
              activeOpacity={0.85}
            >
              <AppIcon name="add" size={18} color="#0F172A" />
              <Text style={styles.emptyCreateButtonText}>Tạo bộ sưu tập đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredCollections}
            numColumns={NUM_COLUMNS}
            keyExtractor={item => item.id}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const count = item.wallpapers ? item.wallpapers.length : 0;
              const previews = (item.wallpapers || [])
                .slice(0, 4)
                .map(w => w.thumbnailUrl);

              return (
                <TouchableOpacity
                  style={styles.collectionCard}
                  onPress={() => handleOpenCollection(item)}
                  activeOpacity={0.85}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}>
                      <AppIcon name="folder" size={14} color={Theme.colors.primary} />
                    </View>

                    <TouchableOpacity
                      style={styles.moreButton}
                      onPress={() =>
                        Alert.alert(item.name, 'Tùy chọn bộ sưu tập', [
                          {
                            text: 'Mở xem',
                            onPress: () => handleOpenCollection(item),
                          },
                          {
                            text: 'Xóa album',
                            style: 'destructive',
                            onPress: () => handleDeleteCollection(item),
                          },
                          { text: 'Hủy', style: 'cancel' },
                        ])
                      }
                    >
                      <AppIcon name="more" size={16} color={Theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* 2x2 Thumbnail Grid Previews */}
                  <View style={styles.previewGrid}>
                    {previews.length === 0 ? (
                      <View style={styles.emptyPreviewBox}>
                        <AppIcon name="image" size={24} color={Theme.colors.textMuted} />
                        <Text style={styles.emptyPreviewText}>Chưa có ảnh</Text>
                      </View>
                    ) : (
                      [0, 1, 2, 3].map(idx => (
                        <View key={idx} style={styles.previewCell}>
                          {previews[idx] ? (
                            <Image
                              source={{ uri: previews[idx] }}
                              style={styles.previewImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.placeholderCell} />
                          )}
                        </View>
                      ))
                    )}
                  </View>

                  {/* Card Footer Info */}
                  <Text style={styles.collectionName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.collectionMetaRow}>
                    <Text style={styles.metaText}>{count} hình nền</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Bottom Navigation Bar (Dock) */}
      <BottomNavBar activeTab="collections" onTabPress={handleBottomNav} />

      {/* Create Collection Modal */}
      <CollectionModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onCreated={loadCollections}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeTitle,
    fontWeight: Theme.typography.fontWeightBold,
  },
  headerSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    marginTop: 2,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.full,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  newIcon: {
    marginRight: 4,
  },
  newButtonText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    marginRight: Theme.spacing.sm,
  },
  filterTabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: Theme.colors.primary,
  },
  filterTabText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightMedium,
  },
  filterTabTextActive: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeightBold,
  },
  listContent: {
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: CARD_MARGIN,
  },
  collectionCard: {
    width: CARD_WIDTH,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    padding: 2,
  },
  previewGrid: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Theme.borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: Theme.colors.background,
    marginBottom: Theme.spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  previewCell: {
    width: '50%',
    height: '50%',
    padding: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  placeholderCell: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 2,
  },
  emptyPreviewBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreviewText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  collectionName: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightSemiBold,
    marginBottom: 2,
  },
  collectionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
  emptySubtitle: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm + 2,
    borderRadius: Theme.borderRadius.full,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyCreateButtonText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
    marginLeft: Theme.spacing.xs,
  },
});

export default CollectionsScreen;
