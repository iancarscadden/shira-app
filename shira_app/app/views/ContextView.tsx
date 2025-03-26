// app/views/ContextView.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
// @ts-ignore
import TranslateIcon from '../components/translate.svg';
import { ContextData, Choice } from '../../supabase/types';
import useUser from '../../hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// For confetti effect
const NUM_CONFETTI = 50;

interface ContextViewProps {
    contextData: ContextData | null;
}

const ContextView: React.FC<ContextViewProps> = ({ contextData }) => {
    const [translated, setTranslated] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [shuffledChoices, setShuffledChoices] = useState<Choice[]>([]);
    const { user } = useUser();
    
    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const phraseOpacity = useRef(new Animated.Value(0)).current;
    
    // Confetti animation values
    const confettiAnimations = useRef(
        Array(NUM_CONFETTI).fill(0).map(() => ({
            position: new Animated.ValueXY({ x: 0, y: 0 }),
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
            rotation: new Animated.Value(0),
        }))
    ).current;
    
    // Start animations when component mounts
    useEffect(() => {
        Animated.sequence([
            Animated.timing(phraseOpacity, {
                toValue: 1,
                duration: 600,
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
    }, []);

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

    // If no data, show loading or placeholder
    if (!contextData) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Animated.View style={{ opacity: phraseOpacity }}>
                        <Text style={styles.loadingText}>Loading...</Text>
                    </Animated.View>
                </View>
            </View>
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
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>KEY PHRASE QUIZ</Text>
            
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
                        <TranslateIcon 
                            width={20} 
                            height={20} 
                            fill={translated ? "#FFFFFF" : "#888888"} 
                        />
                    </TouchableOpacity>
                </View>
                
                {/* Yellow underline for key phrase */}
                <View style={styles.underlineContainer}>
                    <View style={styles.yellowUnderline} />
                </View>
            </Animated.View>

            <View style={styles.instructionsContainer}>
                <Ionicons name="help-circle-outline" size={14} color="#999" />
                <Text style={styles.subtitle}>
                    Tap the correct situation where you'd use this phrase
                </Text>
            </View>

            <View style={styles.choicesContainer}>
                {shuffledChoices.map((choice: Choice, i: number) => {
                    const isSelected = selectedIndex === i;
                    let outlineColor = 'rgba(255,255,255,0.2)';
                    let bgColor = 'rgba(255,255,255,0.05)';
                    let iconName = null;

                    if (isSelected) {
                        if (choice.isCorrect) {
                            outlineColor = '#5AE15A';
                            bgColor = 'rgba(90,225,90,0.1)';
                            iconName = "checkmark-circle";
                        } else {
                            outlineColor = '#E15A5A';
                            bgColor = 'rgba(225,90,90,0.1)';
                            iconName = "close-circle";
                        }
                    }

                    return (
                        <View key={i} style={styles.choiceWrapper}>
                            <TouchableOpacity
                                onPress={() => handleChoice(i)}
                                style={[
                                    styles.choiceButton,
                                    { borderColor: outlineColor, backgroundColor: bgColor },
                                ]}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.choiceText}>{choice.text}</Text>
                                {isSelected && (
                                    <View style={styles.resultIconContainer}>
                                        <Ionicons 
                                            name={iconName as any}
                                            size={20} 
                                            color={choice.isCorrect ? '#5AE15A' : '#E15A5A'} 
                                        />
                                    </View>
                                )}
                            </TouchableOpacity>
                            
                            {/* Confetti container for correct answers */}
                            {isSelected && choice.isCorrect && confettiAnimations.map((anim, index) => (
                                <Animated.View
                                    key={`confetti-${index}`}
                                    style={[
                                        styles.confetti,
                                        {
                                            width: index % 3 === 0 ? 10 : 8, // Varied sizes
                                            height: index % 3 === 0 ? 6 : 8, // Rectangles and squares
                                            borderRadius: index % 3 === 0 ? 1 : 4, // Different shapes
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
        </View>
    );
};

// Helper function to generate confetti colors
const getConfettiColor = (index: number): string => {
    const colors = ['#5a51e1', '#51e1a2', '#e15190', '#c4cc45']; // Updated colors as requested
    return colors[index % colors.length];
};

export default ContextView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
        padding: 12,
        alignItems: 'center',
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
});
