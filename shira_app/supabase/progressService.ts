import { supabase } from './supabaseClient';
import { Database } from './database.types';

export type UserPhrase = {
    id?: number;
    user_id: string;
    phrase_prompt: string;
    phrase_prompt_translation: string;
    target_phrase: string;
    target_phrase_translation: string;
    status: 'need_to_work_on' | 'mastered';
    created_at?: string;
    updated_at?: string;
};

export type MasteredPhrase = {
    id?: number;
    user_id: string;
    phrase_prompt: string;
    phrase_prompt_translation: string;
    target_phrase: string;
    target_phrase_translation: string;
    mastered_at?: string;
    updated_at?: string;
};

/**
 * Checks if a phrase is already in the user_phrases table
 */
export async function checkPhraseExists(userId: string, targetPhrase: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_phrases')
        .select('id')
        .eq('user_id', userId)
        .eq('target_phrase', targetPhrase)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('Error checking if phrase exists:', error);
    }
    
    return !!data;
}

/**
 * Checks if a phrase is already in the mastered_phrases table
 */
export async function checkPhraseMastered(userId: string, targetPhrase: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('mastered_phrases')
        .select('id')
        .eq('user_id', userId)
        .eq('target_phrase', targetPhrase)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('Error checking if phrase is mastered:', error);
    }
    
    return !!data;
}

/**
 * Adds a phrase to the user_phrases table if it doesn't already exist
 */
export async function addPhraseToWorkOn(phrase: Omit<UserPhrase, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    // First check if the phrase is already mastered
    const isMastered = await checkPhraseMastered(phrase.user_id, phrase.target_phrase);
    if (isMastered) {
        console.log('Phrase is already mastered, not adding to work on list');
        return false;
    }
    
    // Then check if it's already in the work on list
    const exists = await checkPhraseExists(phrase.user_id, phrase.target_phrase);
    if (exists) {
        console.log('Phrase already exists in work on list');
        return false;
    }
    
    // Add the phrase to the work on list
    const { error } = await supabase
        .from('user_phrases')
        .insert(phrase);
    
    if (error) {
        console.error('Error adding phrase to work on:', error);
        return false;
    }
    
    return true;
}

/**
 * Moves a phrase from user_phrases to mastered_phrases
 */
export async function markPhraseMastered(
    userId: string, 
    targetPhrase: string
): Promise<boolean> {
    // Get the phrase details from user_phrases
    const { data, error } = await supabase
        .from('user_phrases')
        .select('*')
        .eq('user_id', userId)
        .eq('target_phrase', targetPhrase)
        .single();
    
    if (error) {
        console.error('Error getting phrase details:', error);
        return false;
    }
    
    if (!data) {
        console.log('Phrase not found in work on list');
        return false;
    }
    
    // Create the mastered phrase record
    const masteredPhrase: Omit<MasteredPhrase, 'id' | 'updated_at'> = {
        user_id: userId,
        phrase_prompt: data.phrase_prompt,
        phrase_prompt_translation: data.phrase_prompt_translation,
        target_phrase: data.target_phrase,
        target_phrase_translation: data.target_phrase_translation,
        mastered_at: new Date().toISOString()
    };
    
    // Insert into mastered_phrases
    const { error: insertError } = await supabase
        .from('mastered_phrases')
        .insert(masteredPhrase);
    
    if (insertError) {
        console.error('Error adding to mastered phrases:', insertError);
        return false;
    }
    
    // Delete from user_phrases
    const { error: deleteError } = await supabase
        .from('user_phrases')
        .delete()
        .eq('id', data.id);
    
    if (deleteError) {
        console.error('Error removing from user phrases:', deleteError);
        return false;
    }
    
    return true;
}

/**
 * Gets all phrases that a user needs to work on
 */
export async function getUserPhrasesToWorkOn(userId: string): Promise<UserPhrase[]> {
    const { data, error } = await supabase
        .from('user_phrases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error getting phrases to work on:', error);
        return [];
    }
    
    return data || [];
}

/**
 * Gets all phrases that a user has mastered
 */
export async function getUserMasteredPhrases(userId: string): Promise<MasteredPhrase[]> {
    const { data, error } = await supabase
        .from('mastered_phrases')
        .select('*')
        .eq('user_id', userId)
        .order('mastered_at', { ascending: false });
    
    if (error) {
        console.error('Error getting mastered phrases:', error);
        return [];
    }
    
    return data || [];
}

/**
 * Updates the user's streak based on their last active date
 * - If user was active today: Do nothing
 * - If user was active yesterday: Increment streak
 * - If user was not active yesterday: Reset streak to 1
 */
