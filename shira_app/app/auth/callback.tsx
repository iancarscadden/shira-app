import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../supabase/supabaseClient';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

// Make sure to close the authentication session
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    async function handleAuth() {
      try {
        console.log('Auth callback screen loaded');
        
        // Get the URL that opened the app
        const url = await Linking.getInitialURL();
        console.log('Initial URL:', url);
        
        if (url) {
          // Extract the code from the URL
          const parsedUrl = new URL(url);
          const code = parsedUrl.searchParams.get('code');
          
          if (code) {
            console.log('Code found in URL, exchanging for session...');
            
            try {
              // Exchange the code for a session
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              
              if (error) {
                console.error('Error exchanging code for session:', error);
                router.replace('/login');
                return;
              }
              
              if (data.session) {
                console.log('Session obtained:', data.session.user.id);
                
                // Check if the user has a profile
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', data.session.user.id)
                  .single();
                  
                if (profileError || !profile) {
                  // User doesn't have a profile, redirect to onboarding
                  console.log('User needs to complete onboarding');
                  router.replace('/onboarding');
                } else {
                  // User has a profile, redirect to main app
                  console.log('User has a profile, redirecting to main app');
                  router.replace('/learn');
                }
              } else {
                console.log('No session found after code exchange, redirecting to login');
                router.replace('/login');
              }
            } catch (sessionError) {
              console.error('Error exchanging code for session:', sessionError);
              router.replace('/login');
            }
          } else {
            // No code found, try to get the session directly
            console.log('No code found in URL, trying to get session directly...');
            
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Error getting session:', error);
              router.replace('/login');
              return;
            }
            
            if (data.session) {
              console.log('Session found:', data.session.user.id);
              
              // Check if the user has a profile
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.session.user.id)
                .single();
                
              if (profileError || !profile) {
                // User doesn't have a profile, redirect to onboarding
                console.log('User needs to complete onboarding');
                router.replace('/onboarding');
              } else {
                // User has a profile, redirect to main app
                console.log('User has a profile, redirecting to main app');
                router.replace('/learn');
              }
            } else {
              console.log('No session found, redirecting to login');
              router.replace('/login');
            }
          }
        } else {
          // No URL found
          console.error('No URL found, redirecting to login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error handling authentication:', error);
        router.replace('/login');
      }
    }

    handleAuth();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#5a51e1" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#FFFFFF',
  },
}); 