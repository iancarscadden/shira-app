import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
// @ts-ignore
import DownArrow from '../components/down_arrow.svg';
import Svg, { Circle } from 'react-native-svg';

// Define color constants - only using purple tones
const COLORS = {
  primary: '#5a51e1',      // Main purple
  primaryLight: '#7d75f3', // Lighter purple for gradients
  primaryDark: '#4840b3',  // Darker purple 
  text: '#FFFFFF'          // White text
};

interface PreviousVideoIndicatorProps {
    gestureY: number;  // Current Y position of the gesture
    isActive: boolean; // Whether the gesture is active
    height: number;    // Screen height for calculations
    direction: 'up' | 'down' | null;
    isVideoReady?: boolean; // Prop to track video ready state
}

// Create array of particles with random properties
const createParticles = (count: number) => {
    return Array.from({ length: count }).map(() => ({
        initialX: Math.random() * 100 - 50,
        initialY: Math.random() * 50,
        size: Math.random() * 8 + 2,
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        delay: Math.random() * 1000,
    }));
};

const PreviousVideoIndicator: React.FC<PreviousVideoIndicatorProps> = ({
    gestureY,
    isActive,
    height,
    direction,
    isVideoReady = false,
}) => {
    const { width } = Dimensions.get('window');
    
    // Animation values
    const gradientPosition = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const arrowScale = useRef(new Animated.Value(1)).current;
    const arrowRotation = useRef(new Animated.Value(0)).current;
    const progressValue = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(0.9)).current;
    const cardTranslateY = useRef(new Animated.Value(-20)).current;
    
    // Particle animations
    const particles = useRef(createParticles(15)).current;
    const particleAnims = useRef(
        particles.map(() => ({
            y: new Animated.Value(0),
            x: new Animated.Value(0),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
        }))
    ).current;
    
    // Track animation state
    const animationState = useRef({
        isAnimatingDown: false,
        hasTriggeredPreviousVideo: false,
        particlesAnimating: false,
    }).current;

    // Start particle animations - reversed for downward direction
    const animateParticles = () => {
        if (animationState.particlesAnimating) return;
        
        animationState.particlesAnimating = true;
        
        particleAnims.forEach((anim, index) => {
            const particle = particles[index];
            
            // Reset values
            anim.y.setValue(0);
            anim.x.setValue(0);
            anim.opacity.setValue(0);
            anim.scale.setValue(0);
            
            // Create animation sequence with delay - particles move downward for previous video
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(anim.y, {
                        toValue: 150 + (particle.speed * 50), // Positive for downward movement
                        duration: 2000 * (1 / particle.speed),
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.x, {
                        toValue: particle.initialX * 2,
                        duration: 2000 * (1 / particle.speed),
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(anim.opacity, {
                            toValue: particle.opacity,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.opacity, {
                            toValue: 0,
                            duration: 1600,
                            delay: 400 * particle.speed,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(anim.scale, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim.scale, {
                            toValue: 0.2,
                            duration: 1600,
                            delay: 400 * particle.speed,
                            useNativeDriver: true,
                        }),
                    ]),
                ]).start();
            }, particle.delay);
        });
        
        // Reset after all animations complete
        setTimeout(() => {
            animationState.particlesAnimating = false;
        }, 2500);
    };
    
    // Handle gesture updates and video loading states
    useEffect(() => {
        if (isActive && direction === 'down') {
            // Calculate progress (0-1) of the swipe gesture
            const progress = Math.min(gestureY / 300, 1);
            
            // Update animation values based on swipe progress
            gradientPosition.setValue(progress * 0.8);
            contentOpacity.setValue(Math.min(progress * 1.5, 1));
            progressValue.setValue(progress);
            glowOpacity.setValue(progress * 0.7);
            
            // Update card animations
            cardScale.setValue(0.9 + (progress * 0.1));
            cardTranslateY.setValue(-20 + (progress * 20)); // Start from -20 and move to 0
            
            // Reset animation state
            animationState.isAnimatingDown = false;
            animationState.hasTriggeredPreviousVideo = false;
            
            // Create pulse animation for the arrow during active swipe
            Animated.loop(
                Animated.sequence([
                    Animated.timing(arrowScale, {
                        toValue: 1.3,
                        duration: 800,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.timing(arrowScale, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.in(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
            
            // Create rotation animation for the arrow - reversed for previous
            Animated.loop(
                Animated.sequence([
                    Animated.timing(arrowRotation, {
                        toValue: 0.05,
                        duration: 600,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(arrowRotation, {
                        toValue: -0.05,
                        duration: 600,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
            
        } else if (!isActive && direction === 'down' && gestureY > 100) {
            // When released and swipe was sufficient, animate to completion
            
            // Stop ongoing animations
            arrowScale.stopAnimation();
            arrowRotation.stopAnimation();
            
            // Set animation state
            animationState.isAnimatingDown = true;
            animationState.hasTriggeredPreviousVideo = true;
            
            // Start particle animations
            animateParticles();
            
            // Reset arrow to normal size
            Animated.timing(arrowScale, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
            
            // Animate gradient and content to fully visible
            Animated.parallel([
                Animated.timing(gradientPosition, {
                    toValue: 1,
                    duration: 700,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(contentOpacity, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(progressValue, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.cubic,
                    useNativeDriver: false, // Used for colors
                }),
                Animated.timing(glowOpacity, {
                    toValue: 1,
                    duration: 700,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(cardScale, {
                    toValue: 1,
                    duration: 700,
                    easing: Easing.out(Easing.elastic(1)),
                    useNativeDriver: true,
                }),
                Animated.timing(cardTranslateY, {
                    toValue: 0,
                    duration: 700,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                }),
            ]).start();
            
            // Start continuous rotation animation for loading effect
            Animated.loop(
                Animated.timing(arrowRotation, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
            
        } else if (!isActive && !animationState.hasTriggeredPreviousVideo) {
            // Reset if released without sufficient swipe
            
            // Stop animations
            arrowScale.stopAnimation();
            arrowRotation.stopAnimation();
            
            // Reset animation state
            animationState.isAnimatingDown = false;
            
            // Animate all values back to initial state
            Animated.parallel([
                Animated.timing(gradientPosition, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(contentOpacity, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(arrowScale, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(arrowRotation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(progressValue, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.cubic,
                    useNativeDriver: false,
                }),
                Animated.timing(glowOpacity, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(cardScale, {
                    toValue: 0.9,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(cardTranslateY, {
                    toValue: -20,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [gestureY, isActive, direction, animationState, gradientPosition, contentOpacity, 
        arrowScale, arrowRotation, progressValue, glowOpacity, 
        cardScale, cardTranslateY, height, width]);

    // Handle video ready state
    useEffect(() => {
        if (isVideoReady && animationState.hasTriggeredPreviousVideo) {
            // When video is ready and we've triggered the previous video, animate out

            // Animate gradient off screen - downward for previous
            Animated.parallel([
                Animated.timing(gradientPosition, {
                    toValue: 2, // Move completely off screen
                    duration: 800,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(contentOpacity, {
                    toValue: 0,
                    duration: 600,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(glowOpacity, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Reset state after animation completes
                setTimeout(() => {
                    animationState.hasTriggeredPreviousVideo = false;
                    
                    // Reset all animation values
                    progressValue.setValue(0);
                    arrowRotation.setValue(0);
                    cardScale.setValue(0.9);
                    cardTranslateY.setValue(-20);
                }, 500);
            });
        }
    }, [isVideoReady, animationState, gradientPosition, contentOpacity, 
        progressValue, arrowRotation, glowOpacity, 
        cardScale, cardTranslateY]);

    // Don't render if swiping up
    if (direction === 'up') return null;
    
    // Calculate translation value for gradient container - reversed for previous
    const translateY = gradientPosition.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [-height, 0, height], // Move from top to bottom to off-screen
        extrapolate: 'clamp',
    });
    
    // Interpolate arrow rotation
    const spin = arrowRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });
    
    // Calculate progress ring stroke dashoffset
    const circumference = 2 * Math.PI * 30; // Circle radius * 2PI

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View
                style={[
                    styles.gradientContainer,
                    {
                        transform: [{ translateY }],
                        opacity: gradientPosition.interpolate({
                            inputRange: [0, 0.5, 1, 1.5, 2],
                            outputRange: [0.3, 0.7, 1, 0.7, 0],
                            extrapolate: 'clamp',
                        }),
                    },
                ]}
            >
                {/* Gradient background - flipped for previous */}
                <LinearGradient
                    colors={[
                        'rgba(72,64,179,1)',
                        'rgba(90,81,225,0.8)',
                        'rgba(90,81,225,0.6)',
                        'rgba(90,81,225,0.3)',
                        'rgba(90,81,225,0)', 
                    ]}
                    locations={[0, 0.2, 0.4, 0.7, 1]}
                    style={styles.gradient}
                />
                
                {/* Particle effects */}
                {particles.map((particle, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.particle,
                            {
                                width: particle.size,
                                height: particle.size,
                                borderRadius: particle.size / 2,
                                left: width / 2 + particle.initialX,
                                top: height / 2 + 50 + particle.initialY, // Offset downward
                                opacity: particleAnims[index].opacity,
                                backgroundColor: '#FFFFFF', // Keep particles white
                                transform: [
                                    { translateY: particleAnims[index].y },
                                    { translateX: particleAnims[index].x },
                                    { scale: particleAnims[index].scale }
                                ]
                            }
                        ]}
                    />
                ))}
                
                {/* Central content */}
                <Animated.View 
                    style={[
                        styles.contentContainer,
                        {
                            opacity: contentOpacity,
                            transform: [
                                { scale: cardScale },
                                { translateY: cardTranslateY }
                            ]
                        }
                    ]}
                >
                    {/* Glowing background effect */}
                    <Animated.View 
                        style={[
                            styles.glowEffect,
                            { opacity: glowOpacity }
                        ]}
                    />
                    
                    {/* Card container with blur effect */}
                    <Animated.View
                        style={styles.card}
                    >
                        <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
                            {/* Progress ring around arrow */}
                            <View style={styles.progressContainer}>
                                <Animated.View
                                    style={[
                                        styles.arrowContainer,
                                        {
                                            transform: [
                                                { scale: arrowScale },
                                                { rotate: spin }
                                            ]
                                        }
                                    ]}
                                >
                                    <DownArrow 
                                        width={26}
                                        height={26}
                                        fill={COLORS.text}
                                        style={styles.arrowIcon}
                                    />
                                </Animated.View>
                                
                                {/* SVG Circle Progress */}
                                <Svg width={70} height={70} style={styles.progressRing}>
                                    <Circle
                                        cx="35"
                                        cy="35"
                                        r="30"
                                        stroke={COLORS.primaryLight} // Using light purple for the progress ring
                                        strokeWidth="3"
                                        fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={progressValue.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [circumference, 0]
                                        }) as any}
                                        strokeLinecap="round"
                                    />
                                </Svg>
                            </View>
                            
                            <Text style={styles.text}>Previous Video</Text>
                        </BlurView>
                    </Animated.View>
                </Animated.View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        pointerEvents: 'none',
    },
    gradientContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    card: {
        width: 180,
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(72, 64, 179, 0.8)', // Darker purple with transparency
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    cardBlur: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    progressContainer: {
        width: 70,
        height: 70,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    arrowContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(90, 81, 225, 0.3)', // Light purple with transparency
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    },
    arrowIcon: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    progressRing: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    text: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        letterSpacing: 0.5,
        marginBottom: 8,
        textAlign: 'center',
        width: '100%',
    },
    glowEffect: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(90, 81, 225, 0.1)', // Very light purple glow
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 20,
    },
    particle: {
        position: 'absolute',
        backgroundColor: '#FFFFFF', // Keep particles white
        opacity: 0.6,
        zIndex: 1,
    },
});

export default PreviousVideoIndicator; 