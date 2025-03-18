import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Animated,
    ScrollView,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import TranslateIcon from '../components/translate.svg';
import TypingIndicator from '../components/TypingIndicator';
import { supabase } from '@/supabase/supabaseClient';
import { addPhraseToWorkOn, markPhraseMastered, UserPhrase, MasteredPhrase } from '@/supabase/progressService';
import { LinearGradient } from 'expo-linear-gradient';

const CLOUD_FUNCTION_URL = 'https://us-central1-shira-9828b.cloudfunctions.net/transcribeAndEvaluate';
// This is the exact phrase that indicates mastery
const MASTERY_PHRASE = "Great Job! You have mastered the phrase.";

interface PracticeCardProps {
    visible: boolean;
    onClose: () => void;
    phrase: UserPhrase | MasteredPhrase;
    isFromMasteredView?: boolean;
    onPhraseMastered?: () => void;
}

const PracticeCard: React.FC<PracticeCardProps> = ({ 
    visible, 
    onClose, 
    phrase, 
    isFromMasteredView = false,
    onPhraseMastered
}) => {
    // State
    const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [showMicInstructions, setShowMicInstructions] = useState(true);
    const [isTranslated, setIsTranslated] = useState(false);
    const [isTypingUser, setIsTypingUser] = useState(false);
    const [isTypingAI, setIsTypingAI] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [lastEvaluationResult, setLastEvaluationResult] = useState<{
        transcript: string;
        rating: string;
        explanation: string;
    } | null>(null);
    const [showMasteredToast, setShowMasteredToast] = useState(false);
    
    // Refs
    const scrollViewRef = useRef<ScrollView>(null);
    
    // Animation values
    const micScale = useRef(new Animated.Value(1)).current;
    const instructionsOpacity = useRef(new Animated.Value(1)).current;
    const toastOpacity = useRef(new Animated.Value(0)).current;

    // Get the current user ID
    useEffect(() => {
        const fetchUserId = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        
        fetchUserId();
    }, []);

    // Initialize messages when the modal becomes visible
    useEffect(() => {
        if (visible) {
            // Only set initial messages when modal becomes visible
            setMessages([{
                text: isTranslated ? phrase.phrase_prompt_translation : phrase.phrase_prompt,
                isUser: false
            }]);
            setLastEvaluationResult(null);
            setShowMasteredToast(false);
        } else {
            // When translation changes, only update the first message
            const updatedMessages = [...messages];
            if (updatedMessages.length > 0) {
                updatedMessages[0] = {
                    text: isTranslated ? phrase.phrase_prompt_translation : phrase.phrase_prompt,
                    isUser: false
                };
                setMessages(updatedMessages);
            }
        }
    }, [visible, phrase]);

    // Handle translation changes separately
    useEffect(() => {
        if (!visible) return; // Don't update if modal is not visible
        
        const updatedMessages = [...messages];
        if (updatedMessages.length > 0) {
            updatedMessages[0] = {
                text: isTranslated ? phrase.phrase_prompt_translation : phrase.phrase_prompt,
                isUser: false
            };
            setMessages(updatedMessages);
        }
    }, [isTranslated]);

    // Handle phrase tracking when evaluation results change
    useEffect(() => {
        const trackPhrase = async () => {
            if (!userId || !phrase || !lastEvaluationResult) return;
            
            const isMastered = lastEvaluationResult.rating.includes(MASTERY_PHRASE);
            
            if (isMastered && !isFromMasteredView) {
                // If mastered, move to mastered_phrases if it was in user_phrases
                console.log('Phrase mastered, moving to mastered phrases');
                const success = await markPhraseMastered(userId, phrase.target_phrase);
                
                if (success) {
                    // Show mastered toast
                    setShowMasteredToast(true);
                    Animated.timing(toastOpacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                    
                    // Hide toast and close modal after delay
                    setTimeout(() => {
                        Animated.timing(toastOpacity, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }).start(() => {
                            setShowMasteredToast(false);
                            if (onPhraseMastered) {
                                onPhraseMastered();
                            }
                            setTimeout(() => {
                                onClose();
                            }, 200);
                        });
                    }, 1500);
                }
            }
        };
        
        trackPhrase();
    }, [lastEvaluationResult, userId, phrase, isFromMasteredView, onPhraseMastered, onClose, toastOpacity]);

    const toggleRecording = async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Update recording configuration to match Google Speech-to-Text requirements
            const { recording: newRecording } = await Audio.Recording.createAsync({
                isMeteringEnabled: true,
                android: {
                    extension: '.wav',
                    outputFormat: Audio.AndroidOutputFormat.WEBM,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.wav',
                    audioQuality: Audio.IOSAudioQuality.HIGH,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {
                    mimeType: 'audio/webm',
                    bitsPerSecond: 128000,
                }
            });
            
            setRecording(newRecording);
            setIsRecording(true);
            
            // Animate mic button
            Animated.sequence([
                Animated.timing(micScale, {
                    toValue: 0.8,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(micScale, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert(
                "Recording Error",
                "Failed to start recording. Please check microphone permissions and try again."
            );
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        setShowMicInstructions(false);
        
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (!uri) throw new Error('No recording URI available');
            
            await processRecording(uri);
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
        setRecording(null);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const processRecording = async (uri: string) => {
        try {
            console.log('Processing recording from URI:', uri);
            
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            if (!base64Audio) {
                throw new Error('Failed to read audio file');
            }

            console.log('Audio file size (base64):', base64Audio.length);

            // Show user typing indicator and scroll
            setIsTypingUser(true);
            scrollToBottom();

            console.log('Sending request to cloud function with:', {
                expectedPhrase: phrase.target_phrase,
                audioLength: base64Audio.length
            });

            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    audioContent: base64Audio,
                    expectedPhrase: phrase.target_phrase
                }),
            });

            const responseText = await response.text();
            console.log('Raw response:', responseText);

            if (!response.ok) {
                console.error('Cloud function error:', responseText);
                throw new Error(`Server responded with ${response.status}: ${responseText}`);
            }

            const result = JSON.parse(responseText);
            console.log('Parsed response:', result);
            
            if (!result?.transcript || !result?.evaluation?.rating) {
                console.error('Invalid response structure:', result);
                throw new Error('Invalid response format from server');
            }

            // Store the evaluation result for phrase tracking
            setLastEvaluationResult({
                transcript: result.transcript,
                rating: result.evaluation.rating,
                explanation: result.evaluation.explanation
            });

            // Hide user typing, show user message, and scroll
            setIsTypingUser(false);
            setMessages(prev => [...prev, { 
                text: result.transcript,
                isUser: true 
            }]);
            scrollToBottom();

            // Show AI typing indicator and scroll
            setIsTypingAI(true);
            scrollToBottom();
            
            // Format the AI response
            const aiResponse = `${result.evaluation.rating.trim()} ${result.evaluation.explanation.trim()}`;
            
            setTimeout(() => {
                setIsTypingAI(false);
                setMessages(prev => [...prev, { text: aiResponse, isUser: false }]);
                scrollToBottom();
            }, 1000);

        } catch (error) {
            console.error('Error in processRecording:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            Alert.alert(
                "Recording Error",
                "There was an error processing your recording. Please try again.",
                [{ text: "OK" }]
            );
            setIsTypingUser(false);
            setIsTypingAI(false);
        }
    };

    const handleClear = () => {
        setMessages([{ 
            text: isTranslated 
                ? phrase.phrase_prompt_translation 
                : phrase.phrase_prompt, 
            isUser: false 
        }]);
        setShowMicInstructions(true);
        // Reset the last evaluation result
        setLastEvaluationResult(null);
        // Optional: Scroll to top after clearing
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Close button */}
                    <TouchableOpacity 
                        style={styles.closeButtonContainer} 
                        onPress={onClose}
                    >
                        <View style={styles.closeButtonGradient}>
                            <Ionicons name="close" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    {/* Messages Section */}
                    <ScrollView 
                        ref={scrollViewRef}
                        style={styles.messagesContainer}
                        contentContainerStyle={styles.messagesContent}
                    >
                        {messages.map((msg, index) => (
                            <View 
                                key={index} 
                                style={[
                                    styles.messageBubble,
                                    msg.isUser ? styles.userBubble : styles.systemBubble
                                ]}
                            >
                                <Text style={styles.messageText}>
                                    {index === 0 && !msg.isUser 
                                        ? (isTranslated 
                                            ? phrase.phrase_prompt_translation 
                                            : phrase.phrase_prompt)
                                        : msg.text}
                                </Text>
                            </View>
                        ))}
                        <TypingIndicator isTyping={isTypingUser} isUser={true} />
                        <TypingIndicator isTyping={isTypingAI} isUser={false} />
                    </ScrollView>

                    {/* Footer Section */}
                    <View style={styles.footer}>
                        {/* Instruction with Translation */}
                        <View style={styles.instructionRow}>
                            <Text style={styles.instructionText}>
                                Say: {isTranslated 
                                    ? phrase.target_phrase_translation 
                                    : phrase.target_phrase}
                            </Text>
                        </View>

                        {showMicInstructions && (
                            <Animated.Text style={[styles.micInstructions, { opacity: instructionsOpacity }]}>
                                Press the mic to start recording and press again when you are done
                            </Animated.Text>
                        )}
                        
                        <View style={styles.controlsContainer}>
                            {/* Clear Button */}
                            <TouchableOpacity 
                                style={styles.clearButton}
                                onPress={handleClear}
                            >
                                <Text style={styles.clearButtonText}>Clear</Text>
                            </TouchableOpacity>

                            {/* Mic Button */}
                            <Animated.View style={{ transform: [{ scale: micScale }] }}>
                                <TouchableOpacity
                                    style={[styles.micButton, isRecording && styles.micButtonRecording]}
                                    onPress={toggleRecording}
                                >
                                    <Ionicons 
                                        name={isRecording ? "radio-button-on" : "mic"} 
                                        size={32} 
                                        color="#fff" 
                                    />
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Translate Button */}
                            <TouchableOpacity
                                style={styles.translateButton}
                                onPress={() => setIsTranslated(!isTranslated)}
                            >
                                <TranslateIcon 
                                    width={22} 
                                    height={22} 
                                    fill={isTranslated ? "#FFFFFF" : "#888888"}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Mastered Toast */}
                    {showMasteredToast && (
                        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
                            <View style={styles.toast}>
                                <Ionicons name="checkmark-circle" size={24} color="#6C63E0" />
                                <Text style={styles.toastText}>You mastered the phrase!</Text>
                            </View>
                        </Animated.View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        height: '80%',
        backgroundColor: '#181818',
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    closeButtonContainer: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    closeButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#5A51E1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 60, // Space for the close button
    },
    messagesContent: {
        paddingTop: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginVertical: 4,
        paddingBottom: 8,
    },
    systemBubble: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'flex-start',
    },
    userBubble: {
        backgroundColor: '#5A51E1',
        alignSelf: 'flex-end',
    },
    messageText: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 20,
    },
    footer: {
        padding: 16,
        paddingBottom: 24,
        backgroundColor: 'transparent',
    },
    instructionRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    micInstructions: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        opacity: 0.8,
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        position: 'relative',
    },
    micButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#5A51E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButtonRecording: {
        backgroundColor: '#FF4444',
    },
    clearButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        position: 'absolute',
        left: 20,
        minWidth: 60,
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 13,
        opacity: 0.8,
    },
    translateButton: {
        width: 44,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        right: 20,
    },
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    toast: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    toastText: {
        color: '#181818',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default PracticeCard; 