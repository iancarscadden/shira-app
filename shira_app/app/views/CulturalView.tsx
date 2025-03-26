// app/views/CulturalView.tsx

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing, 
  Dimensions, 
  ScrollView 
} from 'react-native';
import { CulturalData, CulturalBox } from '../../supabase/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface CulturalViewProps {
  culturalData: CulturalData | null;
}

const CulturalView: React.FC<CulturalViewProps> = ({ culturalData }) => {
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const boxRefs = useRef<{ [key: number]: { y: number, height: number } }>({});
  
  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const boxesOpacity = useRef(new Animated.Value(0)).current;
  
  // Create a ref to store box animations
  const boxAnimations = useRef<{[key: number]: Animated.Value}>({}).current;
  
  // Initialize animations when data changes
  useEffect(() => {
    if (culturalData) {
      // Reset animations
      titleOpacity.setValue(0);
      titleTranslateY.setValue(20);
      boxesOpacity.setValue(0);
      
      // Reset revealed state based on number of boxes
      setRevealed(new Array(culturalData.boxes.length).fill(false));
      
      // Create box animations if they don't exist
      culturalData.boxes.forEach((_, index) => {
        if (!boxAnimations[index]) {
          boxAnimations[index] = new Animated.Value(0.95);
        }
      });
      
      // Start entrance animations
      Animated.sequence([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        }),
        Animated.timing(boxesOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
      
      // Staggered box animations
      culturalData.boxes.forEach((_, index) => {
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.spring(boxAnimations[index], {
            toValue: 1,
            friction: 6,
            tension: 100,
            useNativeDriver: true
          })
        ]).start();
      });
    }
  }, [culturalData]);

  if (!culturalData) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Loading...</Text>
      </View>
    );
  }

  const handleTap = (index: number) => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const isCurrentlyOpen = revealed[index];
    setActiveIndex(index);
    
    setRevealed((prev) => {
      const newStates = [...prev];
      newStates[index] = !newStates[index];
      return newStates;
    });
    
    // Animate the tapped box
    Animated.sequence([
      Animated.timing(boxAnimations[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(boxAnimations[index], {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
    
    // If we're opening the box, scroll to make it fully visible
    if (!isCurrentlyOpen) {
      // Wait for the box to expand before scrolling
      setTimeout(() => {
        if (boxRefs.current[index] && scrollViewRef.current) {
          // Calculate position to scroll to (box position + full box height)
          // Note: Using a larger offset (100) to ensure the entire box is visible
          const scrollPosition = boxRefs.current[index].y;
          
          // Scroll to the position
          scrollViewRef.current.scrollTo({
            y: scrollPosition,
            animated: true
          });
        }
      }, 200); // Increased delay to ensure content has expanded
    }
  };

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>INSIDE THE CULTURE</Text>
        
        {/* Main cultural question/title */}
        <Animated.View 
          style={[
            styles.titleContainer, 
            { 
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }]
            }
          ]}
        >
          <View style={styles.titleIconContainer}>
            <Ionicons name="earth" size={18} color="#5A51E1" />
          </View>
          <Text style={styles.culturalTitle}>{culturalData.title}</Text>
        </Animated.View>
        
        <Text style={styles.subtitle}>Tap each card to explore!</Text>

        <Animated.View style={{ opacity: boxesOpacity, width: '100%', alignItems: 'center' }}>
          {culturalData.boxes.map((box: CulturalBox, i: number) => {
            const isOpen = revealed[i];
            const scaleAnim = boxAnimations[i] || new Animated.Value(1);
            
            return (
              <Animated.View 
                key={`box-${i}`}
                style={{
                  width: '100%',
                  alignItems: 'center',
                  transform: [{ scale: scaleAnim }]
                }}
                onLayout={(event) => {
                  // Store the position and size of each box for scrolling
                  const { y, height } = event.nativeEvent.layout;
                  boxRefs.current[i] = { y, height };
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.box, 
                    isOpen ? styles.boxOpen : styles.boxClosed,
                  ]}
                  onPress={() => handleTap(i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.boxHeader}>
                    <View style={[
                      styles.labelIndicator,
                      { backgroundColor: getLabelColor(i) }
                    ]} />
                    <Text style={styles.boxTitle}>{box.label}</Text>
                    <Ionicons 
                      name={isOpen ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#FFFFFF" 
                      style={styles.chevron}
                    />
                  </View>
                  
                  {isOpen && (
                    <View style={styles.contentContainer}>
                      <View style={styles.divider} />
                      <Text style={styles.boxContent}>{box.blurb}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>
      </View>
    </ScrollView>
  );
};

// Helper function to get colors based on label type
const getLabelColor = (index: number): string => {
  const colors = ['#5A51E1', '#51E1A2', '#E15190', '#E1C151'];
  return colors[index % colors.length];
};

export default CulturalView;

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    padding: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    alignSelf: 'flex-start',
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleContainer: {
    width: '100%',
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(90, 81, 225, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  culturalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    color: '#AAAAAA',
    marginBottom: 14,
    textAlign: 'center',
  },
  box: {
    width: '92%',
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
  },
  boxClosed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  boxOpen: {
    backgroundColor: 'rgba(24, 24, 24, 0.95)',
    borderColor: 'rgba(90, 81, 225, 0.3)',
    shadowColor: '#5A51E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  labelIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  boxTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  contentContainer: {
    padding: 4,
    paddingBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 6,
    marginHorizontal: 12,
  },
  boxContent: {
    fontSize: 13,
    color: '#DDDDDD',
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
});
