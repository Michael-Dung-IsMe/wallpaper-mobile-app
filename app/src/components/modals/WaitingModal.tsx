import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Theme from '../../theme';

interface WaitingModalProps {
  visible: boolean;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  actionText?: string;
}

// 10 dots positioned in a circle matching Stitch SVG loader
const DOTS = [
  { cx: 40, cy: 10, r: 8.5, opacity: 1.0 },
  { cx: 58.5, cy: 16.5, r: 7.8, opacity: 0.9 },
  { cx: 70, cy: 32, r: 7.1, opacity: 0.8 },
  { cx: 70, cy: 52, r: 6.4, opacity: 0.7 },
  { cx: 58.5, cy: 67.5, r: 5.7, opacity: 0.6 },
  { cx: 40, cy: 71, r: 5.0, opacity: 0.5 },
  { cx: 21.5, cy: 67.5, r: 4.4, opacity: 0.4 },
  { cx: 10, cy: 52, r: 3.8, opacity: 0.3 },
  { cx: 10, cy: 32, r: 3.4, opacity: 0.2 },
  { cx: 21.5, cy: 16.5, r: 3.0, opacity: 0.15 },
];

export const WaitingModal: React.FC<WaitingModalProps> = ({
  visible,
  onCancel,
  title = 'Đang áp dụng hình nền...',
  subtitle = 'Chuẩn bị tài nguyên độ phân giải cao cho màn hình chính & khóa',
  actionText = 'Hủy',
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (visible) {
      spinAnim.setValue(0);
      const spinLoop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );

      spinLoop.start();
      pulseLoop.start();

      return () => {
        spinLoop.stop();
        pulseLoop.stop();
      };
    }
  }, [visible, spinAnim, pulseAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Animated Visual Spinner (Stitch Dotted Ring Loader) */}
          <View style={styles.spinnerContainer}>
            {/* Ambient Cyan Diffused Glow Ring Behind */}
            <Animated.View
              style={[
                styles.ambientGlow,
                {
                  opacity: pulseAnim,
                  transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.9, 1.15] }) }],
                },
              ]}
            />

            {/* Rotating Dotted Ring */}
            <Animated.View
              style={[
                styles.dotsRing,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              {DOTS.map((dot, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      left: dot.cx - dot.r / 2,
                      top: dot.cy - dot.r / 2,
                      width: dot.r,
                      height: dot.r,
                      borderRadius: dot.r / 2,
                      opacity: dot.opacity,
                    },
                  ]}
                />
              ))}
            </Animated.View>
          </View>

          {/* Status Headline & Details */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Micro Status Pill: 4K UHD • Lossless */}
          <View style={styles.pillContainer}>
            <Animated.View
              style={[
                styles.pillDot,
                {
                  opacity: pulseAnim,
                },
              ]}
            />
            <Text style={styles.pillText}>4K UHD • Lossless</Text>
          </View>

          {/* Subtle Action Divider */}
          <View style={styles.divider} />

          {/* Secondary Dismiss Action */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>{actionText}</Text>
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
    maxWidth: 320,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl + 4,
    paddingBottom: Theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 12,
  },
  spinnerContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  ambientGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  dotsRing: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    marginBottom: Theme.spacing.md,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: Theme.spacing.md,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
    marginRight: 6,
  },
  pillText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    marginBottom: Theme.spacing.sm,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default WaitingModal;
