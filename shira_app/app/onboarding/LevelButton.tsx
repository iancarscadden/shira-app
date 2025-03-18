// app/onboarding/LevelButton.tsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './styles';

type LevelButtonProps = {
    label: string;
    onPress: () => void;
    selected: boolean;
    style?: ViewStyle;
    icon?: keyof typeof Ionicons.glyphMap;
};

const LevelButton: React.FC<LevelButtonProps> = ({ 
    label, 
    onPress, 
    selected, 
    style,
    icon
}) => {
    const [scaleAnim] = useState(new Animated.Value(1));
    const [fadeAnim] = useState(new Animated.Value(selected ? 1 : 0));
    
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: selected ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [selected]);
    
    const handlePressIn = () => {
        Animated.timing(scaleAnim, {
            toValue: 0.97,
            duration: 100,
            useNativeDriver: true,
        }).start();
    };
    
    const handlePressOut = () => {
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };
    
    // Get icon based on level
    const getIcon = (): keyof typeof Ionicons.glyphMap => {
        if (icon) return icon;
        
        if (label.includes("barely")) {
            return "leaf-outline";
        } else if (label.includes("some")) {
            return "school-outline";
        } else if (label.includes("fluently")) {
            return "star-outline";
        }
        return "chatbubble-outline";
    };
    
    return (
        <Animated.View 
            style={[
                styles.container,
                { transform: [{ scale: scaleAnim }] },
                style
            ]}
        >
            <TouchableOpacity
                style={styles.touchable}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.8}
            >
                {selected ? (
                    <LinearGradient
                        colors={[colors.primary, 'rgba(90, 81, 225, 0.7)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.buttonSelected}
                    >
                        <View style={styles.contentContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={getIcon()} size={22} color={colors.text} />
                            </View>
                            <Text style={[styles.label, styles.labelSelected]}>{label}</Text>
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={styles.button}>
                        <View style={styles.contentContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={getIcon()} size={22} color={colors.subText} />
                            </View>
                            <Text style={styles.label}>{label}</Text>
                        </View>
                    </View>
                )}
                
                <Animated.View 
                    style={[
                        styles.checkmark,
                        { opacity: fadeAnim }
                    ]}
                >
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                </Animated.View>
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
        position: 'relative',
    },
    button: {
        backgroundColor: colors.selectionBackground,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.selectionBorder,
    },
    buttonSelected: {
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 12,
    },
    label: {
        fontSize: 16,
        color: colors.text,
        fontWeight: 'normal',
    },
    labelSelected: {
        fontWeight: 'bold',
    },
    checkmark: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -11, // Half of icon size
    }
});

export default LevelButton;
