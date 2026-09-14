import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AppIcon from './AppIcon';
import { useAppInsets } from './SafeScreen';
import Theme from '../theme';

export type BottomNavTab =
  | 'discover'
  | 'categories'
  | 'search'
  | 'collections'
  | 'settings';

interface BottomNavBarProps {
  activeTab?: BottomNavTab;
  onTabPress: (tab: BottomNavTab) => void;
}

/**
 * Bottom Navigation Bar (Dock) theo thiết kế chuẩn Cosmic Obsidian từ Stitch MCP (Screen c845ebd7096b46e580267c1178c035ba)
 * Gồm 5 nút điều hướng: Discover, Categories, Search (nổi ở giữa), Collections, Settings
 */
export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab = 'discover',
  onTabPress,
}) => {
  const insets = useAppInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Theme.spacing.xs) },
      ]}
    >
      {/* 1. Discover Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress('discover')}
        activeOpacity={0.7}
      >
        <AppIcon
          name="explore"
          size={24}
          color={
            activeTab === 'discover'
              ? Theme.colors.primary
              : Theme.colors.textMuted
          }
        />
        {activeTab === 'discover' && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* 2. Categories Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress('categories')}
        activeOpacity={0.7}
      >
        <AppIcon
          name="grid"
          size={22}
          color={
            activeTab === 'categories'
              ? Theme.colors.primary
              : Theme.colors.textMuted
          }
        />
        {activeTab === 'categories' && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* 3. Search Floating Center Button */}
      <TouchableOpacity
        style={styles.centerSearchButton}
        onPress={() => onTabPress('search')}
        activeOpacity={0.85}
      >
        <AppIcon name="search" size={24} color="#0F172A" />
      </TouchableOpacity>

      {/* 4. Collections Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress('collections')}
        activeOpacity={0.7}
      >
        <AppIcon
          name="bookmarks"
          size={22}
          color={
            activeTab === 'collections'
              ? Theme.colors.primary
              : Theme.colors.textMuted
          }
        />
        {activeTab === 'collections' && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* 5. Settings Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress('settings')}
        activeOpacity={0.7}
      >
        <AppIcon
          name="settings"
          size={22}
          color={
            activeTab === 'settings'
              ? Theme.colors.primary
              : Theme.colors.textMuted
          }
        />
        {activeTab === 'settings' && <View style={styles.activeDot} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderTopWidth: 1,
    borderColor: Theme.colors.cardBorder,
    paddingTop: Theme.spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Theme.colors.primary,
    marginTop: 4,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  centerSearchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -Theme.spacing.md,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: Theme.colors.background,
  },
});

export default BottomNavBar;
