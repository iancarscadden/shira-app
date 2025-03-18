// app/onboarding/styles.ts
import { StyleSheet } from 'react-native';

export const colors = {
    // Core colors
    background: '#1a1a1a',           // Dark background
    primary: '#a347a1',             // Purple accent color
    secondary: '#47a349',           // Green accent color
    tertiary: '#51e1a2',            // Teal accent color
    accent: '#c4cc45',              // Yellow accent
    
    // Gradient combinations
    gradientPrimary: ['#a347a1', '#b868b6'],  // Purple gradient
    gradientSecondary: ['#47a349', '#68b669'], // Green gradient
    gradientMixed: ['#47a349', '#a347a1'],    // Green to purple gradient
    gradientCool: ['#a347a1', '#51e1a2'],     // Purple to teal gradient
    gradientWarm: ['#a347a1', '#c4cc45'],     // Purple to yellow gradient
    
    // Text colors
    text: '#FFFFFF',                // White text
    subText: 'rgba(255, 255, 255, 0.7)',  // Semi-transparent white
    mutedText: 'rgba(255, 255, 255, 0.5)', // More transparent white
    
    // UI elements
    buttonText: '#FFFFFF',          // White text
    buttonBackground: '#a347a1',    // Purple buttons
    buttonDisabled: 'rgba(163, 71, 161, 0.5)',    // Semi-transparent purple
    
    // Progress elements
    progressBarBackground: 'rgba(255, 255, 255, 0.1)',
    progressBarFill: '#a347a1',
    
    // Selection elements
    selectionBackground: 'rgba(255, 255, 255, 0.08)',
    selectionBorder: 'rgba(255, 255, 255, 0.12)',
    selectionActive: 'rgba(163, 71, 161, 0.2)',
    selectionActiveBorder: '#a347a1',
    
    // Button states
    languageButton: 'rgba(255, 255, 255, 0.08)',  // Semi-transparent white
    languageButtonSelected: 'rgba(163, 71, 161, 0.2)',
    levelButton: 'rgba(255, 255, 255, 0.08)',
    levelButtonSelected: 'rgba(163, 71, 161, 0.2)',
    
    // Shadows and overlays
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Status colors
    success: '#47a349',
    error: '#FF5252',
    warning: '#FFC107',
    info: '#2196F3',
};

export const sharedStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 0, // Remove default padding to allow full-width gradients
    },
    innerContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: colors.subText,
        textAlign: 'center',
        lineHeight: 24,
    },
    buttonContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    loginText: {
        fontSize: 14,
        color: colors.text,
        textAlign: 'center',
    },
    login: {
        fontWeight: '600',
        textDecorationLine: 'underline',
        color: colors.primary,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: colors.progressBarBackground,
        borderRadius: 3,
        width: '100%',
        marginBottom: 24,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.progressBarFill,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        width: '100%',
        marginBottom: 30,
    },
    backButton: {
        alignSelf: 'flex-start',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    backArrow: {
        fontSize: 20,
        color: colors.text,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    cardSelected: {
        backgroundColor: 'rgba(163, 71, 161, 0.2)',
        borderColor: colors.primary,
    },
    // Animation helpers
    fadeIn: {
        opacity: 1,
    },
    fadeOut: {
        opacity: 0,
    },
});

export default sharedStyles;
