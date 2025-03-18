import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore
import UpArrow from '../components/up_arrow.svg';
import { incrementXP, incrementDailyVideosWatched } from '../../supabase/progressService';
import useUser from '../../hooks/useUser';
import DotIndicator from '../components/DotIndicator';

// XP level constants
const XP_PER_LEVEL = 500;

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

  // Fetch initial user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Just use default daily goal of 5
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
        const updatedXP = await incrementXP(user.id, 100);
        setNewXP(updatedXP);
        
        // Increment daily videos watched
        const updatedCount = await incrementDailyVideosWatched(user.id);
        setDailyVideosWatched(updatedCount);
        
        console.log('Progress updated: XP:', updatedXP, 'Daily Videos:', updatedCount);
        setHasUpdated(true);
      } catch (error) {
        console.error('Error updating user progress:', error);
      }
    };

    updateProgress();
  }, [user, isVisible, hasUpdated, isLoading]);

  // Calculate level from XP
  const calculateLevel = (xp: number): number => {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
  };

  // Calculate XP progress within current level (0-1)
  const calculateXPProgress = (xp: number): number => {
    const levelXP = xp % XP_PER_LEVEL;
    return levelXP / XP_PER_LEVEL;
  };

  const level = calculateLevel(newXP > 0 ? newXP : currentXP);
  const xpProgress = calculateXPProgress(newXP > 0 ? newXP : currentXP);
  const dailyProgress = dailyVideosWatched / dailyGoal;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5a51e1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Good Job!</Text>
      <Text style={styles.subtitle}>You completed the video and earned 100 XP</Text>
      
      {/* XP Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Level {level}</Text>
          <Text style={styles.xpValue}>{newXP > 0 ? newXP % XP_PER_LEVEL : currentXP % XP_PER_LEVEL}/{XP_PER_LEVEL} XP</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={['#5a51e1', '#8a72e3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBar, { width: `${xpProgress * 100}%` }]}
          >
            {xpProgress > 0.08 && (
              <Text style={styles.progressText}>+100</Text>
            )}
          </LinearGradient>
        </View>
      </View>
      
      {/* Daily Goal Progress */}
      <View style={styles.progressSection}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Daily Goal</Text>
          <Text style={styles.xpValue}>{dailyVideosWatched}/{dailyGoal} videos</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={['#e15190', '#e17051']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBar, { width: `${Math.min(dailyProgress, 1) * 100}%` }]}
          >
            {dailyProgress > 0.08 && (
              <Text style={styles.progressText}>+1</Text>
            )}
          </LinearGradient>
        </View>
      </View>
      
      {/* Swipe up indicator */}
      <View style={styles.swipeUpContainer}>
        <Text style={styles.swipeUpText}>Swipe up to continue</Text>
        <UpArrow width={24} height={24} fill="#FFFFFF" />
      </View>
      
      {/* Dot indicator */}
      <DotIndicator totalDots={4} activeDotIndex={3} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    padding: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressSection: {
    width: '90%',
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  xpValue: {
    fontSize: 14,
    color: '#ddd',
  },
  progressBarContainer: {
    width: '100%',
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  swipeUpContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  swipeUpText: {
    fontSize: 16,
    color: '#ddd',
    marginBottom: 8,
  },
});

export default CompletionView; 