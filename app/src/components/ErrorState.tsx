import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Theme from '../theme';
import AppIcon from './AppIcon';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Không thể kết nối đến máy chủ Backend',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <AppIcon name="wifi-off" size={48} color={Theme.colors.statusError} style={styles.iconWrapper} />
      <Text style={styles.title}>Lỗi kết nối mạng</Text>
      <Text style={styles.message}>{message}</Text>
      
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Text style={styles.retryText}>Thử lại ngay</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Theme.spacing.xxl,
  },
  iconWrapper: {
    marginBottom: Theme.spacing.lg,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeLg,
    fontWeight: Theme.typography.fontWeightBold,
    marginBottom: Theme.spacing.xs,
  },
  message: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.xl,
  },
  retryButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.fontSizeMd,
    fontWeight: Theme.typography.fontWeightBold,
  },
});
