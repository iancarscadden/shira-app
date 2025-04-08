// app/views/ContextView.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView } from 'react-native';
import { ContextData, Choice } from '../../supabase/types';
import useUser from '../../hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Context tutorial storage key
const TUTORIAL_STORAGE_KEY = '@shira_hasSeenContextTutorial';

// For confetti effect
const NUM_CONFETTI = 50;

interface ContextViewProps {
    contextData: ContextData | null;
}

// Main component content
const ContextView: React.FC<ContextViewProps> = ({ contextData }) => {
    const [translated, setTranslated] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [shuffledChoices, setShuffledChoices] = useState<Choice[]>([]);
    const [isBlurred, setIsBlurred] = useState(true);
    const { user } = useUser();
    const scrollViewRef = useRef<ScrollView>(null);
    
    // Tooltip state
    const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
    const tooltipOpacity = useRef(new Animated.Value(0)).current;
    const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
    
    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const phraseOpacity = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(1)).current;
    
    // Confetti animation values
    const confettiAnimations = useRef(
        Array(NUM_CONFETTI).fill(0).map(() => ({
            position: new Animated.ValueXY({ x: 0, y: 0 }),
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
            rotation: new Animated.Value(0),
        }))
    ).current;
    
    // Check if the user has seen the tutorial before
    useEffect(() => {
        const checkTutorialStatus = async () => {
            try {
                const tutorialStatus = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
                if (tutorialStatus === 'true') {
                    console.log('User has already seen the context tutorial');
                    setHasSeenTutorial(true);
                } else {
                    console.log('User has not seen the context tutorial yet');
                    setHasSeenTutorial(false);
                }
            } catch (error) {
                console.error('Error checking tutorial status:', error);
                // If there's an error, default to not showing the tutorial
                setHasSeenTutorial(false);
            }
        };

        checkTutorialStatus();
    }, []);
    
    // Start animations when component mounts
    useEffect(() => {
        if (!isBlurred) {
            Animated.sequence([
                Animated.timing(contentOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic)
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                    easing: Easing.elastic(1.2)
                })
            ]).start();
        }
    }, [isBlurred]);

    // Show tooltip with delay when blur is removed
    useEffect(() => {
        let tooltipTimer: NodeJS.Timeout;
        
        if (!isBlurred && !hasSeenTutorial) {
            // Set timer to show the tooltip after 1 second
            tooltipTimer = setTimeout(() => {
                setTooltipVisible(true);
                
                // Animate tooltip fade in
                Animated.timing(tooltipOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic)
                }).start();
            }, 1000);
        } else {
            // Hide tooltip when screen is blurred or user has seen tutorial
            setTooltipVisible(false);
            tooltipOpacity.setValue(0);
        }
        
        // Clean up timer
        return () => {
            if (tooltipTimer) clearTimeout(tooltipTimer);
        };
    }, [isBlurred, hasSeenTutorial]);

    // Function to handle tooltip dismissal
    const handleDismissTooltip = async () => {
        // Add haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // Animate out the tooltip
        Animated.timing(tooltipOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
        }).start(async () => {
            setTooltipVisible(false);
            
            // Mark tutorial as seen in state
            setHasSeenTutorial(true);
            
            // Save to AsyncStorage
            try {
                await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
                console.log('Context tutorial marked as seen in AsyncStorage');
            } catch (error) {
                console.error('Error saving tutorial status:', error);
            }
        });
    };

    // Shuffle choices when contextData changes
    useEffect(() => {
        if (contextData?.choices) {
            // Create a copy of the choices array to avoid mutating props
            const choicesCopy = [...contextData.choices];
            // Fisher-Yates shuffle algorithm
            for (let i = choicesCopy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [choicesCopy[i], choicesCopy[j]] = [choicesCopy[j], choicesCopy[i]];
            }
            setShuffledChoices(choicesCopy);
        }
    }, [contextData]);

    const handleContinue = () => {
        setIsBlurred(false);
        // Haptic feedback when continuing
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    // If no data, show loading or placeholder
    if (!contextData) {
        return (
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    <View style={styles.loadingContainer}>
                        <Animated.View style={{ opacity: phraseOpacity }}>
                            <Text style={styles.loadingText}>Loading...</Text>
                        </Animated.View>
                    </View>
                </View>
            </ScrollView>
        );
    }

    const animateConfetti = (buttonRef: any, index: number): void => {
        // Reset all confetti animations
        confettiAnimations.forEach(anim => {
            anim.position.setValue({ x: 0, y: 0 });
            anim.scale.setValue(0);
            anim.opacity.setValue(0);
            anim.rotation.setValue(0);
        });
        
        // Animate each confetti piece
        confettiAnimations.forEach((anim, i) => {
            // Random positions, scales, and rotations
            const angle = (Math.random() * Math.PI * 2);
            const distance = 40 + (Math.random() * 120); // Increased max distance
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance - (Math.random() * 40); // Add some upward bias
            const scale = 0.4 + (Math.random() * 0.8); // Larger particles
            const rotation = Math.random() * 720 - 360; // More rotation range
            
            // Sequence of animations
            Animated.sequence([
                // Wait for a bit for staggered effect
                Animated.delay(i * 15), // Slightly longer delay for better staggering
                // Start the explosion
                Animated.parallel([
                    Animated.timing(anim.position, {
                        toValue: { x, y },
                        duration: 800, // Simple explosion duration
                        useNativeDriver: true,
                        easing: Easing.out(Easing.cubic), // Simple easing
                    }),
                    Animated.timing(anim.scale, {
                        toValue: scale,
                        duration: 800,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.cubic),
                    }),
                    Animated.timing(anim.opacity, {
                        toValue: 1,
                        duration: 200, // Faster appearance
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.rotation, {
                        toValue: rotation,
                        duration: 800, // Matching rotation duration
                        useNativeDriver: true,
                    }),
                ]),
                // Fade out
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                    delay: Math.random() * 200, // Random fade timing
                }),
            ]).start();
        });
    };

    const handleChoice = async (index: number) => {
        // Allow selecting a different option even if one is already selected
        setSelectedIndex(index);
        const isCorrect = shuffledChoices[index].isCorrect;
        
        // Provide haptic feedback for correct answer
        if (isCorrect) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Start confetti animation
            animateConfetti(null, index);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        
        // Animate the phrase to draw attention to it after selection
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.05,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    };

    return (
        <View style={styles.fullScreenContainer}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    {/* Always render the content, but with reduced opacity when blurred */}
                    <Animated.View 
                        style={{ 
                            opacity: isBlurred ? 0.3 : contentOpacity,
                            width: '100%'
                        }}
                    >
                        <Text style={styles.sectionTitle}>KEY PHRASE QUIZ</Text>
                        
                        <View style={{ width: '100%' }}>
                            <Animated.View 
                                style={[
                                    styles.keyPhraseCard,
                                    { 
                                        transform: [{ scale: scaleAnim }],
                                        opacity: phraseOpacity
                                    }
                                ]}
                            >
                                <View style={styles.keyPhraseLabelContainer}>
                                    <Ionicons name="key-outline" size={14} color="#FFFF00" style={styles.iconKey} />
                                    <Text style={styles.keyPhraseLabel}>Key Phrase</Text>
                                </View>

                                <View style={styles.titleRow}>
                                    <Text style={styles.title}>
                                        {translated ? contextData.keyPhraseTranslation : contextData.keyPhrase}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.translateButton}
                                        onPress={() => setTranslated(!translated)}
                                    >
                                        <Ionicons 
                                            name="language" 
                                            size={20} 
                                            color={translated ? "#FFFFFF" : "#888888"} 
                                        />
                                    </TouchableOpacity>
                                </View>
                                
                                {/* Yellow underline for key phrase */}
                                <View style={styles.underlineContainer}>
                                    <View style={styles.yellowUnderline} />
                                </View>
                            </Animated.View>
                        </View>

                        <View style={styles.instructionsContainer}>
                            <Ionicons name="help-circle-outline" size={14} color="#999" />
                            <Text style={styles.subtitle}>
                                Tap the correct situation where you'd use this phrase
                            </Text>
                        </View>

                        <View style={styles.choicesContainer}>
                            {shuffledChoices.map((choice: Choice, i: number) => {
                                return (
                                    <View key={i} style={styles.choiceWrapper}>
                                        <TouchableOpacity
                                            onPress={() => handleChoice(i)}
                                            style={[
                                                styles.choiceButton,
                                                { borderColor: getChoiceColor(choice, i, selectedIndex).outlineColor, 
                                                  backgroundColor: getChoiceColor(choice, i, selectedIndex).bgColor },
                                            ]}
                                            activeOpacity={0.8}
                                            disabled={isBlurred}
                                        >
                                            <Text style={styles.choiceText}>{choice.text}</Text>
                                            {selectedIndex === i && (
                                                <View style={styles.resultIconContainer}>
                                                    <Ionicons 
                                                        name={getChoiceColor(choice, i, selectedIndex).iconName as any}
                                                        size={20} 
                                                        color={choice.isCorrect ? '#5AE15A' : '#E15A5A'} 
                                                    />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                        
                                        {/* Confetti container for correct answers */}
                                        {selectedIndex === i && choice.isCorrect && confettiAnimations.map((anim, index) => (
                                            <Animated.View
                                                key={`confetti-${index}`}
                                                style={[
                                                    styles.confetti,
                                                    {
                                                        width: index % 3 === 0 ? 10 : 8,
                                                        height: index % 3 === 0 ? 6 : 8,
                                                        borderRadius: index % 3 === 0 ? 1 : 4,
                                                        transform: [
                                                            { translateX: anim.position.x },
                                                            { translateY: anim.position.y },
                                                            { scale: anim.scale },
                                                            { rotate: anim.rotation.interpolate({
                                                                inputRange: [-360, 360],
                                                                outputRange: ['-360deg', '360deg']
                                                            })},
                                                        ],
                                                        opacity: anim.opacity,
                                                        backgroundColor: getConfettiColor(index),
                                                    }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>
            
            {/* Extract the blur overlay from ScrollView to make it absolute to the screen */}
            {isBlurred && (
                <View style={styles.fullScreenOverlay}>
                    <BlurView
                        intensity={10}
                        style={StyleSheet.absoluteFill}
                        tint="dark"
                    />
                    <View style={styles.absoluteCentered}>
                        <Text style={styles.watchClipText}>Watch the clip</Text>
                        <Text style={styles.thenText}>then</Text>
                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={handleContinue}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.continueButtonText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            
            {/* Tooltip */}
            {tooltipVisible && (
                <>
                    {/* Full screen blur */}
                    <BlurView 
                        intensity={20} 
                        tint="dark" 
                        style={StyleSheet.absoluteFillObject}
                    />
                    
                    {/* Tooltip on top of the blur */}
                    <Animated.View style={[styles.tooltipContainer, { opacity: tooltipOpacity }]}>
                        <View style={styles.tooltip}>
                            <Text style={styles.tooltipTitle}>Step 2: Answer the key phrase quiz</Text>
                            <TouchableOpacity
                                style={styles.tooltipButton}
                                onPress={handleDismissTooltip}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.tooltipButtonText}>Okay!</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </>
            )}
        </View>
    );
};

// Helper function to generate confetti colors
const getConfettiColor = (index: number): string => {
    const colors = ['#5a51e1', '#51e1a2', '#e15190', '#c4cc45']; // Updated colors as requested
    return colors[index % colors.length];
};

// Helper function to determine choice colors and icons
const getChoiceColor = (choice: Choice, index: number, selectedIndex: number | null) => {
    if (selectedIndex !== index) {
        return {
            outlineColor: 'rgba(255,255,255,0.2)',
            bgColor: 'rgba(255,255,255,0.05)',
            iconName: null
        };
    }
    
    if (choice.isCorrect) {
        return {
            outlineColor: '#5AE15A',
            bgColor: 'rgba(90,225,90,0.1)',
            iconName: "checkmark-circle"
        };
    } else {
        return {
            outlineColor: '#E15A5A',
            bgColor: 'rgba(225,90,90,0.1)',
            iconName: "close-circle"
        };
    }
};

export default ContextView;

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    scrollContainer: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
    },
    scrollContentContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
        padding: 12,
        alignItems: 'center',
    },
    fullScreenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    absoluteCentered: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -100 }, { translateY: -60 }],
        width: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        alignSelf: 'flex-start',
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    keyPhraseCard: {
        width: '100%',
        padding: 16,
        backgroundColor: '#181818', // Changed from purple to #181818
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 20,
    },
    keyPhraseLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    iconKey: {
        marginRight: 4,
    },
    keyPhraseLabel: {
        fontSize: 12,
        color: '#FFFF00',
        fontWeight: '600',
    },
    titleRow: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginHorizontal: 40,
        paddingBottom: 2,
    },
    underlineContainer: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 6,
    },
    yellowUnderline: {
        width: '70%',
        height: 2,
        backgroundColor: '#FFFF00',
        borderRadius: 1,
    },
    translateButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(50, 50, 50, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    instructionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        // Removed background color
        paddingVertical: 6,
        width: '100%',
        justifyContent: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: '#ccc',
        marginLeft: 6,
        textAlign: 'center',
    },
    choicesContainer: {
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
    },
    choiceWrapper: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 4,
        position: 'relative',
    },
    choiceButton: {
        width: '90%', // Made horizontally narrower (from 100% to 90%)
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        position: 'relative',
    },
    choiceText: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        lineHeight: 18,
        paddingRight: 24,
    },
    resultIconContainer: {
        position: 'absolute',
        right: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        top: 0,
    },
    confetti: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        top: '50%',
        left: '50%',
        zIndex: 10, // Ensure confetti appears above other elements
    },
    watchClipText: {
        fontSize: 18,
        color: '#999999',
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: '500',
    },
    thenText: {
        fontSize: 16,
        color: '#999999',
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '400',
    },
    continueButton: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 50,
        backgroundColor: 'rgba(100, 100, 100, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.2)',
    },
    continueButtonText: {
        fontSize: 16,
        color: '#999999',
        fontWeight: '500',
    },
    // Tooltip styles
    tooltipContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: 20,
    },
    tooltip: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    tooltipTitle: {
        fontSize: 18,
        color: '#333333',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 16,
        lineHeight: 24,
    },
    tooltipButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        backgroundColor: '#5a51e1',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },
    tooltipButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
