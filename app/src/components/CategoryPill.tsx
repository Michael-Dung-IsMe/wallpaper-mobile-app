import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Category } from '../api/types';
import Theme from '../theme';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategorySlug: string | null;
  onSelectCategory: (slug: string | null) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategorySlug,
  onSelectCategory,
}) => {
  const allCategoryItem = { id: 0, name: 'Tất cả', slug: 'all' };
  const items = [allCategoryItem, ...categories];

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.slug}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isSelected =
            (item.slug === 'all' && selectedCategorySlug === null) ||
            selectedCategorySlug === item.slug;

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                onSelectCategory(item.slug === 'all' ? null : item.slug)
              }
              style={[styles.pill, isSelected && styles.activePill]}
            >
              <Text style={[styles.pillText, isSelected && styles.activePillText]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.xs,
  },
  listContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xs,
  },
  pill: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.cardBackground,
    marginRight: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  activePill: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  pillText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightMedium,
  },
  activePillText: {
    color: '#FFFFFF',
    fontWeight: Theme.typography.fontWeightBold,
  },
});
