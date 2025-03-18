// app/onboarding/OnboardingStep6.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Animated,
    Dimensions,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { sharedStyles, colors } from './styles';
import CustomButton from './CustomButton';
import { useRouter } from 'expo-router';
import { registerWithEmail } from '../../supabase/services';
import { signInWithGoogle, signInWithApple, isAppleSignInAvailable } from '../../supabase/socialAuthServices';
import { createProfile } from '../../supabase/services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaywallScreen from '../paywall';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase/supabaseClient';
import { SvgXml } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// SVG icons for social login buttons
const googleSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22.501 12.2332C22.501 11.3699 22.4296 10.7399 22.2748 10.0865H12.2153V13.9832H18.12C18.001 14.9515 17.3582 16.4099 15.9296 17.3898L15.9096 17.5203L19.0902 19.935L19.3106 19.9565C21.3343 18.1249 22.501 15.4298 22.501 12.2332Z" fill="#4285F4"/>
<path d="M12.214 22.5C15.1068 22.5 17.5353 21.5666 19.3092 19.9567L15.9282 17.3899C15.0235 18.0083 13.8092 18.4399 12.214 18.4399C9.38069 18.4399 6.97596 16.6083 6.11874 14.0766L5.99309 14.0871L2.68583 16.5954L2.64258 16.7132C4.40446 20.1433 8.0235 22.5 12.214 22.5Z" fill="#34A853"/>
<path d="M6.12046 14.0767C5.89428 13.4234 5.77337 12.7233 5.77337 12C5.77337 11.2767 5.89428 10.5767 6.10856 9.92337L6.10257 9.78423L2.75386 7.2356L2.64429 7.28667C1.91814 8.71002 1.50146 10.3084 1.50146 12C1.50146 13.6917 1.91814 15.29 2.64429 16.7133L6.12046 14.0767Z" fill="#FBBC05"/>
<path d="M12.214 5.55997C14.2259 5.55997 15.583 6.41163 16.3569 7.12335L19.3807 4.23C17.5236 2.53834 15.1069 1.5 12.214 1.5C8.02353 1.5 4.40447 3.85665 2.64258 7.28662L6.10686 9.92332C6.97598 7.39166 9.38073 5.55997 12.214 5.55997Z" fill="#EB4335"/>
</svg>`;

const appleSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.543 12.0271C17.5552 10.5373 18.2363 9.12754 19.4338 8.22586C18.4921 6.93965 17.0152 6.14889 15.4338 6.07765C13.7524 5.90557 12.1338 7.05765 11.2795 7.05765C10.4252 7.05765 9.08662 6.09644 7.67807 6.12557C5.81945 6.18431 4.13662 7.22586 3.28662 8.85765C1.45738 12.1444 2.80662 17.0271 4.56662 19.7156C5.45738 21.0271 6.48662 22.4853 7.84662 22.4271C9.17807 22.3689 9.67807 21.5727 11.2795 21.5727C12.881 21.5727 13.3524 22.4271 14.7338 22.3979C16.1524 22.3689 17.0431 21.0853 17.9048 19.7737C18.5859 18.8138 19.0921 17.7444 19.4048 16.6169C17.9338 15.9649 17.0431 14.0853 17.543 12.0271Z" fill="white"/>
<path d="M14.7919 4.58431C15.5626 3.67181 15.9626 2.49931 15.9044 1.29932C14.7044 1.38681 13.5919 1.93431 12.7919 2.82181C12.0044 3.68431 11.5919 4.85681 11.6626 5.99931C12.8626 6.02844 14.0044 5.51681 14.7919 4.58431Z" fill="white"/>
</svg>`;

// Create sparkle positions
const SPARKLE_COUNT = 15;
const sparkles = Array.from({ length: SPARKLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height * 0.7,
    scale: 0.3 + Math.random() * 0.7,
    rotation: Math.random() * 360,
    duration: 1200 + Math.random() * 1000,
}));

// Define our custom colors
const PURPLE_COLOR = '#5a51e1';
const PINK_COLOR = '#e15190';

