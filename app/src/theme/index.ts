export interface ColorTokens {
  primary: string;
  primaryHover: string;
  secondary: string;
  background: string;
  surface: string;
  cardBackground: string;
  text: string;
  textPrimary: string;
  muted: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  cardBorder: string;
  badgeBg: string;
  badgeText: string;
  statusSuccess: string;
  statusError: string;
  skeletonBg: string;
  accent: string;
}

export const LightColors: ColorTokens = {
  primary: '#0284C7',
  primaryHover: '#0369A1',
  secondary: '#6366F1',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  cardBackground: '#FFFFFF',
  text: '#0F172A',
  textPrimary: '#0F172A',
  muted: '#64748B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  cardBorder: '#E2E8F0',
  badgeBg: 'rgba(15, 23, 42, 0.75)',
  badgeText: '#FFFFFF',
  statusSuccess: '#10B981',
  statusError: '#EF4444',
  skeletonBg: '#E2E8F0',
  accent: '#0284C7',
};

export const DarkColors: ColorTokens = {
  primary: '#38BDF8',
  primaryHover: '#0284C7',
  secondary: '#818CF8',
  background: '#0F172A',
  surface: '#1E293B',
  cardBackground: '#1E293B',
  text: '#F8FAFC',
  textPrimary: '#F8FAFC',
  muted: '#94A3B8',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  cardBorder: '#334155',
  badgeBg: 'rgba(15, 23, 42, 0.80)',
  badgeText: '#FFFFFF',
  statusSuccess: '#10B981',
  statusError: '#EF4444',
  skeletonBg: '#1E293B',
  accent: '#38BDF8',
};

export const Gradients = {
  primary: ['#38BDF8', '#818CF8'] as const,
  primaryReversed: ['#818CF8', '#38BDF8'] as const,
  darkSurface: ['#1E293B', '#0F172A'] as const,
  overlay: ['transparent', 'rgba(15, 23, 42, 0.90)'] as const,
};

// Default theme is Dark Theme (curated for wallpaper experience)
export const Colors = DarkColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Typography = {
  fontSizeXs: 11,
  fontSizeSm: 13,
  fontSizeMd: 15,
  fontSizeLg: 18,
  fontSizeXl: 22,
  fontSizeTitle: 26,
  
  fontWeightNormal: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold: '700' as const,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 18,
  full: 9999,
};

export const Theme = {
  colors: Colors,
  lightColors: LightColors,
  darkColors: DarkColors,
  gradients: Gradients,
  spacing: Spacing,
  typography: Typography,
  borderRadius: BorderRadius,
};

export default Theme;
