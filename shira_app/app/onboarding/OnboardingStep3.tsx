// app/onboarding/OnboardingStep3.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    ViewStyle,
    TextStyle,
    ScrollView,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { sharedStyles, colors } from './styles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Define our custom colors
const PURPLE_COLOR = '#5a51e1';
const PINK_COLOR = '#e15190';

type OnboardingStep3Props = {
    onContinue: () => void;
    onBack: () => void;
    onSkip: () => void;
};

const { width, height } = Dimensions.get('window');

const OnboardingStep3: React.FC<OnboardingStep3Props> = ({ onContinue, onBack, onSkip }) => {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(30));
    const [swipeAnim] = useState(new Animated.Value(0));
    const [iconAnim] = useState(new Animated.Value(0));
    const [floatAnim] = useState(new Animated.Value(0));
    const [staggerAnim] = useState(new Animated.Value(0));
    const [carouselAnim] = useState(new Animated.Value(0));
    const [nextButtonAnim] = useState(new Animated.Value(0));
    const [currentPage, setCurrentPage] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    // Create animated values for the swipe animation in screen 2
    const [handAnim] = useState(new Animated.Value(0));
    const [videoMoveAnim] = useState(new Animated.Value(0));
    const [videoFadeAnim] = useState(new Animated.Value(1));
    const [newVideoAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        // Main animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(iconAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ),
            Animated.stagger(200, [
                Animated.timing(staggerAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(carouselAnim, {
                        toValue: 1,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(carouselAnim, {
                        toValue: 0,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                ])
            ),
        ]).start();

        // Special animation for the "How It Works" screen
        Animated.loop(
            Animated.sequence([
                // Start with hand at bottom
                Animated.timing(handAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
                // Reset video position
                Animated.timing(videoMoveAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
                Animated.timing(videoFadeAnim, {
                    toValue: 1,
                    duration: 0,
                    useNativeDriver: true,
                }),
                Animated.timing(newVideoAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
                // Pause before starting
                Animated.delay(500),
                // Move hand up in a swiping motion
                Animated.timing(handAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                // Move current video up and fade out
                Animated.parallel([
                    Animated.timing(videoMoveAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(videoFadeAnim, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]),
                // Fade in new video
                Animated.timing(newVideoAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                // Pause at the end of the animation
                Animated.delay(1000),
            ])
        ).start();
    }, []);

    const iconScale = iconAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1],
    });

    const floatTransform = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const pageIndex = Math.round(contentOffset / width);
        
        // If we're moving to the third screen, animate the Next button
        if (pageIndex === 2 && currentPage !== 2) {
            Animated.timing(nextButtonAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
                delay: 300, // Slight delay for better UX
            }).start();
        } else if (pageIndex !== 2 && currentPage === 2) {
            // Reset animation when leaving the third screen
            Animated.timing(nextButtonAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
        
        setCurrentPage(pageIndex);
        
        // Trigger onContinue when swiping past the last screen
        if (pageIndex === 2 && contentOffset > width * 2.3) {
            onContinue();
        }
    };

    const Screen1 = () => (
        <View style={styles.screenContainer}>
            <View style={[styles.illustrationContainer, styles.centeredContent]}>
                <Animated.View 
                    style={[
                        styles.welcomeContainer,
                        {
                            transform: [{ translateY: floatTransform }],
                            opacity: staggerAnim
                        }
                    ]}
                >
                    <View style={styles.decorativeStars}>
                        {[...Array(5)].map((_, i) => (
                            <Animated.View 
                                key={i} 
                                style={[
                                    styles.star,
                                    {
                                        top: -20 + Math.random() * 100,
                                        left: -50 + Math.random() * 100,
                                        transform: [
                                            { scale: new Animated.Value(0.5 + Math.random() * 0.5) },
                                            { rotate: `${Math.random() * 360}deg` }
                                        ]
                                    }
                                ]}
                            >
                                <Ionicons name="star" size={12} color={PINK_COLOR} />
                            </Animated.View>
                        ))}
                    </View>
                    
                    <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
                        <View style={styles.phoneGlow} />
                        <Ionicons name="phone-portrait" size={120} color={PURPLE_COLOR} />
                        <View style={styles.videoIconOverlay}>
                            <Ionicons name="play-circle" size={40} color={PINK_COLOR} />
                        </View>
                    </Animated.View>
                </Animated.View>

                <Animated.View 
                    style={[
                        styles.textContainer,
                        {
                            opacity: staggerAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.title}>Say Hi to Shira</Text>
                    <Text style={styles.description}>
                        A new way of language learning through bite-sized content. Master a language naturally with short, engaging videos tailored to your learning style.
                    </Text>
                </Animated.View>
            </View>
        </View>
    );

    const Screen2 = () => (
        <View style={styles.screenContainer}>
            <View style={[styles.illustrationContainer, styles.centeredContent]}>
                <View style={styles.phoneFrame}>
                    {/* Current video that will move up and fade out */}
                    <Animated.View 
                        style={[
                            styles.videoCard,
                            {
                                transform: [{ 
                                    translateY: videoMoveAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -height * 0.3]
                                    })
                                }],
                                opacity: videoFadeAnim
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']}
                            style={styles.videoGradient}
                        />
                        <View style={styles.videoContent}>
                            <View style={styles.videoThumbnail}>
                                <Ionicons name="play" size={20} color="#fff" />
                            </View>
                            <Text style={styles.videoTitle}>¿Cómo estás?</Text>
                            <Text style={styles.videoSubtitle}>How are you?</Text>
                        </View>
                    </Animated.View>

                    {/* New video that will fade in */}
                    <Animated.View 
                        style={[
                            styles.videoCard,
                            styles.newVideoCard,
                            {
                                opacity: newVideoAnim
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']}
                            style={styles.videoGradient}
                        />
                        <View style={styles.videoContent}>
                            <View style={styles.videoThumbnail}>
                                <Ionicons name="play" size={20} color="#fff" />
                            </View>
                            <Text style={styles.videoTitle}>Buenos días</Text>
                            <Text style={styles.videoSubtitle}>Good morning</Text>
                        </View>
                    </Animated.View>

                    {/* Animated hand for swipe gesture */}
                    <Animated.View
                        style={[
                            styles.handIndicator,
                            {
                                transform: [{ 
                                    translateY: handAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [40, -60]
                                    })
                                }],
                                opacity: handAnim.interpolate({
                                    inputRange: [0, 0.2, 0.8, 1],
                                    outputRange: [0, 1, 1, 0]
                                })
                            }
                        ]}
                    >
                        <Ionicons name="hand-left" size={36} color={PURPLE_COLOR} />
                        <View style={styles.swipeArrow}>
                            <Ionicons name="arrow-up" size={16} color={PURPLE_COLOR} />
                        </View>
                    </Animated.View>

                    {/* Swipe indicator text */}
                    <View style={styles.swipeTextContainer}>
                        <Text style={styles.swipeText}>Swipe Up</Text>
                        <Ionicons name="chevron-up" size={20} color={PINK_COLOR} />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>How It Works</Text>
                    <Text style={styles.description}>
                        Swipe up on a video to go to the next one. Each video teaches you a new phrase to master.
                    </Text>
                </View>
            </View>
        </View>
    );

    const Screen3 = () => (
        <View style={styles.screenContainer}>
            <View style={[styles.illustrationContainer, styles.centeredContent]}>
                <View style={styles.phoneFrame}>
                    <View style={styles.progressContent}>
                        <Animated.View 
                            style={[
                                styles.progressHeader,
                                {
                                    transform: [{ 
                                        translateY: carouselAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -5]
                                        })
                                    }]
                                }
                            ]}
                        >
                            <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
                            <Text style={[styles.progressHeaderText, { color: '#FFFFFF' }]}>Progress</Text>
                        </Animated.View>

                        {/* Trophy in the center */}
                        <Animated.View 
                            style={[
                                styles.trophyContainer,
                                {
                                    transform: [{ 
                                        scale: carouselAnim.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: [1, 1.1, 1]
                                        })
                                    }],
                                    opacity: carouselAnim.interpolate({
                                        inputRange: [0, 0.3, 0.7, 1],
                                        outputRange: [0.7, 1, 1, 0.7]
                                    })
                                }
                            ]}
                        >
                            <View style={styles.trophyGlow} />
                            <View style={styles.trophyIconContainer}>
                                <Ionicons name="trophy" size={50} color={PURPLE_COLOR} />
                            </View>
                        </Animated.View>

                        {/* Progress blocks */}
                        <View style={styles.progressBlocks}>
                            <Animated.View 
                                style={[
                                    styles.progressBlock,
                                    {
                                        transform: [{ 
                                            translateX: carouselAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [-10, 0]
                                            })
                                        }],
                                        opacity: carouselAnim.interpolate({
                                            inputRange: [0, 0.3, 1],
                                            outputRange: [0.6, 1, 0.6]
                                        })
                                    }
                                ]}
                            >
                                <View style={styles.blockIconContainer}>
                                    <Ionicons name="alert-circle" size={18} color={PURPLE_COLOR} />
                                </View>
                                <View style={styles.blockTextContainer}>
                                    <Text style={styles.blockTitle}>Need to Work On</Text>
                                    <Text style={styles.blockCount}>12 phrases</Text>
                                </View>
                            </Animated.View>

                            {/* Removed Mastered block and kept only the streak block */}
                            <Animated.View 
                                style={[
                                    styles.progressBlock,
                                    styles.streakBlock,
                                    {
                                        transform: [{ 
                                            translateX: carouselAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [10, 0]
                                            })
                                        }],
                                        opacity: carouselAnim.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: [0.6, 1, 0.6]
                                        })
                                    }
                                ]}
                            >
                                <View style={[styles.blockIconContainer, styles.streakIcon]}>
                                    <Ionicons name="flame" size={18} color={PINK_COLOR} />
                                </View>
                                <View style={styles.blockTextContainer}>
                                    <Text style={styles.blockTitle}>Daily Streak</Text>
                                    <Text style={styles.streakCount}>3 days</Text>
                                </View>
                            </Animated.View>
                        </View>
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Track Your Progress</Text>
                    <Text style={styles.description}>
                        Keep track of your learning streak and practice phrases you need to work on with our AI pronunciation partner.
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.topBlock}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip Intro</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
            >
                <Screen1 />
                <Screen2 />
                <Screen3 />
            </ScrollView>

            <View style={styles.bottomContainer}>
                {/* Next button with fade-in animation */}
                <Animated.View 
                    style={[
                        styles.nextButtonContainer,
                        {
                            opacity: nextButtonAnim,
                            transform: [{ 
                                translateY: nextButtonAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [10, 0]
                                })
                            }]
                        }
                    ]}
                    pointerEvents={currentPage === 2 ? 'auto' : 'none'}
                >
                    <TouchableOpacity 
                        style={styles.nextButton}
                        onPress={onContinue}
                    >
                        <LinearGradient
                            colors={[PURPLE_COLOR, PURPLE_COLOR]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.nextButtonGradient}
                        >
                            <Text style={styles.nextButtonText}>Next</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
                
                <View style={styles.paginationContainer}>
                    <View style={styles.paginationDots}>
                        <View style={[styles.dot, currentPage === 0 && styles.dotActive]} />
                        <View style={[styles.dot, currentPage === 1 && styles.dotActive]} />
                        <View style={[styles.dot, currentPage === 2 && styles.dotActive]} />
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
    scrollView: {
        flex: 1,
    } as ViewStyle,
    screenContainer: {
        width: width,
        paddingHorizontal: 20,
        flex: 1,
        justifyContent: 'center',
    } as ViewStyle,
    topBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        marginBottom: 20,
        paddingHorizontal: 20,
    } as ViewStyle,
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    skipButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    } as ViewStyle,
    skipText: {
        color: colors.text,
        fontSize: 16,
        opacity: 0.8,
    } as TextStyle,
    mainContent: {
        flex: 1,
        justifyContent: 'center',
    } as ViewStyle,
    illustrationContainer: {
        alignItems: 'center',
    } as ViewStyle,
    iconContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,
    videoIconOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -20 }, { translateY: -20 }],
    } as ViewStyle,
    phoneFrame: {
        width: width * 0.7,
        height: height * 0.4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    } as ViewStyle,
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 30,
    } as ViewStyle,
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 16,
    } as TextStyle,
    description: {
        fontSize: 18,
        color: colors.subText,
        textAlign: 'center',
        lineHeight: 28,
    } as TextStyle,
    bottomContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        position: 'relative',
    } as ViewStyle,
    paginationContainer: {
        marginBottom: 20,
    } as ViewStyle,
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginHorizontal: 4,
    } as ViewStyle,
    dotActive: {
        backgroundColor: PURPLE_COLOR,
        width: 24,
    } as ViewStyle,
    centeredContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: height - 200, // Account for top and bottom bars
    } as ViewStyle,
    welcomeContainer: {
        alignItems: 'center',
        marginBottom: 40,
        position: 'relative',
    } as ViewStyle,
    decorativeStars: {
        position: 'absolute',
        width: 200,
        height: 200,
        zIndex: -1,
    } as ViewStyle,
    star: {
        position: 'absolute',
    } as ViewStyle,
    phoneGlow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: PURPLE_COLOR,
        opacity: 0.15,
        transform: [{ scale: 1.2 }],
    } as ViewStyle,
    // New styles for the improved "How It Works" screen
    videoCard: {
        width: '90%',
        height: 180,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'absolute',
        justifyContent: 'flex-end',
    } as ViewStyle,
    newVideoCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    } as ViewStyle,
    videoGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 100,
        borderRadius: 16,
    } as ViewStyle,
    videoContent: {
        padding: 16,
    } as ViewStyle,
    videoThumbnail: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: PURPLE_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    } as ViewStyle,
    videoTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    } as TextStyle,
    videoSubtitle: {
        color: colors.subText,
        fontSize: 14,
    } as TextStyle,
    handIndicator: {
        position: 'absolute',
        bottom: 20,
        right: 30,
        transform: [{ rotate: '90deg' }],
    } as ViewStyle,
    swipeArrow: {
        position: 'absolute',
        top: -5,
        left: 10,
        transform: [{ rotate: '-90deg' }],
    } as ViewStyle,
    swipeTextContainer: {
        position: 'absolute',
        bottom: 16,
        flexDirection: 'column',
        alignItems: 'center',
    } as ViewStyle,
    swipeText: {
        color: PINK_COLOR,
        fontSize: 16,
        marginBottom: 4,
    } as TextStyle,
    progressContent: {
        width: '100%',
        height: '100%',
        padding: 20,
    } as ViewStyle,
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    } as ViewStyle,
    progressHeaderText: {
        fontSize: 18,
        marginLeft: 8,
        fontWeight: '600',
    } as TextStyle,
    progressCategories: {
        gap: 16,
    } as ViewStyle,
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#FF9500',
    } as ViewStyle,
    aiCard: {
        borderLeftColor: colors.primary,
    } as ViewStyle,
    categoryIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 150, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    } as ViewStyle,
    aiIcon: {
        backgroundColor: 'rgba(163, 71, 161, 0.2)',
    } as ViewStyle,
    categoryTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    } as TextStyle,
    categorySubtitle: {
        color: colors.subText,
        fontSize: 14,
        marginLeft: 'auto',
    } as TextStyle,
    progressArrow: {
        position: 'absolute',
        right: 20,
        bottom: 20,
    } as ViewStyle,
    // New styles for the redesigned "Track Your Progress" screen
    trophyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        position: 'relative',
    } as ViewStyle,
    trophyGlow: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: PURPLE_COLOR,
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
    } as ViewStyle,
    trophyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(90, 81, 225, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(90, 81, 225, 0.3)',
        marginBottom: 5,
    } as ViewStyle,
    streakBadge: {
        backgroundColor: colors.secondary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
        position: 'absolute',
        bottom: -15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    } as ViewStyle,
    streakNumber: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    } as TextStyle,
    streakLabel: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    } as TextStyle,
    progressBlocks: {
        marginTop: 40,
        width: '100%',
        gap: 12,
    } as ViewStyle,
    progressBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(225, 81, 144, 0.1)',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: PINK_COLOR,
    } as ViewStyle,
    blockIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(225, 81, 144, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    } as ViewStyle,
    blockTextContainer: {
        flex: 1,
    } as ViewStyle,
    blockTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    } as TextStyle,
    blockCount: {
        color: '#FFFFFF',
        fontSize: 12,
    } as TextStyle,
    practiceButton: {
        position: 'absolute',
        bottom: 15,
        left: 20,
        right: 20,
    } as ViewStyle,
    practiceButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
    } as ViewStyle,
    practiceIcon: {
        marginRight: 8,
    } as ViewStyle,
    practiceText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    } as TextStyle,
    nextButtonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 60, // Position above pagination dots
        alignItems: 'center',
        zIndex: 10,
    } as ViewStyle,
    nextButton: {
        borderRadius: 30,
        overflow: 'hidden',
        // Shadow for iOS
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        // Elevation for Android
        elevation: 8,
    } as ViewStyle,
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
    } as ViewStyle,
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    } as TextStyle,
    streakBlock: {
        backgroundColor: 'rgba(90, 81, 225, 0.1)',
        borderLeftColor: PURPLE_COLOR,
    } as ViewStyle,
    streakIcon: {
        backgroundColor: 'rgba(90, 81, 225, 0.2)',
    } as ViewStyle,
    streakCount: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    } as TextStyle,
});

export default OnboardingStep3;
