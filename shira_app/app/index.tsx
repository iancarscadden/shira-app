// app/index.tsx
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../supabase/supabaseClient';

const Index = () => {
    const router = useRouter();

    useEffect(() => {
        async function checkSession() {
            console.log("Index.tsx: Checking session...");
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Index.tsx: Error getting session:', error);
            }
            console.log("Index.tsx: Session found:", session);
            if (session?.user) {
                router.replace('/learn'); // User is logged in
            } else {
                router.replace('/onboarding'); // User is not logged in
            }
        }
        checkSession();
    }, [router]);

    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Index;
