import { useEffect, useState, useCallback, useRef } from 'react';
import { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabaseClient';
import { Profile } from '../supabase/types';
import { updateUserStreak } from '../supabase/progressService';
import { identifyUser, resetUser, checkSubscriptionStatus, getCurrentRevenueCatUserId } from '../supabase/revenueCatClient';

// Extend the Supabase User type with our profile data
export interface User extends SupabaseUser {
    target_lang?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    current_streak?: number | null;
    daily_goal?: number | null;
    is_pro?: boolean | null;
    xp_level?: number | null;
    daily_videos_watched?: number | null;
    free_videos?: number | null;
}

// Throttle subscription status checks
const SUBSCRIPTION_CHECK_INTERVAL = 60000; // 1 minute

function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    // Add a refresh counter to trigger re-fetching
    const [refreshCounter, setRefreshCounter] = useState(0);
    
    // Use refs to avoid circular dependencies
    const userRef = useRef<User | null>(null);
    const lastSubscriptionCheckRef = useRef<number>(0);

    // Update the ref when user changes
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Function to refresh user data
    const refreshUser = useCallback(async () => {
        console.log('useUser: Manually refreshing user data');
        setLoading(true);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await handleUser(session.user);
                console.log('useUser: User data refreshed successfully');
                // Increment the refresh counter to trigger a re-fetch in the useEffect
                setRefreshCounter(prev => prev + 1);
            } else {
                console.log('useUser: No active session found during refresh');
                setLoading(false);
            }
        } catch (refreshError) {
            console.error('useUser: Error refreshing user data:', refreshError);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log('useUser: Setting up auth state listener');
        
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('useUser: Initial session check', {
                hasSession: !!session,
                userId: session?.user?.id
            });
            
            if (session?.user) {
                handleUser(session.user);
            } else {
                // Check if we need to reset RevenueCat user
                checkAndResetRevenueCatUser();
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('useUser: Auth state changed', {
                event: event,
                userId: session?.user?.id
            });
            
            if (session?.user) {
                if (event === 'SIGNED_IN') {
                    // User signed in, identify with RevenueCat
                    try {
                        await identifyUser(session.user.id);
                        console.log('useUser: User identified with RevenueCat after sign in:', session.user.id);
                    } catch (rcError) {
                        console.error('useUser: Error identifying user with RevenueCat after sign in:', rcError);
                    }
                }
                
                handleUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                // User signed out, reset RevenueCat user
                try {
                    await resetUser();
                    console.log('useUser: User logged out from RevenueCat after sign out');
                } catch (rcError) {
                    console.error('useUser: Error logging out user from RevenueCat after sign out:', rcError);
                }
                
                setUser(null);
                setLoading(false);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            console.log('useUser: Cleaning up auth listener');
            subscription.unsubscribe();
        };
    }, [refreshCounter]); // Remove user from dependencies

    // Check if we need to reset RevenueCat user
    async function checkAndResetRevenueCatUser() {
        try {
            const rcUserId = await getCurrentRevenueCatUserId();
            
            // If there's a RevenueCat user ID but no Supabase session, reset RevenueCat
            if (rcUserId && !rcUserId.startsWith('$RCAnonymousID:')) {
                console.log('useUser: Found identified RevenueCat user but no Supabase session, resetting RevenueCat user');
                await resetUser();
            }
        } catch (error) {
            console.error('useUser: Error checking RevenueCat user:', error);
        }
    }

    async function handleUser(authUser: User) {
        try {
            console.log('useUser: Fetching profile for user:', authUser.id);
            
            // Identify user with RevenueCat
            try {
                await identifyUser(authUser.id);
                console.log('useUser: User identified with RevenueCat:', authUser.id);
            } catch (rcError) {
                console.error('useUser: Error identifying user with RevenueCat:', rcError);
                // Continue with profile fetch even if RevenueCat identification fails
            }
            
            // Fetch profile data first
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) {
                console.error('useUser: Error fetching profile:', error);
                throw error;
            }

            // Set user state with profile data
            if (profile) {
                console.log('useUser: Profile fetched successfully', {
                    userId: profile.id,
                    targetLang: profile.target_lang,
                    currentStreak: profile.current_streak || 1,
                    dailyGoal: profile.daily_goal || 5,
                    isPro: profile.is_pro || false,
                    xpLevel: profile.xp_level || 0,
                    dailyVideosWatched: profile.daily_videos_watched || 0,
                    freeVideos: profile.free_videos || 0
                });
                
                const userWithProfile: User = {
                    ...authUser,
                    target_lang: profile.target_lang,
                    display_name: profile.display_name,
                    avatar_url: profile.avatar_url,
                    current_streak: profile.current_streak || 1, // Ensure minimum streak of 1
                    daily_goal: profile.daily_goal || 5, // Default to 5 if not set
                    is_pro: profile.is_pro || false, // Default to false if not set
                    xp_level: profile.xp_level || 0, // Default to 0 if not set
                    daily_videos_watched: profile.daily_videos_watched || 0, // Default to 0 if not set
                    free_videos: profile.free_videos || 0 // Default to 0 if not set
                };
                
                setUser(userWithProfile);
                
                // Throttle subscription status checks
                const now = Date.now();
                if (now - lastSubscriptionCheckRef.current > SUBSCRIPTION_CHECK_INTERVAL) {
                    lastSubscriptionCheckRef.current = now;
                    
                    // Check subscription status with RevenueCat
                    try {
                        const { isPro } = await checkSubscriptionStatus();
                        
                        // If RevenueCat says user is Pro but Supabase doesn't, update Supabase
                        if (isPro && !profile.is_pro) {
                            console.log('useUser: Updating pro status from RevenueCat');
                            await supabase
                                .from('profiles')
                                .update({ is_pro: true })
                                .eq('id', authUser.id);
                                
                            // Update local user state
                            setUser(prevUser => prevUser ? {
                                ...prevUser,
                                is_pro: true
                            } : null);
                        }
                    } catch (rcError) {
                        console.error('useUser: Error checking RevenueCat subscription status:', rcError);
                    }
                } else {
                    console.log('useUser: Skipping subscription check due to throttling');
                }
            } else {
                console.log('useUser: No profile found for user');
                setUser({
                    ...authUser,
                    current_streak: 1, // Set default streak to 1
                    daily_goal: 5, // Default daily goal
                    is_pro: false, // Default to free tier
                    xp_level: 0, // Default XP level
                    daily_videos_watched: 0, // Default daily videos watched
                    free_videos: 0 // Default free videos to 0
                });
            }
            
            // Update loading state before streak update
            setLoading(false);
            
            // Update user streak after user state is set
            try {
                console.log('useUser: Updating streak after profile fetch');
                const updatedStreak = await updateUserStreak(authUser.id);
                console.log('useUser: Updated streak:', updatedStreak);
                
                // If streak changed, update the user state with new streak
                if (profile && (profile.current_streak || 1) !== updatedStreak) {
                    setUser(prevUser => prevUser ? {
                        ...prevUser,
                        current_streak: updatedStreak
                    } : null);
                }
            } catch (streakError) {
                console.error('useUser: Error updating streak:', streakError);
            }
        } catch (error) {
            console.error('useUser: Error in handleUser:', error);
            setUser({
                ...authUser,
                current_streak: 1, // Set default streak to 1
                is_pro: false, // Default to free tier
                xp_level: 0, // Default XP level
                daily_videos_watched: 0, // Default daily videos watched
                free_videos: 0 // Default free videos to 0
            });
            setLoading(false);
        }
    }

    return { user, loading, error, refreshUser };
}

export default useUser; 