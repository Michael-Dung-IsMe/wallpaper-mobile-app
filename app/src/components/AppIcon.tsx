import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Theme from '../theme';

export type IconName =
  | 'search'
  | 'eye'
  | 'download'
  | 'latest'
  | 'trending'
  | 'views'
  | 'downloads'
  | 'star'
  | 'ranking'
  | 'back'
  | 'close'
  | 'check'
  | 'checkmark'
  | 'alert'
  | 'info'
  | 'refresh'
  | 'image'
  | 'grid'
  | 'wifi-off'
  | 'heart'
  | 'heart-outline'
  | 'share'
  | 'copy'
  | 'time'
  | 'add'
  | 'trash'
  | 'logo-whatsapp'
  | 'logo-instagram'
  | 'chatbubble'
  | 'at'
  | 'send'
  | 'sparkles'
  | 'tune'
  | 'folder'
  | 'flame'
  | 'explore'
  | 'bookmarks'
  | 'settings'
  | 'home'
  | 'more'
  | 'document'
  | 'shield'
  | 'layers'
  | 'chevron-forward'
  | 'expand'
  | 'lock';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const ICON_MAP: Record<IconName, string> = {
  search: 'search-outline',
  eye: 'eye-outline',
  download: 'arrow-down-circle-outline',
  latest: 'sparkles-outline',
  trending: 'flame-outline',
  views: 'eye-outline',
  downloads: 'download-outline',
  star: 'star',
  ranking: 'trophy-outline',
  back: 'arrow-back-outline',
  close: 'close-outline',
  check: 'checkmark-circle-outline',
  checkmark: 'checkmark-outline',
  alert: 'alert-circle-outline',
  info: 'information-circle-outline',
  refresh: 'reload-outline',
  image: 'image-outline',
  grid: 'grid-outline',
  'wifi-off': 'cloud-offline-outline',
  heart: 'heart',
  'heart-outline': 'heart-outline',
  share: 'share-social-outline',
  copy: 'copy-outline',
  time: 'time-outline',
  add: 'add-outline',
  trash: 'trash-outline',
  'logo-whatsapp': 'logo-whatsapp',
  'logo-instagram': 'logo-instagram',
  chatbubble: 'chatbubble-ellipses-outline',
  at: 'at-circle-outline',
  send: 'paper-plane-outline',
  sparkles: 'sparkles-outline',
  tune: 'options-outline',
  folder: 'folder-outline',
  flame: 'flame-outline',
  explore: 'compass-outline',
  bookmarks: 'bookmark-outline',
  settings: 'settings-outline',
  home: 'home-outline',
  more: 'ellipsis-horizontal',
  document: 'document-text-outline',
  shield: 'shield-checkmark-outline',
  layers: 'layers-outline',
  'chevron-forward': 'chevron-forward',
  expand: 'expand-outline',
  lock: 'lock-closed-outline',
};

/**
 * Component hiển thị Vector Icon tiêu chuẩn chất lượng cao cho Mobile App
 * Tuyệt đối không sử dụng Unicode Emoji thô sơ
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = Theme.colors.textPrimary,
  style,
}) => {
  const iconGlyph = ICON_MAP[name] || 'help-circle-outline';

  return (
    <View style={[styles.container, style]}>
      <Ionicons name={iconGlyph} size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppIcon;
