import React from 'react';
import { View, StyleSheet } from 'react-native';

interface DotIndicatorProps {
  totalDots: number;
  activeDotIndex: number;
}

const DotIndicator: React.FC<DotIndicatorProps> = ({ totalDots, activeDotIndex }) => {
  return (
    <View style={styles.container}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    width: '100%',
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