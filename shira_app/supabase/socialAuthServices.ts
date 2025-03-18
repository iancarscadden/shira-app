import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import { identifyUser, completelyResetRevenueCat } from './revenueCatClient';
import * as Crypto from 'expo-crypto';
import Purchases from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Register for the AuthSession callbacks
WebBrowser.maybeCompleteAuthSession();

// Get the redirect URL for OAuth
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'shira',
  path: 'auth/callback'
});

// iOS-specific redirect URI for Google Sign-In
const iosGoogleRedirectUri = Platform.OS === 'ios' 
  ? 'com.googleusercontent.apps.867223157980-skjjotkmfn2ott4mo75jgbt92vm3980o:/oauth2redirect'
  : redirectUri;

console.log('OAuth Redirect URI:', redirectUri);
console.log('iOS Google Redirect URI:', iosGoogleRedirectUri);

// Helper function to generate code verifier for PKCE
async function generateCodeVerifier(): Promise<string> {
  const random = Array.from(
    { length: 43 },
    () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[
      Math.floor(Math.random() * 66)
    ]
  ).join('');
  return random;
}

// Helper function to generate code challenge from verifier
async function generateCodeChallenge(verifier: string): Promise<string> {
  // Use SHA-256 to hash the verifier
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier
  );
  
  // Convert the hex digest to a base64 string
  // First, convert the hex string to a byte array
  const hexPairs = digest.match(/[\dA-F]{2}/gi) || [];
  const bytes = new Uint8Array(hexPairs.map(pair => parseInt(pair, 16)));
  
  // Use a helper function to convert to base64
  const base64 = bytesToBase64(bytes);
  
  // Make the base64 string URL safe
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper function to convert Uint8Array to base64 string
function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binString);
}

