import { supabase } from './supabaseClient';
import { ContentRow, LessonContent } from './types';
import { User, AuthSession } from '@supabase/supabase-js';
import { identifyUser, resetUser } from './revenueCatClient';
import Purchases from 'react-native-purchases';

// Auth Services
export async function registerWithEmail(email: string, password: string): Promise<{
    user: User | null;
    session: AuthSession | null;
}> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    // Identify user with RevenueCat if registration was successful
    if (data.user) {
        try {
            await identifyUser(data.user.id);
            console.log('services: New user identified with RevenueCat:', data.user.id);
        } catch (rcError) {
            console.error('services: Error identifying new user with RevenueCat:', rcError);
            // Continue with registration even if RevenueCat identification fails
        }
    }
    
    return { user: data.user, session: data.session };
}

export async function loginWithEmail(email: string, password: string): Promise<{
    user: User | null;
    session: AuthSession | null;
}> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    console.log('Logged in user:', data.user);
    
    // Identify user with RevenueCat if login was successful
    if (data.user) {
        // Try multiple times to identify the user with RevenueCat
        let identificationSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!identificationSuccess && attempts < maxAttempts) {
            try {
                attempts++;
                console.log(`services: Attempt ${attempts} to identify user with RevenueCat: ${data.user.id}`);
                
                // Wait a moment before trying to identify
                if (attempts > 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                // Identify the user with RevenueCat
                await identifyUser(data.user.id);
                
                // Verify the identification worked
                const customerInfo = await Purchases.getCustomerInfo();
                if (customerInfo.originalAppUserId === data.user.id) {
                    console.log(`services: User successfully identified with RevenueCat: ${data.user.id}`);
                    identificationSuccess = true;
                } else {
                    console.warn(`services: RevenueCat identification verification failed. Expected ${data.user.id} but got ${customerInfo.originalAppUserId}`);
                }
            } catch (rcError) {
                console.error(`services: Error identifying user with RevenueCat (attempt ${attempts}):`, rcError);
                // Continue with next attempt
            }
        }
        
        if (!identificationSuccess) {
            console.error(`services: Failed to identify user with RevenueCat after ${maxAttempts} attempts`);
            // Continue with login even if RevenueCat identification fails
        }
    }
    
    return { user: data.user, session: data.session };
}

export async function logout(): Promise<void> {
    try {
        // Reset RevenueCat user before Supabase logout
        await resetUser();
        console.log('services: User logged out from RevenueCat');
    } catch (rcError) {
        console.error('services: Error logging out user from RevenueCat:', rcError);
        // Continue with Supabase logout even if RevenueCat logout fails
    }
    
    // Proceed with Supabase logout
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    console.log('services: User logged out from Supabase');
}

// Content Services
export async function fetchLessonByIndex(index: number, language: string = 'Spanish'): Promise<ContentRow | null> {
    try {
        const { data, error } = await supabase
            .from('content')
            .select('id, language, data, created_at')
            .eq('language', language)
            .order('created_at', { ascending: true })
            .range(index, index)
            .single();

        if (error) throw error;
        return data as ContentRow;
    } catch (error) {
        console.error('Error fetching lesson:', error);
        return null;
    }
}

// ... other content services

