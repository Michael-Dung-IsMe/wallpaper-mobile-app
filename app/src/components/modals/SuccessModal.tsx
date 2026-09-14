import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppIcon from '../AppIcon';
import Theme from '../../theme';

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  autoCloseSeconds?: number;
  title?: string;
  subtitle?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  onClose,
  autoCloseSeconds = 3,
  title = 'Đã cài đặt hình nền thành công!',
  subtitle = 'Màn hình chính và màn hình khóa của bạn đã được cập nhật hoàn tất.',
}) => {
  const [countdown, setCountdown] = useState(autoCloseSeconds);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    if (visible) {
      setCountdown(autoCloseSeconds);

      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(autoCloseSeconds);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible, autoCloseSeconds, onClose]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Glowing Checkmark Badge */}
          <View style={styles.badgeWrapper}>
            <View style={styles.outerGlow}>
              <View style={styles.innerBadge}>
                <AppIcon name="checkmark" size={32} color={Theme.colors.primary} />
              </View>
            </View>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Auto Close Hint */}
          <Text style={styles.autoCloseText}>
            Tự động đóng sau {countdown}s...
          </Text>

          {/* Done Button */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Xong</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 24,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeWrapper: {
    marginBottom: Theme.spacing.lg,
  },
  outerGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  innerBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeLg,
    fontWeight: Theme.typography.fontWeightBold,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
  },
  autoCloseText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightMedium,
    marginBottom: Theme.spacing.lg,
  },
  doneButton: {
    width: '100%',
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeMd,
    fontWeight: Theme.typography.fontWeightBold,
  },
});

export default SuccessModal;
