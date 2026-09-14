import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Theme from '../theme';
import AppIcon from './AppIcon';

interface EmptyStateProps {
  message?: string;
  onReset?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'Không tìm thấy hình nền nào phù hợp',
  onReset,
}) => {
  return (
    <View style={styles.container}>
      <AppIcon name="image" size={52} color={Theme.colors.muted} style={styles.iconWrapper} />
      <Text style={styles.message}>{message}</Text>
      {onReset && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={onReset}
          activeOpacity={0.8}
        >
          <Text style={styles.resetText}>Đặt lại bộ lọc</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: Theme.spacing.lg,
    opacity: 0.8,
  },
  message: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeMd,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  resetButton: {
    backgroundColor: Theme.colors.cardBackground,
    borderColor: Theme.colors.cardBorder,
    borderWidth: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
  },
  resetText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightSemiBold,
  },
});