type OnboardingStep6Props = {
    onContinue: () => void;
    onBack: () => void;
};

// Validation functions
const validateEmail = (email: string): boolean => {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
};

const OnboardingStep6: React.FC<OnboardingStep6Props> = ({ onContinue, onBack }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const router = useRouter();
    const [name, setName] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('Spanish');
    const [nativeLanguage, setNativeLanguage] = useState('English');
    const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);
    
    // Animation values
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(30));
    const [inputSlideAnim1] = useState(new Animated.Value(50));
    const [inputSlideAnim2] = useState(new Animated.Value(50));
    const [socialSlideAnim1] = useState(new Animated.Value(50));
    const [socialSlideAnim2] = useState(new Animated.Value(50));
    
    const sparkleAnims = sparkles.map(() => ({
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.3),
    }));

    useEffect(() => {
        // Animate sparkles with staggered timing
        sparkleAnims.forEach((anim, index) => {
            const delay = index * 100;
            
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.sequence([
                            Animated.timing(anim.opacity, {
                                toValue: 0.8,
                                duration: sparkles[index].duration * 0.4,
                                useNativeDriver: true,
                            }),
                            Animated.timing(anim.opacity, {
                                toValue: 0,
                                duration: sparkles[index].duration * 0.6,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.sequence([
                            Animated.timing(anim.scale, {
                                toValue: 1,
                                duration: sparkles[index].duration * 0.4,
                                useNativeDriver: true,
                            }),
                            Animated.timing(anim.scale, {
                                toValue: 0.3,
                                duration: sparkles[index].duration * 0.6,
                                useNativeDriver: true,
                            }),
                        ]),
                    ]),
                ])
            ).start();
        });

        // Main content animation
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
            })
        ]).start();
        
        // Staggered animations for inputs and social buttons
        Animated.stagger(100, [
            Animated.timing(socialSlideAnim1, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(socialSlideAnim2, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(inputSlideAnim1, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(inputSlideAnim2, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            })
        ]).start();

        // Check if Apple Sign-In is available
        async function checkAppleSignIn() {
            const available = await isAppleSignInAvailable();
            setAppleSignInAvailable(available);
        }
        
        checkAppleSignIn();
        
        // Check if user is already authenticated (coming from login screen)
        async function checkAuthStatus() {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                console.log('User is already authenticated:', session.user.id);
                
                // Check if user already has a profile
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (existingProfile) {
                    console.log('User already has a profile, redirecting to learn page');
                    router.replace('/learn');
                    return;
                }
                
                // If we're here, user is authenticated but doesn't have a profile
                // We'll let them continue with the onboarding process
                console.log('User is authenticated but needs to complete profile setup');
                
                // Pre-fill email if available
                if (session.user.email) {
                    setEmail(session.user.email);
                }
                
                // Pre-fill name if available in user metadata
                if (session.user.user_metadata?.name) {
                    setName(session.user.user_metadata.name);
                } else if (session.user.user_metadata?.full_name) {
                    setName(session.user.user_metadata.full_name);
                }
            }
        }
        
        checkAuthStatus();
    }, []);

    const handleEmailSignUp = async () => {
        if (!validateEmail(email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert('Weak Password', 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match.');
            return;
        }

        try {
            setLoading(true);
            
            // First check if user is already authenticated
            const { data: { session } } = await supabase.auth.getSession();
            let userId = session?.user?.id;
            
            // If not already authenticated, register with email
            if (!userId) {
                try {
                    const { user, session } = await registerWithEmail(email, password);
                    
                    if (!user) {
                        Alert.alert('Registration Error', 'Failed to register user. Please try again.');
                        setLoading(false);
                        return;
                    }
                    
                    userId = user.id;
                } catch (registerError) {
                    console.error('Registration error:', registerError);
                    Alert.alert('Registration Error', registerError instanceof Error ? registerError.message : 'An unexpected error occurred. Please try again.');
                    setLoading(false);
                    return;
                }
            } else {
                console.log(`User already authenticated with ID: ${userId}`);
            }
            
            // Create user profile
            try {
                await createProfile(userId, {
                    display_name: name || email.split('@')[0],
                    target_lang: targetLanguage,
                    daily_goal: 5
                });
                
                // Save onboarding completion status
                await AsyncStorage.setItem('onboardingCompleted', 'true');
                console.log('Profile created successfully');
                
                // Show the paywall
                setShowPaywall(true);
            } catch (profileError) {
                console.error('Error creating profile:', profileError);
                Alert.alert('Profile Error', 'Failed to create user profile. Please try again.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Registration Error', 'An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    const handleSocialSignUp = async (provider: 'google' | 'apple') => {
        try {
            setLoading(true);
            
            // First check if user is already authenticated
            const { data: { session } } = await supabase.auth.getSession();
            let userId = session?.user?.id;
            let userEmail = session?.user?.email;
            let userName = session?.user?.user_metadata?.name || 
                          session?.user?.user_metadata?.full_name || 
                          session?.user?.email?.split('@')[0] || 
                          'User';
            
            // If not already authenticated, perform social sign-in
            if (!userId) {
                let result;
                if (provider === 'google') {
                    result = await signInWithGoogle();
                } else if (provider === 'apple') {
                    result = await signInWithApple();
                }
                
                if (!result?.user) {
                    // User cancelled or sign-in failed
                    if (result === null) {
                        console.log(`${provider} sign-up cancelled by user`);
                    } else {
                        console.error(`Error signing up with ${provider}:`, result);
                        Alert.alert('Error', `Failed to sign up with ${provider}. Please try again.`);
                    }
                    setLoading(false);
                    return;
                }
                
                // Set user info from the result
                userId = result.user.id;
                userEmail = result.user.email;
                userName = result.user.user_metadata?.full_name || 
                          result.user.user_metadata?.name || 
                          result.user.email?.split('@')[0] || 
                          'User';
                
                console.log(`Successfully signed up with ${provider}:`, result.user);
            } else {
                console.log(`User already authenticated with ID: ${userId}`);
            }
            
            // Check if the user already has a profile
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (!existingProfile) {
                // This is a new user - create a profile
                console.log('Creating new profile for user:', userId);
                try {
                    await createProfile(userId, {
                        display_name: userName,
                        target_lang: targetLanguage,
                        daily_goal: 5
                    });
                    
                    // Save onboarding completion status
                    await AsyncStorage.setItem('onboardingCompleted', 'true');
                    console.log('Profile created successfully');
                } catch (profileError) {
                    console.error('Error creating profile:', profileError);
                    Alert.alert('Profile Error', 'Failed to create user profile. Please try again.');
                    setLoading(false);
                    return;
                }
            } else {
                console.log('User already has a profile, proceeding with login');
            }
            
            // Show the paywall for new registrations
            setShowPaywall(true);
        } catch (error) {
            console.error(`Error signing up with ${provider}:`, error);
            
            // If the error indicates the user already exists but doesn't have a profile
            if (error instanceof Error && error.message.includes('User already registered')) {
                Alert.alert(
                    'Account Already Exists', 
                    `An account with this ${provider} login already exists. Please use the login screen instead.`,
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => setLoading(false)
                        },
                        {
                            text: 'Go to Login',
                            onPress: () => {
                                setLoading(false);
                                router.replace('/login');
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', `Failed to sign up with ${provider}. Please try again.`);
                setLoading(false);
            }
        }
    };

    const handleSuccessfulRegistration = (userId: string) => {
        // Show the paywall after successful registration
        setShowPaywall(true);
    };

    const handlePaywallContinue = () => {
        // Navigate to the main app
        router.replace('/(tabs)');
    };

    // If showing paywall, render the PaywallScreen component
    if (showPaywall) {
        return <PaywallScreen />;
    }

    return (
        <KeyboardAvoidingView 
            style={styles.keyboardView} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.mainContent}>
                    <View style={styles.topBlock}>
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Animated.View 
                        style={{ 
                            opacity: fadeAnim, 
                            transform: [{ translateY: slideAnim }]
                        }}
                    >
                        <Text style={styles.headerText}>Join Our Community!</Text>
                        <Text style={styles.subHeaderText}>
                            Create an account to start your language learning journey
                        </Text>
                    </Animated.View>

                    <View style={styles.socialButtonsContainer}>
                        {appleSignInAvailable && (
                            <TouchableOpacity 
                                style={[styles.socialButton, styles.appleButton]} 
                                onPress={() => handleSocialSignUp('apple')}
                                disabled={loading}
                            >
                                <SvgXml xml={appleSvg} width={24} height={24} />
                                <Text style={styles.socialButtonText}>Continue with Apple</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                            style={[styles.socialButton, styles.googleButton]} 
                            onPress={() => handleSocialSignUp('google')}
                            disabled={loading}
                        >
                            <SvgXml xml={googleSvg} width={24} height={24} />
                            <Text style={[styles.socialButtonText, styles.googleButtonText]}>Continue with Google</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.orContainer}>
                        <View style={styles.orLine} />
                        <Text style={styles.orText}>or</Text>
                        <View style={styles.orLine} />
                    </View>

                    <View style={styles.emailHeaderContainer}>
                        <View style={styles.emailHeaderAccent} />
                        <Text style={styles.emailHeader}>Sign up with Email</Text>
                    </View>
                    
                    <View style={styles.inputsContainer}>
                        <Animated.View 
                            style={{ 
                                opacity: fadeAnim, 
                                transform: [{ translateY: inputSlideAnim1 }],
                                width: '100%'
                            }}
                        >
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={colors.subText} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor={colors.subText}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </Animated.View>

                        <Animated.View 
                            style={{ 
                                opacity: fadeAnim, 
                                transform: [{ translateY: inputSlideAnim2 }],
                                width: '100%'
                            }}
                        >
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.subText} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Create a password"
                                    placeholderTextColor={colors.subText}
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity 
                                    onPress={() => setShowPassword(!showPassword)} 
                                    style={styles.eyeButton}
                                >
                                    <Ionicons 
                                        name={showPassword ? "eye-outline" : "eye-off-outline"} 
                                        size={20} 
                                        color={colors.subText} 
                                    />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        <Animated.View 
                            style={{ 
                                opacity: fadeAnim, 
                                transform: [{ translateY: inputSlideAnim2 }],
                                width: '100%'
                            }}
                        >
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.subText} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm password"
                                    placeholderTextColor={colors.subText}
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </Animated.View>

                        <View style={styles.continueButtonContainer}>
                            <CustomButton
                                title="Create Account"
                                onPress={handleEmailSignUp}
                                loading={loading}
                                style={styles.createAccountButton}
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    contentContainer: {
        flexGrow: 1,
    },
    mainContent: {
        flex: 1,
        paddingTop: 30,
        paddingHorizontal: 20,
    },
    sparkle: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    topBlock: {
        paddingTop: 50,
        marginBottom: 20,
    },
    headerText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    subHeaderText: {
        fontSize: 16,
        color: colors.subText,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    socialButtonsContainer: {
        width: '100%',
        marginTop: 20,
        marginBottom: 20,
        gap: 12,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 16,
        gap: 12,
    },
    appleButton: {
        backgroundColor: '#000',
    },
    googleButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    googleButtonText: {
        color: '#000',
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    orText: {
        color: colors.subText,
        marginHorizontal: 16,
        fontSize: 14,
    },
    emailHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    emailHeaderAccent: {
        width: 4,
        height: '100%',
        backgroundColor: PINK_COLOR,
        borderRadius: 2,
        marginRight: 8,
    },
    emailHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    inputsContainer: {
        width: '100%',
        gap: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    inputIcon: {
        marginRight: 12,
        opacity: 0.7,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
        height: '100%',
        paddingVertical: 8,
        fontWeight: '400',
    },
    eyeButton: {
        padding: 10,
        opacity: 0.7,
    },
    continueButtonContainer: {
        alignSelf: 'center',
        marginBottom: 40,
    },
    createAccountButton: {
        minWidth: 'auto',
        alignSelf: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default OnboardingStep6;

