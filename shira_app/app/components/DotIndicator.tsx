import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface DotIndicatorProps {
  totalDots: number;
  activeDotIndex: number;
}

const DotIndicator: React.FC<DotIndicatorProps> = ({ totalDots, activeDotIndex }) => {
  return (
    <View style={styles.container}>
      <BlurView intensity={25} tint="dark" style={styles.blurPill}>
        <View style={styles.dotContainer}>
          {Array.from({ length: totalDots }).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                index === activeDotIndex ? styles.activeDot : styles.inactiveDot
              ]} 
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  blurPill: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(24, 24, 24, 0.5)', // Slightly visible background that matches #181818
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: '#5a51e1',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});

export default DotIndicator; 