import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from './database.types';
import * as Linking from 'expo-linking';

const SUPABASE_URL = "https://friwhmjhptjucqwdsqei.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaXdobWpocHRqdWNxd2RzcWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2Mzg0MjIsImV4cCI6MjA1NDIxNDQyMn0.lhQl_6hpiRfBT24xh5g0GOFwdQpeEXpIW4wZZmFjr3s";

// Get the URL for deep linking
const redirectUrl = Linking.createURL('auth/callback');
console.log('Supabase redirect URL:', redirectUrl);

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        storage: AsyncStorage,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Set to false for mobile
        flowType: 'implicit', // Use implicit flow for mobile
    },
}); 