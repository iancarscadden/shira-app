// app/(tabs)/progress.tsx
// or if your route is named Learn, keep the file name as is.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Animated, NativeSyntheticEvent, NativeScrollEvent, StatusBar, Dimensions, Platform, RefreshControl, ToastAndroid } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../onboarding/styles';
import { useRouter } from 'expo-router';
import NeedToWorkOnView from '../views/NeedToWorkOnView';
import MasteredView from '../views/MasteredView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/supabase/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { getUserPhrasesToWorkOn, getUserMasteredPhrases } from '@/supabase/progressService';
import useUser from '@/hooks/useUser';

// Original box colors (for reference):
// Daily Goal Box: #95dcfa (blue)
// Streak Box: #fe9b61 (orange)
// Level Box: #c99fff (purple)
// Work On Box: #b7f36b (green)
// Mastered Box: #fdde67 (yellow)

// New color scheme:
// Daily Goal Box: Gradient with #5a51e1 (purple) to #8a72e3
// Streak Box: #5a51e1 (purple)
// Level Box: #51e1a2 (teal)
// Work On Box: #e15190 (pink)
// Mastered Box: #c4cc45 (darker yellow)

// XP level constants
const XP_PER_LEVEL = 500;

const DISPLAY_NAME_KEY = '@display_name';
const { width, height } = Dimensions.get('window');

// App color scheme
const COLORS = {
  primary: '#5a51e1', // Purple
  secondary: '#e15190', // Pink
  tertiary: '#51e1a2', // Teal
  accent: '#c4cc45', // Yellow
  background: '#181818', // Dark background
  cardBg: 'rgba(30, 30, 30, 0.8)', // Card background
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(255, 255, 255, 0.1)',
};

