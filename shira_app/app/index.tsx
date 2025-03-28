// app/index.tsx
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../supabase/supabaseClient';

const Index = () => {
    const router = useRouter();

    useEffect(() => {
        async function checkSession() {
            console.log("Index.tsx: Checking session...");
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Index.tsx: Error getting session:', error);
                    router.replace('/onboarding');
                    return;
                }
                
                console.log("Index.tsx: Session found:", session);
                if (session?.user) {
                    router.replace('/learn'); // User is logged in
                } else {
                    router.replace('/onboarding'); // User is not logged in
                }
            } catch (err) {
                console.error('Index.tsx: Unexpected error:', err);
                router.replace('/onboarding');
            }
        }
        
        // Slightly longer delay to ensure splash screen has time to display properly
        const timeoutId = setTimeout(() => {
            checkSession();
        }, 300);
        
        return () => clearTimeout(timeoutId);
    }, [router]);

    // Return a completely transparent view with matching background
    return <View style={styles.container} />;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#181818', // Match splash background color for consistency
    }
});

export default Index;
