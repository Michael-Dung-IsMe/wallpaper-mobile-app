import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Wallpaper } from '../../api/types';
import Theme from '../../theme';
import AppIcon from '../AppIcon';

interface QuickPreviewModalProps {
  visible: boolean;
  wallpaper: Wallpaper | null;
  onClose: () => void;
  onOpenDetail: (wallpaper: Wallpaper) => void;
  onAddToCollection?: (wallpaper: Wallpaper) => void;
  onShare?: (wallpaper: Wallpaper) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);
const PREVIEW_IMAGE_HEIGHT = Math.round(PREVIEW_WIDTH * 1.3);

export const QuickPreviewModal: React.FC<QuickPreviewModalProps> = ({
  visible,
  wallpaper,
  onClose,
  onOpenDetail,
  onAddToCollection,
  onShare,
}) => {
  const [isImageLoading, setIsImageLoading] = useState(true);

  if (!wallpaper) {
    return null;
  }

  const imgW = wallpaper.dimensions?.width ?? wallpaper.width ?? 1080;
  const imgH = wallpaper.dimensions?.height ?? wallpaper.height ?? 1920;
  const is4K = imgW >= 3840 || imgH >= 2160 || (imgW >= 2160 && imgH >= 3840);
  const resolutionTag = is4K ? '4K UHD' : (imgW >= 1440 || imgH >= 2560 ? '2K QHD' : 'Full HD');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.contentContainer}>
          {/* Top Bar inside popup */}
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text style={styles.previewBadge}>XEM NHANH</Text>
              <Text style={styles.title} numberOfLines={1}>
                {wallpaper.title}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppIcon name="close" size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Large Image Preview Container */}
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: wallpaper.thumbnailUrl }}
              style={styles.image}
              resizeMode="cover"
              onLoadStart={() => setIsImageLoading(true)}
              onLoadEnd={() => setIsImageLoading(false)}
            />

            {isImageLoading && (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
              </View>
            )}

            {/* Float category chip on top of image */}
            {wallpaper.category && (
              <View style={styles.imageCategoryChip}>
                <Text style={styles.imageCategoryText}>
                  {wallpaper.category.name}
                </Text>
              </View>
            )}

            {/* Float resolution chip on top right */}
            <View style={styles.resolutionChip}>
              <Text style={styles.resolutionText}>
                {resolutionTag} • {imgW}×{imgH}
              </Text>
            </View>
          </View>

          {/* Metrics bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <AppIcon name="views" size={14} color={Theme.colors.primary} />
              <Text style={styles.metricText}>{wallpaper.viewCount} lượt xem</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <AppIcon name="downloads" size={14} color={Theme.colors.primary} />
              <Text style={styles.metricText}>{wallpaper.downloadCount} lượt tải</Text>
            </View>
          </View>

          {/* Action buttons row */}
          <View style={styles.actionsRow}>
            {onAddToCollection && (
              <TouchableOpacity
                style={styles.iconActionButton}
                onPress={() => {
                  onClose();
                  onAddToCollection(wallpaper);
                }}
                activeOpacity={0.8}
              >
                <AppIcon name="heart-outline" size={20} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
            )}

            {onShare && (
              <TouchableOpacity
                style={styles.iconActionButton}
                onPress={() => {
                  onClose();
                  onShare(wallpaper);
                }}
                activeOpacity={0.8}
              >
                <AppIcon name="share" size={20} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.primaryDetailButton}
              onPress={() => {
                onClose();
                onOpenDetail(wallpaper);
              }}
              activeOpacity={0.85}
            >
              <AppIcon name="eye" size={18} color="#0F172A" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Xem chi tiết</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  contentContainer: {
    width: PREVIEW_WIDTH,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  headerInfo: {
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  previewBadge: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: Theme.typography.fontWeightBold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeMd,
    fontWeight: Theme.typography.fontWeightBold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  imageWrapper: {
    width: '100%',
    height: PREVIEW_IMAGE_HEIGHT,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Theme.colors.skeletonBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCategoryChip: {
    position: 'absolute',
    top: Theme.spacing.sm,
    left: Theme.spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  imageCategoryText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightSemiBold,
  },
  resolutionChip: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.sm,
  },
  resolutionText: {
    color: Theme.colors.badgeText,
    fontSize: 10,
    fontWeight: Theme.typography.fontWeightMedium,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: Theme.spacing.xs + 2,
    marginVertical: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeXs,
    marginLeft: 5,
    fontWeight: Theme.typography.fontWeightMedium,
  },
  metricDivider: {
    width: 1,
    height: 14,
    backgroundColor: Theme.colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
  },
  iconActionButton: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.xs + 2,
  },
  primaryDetailButton: {
    flex: 1,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 6,
  },
  primaryButtonText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
  },
});

export default QuickPreviewModal;