// Storage Services
export async function uploadFile(bucket: string, path: string, file: File | Blob) {
    try {
        const { data, error } = await supabase
            .storage
            .from(bucket)
            .upload(path, file, { upsert: true });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// Profile Services
export async function updateProfile(
    userId: string,
    updates: {
        display_name?: string;
        avatar_url?: string;
        target_lang?: string;
        daily_goal?: number;
    }
): Promise<void> {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

// Add a function to create a new profile
export async function createProfile(
    userId: string,
    profileData: {
        display_name?: string;
        avatar_url?: string;
        target_lang: string;
        daily_goal: number;
    }
): Promise<void> {
    try {
        const { error } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                display_name: profileData.display_name || null,
                avatar_url: profileData.avatar_url || null,
                target_lang: profileData.target_lang,
                daily_goal: profileData.daily_goal,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                current_streak: 1, // Initialize streak to 1
                xp_level: 0, // Initialize XP level to 0
                daily_videos_watched: 0, // Initialize daily videos watched to 0
                free_videos: 0, // Initialize free videos to 0
                is_pro: false, // Initialize is_pro to false
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error creating profile:', error);
        throw error;
    }
}

// Add a function to increment the free_videos counter
export async function incrementFreeVideos(userId: string): Promise<number> {
    try {
        // First get the current free_videos count
        const { data, error } = await supabase
            .from('profiles')
            .select('free_videos, is_pro')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching free videos count:', error);
            return 0;
        }
        
        // If user is pro, no need to increment
        if (data.is_pro) {
            console.log('User is pro, not incrementing free videos count');
            return 0;
        }
        
        // Calculate the new count
        const currentCount = data.free_videos || 0;
        const newCount = currentCount + 1;
        
        console.log(`Incrementing free videos from ${currentCount} to ${newCount}`);
        
        // Update the count
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                free_videos: newCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
        if (updateError) {
            console.error('Error updating free videos count:', updateError);
            return currentCount;
        }
        
        return newCount;
    } catch (error) {
        console.error('Error in incrementFreeVideos:', error);
        return 0;
    }
}

// Add a function to check if the user has free videos available
export async function checkFreeVideosAvailable(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('free_videos, is_pro')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error checking free videos availability:', error);
            return false;
        }
        
        // If user is pro, they have unlimited access
        if (data.is_pro) {
            return true;
        }
        
        // Check if user has free videos available
        return (data.free_videos || 0) < 3;
    } catch (error) {
        console.error('Error in checkFreeVideosAvailable:', error);
        return false;
    }
}

// Add this function to check if there are more lessons
export async function hasMoreLessons(currentId: number, language: string = 'Spanish'): Promise<boolean> {
    try {
        const { count, error } = await supabase
            .from('content')
            .select('*', { count: 'exact', head: true })
            .eq('language', language)
            .gt('id', currentId);

        if (error) throw error;
        return (count ?? 0) > 0;
    } catch (error) {
        console.error('Error checking for more lessons:', error);
        return false;
    }
}

// Add this function to delete a user's account and all associated data
export async function deleteUserAccount(userId: string): Promise<void> {
    try {
        // Step 1: Delete user's entries in mastered_phrases
        const { error: masteredPhrasesError } = await supabase
            .from('mastered_phrases')
            .delete()
            .eq('user_id', userId);
            
        if (masteredPhrasesError) {
            console.error('Error deleting mastered phrases:', masteredPhrasesError);
            throw masteredPhrasesError;
        }
        
        // Step 2: Delete user's entries in user_phrases
        const { error: userPhrasesError } = await supabase
            .from('user_phrases')
            .delete()
            .eq('user_id', userId);
            
        if (userPhrasesError) {
            console.error('Error deleting user phrases:', userPhrasesError);
            throw userPhrasesError;
        }
        
        // Step 3: Delete user's profile
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
            
        if (profileError) {
            console.error('Error deleting profile:', profileError);
            throw profileError;
        }
        
        // Step 4: Call the Edge Function to delete the user's auth record
        // Note: This requires the Edge Function to be deployed to Supabase
        try {
            const { error: functionError } = await supabase.functions.invoke('delete-user', {
                body: { userId }
            });
            
            if (functionError) {
                console.error('Error calling delete-user function:', functionError);
                // If the Edge Function fails, we'll still sign out the user
                // but we'll throw the error so the UI can show an appropriate message
                const { error: signOutError } = await supabase.auth.signOut();
                if (signOutError) {
                    console.error('Error signing out user:', signOutError);
                }
                throw functionError;
            }
            
            console.log('User account and all associated data deleted successfully');
        } catch (functionError) {
            console.error('Error with Edge Function, falling back to sign out:', functionError);
            // If the Edge Function is not available or fails, fall back to signing out
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) {
                console.error('Error signing out user:', signOutError);
                throw signOutError;
            }
            console.log('User data deleted successfully and user signed out');
            // We'll throw the original error to indicate that the auth record wasn't deleted
            throw new Error('Auth record could not be deleted. User has been signed out and data has been deleted.');
        }
    } catch (error) {
        console.error('Error deleting user account:', error);
        throw error;
    }
} 