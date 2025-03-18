// app/login.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { sharedStyles, colors } from './onboarding/styles';
import CustomButton from './onboarding/CustomButton';
import { useRouter } from 'expo-router';
import { loginWithEmail } from '../supabase/services';
import { signInWithGoogle, signInWithApple, isAppleSignInAvailable } from '../supabase/socialAuthServices';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase/supabaseClient';
import { SvgXml } from 'react-native-svg';

// Define our custom colors
const PURPLE_COLOR = '#5a51e1';
const PINK_COLOR = '#e15190';

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

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    
    // Animation values
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(30));
    const [inputSlideAnim1] = useState(new Animated.Value(50));
    const [inputSlideAnim2] = useState(new Animated.Value(50));
    const [socialSlideAnim1] = useState(new Animated.Value(50));
    const [socialSlideAnim2] = useState(new Animated.Value(50));
    const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);
    
    useEffect(() => {
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
    }, []);

    const handleBack = () => {
        router.back();
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        // Validate email format
        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            const { user, session } = await loginWithEmail(email, password);
            console.log('Logged in user:', user);
            router.replace('/learn');
        } catch (error: any) {
            console.error('Login Error:', error);
            let errorMessage = 'An error occurred during login.';
            if (error.message && error.message.toLowerCase().includes('invalid')) {
                errorMessage = 'Incorrect email or password.';
            }
            Alert.alert('Login Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Function to handle social sign-in
    const handleSocialSignIn = async (provider: 'google' | 'apple') => {
        try {
            setLoading(true);
            
            let result;
            if (provider === 'google') {
                result = await signInWithGoogle();
            } else if (provider === 'apple') {
                result = await signInWithApple();
            }
            
            if (result?.user) {
                console.log(`Successfully signed in with ${provider}:`, result.user);
                
                // Check if the user has a profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', result.user.id)
                    .single();
                
                if (profileError || !profile) {
                    // If no profile exists, this might be a new user who tried to sign in instead of sign up
                    console.log('No profile found for user, redirecting to onboarding...');
                    
                    // Ask the user if they want to complete registration
                    Alert.alert(
                        'Complete Your Registration',
                        'Your account needs to be set up. Would you like to complete your registration now?',
                        [
                            {
                                text: 'Cancel',
                                style: 'cancel',
                                onPress: () => {
                                    // Sign out the user since they don't want to complete registration
                                    supabase.auth.signOut();
                                    setLoading(false);
                                }
                            },
                            {
                                text: 'Continue',
                                onPress: () => {
                                    setLoading(false);
                                    // Use push instead of replace to ensure proper navigation
                                    router.push('/onboarding');
                                }
                            }
                        ]
                    );
                    return;
                }
                
                // User has a profile, proceed with login
                console.log('User profile found, proceeding with login');
                router.replace('/learn');
            } else if (result === null) {
                // User cancelled the sign-in
                console.log(`${provider} sign-in cancelled by user`);
                setLoading(false);
            } else {
                // Something went wrong
                console.error(`Error signing in with ${provider}:`, result);
                Alert.alert('Error', `Failed to sign in with ${provider}. Please try again.`);
                setLoading(false);
            }
        } catch (error) {
            console.error(`Error signing in with ${provider}:`, error);
            
            // Check if the error is about user not found
            if (error instanceof Error) {
                if (error.message.includes('user not found')) {
                    Alert.alert(
                        'Account Not Found', 
                        `No account found with this ${provider} login. Would you like to create a new account?`,
                        [
                            {
                                text: 'Cancel',
                                style: 'cancel',
                                onPress: () => setLoading(false)
                            },
                            {
                                text: 'Sign Up',
                                onPress: () => {
                                    setLoading(false);
                                    // Use push instead of replace to ensure proper navigation
                                    router.push('/onboarding');
                                }
                            }
                        ]
                    );
                } else if (error.message.includes('User already registered')) {
                    // This shouldn't happen during login, but just in case
                    Alert.alert(
                        'Login Error', 
                        'There was an issue with your account. Please try logging in with email instead.',
                        [
                            {
                                text: 'OK',
                                onPress: () => setLoading(false)
                            }
                        ]
                    );
                } else if (provider === 'apple' && 
                          (error.message.includes('Unable to sign in with Apple') || 
                           error.message.includes('invalid email'))) {
                    // Special handling for Apple Sign-In issues
                    Alert.alert(
                        'Apple Sign-In Issue',
                        'There was a problem with Apple Sign-In. This may be due to Apple\'s privacy features. Please try signing in with your email address instead.',
                        [
                            {
                                text: 'OK',
                                onPress: () => setLoading(false)
                            }
                        ]
                    );
                } else {
                    // Generic error
                    Alert.alert('Error', `Failed to sign in with ${provider}. Please try again or use email login.`);
                    setLoading(false);
                }
            } else {
                // Unknown error type
                Alert.alert('Error', `Failed to sign in with ${provider}. Please try again.`);
                setLoading(false);
            }
        }
    };

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
                        <TouchableOpacity onPress={handleBack} style={sharedStyles.backButton}>
                            <Ionicons name="arrow-back" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Animated.View 
                        style={{ 
                            opacity: fadeAnim, 
                            transform: [{ translateY: slideAnim }]
                        }}
                    >
                        <Text style={styles.headerText}>Welcome Back!</Text>
                        <Text style={styles.subHeaderText}>
                            Log in to continue your language journey.
                        </Text>
                    </Animated.View>

                    <View style={styles.socialButtonsContainer}>
                        {appleSignInAvailable && (
                            <TouchableOpacity 
                                style={[styles.socialButton, styles.appleButton]} 
                                onPress={() => handleSocialSignIn('apple')}
                                disabled={loading}
                            >
                                <SvgXml xml={appleSvg} width={24} height={24} />
                                <Text style={styles.socialButtonText}>Continue with Apple</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                            style={[styles.socialButton, styles.googleButton]} 
                            onPress={() => handleSocialSignIn('google')}
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

                    <Text style={styles.emailHeader}>Log in with Email</Text>
                    
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
                                    placeholder="Enter your password"
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
                        
                        <TouchableOpacity style={styles.forgotPasswordButton}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.buttonWrapper}>
                    <View style={styles.continueButtonContainer}>
                        <CustomButton
                            title="Log In"
                            onPress={handleLogin}
                            loading={loading}
                            gradientColors={[PURPLE_COLOR, PURPLE_COLOR]}
                            style={styles.loginButton}
                        />
                    </View>
                    <TouchableOpacity onPress={() => router.push('/onboarding')} style={styles.signupLinkContainer}>
                        <Text style={styles.signupLinkText}>
                            Don't have an account? <Text style={styles.signupHighlight}>Sign up</Text>
                        </Text>
                    </TouchableOpacity>
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
    topBlock: {
        paddingTop: 50,
        marginBottom: 20,
    },
    headerText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    subHeaderText: {
        fontSize: 18,
        color: colors.subText,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 26,
    },
    socialButtonsContainer: {
        width: '100%',
        marginTop: 20,
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
        marginVertical: 20,
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    orText: {
        color: colors.subText,
        marginHorizontal: 10,
        fontSize: 16,
    },
    emailHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    inputsContainer: {
        width: '100%',
        marginBottom: 30,
        gap: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
        height: '100%',
    },
    eyeButton: {
        padding: 10,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    forgotPasswordText: {
        color: PINK_COLOR,
        fontSize: 14,
        fontWeight: '500',
    },
    buttonWrapper: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    continueButtonContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    signupLinkContainer: {
        alignItems: 'center',
    },
    signupLinkText: {
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
    },
    signupHighlight: {
        fontWeight: '600',
        textDecorationLine: 'underline',
        color: PINK_COLOR,
    },
    loginButton: {
        width: '100%',
    },
});

export default Login;
