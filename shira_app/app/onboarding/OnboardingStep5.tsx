// app/onboarding/OnboardingStep5.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    ViewStyle, 
    Animated,
    Dimensions,
    Easing,
    ScrollView,
    TextStyle,
    Alert
} from 'react-native';
import { sharedStyles, colors } from './styles';
import CustomButton from './CustomButton';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define our custom colors
const PURPLE_COLOR = '#5a51e1';
const PINK_COLOR = '#e15190';

type VideoGoalButtonProps = {
    icon: string;
    count: number;
    description: string;
    onPress: () => void;
    selected: boolean;
    style?: ViewStyle;
};

const { width, height } = Dimensions.get('window');

const VideoGoalButton: React.FC<VideoGoalButtonProps> = ({ 
    icon, 
    count, 
    description, 
    onPress, 
    selected,
    style 
}) => {
    const [scaleAnim] = useState(new Animated.Value(1));
    const [pulseAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(selected ? 0 : 30));
    
    useEffect(() => {
        // Slide in animation when component mounts
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
        }).start();
        
        // Pulse animation when selected
        if (selected) {
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
            pulseAnim.setValue(0);
        }
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
    
    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.03]
    });
    
    return (
        <Animated.View 
            style={[
                videoGoalStyles.container,
                { 
                    transform: [
                        { scale: scaleAnim },
                        { translateX: slideAnim }
                    ],
                },
                selected && { 
                    transform: [
                        { scale: Animated.multiply(scaleAnim, pulseScale) },
                        { translateX: slideAnim }
                    ] 
                },
                style
            ]}
        >
            <TouchableOpacity
                style={videoGoalStyles.touchable}
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
                        style={videoGoalStyles.buttonSelected}
                    >
                        <View style={videoGoalStyles.iconContainer}>
                            <Text style={videoGoalStyles.icon}>{icon}</Text>
                        </View>
                        <View style={videoGoalStyles.textContainer}>
                            <Text style={[videoGoalStyles.countText, videoGoalStyles.selectedText]}>
                                {count} videos daily
                            </Text>
                            <Text style={[videoGoalStyles.descriptionText, videoGoalStyles.selectedSubText]}>
                                {description}
                            </Text>
                        </View>
                        <View style={videoGoalStyles.checkContainer}>
                            <Ionicons name="checkmark-circle" size={24} color={colors.text} />
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={videoGoalStyles.button}>
                        <View style={videoGoalStyles.iconContainer}>
                            <Text style={videoGoalStyles.icon}>{icon}</Text>
                        </View>
                        <View style={videoGoalStyles.textContainer}>
                            <Text style={videoGoalStyles.countText}>{count} videos daily</Text>
                            <Text style={videoGoalStyles.descriptionText}>{description}</Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

interface Question {
    id: string;
    text: string;
    options: string[];
    key?: string;
    required?: boolean;
}

type OnboardingStep5Props = {
    onContinue: () => void;
    onBack: () => void;
    selectedLanguage: string;
};

const OnboardingStep5: React.FC<OnboardingStep5Props> = ({ onContinue, onBack, selectedLanguage }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
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
            }),
        ]).start();
    }, [currentQuestionIndex]);

    const handleOptionSelect = async (option: string) => {
        const currentQuestion = questions[currentQuestionIndex];
        const newAnswers = { ...answers, [currentQuestion.id]: option };
        setAnswers(newAnswers);

        // Store the answer in AsyncStorage
        await AsyncStorage.setItem(currentQuestion.id, option);

        // If this is the time commitment question, store it as daily_goal
        if (currentQuestion.key === 'daily_goal') {
            const videoCount = getVideoCountFromTimeCommitment(option);
            await AsyncStorage.setItem('daily_goal', String(videoCount));
        }

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            onContinue();
        }
    };

    const getVideoCountFromTimeCommitment = (timeOption: string): number => {
        switch (timeOption) {
            case '5 minutes':
                return 3;
            case '10 minutes':
                return 5;
            case '15 minutes':
                return 8;
            case '30 minutes':
                return 12;
            case '60+ minutes':
                return 20;
            default:
                return 5;
        }
    };

    // Create questions array with dynamic language text
    const questions: Question[] = [
        {
            id: 'reason',
            text: `What is your main reason for learning ${selectedLanguage}?`,
            options: [
                'I want to travel and explore new cultures',
                'I need language skills for career advancement',
                'I\'m preparing for study abroad',
                'I\'m looking to connect socially',
                'I\'m learning for personal enrichment'
            ],
        },
        {
            id: 'challenge',
            text: 'What is your biggest challenge when learning a new language?',
            options: [
                'Struggling with spontaneous speaking',
                'Difficulty retaining vocabulary',
                'Confusing cultural nuances',
                'Challenging grammar structures',
                'Feeling anxious about practicing'
            ],
        },
        {
            id: 'methods',
            text: 'What methods are you currently using to learn?',
            options: [
                'Mobile apps and short-form videos',
                'Traditional classes or tutoring',
                'Language exchange programs',
                'Self-study with books and podcasts',
                'Mix of digital courses and platforms'
            ],
        },
        {
            id: 'time',
            text: 'How much time can you commit to learning each day?',
            options: [
                '5 minutes',
                '10 minutes',
                '15 minutes',
                '30 minutes',
                '60+ minutes'
            ],
            key: 'daily_goal',
            required: true,
        },
        {
            id: 'cultural',
            text: 'What cultural aspects are you most interested in?',
            options: [
                'Local idioms and expressions',
                'Social norms and etiquette',
                'Historical and cultural contexts',
                'Modern slang and colloquial language',
                'Regional traditions and culture'
            ],
        },
    ];

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <View style={styles.topBlock}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>

                </View>

                <Animated.View
                    style={[
                        styles.mainContent,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <Text style={styles.questionText}>
                        {currentQuestion.text}
                        {currentQuestion.required && currentQuestion.id !== 'time' && <Text style={styles.requiredIndicator}> *</Text>}
                    </Text>

                    <ScrollView 
                        style={styles.optionsContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {currentQuestion.options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.optionButton,
                                    answers[currentQuestion.id] === option && styles.optionButtonSelected,
                                ]}
                                onPress={() => handleOptionSelect(option)}
                            >
                                <Text style={[
                                    styles.optionText,
                                    answers[currentQuestion.id] === option && styles.optionTextSelected,
                                ]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {!currentQuestion.required && (
                        <TouchableOpacity 
                            style={styles.skipButton}
                            onPress={() => {
                                if (currentQuestionIndex < questions.length - 1) {
                                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                                } else {
                                    onContinue();
                                }
                            }}
                        >
                            <Text style={styles.skipText}>Skip this question</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>

            <View style={styles.continueButtonContainer}>
                <CustomButton
                    title="Continue"
                    onPress={() => {
                        if (currentQuestion.required && !answers[currentQuestion.id]) {
                            Alert.alert('Required Question', 'Please select an option to continue.');
                            return;
                        }
                        if (currentQuestionIndex < questions.length - 1) {
                            setCurrentQuestionIndex(currentQuestionIndex + 1);
                        } else {
                            onContinue();
                        }
                    }}
                    gradientColors={[PURPLE_COLOR, PURPLE_COLOR]}
                    icon={<Ionicons name="arrow-forward" size={18} color={colors.text} />}
                    iconPosition="right"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    topBlock: {
        paddingTop: 50,
        marginBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerContainer: {
        marginBottom: 30,
    },
    headerText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    subHeaderText: {
        fontSize: 16,
        color: colors.subText,
        textAlign: 'center',
    },
    videoGoalsContainer: {
        alignItems: 'center',
        width: '100%',
        marginTop: 10,
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(90, 81, 225, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        marginHorizontal: 10,
    },
    tipIcon: {
        marginRight: 10,
    },
    tipText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    continueButtonContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: PINK_COLOR,
        borderRadius: 2,
    },
    mainContent: {
        flex: 1,
        paddingTop: 20,
    },
    questionText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 32,
        lineHeight: 32,
    },
    optionsContainer: {
        flex: 1,
    },
    optionButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    optionButtonSelected: {
        backgroundColor: 'rgba(71, 163, 73, 0.2)',
        borderColor: colors.secondary,
    },
    optionText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    optionTextSelected: {
        color: colors.text,
        fontWeight: '600',
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 20,
    },
    skipText: {
        fontSize: 16,
        color: colors.subText,
        textDecorationLine: 'underline',
    },
    requiredIndicator: {
        color: colors.secondary,
        fontSize: 16,
    } as TextStyle,
});

const videoGoalStyles = StyleSheet.create({
    container: {
        width: '90%',
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
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    buttonSelected: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    icon: {
        fontSize: 22,
    },
    textContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        flex: 1,
    },
    countText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    descriptionText: {
        fontSize: 14,
        color: colors.subText,
    },
    selectedText: {
        color: colors.text,
    },
    selectedSubText: {
        color: 'rgba(255, 255, 255, 0.9)',
    },
    checkContainer: {
        marginLeft: 10,
    },
});

export default OnboardingStep5;
