import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SortOption } from '../api/types';
import Theme from '../theme';
import AppIcon, { IconName } from './AppIcon';

interface SortBarProps {
  currentSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
}

const SORT_ITEMS: { key: SortOption; label: string; icon: IconName }[] = [
  { key: 'latest', label: 'Mới nhất', icon: 'latest' },
  { key: 'popular', label: 'Nổi bật', icon: 'trending' },
  { key: 'views', label: 'Xem nhiều', icon: 'views' },
  { key: 'downloads', label: 'Tải nhiều', icon: 'downloads' },
];

export const SortBar: React.FC<SortBarProps> = ({
  currentSort,
  onSelectSort,
}) => {
  return (
    <View style={styles.container}>
      {SORT_ITEMS.map(item => {
        const isActive = currentSort === item.key;
        const iconColor = isActive ? '#FFFFFF' : Theme.colors.muted;

        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.7}
            onPress={() => onSelectSort(item.key)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <AppIcon name={item.icon} size={14} color={iconColor} style={styles.icon} />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.xs,
    marginHorizontal: Theme.spacing.lg,
    marginVertical: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.sm,
  },
  activeTab: {
    backgroundColor: Theme.colors.primary,
  },
  icon: {
    fontSize: 12,
    marginRight: 4,
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightMedium,
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: Theme.typography.fontWeightBold,
  },
});
