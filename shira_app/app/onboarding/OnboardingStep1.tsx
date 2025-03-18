// app/onboarding/OnboardingStep1.tsx

import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    Animated, 
    Easing,
    Dimensions,
    StatusBar,
    ViewStyle,
    TextStyle
} from 'react-native';
import { sharedStyles, colors } from './styles';
import CustomButton from './CustomButton';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

// Define the purple color
const PURPLE_COLOR = '#5a51e1';

type OnboardingStep1Props = {
    onStartJourney: () => void;
};

const { width, height } = Dimensions.get('window');

// Create sparkle positions
const SPARKLE_COUNT = 20;
const sparkles = Array.from({ length: SPARKLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height * 0.7, // Keep sparkles in top 70% of screen
    scale: 0.3 + Math.random() * 0.7, // More varied scales
    rotation: Math.random() * 360, // Add rotation
    duration: 1200 + Math.random() * 1000,
}));

// Define bubble data
const bubbles = [
    {
        icon: 'language',
        iconType: 'FontAwesome5',
        size: 24,
        color: '#FFFFFF',
        backgroundColor: PURPLE_COLOR,
        startPosition: { x: -80, y: -20 },
        endPosition: { x: -80, y: 20 },
        duration: 3500, // Slightly slower
    },
    {
        icon: 'video',
        iconType: 'FontAwesome5',
        size: 24,
        color: '#FFFFFF',
        backgroundColor: PURPLE_COLOR,
        startPosition: { x: 160, y: -20 },
        endPosition: { x: 160, y: 20 },
        duration: 2800, // Slightly faster
    },
    {
        icon: 'comments',
        iconType: 'FontAwesome5',
        size: 24,
        color: '#FFFFFF',
        backgroundColor: PURPLE_COLOR,
        startPosition: { x: 40, y: -100 }, // Not as high up
        endPosition: { x: 40, y: -110 },   // Smaller movement range
        duration: 3200, // Different timing
    }
];

const OnboardingStep1: React.FC<OnboardingStep1Props> = ({ onStartJourney }) => {
    const router = useRouter();
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(30));
    const [scaleAnim] = useState(new Animated.Value(0.9));
    const sparkleAnims = sparkles.map(() => ({
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.3),
    }));
    
    // Create animations for bubbles
    const bubbleAnims = bubbles.map((bubble) => ({
        position: new Animated.ValueXY({ 
            x: bubble.startPosition.x, 
            y: bubble.startPosition.y 
        }),
    }));

    useEffect(() => {
        // Animate sparkles with staggered timing
        sparkleAnims.forEach((anim, index) => {
            const delay = index * 100; // Stagger the animations
            
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

        // Animate floating bubbles with fixed paths
        bubbleAnims.forEach((anim, index) => {
            const bubble = bubbles[index];
            const duration = bubble.duration; // Use individual durations
            
            // Create continuous floating animation with easing
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim.position, {
                        toValue: { 
                            x: bubble.endPosition.x, 
                            y: bubble.endPosition.y 
                        },
                        duration: duration,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
                    Animated.timing(anim.position, {
                        toValue: { 
                            x: bubble.startPosition.x, 
                            y: bubble.startPosition.y 
                        },
                        duration: duration,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
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
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const handleLogin = () => {
        router.push('/login');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" translucent />
            <View style={styles.mainWrapper}>
                {/* Fun Purple Stars */}
                {sparkles.map((sparkle, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.sparkle,
                            {
                                left: sparkle.x,
                                top: sparkle.y,
                                opacity: sparkleAnims[index].opacity,
                                transform: [
                                    { scale: sparkleAnims[index].scale },
                                    { rotate: `${sparkle.rotation}deg` }
                                ],
                            }
                        ]}
                    >
                        <Ionicons name="star" size={12} color={PURPLE_COLOR} />
                    </Animated.View>
                ))}

                <View style={styles.mainContent}>
                    {/* Trophy and Text Section */}
                    <View style={styles.congratsSection}>
                        <Animated.View 
                            style={[
                                styles.trophyContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [
                                        { translateY: slideAnim },
                                        { scale: scaleAnim }
                                    ]
                                }
                            ]}
                        >
                            {/* Floating Bubbles */}
                            {bubbles.map((bubble, index) => (
                                <Animated.View
                                    key={`bubble-${index}`}
                                    style={[
                                        styles.bubble,
                                        {
                                            left: 0,
                                            top: 0,
                                            transform: [
                                                { translateX: bubbleAnims[index].position.x },
                                                { translateY: bubbleAnims[index].position.y },
                                            ]
                                        }
                                    ]}
                                >
                                    <View style={[styles.bubbleInner, { backgroundColor: bubble.backgroundColor }]}>
                                        <FontAwesome5 name={bubble.icon} size={bubble.size} color={bubble.color} />
                                    </View>
                                </Animated.View>
                            ))}

                            <View style={styles.trophyCircle}>
                                <Ionicons name="trophy" size={50} color={PURPLE_COLOR} />
                            </View>
                        </Animated.View>

                        <Animated.View
                            style={[
                                styles.textContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }]
                                }
                            ]}
                        >
                            <Text style={styles.congratsTitle}>Congratulations!</Text>
                            <Text style={styles.congratsMessage}>
                                Be proud of yourself! You're one step closer to achieving conversational fluency.
                            </Text>
                        </Animated.View>
                    </View>

                    {/* Button Section */}
                    <View style={styles.buttonSection}>
                        <CustomButton 
                            title="Get Started" 
                            onPress={onStartJourney}
                            gradientColors={[PURPLE_COLOR, '#7a72e9']}
                            icon={<Ionicons name="arrow-forward" size={18} color={colors.text} />}
                            iconPosition="right"
                        />
                        
                        <TouchableOpacity onPress={handleLogin} style={styles.loginContainer}>
                            <Text style={styles.loginText}>
                                Already using Shira? <Text style={styles.loginHighlight}>Log in</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    } as ViewStyle,
    mainWrapper: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    } as ViewStyle,
    mainContent: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 40,
    } as ViewStyle,
    sparkle: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    congratsSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: height * 0.15,
    } as ViewStyle,
    trophyContainer: {
        alignItems: 'center',
        marginBottom: 40,
        position: 'relative',
    } as ViewStyle,
    trophyCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `rgba(90, 81, 225, 0.1)`,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: PURPLE_COLOR,
    } as ViewStyle,
    bubble: {
        position: 'absolute',
        zIndex: 10,
        left: 0,
        top: 0,
    } as ViewStyle,
    bubbleInner: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    } as ViewStyle,
    textContainer: {
        alignItems: 'center',
    } as ViewStyle,
    congratsTitle: {
        fontSize: 40,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 20,
    } as TextStyle,
    congratsMessage: {
        fontSize: 18,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 28,
        paddingHorizontal: 20,
        opacity: 0.9,
    } as TextStyle,
    buttonSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 'auto',
    } as ViewStyle,
    loginContainer: {
        marginTop: 20,
    } as ViewStyle,
    loginText: {
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
    } as TextStyle,
    loginHighlight: {
        fontWeight: '600',
        textDecorationLine: 'underline',
        color: PURPLE_COLOR,
    } as TextStyle,
});

export default OnboardingStep1;
