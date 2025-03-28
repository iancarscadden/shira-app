// app/(tabs)/progress.tsx
// or if your route is named Learn, keep the file name as is.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Animated, NativeSyntheticEvent, NativeScrollEvent, StatusBar, Dimensions, Platform, RefreshControl, ToastAndroid, Easing, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../onboarding/styles';
import { useRouter } from 'expo-router';
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
    const scrollY = useRef(new Animated.Value(0)).current;
    const textScrollY = useRef(new Animated.Value(0)).current;
    const headerHeight = 60;
    const maxHeaderHeight = 120;
    const [phrasesToWorkOnCount, setPhrasesToWorkOnCount] = useState(0);
    const [masteredPhrasesCount, setMasteredPhrasesCount] = useState(0);
    const [totalPhrasesCount, setTotalPhrasesCount] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [tipsCollapsed, setTipsCollapsed] = useState<boolean>(true);
    const tipsHeightAnim = useRef(new Animated.Value(0)).current;
    const tipsOpacityAnim = useRef(new Animated.Value(0)).current;
    const [refreshing, setRefreshing] = useState(false);
    const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
    const refreshMessageAnim = useRef(new Animated.Value(0)).current;
    const iconGlowAnim = useRef(new Animated.Value(0.4)).current;

    // Add this to track loading state
    const [isLoadingUserData, setIsLoadingUserData] = useState(true);
    
    // Shimmer animation for skeletons
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    
    // Animate the shimmer effect for skeleton loaders
    useEffect(() => {
        if (isLoadingUserData) {
            // Create a looping shimmer animation
            Animated.loop(
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                    easing: Easing.ease
                })
            ).start();
        } else {
            // Reset animation when loading is complete
            shimmerAnim.setValue(0);
        }
    }, [isLoadingUserData]);
    
    // Create interpolated values for shimmer effect
    const shimmerTranslateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 200]
    });

    // Updated with better colors:
    const renderNameSkeleton = () => {
        return (
            <View style={styles.nameSkeleton}>
                <Animated.View 
                    style={[
                        styles.shimmerContainer,
                        {
                            transform: [{ translateX: shimmerTranslateX }]
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.shimmerGradient}
                    />
                </Animated.View>
            </View>
        );
    };
    
    const renderAvatarSkeleton = () => {
        return (
            <View style={styles.avatarSkeleton}>
                <Animated.View 
                    style={[
                        styles.shimmerContainer,
                        {
                            transform: [{ translateX: shimmerTranslateX }]
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['rgba(106, 95, 242, 0)', 'rgba(138, 114, 227, 0.25)', 'rgba(106, 95, 242, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.shimmerGradient}
                    />
                </Animated.View>
            </View>
        );
    };

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
        setIsLoadingUserData(true); // Set loading to true when fetching starts
        try {
            // Get user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) {
                console.log('No active user session found');
                setIsLoadingUserData(false); // Set loading to false even if no session
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
                setIsLoadingUserData(false); // Set loading to false on error
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
            setTotalPhrasesCount(phrasesToWorkOn.length + masteredPhrases.length);
            
            console.log('Refreshed phrase counts:', {
                phrasesToWorkOn: phrasesToWorkOn.length,
                masteredPhrases: masteredPhrases.length,
                total: phrasesToWorkOn.length + masteredPhrases.length
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            throw error; // Rethrow to handle in the onRefresh function
        } finally {
            setIsLoadingUserData(false); // Always set loading to false when done
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
        if (currentUser?.id) {
            fetchUserData();
        }
    }, [currentUser?.id, fetchUserData]);

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

    const handleDiscoveredPhrases = () => {
        Alert.alert(
            "Coming soon!",
            "This is where you will be able to speak with Shira AI, starting the conversation from your discovered key phrases.",
            [
                { text: "OK", onPress: () => console.log("Alert closed") }
            ]
        );
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

    // Updated renderProgressScreen to match the Profile screen styling
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
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {isLoadingUserData ? '' : (displayName ? displayName.charAt(0).toUpperCase() : '?')}
                            </Text>
                            {isLoadingUserData && renderAvatarSkeleton()}
                        </View>
                        <View style={styles.avatarGlow} />
                    </View>
                    <View style={styles.userTextContainer}>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        {isLoadingUserData ? renderNameSkeleton() : (
                            <Text style={styles.nameText}>{displayName}</Text>
                        )}
                        <View style={styles.levelBadgeSmall}>
                            <MaterialCommunityIcons name="star-four-points" size={12} color="#000" />
                            <Text style={styles.levelBadgeTextSmall}>LEVEL {level}</Text>
                        </View>
                    </View>
                </View>
                
                {/* Daily Progress Card */}
                <BlurView intensity={20} tint="dark" style={[styles.card, styles.dailyProgressCard]}>
                    <LinearGradient
                        colors={['rgba(106, 95, 242, 0.8)', 'rgba(90, 81, 225, 0.5)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{flex: 1}}
                    >
                        <View style={[styles.cardHeader, styles.dailyProgressHeader]}>
                            <Text style={styles.cardTitle}>DAILY PROGRESS</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <View style={styles.circularProgressWrapper}>
                                <View style={styles.circularProgressContainer}>
                                    <Svg width={120} height={120} viewBox="0 0 100 100">
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
                                        {(() => {
                                            if (dailyVideosWatched >= dailyGoal) {
                                                return (
                                                    <Path
                                                        d="M 50 5 A 45 45 0 1 1 49.999 5"
                                                        fill="none"
                                                        stroke="url(#progressGradient)"
                                                        strokeWidth={8}
                                                        strokeLinecap="round"
                                                    />
                                                );
                                            }
                                            
                                            const progressPercentage = dailyGoal === 0 
                                                ? 0 
                                                : (dailyVideosWatched / dailyGoal) * 100;
                                            
                                            const isHalfOrMore = progressPercentage > 50;
                                            
                                            return (
                                                <Path
                                                    d={`
                                                        M 50 5
                                                        A 45 45 0 ${isHalfOrMore ? 1 : 0} 1 ${
                                                            50 + 45 * Math.cos((Math.PI * 2 * progressPercentage) / 100 - Math.PI / 2)
                                                        } ${
                                                            50 + 45 * Math.sin((Math.PI * 2 * progressPercentage) / 100 - Math.PI / 2)
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
                                    </View>
                                </View>
                                <Text style={styles.circularProgressLabel}>DAILY VIDEOS</Text>
                            </View>
                            
                            <View style={styles.settingDivider} />
                            
                            <View style={styles.streakContainer}>
                                <View style={styles.settingItem}>
                                    <LinearGradient
                                        colors={['#FFD700', '#FF9500']}
                                        style={[styles.settingIconContainer, { backgroundColor: 'transparent' }]}
                                    >
                                        <Ionicons name="flash" size={24} color="#181818" />
                                    </LinearGradient>
                                    <View style={styles.settingTextContainer}>
                                        <Text style={styles.settingTitle}>{currentStreak} Day Streak</Text>
                                        <Text style={styles.settingDescription}>
                                            {currentStreak === 1 
                                                ? "You're just getting started!" 
                                                : `Keep it up! You're on a ${currentStreak} day roll.`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </BlurView>
                
                {/* Level Progress Card */}
                <BlurView intensity={20} tint="dark" style={[styles.card, styles.levelProgressCard]}>
                    <LinearGradient
                        colors={['rgba(93, 230, 178, 0.7)', 'rgba(81, 201, 225, 0.4)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{flex: 1}}
                    >
                        <View style={[styles.cardHeader, styles.levelProgressHeader]}>
                            <Text style={styles.cardTitle}>LEVEL PROGRESS</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <View style={styles.levelContentContainer}>
                                <View style={styles.settingItem}>
                                    <LinearGradient
                                        colors={['#5de6b2', '#51c9e1']}
                                        style={[styles.settingIconContainer, { backgroundColor: 'transparent' }]}
                                    >
                                        <MaterialCommunityIcons name="star-four-points" size={24} color="#181818" />
                                    </LinearGradient>
                                    <View style={styles.settingTextContainer}>
                                        <Text style={styles.levelNumberText}>Level {level}</Text>
                                        <Text style={styles.settingDescription}>
                                            {xpToNextLevel} XP needed for level {level+1}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.levelProgressBarContainer}>
                                    <View style={styles.levelProgressBar}>
                                        <LinearGradient
                                            colors={['#5de6b2', '#6a5ff2']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[
                                                styles.levelProgressFill, 
                                                { width: `${xpProgress}%` }
                                            ]} 
                                        />
                                    </View>
                                    <View style={styles.levelProgressLabels}>
                                        <Text style={styles.levelProgressValue}>{xpInCurrentLevel}/{XP_PER_LEVEL} XP</Text>
                                    </View>
                                </View>
                                
                                <TouchableOpacity 
                                    style={styles.keepLearningButton}
                                    onPress={handleKeepGoing}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.keepLearningGradient}>
                                        <Text style={styles.keepLearningText}>KEEP LEARNING</Text>
                                        <Ionicons name="arrow-forward" size={16} color={COLORS.text} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>
                </BlurView>
                
                {/* Have a Conversation Card (previously Discovered Phrases) */}
                <BlurView intensity={20} tint="dark" style={[styles.card, styles.conversationCard]}>
                    <LinearGradient
                        colors={['rgba(255, 93, 162, 0.7)', 'rgba(255, 126, 81, 0.4)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{flex: 1}}
                    >
                        <View style={[styles.cardHeader, styles.conversationHeader, styles.practiceHeaderRow]}>
                            <View style={styles.headerTitleGroup}>
                                <Text style={styles.cardTitle}>PRACTICE</Text>
                                <View style={styles.shiraAiGradientContainer}>
                                    <Text style={styles.shiraAiText}>SHIRA AI</Text>
                                    <Ionicons name="flash-outline" size={12} color="#FFFFFF" style={styles.starIcon} />
                                </View>
                            </View>
                            <View style={styles.headerSpacer}></View>
                        </View>
                        <View style={styles.cardContent}>
                            <TouchableOpacity style={styles.settingItem} onPress={handleDiscoveredPhrases}>
                                <LinearGradient
                                    colors={['#ff5da2', '#ff7e51']}
                                    style={styles.conversationIconContainer}
                                >
                                    <Ionicons name="chatbubbles" size={28} color="#FFFFFF" />
                                </LinearGradient>
                                <View style={styles.settingTextContainer}>
                                    <Text style={styles.conversationTitle}>Have a Conversation</Text>
                                    <Text style={styles.settingDescription}>
                                        Practice speaking from your discovered phrases
                                    </Text>
                                </View>
                                <View style={styles.phraseCountBadge}>
                                    <Text style={styles.phraseCountText}>1</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </BlurView>
                
                {/* Weekly Activity Card */}
                <BlurView intensity={20} tint="dark" style={[styles.card, styles.weeklyActivityCard]}>
                    <LinearGradient
                        colors={['rgba(200, 200, 200, 0.4)', 'rgba(120, 120, 120, 0.2)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{flex: 1}}
                    >
                        <View style={[styles.cardHeader, styles.weeklyActivityHeader]}>
                            <Text style={styles.cardTitle}>WEEKLY ACTIVITY</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <View style={styles.comingSoonContainer}>
                                <View style={styles.comingSoonBadge}>
                                    <Text style={styles.comingSoonText}>COMING SOON</Text>
                                </View>
                                
                                {/* Enhanced chart visualization */}
                                <View style={styles.placeholderChartContainer}>
                                    <View style={styles.placeholderChartBars}>
                                        {[0.3, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7].map((height, index) => (
                                            <View key={index} style={styles.placeholderBarColumn}>
                                                <LinearGradient
                                                    colors={
                                                        index % 2 === 0 
                                                        ? [COLORS.tertiary, COLORS.primary]
                                                        : [COLORS.secondary, COLORS.primary]
                                                    }
                                                    style={[
                                                        styles.placeholderBar, 
                                                        { height: `${height * 100}%` }
                                                    ]}
                                                    start={{ x: 0, y: 1 }}
                                                    end={{ x: 0, y: 0 }}
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
                        </View>
                    </LinearGradient>
                </BlurView>
                
                {/* Achievements Card */}
                <BlurView intensity={20} tint="dark" style={[styles.card, styles.achievementsCard]}>
                    <LinearGradient
                        colors={['rgba(200, 200, 200, 0.4)', 'rgba(120, 120, 120, 0.2)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{flex: 1}}
                    >
                        <View style={[styles.cardHeader, styles.achievementsHeader]}>
                            <Text style={styles.cardTitle}>ACHIEVEMENTS</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <View style={styles.comingSoonContainer}>
                                <View style={styles.comingSoonBadge}>
                                    <Text style={styles.comingSoonText}>COMING SOON</Text>
                                </View>
                                
                                {/* Enhanced achievements preview with improved styling */}
                                <View style={styles.achievementsPreviewContainer}>
                                    <View style={styles.achievementBadgesPreview}>
                                        {[0, 1, 2].map((index) => (
                                            <View key={index} style={styles.achievementBadgePreview}>
                                                <LinearGradient
                                                    colors={
                                                        index === 0 ? ['#5a51e1', '#8a72e3'] :
                                                        index === 1 ? ['#e15190', '#e17e51'] :
                                                        ['#51e1a2', '#51c9e1']
                                                    }
                                                    style={styles.achievementIconContainerPreview}
                                                >
                                                    <Ionicons 
                                                        name={index === 0 ? "star" : index === 1 ? "trophy" : "flame"} 
                                                        size={24} 
                                                        color="#FFFFFF" 
                                                    />
                                                </LinearGradient>
                                                <View style={styles.achievementLabelPlaceholder} />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                
                                <View style={styles.comingSoonOverlay} />
                            </View>
                        </View>
                    </LinearGradient>
                </BlurView>
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
            
            {renderProgressScreen()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        position: 'relative',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContentContainer: {
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    
    // Enhanced profile header styles (without background rectangle)
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    avatarContainer: {
        marginRight: 15,
        position: 'relative',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#6a5ff2', // Brighter purple
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)', // Brighter border
        shadowColor: '#8a72e3', // Brighter shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, // More visible shadow
        shadowRadius: 8,
        elevation: 8,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    avatarGlow: {
        position: 'absolute',
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#8a72e3', // Brighter glow
        opacity: 0.7, // More visible
        top: -4,
        left: -4,
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
        backgroundColor: '#5de6b2', // Brighter teal
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
    
    // Enhanced card styles
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 20,
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
    cardHeader: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    cardContent: {
        padding: 15,
    },
    dailyProgressCard: {
        borderColor: 'rgba(106, 95, 242, 0.9)',
    },
    dailyProgressHeader: {
        borderBottomColor: 'rgba(106, 95, 242, 0.7)',
    },
    levelProgressCard: {
        borderColor: 'rgba(93, 230, 178, 0.8)',
    },
    levelProgressHeader: {
        borderBottomColor: 'rgba(93, 230, 178, 0.6)',
    },
    conversationCard: {
        borderColor: 'rgba(255, 93, 162, 0.8)',
    },
    conversationHeader: {
        borderBottomColor: 'rgba(255, 93, 162, 0.6)',
    },
    weeklyActivityCard: {
        borderColor: 'rgba(200, 200, 200, 0.5)',
    },
    weeklyActivityHeader: {
        borderBottomColor: 'rgba(200, 200, 200, 0.4)',
    },
    achievementsCard: {
        borderColor: 'rgba(200, 200, 200, 0.5)',
    },
    achievementsHeader: {
        borderBottomColor: 'rgba(200, 200, 200, 0.4)',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    settingIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#5a51e1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    conversationIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.secondary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    settingTextContainer: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    conversationTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
    settingDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 15,
        marginHorizontal: 10,
    },
    
    // Circular progress styles (updated to match new design)
    circularProgressWrapper: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    circularProgressContainer: {
        position: 'relative',
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    circularProgressCenter: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(30, 30, 30, 0.7)', // Darker bg for contrast
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)', // Brighter border
    },
    circularProgressText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    circularProgressLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    
    // Streak container (updated design)
    streakContainer: {
        paddingHorizontal: 5,
    },
    streakNumberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    streakCountText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    
    // Level progress (updated design)
    levelContentContainer: {
        padding: 5,
    },
    levelNumberText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    levelProgressBarContainer: {
        marginTop: 15,
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    levelProgressBar: {
        height: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.25)', // Brighter background
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 8,
    },
    levelProgressFill: {
        height: '100%',
        borderRadius: 5,
    },
    levelProgressLabels: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    levelProgressValue: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
    },
    levelProgressText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 5,
    },
    
    // Keep Learning button (without gradient)
    keepLearningButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 15,
        alignSelf: 'center',
        width: '100%',
        backgroundColor: '#5de6b2', // Bright teal background instead of gradient
        ...Platform.select({
            ios: {
                shadowColor: '#51e1a2',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.4,
                shadowRadius: 5,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    keepLearningGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    keepLearningText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    
    // Phrase count badge (new)
    phraseCountBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
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
    phraseCountText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    
    // Coming soon sections (improved styling)
    comingSoonContainer: {
        position: 'relative',
        alignItems: 'center',
        paddingVertical: 20,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    comingSoonBadge: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        marginBottom: 20,
        zIndex: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    comingSoonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
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
    
    // Activity chart styles (improved)
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
        opacity: 0.7,
    },
    placeholderBarColumn: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
        paddingHorizontal: 4,
    },
    placeholderBar: {
        width: '100%',
        borderRadius: 8,
        marginBottom: 8,
    },
    placeholderBarLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    
    // Achievement styles (improved)
    achievementsPreviewContainer: {
        width: '100%',
        paddingVertical: 10,
        zIndex: 0,
        opacity: 0.7,
    },
    achievementBadgesPreview: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10,
    },
    achievementBadgePreview: {
        alignItems: 'center',
        marginHorizontal: 10,
    },
    achievementIconContainerPreview: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    achievementLabelPlaceholder: {
        width: 60,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 4,
    },
    
    // Refresh message
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
    practiceHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerSpacer: {
        width: 20, // This creates space on the right to balance the layout
    },
    shiraAiGradientContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginLeft: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    shiraAiText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    starIcon: {
        marginLeft: 3,
        marginRight: -2,
    },
    avatarSkeleton: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(106, 95, 242, 0.1)',
        top: 0,
        left: 0,
        overflow: 'hidden',
    },
    nameSkeleton: {
        width: 180,
        height: 30,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        marginBottom: 6,
        overflow: 'hidden',
    },
    shimmerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    shimmerGradient: {
        position: 'absolute',
        top: 0,
        right: -100,
        bottom: 0,
        width: 100,
        height: '100%',
    },
});

export default Progress;