// Google Sign-In
export async function signInWithGoogle() {
  try {
    console.log('Starting Google sign-in...');
    
    // Use the iOS-specific redirect URI for Google Sign-In
    const finalRedirectUri = Platform.OS === 'ios' ? iosGoogleRedirectUri : redirectUri;
    console.log('Using redirect URI:', finalRedirectUri);
    
    // Create Google OAuth request
    console.log('Fetching Google OAuth discovery document...');
    const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
    console.log('Discovery document:', JSON.stringify(discovery));
    
    // Use the iOS client ID for iOS devices
    const clientId = Platform.select({
      ios: '867223157980-skjjotkmfn2ott4mo75jgbt92vm3980o.apps.googleusercontent.com',
      android: 'YOUR_ANDROID_GOOGLE_CLIENT_ID', // Replace with your actual Android client ID
      default: 'YOUR_WEB_GOOGLE_CLIENT_ID' // Replace with your actual Web client ID
    });
    
    if (!clientId) {
      throw new Error('No client ID available for this platform');
    }
    
    // Log the client ID being used (for debugging)
    console.log('Using Google client ID for platform:', Platform.OS);
    console.log('Client ID being used:', clientId);
    console.log('Redirect URI:', finalRedirectUri);
    
    // Create a custom request with parameters in a specific order
    // This addresses the issue where Google might be sensitive to parameter order
    const authorizationEndpoint = discovery.authorizationEndpoint;
    
    if (!authorizationEndpoint) {
      throw new Error('Authorization endpoint not found in discovery document');
    }
    
    console.log('Using authorization endpoint:', authorizationEndpoint);
    
    // Generate PKCE code verifier and challenge
    console.log('Generating PKCE code verifier and challenge...');
    const codeVerifier = await generateCodeVerifier();
    console.log('Code verifier generated (length):', codeVerifier.length);
    
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    console.log('Code challenge generated (length):', codeChallenge.length);
    
    // Store code verifier in memory for later use
    const verifierStore: Record<string, string> = {};
    const state = Math.random().toString(36).substring(2, 15);
    verifierStore[state] = codeVerifier;
    console.log('State generated for CSRF protection:', state);
    
    // Build URL with parameters in a specific order (client_id not directly after redirect_uri)
    const authUrl = new URL(authorizationEndpoint);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('scope', 'openid profile email');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state);
    // Add redirect_uri last to avoid the issue mentioned in the GitHub issue
    authUrl.searchParams.append('redirect_uri', finalRedirectUri);
    
    console.log('Custom auth URL:', authUrl.toString());
    
    // Use the custom URL with the browser
    console.log('Opening auth session with browser...');
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      finalRedirectUri
    );
    
    console.log('Auth session result type:', result.type);
    
    if (result.type === 'success') {
      const { url } = result;
      console.log('Success URL received:', url);
      
      // Extract the authorization code from the URL
      const responseUrl = new URL(url);
      const code = responseUrl.searchParams.get('code');
      const returnedState = responseUrl.searchParams.get('state');
      
      console.log('Code received:', code ? 'Yes (length: ' + code.length + ')' : 'No');
      console.log('State returned:', returnedState);
      
      if (!code) {
        throw new Error('No authorization code received from Google');
      }
      
      // Verify state to prevent CSRF attacks
      if (returnedState !== state) {
        console.error('State mismatch! Expected:', state, 'Got:', returnedState);
        throw new Error('State mismatch, possible CSRF attack');
      }
      
      console.log('State verified, exchanging code for session...');
      
      // Retrieve the code verifier using the state
      const retrievedCodeVerifier = verifierStore[returnedState];
      if (!retrievedCodeVerifier) {
        throw new Error('Code verifier not found for the given state');
      }
      console.log('Retrieved code verifier (length):', retrievedCodeVerifier.length);
      
      // Since Supabase doesn't directly support passing the code verifier,
      // we'll use the Google token endpoint directly to exchange the code for tokens
      console.log('Exchanging code for tokens with Google...');
      const tokenEndpoint = discovery.tokenEndpoint;
      if (!tokenEndpoint) {
        throw new Error('Token endpoint not found in discovery document');
      }
      
      // Prepare the token request
      const tokenRequestBody = new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: finalRedirectUri,
        code_verifier: retrievedCodeVerifier
      });
      
      // Exchange the code for tokens
      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenRequestBody.toString()
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Token exchange error:', errorData);
        throw new Error(`Token exchange failed: ${errorData.error}`);
      }
      
      const tokenData = await tokenResponse.json();
      console.log('Token exchange successful');
      
      // Now sign in with Supabase using the ID token
      if (!tokenData.id_token) {
        throw new Error('No ID token received from Google');
      }
      
      console.log('Signing in with Supabase using ID token...');
      const { data: userData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokenData.id_token,
      });
      
      if (authError) {
        console.error('Supabase Google sign-in error:', authError);
        throw authError;
      }
      
      console.log('Supabase Google sign-in successful');
      
      // Identify user with RevenueCat if we have a user
      if (userData.user) {
        try {
          // Simple, direct approach for RevenueCat identification
          console.log('Setting up RevenueCat with user ID:', userData.user.id);
          
          // First, ensure we're using a clean instance
          const apiKey = Platform.OS === 'ios' 
            ? 'appl_zRRgtqSictCpKyyscMdIjxjasqd' 
            : 'appl_zRRgtqSictCpKyyscMdIjxjasqd';
          
          // Configure RevenueCat directly with the user ID
          Purchases.configure({
            apiKey,
            appUserID: userData.user.id
          });
          
          // Verify the configuration worked
          const customerInfo = await Purchases.getCustomerInfo();
          console.log(`RevenueCat user after configuration: ${customerInfo.originalAppUserId}`);
          
          if (customerInfo.originalAppUserId !== userData.user.id) {
            console.error(`RevenueCat configuration didn't work. Expected ${userData.user.id} but got ${customerInfo.originalAppUserId}`);
            
            // Try the login approach as a fallback
            console.log('Trying login approach as fallback');
            const { customerInfo: updatedInfo } = await Purchases.logIn(userData.user.id);
            console.log(`RevenueCat user after login: ${updatedInfo.originalAppUserId}`);
            
            if (updatedInfo.originalAppUserId !== userData.user.id) {
              console.error(`RevenueCat login didn't work. Expected ${userData.user.id} but got ${updatedInfo.originalAppUserId}`);
            } else {
              console.log('RevenueCat login successful');
            }
          } else {
            console.log('RevenueCat configuration successful');
          }
          
          // Store the user ID for future reference
          await AsyncStorage.setItem('@shira_revenuecat_user_id', userData.user.id);
        } catch (rcError) {
          console.error('Error setting up RevenueCat:', rcError);
          // Continue even if RevenueCat setup fails
        }
      }
      
      return userData;
    } else if (result.type === 'cancel') {
      console.log('Google sign-in cancelled by user');
      return null;
    } else {
      console.error('Google sign-in failed with result type:', result.type);
      throw new Error('Google sign-in failed');
    }
  } catch (error) {
    console.error('Error in signInWithGoogle:', error);
    throw error;
  }
}

