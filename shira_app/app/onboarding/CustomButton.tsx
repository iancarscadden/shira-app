// app/onboarding/CustomButton.tsx

import React, { useState } from 'react';
import { 
    TouchableOpacity, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    ViewStyle, 
    Animated,
    Easing,
    View,
    TextStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './styles';

interface CustomButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    gradientColors?: string[];
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    variant?: 'filled' | 'outlined' | 'text';
    disabledGradientColors?: [string, string];
}

const CustomButton: React.FC<CustomButtonProps> = ({ 
    title, 
    onPress, 
    disabled = false, 
    loading = false, 
    style,
    textStyle,
    gradientColors = colors.gradientPrimary,
    icon,
    iconPosition = 'left',
    variant = 'filled',
    disabledGradientColors
}) => {
    const [scaleAnim] = useState(new Animated.Value(1));
    
    const handlePressIn = () => {
        Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
        }).start();
    };
    
    const handlePressOut = () => {
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
        }).start();
    };

    // Use custom disabled colors if provided, otherwise use default
    const disabledColors = disabledGradientColors ? 
        disabledGradientColors as [string, string] : 
        [colors.buttonDisabled, colors.buttonDisabled] as [string, string];

    const renderButtonContent = () => (
        <>
            {loading ? (
                <ActivityIndicator color={variant === 'filled' ? colors.text : gradientColors[0]} size="small" />
            ) : (
                <View style={styles.contentContainer}>
                    {icon && iconPosition === 'left' && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={[
                        styles.buttonText, 
                        variant === 'outlined' && { color: gradientColors[0] },
                        variant === 'text' && { color: gradientColors[0] },
                        textStyle
                    ]}>
                        {title}
                    </Text>
                    {icon && iconPosition === 'right' && <View style={styles.iconContainer}>{icon}</View>}
                </View>
            )}
        </>
    );

    if (variant === 'filled') {
        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={[styles.buttonContainer, style]}
                    onPress={onPress}
                    disabled={disabled || loading}
                    activeOpacity={0.9}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <LinearGradient
                        colors={disabled ? disabledColors : [gradientColors[0], gradientColors[1]] as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.button, disabled && styles.buttonDisabled]}
                    >
                        {renderButtonContent()}
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    } else if (variant === 'outlined') {
        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={[
                        styles.buttonContainer,
                        styles.buttonOutlined,
                        { borderColor: disabled ? colors.buttonDisabled : gradientColors[0] },
                        style
                    ]}
                    onPress={onPress}
                    disabled={disabled || loading}
                    activeOpacity={0.7}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    {renderButtonContent()}
                </TouchableOpacity>
            </Animated.View>
        );
    } else {
        // Text button
        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={[styles.textButtonContainer, style]}
                    onPress={onPress}
                    disabled={disabled || loading}
                    activeOpacity={0.7}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    {renderButtonContent()}
                </TouchableOpacity>
            </Animated.View>
        );
    }
};

const styles = StyleSheet.create({
    buttonContainer: {
        borderRadius: 30,
        overflow: 'hidden',
        // Shadow for iOS
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        // Elevation for Android
        elevation: 8,
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonOutlined: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        paddingVertical: 14, // Adjust for border
        paddingHorizontal: 58, // Adjust for border
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: colors.buttonText,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    textButtonContainer: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginHorizontal: 8,
    }
});

export default CustomButton;
