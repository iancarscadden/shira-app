import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Animated, 
  Easing,
  Dimensions,
  TouchableOpacity,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore
import UpArrow from '../components/up_arrow.svg';
import { incrementXP, incrementDailyVideosWatched } from '../../supabase/progressService';
import useUser from '../../hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

// XP level constants
const XP_PER_LEVEL = 500;
const XP_EARNED = 100;

// Tooltip storage key
const TUTORIAL_STORAGE_KEY = '@shira_hasSeenCompleteTutorial';

const { width } = Dimensions.get('window');

interface CompletionViewProps {
  isVisible: boolean;
}

const CompletionView: React.FC<CompletionViewProps> = ({ isVisible }) => {
  const { user } = useUser();
  const [currentXP, setCurrentXP] = useState<number>(0);
  const [newXP, setNewXP] = useState<number>(0);
  const [dailyVideosWatched, setDailyVideosWatched] = useState<number>(0);
  const [dailyGoal, setDailyGoal] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasUpdated, setHasUpdated] = useState<boolean>(false);
  
  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean>(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  
  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const xpProgress = useRef(new Animated.Value(0)).current;
  const dailyProgress = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Star burst animation
  const starBurst = useRef(Array(8).fill(0).map(() => ({
    rotate: new Animated.Value(0),
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0)
  }))).current;

  // Check if the user has seen the tutorial before
  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const tutorialStatus = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (tutorialStatus === 'true') {
          console.log('User has already seen the completion tutorial');
          setHasSeenTutorial(true);
        } else {
          console.log('User has not seen the completion tutorial yet');
          setHasSeenTutorial(false);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
        // If there's an error, default to not showing the tutorial
        setHasSeenTutorial(false);
      } finally {
        // Mark as initialized after AsyncStorage check completes
        setInitialized(true);
        console.log('Tutorial status check initialized');
      }
    };

    checkTutorialStatus();
  }, []);

  // Fetch initial user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setCurrentXP(user.xp_level || 0);
        setDailyVideosWatched(user.daily_videos_watched || 0);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Update XP and daily videos watched when the screen becomes visible
  useEffect(() => {
    const updateProgress = async () => {
      if (!user || !isVisible || hasUpdated || isLoading) {
        return;
      }

      try {
        // Increment XP by 100 points
        const updatedXP = await incrementXP(user.id, XP_EARNED);
        setNewXP(updatedXP);
        
        // Increment daily videos watched
        const updatedCount = await incrementDailyVideosWatched(user.id);
        setDailyVideosWatched(updatedCount);
        
        console.log('Progress updated: XP:', updatedXP, 'Daily Videos:', updatedCount);
        setHasUpdated(true);
        
        // Trigger haptic feedback for celebration
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Start celebration animations
        startAnimations(updatedXP, updatedCount);
      } catch (error) {
        console.error('Error updating user progress:', error);
      }
    };

    updateProgress();
  }, [user, isVisible, hasUpdated, isLoading]);
  
  // Start animations when the screen becomes visible
  useEffect(() => {
    if (isVisible && !isLoading) {
      // If we already updated, animate with the values we have
      if (hasUpdated) {
        startAnimations(newXP, dailyVideosWatched);
      }
      // If we have reset the hasUpdated flag, start with non-animated state
      else if (currentXP > 0) {
        fadeIn.setValue(1);
        slideUp.setValue(0);
        scaleAnim.setValue(1);
        
        // Calculate initial progress values
        const levelXP = currentXP % XP_PER_LEVEL;
        xpProgress.setValue(levelXP / XP_PER_LEVEL);
        dailyProgress.setValue(Math.min(dailyVideosWatched / dailyGoal, 1));
        
        // Start only the arrow animation
        startArrowAnimation();
      }
    } else {
      // Reset animations when screen is not visible
      resetAnimations();
    }
  }, [isVisible, isLoading, hasUpdated]);
  
  // Show tooltip with delay when component is initialized and user hasn't seen tutorial
  useEffect(() => {
    let tooltipTimer: NodeJS.Timeout;
    
    if (initialized && isVisible && !isLoading && hasUpdated && !hasSeenTutorial) {
      // Set timer to show the tooltip after 1.5 seconds
      tooltipTimer = setTimeout(() => {
        setTooltipVisible(true);
        
        // Animate tooltip fade in
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }).start();
      }, 1500);
    }
    
    // Clean up timer
    return () => {
      if (tooltipTimer) clearTimeout(tooltipTimer);
    };
  }, [initialized, isVisible, isLoading, hasUpdated, hasSeenTutorial]);
  
  // Function to handle tooltip dismissal
  const handleDismissTooltip = async () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate out the tooltip
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(async () => {
      setTooltipVisible(false);
      
      // Mark as seen in state
      setHasSeenTutorial(true);
      
      // Save to AsyncStorage
      try {
        await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
        console.log('Completion tutorial marked as seen in AsyncStorage');
      } catch (error) {
        console.error('Error saving tutorial status:', error);
      }
    });
  };
  
  // Function to start all animations
  const startAnimations = (updatedXP: number, updatedCount: number) => {
    // Reset animations first
    resetAnimations();
    
    // Calculate the progress values
    const oldLevelXP = currentXP % XP_PER_LEVEL;
    const oldXPProgress = oldLevelXP / XP_PER_LEVEL;
    
    const newLevelXP = updatedXP % XP_PER_LEVEL;
    const newXPProgress = newLevelXP / XP_PER_LEVEL;
    
    // For daily goal, ensure it's at most 100%
    const oldDailyProgress = Math.min((updatedCount - 1) / dailyGoal, 1);
    const newDailyProgress = Math.min(updatedCount / dailyGoal, 1);
    
    // Set initial values
    fadeIn.setValue(0);
    slideUp.setValue(30);
    xpProgress.setValue(oldXPProgress);
    dailyProgress.setValue(oldDailyProgress);
    scaleAnim.setValue(0.9);
    
    // Start fade, slide and scale animations
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.elastic(1.1)
      })
    ]).start();
    
    // Spin animation for trophy
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic)
    }).start();
    
    // Set progress values directly without animation
    xpProgress.setValue(newXPProgress);
    dailyProgress.setValue(newDailyProgress);
    
    // Start star burst
    animateStarBurst();
    
    // Start arrow animation
    startArrowAnimation();
  };
  
  // Function to animate star burst
  const animateStarBurst = () => {
    starBurst.forEach((star, i) => {
      // Calculate degree based on index
      const degree = (i / starBurst.length) * 360;
      
      Animated.sequence([
        Animated.delay(i * 50),
        Animated.parallel([
          Animated.timing(star.rotate, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(star.scale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5))
          }),
          Animated.timing(star.opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        ]),
        Animated.delay(400),
        Animated.timing(star.opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();
    });
  };
  
  // Function to start the arrow animation
  const startArrowAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic)
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic)
        })
      ])
    ).start();
  };
  
  // Function to reset all animations
  const resetAnimations = () => {
    fadeIn.setValue(0);
    slideUp.setValue(30);
    xpProgress.setValue(0);
    dailyProgress.setValue(0);
    arrowAnim.setValue(0);
    spinAnim.setValue(0);
    scaleAnim.setValue(0.9);
    
    // Stop any ongoing animations
    fadeIn.stopAnimation();
    slideUp.stopAnimation();
    xpProgress.stopAnimation();
    dailyProgress.stopAnimation();
    arrowAnim.stopAnimation();
    spinAnim.stopAnimation();
    scaleAnim.stopAnimation();
    
    // Reset star burst
    starBurst.forEach(star => {
      star.rotate.stopAnimation();
      star.scale.stopAnimation();
      star.opacity.stopAnimation();
      
      star.rotate.setValue(0);
      star.scale.setValue(0);
      star.opacity.setValue(0);
    });
  };

  // Calculate level from XP
  const calculateLevel = (xp: number): number => {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
  };

  const level = calculateLevel(newXP > 0 ? newXP : currentXP);

  // Calculate XP progress percent for current level (e.g., 100 XP = 20% of 500)
  const currentLevelXP = newXP > 0 
    ? newXP % XP_PER_LEVEL  // Get remainder for new XP 
    : currentXP % XP_PER_LEVEL; // Get remainder for current XP

  // Convert to percentage
  const xpProgressPercent = (currentLevelXP / XP_PER_LEVEL) * 100;

  // For daily goal - ensure it shows 100% when goal is met or exceeded
  const dailyProgressPercent = dailyVideosWatched >= dailyGoal ? 100 : (dailyVideosWatched / dailyGoal) * 100;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5a51e1" />
      </View>
    );
  }

  // Interpolate arrow translation
  const arrowTranslateY = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10]
  });
  
  // Spin interpolation
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      {/* Trophy and celebration */}
      <Animated.View
        style={[
          styles.trophyContainer,
          {
            opacity: fadeIn,
            transform: [
              { translateY: slideUp },
              { scale: scaleAnim },
              { rotate: spin }
            ]
          }
        ]}
      >
        {/* Star burst rays */}
        {starBurst.map((star, i) => {
          const degree = (i / starBurst.length) * 360;
          return (
            <Animated.View
              key={`star-${i}`}
              style={[
                styles.starRay,
                {
                  opacity: star.opacity,
                  transform: [
                    { rotate: `${degree}deg` },
                    { translateY: -40 },
                    { scaleY: star.scale }
                  ]
                }
              ]}
            />
          );
        })}
        
        <View style={styles.trophyCircle}>
          <Ionicons name="trophy" size={32} color="#FFF" />
        </View>
      </Animated.View>
      
      {/* Congratulation message - made more concise */}
      <Animated.View
        style={[
          styles.messageContainer,
          {
            opacity: fadeIn,
            transform: [
              { translateY: slideUp },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <Text style={styles.congratsText}>Video Complete!</Text>
        <Text style={styles.subtitle}>+{XP_EARNED} XP</Text>
      </Animated.View>
      
      {/* Progress circles - Simplified */}
      <Animated.View
        style={[
          styles.circlesContainer,
          {
            opacity: fadeIn,
            transform: [
              { translateY: slideUp },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <View style={styles.circlesRow}>
          {/* XP Progress - Using SVG arc similar to progress.tsx */}
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressLabelTop}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{level}</Text>
              </View>
              <Text style={styles.levelLabel}>Level</Text>
            </View>
            
            <View style={styles.circleWrapper}>
              <Svg width={90} height={90} viewBox="0 0 100 100">
                <Defs>
                  <SvgGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#5a51e1" />
                    <Stop offset="100%" stopColor="#8a72e3" />
                  </SvgGradient>
                </Defs>
                {/* Background circle */}
                <Path
                  d="M 50 5 A 45 45 0 0 1 95 50 A 45 45 0 0 1 50 95 A 45 45 0 0 1 5 50 A 45 45 0 0 1 50 5"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={8}
                />
                {/* Progress arc */}
                {(() => {
                  // Ensure we have a valid percentage between 0-100
                  const progress = Math.min(Math.max(xpProgressPercent, 0), 100);
                  
                  // When progress is exactly 0%, don't render the arc
                  if (progress === 0) return null;
                  
                  // Determine if we passed the halfway point
                  const isHalfOrMore = progress > 50;
                  
                  // Calculate the end point of the arc
                  const endX = 50 + 45 * Math.cos((Math.PI * 2 * progress) / 100 - Math.PI / 2);
                  const endY = 50 + 45 * Math.sin((Math.PI * 2 * progress) / 100 - Math.PI / 2);
                  
                  return (
                    <Path
                      d={`M 50 5 A 45 45 0 ${isHalfOrMore ? 1 : 0} 1 ${endX} ${endY}`}
                      fill="none"
                      stroke="url(#xpGradient)"
                      strokeWidth={8}
                      strokeLinecap="round"
                    />
                  );
                })()}
              </Svg>
              
              <View style={styles.progressCenter}>
                <Text style={styles.progressCenterValue}>
                  +{XP_EARNED}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Daily Goal Progress - Using SVG arc similar to progress.tsx */}
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressLabelTop}>
              <Text style={styles.dailyGoalTitle}>Daily Goal</Text>
            </View>
            
            <View style={styles.circleWrapper}>
              <Svg width={90} height={90} viewBox="0 0 100 100">
                <Defs>
                  <SvgGradient id="dailyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#e15190" />
                    <Stop offset="100%" stopColor="#e17051" />
                  </SvgGradient>
                </Defs>
                {/* Background circle */}
                <Path
                  d="M 50 5 A 45 45 0 0 1 95 50 A 45 45 0 0 1 50 95 A 45 45 0 0 1 5 50 A 45 45 0 0 1 50 5"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={8}
                />
                {/* Progress arc - Special handling for 100% */}
                {(() => {
                  // Handle 100% case specially to draw complete circle
                  if (dailyProgressPercent >= 100) {
                    return (
                      <Path
                        d="M 50 5 A 45 45 0 1 1 49.999 5"
                        fill="none"
                        stroke="url(#dailyGradient)"
                        strokeWidth={8}
                        strokeLinecap="round"
                      />
                    );
                  }
                  
                  // When progress is exactly 0%, don't render the arc
                  if (dailyProgressPercent === 0) return null;
                  
                  // Determine if we passed the halfway point
                  const isHalfOrMore = dailyProgressPercent > 50;
                  
                  // Calculate the end point of the arc
                  const endX = 50 + 45 * Math.cos((Math.PI * 2 * dailyProgressPercent) / 100 - Math.PI / 2);
                  const endY = 50 + 45 * Math.sin((Math.PI * 2 * dailyProgressPercent) / 100 - Math.PI / 2);
                  
                  return (
                    <Path
                      d={`M 50 5 A 45 45 0 ${isHalfOrMore ? 1 : 0} 1 ${endX} ${endY}`}
                      fill="none"
                      stroke="url(#dailyGradient)"
                      strokeWidth={8}
                      strokeLinecap="round"
                    />
                  );
                })()}
              </Svg>
              
              <View style={styles.progressCenter}>
                <Text style={styles.progressCenterValue}>
                  +1
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
      
      {/* Next video indicator - Enhanced */}
      <Animated.View 
        style={[
          styles.swipeUpContainer, 
          {
            opacity: fadeIn,
            transform: [
              { translateY: Animated.add(slideUp, arrowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -5]
              }))}
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['rgba(90, 81, 225, 0.9)', 'rgba(90, 81, 225, 0.7)']}
          style={styles.swipeUpGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.swipeUpContent}>
            <Text style={styles.swipeUpText}>Next video</Text>
            
            <View style={styles.chevronGroupContainer}>
              <Animated.View 
                style={[
                  styles.chevronGroup,
                  {
                    transform: [
                      { 
                        translateY: arrowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -8]
                        })
                      }
                    ]
                  }
                ]}
              >
                <Ionicons name="chevron-up" size={20} color="#FFFFFF" />
                <Ionicons name="chevron-up" size={20} color="#FFFFFF" style={styles.stackedChevron} />
                <Ionicons name="chevron-up" size={20} color="#FFFFFF" style={styles.stackedChevron} />
              </Animated.View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
      
      {/* Tooltip overlay */}
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
              <Text style={styles.tooltipTitle}>Congratulations! You finished your first clip! Swipe up to go to the next one.</Text>
              <TouchableOpacity
                style={styles.tooltipButton}
                onPress={handleDismissTooltip}
                activeOpacity={0.7}
              >
                <Text style={styles.tooltipButtonText}>Let's go</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  trophyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 80,
    height: 80,
    marginTop: 5,
  },
  starRay: {
    position: 'absolute',
    width: 3,
    height: 16,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    left: '50%',
    top: '50%',
    marginLeft: -1.5,
    marginTop: -1.5,
  },
  trophyCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#5a51e1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5a51e1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  messageContainer: {
    alignItems: 'center',
    marginVertical: 5,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
  },
  circlesContainer: {
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start', // Align to top
    width: '100%',
  },
  progressCircleContainer: {
    alignItems: 'center',
    width: 140,
  },
  progressLabelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    justifyContent: 'center',
    height: 26, // Fixed height to ensure alignment
  },
  levelBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#5a51e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  levelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  levelLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dailyGoalTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  circleWrapper: {
    width: 90,
    height: 90,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(24, 24, 24, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 2,
    position: 'absolute',
  },
  progressCenterValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  swipeUpContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    width: '100%',
  },
  swipeUpGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 3,
  },
  swipeUpContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  swipeUpText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginRight: 20,
  },
  chevronGroupContainer: {
    height: 45,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronGroup: {
    alignItems: 'center',
  },
  stackedChevron: {
    marginTop: -12,
  },
  // Tooltip styles
  tooltipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 20,
  },
  tooltip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
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
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompletionView; 