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
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cultural tutorial storage key
const TUTORIAL_STORAGE_KEY = '@shira_hasSeenCulturalTutorial';

const { width } = Dimensions.get('window');

interface CulturalViewProps {
  culturalData: CulturalData | null;
}

const CulturalView: React.FC<CulturalViewProps> = ({ culturalData }) => {
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const boxRefs = useRef<{ [key: number]: { y: number, height: number } }>({});
  
  // Animation values for the tooltip
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  
  // Create a ref to store box animations for tap effect only
  const boxAnimations = useRef<{[key: number]: Animated.Value}>({}).current;
  
  // Check if the user has seen the tutorial before
  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const tutorialStatus = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (tutorialStatus === 'true') {
          console.log('User has already seen the cultural tutorial');
          setHasSeenTutorial(true);
        } else {
          console.log('User has not seen the cultural tutorial yet');
          setHasSeenTutorial(false);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
        // If there's an error, default to not showing the tutorial
        setHasSeenTutorial(false);
      }
    };

    checkTutorialStatus();
  }, []);
  
  // Initialize state when data changes
  useEffect(() => {
    if (culturalData) {
      // Reset revealed state based on number of boxes
      setRevealed(new Array(culturalData.boxes.length).fill(false));
      
      // Initialize box animations if they don't exist (for tap effect only)
      culturalData.boxes.forEach((_, index) => {
        if (!boxAnimations[index]) {
          boxAnimations[index] = new Animated.Value(1);
        }
      });
      
      setInitialized(true);
    }
  }, [culturalData]);

  // Show tooltip with delay when component is initialized and user hasn't seen tutorial
  useEffect(() => {
    let tooltipTimer: NodeJS.Timeout;
    
    if (initialized && culturalData && !hasSeenTutorial) {
      // Set timer to show the tooltip after 1 second
      tooltipTimer = setTimeout(() => {
        setTooltipVisible(true);
        
        // Animate tooltip fade in
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }).start();
      }, 1000);
    }
    
    // Clean up timer
    return () => {
      if (tooltipTimer) clearTimeout(tooltipTimer);
    };
  }, [initialized, culturalData, hasSeenTutorial]);

  const handleDismissTooltip = async () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate opacity to hide tooltip
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(async () => {
      setTooltipVisible(false);
      
      // Mark as seen in state
      setHasSeenTutorial(true);
      
      // Save to AsyncStorage
      try {
        await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
        console.log('Cultural tutorial marked as seen in AsyncStorage');
      } catch (error) {
        console.error('Error saving tutorial status:', error);
      }
    });
  };

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
    
    // Animate the tapped box (keep this animation for interaction feedback)
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
    if (!isCurrentlyOpen && scrollViewRef.current && boxRefs.current[index]) {
      // Wait for the box to expand before scrolling
      setTimeout(() => {
        if (boxRefs.current[index] && scrollViewRef.current) {
          const scrollPosition = boxRefs.current[index].y;
          
          // Scroll to the position
          scrollViewRef.current.scrollTo({
            y: scrollPosition,
            animated: true
          });
        }
      }, 200);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.sectionTitle}>INSIDE THE CULTURE</Text>
          
          {/* Main cultural question/title */}
          <View style={styles.titleContainer}>
            <View style={styles.titleIconContainer}>
              <Ionicons name="earth" size={18} color="#5A51E1" />
            </View>
            <Text style={styles.culturalTitle}>{culturalData.title}</Text>
          </View>
          
          <Text style={styles.subtitle}>Tap each card to explore!</Text>

          <View style={{ width: '100%', alignItems: 'center' }}>
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
          </View>
        </View>
      </ScrollView>

      {/* Tooltip overlay with full-screen blur */}
      {tooltipVisible && (
        <>
          {/* Full screen blur */}
          <BlurView 
            intensity={20} 
            tint="dark" 
            style={StyleSheet.absoluteFillObject}
          />
          
          {/* Tooltip on top of the blur */}
          <Animated.View style={[styles.tooltipContainer, { opacity: tooltipOpacity }]}>
            <View style={styles.tooltip}>
              <Text style={styles.tooltipTitle}>Step 3: Take a dive into the cultural nuances</Text>
              <TouchableOpacity
                style={styles.tooltipButton}
                onPress={handleDismissTooltip}
                activeOpacity={0.7}
              >
                <Text style={styles.tooltipButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
};

// Helper function to get colors based on label type
const getLabelColor = (index: number): string => {
  const colors = ['#5A51E1', '#51E1A2', '#E15190', '#E1C151'];
  return colors[index % colors.length];
};

// Export the component
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
  tooltipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'auto',
    padding: 20,
  },
  tooltip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tooltipTitle: {
    fontSize: 18,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 24,
  },
  tooltipButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#5a51e1',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  tooltipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
