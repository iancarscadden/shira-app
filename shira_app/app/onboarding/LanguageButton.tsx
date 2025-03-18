// app/onboarding/LanguageButton.tsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './styles';

interface LanguageButtonProps {
    emoji: string;
    language: string;
    onPress: () => void;
    selected: boolean;
    style?: ViewStyle;
    disabled?: boolean;
    comingSoon?: boolean;
}

const LanguageButton: React.FC<LanguageButtonProps> = ({ 
    emoji, 
    language, 
    onPress, 
    selected, 
    style,
    disabled = false,
    comingSoon = false
}) => {
    const [scaleAnim] = useState(new Animated.Value(1));
    const [pulseAnim] = useState(new Animated.Value(0));
    
    useEffect(() => {
        if (selected) {
            // Create a pulsing effect when selected
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            // Stop the animation when not selected
            pulseAnim.setValue(0);
        }
    }, [selected]);
    
    const handlePressIn = () => {
        if (disabled) return;
        Animated.timing(scaleAnim, {
            toValue: 0.97,
            duration: 100,
            useNativeDriver: true,
        }).start();
    };
    
    const handlePressOut = () => {
        if (disabled) return;
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };
    
    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.03]
    });
    
    return (
        <Animated.View 
            style={[
                styles.container,
                { transform: [{ scale: scaleAnim }] },
                selected && { transform: [{ scale: Animated.multiply(scaleAnim, pulseScale) }] },
                style
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={disabled ? 1 : 0.8}
                style={styles.touchable}
                disabled={disabled}
            >
                {selected ? (
                    <LinearGradient
                        colors={[colors.selectionActiveBorder, 'rgba(90, 81, 225, 0.7)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.selectedButton}
                    >
                        <View style={styles.contentContainer}>
                            <Text style={styles.emoji}>{emoji}</Text>
                            <Text style={[styles.text, styles.selectedText]}>{language}</Text>
                            {comingSoon && <Text style={styles.comingSoonBadge}>Coming Soon</Text>}
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={[
                        styles.button,
                        disabled && styles.buttonDisabled
                    ]}>
                        <View style={styles.contentContainer}>
                            <Text style={[styles.emoji, disabled && styles.textDisabled]}>{emoji}</Text>
                            <Text style={[styles.text, disabled && styles.textDisabled]}>{language}</Text>
                            {comingSoon && <Text style={styles.comingSoonBadge}>Coming Soon</Text>}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '90%',
        marginVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
        // Shadow for iOS
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 3,
    },
    touchable: {
        width: '100%',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.selectionBackground,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.selectionBorder,
    },
    buttonDisabled: {
        opacity: 0.6,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    selectedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    emoji: {
        fontSize: 24,
        marginRight: 15,
    },
    text: {
        color: colors.text,
        fontSize: 16,
        flex: 1,
    },
    textDisabled: {
        color: colors.mutedText,
    },
    selectedText: {
        color: colors.text,
        fontWeight: 'bold',
    },
    comingSoonBadge: {
        fontSize: 12,
        color: colors.secondary,
        fontWeight: '600',
        backgroundColor: 'rgba(71, 163, 73, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
});

export default LanguageButton;
