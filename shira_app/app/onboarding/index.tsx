// app/onboarding/index.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from './styles';
import OnboardingStep1 from './OnboardingStep1';
import OnboardingStep2 from './OnboardingStep2';
import OnboardingStep3 from './OnboardingStep3';
import OnboardingStep5 from './OnboardingStep5';
import OnboardingStep6 from './OnboardingStep6';
import { useRouter } from 'expo-router';
import PaywallScreen from './PaywallScreen';
export default function OnboardingScreen() {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const router = useRouter();

    const handleNext = () => {
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        setCurrentStep(4); // Skip to OnboardingStep5 instead of PaywallScreen
    };

    const handleLanguageSelect = (language: string) => {
        setSelectedLanguage(language);
        handleNext();
    };

    const handleFinishOnboarding = () => {
        router.replace('/');
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <OnboardingStep1 onStartJourney={handleNext} />;
            case 2:
                return (
                    <OnboardingStep2
                        onContinue={handleLanguageSelect}
                        onBack={handleBack}
                    />
                );
            case 3:
                return (
                    <OnboardingStep3
                        onContinue={handleNext}
                        onBack={handleBack}
                        onSkip={handleSkip}
                    />
                );
            case 4:
                return (
                    <OnboardingStep5
                        onContinue={handleNext}
                        onBack={handleBack}
                        selectedLanguage={selectedLanguage}
                    />
                );
            case 5:
                return (
                    <OnboardingStep6
                        onContinue={handleNext}
                        onBack={handleBack}
                    />
                );
            case 6:
                return (
                    <PaywallScreen
                        onClose={handleFinishOnboarding}
                        onContinue={handleFinishOnboarding}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {renderStep()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,
});
