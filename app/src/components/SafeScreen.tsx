import React from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Theme from '../theme';

export interface SafeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** True nếu thiết bị có notch / camera nốt ruồi / giọt nước trong màn hình */
  hasCutout: boolean;
  statusBarHeight: number;
}

/**
 * Hook nhận diện và tính toán giới hạn khung an toàn cho thiết bị Android và iOS
 * Xử lý chính xác cả 2 loại màn hình Android:
 * 1. Màn hình tràn viền có camera khoét lỗ (punch-hole) / tai thỏ (notch).
 * 2. Màn hình phẳng viền dày truyền thống không có camera trong màn hình.
 */
export const useAppInsets = (): SafeInsets => {
  const insets = useSafeAreaInsets();
  const androidBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  // Trên Android: Nếu insets.top > 28px hoặc cao hơn standard status bar -> có camera punch-hole/notch
  const hasCutout = Platform.OS === 'android' 
    ? insets.top > 28 
    : insets.top > 20;

  // Giới hạn an toàn phía trên: Lấy giá trị lớn nhất giữa safe insets và status bar
  const safeTop = Math.max(insets.top, androidBarHeight);

  // Giới hạn an toàn phía dưới: Đảm bảo không bị thanh điều hướng ảo (3 nút hoặc gesture bar) che mất
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return {
    top: safeTop,
    bottom: safeBottom,
    left: insets.left,
    right: insets.right,
    hasCutout,
    statusBarHeight: androidBarHeight,
  };
};

interface SafeScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Chọn các cạnh cần áp dụng đệm an toàn. Mặc định: ['top', 'bottom'] */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Dành cho màn hình muốn hiển thị nền đằng sau Status Bar nhưng vẫn bảo vệ nội dung */
  backgroundColor?: string;
}

/**
 * Component bọc màn hình bảo vệ giao diện chống tràn viền và va chạm camera nốt ruồi.
 */
export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  style,
  edges = ['top', 'bottom'],
  backgroundColor = Theme.colors.background,
}) => {
  const insets = useAppInsets();

  const containerPadding: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
    backgroundColor,
  };

  return (
    <View style={[styles.container, containerPadding, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeScreen;
