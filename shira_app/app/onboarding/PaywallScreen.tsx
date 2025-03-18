import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    SafeAreaView,
    Platform,
    StatusBar,
    BackHandler,
    ImageBackground,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../supabase/supabaseClient';
import useUser from '../../hooks/useUser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Colors
const COLORS = {
    primary: '#5a51e1', // Purple
    secondary: '#e15190', // Pink
    tertiary: '#51e1a2', // Teal
    accent: '#c4cc45', // Yellow
    background: '#181818', // Dark background
    cardBg: 'rgba(30, 30, 30, 0.8)', // Card background
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
};

const { width, height } = Dimensions.get('window');
const statusBarHeight = StatusBar.currentHeight || 0;
const topPadding = Platform.OS === 'ios' ? 44 : statusBarHeight;

type PaywallScreenProps = {
    onClose?: () => void;
    onContinue?: () => void;
};

const PaywallScreen = ({ onClose, onContinue }: PaywallScreenProps) => {
    const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(30));
    const { user } = useUser();
    const params = useLocalSearchParams();
    const returnTo = params.returnTo as string;
    const insets = useSafeAreaInsets();

    // Animation on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Handle Android back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleClose();
            return true;
        });
        
        return () => backHandler.remove();
    }, []);

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            // If returnTo parameter is provided, navigate back to that tab
            if (returnTo === 'profile') {
                // Use replace instead of navigate to avoid adding to the navigation stack
                router.replace('/(tabs)/profile');
            } else {
                router.back();
            }
        }
    };

    const handleContinue = async () => {
        // In a real app, this would handle payment processing
        // For now, we'll just update the user's pro status
        if (user?.id) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .update({ is_pro: true })
                    .eq('id', user.id)
                    .select()
                    .single();
                    
                if (error) {
                    console.error('Error updating pro status:', error);
                }
            } catch (error) {
                console.error('Exception updating pro status:', error);
            }
        }
        
        if (onContinue) {
            onContinue();
        } else {
            // If returnTo parameter is provided, navigate back to that tab
            if (returnTo === 'profile') {
                // Use replace instead of navigate to avoid adding to the navigation stack
                router.replace('/(tabs)/profile');
            } else {
                router.back();
            }
        }
    };

    // Calculate savings
    const weeklyPrice = 4.99;
    const monthlyPrice = 12.99;
    const yearlyPrice = 99;
    const yearlyMonthlyEquivalent = (yearlyPrice / 12).toFixed(2);
    const savingsPercentage = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

    return (
        <View style={styles.imageContainer}>
            <ImageBackground 
                source={require('../../assets/images/paywall_image_3.jpg')} 
                style={styles.container}
                imageStyle={{
                    width: '100%',
                    height: '90%',
                    position: 'absolute',
                    top: 0,
                    resizeMode: 'contain',
                    transform: [{ translateY: -150 }] // Shift the image up by 150 pixels
                }}
            >
                <StatusBar barStyle="light-content" />
                
                {/* Close button positioned below safe area */}
                <TouchableOpacity 
                    style={[styles.closeButton, { top: insets.top + 10 }]} 
                    onPress={handleClose}
                    activeOpacity={0.7}
                >
                    <BlurView intensity={30} tint="dark" style={styles.blurView}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </BlurView>
                </TouchableOpacity>
                
                {/* Gradient overlay that fades the image to background color */}
                <LinearGradient
                    colors={['rgba(24, 24, 24, 0)', 'rgba(24, 24, 24, 0.7)', COLORS.background]}
                    locations={[0.1, 0.35, 0.55]}
                    style={styles.gradientOverlay}
                />
                
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.contentContainer}>
                        {/* Empty space to push content down */}
                        <View style={styles.spacer} />
                        
                        {/* Header section with title - positioned lower */}
                        <Animated.View
                            style={[
                                styles.headerContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                },
                            ]}
                        >
                            <Text style={styles.title}>Unlock Shira Pro</Text>
                            <Text style={styles.subtitle}>
                                Immerse yourself in language and culture
                            </Text>
                        </Animated.View>
                        
                        {/* Features section in one blurred box */}
                        <Animated.View
                            style={[
                                styles.featuresContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                },
                            ]}
                        >
                            <BlurView intensity={30} tint="dark" style={styles.featuresBlurContainer}>
                                <View style={styles.featureRow}>
                                    <Ionicons name="checkmark" size={24} color="rgba(130, 120, 240, 0.9)" style={styles.checkmark} />
                                    <Text style={styles.featureText}>Unlimited video lessons</Text>
                                </View>
                                
                                <View style={styles.featureRow}>
                                    <Ionicons name="checkmark" size={24} color="rgba(130, 120, 240, 0.9)" style={styles.checkmark} />
                                    <Text style={styles.featureText}>AI pronunciation feedback</Text>
                                </View>
                                
                                <View style={styles.featureRow}>
                                    <Ionicons name="checkmark" size={24} color="rgba(130, 120, 240, 0.9)" style={styles.checkmark} />
                                    <Text style={styles.featureText}>Cultural insights & context</Text>
                                </View>
                                
                                <View style={styles.featureRow}>
                                    <Ionicons name="checkmark" size={24} color="rgba(130, 120, 240, 0.9)" style={styles.checkmark} />
                                    <Text style={styles.featureText}>Interactive practice exercises</Text>
                                </View>
                            </BlurView>
                        </Animated.View>
                        
                        {/* Pricing options with vertical stacking */}
                        <Animated.View
                            style={[
                                styles.pricingContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.pricingOption,
                                    selectedPlan === 'weekly' && styles.selectedPricingOption,
                                ]}
                                onPress={() => setSelectedPlan('weekly')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.pricingContent}>
                                    <View style={styles.pricingTitleContainer}>
                                        <Text style={styles.pricingTitle}>Weekly</Text>
                                    </View>
                                    <View style={styles.pricingPriceContainer}>
                                        <Text style={styles.pricingPrice}>
                                            ${weeklyPrice}
                                            <Text style={styles.pricingPeriod}>/week</Text>
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[
                                    styles.pricingOption,
                                    selectedPlan === 'monthly' && styles.selectedPricingOption,
                                ]}
                                onPress={() => setSelectedPlan('monthly')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.pricingContent}>
                                    <View style={styles.pricingTitleContainer}>
                                        <Text style={styles.pricingTitle}>Monthly</Text>
                                    </View>
                                    <View style={styles.pricingPriceContainer}>
                                        <Text style={styles.pricingPrice}>
                                            ${monthlyPrice}
                                            <Text style={styles.pricingPeriod}>/month</Text>
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[
                                    styles.pricingOption,
                                    selectedPlan === 'yearly' && styles.selectedPricingOption,
                                ]}
                                onPress={() => setSelectedPlan('yearly')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.savingsBadge}>
                                    <Text style={styles.savingsText}>Save {savingsPercentage}%</Text>
                                </View>
                                <View style={styles.pricingContent}>
                                    <View style={styles.pricingTitleContainer}>
                                        <Text style={styles.pricingTitle}>Yearly</Text>
                                    </View>
                                    <View style={styles.pricingPriceContainer}>
                                        <Text style={styles.pricingPrice}>
                                            ${yearlyMonthlyEquivalent}
                                            <Text style={styles.pricingPeriod}>/month</Text>
                                        </Text>
                                        <Text style={styles.yearlyTotal}>${yearlyPrice}/year</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                        
                        {/* Continue button and free videos option */}
                        <Animated.View
                            style={[
                                styles.buttonContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={handleContinue}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.skipButton} 
                                onPress={handleClose}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.skipText}>Continue with 3 free videos</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    imageContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    backgroundImage: {
        resizeMode: 'cover',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
    },
    safeArea: {
        flex: 1,
        zIndex: 2, // Ensure content is above gradient
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 1, // Below the content
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'flex-end', // Push content to bottom
        paddingBottom: 40,
    },
    spacer: {
        flex: 0.3, // Takes up 30% of the screen to push content down
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        zIndex: 10, // Ensure it's above everything
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    blurView: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 22,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    featuresContainer: {
        marginBottom: 20,
    },
    featuresBlurContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        padding: 14,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    checkmark: {
        fontWeight: 'bold',
        marginRight: 12,
    },
    featureText: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    pricingContainer: {
        marginBottom: 20,
        flexDirection: 'column',
    },
    pricingOption: {
        width: '100%',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        position: 'relative',
        marginBottom: 12,
        height: 70,
    },
    selectedPricingOption: {
        borderColor: COLORS.primary,
        borderWidth: 1.5,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    pricingContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100%',
    },
    pricingTitleContainer: {
        flex: 1,
    },
    pricingPriceContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    pricingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    pricingPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'right',
    },
    pricingPeriod: {
        fontSize: 14,
        fontWeight: 'normal',
        color: COLORS.textSecondary,
    },
    yearlyTotal: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
        textAlign: 'right',
    },
    savingsBadge: {
        position: 'absolute',
        top: -8,
        right: 10,
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    savingsText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    buttonContainer: {
        marginBottom: 16,
    },
    continueButton: {
        width: '100%',
        height: 50,
        borderRadius: 8,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    skipButton: {
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 16,
        color: COLORS.text,
        textDecorationLine: 'underline',
    },
});

export default PaywallScreen; 