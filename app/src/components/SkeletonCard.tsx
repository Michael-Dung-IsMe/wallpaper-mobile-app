import React from 'react';
import { StyleSheet, View } from 'react-native';
import Theme from '../theme';

interface SkeletonCardProps {
  cardWidth: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ cardWidth }) => {
  const cardHeight = Math.round(cardWidth * (16 / 9));

  return (
    <View
      style={[
        styles.skeletonContainer,
        { width: cardWidth, height: cardHeight },
      ]}
    >
      <View style={styles.bottomPlaceholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    backgroundColor: Theme.colors.skeletonBg,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  bottomPlaceholder: {
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderBottomLeftRadius: Theme.borderRadius.md,
    borderBottomRightRadius: Theme.borderRadius.md,
  },
});
