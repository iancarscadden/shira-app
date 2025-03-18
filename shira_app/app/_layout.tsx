// app/_layout.tsx
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../supabase/supabaseClient';
import { User } from '@supabase/supabase-js';
import { updateUserStreak } from '../supabase/progressService';
import StreakDisplay from './views/StreakDisplay';
import { 
    initializeRevenueCat, 
    isRevenueCatInitialized, 
    checkSubscriptionStatus 
} from '../supabase/revenueCatClient';

// XP per level constant
const XP_PER_LEVEL = 500;

// Subscription check interval (every 30 minutes)
const SUBSCRIPTION_CHECK_INTERVAL = 30 * 60 * 1000;

const RootLayout = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [revenueCatInitialized, setRevenueCatInitialized] = useState(false);
    const [showStreakDisplay, setShowStreakDisplay] = useState(false);
    const [currentStreak, setCurrentStreak] = useState(1);
    const [currentXP, setCurrentXP] = useState(0);
    const [previousStreak, setPreviousStreak] = useState<number | null>(null);
    
    // Add a flag to prevent multiple concurrent streak updates
    const isUpdatingStreakRef = useRef(false);
    
    // Add a ref to track the last subscription check time
    const lastSubscriptionCheckRef = useRef(0);

    // Initialize RevenueCat
    useEffect(() => {
        const initRC = async () => {
            try {
                await initializeRevenueCat();
                setRevenueCatInitialized(true);
                console.log("RootLayout: RevenueCat initialized successfully");
            } catch (error) {
                console.error("RootLayout: Error initializing RevenueCat:", error);
                // Set initialized to true anyway to prevent blocking the app
                setRevenueCatInitialized(true);
            }
        };
        
        if (!isRevenueCatInitialized()) {
            initRC();
        } else {
            setRevenueCatInitialized(true);
        }
    }, []);
    
    // Periodically check subscription status
    useEffect(() => {
        // Skip if no user is logged in
        if (!user) return;
        
        const checkSubscription = async () => {
            try {
                const now = Date.now();
                // Only check if enough time has passed since the last check
                if (now - lastSubscriptionCheckRef.current > SUBSCRIPTION_CHECK_INTERVAL) {
                    console.log("RootLayout: Checking subscription status");
                    lastSubscriptionCheckRef.current = now;
                    
                    // This will automatically update the is_pro flag in Supabase if needed
                    const { isPro } = await checkSubscriptionStatus();
                    console.log(`RootLayout: Subscription status check completed. User is ${isPro ? 'PRO' : 'not PRO'}`);
                }
            } catch (error) {
                console.error("RootLayout: Error checking subscription status:", error);
            }
        };
        
        // Check immediately on login
        checkSubscription();
        
        // Set up interval for periodic checks
        const intervalId = setInterval(checkSubscription, SUBSCRIPTION_CHECK_INTERVAL);
        
        return () => clearInterval(intervalId);
    }, [user]);

    // Consolidated function to update streak with debouncing
    const updateStreak = async (userId: string) => {
        // Skip if already updating
        if (isUpdatingStreakRef.current) {
            console.log("RootLayout: Streak update already in progress, skipping");
            return;
        }
        
        isUpdatingStreakRef.current = true;
        console.log("RootLayout: Starting streak update for user:", userId);
        
        try {
            // Get current streak before update
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('current_streak, xp_level')
                .eq('id', userId)
                .single();
                
            // Handle case where profile doesn't exist yet (new user)
            if (profileError && profileError.code === 'PGRST116') {
                console.log("RootLayout: New user detected, profile not found yet");
                // Continue with streak update which will create the profile
            } else if (profileError) {
                console.error('RootLayout: Error fetching profile:', profileError);
                throw profileError;
            } else if (profileData) {
                setPreviousStreak(profileData.current_streak || 1);
                setCurrentXP(profileData.xp_level || 0);
            }
            
            // Update streak
            const updatedStreak = await updateUserStreak(userId);
            console.log("RootLayout: User streak updated:", updatedStreak);
            
            // Set current streak
            setCurrentStreak(updatedStreak);
            
            // Show streak display if streak increased
            if (profileData && updatedStreak > (profileData.current_streak || 1)) {
                console.log("RootLayout: Streak increased, showing streak display");
                setShowStreakDisplay(true);
            }
            
            return updatedStreak;
        } catch (error) {
            console.error('RootLayout: Error updating streak:', error);
            throw error;
        } finally {
            isUpdatingStreakRef.current = false;
        }
    };

    useEffect(() => {
        // Only proceed if RevenueCat is initialized
        if (!revenueCatInitialized) {
            return;
        }
        
        async function loadSession() {
            console.log("RootLayout: Loading session...");
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('RootLayout: Error getting session:', error);
                    setLoading(false);
                    return;
                }
                console.log("RootLayout: Session loaded:", session);
                
                // Set user and loading state first to prevent blocking the UI
                setUser(session?.user ?? null);
                setLoading(false);
                
                // Update streak after the app is loaded
                if (session?.user) {
                    try {
                        // Use the consolidated streak update function
                        await updateStreak(session.user.id);
                        console.log("RootLayout: Initial streak update completed successfully");
                    } catch (streakError) {
                        console.error('RootLayout: Error in initial streak update:', streakError);
                        // Continue with app loading even if streak update fails
                    }
                }
            } catch (error) {
                console.error('RootLayout: Unexpected error in loadSession:', error);
                setLoading(false);
            }
        }
        loadSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('RootLayout: Auth state changed', {
                event: _event,
                userId: session?.user?.id
            });
            
            if (session?.user) {
                setUser(session.user);
                
                // Update streak with a slight delay to avoid conflicts
                setTimeout(async () => {
                    try {
                        // Use the consolidated streak update function
                        await updateStreak(session.user.id);
                        console.log("RootLayout: Streak update after auth change completed successfully");
                    } catch (streakError) {
                        console.error('RootLayout: Error in streak update after auth change:', streakError);
                    }
                }, 1000); // 1 second delay to avoid conflict with loadSession
            } else {
                setUser(null);
            }
        });

        return () => {
            console.log("RootLayout: Unsubscribing from auth state changes");
            subscription.unsubscribe();
        };
    }, [revenueCatInitialized]); // Add revenueCatInitialized as a dependency

    if (loading || !revenueCatInitialized) {
        return (
            <SafeAreaProvider>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <Slot />
            {/* Streak Display */}
            <StreakDisplay
                visible={showStreakDisplay}
                streak={currentStreak}
                currentXP={currentXP}
                xpPerLevel={XP_PER_LEVEL}
                onAnimationComplete={() => setShowStreakDisplay(false)}
            />
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default RootLayout;

