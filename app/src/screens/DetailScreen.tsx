import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { Wallpaper } from '../api/types';
import { AppIcon } from '../components/AppIcon';
import { ErrorState } from '../components/ErrorState';
import { useAppInsets } from '../components/SafeScreen';
import {
  CollectionModal,
  ShareSheet,
  SuccessModal,
  WaitingModal,
} from '../components/modals';
import { DetailScreenNavigationProp, DetailScreenRouteProp } from '../navigation/types';
import {
  applyNativeWallpaper,
  saveWallpaperToGallery,
} from '../services/nativeWallpaper';
import {
  openAppSettings,
  requestStoragePermission,
} from '../services/permissionService';
import { addWallpaperToCollection } from '../services/collectionStorage';
import Theme from '../theme';

interface DetailScreenProps {
  navigation: DetailScreenNavigationProp;
  route: DetailScreenRouteProp;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DetailScreen: React.FC<DetailScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useAppInsets();
  const { wallpaperId, wallpaperItem: initialItem } = route.params;

  const [wallpaper, setWallpaper] = useState<Wallpaper | null>(
    initialItem || null
  );
  const [isLoading, setIsLoading] = useState(!initialItem);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isWaitingVisible, setIsWaitingVisible] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [isCollectionVisible, setIsCollectionVisible] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeAction, setActiveAction] = useState<'APPLY' | 'DOWNLOAD'>('APPLY');
  const [successMessage, setSuccessMessage] = useState({
    title: 'Đã cài đặt hình nền thành công!',
    subtitle: 'Màn hình chính và màn hình khóa của bạn đã được cập nhật hoàn tất.',
  });

  // Fetch full detail & record view
  useEffect(() => {
    fetchDetailAndRecordView();
  }, [wallpaperId]);

  const fetchDetailAndRecordView = async () => {
    try {
      if (!wallpaper) {
        setIsLoading(true);
      }
      setError(null);

      // Record view metric
      api.recordView(wallpaperId).catch(err =>
        console.warn('View count update error:', err)
      );

      // Fetch fresh detail data
      const res = await api.getWallpaperDetail(wallpaperId);
      if (res.success && res.data) {
        setWallpaper(res.data);
      }
    } catch (err: any) {
      if (!wallpaper) {
        setError(err.message || 'Không thể tải chi tiết hình nền');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel controller flag so if user cancels waiting modal, completion is ignored
  const isCancelledRef = useRef(false);

  const handleCancelWaiting = () => {
    isCancelledRef.current = true;
    setIsWaitingVisible(false);
  };

  // Execute async download or wallpaper apply directly while displaying waiting modal
  const executeAction = async (action: 'DOWNLOAD' | 'APPLY') => {
    setActiveAction(action);
    setIsWaitingVisible(true);
    isCancelledRef.current = false;

    try {
      const res = await api.recordDownload(wallpaperId, action);
      if (isCancelledRef.current) return;

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Máy chủ không phản hồi dữ liệu tải ảnh.');
      }

      setWallpaper(prev =>
        prev
          ? {
              ...prev,
              downloadCount: res.data.downloadCount,
              rankingScore: res.data.rankingScore,
            }
          : null
      );

      const targetUrl = res.data.downloadUrl || res.data.presignedUrl;
      if (!targetUrl) {
        throw new Error('Không nhận được liên kết tải ảnh R2 từ máy chủ.');
      }

      // Call Kotlin Native Module on Android
      if (action === 'APPLY') {
        await applyNativeWallpaper(targetUrl);
        if (isCancelledRef.current) return;
        setSuccessMessage({
          title: 'Đã cài đặt hình nền thành công!',
          subtitle: 'Màn hình chính và màn hình khóa thiết bị Android của bạn đã được thay đổi thành công.',
        });
      } else {
        await saveWallpaperToGallery(targetUrl, wallpaperId);
        if (isCancelledRef.current) return;
        setSuccessMessage({
          title: 'Đã lưu vào thư viện thành công!',
          subtitle: 'Ảnh gốc R2 đã được lưu vào Album Pictures/WallpaperHD trên thiết bị.',
        });
      }

      setIsWaitingVisible(false);
      setIsSuccessVisible(true);
    } catch (err: any) {
      setIsWaitingVisible(false);
      if (isCancelledRef.current) return;
      console.error('[DetailScreen] Lỗi khi xử lý tải/đặt hình nền:', err);
      Alert.alert(
        action === 'APPLY' ? 'Cài đặt hình nền thất bại' : 'Lưu ảnh thất bại',
        err.message || 'Không thể thực hiện tác vụ vào lúc này. Vui lòng thử lại.'
      );
    }
  };

  // Trigger Download Flow (kiểm tra quyền -> hiển thị modal quay vòng -> tải trực tiếp -> hoàn tất)
  const handleTriggerDownload = async () => {
    const hasPerm = await requestStoragePermission();
    if (!hasPerm && Platform.OS === 'android' && Platform.Version < 33) {
      Alert.alert(
        'Yêu cầu cấp quyền',
        'Vui lòng cấp quyền truy cập bộ nhớ để lưu hình nền vào máy.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => openAppSettings() },
        ]
      );
      return;
    }
    await executeAction('DOWNLOAD');
  };

  // Trigger Set Wallpaper Flow (hiển thị modal quay vòng -> áp dụng trực tiếp -> hoàn tất)
  const handleTriggerSetWallpaper = async () => {
    await executeAction('APPLY');
  };

  // Navigate to SearchScreen when tapping any tag
  const handleTagPress = (tag: string) => {
    navigation.navigate('Search', { initialQuery: tag });
  };

  return (
    <View style={styles.container}>
      {/* Floating Top Bar (Back button + Action buttons) */}
      <View
        style={[
          styles.floatingHeader,
          { top: insets.top + Theme.spacing.xs },
        ]}
      >
        <TouchableOpacity
          style={styles.circleIconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <AppIcon name="back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.floatingHeaderRight}>
          <TouchableOpacity
            style={styles.circleIconButton}
            onPress={() => setIsShareVisible(true)}
            activeOpacity={0.8}
          >
            <AppIcon name="share" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleIconButton, { marginLeft: Theme.spacing.sm }]}
            onPress={() => setIsFullScreen(true)}
            activeOpacity={0.8}
          >
            <AppIcon name="expand" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fixed Background Image Layer */}
      {wallpaper && !isLoading && !error ? (
        <View style={styles.fixedImageContainer} pointerEvents="none">
          <Image
            source={{ uri: wallpaper.thumbnailUrl }}
            style={styles.fixedImage}
            resizeMode="cover"
          />
          {/* Subtle vignette gradients for contrast */}
          <View style={styles.topVignette} />
          <View style={styles.bottomVignette} />
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải hình nền...</Text>
        </View>
      ) : error || !wallpaper ? (
        <ErrorState
          message={error || 'Không tìm thấy thông tin hình nền'}
          onRetry={fetchDetailAndRecordView}
        />
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* Transparent Spacer: lets the user view the fixed wallpaper behind */}
          <View style={styles.scrollSpacer} />

          {/* Info Sheet Card: scrolls up over the fixed background image */}
          <View
            style={[
              styles.infoSheet,
              { paddingBottom: Math.max(insets.bottom, Theme.spacing.lg) },
            ]}
          >
            {/* Drag Handle Indicator */}
            <View style={styles.dragHandle} />
            {/* Category & Title */}
            {wallpaper.category ? (
              <TouchableOpacity
                style={styles.categoryBadge}
                activeOpacity={0.8}
                onPress={() => handleTagPress(wallpaper.category?.name || '')}
              >
                <Text style={styles.categoryBadgeText}>
                  {wallpaper.category.name}
                </Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.title}>{wallpaper.title}</Text>

            {/* Stats Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <AppIcon name="views" size={18} color={Theme.colors.primary} />
                <Text style={styles.metricValue}>{wallpaper.viewCount}</Text>
                <Text style={styles.metricLabel}>Lượt xem</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <AppIcon name="downloads" size={18} color={Theme.colors.primary} />
                <Text style={styles.metricValue}>
                  {wallpaper.downloadCount}
                </Text>
                <Text style={styles.metricLabel}>Lượt tải</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <AppIcon name="star" size={18} color={Theme.colors.accent} />
                <Text style={styles.metricValue}>
                  {wallpaper.rankingScore}
                </Text>
                <Text style={styles.metricLabel}>Điểm nổi bật</Text>
              </View>
            </View>

            {/* Technical Specifications (Strict Manifest.tsv Spec: Resolution & Category only) */}
            <View style={styles.specBox}>
              <Text style={styles.specTitle}>Thông số kỹ thuật</Text>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Độ phân giải:</Text>
                <Text style={styles.specValue}>
                  {(() => {
                    const imgW = wallpaper.dimensions?.width ?? wallpaper.width ?? 1080;
                    const imgH = wallpaper.dimensions?.height ?? wallpaper.height ?? 1920;
                    const is4K = imgW >= 3840 || imgH >= 2160 || (imgW >= 2160 && imgH >= 3840);
                    const tag = is4K ? '4K UHD' : (imgW >= 1440 || imgH >= 2560 ? '2K QHD' : 'Full HD');
                    return `${imgW} × ${imgH} px (${tag})`;
                  })()}
                </Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Thể loại:</Text>
                <Text style={styles.specValue}>
                  {wallpaper.category?.name || 'Tổng hợp'}
                </Text>
              </View>
            </View>

            {/* Tags Section (Rounded-full Chips, clickable to navigate to SearchScreen) */}
            {wallpaper.tags && wallpaper.tags.length > 0 && (
              <View style={styles.tagsSection}>
                <Text style={styles.specTitle}>Thẻ từ khóa</Text>
                <View style={styles.tagsContainer}>
                  {wallpaper.tags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.tagChip}
                      onPress={() => handleTagPress(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.tagText}>#{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Bottom Actions Bar (Nằm ngay dưới Tags, khóa cứng chân trang khi cuộn hết) */}
            <View style={styles.actionRow}>
              {/* Quick Save to Collection (Heart) */}
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => setIsCollectionVisible(true)}
                activeOpacity={0.8}
              >
                <AppIcon name="heart-outline" size={20} color={Theme.colors.textPrimary} />
              </TouchableOpacity>

              {/* Quick Share Sheet */}
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => setIsShareVisible(true)}
                activeOpacity={0.8}
              >
                <AppIcon name="share" size={20} color={Theme.colors.textPrimary} />
              </TouchableOpacity>

              {/* Download Original Image */}
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleTriggerDownload}
                activeOpacity={0.8}
              >
                <AppIcon name="download" size={18} color={Theme.colors.primary} style={styles.buttonIcon} />
                <Text style={styles.downloadText}>Tải về</Text>
              </TouchableOpacity>

              {/* Set as Wallpaper (Primary Ice Blue CTA) */}
              <TouchableOpacity
                style={styles.setWallpaperButton}
                onPress={handleTriggerSetWallpaper}
                activeOpacity={0.85}
              >
                <AppIcon name="image" size={18} color="#0F172A" style={styles.buttonIcon} />
                <Text style={styles.setWallpaperText}>Đặt hình nền</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Full-Screen Wallpaper Modal */}
      {wallpaper ? (
        <Modal
          visible={isFullScreen}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setIsFullScreen(false)}
          statusBarTranslucent
        >
          <StatusBar hidden={isFullScreen} />
          <View style={styles.fullScreenContainer}>
            <TouchableOpacity
              style={styles.fullScreenTouchArea}
              activeOpacity={1}
              onPress={() => setIsFullScreen(false)}
            >
              <Image
                source={{ uri: wallpaper.thumbnailUrl }}
                style={styles.fullScreenImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {/* Floating Close Button */}
            <TouchableOpacity
              style={[
                styles.circleIconButton,
                styles.fullScreenCloseBtn,
                { top: insets.top + Theme.spacing.md },
              ]}
              onPress={() => setIsFullScreen(false)}
              activeOpacity={0.8}
            >
              <AppIcon name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Bottom Floating Hint Pill */}
            <View
              style={[
                styles.fullScreenHintPill,
                { bottom: insets.bottom + Theme.spacing.xl },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.fullScreenHintText}>
                Chạm vào màn hình để quay lại
              </Text>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* 1. Waiting Pop-up (Stitch Rotating Dotted Ring Loader) */}
      <WaitingModal
        visible={isWaitingVisible}
        onCancel={handleCancelWaiting}
        title={
          activeAction === 'APPLY'
            ? 'Đang áp dụng hình nền...'
            : 'Đang tải hình nền gốc...'
        }
        subtitle={
          activeAction === 'APPLY'
            ? 'Chuẩn bị tài nguyên độ phân giải cao cho màn hình chính & khóa'
            : 'Đang kết nối tới máy chủ Cloudflare R2 để tải tệp gốc'
        }
      />

      {/* 2. Success Confirmation Pop-up (Auto-close 3s or Done) */}
      <SuccessModal
        visible={isSuccessVisible}
        onClose={() => setIsSuccessVisible(false)}
        autoCloseSeconds={3}
        title={successMessage.title}
        subtitle={successMessage.subtitle}
      />

      {/* 3. Share Sheet (30% Height, public thumbnail URL) */}
      <ShareSheet
        visible={isShareVisible}
        onClose={() => setIsShareVisible(false)}
        wallpaperId={wallpaperId}
        thumbnailUrl={wallpaper?.thumbnailUrl}
        title={wallpaper?.title}
      />

      {/* 4. Save to Collection Modal (75% Height) */}
      <CollectionModal
        visible={isCollectionVisible}
        onClose={() => setIsCollectionVisible(false)}
        currentWallpaperTitle={wallpaper?.title}
        onSave={async (colId, colName) => {
          if (wallpaper) {
            try {
              const res = await addWallpaperToCollection(colId, wallpaper);
              if (res.isDuplicate) {
                Alert.alert(
                  'Bộ sưu tập',
                  `Hình nền "${wallpaper.title}" đã có sẵn trong bộ sưu tập "${colName}".`
                );
              } else {
                Alert.alert(
                  'Thành công',
                  `Đã thêm hình nền "${wallpaper.title}" vào bộ sưu tập "${colName}".`
                );
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể lưu vào bộ sưu tập.');
            }
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  floatingHeader: {
    position: 'absolute',
    left: Theme.spacing.lg,
    right: Theme.spacing.lg,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleIconButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.md,
  },
  fixedImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },
  fixedImage: {
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  scrollContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollSpacer: {
    height: SCREEN_HEIGHT * 0.52,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: Theme.spacing.lg,
  },
  infoSheet: {
    backgroundColor: Theme.colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  categoryBadgeText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightBold,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeTitle,
    fontWeight: Theme.typography.fontWeightBold,
    marginBottom: Theme.spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeMd,
    fontWeight: Theme.typography.fontWeightBold,
  },
  metricLabel: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: Theme.colors.cardBorder,
  },
  specBox: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  specTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeMd,
    fontWeight: Theme.typography.fontWeightBold,
    marginBottom: Theme.spacing.md,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  specLabel: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
  },
  specValue: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightMedium,
  },
  tagsSection: {
    marginBottom: Theme.spacing.xl,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    marginRight: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  tagText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeXs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
  },
  actionIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    marginRight: Theme.spacing.xs,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    height: 46,
    borderRadius: Theme.borderRadius.full,
    marginRight: Theme.spacing.xs,
  },
  buttonIcon: {
    marginRight: Theme.spacing.xs,
  },
  downloadText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
  },
  setWallpaperButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    height: 46,
    borderRadius: Theme.borderRadius.full,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  setWallpaperText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenTouchArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    right: Theme.spacing.lg,
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  fullScreenHintPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  fullScreenHintText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightMedium,
  },
});

export default DetailScreen;
