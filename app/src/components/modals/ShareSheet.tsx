import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AppIcon, { IconName } from '../AppIcon';
import Theme from '../../theme';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  wallpaperId: string;
  thumbnailUrl?: string;
  title?: string;
}

interface SocialAppItem {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  bgColor: string;
}

const SOCIAL_APPS: SocialAppItem[] = [
  {
    id: 'messenger',
    name: 'Messenger',
    icon: 'chatbubble',
    color: '#0084FF',
    bgColor: 'rgba(0, 132, 255, 0.12)',
  },
  {
    id: 'zalo',
    name: 'Zalo',
    icon: 'chatbubble',
    color: '#0068FF',
    bgColor: 'rgba(0, 104, 255, 0.12)',
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: 'at',
    color: '#F8FAFC',
    bgColor: 'rgba(255, 255, 255, 0.10)',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'logo-instagram',
    color: '#E1306C',
    bgColor: 'rgba(225, 48, 108, 0.12)',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'logo-whatsapp',
    color: '#25D366',
    bgColor: 'rgba(37, 211, 102, 0.12)',
  },
];

export const ShareSheet: React.FC<ShareSheetProps> = ({
  visible,
  onClose,
  wallpaperId,
  thumbnailUrl,
  title = 'Hình nền HD',
}) => {
  const [copied, setCopied] = useState(false);

  // Use public thumbnail URL (derived from thumbnailUrl prop or standard public thumbnail route, never original)
  const shareUrl =
    thumbnailUrl || `https://pub-wallpaper.r2.dev/wallpapers/thumbnails/${wallpaperId}.webp`;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleShareApp = (app: SocialAppItem) => {
    Alert.alert(
      `Chia sẻ qua ${app.name}`,
      `Đã chuyển liên kết thumbnail công khai:\n${shareUrl}`,
      [{ text: 'Đóng', onPress: onClose }]
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Drag handle bar */}
              <View style={styles.dragHandle} />

              {/* Sheet Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Chia sẻ hình nền</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AppIcon name="close" size={20} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Row 1: Copy Link Box */}
              <View style={styles.copyRow}>
                <View style={styles.linkInputContainer}>
                  <AppIcon
                    name="image"
                    size={16}
                    color={Theme.colors.textMuted}
                    style={styles.linkIcon}
                  />
                  <Text style={styles.linkText} numberOfLines={1}>
                    {shareUrl}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.copyButton, copied && styles.copyButtonSuccess]}
                  onPress={handleCopy}
                  activeOpacity={0.8}
                >
                  <AppIcon
                    name={copied ? 'checkmark' : 'copy'}
                    size={15}
                    color={copied ? '#10B981' : Theme.colors.primary}
                    style={styles.copyIcon}
                  />
                  <Text
                    style={[styles.copyText, copied && styles.copyTextSuccess]}
                  >
                    {copied ? 'Đã chép' : 'Sao chép'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Row 2: 5 Social Media Apps */}
              <View style={styles.socialRow}>
                {SOCIAL_APPS.map(app => (
                  <TouchableOpacity
                    key={app.id}
                    style={styles.appItem}
                    onPress={() => handleShareApp(app)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.appIconCircle, { backgroundColor: app.bgColor }]}
                    >
                      <AppIcon name={app.icon} size={22} color={app.color} />
                    </View>
                    <Text style={styles.appLabel}>{app.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Theme.colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xxl,
    borderTopWidth: 1,
    borderColor: Theme.colors.cardBorder,
    minHeight: 270,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeLg,
    fontWeight: Theme.typography.fontWeightBold,
  },
  closeButton: {
    padding: Theme.spacing.xs,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.xl,
  },
  linkInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  linkIcon: {
    marginRight: Theme.spacing.xs,
  },
  linkText: {
    flex: 1,
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  copyButtonSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  copyIcon: {
    marginRight: 4,
  },
  copyText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightBold,
  },
  copyTextSuccess: {
    color: '#10B981',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xs,
  },
  appItem: {
    alignItems: 'center',
    width: 56,
  },
  appIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  appLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeXs,
    textAlign: 'center',
  },
});

export default ShareSheet;
