import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { BottomNavBar, BottomNavTab } from '../components/BottomNavBar';
import { SafeScreen } from '../components/SafeScreen';
import { SettingsScreenNavigationProp } from '../navigation/types';
import {
  checkStoragePermission,
  openAppSettings,
  requestStoragePermission,
} from '../services/permissionService';
import { openSystemGallery } from '../services/nativeWallpaper';
import Theme from '../theme';

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
}) => {
  const [cachedSize, setCachedSize] = useState('142 MB');
  const [storagePath, setStoragePath] = useState(
    'Pictures/WallpaperHD'
  );
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Kiểm tra trạng thái cấp quyền của hệ thống
  const checkPermissionState = useCallback(async () => {
    const granted = await checkStoragePermission();
    setHasPermission(granted);
  }, []);

  useEffect(() => {
    checkPermissionState();
    const unsubscribe = navigation.addListener('focus', checkPermissionState);
    return unsubscribe;
  }, [navigation, checkPermissionState]);



  const handleClearCache = () => {
    Alert.alert(
      'Xóa bộ nhớ đệm',
      'Bạn có chắc chắn muốn dọn dẹp các tệp hình ảnh tạm thời trong bộ nhớ đệm?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: () => {
            setCachedSize('0 KB');
            Alert.alert(
              'Hoàn tất',
              'Bộ nhớ đệm hình nền đã được dọn sạch hoàn toàn.'
            );
          },
        },
      ]
    );
  };

  const handleRequestPermission = async () => {
    const granted = await requestStoragePermission();
    setHasPermission(granted);
    if (granted) {
      Alert.alert(
        'Đã cấp quyền thành công',
        'Ứng dụng đã có quyền truy cập thư viện ảnh để tải và lưu hình nền.'
      );
    } else {
      Alert.alert(
        'Chưa được cấp quyền',
        'Để lưu ảnh và mở thư viện, vui lòng cấp quyền trong phần Cài đặt của máy.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => openAppSettings() },
        ]
      );
    }
  };

  const handleBrowsePath = async () => {
    // Kiểm tra quyền trước khi chọn đường dẫn
    const granted = await checkStoragePermission();
    if (!granted) {
      Alert.alert(
        'Yêu cầu quyền truy cập',
        'Vui lòng cấp quyền truy cập bộ nhớ để thay đổi thư mục lưu trữ ảnh.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Cấp quyền ngay', onPress: handleRequestPermission },
        ]
      );
      return;
    }

    Alert.alert(
      'Chọn thư mục lưu trữ ảnh',
      'Chọn thư mục mặc định trên thiết bị để lưu hình nền:',
      [
        {
          text: 'Pictures/WallpaperHD (Khuyên dùng)',
          onPress: () => {
            setStoragePath('Pictures/WallpaperHD');
            Alert.alert('Thành công', 'Đã đặt thư mục lưu thành Pictures/WallpaperHD');
          },
        },
        {
          text: 'DCIM/WallpaperHD (Máy ảnh)',
          onPress: () => {
            setStoragePath('DCIM/WallpaperHD');
            Alert.alert('Thành công', 'Đã đặt thư mục lưu thành DCIM/WallpaperHD');
          },
        },
        {
          text: 'Download/WallpaperHD (Tải về)',
          onPress: () => {
            setStoragePath('Download/WallpaperHD');
            Alert.alert('Thành công', 'Đã đặt thư mục lưu thành Download/WallpaperHD');
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleOpenGallery = async () => {
    const granted = await checkStoragePermission();
    if (!granted) {
      Alert.alert(
        'Yêu cầu quyền truy cập',
        'Vui lòng cấp quyền truy cập thư viện ảnh để mở bộ sưu tập.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Cấp quyền ngay', onPress: handleRequestPermission },
        ]
      );
      return;
    }

    const opened = await openSystemGallery();
    if (!opened) {
      Alert.alert(
        'Thư viện hình ảnh',
        'Các ảnh tải về hiện đã được lưu vào Album WallpaperHD trên thiết bị của bạn.'
      );
    }
  };

  const handleBottomNav = (tab: BottomNavTab) => {
    if (tab === 'discover' || tab === 'categories') {
      // QUAY VỀ trang chính với hiệu ứng pop lùi lại
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    } else if (tab === 'search') {
      navigation.navigate('Search', {});
    } else if (tab === 'collections') {
      navigation.navigate('Collections');
    } else if (tab === 'settings') {
      // already here
    }
  };

  return (
    <SafeScreen style={styles.container} edges={['top']}>
      <View style={styles.contentWrapper}>
        {/* Top Header - Clean, modern Cosmic Obsidian without bulky Back button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cài đặt hệ thống</Text>
          <Text style={styles.headerSubtitle}>Tùy chỉnh quyền và lưu trữ thiết bị</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Group 1: App & System Permissions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUYỀN ỨNG DỤNG & BẢO MẬT</Text>

            <View style={styles.cardGroup}>
              {/* Photo & Storage Permission */}
              <View style={styles.groupItem}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <AppIcon name="shield" size={18} color={Theme.colors.primary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>Quyền Thư viện ảnh & Bộ nhớ</Text>
                    <Text style={styles.itemSubtitle}>
                      {hasPermission
                        ? 'Đã được cấp phép đọc & ghi ảnh'
                        : 'Cần cấp quyền để lưu ảnh & mở album'}
                    </Text>
                  </View>
                </View>

                {hasPermission ? (
                  <TouchableOpacity
                    style={styles.grantedBadge}
                    onPress={() => openAppSettings()}
                    activeOpacity={0.7}
                  >
                    <AppIcon name="checkmark" size={12} color="#10B981" />
                    <Text style={styles.grantedBadgeText}>ĐÃ CẤP</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={handleRequestPermission}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.requestButtonText}>Cấp quyền</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.divider} />

              {/* Set Wallpaper Permission */}
              <View style={styles.groupItem}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <AppIcon name="image" size={18} color={Theme.colors.secondary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>Quyền Đặt hình nền hệ thống</Text>
                    <Text style={styles.itemSubtitle}>
                      Cài đặt Wallpaper màn hình chính & khóa
                    </Text>
                  </View>
                </View>

                <View style={styles.readyBadge}>
                  <AppIcon name="checkmark" size={12} color="#10B981" />
                  <Text style={styles.readyBadgeText}>SẴN SÀNG</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Group 2: Storage & Cache */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LƯU TRỮ & BỘ NHỚ ĐỆM</Text>

            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <AppIcon name="download" size={18} color={Theme.colors.primary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>Đường dẫn lưu ảnh</Text>
                    <Text style={styles.itemPath} numberOfLines={1}>
                      {storagePath}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.browseButton}
                  onPress={handleBrowsePath}
                  activeOpacity={0.8}
                >
                  <Text style={styles.browseButtonText}>Thay đổi</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.cacheRow}>
                <Text style={styles.cacheText}>
                  Bộ nhớ đệm hình ảnh: {cachedSize}
                </Text>
                <TouchableOpacity onPress={handleClearCache} activeOpacity={0.7}>
                  <Text style={styles.clearCacheText}>Xóa cache</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Group 3: Wallpaper Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUẢN LÝ HÌNH NỀN</Text>

            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <AppIcon name="folder" size={18} color={Theme.colors.primary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>Hình nền đã tải về</Text>
                    <Text style={styles.itemSubtitle}>
                      Quản lý trong bộ sưu tập Photos thiết bị
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.browseButton}
                  onPress={handleOpenGallery}
                  activeOpacity={0.8}
                >
                  <Text style={styles.browseButtonText}>Mở thư viện</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Group 4: About & Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THÔNG TIN & ĐIỀU KHOẢN</Text>

            <View style={styles.cardGroup}>
              {/* App Version */}
              <View style={styles.groupItem}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <AppIcon name="info" size={18} color={Theme.colors.textMuted} />
                  </View>
                  <Text style={styles.itemTitle}>Phiên bản ứng dụng</Text>
                </View>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v1.0.0 (Release MVP)</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Open Source Licenses */}
              <TouchableOpacity
                style={styles.groupItem}
                onPress={() =>
                  Alert.alert(
                    'Giấy phép Mã nguồn mở',
                    'React Native 0.87.1, TypeScript 6.0, Cloudflare R2 Storage, React Navigation 7.x.'
                  )
                }
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <AppIcon name="document" size={18} color={Theme.colors.textMuted} />
                  </View>
                  <Text style={styles.itemTitle}>Giấy phép mã nguồn mở</Text>
                </View>
                <AppIcon
                  name="chevron-forward"
                  size={16}
                  color={Theme.colors.textMuted}
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Privacy Policy & Terms */}
              <TouchableOpacity
                style={styles.groupItem}
                onPress={() =>
                  Alert.alert(
                    'Chính sách bảo mật',
                    'Wallpaper HD tuân thủ chính sách bảo mật nội dung và bản quyền Cloudflare R2 Storage.'
                  )
                }
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <AppIcon name="shield" size={18} color={Theme.colors.textMuted} />
                  </View>
                  <Text style={styles.itemTitle}>Chính sách bảo mật & Điều khoản</Text>
                </View>
                <AppIcon
                  name="chevron-forward"
                  size={16}
                  color={Theme.colors.textMuted}
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* About Wallpaper HD */}
              <View style={styles.groupItem}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <AppIcon name="layers" size={18} color={Theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.itemTitle}>Về Wallpaper HD</Text>
                    <Text style={styles.itemSubtitle}>
                      Thiết kế Cosmic Obsidian • 1.000 Wallpapers
                    </Text>
                  </View>
                </View>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>HD+</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Bottom Navigation Bar (Dock) */}
      <BottomNavBar activeTab="settings" onTabPress={handleBottomNav} />
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xxl,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: Theme.typography.fontWeightBold,
    letterSpacing: 1,
    marginBottom: Theme.spacing.sm,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.md,
  },
  cardGroup: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    overflow: 'hidden',
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightSemiBold,
  },
  itemSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    marginTop: 2,
  },
  itemPath: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  browseButton: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  browseButtonText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightBold,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: Theme.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  grantedBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: Theme.typography.fontWeightBold,
    marginLeft: 4,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: Theme.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  readyBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: Theme.typography.fontWeightBold,
    marginLeft: 4,
  },
  requestButton: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.primary,
  },
  requestButtonText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightBold,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    marginVertical: Theme.spacing.sm,
  },
  cacheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  cacheText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
  },
  clearCacheText: {
    color: Theme.colors.primary,
    fontSize: 11,
    fontWeight: Theme.typography.fontWeightMedium,
    textDecorationLine: 'underline',
  },
  versionBadge: {
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  versionText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  proBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  proBadgeText: {
    color: Theme.colors.secondary,
    fontSize: 10,
    fontWeight: Theme.typography.fontWeightBold,
  },
});

export default SettingsScreen;