// Apple Sign-In (iOS only)
export async function signInWithApple() {
  try {
    console.log('Starting Apple sign-in...');
    
    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      console.log('Apple Authentication is not available on this device');
      throw new Error('Apple Authentication is not available on this device');
    }
    
    console.log('Apple Authentication is available, requesting sign-in...');
    
    // Generate a nonce for security
    const rawNonce = Math.random().toString(36).substring(2, 10);
    // Create a SHA256 hash of the nonce
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );
    
    // Request sign-in with Apple
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      
      console.log('Apple sign-in successful, got credential');
      
      // Extract user information from the credential
      const { identityToken, email, fullName, user: appleUserId } = credential;
      
      if (!identityToken) {
        console.error('No identity token received from Apple');
        throw new Error('No identity token received from Apple');
      }
      
      // Try to sign in with the ID token directly
      console.log('Signing in with Apple ID token...');
      
      try {
        // This is the most direct and reliable method for Expo apps
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: identityToken,
          nonce: rawNonce, // Use the original nonce, not the hashed one
        });
        
        if (error) {
          console.error('Error signing in with Apple ID token:', error);
          
          // If the error is related to the user not existing, try to sign up
          if (error.message?.includes('user not found')) {
            console.log('User not found, attempting to sign up...');
            
            // Create a secure password for the user
            const securePassword = `Apple-${appleUserId}-${Math.random().toString(36).substring(2, 10)}`;
            const userEmail = email || `${appleUserId}@privaterelay.appleid.com`;
            
            // Try to sign up the user
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: userEmail,
              password: securePassword,
              options: {
                data: {
                  provider: 'apple',
                  provider_id: appleUserId,
                  name: fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : undefined,
                }
              }
            });
            
            if (signUpError) {
              console.error('Error signing up with Apple:', signUpError);
              throw signUpError;
            }
            
            console.log('Successfully signed up with Apple');
            
            // Identify user with RevenueCat
            if (signUpData?.user) {
              try {
                await identifyUser(signUpData.user.id);
                console.log('User identified with RevenueCat:', signUpData.user.id);
              } catch (rcError) {
                console.error('Error identifying user with RevenueCat:', rcError);
                // Continue even if RevenueCat identification fails
              }
            }
            
            return signUpData;
          } else {
            // For other errors, just throw them
            throw error;
          }
        }
        
        // Successful sign-in with ID token
        console.log('Successfully signed in with Apple ID token');
        
        // Identify user with RevenueCat
        if (data?.user) {
          try {
            // Simple, direct approach for RevenueCat identification
            console.log('Setting up RevenueCat with user ID:', data.user.id);
            
            // First, ensure we're using a clean instance
            const apiKey = Platform.OS === 'ios' 
              ? 'appl_zRRgtqSictCpKyyscMdIjxjasqd' 
              : 'appl_zRRgtqSictCpKyyscMdIjxjasqd';
            
            // Configure RevenueCat directly with the user ID
            Purchases.configure({
              apiKey,
              appUserID: data.user.id
            });
            
            // Verify the configuration worked
            const customerInfo = await Purchases.getCustomerInfo();
            console.log(`RevenueCat user after configuration: ${customerInfo.originalAppUserId}`);
            
            if (customerInfo.originalAppUserId !== data.user.id) {
              console.error(`RevenueCat configuration didn't work. Expected ${data.user.id} but got ${customerInfo.originalAppUserId}`);
              
              // Try the login approach as a fallback
              console.log('Trying login approach as fallback');
              const { customerInfo: updatedInfo } = await Purchases.logIn(data.user.id);
              console.log(`RevenueCat user after login: ${updatedInfo.originalAppUserId}`);
              
              if (updatedInfo.originalAppUserId !== data.user.id) {
                console.error(`RevenueCat login didn't work. Expected ${data.user.id} but got ${updatedInfo.originalAppUserId}`);
              } else {
                console.log('RevenueCat login successful');
              }
            } else {
              console.log('RevenueCat configuration successful');
            }
            
            // Store the user ID for future reference
            await AsyncStorage.setItem('@shira_revenuecat_user_id', data.user.id);
          } catch (rcError) {
            console.error('Error setting up RevenueCat:', rcError);
            // Continue even if RevenueCat setup fails
          }
        }
        
        return data;
      } catch (error) {
        console.error('Error in Apple ID token sign-in:', error);
        throw error;
      }
    } catch (appleAuthError: any) {
      // Handle specific Apple Authentication errors
      if (appleAuthError.code === 'ERR_CANCELED') {
        console.log('Apple sign-in cancelled by user');
        return null;
      } else if (appleAuthError.code === 'ERR_INVALID_RESPONSE') {
        console.error('Invalid response from Apple:', appleAuthError);
        throw new Error('Invalid response received from Apple. Please try again.');
      } else if (appleAuthError.code === 'ERR_REQUEST_FAILED') {
        console.error('Apple sign-in request failed:', appleAuthError);
        throw new Error('Sign in with Apple request failed. Please check your internet connection and try again.');
      } else {
        console.error('Apple sign-in error:', appleAuthError);
        throw appleAuthError;
      }
    }
  } catch (error: any) {
    console.error('Error in signInWithApple:', error);
    throw error;
  }
}

// Function to check if Apple Sign-In is available
export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.error('Error checking Apple Sign-In availability:', error);
    return false;
  }
} 