export async function updateUserStreak(userId: string): Promise<number> {
    try {
        // Get the user's current streak and last active date
        const { data, error } = await supabase
            .from('profiles')
            .select('current_streak, last_active_at, daily_videos_watched')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching user streak data:', error);
            return 1; // Return 1 as the minimum streak value
        }
        
        // Initialize streak value with minimum of 1
        let currentStreak = data.current_streak || 1;
        
        // If last_active_at is null or undefined, this is the first time
        if (!data.last_active_at) {
            console.log('First time user or last_active_at is null, setting streak to 1');
            
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    current_streak: 1,
                    last_active_at: new Date().toISOString(),
                    daily_videos_watched: 0 // Reset daily videos watched for new users
                })
                .eq('id', userId);
                
            if (updateError) {
                console.error('Error updating initial streak:', updateError);
                return currentStreak;
            }
            
            return 1;
        }
        
        // Get dates in YYYY-MM-DD format to ignore time and timezone issues
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const lastActiveDate = new Date(data.last_active_at);
        const lastActiveDateStr = lastActiveDate.toISOString().split('T')[0];
        
        console.log('Today:', todayStr, 'Last active:', lastActiveDateStr, 'Current streak:', currentStreak);
        
        // If already active today, do nothing and return current streak
        if (todayStr === lastActiveDateStr) {
            console.log('User already active today, keeping streak at:', currentStreak);
            return currentStreak;
        }
        
        // Calculate yesterday's date
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        let newStreak = currentStreak;
        
        // If active yesterday, increment streak
        if (lastActiveDateStr === yesterdayStr) {
            newStreak = currentStreak + 1;
            console.log('User was active yesterday, incrementing streak to:', newStreak);
        } else {
            // If not active yesterday, reset streak to 1
            newStreak = 1;
            console.log('User was not active yesterday, resetting streak to 1');
        }
        
        // Since it's a new day (today != lastActiveDate), reset daily_videos_watched
        console.log('New day detected, resetting daily videos watched counter to 0');
        
        // Update the streak, last active date, and reset daily videos watched
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                current_streak: newStreak,
                last_active_at: new Date().toISOString(),
                daily_videos_watched: 0 // Reset daily videos watched for the new day
            })
            .eq('id', userId);
            
        if (updateError) {
            console.error('Error updating streak and resetting daily videos watched:', updateError);
            return currentStreak;
        }
        
        return newStreak;
    } catch (error) {
        console.error('Error in updateUserStreak:', error);
        return 1; // Return 1 as the minimum streak value
    }
}

/**
 * Increments the user's XP level by the specified amount
 * @param userId The user's ID
 * @param amount The amount to increment the XP by (default: 100)
 * @returns The new XP level
 * 
 * Note: Each correct answer in ContextView awards 100 XP.
 * Users level up every 500 XP (e.g., Level 0: 0-499 XP, Level 1: 500-999 XP, etc.)
 */
export async function incrementXP(userId: string, amount: number = 100): Promise<number> {
    try {
        // First get the current XP level
        const { data, error } = await supabase
            .from('profiles')
            .select('xp_level')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching user XP level:', error);
            return 0;
        }
        
        // Calculate the new XP level
        const currentXP = data.xp_level || 0;
        const newXP = currentXP + amount;
        
        // Update the XP level
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                xp_level: newXP,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
        if (updateError) {
            console.error('Error updating XP level:', updateError);
            return currentXP;
        }
        
        return newXP;
    } catch (error) {
        console.error('Error in incrementXP:', error);
        return 0;
    }
}

/**
 * Increments the user's daily videos watched counter
 * @param userId The user's ID
 * @returns The new daily videos watched count
 */
export async function incrementDailyVideosWatched(userId: string): Promise<number> {
    try {
        // First check if we need to reset the counter for a new day
        // This will call updateUserStreak if it's a new day
        const wasReset = await checkAndResetDailyVideosCounter(userId);
        
        // Get the current count (which will be 0 if it was just reset)
        const { data, error } = await supabase
            .from('profiles')
            .select('daily_videos_watched')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching daily videos watched:', error);
            return 0;
        }
        
        // Calculate the new count
        const currentCount = data.daily_videos_watched || 0;
        const newCount = currentCount + 1;
        
        console.log(`Incrementing daily videos watched from ${currentCount} to ${newCount}${wasReset ? ' (after day reset)' : ''}`);
        
        // Update the count
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                daily_videos_watched: newCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
        if (updateError) {
            console.error('Error updating daily videos watched:', updateError);
            return currentCount;
        }
        
        return newCount;
    } catch (error) {
        console.error('Error in incrementDailyVideosWatched:', error);
        return 0;
    }
}

/**
 * Checks if the daily videos counter needs to be reset for a new day
 * This function now leverages updateUserStreak which already handles day changes
 * @param userId The user's ID
 * @returns True if the counter was reset, false otherwise
 */
export async function checkAndResetDailyVideosCounter(userId: string): Promise<boolean> {
    try {
        // Get the user's last active date
        const { data, error } = await supabase
            .from('profiles')
            .select('last_active_at')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching user last active date:', error);
            return false;
        }
        
        // If last_active_at is null, no need to reset
        if (!data.last_active_at) {
            return false;
        }
        
        // Get dates in YYYY-MM-DD format to ignore time and timezone issues
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const lastActiveDate = new Date(data.last_active_at);
        const lastActiveDateStr = lastActiveDate.toISOString().split('T')[0];
        
        // If the last active date is not today, we need to update the streak
        // which will also reset the daily videos watched counter
        if (todayStr !== lastActiveDateStr) {
            // Call updateUserStreak which will handle resetting daily_videos_watched
            await updateUserStreak(userId);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error in checkAndResetDailyVideosCounter:', error);
        return false;
    }
}