const Progress: React.FC = () => {
    const router = useRouter();
    const { user: currentUser, loading: userLoading } = useUser();
    const [displayName, setDisplayName] = useState<string>('');
    const [dailyGoal, setDailyGoal] = useState<number>(5);
    const [dailyVideosWatched, setDailyVideosWatched] = useState<number>(0);
    const [currentStreak, setCurrentStreak] = useState<number>(1);
    const [xpLevel, setXpLevel] = useState<number>(0);
    const [currentXP, setCurrentXP] = useState<number>(0);
    const [showNeedToWorkOn, setShowNeedToWorkOn] = useState(false);
    const [showMastered, setShowMastered] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;
    const textScrollY = useRef(new Animated.Value(0)).current;
    const headerHeight = 60;
    const maxHeaderHeight = 120;
    const [phrasesToWorkOnCount, setPhrasesToWorkOnCount] = useState(0);
    const [masteredPhrasesCount, setMasteredPhrasesCount] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [tipsCollapsed, setTipsCollapsed] = useState<boolean>(true);
    const tipsHeightAnim = useRef(new Animated.Value(0)).current;
    const tipsOpacityAnim = useRef(new Animated.Value(0)).current;
    const [refreshing, setRefreshing] = useState(false);
    const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
    const refreshMessageAnim = useRef(new Animated.Value(0)).current;
    const iconGlowAnim = useRef(new Animated.Value(0.4)).current;

    // Calculate header text size based on scroll position
    const headerTextSize = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [32, 20],
        extrapolate: 'clamp'
    });

    // Calculate positions for the floating icons based on scroll
    const iconPositionY = scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [580, 579], // Base position - scroll offset
        extrapolateLeft: 'extend',
        extrapolateRight: 'extend'
    });

    // Calculate level and progress values
    const level = Math.floor(currentXP / XP_PER_LEVEL) + 1;
    const xpToNextLevel = XP_PER_LEVEL - (currentXP % XP_PER_LEVEL);
    const xpProgress = ((currentXP % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
    const xpInCurrentLevel = currentXP % XP_PER_LEVEL;

    // Fetch user data function - using useCallback with empty dependency array
    // to ensure this function doesn't change between renders
    const fetchUserData = useCallback(async () => {
        console.log('Fetching fresh user data from database...');
        try {
            // Get user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) {
                console.log('No active user session found');
                return;
            }
            
            const userId = session.user.id;
            
            // Fetch the latest user profile data directly from the database
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (profileError) {
                console.error('Error fetching profile data:', profileError);
                return;
            }
            
            if (profileData) {
                // Update all state variables with fresh data from the database
                setDisplayName(profileData.display_name || '');
                setCurrentStreak(profileData.current_streak || 1);
                setDailyGoal(profileData.daily_goal || 5);
                setDailyVideosWatched(profileData.daily_videos_watched || 0);
                setCurrentXP(profileData.xp_level || 0);
                setXpLevel(Math.floor((profileData.xp_level || 0) / XP_PER_LEVEL));
                
                console.log('Refreshed user profile data:', {
                    displayName: profileData.display_name,
                    streak: profileData.current_streak,
                    dailyGoal: profileData.daily_goal,
                    dailyVideosWatched: profileData.daily_videos_watched,
                    xpLevel: profileData.xp_level
                });
            }
            
            // Get fresh phrase counts directly from the database
            const phrasesToWorkOn = await getUserPhrasesToWorkOn(userId);
            const masteredPhrases = await getUserMasteredPhrases(userId);
            
            setPhrasesToWorkOnCount(phrasesToWorkOn.length);
            setMasteredPhrasesCount(masteredPhrases.length);
            
            console.log('Refreshed phrase counts:', {
                phrasesToWorkOn: phrasesToWorkOn.length,
                masteredPhrases: masteredPhrases.length
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            throw error; // Rethrow to handle in the onRefresh function
        }
    }, []);

    // Show refresh message
    const showRefreshMessage = (message: string) => {
        setRefreshMessage(message);
        
        // Animate message in
        Animated.sequence([
            Animated.timing(refreshMessageAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(2000),
            Animated.timing(refreshMessageAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            setRefreshMessage(null);
        });
    };

    // Handle refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchUserData();
            // Show success message based on platform
            if (Platform.OS === 'android') {
                ToastAndroid.show('Progress refreshed', ToastAndroid.SHORT);
            } else {
                showRefreshMessage('Progress refreshed');
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            // Show error message based on platform
            if (Platform.OS === 'android') {
                ToastAndroid.show('Failed to refresh progress', ToastAndroid.SHORT);
            } else {
                showRefreshMessage('Failed to refresh progress');
            }
        } finally {
            setRefreshing(false);
        }
    }, [fetchUserData, showRefreshMessage]);

    // Load display name and phrase counts on initial mount
    useEffect(() => {
        if (!userLoading && currentUser?.id) {
            fetchUserData();
        }
    }, [userLoading, currentUser?.id, fetchUserData]);

    // Update data when views change
    useEffect(() => {
        if (currentUser?.id && (showNeedToWorkOn === false && showMastered === false)) {
            fetchUserData();
        }
    }, [showNeedToWorkOn, showMastered, currentUser?.id, fetchUserData]);

    // Animate elements on mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    // Add animated effect for the icon glow
    useEffect(() => {
        // Create a looping pulse animation for the icon glow
        Animated.loop(
            Animated.sequence([
                Animated.timing(iconGlowAnim, {
                    toValue: 0.8,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(iconGlowAnim, {
                    toValue: 0.4,
                    duration: 1500,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    const handleKeepGoing = () => {
        router.push('/(tabs)/learn');
    };

    const handleNeedToWorkOn = () => {
        setShowNeedToWorkOn(true);
    };

    const handleMastered = () => {
        // Show mastered view
        setShowMastered(true);
    };

    const handleBack = () => {
        setShowNeedToWorkOn(false);
        setShowMastered(false);
    };

    // Calculate progress percentage for daily goal
    // Caps at 100% even if user exceeds their daily goal
    const goalProgress = Math.min(Math.round((dailyVideosWatched / dailyGoal) * 100), 100);

    // Toggle tips collapsed state with animation
    const toggleTips = () => {
        // Calculate new values based on current collapsed state
        const heightToValue = tipsCollapsed ? 1 : 0;
        const opacityToValue = tipsCollapsed ? 1 : 0;
        
        // Animate height with JS driver (cannot use native driver for layout properties)
        Animated.timing(tipsHeightAnim, {
            toValue: heightToValue,
            duration: 300,
            useNativeDriver: false,
        }).start();
        
        // Animate opacity with native driver for better performance
        Animated.timing(tipsOpacityAnim, {
            toValue: opacityToValue,
            duration: 200,
            useNativeDriver: true,
        }).start();
        
        // Update state immediately
        setTipsCollapsed(!tipsCollapsed);
    };

    // Render the main progress screen
    const renderProgressScreen = () => {
        return (
            <ScrollView 
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentContainer}
                bounces={true}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                        colors={[COLORS.primary, COLORS.secondary]}
                        progressBackgroundColor="rgba(30, 30, 30, 0.8)"
                        progressViewOffset={20}
                        title="Refreshing progress..."
                        titleColor={COLORS.text}
                    />
                }
            >
                {/* Header with user info */}
                <Animated.View 
                    style={[
                        styles.headerContainer,
                        { opacity: fadeAnim }
                    ]}
                >
                    <View style={styles.userInfoContainer}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.userTextContainer}>
                            <Text style={styles.welcomeText}>Welcome back,</Text>
                            <Text style={styles.nameText}>{displayName}</Text>
                            <View style={styles.levelBadgeSmall}>
                                <MaterialCommunityIcons name="star-four-points" size={12} color="#000" />
                                <Text style={styles.levelBadgeTextSmall}>LEVEL {level}</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
                
                {/* Unified Today's Progress Dashboard */}
                <Animated.View 
                    style={[
                        styles.cardContainer,
                        styles.todayProgressCard,
                        { 
                            opacity: fadeAnim,
                            transform: [{ translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [15, 0]
                            })}]
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['#6a61f1', '#4a41d1']}
                        style={styles.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <BlurView intensity={20} tint="dark" style={styles.todayProgressContent}>
                            <Text style={styles.todayProgressTitle}>TODAY'S PROGRESS</Text>
                            
                            <View style={styles.todayProgressMetrics}>
                                {/* Circular Progress Indicator for Daily Goal */}
                                <View style={styles.circularProgressContainer}>
                                    <View style={styles.circularProgress}>
                                        <Svg width={100} height={100} viewBox="0 0 100 100">
                                            <Defs>
                                                <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <Stop offset="0%" stopColor={COLORS.tertiary} />
                                                    <Stop offset="100%" stopColor={COLORS.primary} />
                                                </SvgGradient>
                                            </Defs>
                                            <Path
                                                d={`
                                                    M 50 5
                                                    A 45 45 0 0 1 95 50
                                                    A 45 45 0 0 1 50 95
                                                    A 45 45 0 0 1 5 50
                                                    A 45 45 0 0 1 50 5
                                                `}
                                                fill="none"
                                                stroke="rgba(255, 255, 255, 0.1)"
                                                strokeWidth={8}
                                            />
                                            {/* Calculate progress percentage based on videos watched, handling overflow */}
                                            {(() => {
                                                // For overflow handling, calculate the progress based on the remainder
                                                const progressPercentage = dailyGoal === 0 
                                                    ? 0 
                                                    : ((dailyVideosWatched % dailyGoal) / dailyGoal) * 100;
                                                
                                                // If it's exactly zero (when fully completed and on a multiple of the goal)
                                                // and we've watched at least one video, show as 100%
                                                const adjustedProgress = 
                                                    progressPercentage === 0 && dailyVideosWatched > 0 
                                                        ? 100 
                                                        : progressPercentage;
                                                
                                                const isHalfOrMore = adjustedProgress > 50;
                                                
                                                return (
                                                    <Path
                                                        d={`
                                                            M 50 5
                                                            A 45 45 0 ${isHalfOrMore ? 1 : 0} 1 ${
                                                                50 + 45 * Math.cos((Math.PI * 2 * adjustedProgress) / 100 - Math.PI / 2)
                                                            } ${
                                                                50 + 45 * Math.sin((Math.PI * 2 * adjustedProgress) / 100 - Math.PI / 2)
                                                            }
                                                        `}
                                                        fill="none"
                                                        stroke="url(#progressGradient)"
                                                        strokeWidth={8}
                                                        strokeLinecap="round"
                                                    />
                                                );
                                            })()}
                                        </Svg>
                                        <View style={styles.circularProgressCenter}>
                                            <Text style={styles.circularProgressText}>{dailyVideosWatched}/{dailyGoal}</Text>
                                            <Text style={styles.circularProgressLabel}>VIDEOS</Text>
                                        </View>
                                    </View>
                                </View>
                                
                                {/* Streak Counter */}
                                <View style={styles.streakContainer}>
                                    <View style={styles.streakTextContainer}>
                                        <View style={styles.streakNumberRow}>
                                            <View style={styles.streakIconContainer}>
                                                <Ionicons name="flash" size={22} color="#FFD700" />
                                            </View>
                                            <Text style={styles.streakCountText}>{currentStreak}</Text>
                                        </View>
                                        <Text style={styles.streakLabelText}>DAY STREAK</Text>
                                    </View>
                                </View>
                            </View>
                            
                            <TouchableOpacity 
                                style={styles.keepLearningButton}
                                onPress={handleKeepGoing}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                                    style={styles.keepLearningGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.keepLearningText}>KEEP LEARNING</Text>
                                    <Ionicons name="arrow-forward" size={16} color={COLORS.text} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </BlurView>
                    </LinearGradient>
                </Animated.View>
                
                {/* Enhanced Level Info Card */}
                <Animated.View 
                    style={[
                        styles.cardContainer,
                        { 
                            opacity: fadeAnim,
                            transform: [{ translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [30, 0]
                            })}]
                        }
                    ]}
                >
                    <LinearGradient
                        colors={[COLORS.tertiary, '#41d192']}
                        style={styles.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <BlurView intensity={20} tint="dark" style={styles.levelCardContent}>
                            <View style={styles.levelCardHeader}>
                                <View style={styles.levelCardTitleContainer}>
                                    <MaterialCommunityIcons name="star-four-points" size={20} color="#FFFFFF" />
                                    <Text style={[styles.cardTitle, {
                                        color: COLORS.text, 
                                        fontWeight: '800',
                                        textShadowColor: 'rgba(0, 0, 0, 0.5)',
                                        textShadowOffset: { width: 0, height: 1 },
                                        textShadowRadius: 3
                                    }]}>LEVEL</Text>
                                </View>
                            </View>
                            
                            <View style={styles.levelContentContainer}>
                                <View style={styles.levelNumberContainer}>
                                    <LinearGradient
                                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)']}
                                        style={styles.levelNumberBackground}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    />
                                    <View style={[styles.levelNumberGlow, {borderColor: '#FFFFFF', opacity: 0.3}]} />
                                    <Text style={[styles.currentLevelNumber, {
                                        color: COLORS.text, 
                                        textShadowColor: 'transparent',
                                        textShadowOffset: { width: 0, height: 0 },
                                        textShadowRadius: 0
                                    }]}>{level}</Text>
                                </View>
                                
                                <View style={styles.levelProgressContainer}>
                                    <View style={styles.levelLabelsContainer}>
                                        <Text style={[styles.levelProgressLabel, {
                                            color: COLORS.text, 
                                            fontWeight: '600',
                                            textShadowColor: 'transparent',
                                            textShadowOffset: { width: 0, height: 0 },
                                            textShadowRadius: 0
                                        }]}>Progress to level {level+1}</Text>
                                        <Text style={[styles.levelProgressValue, {
                                            color: COLORS.text, 
                                            fontWeight: '600',
                                            textShadowColor: 'transparent',
                                            textShadowOffset: { width: 0, height: 0 },
                                            textShadowRadius: 0
                                        }]}>{xpInCurrentLevel}/{XP_PER_LEVEL} XP</Text>
                                    </View>
                                    
                                    <View style={styles.levelProgressBarContainer}>
                                        <View style={[styles.levelProgressBar, {backgroundColor: 'rgba(255, 255, 255, 0.15)'}]}>
                                            <View 
                                                style={[
                                                    styles.levelProgressFill, 
                                                    { width: `${xpProgress}%` }
                                                ]} 
                                            >
                                                <LinearGradient
                                                    colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.levelProgressGradient}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                    
                                    <Text style={[styles.levelProgressText, {
                                        color: COLORS.text, 
                                        opacity: 0.8, 
                                        fontWeight: '500',
                                        textShadowColor: 'transparent',
                                        textShadowOffset: { width: 0, height: 0 },
                                        textShadowRadius: 0
                                    }]}>
                                        {xpToNextLevel} XP needed for next level
                                    </Text>
                                </View>
                            </View>
                        </BlurView>
                    </LinearGradient>
                </Animated.View>
                
                {/* Phrases Stats Section */}
                <View style={styles.sectionTitleContainer}>
                    <LinearGradient
                        colors={[COLORS.secondary, 'rgba(225, 81, 144, 0.6)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sectionTitleGradient}
                    />
                    <Text style={styles.sectionTitle}>YOUR PHRASE MASTERY</Text>
                </View>
                
                {/* Completely reimagined Phrase Mastery Section */}
                <Animated.View 
                    style={[
                        styles.languageMasteryContainer,
                        { 
                            opacity: fadeAnim,
                            transform: [{ translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [40, 0]
                            })}]
                        }
                    ]}
                >
                    {/* Need Work Card - Reimagined Design */}
                    <TouchableOpacity 
                        style={styles.masteryCard}
                        onPress={handleNeedToWorkOn}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.secondary, '#d13d7c']}
                            style={styles.masteryCardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <BlurView intensity={20} tint="dark" style={styles.masteryCardContent}>
                                <View style={styles.masteryIconContainer}>
                                    <Ionicons name="mic-outline" size={32} color="#FFF" />
                                    <View style={styles.masteryCountBadge}>
                                        <Text style={styles.masteryCountBadgeText}>{phrasesToWorkOnCount}</Text>
                                    </View>
                                    <Animated.View 
                                        style={[
                                            styles.masteryIconGlow,
                                            { opacity: iconGlowAnim }
                                        ]} 
                                    />
                                    <View style={styles.masteryPatternOverlay} />
                                </View>
                                
                                <View style={styles.masteryTextContent}>
                                    <Text style={styles.masteryTitle}>Need Work</Text>
                                    <Text style={styles.masteryDescription}>
                                        {phrasesToWorkOnCount === 0 
                                            ? "You're doing great! No phrases need work."
                                            : `${phrasesToWorkOnCount} phrases need your attention`}
                                    </Text>
                                    
                                    <View style={styles.masteryActionButton}>
                                        <Text style={styles.masteryActionText}>Practice Now</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                                    </View>
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </TouchableOpacity>
                    
                    {/* Mastered Card - Reimagined Design */}
                    <TouchableOpacity 
                        style={styles.masteryCard}
                        onPress={handleMastered}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.accent, '#b3ba34']}
                            style={styles.masteryCardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <BlurView intensity={20} tint="dark" style={styles.masteryCardContent}>
                                <View style={styles.masteryIconContainer}>
                                    <FontAwesome5 name="crown" size={28} color="#FFF" />
                                    <View style={styles.masteryCountBadge}>
                                        <Text style={styles.masteryCountBadgeText}>{masteredPhrasesCount}</Text>
                                    </View>
                                    <Animated.View 
                                        style={[
                                            styles.masteryIconGlow,
                                            { opacity: iconGlowAnim }
                                        ]} 
                                    />
                                    <View style={styles.masteryPatternOverlay} />
                                </View>
                                
                                <View style={styles.masteryTextContent}>
                                    <Text style={styles.masteryTitle}>Mastered</Text>
                                    <Text style={styles.masteryDescription}>
                                        {masteredPhrasesCount === 0 
                                            ? "Start learning to master phrases"
                                            : `${masteredPhrasesCount} phrases in your vocabulary`}
                                    </Text>
                                    
                                    <View style={styles.masteryActionButton}>
                                        <Text style={styles.masteryActionText}>View Collection</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                                    </View>
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
                
                {/* Weekly Activity Section */}
                <View style={styles.sectionTitleContainer}>
                    <LinearGradient
                        colors={[COLORS.primary, 'rgba(90, 81, 225, 0.6)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sectionTitleGradient}
                    />
                    <Text style={styles.sectionTitle}>WEEKLY ACTIVITY</Text>
                </View>
                
                <Animated.View 
                    style={[
                        styles.cardContainer,
                        { 
                            opacity: fadeAnim,
                            transform: [{ translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [40, 0]
                            })}]
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['#6a61f1', '#5a51e1']}
                        style={styles.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <BlurView intensity={20} tint="dark" style={styles.activityCardContent}>
                            <View style={styles.comingSoonContainer}>
                                <View style={styles.comingSoonBadge}>
                                    <Text style={styles.comingSoonText}>COMING SOON</Text>
                                </View>
                                
                                {/* Placeholder chart visualization */}
                                <View style={styles.placeholderChartContainer}>
                                    <View style={styles.placeholderChartBars}>
                                        {[0.3, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7].map((height, index) => (
                                            <View key={index} style={styles.placeholderBarColumn}>
                                                <View 
                                                    style={[
                                                        styles.placeholderBar, 
                                                        { height: `${height * 100}%` }
                                                    ]} 
                                                />
                                                <Text style={styles.placeholderBarLabel}>
                                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                
                                <View style={styles.comingSoonOverlay} />
                            </View>
                        </BlurView>
                    </LinearGradient>
                </Animated.View>
                
                {/* Achievements Section */}
                <View style={styles.sectionTitleContainer}>
                    <LinearGradient
                        colors={[COLORS.tertiary, 'rgba(81, 225, 162, 0.6)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sectionTitleGradient}
                    />
                    <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
                </View>
                
                <Animated.View 
                    style={[
                        styles.cardContainer,
                        { 
                            opacity: fadeAnim,
                            transform: [{ translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [40, 0]
                            })}],
                            marginBottom: 40, // Add extra margin to the last card
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['#d13d7c', '#e15190']}
                        style={styles.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <BlurView intensity={20} tint="dark" style={styles.achievementsCardContent}>
                            <View style={styles.comingSoonContainer}>
                                <View style={styles.comingSoonBadge}>
                                    <Text style={styles.comingSoonText}>COMING SOON</Text>
                                </View>
                                
                                {/* Achievements preview */}
                                <View style={styles.achievementsPreviewContainer}>
                                    {/* Achievement badges */}
                                    <View style={styles.achievementBadgesPreview}>
                                        {[0, 1, 2].map((index) => (
                                            <View key={index} style={styles.achievementBadgePreview}>
                                                <View style={styles.achievementIconContainerPreview}>
                                                    <Ionicons 
                                                        name={index === 0 ? "star" : index === 1 ? "trophy" : "flame"} 
                                                        size={24} 
                                                        color="#FFD700" 
                                                        style={{opacity: 0.7}}
                                                    />
                                                </View>
                                                <View style={styles.achievementLabelPlaceholder} />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                
                                <View style={styles.comingSoonOverlay} />
                            </View>
                        </BlurView>
                    </LinearGradient>
                </Animated.View>
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#181818" />
            
            {/* Refresh Message for iOS */}
            {Platform.OS !== 'android' && refreshMessage && (
                <Animated.View 
                    style={[
                        styles.refreshMessage,
                        {
                            opacity: refreshMessageAnim,
                            transform: [
                                { 
                                    translateY: refreshMessageAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-20, 0]
                                    })
                                }
                            ]
                        }
                    ]}
                >
                    <Text style={styles.refreshMessageText}>{refreshMessage}</Text>
                </Animated.View>
            )}
            
            {showNeedToWorkOn ? (
                <NeedToWorkOnView onBack={handleBack} />
            ) : showMastered ? (
                <MasteredView onBack={handleBack} />
            ) : (
                renderProgressScreen()
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: COLORS.background,
    },
    scrollContentContainer: {
        paddingTop: 20,
        paddingBottom: 40, // Add extra padding at the bottom for better scrolling experience
    },
    
    // Header styles
    headerContainer: {
        marginBottom: 30,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarContainer: {
        marginRight: 15,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    avatarText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    userTextContainer: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 6,
    },
    levelBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.tertiary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    levelBadgeTextSmall: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 6,
    },
    
    // Card styles
    cardContainer: {
        marginBottom: 25,
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    cardGradient: {
        borderRadius: 20,
    },
    cardContent: {
        padding: 20,
        borderRadius: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginLeft: 10,
        letterSpacing: 0.5,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    actionButtonText: {
        color: COLORS.text,
        fontWeight: '600',
        marginRight: 6,
    },
    
    // Goal progress styles
    goalProgressContainer: {
        marginTop: 8,
    },
    progressBarContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.text,
        borderRadius: 5,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    progressPercentage: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    goalMessage: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 12,
    },
    goalMessageText: {
        fontSize: 14,
        color: COLORS.text,
        textAlign: 'center',
    },
    
    // Updated streak styles - vertically centered days counter
    streakCardContent: {
        padding: 16,
        borderRadius: 16,
    },
    streakLayout: {
        position: 'relative',
        marginBottom: 16,
        height: 70,
    },
    streakTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakDaysContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    streakDaysText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    streakDaysLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    streakActionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    streakMessage: {
        fontSize: 14,
        color: COLORS.text,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 8,
        textAlign: 'center',
    },
    streakCTA: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    streakCTAGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    streakCTAText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginRight: 8,
    },
    
    // Condensed level styles
    levelContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.tertiary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    levelBadgeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 6,
    },
    levelProgressBarContainer: {
        marginBottom: 10,
    },
    levelProgressBar: {
        height: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 5,
        overflow: 'hidden',
    },
    levelProgressFill: {
        height: '100%',
        borderRadius: 5,
        overflow: 'hidden',
    },
    levelProgressGradient: {
        width: '100%',
        height: '100%',
    },
    levelProgressText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'right',
    },
    xpText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    
    // Goal badge styles
    goalBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    goalBadgeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    
    // Section title
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 35,
        marginBottom: 20,
    },
    sectionTitleGradient: {
        width: 6,
        height: 28,
        borderRadius: 3,
        marginRight: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 1,
    },
    
    // Stats cards
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    languageMasteryContainer: {
        marginBottom: 30,
    },
    masteryCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    masteryCardGradient: {
        borderRadius: 24,
    },
    masteryCardContent: {
        padding: 0,
        flexDirection: 'row',
        borderRadius: 24,
        height: 140,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    masteryIconContainer: {
        width: 110,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        position: 'relative',
        zIndex: 1,
    },
    masteryCountBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: '#FFF',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    masteryCountBadgeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    masteryTextContent: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    masteryTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 3,
    },
    masteryDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 16,
        lineHeight: 18,
    },
    masteryActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    masteryActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
        marginRight: 8,
    },
    todayProgressCard: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    todayProgressContent: {
        padding: 16,
        borderRadius: 16,
    },
    todayProgressTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    todayProgressMetrics: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        gap: 40,
    },
    circularProgressContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    circularProgress: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circularProgressCenter: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        top: 15,
        left: 15,
    },
    circularProgressText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    circularProgressLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginTop: 3,
    },
    streakContainer: {
        alignItems: 'center',
        marginHorizontal: 0,
    },
    streakTextContainer: {
        alignItems: 'center',
    },
    streakNumberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    streakIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 165, 0, 0.3)',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    streakCountText: {
        fontSize: 38,
        fontWeight: 'bold',
        color: COLORS.text,
        textShadowColor: 'rgba(255, 165, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 5,
        lineHeight: 42,
    },
    streakLabelText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'rgba(255, 215, 0, 0.8)',
        letterSpacing: 1,
    },
    keepLearningButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    keepLearningGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    keepLearningText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginRight: 8,
    },
    levelCardContent: {
        padding: 20,
        borderRadius: 16,
    },
    levelCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    levelCardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    xpBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    xpBadgeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    levelContentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    levelNumberContainer: {
        position: 'relative',
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    levelNumberBackground: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        opacity: 0.8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    levelNumberGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'transparent',
        borderWidth: 3,
        borderColor: COLORS.tertiary,
        opacity: 0.4,
        shadowColor: COLORS.tertiary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    currentLevelNumber: {
        fontSize: 60,
        fontWeight: 'bold',
        color: COLORS.text,
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
        zIndex: 1,
    },
    levelProgressContainer: {
        flex: 1,
    },
    levelLabelsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    levelProgressLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    levelProgressValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    activityCardContent: {
        padding: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    comingSoonContainer: {
        position: 'relative',
        alignItems: 'center',
        paddingVertical: 20,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    comingSoonBadge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        marginBottom: 20,
        zIndex: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    comingSoonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    comingSoonOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        borderRadius: 16,
    },
    placeholderChartContainer: {
        width: '100%',
        paddingVertical: 15,
        zIndex: 0,
        borderRadius: 16,
    },
    placeholderChartBars: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
        paddingHorizontal: 10,
        opacity: 0.4,
    },
    placeholderBarColumn: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    placeholderBar: {
        width: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(120, 170, 255, 0.7)',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    placeholderBarLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginTop: 4,
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    achievementsCardContent: {
        padding: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    achievementsPreviewContainer: {
        width: '100%',
        paddingVertical: 10,
        zIndex: 0,
    },
    achievementBadgesPreview: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10,
        opacity: 0.6,
    },
    achievementBadgePreview: {
        alignItems: 'center',
        marginHorizontal: 10,
    },
    achievementIconContainerPreview: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    achievementLabelPlaceholder: {
        width: 60,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 4,
    },
    refreshMessage: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 0,
        right: 0,
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshMessageText: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        fontSize: 14,
        fontWeight: '500',
    },
    masteryIconGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        opacity: 0.6,
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 5,
    },
    masteryPatternOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.07,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderStyle: 'dashed',
    },
});

export default Progress;
