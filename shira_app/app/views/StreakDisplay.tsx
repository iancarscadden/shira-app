import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface StreakDisplayProps {
    visible: boolean;
    streak: number;
    currentXP: number;
    xpPerLevel: number;
    onAnimationComplete: () => void;
}

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = 260;

const StreakDisplay: React.FC<StreakDisplayProps> = ({
    visible,
    streak,
    currentXP,
    xpPerLevel,
    onAnimationComplete,
}) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(100)).current;

    useEffect(() => {
        if (visible) {
            // Animate in
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(1.5)),
                }),
            ]).start();
        } else {
            // Reset animation values when not visible
            opacity.setValue(0);
            translateY.setValue(100);
        }
    }, [visible, opacity, translateY]);

    const handleClose = () => {
        // Animate out
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.in(Easing.cubic),
            }),
            Animated.timing(translateY, {
                toValue: 100,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.in(Easing.cubic),
            }),
        ]).start(() => {
            onAnimationComplete();
        });
    };

    if (!visible) return null;

    // Calculate level and progress
    const currentLevel = Math.floor(currentXP / xpPerLevel);
    const nextLevel = currentLevel + 1;
    const xpInCurrentLevel = currentXP - (currentLevel * xpPerLevel);
    const progressPercentage = (xpInCurrentLevel / xpPerLevel) * 100;
    const xpNeeded = xpPerLevel - xpInCurrentLevel;

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.cardContainer,
                    {
                        opacity,
                        transform: [{ translateY }],
                    },
                ]}
            >
                {Platform.OS === 'ios' ? (
                    <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
                        <View style={styles.cardContent}>
                            {renderCardContent(streak, currentLevel, nextLevel, progressPercentage, xpNeeded, handleClose)}
                        </View>
                    </BlurView>
                ) : (
                    <LinearGradient
                        colors={['rgba(60, 60, 80, 0.9)', 'rgba(30, 30, 50, 0.95)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientContainer}
                    >
                        <View style={styles.cardContent}>
                            {renderCardContent(streak, currentLevel, nextLevel, progressPercentage, xpNeeded, handleClose)}
                        </View>
                    </LinearGradient>
                )}
            </Animated.View>
        </View>
    );
};

// Separate function to render card content to avoid duplication
const renderCardContent = (
    streak: number, 
    currentLevel: number, 
    nextLevel: number, 
    progressPercentage: number, 
    xpNeeded: number,
    handleClose: () => void
) => (
    <>
        {/* Streak Row - Centered with all elements in a row */}
        <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>STREAK</Text>
            <Ionicons name="flash" size={32} color="#FFD700" style={styles.streakIcon} />
            <View style={styles.streakValueContainer}>
                <Text style={styles.streakValue}>{streak}</Text>
                <Text style={styles.streakDays}>days</Text>
            </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Level Row */}
        <View style={styles.levelContainer}>
            <View style={styles.levelLabelRow}>
                <Text style={styles.levelLabel}>LEVEL {currentLevel}</Text>
                <Text style={styles.nextLevelLabel}>LEVEL {nextLevel}</Text>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
            </View>
            
            <Text style={styles.xpText}>
                {xpNeeded} XP to next level
            </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={handleClose}>
            <Text style={styles.continueButtonText}>CONTINUE</Text>
        </TouchableOpacity>
    </>
);

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 100,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)', // Make background more dim
    },
    cardContainer: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    blurContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        overflow: 'hidden',
    },
    gradientContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    cardContent: {
        padding: 24,
        flex: 1,
        justifyContent: 'space-between',
        // Add pearlescent effect with shadow
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    streakRow: {
        flexDirection: 'row',
        justifyContent: 'center', // Center the streak row
        alignItems: 'center',
        marginBottom: 20,
    },
    streakLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginRight: 8,
    },
    streakIcon: {
        marginHorizontal: 10, // Add space on both sides
    },
    streakValueContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginLeft: 10,
    },
    streakValue: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    streakDays: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
        marginLeft: 4,
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 15,
        width: '100%',
    },
    levelContainer: {
        marginBottom: 25,
    },
    levelLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    levelLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    nextLevelLabel: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#5a51e1',
        borderRadius: 6,
        shadowColor: '#5a51e1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    xpText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginTop: 4,
    },
    continueButton: {
        backgroundColor: '#5a51e1',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#5a51e1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default StreakDisplay; 