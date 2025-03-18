// app/views/ConversationalView.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Animated,
    ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import TranslateIcon from '../components/translate.svg';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import TypingIndicator from '../components/TypingIndicator';
import { ConversationalData } from '../../supabase/types';
import { supabase } from '@/supabase/supabaseClient';
import { addPhraseToWorkOn, markPhraseMastered } from '@/supabase/progressService';
import DotIndicator from '../components/DotIndicator';

const CLOUD_FUNCTION_URL = 'https://us-central1-shira-9828b.cloudfunctions.net/transcribeAndEvaluate';
// This is the exact phrase that indicates mastery
const MASTERY_PHRASE = "Great Job! You have mastered the phrase.";

interface ConversationalViewProps {
    conversationalData: ConversationalData | null;
}

const ConversationalView: React.FC<ConversationalViewProps> = ({ conversationalData }) => {
    // State
    const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([]);
    const [isRecording, setIsRecording] = useState(false);
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
    
    // Refs
    const scrollViewRef = useRef<ScrollView>(null);
    
    // Animation values
    const micScale = useRef(new Animated.Value(1)).current;
    const instructionsOpacity = useRef(new Animated.Value(1)).current;

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

    // Initialize messages with conversationalData when it changes
    useEffect(() => {
        if (conversationalData) {
            setMessages([{
                text: isTranslated ? conversationalData.responsePromptTranslation : conversationalData.responsePrompt,
                isUser: false
            }]);
        }
    }, [conversationalData, isTranslated]);

    // Handle phrase tracking when evaluation results change
    useEffect(() => {
        const trackPhrase = async () => {
            if (!userId || !conversationalData || !lastEvaluationResult) return;
            
            const isMastered = lastEvaluationResult.rating.includes(MASTERY_PHRASE);
            
            if (isMastered) {
                // If mastered, move to mastered_phrases if it was in user_phrases
                console.log('Phrase mastered, moving to mastered phrases');
                await markPhraseMastered(userId, conversationalData.speakingPhrase);
            } else {
                // If not mastered, add to user_phrases if not already there
                console.log('Phrase needs work, adding to user phrases');
                await addPhraseToWorkOn({
                    user_id: userId,
                    phrase_prompt: conversationalData.responsePrompt,
                    phrase_prompt_translation: conversationalData.responsePromptTranslation || '',
                    target_phrase: conversationalData.speakingPhrase,
                    target_phrase_translation: conversationalData.speakingPhraseTranslation || '',
                    status: 'need_to_work_on'
                });
            }
        };
        
        trackPhrase();
    }, [lastEvaluationResult, userId, conversationalData]);

    if (!conversationalData) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Loading...</Text>
            </View>
        );
    }

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
        if (!conversationalData) {
            Alert.alert('Error', 'No lesson data available');
            return;
        }

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
                expectedPhrase: conversationalData.speakingPhrase,
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
                    expectedPhrase: conversationalData.speakingPhrase
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
                text: isTranslated ? result.transcript : result.transcript,
                isUser: true 
            }]);
            scrollToBottom();

            // Show AI typing indicator and scroll
            setIsTypingAI(true);
            scrollToBottom();
            
            // Format the AI response based on translation state
            const aiResponse = isTranslated 
                ? `${result.evaluation.rating.trim()} ${result.evaluation.explanation.trim()}`
                : `${result.evaluation.rating.trim()} ${result.evaluation.explanation.trim()}`;
            
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
        if (!conversationalData) return;
        
        setMessages([{ 
            text: isTranslated 
                ? conversationalData.responsePromptTranslation 
                : conversationalData.responsePrompt, 
            isUser: false 
        }]);
        // Reset the last evaluation result
        setLastEvaluationResult(null);
        // Optional: Scroll to top after clearing
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
    };

    return (
        <View style={styles.container}>
            {/* Messages Section - Full height until footer */}
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
                                    ? conversationalData.responsePromptTranslation 
                                    : conversationalData.responsePrompt)
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
                            ? conversationalData.speakingPhraseTranslation 
                            : conversationalData.speakingPhrase}
                    </Text>
                </View>
                
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
                            width={20} 
                            height={20} 
                            fill={isTranslated ? "#FFFFFF" : "#888888"} 
                        />
                    </TouchableOpacity>
                </View>
            </View>
            
            {/* Add dot indicator at the absolute bottom of the container */}
            <DotIndicator totalDots={4} activeDotIndex={2} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
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
        paddingBottom: 32,
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
        backgroundColor: 'rgba(255,255,255,0.1)',
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        right: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 24,
        textAlign: 'center',
    },
});

export default ConversationalView;
