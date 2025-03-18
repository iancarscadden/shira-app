// app/onboarding/OnboardingStep2.tsx

import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    Alert,
    Animated,
    Dimensions,
    ViewStyle,
    TextStyle
} from 'react-native';
import { sharedStyles, colors } from './styles';
import CustomButton from './CustomButton';
import LanguageButton from './LanguageButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Define our purple color constants
const PURPLE_COLOR = '#5a51e1';
const PURPLE_LIGHT = '#7a72e9';
const PURPLE_DISABLED = 'rgba(90, 81, 225, 0.5)'; // Semi-transparent purple

type OnboardingStep2Props = {
    onContinue: (selectedLanguage: string) => void;
    onBack: () => void;
};

const { width, height } = Dimensions.get('window');

const OnboardingStep2: React.FC<OnboardingStep2Props> = ({ onContinue, onBack }) => {
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(30));

    useEffect(() => {
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
            })
        ]).start();
    }, []);

    const handleLanguageSelect = (language: string, isComingSoon: boolean = false) => {
        if (isComingSoon) {
            Alert.alert(
                "Coming Soon!",
                `${language} courses are coming soon! Stay tuned for updates.`,
                [{ text: "OK", style: "default" }]
            );
            return;
        }
        setSelectedLanguage(prev => (prev === language ? null : language));
    };

    const handleContinue = async () => {
        if (!selectedLanguage) {
            Alert.alert('Please Select', 'Please select a language to continue.');
            return;
        }

        try {
            await AsyncStorage.setItem('targetLang', selectedLanguage);
            onContinue(selectedLanguage);
        } catch (error) {
            console.error('AsyncStorage Error:', error);
            Alert.alert('Error', 'Failed to save language selection. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBlock}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <Animated.View style={[
                styles.mainContent,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>Choose your language</Text>
                    <Text style={styles.subHeaderText}>What language would you like to learn?</Text>
                </View>

                <View style={styles.languagesContainer}>
                    <LanguageButton
                        emoji="🇪🇸"
                        language="Spanish"
                        onPress={() => handleLanguageSelect('Spanish')}
                        selected={selectedLanguage === 'Spanish'}
                        style={styles.languageButton}
                    />
                    
                    {/* Coming Soon Languages */}
                    <LanguageButton
                        emoji="🇫🇷"
                        language="French"
                        onPress={() => handleLanguageSelect('French', true)}
                        selected={false}
                        disabled={true}
                        comingSoon={true}
                        style={styles.languageButton}
                    />
                    
                    <LanguageButton
                        emoji="🇮🇹"
                        language="Italian"
                        onPress={() => handleLanguageSelect('Italian', true)}
                        selected={false}
                        disabled={true}
                        comingSoon={true}
                        style={styles.languageButton}
                    />
                    
                    <LanguageButton
                        emoji="🇸🇦"
                        language="Arabic"
                        onPress={() => handleLanguageSelect('Arabic', true)}
                        selected={false}
                        disabled={true}
                        comingSoon={true}
                        style={styles.languageButton}
                    />
                </View>
            </Animated.View>

            <View style={styles.buttonSection}>
                <CustomButton 
                    title="Continue" 
                    onPress={handleContinue}
                    gradientColors={[PURPLE_COLOR, PURPLE_LIGHT]}
                    disabledGradientColors={[PURPLE_DISABLED, PURPLE_DISABLED]}
                    icon={<Ionicons name="arrow-forward" size={18} color={colors.text} />}
                    iconPosition="right"
                    disabled={!selectedLanguage}
                    style={styles.continueButton}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
    } as ViewStyle,
    topBlock: {
        paddingTop: 50,
        marginBottom: 20,
    } as ViewStyle,
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    mainContent: {
        flex: 1,
    } as ViewStyle,
    headerContainer: {
        marginBottom: 40,
    } as ViewStyle,
    headerText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    } as TextStyle,
    subHeaderText: {
        fontSize: 18,
        color: colors.subText,
        textAlign: 'center',
        lineHeight: 24,
    } as TextStyle,
    languagesContainer: {
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
    } as ViewStyle,
    languageButton: {
        marginBottom: 16,
        width: '100%',
    } as ViewStyle,
    buttonSection: {
        alignItems: 'center',
        marginBottom: 40,
    } as ViewStyle,
    continueButton: {
        // Custom styles for the continue button if needed
    } as ViewStyle,
});

export default OnboardingStep2;
