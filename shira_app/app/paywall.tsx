import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../supabase/supabaseClient';
import useUser from '../hooks/useUser';
import { presentPaywall, presentPaywallIfNeeded, identifyUser } from '../supabase/revenueCatClient';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

// Colors
const COLORS = {
    primary: '#5a51e1', // Purple
    secondary: '#e15190', // Pink
    tertiary: '#51e1a2', // Teal
    accent: '#c4cc45', // Yellow
    background: '#181818', // Dark background
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.7)',
    border: 'rgba(255,255,255,0.1)',
};

const { width, height } = Dimensions.get('window');
const statusBarHeight = StatusBar.currentHeight || 0;
const topPadding = Platform.OS === 'ios' ? 44 : statusBarHeight;

export default function Paywall() {
    const params = useLocalSearchParams();
    const returnTo = params.returnTo as string;
    const { user, loading: userLoading, refreshUser } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    
    // Flag to prevent multiple API calls
    const isProcessingRef = useRef(false);
    // Flag to track if paywall has been shown in this session
    const hasShownPaywallRef = useRef(false);

    // Wait for user data to be loaded before showing the paywall
    useEffect(() => {
        // If user data is still loading, don't do anything yet
        if (userLoading) {
            console.log('Paywall: User data is still loading, waiting...');
            return;
        }
        
        const showPaywall = async () => {
            // Skip if we've already shown the paywall in this session or are currently processing
            if (isProcessingRef.current || hasShownPaywallRef.current) {
                console.log('Paywall: Already showing or has shown paywall this session, skipping');
                return;
            }
            
            if (!user) {
                console.log('Paywall: No user found, cannot show paywall');
                setError('You need to be logged in to make a purchase. Please log in and try again.');
                setIsLoading(false);
                return;
            }
            
            try {
                isProcessingRef.current = true;
                setIsLoading(true);
                setError(null);
                
                console.log(`Paywall: Showing paywall for user ${user.id}`);
                
                // Ensure user is properly identified with RevenueCat before proceeding
                try {
                    // Get current RevenueCat user ID
                    const customerInfo = await Purchases.getCustomerInfo();
                    const currentAppUserId = customerInfo.originalAppUserId;
                    
                    // Check if user already has Pro entitlement - if so, don't show paywall again
                    if (customerInfo.entitlements.active['Shira Pro'] !== undefined) {
                        console.log('Paywall: User already has Pro entitlement, skipping paywall');
                        
                        // Make sure the user's profile is updated to reflect Pro status
                        try {
                            await supabase
                                .from('profiles')
                                .update({ is_pro: true })
                                .eq('id', user.id);
                                
                            await refreshUser();
                        } catch (updateError) {
                            console.error('Error updating pro status:', updateError);
                        }
                        
                        // Close the paywall screen and navigate to return path
                        handleClose();
                        return;
                    }
                    
                    console.log(`Paywall: Current RevenueCat user ID: ${currentAppUserId}, Supabase user ID: ${user.id}`);
                    
                    // If the current RevenueCat user is not the same as the Supabase user,
                    // identify the user with RevenueCat
                    if (currentAppUserId !== user.id) {
                        console.log(`Paywall: RevenueCat user (${currentAppUserId}) doesn't match Supabase user (${user.id}), re-identifying`);
                        
                        // Try multiple times to identify the user
                        let identificationSuccess = false;
                        let attempts = 0;
                        const maxAttempts = 3;
                        
                        while (!identificationSuccess && attempts < maxAttempts) {
                            try {
                                attempts++;
                                console.log(`Paywall: Attempt ${attempts} to identify user with RevenueCat: ${user.id}`);
                                
                                // Wait a moment before trying to identify
                                if (attempts > 1) {
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                }
                                
                                // Identify the user with RevenueCat
                                await identifyUser(user.id);
                                
                                // Verify the identification worked
                                const verifyInfo = await Purchases.getCustomerInfo();
                                if (verifyInfo.originalAppUserId === user.id) {
                                    console.log(`Paywall: User successfully identified with RevenueCat: ${user.id}`);
                                    identificationSuccess = true;
                                } else {
                                    console.warn(`Paywall: RevenueCat identification verification failed. Expected ${user.id} but got ${verifyInfo.originalAppUserId}`);
                                }
                            } catch (idError) {
                                console.error(`Paywall: Error identifying user with RevenueCat (attempt ${attempts}):`, idError);
                                // Continue with next attempt
                            }
                        }
                        
                        if (!identificationSuccess) {
                            console.error(`Paywall: Failed to identify user with RevenueCat after ${maxAttempts} attempts`);
                            setError('There was an issue with your account. Please try logging out and back in.');
                            setIsLoading(false);
                            isProcessingRef.current = false;
                            return;
                        }
                    } else {
                        console.log(`Paywall: User already correctly identified with RevenueCat as: ${user.id}`);
                    }
                } catch (idError) {
                    console.error('Paywall: Error checking RevenueCat user ID:', idError);
                    setError('There was an issue with your account. Please try logging out and back in.');
                    setIsLoading(false);
                    isProcessingRef.current = false;
                    return;
                }
                
                // Collect debug info
                const customerInfo = await Purchases.getCustomerInfo();
                const rcUserId = customerInfo.originalAppUserId;
                
                console.log(`Paywall: RevenueCat user ID: ${rcUserId}, Supabase user ID: ${user.id}`);
                
                setDebugInfo({
                    supabaseUserId: user.id,
                    revenueCatUserId: rcUserId,
                    isAnonymous: rcUserId?.startsWith('$RCAnonymousID:') || false,
                    entitlements: customerInfo.entitlements.active
                });
                
                // Use the direct approach to present the paywall
                console.log('Paywall: Showing RevenueCat hosted paywall using direct approach');
                
                // Mark that we've shown the paywall this session
                hasShownPaywallRef.current = true;
                
                // Present the paywall directly without requiring offerings
                const paywallResult = await RevenueCatUI.presentPaywall();
                
                // Handle the result
                let success = false;
                switch (paywallResult) {
                    case PAYWALL_RESULT.PURCHASED:
                        console.log('Paywall: Purchase successful');
                        success = true;
                        break;
                    case PAYWALL_RESULT.RESTORED:
                        console.log('Paywall: Restore successful');
                        success = true;
                        break;
                    case PAYWALL_RESULT.CANCELLED:
                        console.log('Paywall: User cancelled');
                        break;
                    case PAYWALL_RESULT.ERROR:
                        console.error('Paywall: Error occurred');
                        break;
                    case PAYWALL_RESULT.NOT_PRESENTED:
                        console.log('Paywall: Not presented');
                        break;
                    default:
                        console.log('Paywall: Unknown result');
                        break;
                }
                
                if (success) {
                    // Update user's pro status in Supabase
                    const { error } = await supabase
                        .from('profiles')
                        .update({ is_pro: true })
                        .eq('id', user.id);

                    if (error) throw error;

                    // Show success alert and navigate when dismissed
                    Alert.alert(
                        'Success!',
                        'You are now a Shira Pro member!',
                        [{ 
                            text: 'OK', 
                            onPress: async () => {
                                // Navigate first
                                handleClose();
                                
                                // Then refresh user data after navigation has started
                                setTimeout(async () => {
                                    await refreshUser();
                                }, 500);
                            } 
                        }]
                    );
                } else {
                    // User cancelled or there was an error
                    console.log('Paywall: Purchase not completed');
                    handleClose();
                }
            } catch (error: any) {
                console.error('Paywall: Error showing paywall:', error);
                
                // Provide more specific error messages based on the error
                if (error.message?.includes('logged in')) {
                    setError('You need to be logged in to make a purchase. Please log in and try again.');
                } else {
                    setError(
                        'There was an issue showing the subscription options. ' +
                        'This could be due to a configuration issue or network problem. ' +
                        'Please try again later.'
                    );
                }
            } finally {
                setIsLoading(false);
                isProcessingRef.current = false;
            }
        };
        
        showPaywall();
    }, [user, userLoading]);

    const handleClose = () => {
        if (returnTo) {
            router.push(returnTo as any);
        } else {
            router.push('/(tabs)/learn');
        }
    };

    const handleRestorePurchases = async () => {
        try {
            setIsLoading(true);
            const customerInfo = await Purchases.restorePurchases();
            const isPro = customerInfo.entitlements.active['Shira Pro'] !== undefined;
            
            if (isPro) {
            // Update user's pro status in Supabase
                await supabase
                .from('profiles')
                .update({ is_pro: true })
                    .eq('id', user?.id);

            // Refresh user data
            await refreshUser();

            Alert.alert(
                    'Success!',
                    'Your purchases have been restored!',
                [{ text: 'OK', onPress: handleClose }]
            );
            } else {
                Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
            }
        } catch (error) {
            console.error('Error restoring purchases:', error);
            Alert.alert('Error', 'There was an issue restoring your purchases. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Show a loading screen while the paywall is being prepared
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />
            
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading subscription options...</Text>
                        </View>
            ) : error ? (
                <ScrollView style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Unable to Load Subscriptions</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    
                    <TouchableOpacity style={styles.button} onPress={handleRestorePurchases}>
                        <Text style={styles.buttonText}>Restore Purchases</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.button} onPress={handleClose}>
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                    
                    {__DEV__ && debugInfo && (
                        <View style={styles.debugContainer}>
                            <Text style={styles.debugTitle}>Debug Information</Text>
                            <Text style={styles.debugText}>Supabase User ID: {debugInfo.supabaseUserId}</Text>
                            <Text style={styles.debugText}>RevenueCat User ID: {debugInfo.revenueCatUserId}</Text>
                            <Text style={styles.debugText}>Is Anonymous: {debugInfo.isAnonymous ? 'Yes' : 'No'}</Text>
                            <Text style={styles.debugText}>Active Entitlements: {
                                Object.keys(debugInfo.entitlements || {}).length > 0 
                                    ? Object.keys(debugInfo.entitlements).join(', ') 
                                    : 'None'
                            }</Text>
                            
                            <TouchableOpacity
                                style={[styles.button, { marginTop: 16, backgroundColor: COLORS.secondary }]} 
                                onPress={async () => {
                                    try {
                                        setIsLoading(true);
                                        // Force re-identification with RevenueCat
                                        if (user) {
                                            console.log(`Manually re-identifying user with RevenueCat: ${user.id}`);
                                            await identifyUser(user.id);
                                            
                                            // Verify the identification worked
                                            const customerInfo = await Purchases.getCustomerInfo();
                                            console.log(`RevenueCat user after manual re-identification: ${customerInfo.originalAppUserId}`);
                                            
                                            if (customerInfo.originalAppUserId === user.id) {
                                                Alert.alert('Success', 'User successfully re-identified with RevenueCat');
                                            } else {
                                                Alert.alert('Warning', `Re-identification may have failed. Expected ${user.id} but got ${customerInfo.originalAppUserId}`);
                                            }
                                            
                                            // Refresh the page
                                            router.replace('/paywall');
                                        }
                                    } catch (error) {
                                        console.error('Error re-identifying user:', error);
                                        Alert.alert('Error', 'Failed to re-identify user with RevenueCat');
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                            >
                                <Text style={styles.buttonText}>Force Re-identify User</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, { marginTop: 16, backgroundColor: COLORS.tertiary }]} 
                                onPress={async () => {
                                    try {
                                        setIsLoading(true);
                                        // Try direct paywall presentation
                                        console.log('Testing direct paywall presentation');
                                        const result = await RevenueCatUI.presentPaywall();
                                        console.log('Direct paywall result:', result);
                                        Alert.alert('Paywall Result', `Result: ${PAYWALL_RESULT[result]}`);
                                    } catch (error) {
                                        console.error('Error presenting paywall:', error);
                                        Alert.alert('Error', 'Failed to present paywall');
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                            >
                                <Text style={styles.buttonText}>Test Direct Paywall</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, { marginTop: 16, backgroundColor: COLORS.accent }]} 
                                onPress={async () => {
                                    try {
                                        setIsLoading(true);
                                        // Try conditional paywall presentation
                                        console.log('Testing conditional paywall presentation');
                                        const result = await RevenueCatUI.presentPaywallIfNeeded({
                                            requiredEntitlementIdentifier: 'Shira Pro'
                                        });
                                        console.log('Conditional paywall result:', result);
                                        Alert.alert('Conditional Paywall Result', `Result: ${PAYWALL_RESULT[result]}`);
                                    } catch (error) {
                                        console.error('Error presenting conditional paywall:', error);
                                        Alert.alert('Error', 'Failed to present conditional paywall');
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                            >
                                <Text style={styles.buttonText}>Test Conditional Paywall</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    errorContainer: {
        flex: 1,
        padding: 20,
        width: '100%',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
    },
    button: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    debugContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    debugTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    debugText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
}); 