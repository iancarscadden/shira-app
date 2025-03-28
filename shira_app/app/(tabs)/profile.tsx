// app/(tabs)/profile.tsx
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import React, { useEffect, useState, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator,
    Linking,
    Animated,
    Image,
    ScrollView,
    Dimensions,
    StatusBar,
    Platform,
    Easing,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router as expoRouter, useFocusEffect } from 'expo-router';
import CustomButton from "../components/CustomButton";
import { supabase } from '@/supabase/supabaseClient';
import { logout, updateProfile as updateUserProfile, deleteUserAccount } from '../../supabase/services';
import useUser, { User } from '../../hooks/useUser';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { checkSubscriptionStatus } from '../../supabase/revenueCatClient';

const DISPLAY_NAME_KEY = '@display_name';
const { width } = Dimensions.get('window');

const Profile: React.FC = () => {
    const { user: currentUser, loading: userLoading, refreshUser } = useUser();
    const [user, setUser] = useState<User | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [displayName, setDisplayName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [isEditingName, setIsEditingName] = useState<boolean>(false);
    const [newDisplayName, setNewDisplayName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [refreshKey, setRefreshKey] = useState(0);

    // Add shimmer animation for skeletons
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    
    // Animate shimmer effect
    useEffect(() => {
        const animateShimmer = () => {
            Animated.loop(
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                    easing: Easing.ease
                })
            ).start();
        };
        
        if (userLoading || sessionLoading) {
            animateShimmer();
        } else {
            shimmerAnim.setValue(0);
        }
    }, [userLoading, sessionLoading]);
    
    // Create interpolated values for shimmer effect
    const shimmerTranslateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 200]
    });

    // Load user session on component mount.
    useEffect(() => {
        async function loadUser() {
            console.log("Profile.tsx: Loading user session...");
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Profile.tsx: Error getting session:', error);
            }
            console.log("Profile.tsx: Session returned:", session);
            setUser(session?.user ?? null);
            setSessionLoading(false);
        }
        loadUser();
    }, []);

    // Fallback: only redirect after session has finished loading.
    useEffect(() => {
        if (!sessionLoading && !user) {
            console.warn("Profile.tsx: No authenticated user found after session load. Redirecting to onboarding.");
            expoRouter.replace('/onboarding');
        }
    }, [user, sessionLoading, expoRouter]);

    // Use the currentUser from useUser hook to set display name and email
    useEffect(() => {
        if (currentUser) {
            console.log("Profile.tsx: Using currentUser from useUser hook:", {
                id: currentUser.id,
                display_name: currentUser.display_name,
                email: currentUser.email
            });
            
            // Set display name from the user profile
            if (currentUser.display_name) {
                console.log("Profile.tsx: Setting display name from currentUser:", currentUser.display_name);
                setDisplayName(currentUser.display_name);
            }
            
            // Set email from the user
            if (currentUser.email) {
                setEmail(currentUser.email);
            }
        }
    }, [currentUser, refreshKey]);

    // Refresh user data when the screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            console.log("Profile.tsx: Screen focused, refreshing user data");
            // Refresh user data when the screen comes into focus
            refreshUser();
            // This will cause the component to re-render and fetch fresh user data
            setRefreshKey(prev => prev + 1);
        }, [refreshUser])
    );

    const handleDisplayNameEdit = () => {
        setNewDisplayName(displayName);
        setIsEditingName(true);
    };

    const handleUpdateDisplayName = async () => {
        if (!currentUser) return;
        if (newDisplayName.trim() === displayName) {
            setIsEditingName(false);
            return;
        }

        setLoading(true);
        try {
            console.log("Profile.tsx: Updating display name from", displayName, "to", newDisplayName.trim());
            
            await updateUserProfile(
                currentUser.id,
                { display_name: newDisplayName.trim() }
            );
            console.log("Profile.tsx: Display name updated successfully");
            
            // Update local state
            setDisplayName(newDisplayName.trim());
            
            // Update AsyncStorage
            await AsyncStorage.setItem(DISPLAY_NAME_KEY, newDisplayName.trim());
            
            // Refresh user data in the useUser hook
            await refreshUser();
            console.log("Profile.tsx: User data refreshed after display name update");
            
            setIsEditingName(false);
        } catch (error) {
            console.error('Profile.tsx: Error updating display name:', error);
            Alert.alert('Error', 'Failed to update display name. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Confirm Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'OK',
                    onPress: async () => {
                        try {
                            // Log out from Supabase
                            await logout();
                            
                            // Clear AsyncStorage on logout
                            await AsyncStorage.removeItem(DISPLAY_NAME_KEY);
                            expoRouter.replace('/onboarding');
                        } catch (error) {
                            console.error('Profile.tsx: Error logging out:', error);
                            Alert.alert('Logout Error', 'There was an error logging you out.');
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const handleReportIssue = async () => {
        const url = 'https://docs.google.com/forms/d/e/1FAIpQLSe0sSvNI1pAQhgJotNGKXAtWXj3MoktQmiOtTpb1IsimYxn4A/viewform?usp=dialog';
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', "Can't open the link.");
        }
    };

    const handleContactCreators = async () => {
        const url = 'mailto:support@shiraapp.com';
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', "Can't open email client.");
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Confirm Deletion',
                            'All your data will be permanently deleted. Continue?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Yes, Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                        if (!currentUser) {
                                            Alert.alert('Error', 'You must be logged in to delete your account.');
                                            return;
                                        }
                                        
                                        setLoading(true);
                                        try {
                                            // Delete the user account and all associated data
                                            await deleteUserAccount(currentUser.id);
                                            
                                            // Clear AsyncStorage
                                            await AsyncStorage.removeItem(DISPLAY_NAME_KEY);
                                            
                                            // Show success message
                                            Alert.alert(
                                                'Account Deleted',
                                                'Your account and all associated data have been permanently deleted.',
                                                [
                                                    {
                                                        text: 'OK',
                                                        onPress: () => {
                                                            // Navigate to onboarding screen
                                                            expoRouter.replace('/onboarding');
                                                        }
                                                    }
                                                ]
                                            );
                                        } catch (error: any) {
                                            console.error('Error deleting account:', error);
                                            
                                            // Check if this is the specific error about auth record not being deleted
                                            if (error.message && error.message.includes('Auth record could not be deleted')) {
                                                // Clear AsyncStorage
                                                await AsyncStorage.removeItem(DISPLAY_NAME_KEY);
                                                
                                                // Show partial success message
                                                Alert.alert(
                                                    'Account Data Deleted',
                                                    'Your account data has been deleted and you have been signed out. However, your authentication record could not be completely removed. Please contact support for assistance.',
                                                    [
                                                        {
                                                            text: 'OK',
                                                            onPress: () => {
                                                                // Navigate to onboarding screen
                                                                expoRouter.replace('/onboarding');
                                                            }
                                                        }
                                                    ]
                                                );
                                            } else {
                                                // Show general error message
                                                Alert.alert(
                                                    'Error',
                                                    'There was an error deleting your account. Please try again later.'
                                                );
                                            }
                                        } finally {
                                            setLoading(false);
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const handleShowPaywall = async () => {
        console.log('Profile: Navigating to paywall screen');
        
        // Ensure user is logged in before navigating to paywall
        if (!currentUser) {
            Alert.alert('Error', 'You need to be logged in to access premium features.');
            return;
        }
        
        // Check with RevenueCat for the latest subscription status
        try {
            const { isPro } = await checkSubscriptionStatus();
            
            // If RevenueCat says the user is pro, update local state and don't show paywall
            if (isPro && !currentUser.is_pro) {
                console.log('Profile: RevenueCat confirms user is pro, updating local state');
                
                // Update the database
                await supabase
                    .from('profiles')
                    .update({ is_pro: true })
                    .eq('id', currentUser.id);
                
                // Refresh the user data
                await refreshUser();
                
                // Show confirmation to the user
                Alert.alert(
                    'Pro Subscription Active',
                    'Your pro subscription is active! You now have access to all premium features.',
                    [{ text: 'OK' }]
                );
                
                return;
            }
        } catch (error) {
            console.error('Profile: Error checking subscription status:', error);
            // Continue to show paywall even if check fails
        }
        
        // Use a more direct navigation approach that preserves the current tab
        expoRouter.push({
            pathname: '/paywall',
            params: {
                returnTo: '/(tabs)/profile'
            }
        });
    };

    const handleManageSubscription = async () => {
        try {
            let url = '';
            
            if (Platform.OS === 'ios') {
                // Deep link to iOS subscription management
                url = 'itms-apps://apps.apple.com/account/subscriptions';
            } else if (Platform.OS === 'android') {
                // Deep link to Google Play subscriptions
                url = 'https://play.google.com/store/account/subscriptions';
            } else {
                // Fallback for web or other platforms
                Alert.alert(
                    'Manage Subscription',
                    'Please visit the App Store or Google Play to manage your subscription.'
                );
                return;
            }
            
            const canOpen = await Linking.canOpenURL(url);
            
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                throw new Error(`Cannot open URL: ${url}`);
            }
        } catch (error) {
            console.error('Error opening subscription management:', error);
            
            // Show a helpful message if deep linking fails
            Alert.alert(
                'Cannot Open Settings',
                Platform.OS === 'ios' 
                    ? 'Please open the Settings app, tap on your Apple ID, then Subscriptions to manage your subscription.' 
                    : 'Please open the Google Play Store app, tap on your profile, then Payments & subscriptions to manage your subscription.',
                [{ text: 'OK' }]
            );
        }
    };

    // Generate avatar initials from display name
    const getInitials = () => {
        if (!displayName) return '?';
        const names = displayName.split(' ');
        if (names.length === 1) return names[0].charAt(0).toUpperCase();
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.nameSection}>
                    {isEditingName ? (
                        <View style={styles.editNameContainer}>
                            <TextInput
                                style={styles.nameInput}
                                value={newDisplayName}
                                onChangeText={setNewDisplayName}
                                placeholder="Enter display name"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                            <View style={styles.editButtonsRow}>
                                <TouchableOpacity onPress={handleUpdateDisplayName} style={styles.iconButton}>
                                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setIsEditingName(false)} style={[styles.iconButton, styles.cancelButton]}>
                                    <Ionicons name="close" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.profileHeader}>
                            <View style={styles.avatar}>
                                {userLoading ? (
                                    <Animated.View 
                                        style={[
                                            styles.shimmerContainer,
                                            { transform: [{ translateX: shimmerTranslateX }] }
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={['rgba(90, 81, 225, 0)', 'rgba(138, 114, 227, 0.25)', 'rgba(90, 81, 225, 0)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.shimmerGradient}
                                        />
                                    </Animated.View>
                                ) : (
                                    <Text style={styles.avatarText}>{getInitials()}</Text>
                                )}
                            </View>
                            
                            <View style={styles.nameContainer}>
                                <View style={styles.nameDisplayContainer}>
                                    <View style={styles.nameContentContainer}>
                                        {userLoading ? (
                                            <View style={styles.nameSkeleton}>
                                                <Animated.View 
                                                    style={[
                                                        styles.shimmerContainer,
                                                        {
                                                            transform: [{ translateX: shimmerTranslateX }]
                                                        }
                                                    ]}
                                                >
                                                    <LinearGradient
                                                        colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0)']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={styles.shimmerGradient}
                                                    />
                                                </Animated.View>
                                            </View>
                                        ) : (
                                            <Text style={styles.displayName}>
                                                {displayName ? displayName : 'Enter display name'}
                                            </Text>
                                        )}
                                    </View>
                                    <TouchableOpacity onPress={handleDisplayNameEdit} style={styles.editNameIcon}>
                                        <Ionicons name="pencil" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.emailContainer}>
                                    {userLoading ? (
                                        <View style={styles.emailSkeleton}>
                                            <Animated.View 
                                                style={[
                                                    styles.shimmerContainer,
                                                    {
                                                        transform: [{ translateX: shimmerTranslateX }]
                                                    }
                                                ]}
                                            >
                                                <LinearGradient
                                                    colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0)']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.shimmerGradient}
                                                />
                                            </Animated.View>
                                        </View>
                                    ) : (
                                        <Text style={styles.emailText}>{email}</Text>
                                    )}
                                </View>
                                
                                {/* GO PRO Button */}
                                <TouchableOpacity 
                                    style={[
                                        styles.proButton, 
                                        currentUser?.is_pro === true ? styles.proButtonActive : {}
                                    ]}
                                    onPress={currentUser?.is_pro === true ? undefined : handleShowPaywall}
                                    disabled={userLoading || currentUser?.is_pro === true}
                                >
                                    <LinearGradient
                                        colors={currentUser?.is_pro === true ? ['#51e1a2', '#5a51e1'] : ['#e15190', '#5a51e1']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.proButtonGradient}
                                    >
                                        <Text style={styles.proButtonText}>
                                            {currentUser?.is_pro === true ? 'PRO' : 'GO PRO'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.cardsContainer}>
                    {/* Account Settings Card */}
                    <BlurView intensity={20} tint="dark" style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>ACCOUNT</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}>
                                <View style={styles.settingIconContainer}>
                                    <MaterialIcons name="notifications-none" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.settingTextContainer}>
                                    <Text style={styles.settingTitle}>Notifications</Text>
                                    <Text style={styles.settingDescription}>Manage your notification preferences</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            
                            <View style={styles.settingDivider} />
                            
                            <TouchableOpacity style={styles.settingItem} onPress={handleManageSubscription}>
                                <View style={[styles.settingIconContainer, { backgroundColor: '#5a51e1' }]}>
                                    <MaterialIcons name="subscriptions" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.settingTextContainer}>
                                    <Text style={styles.settingTitle}>Manage Subscription</Text>
                                    <Text style={styles.settingDescription}>View or cancel your subscription</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </BlurView>

                    {/* Support Card */}
                    <BlurView intensity={20} tint="dark" style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>SUPPORT</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <TouchableOpacity style={styles.settingItem} onPress={handleContactCreators}>
                                <View style={[styles.settingIconContainer, { backgroundColor: '#51e1a2' }]}>
                                    <MaterialIcons name="email" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.settingTextContainer}>
                                    <Text style={styles.settingTitle}>Contact Creators</Text>
                                    <Text style={styles.settingDescription}>Get in touch with our team</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            
                            <View style={styles.settingDivider} />
                            
                            <TouchableOpacity style={styles.settingItem} onPress={handleReportIssue}>
                                <View style={[styles.settingIconContainer, { backgroundColor: '#e15190' }]}>
                                    <MaterialIcons name="bug-report" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.settingTextContainer}>
                                    <Text style={styles.settingTitle}>Report an Issue</Text>
                                    <Text style={styles.settingDescription}>Help us improve the app</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </BlurView>

                    {/* Danger Zone Card */}
                    <BlurView intensity={20} tint="dark" style={[styles.card, styles.dangerCard]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, styles.dangerTitle]}>DANGER ZONE</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
                                <View style={[styles.settingIconContainer, { backgroundColor: '#c4cc45' }]}>
                                    <MaterialIcons name="logout" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.settingTextContainer}>
                                    <Text style={styles.settingTitle}>Logout</Text>
                                    <Text style={styles.settingDescription}>Sign out of your account</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            
                            <View style={styles.settingDivider} />
                            
                            <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
                                <View style={[styles.settingIconContainer, { backgroundColor: '#ff4444' }]}>
                                    <MaterialCommunityIcons name="delete-forever" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.settingTextContainer}>
                                    <Text style={[styles.settingTitle, styles.dangerText]}>Delete Account</Text>
                                    <Text style={styles.settingDescription}>Permanently delete your account and data</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Shira v1.0.1</Text>
                </View>
            </ScrollView>

            {/* Loading Indicator for operations */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#5A51E1" />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#181818',
    },
    scrollView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 40,
    },
    nameSection: {
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#5A51E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        overflow: 'hidden',
    },
    shimmerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    shimmerGradient: {
        position: 'absolute',
        top: 0,
        right: -80,
        bottom: 0,
        width: 80,
        height: '100%',
    },
    nameContainer: {
        flex: 1,
    },
    nameDisplayContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        marginBottom: 5,
    },
    nameContentContainer: {
        flex: 1,
        height: 28,  // Match exact height of the displayName text
        justifyContent: 'center',
        paddingRight: 10, // Add padding to avoid touching the pencil icon
    },
    emailContainer: {
        width: '90%', // Constrain width to prevent excessive stretching
        maxWidth: 250, // Set a max width
        height: 16,  // Match exact height of the email text
        marginBottom: 10,
        justifyContent: 'center',
    },
    nameSkeleton: {
        height: 24,  // Match the font size of displayName
        width: 180,  // Fixed width value
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    emailSkeleton: {
        height: 14,  // Match the font size of emailText
        width: 140,  // Fixed width value
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    displayName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        flex: 1,
        paddingRight: 40, // Space for edit icon
    },
    editNameIcon: {
        position: 'absolute',
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 20,
    },
    emailText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },
    editNameContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    nameInput: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 8,
        fontSize: 18,
        paddingVertical: 10,
        paddingHorizontal: 15,
        width: '100%',
        textAlign: 'center',
        color: '#FFFFFF',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 10,
    },
    editButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
    },
    iconButton: {
        backgroundColor: 'rgba(90, 81, 225, 0.8)',
        padding: 10,
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 68, 68, 0.8)',
    },
    cardsContainer: {
        paddingHorizontal: 20,
        gap: 20,
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    dangerCard: {
        borderColor: 'rgba(255,68,68,0.3)',
    },
    cardHeader: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    dangerTitle: {
        color: '#ff4444',
    },
    cardContent: {
        padding: 10,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    settingIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#5a51e1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
    settingDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 5,
        marginHorizontal: 10,
    },
    dangerText: {
        color: '#ff4444',
    },
    footer: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    versionText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
    },
    proButton: {
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    proButtonActive: {
        opacity: 0.8,
    },
    proButtonGradient: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    proButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(24, 24, 24, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
});
export default Profile;

