// app/(tabs)/components/CustomButton.tsx

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';

type CustomButtonProps = {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle; // Optional prop to allow custom styling
};

const CustomButton: React.FC<CustomButtonProps> = ({
                                                       title,
                                                       onPress,
                                                       disabled = false,
                                                       loading = false,
                                                       style,
                                                   }) => {
    return (
        <TouchableOpacity
            style={[styles.button, disabled && styles.buttonDisabled, style]}
            onPress={onPress}
            accessibilityLabel={title}
            accessibilityRole="button"
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color="#ffffff" />
            ) : (
                <Text style={styles.buttonText}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#6A0DAD', // Purple color
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        // Elevation for Android
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10, // Added vertical spacing between buttons
    },
    buttonDisabled: {
        backgroundColor: '#A020F0', // Lighter purple for disabled state
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CustomButton;
