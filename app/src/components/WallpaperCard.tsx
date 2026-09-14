import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Wallpaper } from '../api/types';
import Theme from '../theme';
import AppIcon from './AppIcon';

interface WallpaperCardProps {
  wallpaper: Wallpaper;
  onPress: (wallpaper: Wallpaper) => void;
  onLongPress?: (wallpaper: Wallpaper) => void;
  cardWidth: number;
}

export const WallpaperCard: React.FC<WallpaperCardProps> = React.memo(
  ({ wallpaper, onPress, onLongPress, cardWidth }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Calculate dynamic aspect ratio height (standard 9:16 vertical wallpapers)
    const cardHeight = Math.round(cardWidth * (16 / 9));

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => onPress(wallpaper)}
        onLongPress={() => onLongPress?.(wallpaper)}
        delayLongPress={350}
        style={[
          styles.container,
          { width: cardWidth, height: cardHeight },
        ]}
      >
        {/* Thumbnail Image */}
        {!hasError ? (
          <Image
            source={{ uri: wallpaper.thumbnailUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        ) : (
          <View style={styles.errorContainer}>
            <AppIcon name="image" size={24} color={Theme.colors.muted} />
            <Text style={styles.errorText}>Lỗi tải ảnh</Text>
          </View>
        )}

        {/* Loading Spinner Over Image */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Theme.colors.primary} size="small" />
          </View>
        )}

        {/* Bottom Dark Gradient Overlay for Badges & Title */}
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={1}>
            {wallpaper.title}
          </Text>

          <View style={styles.badgeRow}>
            {/* View Count Badge */}
            <View style={styles.badge}>
              <AppIcon name="views" size={11} color={Theme.colors.badgeText} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>{wallpaper.viewCount}</Text>
            </View>

            {/* Download Count Badge */}
            <View style={styles.badge}>
              <AppIcon name="downloads" size={11} color={Theme.colors.badgeText} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>{wallpaper.downloadCount}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Theme.colors.skeletonBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(12, 12, 16, 0.75)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs + 2,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightSemiBold,
    marginBottom: Theme.spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.badgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
  },
  badgeIcon: {
    fontSize: 10,
    marginRight: 3,
  },
  badgeText: {
    color: Theme.colors.badgeText,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightMedium,
  },
});
