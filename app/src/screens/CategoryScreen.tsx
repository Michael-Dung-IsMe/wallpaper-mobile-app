import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { Category } from '../api/types';
import { AppIcon } from '../components/AppIcon';
import { ErrorState } from '../components/ErrorState';
import { SafeScreen } from '../components/SafeScreen';
import { CategoryScreenNavigationProp } from '../navigation/types';
import Theme from '../theme';

interface CategoryScreenProps {
  navigation: CategoryScreenNavigationProp;
}

export const CategoryScreen: React.FC<CategoryScreenProps> = ({ navigation }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách danh mục');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSelectCategory = (cat: Category) => {
    navigation.navigate('Home');
  };

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh mục hình nền</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCategories} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => handleSelectCategory(item)}
            >
              <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                  <AppIcon name="grid" size={16} color={Theme.colors.primary} style={styles.gridIcon} />
                  <Text style={styles.cardTitle}>{item.name}</Text>
                </View>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.wallpaperCount ?? 0} ảnh
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.cardBorder,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeXl,
    fontWeight: Theme.typography.fontWeightBold,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Theme.spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  cardInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  gridIcon: {
    marginRight: Theme.spacing.sm,
  },
  cardTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeLg,
    fontWeight: Theme.typography.fontWeightSemiBold,
  },
  cardDesc: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
  },
  badge: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  badgeText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightBold,
  },
});
