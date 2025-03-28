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
    Dimensions,
    Platform,
    StatusBar,
    Modal,
    SafeAreaView,
    Easing,
    ActivityIndicator
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import TypingIndicator from '../components/TypingIndicator';
// Replace Supabase type import with local interface definition
// import { ConversationalData } from '../../supabase/types';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define the ConversationalData interface locally instead of importing from Supabase
interface ConversationalData {
    responsePrompt: string;
    responsePromptTranslation?: string;
    speakingPhrase: string;
    speakingPhraseTranslation?: string;
}

const { width, height } = Dimensions.get('window');
// Replace hardcoded Supabase URL with a configurable constant that can be changed later
const CONVERSATION_API_URL = 'https://friwhmjhptjucqwdsqei.supabase.co/functions/v1/conversation-handler';

interface ConversationalViewProps {
    conversationalData: ConversationalData | null;
}

// Create a new interface for conversation history tracking
interface ConversationMessage {
    text: string;
    translation?: string;
    isUser: boolean;
}

const ConversationalView: React.FC<ConversationalViewProps> = ({ conversationalData }) => {
    // State
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranslated, setIsTranslated] = useState(false);
    const [isTypingUser, setIsTypingUser] = useState(false);
    const [isTypingAI, setIsTypingAI] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [lastEvaluationResult, setLastEvaluationResult] = useState<{
        transcript: string;
        rating: string;
        explanation: string;
    } | null>(null);
    const [hasRecordedOnce, setHasRecordedOnce] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasStartedConversation, setHasStartedConversation] = useState(false);
    const [isButtonLoading, setIsButtonLoading] = useState(false);
    
    // Add new state for the current phrase the user should say
    const [currentPhrase, setCurrentPhrase] = useState({
        text: "",
        translation: ""
    });
    
    // Add state for showing translated phrase
    const [showTranslation, setShowTranslation] = useState(false);
    
    // Add state for phrase loading skeleton
    const [isLoadingPhrase, setIsLoadingPhrase] = useState(false);
    
    // Refs
    const scrollViewRef = useRef<ScrollView>(null);
    const footerRef = useRef<View>(null);
    const lastMessageRef = useRef<View>(null);
    
    // Add ref to track current sound playing state to reduce logs
    const soundPlayingState = useRef<boolean>(false);
    
    // Animation values
    const micScale = useRef(new Animated.Value(1)).current;
    const micRingOpacity = useRef(new Animated.Value(0)).current;
    const micRingScale = useRef(new Animated.Value(1)).current;
    const translateButtonScale = useRef(new Animated.Value(1)).current;
    const instructionOpacity = useRef(new Animated.Value(1)).current;
    const instructionY = useRef(new Animated.Value(0)).current;
    const headerY = useRef(new Animated.Value(0)).current;
    const expandIconScale = useRef(new Animated.Value(1)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;
    const modalScale = useRef(new Animated.Value(0.95)).current;
    const expandArrowX = useRef(new Animated.Value(0)).current;
    const expandArrowY = useRef(new Animated.Value(0)).current;
    const expandArrowScale = useRef(new Animated.Value(1)).current;
    const waveform1 = useRef(new Animated.Value(0)).current;
    const waveform2 = useRef(new Animated.Value(0)).current;
    const waveform3 = useRef(new Animated.Value(0)).current;

    // Add refs for typing indicators
    const typingUserRef = useRef<View>(null);
    const typingAIRef = useRef<View>(null);

    // Add a new animation value for the sheen effect
    const sheenAnimation = useRef(new Animated.Value(-100)).current;

    // Add a new animation ref for the phrase container
    const phraseScale = useRef(new Animated.Value(1)).current;
    const phraseY = useRef(new Animated.Value(0)).current;

    // Add a new state for tracking audio playback
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [playingItemId, setPlayingItemId] = useState<string | null>(null);
    const audioRef = useRef<Audio.Sound | null>(null);

    // Add shimmer animation:
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    
    // Animate shimmer when loading
    useEffect(() => {
        let shimmerAnimation: Animated.CompositeAnimation | null = null;
        
        if (isLoadingPhrase) {
            // Create shimmer animation
            shimmerAnimation = Animated.loop(
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                    easing: Easing.ease
                })
            );
            shimmerAnimation.start();
        } else {
            // Reset animation
            shimmerAnim.setValue(0);
        }
        
        // Cleanup animation when component unmounts or state changes
        return () => {
            if (shimmerAnimation) {
                shimmerAnimation.stop();
            }
        };
    }, [isLoadingPhrase]);

    // Initialize messages with conversationalData when it changes
    useEffect(() => {
        if (conversationalData) {
            // Only set initial message if messages array is empty or when conversationalData changes
            if (messages.length === 0) {
                // Initialize the messages with the system's first prompt
                setMessages([{
                    text: conversationalData.responsePrompt,
                    translation: conversationalData.responsePromptTranslation || '',
                    isUser: false
                }]);
                
                // Set the current phrase for the user to say
                setCurrentPhrase({
                    text: conversationalData.speakingPhrase,
                    translation: conversationalData.speakingPhraseTranslation || ''
                });
                
                // Reset the conversation state when new data arrives
                setHasStartedConversation(false);
                setIsExpanded(false);
            }
        }
    }, [conversationalData]);

    // Replace waveform animations with dot scale animations
    useEffect(() => {
        let animationSet: Animated.CompositeAnimation;
        
        if (isRecording) {
            // Reset animation values
            waveform1.setValue(0);
            waveform2.setValue(0);
            waveform3.setValue(0);
            
            // Create animations for dots that scale instead of changing height
            animationSet = Animated.loop(
                Animated.stagger(150, [
                    // First dot
                Animated.sequence([
                        Animated.timing(waveform1, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true, // Can use native driver with transform
                            easing: Easing.ease
                        }),
                        Animated.timing(waveform1, {
                        toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                            easing: Easing.ease
                        })
                    ]),
                    // Second dot
                    Animated.sequence([
                        Animated.timing(waveform2, {
                        toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                            easing: Easing.ease
                        }),
                        Animated.timing(waveform2, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                            easing: Easing.ease
                        })
                    ]),
                    // Third dot
                    Animated.sequence([
                        Animated.timing(waveform3, {
                        toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                            easing: Easing.ease
                        }),
                        Animated.timing(waveform3, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                            easing: Easing.ease
                        })
                    ])
                ])
            );
            
            animationSet.start();
        } else {
            // Reset animation values when not recording
            micRingOpacity.setValue(0);
            micRingScale.setValue(1);
            waveform1.setValue(0);
            waveform2.setValue(0);
            waveform3.setValue(0);
        }
        
        return () => {
            if (animationSet) {
                animationSet.stop();
            }
        };
    }, [isRecording]);

    // Add new useEffect for handling success/failure feedback without database
    useEffect(() => {
        const provideFeedback = () => {
            if (!lastEvaluationResult) return;
            
            // Always provide success feedback - we're not tracking mastery status anymore
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        };
        
        provideFeedback();
    }, [lastEvaluationResult]);

    // Update animations based on message count
    useEffect(() => {
        // Move instruction up when there are messages
        Animated.timing(instructionY, {
            toValue: messages.length > 1 ? -20 : 0,
            duration: 300,
            useNativeDriver: true
        }).start();
        
        // Set flag to show we've recorded at least once
        if (messages.length > 1 && !hasRecordedOnce) {
            setHasRecordedOnce(true);
        }
    }, [messages]);

    // Remove the enhanced floating animation useEffect
    useEffect(() => {
        // Reset the position when the expanded state changes
        expandArrowX.setValue(0);
        expandArrowY.setValue(0);
        expandArrowScale.setValue(1);
        
        // Removing the floating animation completely
        return () => {
            // Clean up function remains empty
        };
    }, [isExpanded]);

    // Get insets for safe area
    const insets = useSafeAreaInsets();

    // Update the sheen animation for a faster, more diagonal effect
    useEffect(() => {
        // Delete the continuous animation
        // This is purposely left empty to remove the previous animation loop
        // We'll only trigger the sheen on button press
        return () => {
            // Clean up if necessary
        };
    }, []);

    // Add a useEffect for component mount logging
    useEffect(() => {
        console.log('ConversationalView mounted');
        
        // Cleanup function
        return () => {
            console.log('ConversationalView unmounted');
        };
    }, []);

    if (!conversationalData) {
        return (
            <View style={styles.container}>
                <Text style={styles.sectionTitle}>Loading...</Text>
            </View>
        );
    }

    const toggleRecording = async () => {
        if (isRecording) {
            // Add haptic feedback when stopping recording
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await stopRecording();
        } else {
            // Add haptic feedback when starting recording
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await startRecording();
        }
    };

    const startRecording = async () => {
        try {
            console.log('Requesting audio permissions...');
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant microphone permissions to use this feature');
                return;
            }

            console.log('Setting audio mode...');
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Simplified recording options focused on capturing clean audio
            // rather than perfect format compatibility
            const recordingOptions = {
                android: {
                    extension: '.wav',
                    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.wav',
                    audioQuality: Audio.IOSAudioQuality.HIGH,  // High quality for cleaner audio
                    sampleRate: 16000,  // Standard sample rate for speech
                    numberOfChannels: 1,  // Mono for speech recognition
                    bitRate: 128000,  // Higher bitrate for better quality
                    linearPCMBitDepth: 16,  // Standard bit depth
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                    outputFormat: Audio.IOSOutputFormat.LINEARPCM,  // Let server handle format conversion
                },
                web: {
                    mimeType: 'audio/webm',
                    bitsPerSecond: 128000,
                },
                isMeteringEnabled: true,
            };
            
            console.log('Creating recording with options:', JSON.stringify(recordingOptions));
            const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
            
            console.log('Recording started');
            setRecording(newRecording);
            setIsRecording(true);
            
            // Animate mic button with a smoother transition
            Animated.sequence([
                Animated.timing(micScale, {
                    toValue: 1.1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.spring(micScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
            
            // Removed duplicate haptic feedback since it's now in toggleRecording
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
        
        // Add a subtle animation when stopping recording
        Animated.sequence([
            Animated.timing(micScale, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(micScale, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
        
        // Reset animation state
        micRingOpacity.setValue(0);
        micRingScale.setValue(1);
        waveform1.setValue(0);
        waveform2.setValue(0);
        waveform3.setValue(0);
        
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

    // Update the scrollToShowLatestMessage function to only scroll when necessary
    const scrollToShowLatestMessage = () => {
        if (!scrollViewRef.current) return;
        
        // We need to track the content height and scroll position
        // Add a state variable to store if we've already seen initial messages
        const shouldAutoScroll = messages.length > 1;
        
        // Only auto-scroll in specific conditions
        if (shouldAutoScroll) {
            // Only scroll if we're at the bottom already or if this is a new message
            if (isTypingUser || isTypingAI || messages.length <= 2) {
                // Using a slight delay to ensure the message is rendered first
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
            }
        }
    };

    // Add a way to get a ref to the last message
    const getMessageRef = (index: number) => {
        // Only assign a ref to the last message
        if (index === messages.length - 1) {
            return lastMessageRef;
        }
        return null;
    };

    // Update the forceScrollCorrectPosition function to be more conservative about scrolling
    const forceScrollCorrectPosition = () => {
        if (!scrollViewRef.current) return;
        
        // Only force scroll if we have several messages or typing indicators are showing
        if (messages.length > 2 || isTypingUser || isTypingAI) {
            // Short delay to ensure content has rendered
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    // Add a cleanup function to delete the audio file
    const cleanupRecording = async (fileUri: string) => {
        try {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (fileInfo.exists) {
                console.log(`Deleting audio file: ${fileUri}`);
                await FileSystem.deleteAsync(fileUri);
            }
        } catch (error) {
            console.error('Error cleaning up recording:', error);
        }
    };

    // Add a function to animate the phrase with a jump effect
    const animatePhraseJump = () => {
        // Reset animation values
        phraseY.setValue(0);
        phraseScale.setValue(1);
        
        // Create a sequence of animations for a bounce effect
        Animated.sequence([
            // First go up and get slightly bigger
            Animated.parallel([
                Animated.timing(phraseY, {
                    toValue: -10,
                    duration: 150,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic)
                }),
                Animated.timing(phraseScale, {
                    toValue: 1.05,
                    duration: 150,
                    useNativeDriver: true
                })
            ]),
            // Then come back down with a bounce
            Animated.parallel([
                Animated.timing(phraseY, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                    easing: Easing.bounce
                }),
                Animated.timing(phraseScale, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true
                })
            ])
        ]).start();
        
        // Add haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    // Update the processRecording function to include more diagnostic information
    const processRecording = async (uri: string) => {
        if (!conversationalData) {
            Alert.alert('Error', 'No lesson data available');
            return;
        }

        try {
            console.log('Processing recording from URI:', uri);
            
            // Get file info to check the audio file
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) {
                throw new Error('Audio file not found');
            }
            console.log('File info:', JSON.stringify(fileInfo, null, 2)); // Pretty-print for better logs
            
            // Read the file as base64
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            if (!base64Audio) {
                throw new Error('Failed to read audio file');
            }
            
            if (base64Audio.length < 1000) {
                throw new Error('Audio file is too small or empty. Please try speaking louder and longer.');
            }

            console.log('Audio file size (base64):', base64Audio.length);
            console.log('Audio file prefix (first 20 chars):', base64Audio.substring(0, 20));

            // Show user typing indicator
            setIsTypingUser(true);
            setTimeout(scrollToShowLatestMessage, 100);

            // Format conversation history for the edge function
            const conversationHistory = messages.map(msg => ({
                text: msg.text,
                translation: msg.translation,
                isUser: msg.isUser
            }));

            console.log('Sending request to conversation API with:', {
                expectedPhrase: currentPhrase.text,
                audioLength: base64Audio.length,
                historyLength: conversationHistory.length
            });

            // Now we can cleanup the original file since we have the base64 data
            await cleanupRecording(uri);

            // Make request to the conversation API with raw audio data
            // Let the server handle format conversion
            const response = await fetch(CONVERSATION_API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    audioContent: base64Audio,
                    expectedPhrase: currentPhrase.text,
                    conversationHistory: conversationHistory
                }),
            }).catch(err => {
                throw new Error(`Network error: ${err.message}`);
            });

            const responseText = await response.text();
            
            // Log an abbreviated version of the response for debugging
            if (responseText.length > 500) {
                console.log('Raw response length:', responseText.length);
                console.log('Raw response preview:', responseText.substring(0, 500) + '...');
            } else {
            console.log('Raw response:', responseText);
            }

            if (!response.ok) {
                console.error('Edge function error:', responseText);
                if (responseText.includes('No transcription results') || 
                    responseText.includes('No speech detected')) {
                    throw new Error(`No speech detected. Please try speaking louder and clearer.`);
                } else {
                throw new Error(`Server responded with ${response.status}: ${responseText}`);
                }
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (err) {
                throw new Error(`Invalid JSON response: ${responseText}`);
            }
            
            console.log('Parsed response:', JSON.stringify(result, null, 2)); // Pretty-print for better logs
            
            if (!result?.transcript) {
                console.error('Invalid response structure:', result);
                throw new Error('Invalid response format from server');
            }

            // Store the evaluation result for phrase tracking
            setLastEvaluationResult({
                transcript: result.transcript,
                rating: result.evaluation?.rating || "",
                explanation: result.evaluation?.explanation || ""
            });

            // Hide user typing, show user message
            setIsTypingUser(false);
            setMessages(prev => [...prev, { 
                text: result.transcript,
                translation: currentPhrase.translation,
                isUser: true 
            }]);
            
            setTimeout(scrollToShowLatestMessage, 100);

            // Check if this is a "Needs Work" response that doesn't match expected phrase
            if (result.evaluation && 
                result.evaluation.rating === "Needs Work" && 
                result.evaluation.explanation.includes("doesn't match what we expected")) {
                
                // Show a simplified AI message
            setIsTypingAI(true);
                setTimeout(scrollToShowLatestMessage, 100);
                
                setTimeout(() => {
                    setIsTypingAI(false);
                    setMessages(prev => [...prev, { 
                        text: "That's not what I expected. Please try again.", 
                        isUser: false 
                    }]);
                    
                    // Animate the phrase to draw attention to it
                    animatePhraseJump();
                    
                    // After a short pause, show the original prompt message again
                    setTimeout(() => {
                        setIsTypingAI(true);
                        setTimeout(scrollToShowLatestMessage, 100);
                        
                        // Find the last system prompt (what the user is supposed to be responding to)
                        // This should be the message before the user's incorrect response
                        let lastSystemPrompt = null;
                        for (let i = messages.length - 1; i >= 0; i--) {
                            if (!messages[i].isUser) {
                                lastSystemPrompt = messages[i];
                                break;
                            }
                        }
                        
                        if (lastSystemPrompt) {
            setTimeout(() => {
                setIsTypingAI(false);
                                setMessages(prev => [...prev, {
                                    text: lastSystemPrompt.text,
                                    translation: lastSystemPrompt.translation,
                                    isUser: false
                                }]);
                                // Ensure we scroll after adding the message
                                setTimeout(() => {
                                    scrollToShowLatestMessage();
                                    // Force scroll again after a slight delay to ensure it's visible
                                    setTimeout(scrollToShowLatestMessage, 150);
                                }, 100);
                            }, 1000);
                        }
                    }, 1500);
                    
                    setTimeout(scrollToShowLatestMessage, 150);
                }, 1000);
                
                return; // Exit early, don't continue the conversation
            }
            
            // Check if this is a low confidence word case
            if (result.evaluation && 
                result.evaluation.rating === "Needs Work" && 
                result.evaluation.explanation.startsWith("Close!")) {
                
                // Show the pronunciation guidance
                setIsTypingAI(true);
                setTimeout(scrollToShowLatestMessage, 100);
                
                setTimeout(() => {
                    setIsTypingAI(false);
                    setMessages(prev => [...prev, { 
                        text: result.evaluation.explanation, 
                        isUser: false 
                    }]);
                    
                    // Animate the phrase to draw attention to it
                    animatePhraseJump();
                    
                    // After a short pause, show the original prompt message again
                    setTimeout(() => {
                        setIsTypingAI(true);
                        setTimeout(scrollToShowLatestMessage, 100);
                        
                        // Find the last system prompt (what the user is supposed to be responding to)
                        // This should be the message before the user's incorrect response
                        let lastSystemPrompt = null;
                        for (let i = messages.length - 1; i >= 0; i--) {
                            if (!messages[i].isUser) {
                                lastSystemPrompt = messages[i];
                                break;
                            }
                        }
                        
                        if (lastSystemPrompt) {
                            setTimeout(() => {
                                setIsTypingAI(false);
                                setMessages(prev => [...prev, {
                                    text: lastSystemPrompt.text,
                                    translation: lastSystemPrompt.translation,
                                    isUser: false
                                }]);
                                // Ensure we scroll after adding the message
                                setTimeout(() => {
                                    scrollToShowLatestMessage();
                                    // Force scroll again after a slight delay to ensure it's visible
                                    setTimeout(scrollToShowLatestMessage, 150);
                                }, 100);
                            }, 1000);
                        }
                    }, 1500);
                    
                    setTimeout(scrollToShowLatestMessage, 150);
                }, 1000);
                
                return; // Exit early, don't continue the conversation
            }

            // Show AI typing indicator for other types of responses
            setIsTypingAI(true);
            setTimeout(scrollToShowLatestMessage, 100);
            
            // Skip showing evaluation message and go straight to the next prompt
            setTimeout(() => {
                setIsTypingAI(false);
                
                // Always continue the conversation if we have the necessary data
                if (result.nextPrompt && result.responsePrompt) {
                    // Show loading skeleton for the new phrase
                    setIsLoadingPhrase(true);
                    
                    // Show AI typing for the next prompt
                    setIsTypingAI(true);
                    setTimeout(scrollToShowLatestMessage, 100);
                    
                    setTimeout(() => {
                        // Add AI's next message
                        setIsTypingAI(false);
                        setMessages(prev => [...prev, {
                            text: result.nextPrompt,
                            translation: result.nextPromptTranslation || '',
                            isUser: false
                        }]);
                        
                        // Update the phrase for the user to say next
                        setTimeout(() => {
                            setCurrentPhrase({
                                text: result.responsePrompt,
                                translation: result.responsePromptTranslation || ''
                            });
                            setIsLoadingPhrase(false);
                            
                            setTimeout(scrollToShowLatestMessage, 150);
                        }, 300);
                    }, 1000);
                }
            }, 1000);

        } catch (error: unknown) {
            // Just log the error but don't throw - we still want to reset state
            console.log('Audio cleanup warning:', error instanceof Error ? error.message : 'Unknown error');
            
            setIsTypingUser(false);
            setIsTypingAI(false);
            setIsLoadingPhrase(false);
        }
    };

    // Update the toggleExpand function to reset the sheen animation when closing the modal
    const toggleExpand = () => {
        // Trigger haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (!isExpanded) {
            // Mark that conversation has been started when opening the modal
            setHasStartedConversation(true);
            
            // When expanding, animate the icon first, then show the modal
        Animated.sequence([
                Animated.timing(expandIconScale, {
                    toValue: 1.2,
                    duration: 200,
                useNativeDriver: true
            }),
                Animated.timing(expandIconScale, {
                toValue: 1,
                    duration: 150,
                    useNativeDriver: true
                })
            ]).start(() => {
                // Set state to show modal
                setIsExpanded(true);
                
                // Animate modal entrance
                Animated.parallel([
                    Animated.timing(modalOpacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true
                    }),
                    Animated.timing(modalScale, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true
                    })
                ]).start(() => {
                    // Only reset the loading state after modal is fully visible
                    setIsButtonLoading(false);
                });
            });
        } else {
            // When collapsing, animate modal exit first, then hide it
            Animated.parallel([
                Animated.timing(modalOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true
                }),
                Animated.timing(modalScale, {
                    toValue: 0.95,
                duration: 200,
                useNativeDriver: true
            })
            ]).start(() => {
                // Reset arrow position before showing
                expandArrowX.setValue(0);
                expandArrowY.setValue(0);
                
                // Set state to hide modal
                setIsExpanded(false);
                
                // Reset the sheen animation to ensure it doesn't remain stuck
                sheenAnimation.setValue(-200);
                
                // Animate the expand icon again for when it reappears
        setTimeout(() => {
                    // Small animation to draw attention to the expand button
                    Animated.sequence([
                        Animated.timing(expandIconScale, {
                            toValue: 1.1,
                            duration: 150,
                            useNativeDriver: true
                        }),
                        Animated.timing(expandIconScale, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true
                        })
                    ]).start();
        }, 100);
            });
        }
    };

    // Update the handleStartConversation function to show loading spinner
    const handleStartConversation = () => {
        // Trigger haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Show loading spinner
        setIsButtonLoading(true);
        
        // Reset sheen position and trigger a one-time animation
        sheenAnimation.setValue(-200);
        Animated.timing(sheenAnimation, {
            toValue: 400,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
        
        // Open the modal
        toggleExpand();
    };

    // Simplified function to safely stop any currently playing audio
    const stopCurrentAudio = async () => {
        // Capture the current audio reference to a local variable
        const currentAudio = audioRef.current;
        
        // Reset state variables immediately
        setIsPlayingAudio(false);
        setPlayingItemId(null);
        audioRef.current = null;
        
        // If there was an audio playing, clean it up
        if (currentAudio) {
            try {
                // Try to stop and unload, but don't worry if it fails
                try {
                    await currentAudio.stopAsync();
                } catch (stopErr) {
                    // Just log and continue
                    console.log('Stop warning:', stopErr instanceof Error ? stopErr.message : 'Unknown error');
                }
                
                try {
                    await currentAudio.unloadAsync();
                } catch (unloadErr) {
                    // Just log and continue
                    console.log('Unload warning:', unloadErr instanceof Error ? unloadErr.message : 'Unknown error');
                }
            } catch (error) {
                // Just log the error but don't throw
                console.log('Audio cleanup warning:', 
                    error instanceof Error ? error.message : 'Unknown error');
            }
        }
    };

    // Optimized function to handle streaming TTS playback with minimal latency
    const playStreamingTTS = async (text: string, itemId: string) => {
        try {
            // If the same item is already playing, stop it
            if (isPlayingAudio && playingItemId === itemId) {
                await stopCurrentAudio();
                return;
            }
            
            // Stop any currently playing audio first
            await stopCurrentAudio();
            
            // Immediately provide haptic feedback so user gets instant response
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            // Update state after stopping previous audio
            setIsPlayingAudio(true);
            setPlayingItemId(itemId);
            
            // Encode the text for URL and limit length if needed for faster processing
            const encodedText = encodeURIComponent(text.slice(0, 1000)); // Limit very long texts
            
            // Prepare the URL with optimized streaming parameters
            const ttsURL = `https://friwhmjhptjucqwdsqei.supabase.co/functions/v1/tts-stream?text=${encodedText}&voice_id=Nh2zY9kknu6z4pZy6FhD&optimize_streaming_latency=true`;
            
            console.log('Streaming optimized TTS audio from:', ttsURL);
            
            // Configure audio session optimized for low-latency streaming
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,  // Add this line to ensure consistent audio routing through speaker
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                });
            } catch (audioModeError) {
                console.error('Error setting audio mode:', audioModeError);
                // Continue anyway, as this is not critical
            }
            
            // Animate the speaker icon immediately to show activity
            Animated.sequence([
                Animated.timing(micScale, {
                    toValue: 1.2,
                    duration: 100,
                    useNativeDriver: true
                }),
                Animated.spring(micScale, {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true
                })
            ]).start();
            
            // Set up direct streaming with optimized settings for low latency
            const { sound } = await Audio.Sound.createAsync(
                { 
                    uri: ttsURL,
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Cache-Control': 'no-cache',
                    }
                },
                { 
                    shouldPlay: true,
                    progressUpdateIntervalMillis: 300,  // Less frequent updates to reduce overhead
                    positionMillis: 0,
                    rate: 1.0,
                    // Lower initial buffer size for faster playback start
                    androidImplementation: 'MediaPlayer',
                    volume: 1.0
                },
                (status) => {
                    // Minimized logging for better performance
                    if (status.isLoaded) {
                        // Only log significant events for performance
                        if (status.didJustFinish) {
                            console.log('Audio playback completed successfully');
                            setIsPlayingAudio(false);
                            setPlayingItemId(null);
                            
                            // Clean up resource after playback
                            setTimeout(async () => {
                                try {
                                    if (audioRef.current) {
                                        await audioRef.current.unloadAsync();
                                        audioRef.current = null;
                                    }
                                } catch (cleanupErr) {
                                    // Silent error handling for cleanup
                                }
                            }, 100);
                        } else if (status.positionMillis === 0 && status.isPlaying) {
                            // Log only when playback starts
                            console.log('Audio playback started');
                            soundPlayingState.current = true;
                        }
                    } else if (status.error) {
                        console.error('Audio playback error:', status.error);
                        setIsPlayingAudio(false);
                        setPlayingItemId(null);
                    }
                }
            );
            
            // Save the sound reference
            audioRef.current = sound;
            
        } catch (error: unknown) {
            console.error('Error playing TTS:', error);
            setIsPlayingAudio(false);
            setPlayingItemId(null);
            
            // Minimized error alerts for better UX
            if (error instanceof Error) {
                if (error.message.includes('cancelled') || 
                    error.message.includes('aborted') ||
                    error.message.includes('interrupted')) {
                    // Don't show alerts for expected interruptions
                    console.log('Audio playback was interrupted');
                } else if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
                    Alert.alert(
                        "Network Error",
                        "Connection issue. Please try again.",
                        [{ text: "OK" }]
                    );
                } else {
                    Alert.alert(
                        "Audio Error",
                        "Audio playback failed. Please try again.",
                        [{ text: "OK" }]
                    );
                }
            }
        }
    };

    // Update the handleSpeechPress function with item identification
    const handleSpeechPress = (text: string, itemId: string) => {
        // If the same item is already playing, stop it
        if (isPlayingAudio && playingItemId === itemId) {
            stopCurrentAudio();
            return;
        }
        
        // Play the audio with streaming TTS
        playStreamingTTS(text, itemId);
    };

    // Cleanup audio when component unmounts
    useEffect(() => {
        return () => {
            stopCurrentAudio();
        };
    }, []);

    // Add a helper function to determine if a message is a prompt message (requires speaker icon)
    const isPromptMessage = (msg: ConversationMessage, index: number): boolean => {
        // Skip user messages and messages that contain pronunciation guidance
        if (msg.isUser) return false;
        
        // Skip messages that contain pronunciation guidance like "Close! Say..."
        if (msg.text.includes("Close! Say") || 
            msg.text.includes("That's not what I expected") ||
            msg.text.includes("Needs Work")) {
            return false;
        }
        
        // First message is always a prompt
        if (index === 0) return true;
        
        // Check if this is a system message that follows user's message or follows an explanation
        if (index > 0) {
            // Get the previous 2 messages if they exist
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const prevPrevMsg = index > 1 ? messages[index - 2] : null;
            
            // Case 1: Direct response to user's message (likely a prompt)
            if (prevMsg && prevMsg.isUser) return true;
            
            // Case 2: Message after an explanation (repeating the prompt)
            if (prevMsg && !prevMsg.isUser && prevPrevMsg && prevPrevMsg.isUser) {
                // Only if current message doesn't look like an explanation
                return true;
            }
        }
        
        return false;
    };

    // Add a toggleTranslation function
    const toggleTranslation = () => {
        // Add haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // Animate button press - with toned down animation
        Animated.sequence([
            Animated.timing(translateButtonScale, {
                toValue: 0.92, // Less dramatic scale reduction
                duration: 80,  // Shorter animation
                useNativeDriver: true,
            }),
            Animated.spring(translateButtonScale, {
                toValue: 1,
                friction: 5,    // More friction for less bounce
                tension: 50,    // More tension for faster return
                useNativeDriver: true,
            }),
        ]).start();
        
        // Toggle translation state
        setShowTranslation(prev => !prev);
    };

    // Update the renderPhrase function to toggle "SAY" element visibility and text color
    const renderPhrase = () => {
        return (
            <Animated.View 
                style={[
                    styles.phraseContainer,
                    { 
                        transform: [
                            { translateY: phraseY },
                            { scale: phraseScale }
                        ] 
                    }
                ]}
            >
                {/* "SAY" label - only show when not in translation mode */}
                {!showTranslation && (
                    <View style={styles.sayLabelRow}>
                        <View style={styles.sayLabelContainer}>
                            <Text style={styles.sayLabelText}>SAY</Text>
                            <Ionicons name="mic" size={12} color="#FFFFFF" style={styles.sayLabelIcon} />
                        </View>
                        
                        {/* Speaker icon for phrase - now positioned next to SAY label */}
                        <TouchableOpacity 
                            style={[
                                styles.phraseSpeakerIconContainer,
                                isPlayingAudio && playingItemId === 'phrase-container' && styles.speakerIconContainerActive
                            ]}
                            onPress={() => handleSpeechPress(currentPhrase.text, 'phrase-container')}
                            activeOpacity={0.7}
                        >
                            <Animated.View style={{ transform: [{ scale: micScale }] }}>
                                <Ionicons 
                                    name={isPlayingAudio && playingItemId === 'phrase-container' ? "pause" : "volume-high"} 
                                    size={22} 
                                    color={isPlayingAudio && playingItemId === 'phrase-container' ? "#FFFFFF" : "#AAAAAA"} 
                                />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* When in translation mode, only show the speaker button at the top */}
                {showTranslation && (
                    <View style={styles.translationSpeakerRow}>
                        <TouchableOpacity 
                            style={[
                                styles.phraseSpeakerIconContainer,
                                isPlayingAudio && playingItemId === 'phrase-container' && styles.speakerIconContainerActive
                            ]}
                            onPress={() => handleSpeechPress(currentPhrase.text, 'phrase-container')}
                            activeOpacity={0.7}
                        >
                            <Animated.View style={{ transform: [{ scale: micScale }] }}>
                                <Ionicons 
                                    name={isPlayingAudio && playingItemId === 'phrase-container' ? "pause" : "volume-high"} 
                                    size={22} 
                                    color={isPlayingAudio && playingItemId === 'phrase-container' ? "#FFFFFF" : "#AAAAAA"} 
                                />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                )}
                
                {/* Display either the loading skeleton or the actual phrase text */}
                {isLoadingPhrase ? (
                    <View style={styles.phraseTextSkeleton}>
                        <View style={styles.phraseSkeletonLine}>
                            <Animated.View 
                                style={[
                                    styles.shimmerContainer,
                                    {
                                        transform: [{ 
                                            translateX: shimmerAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [-200, 200]
                                            }) 
                                        }]
                                    }
                                ]}
                            >
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.shimmerGradient}
                                />
                            </Animated.View>
                        </View>
                        {!showTranslation && (
                            <View style={[styles.phraseSkeletonLine, { width: '70%' }]}>
                                <Animated.View 
                                    style={[
                                        styles.shimmerContainer,
                                        {
                                            transform: [{ 
                                                translateX: shimmerAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [-200, 200]
                                                }) 
                                            }]
                                        }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.shimmerGradient}
                                    />
                                </Animated.View>
                            </View>
                        )}
                    </View>
                ) : (
                    <Text style={[
                        styles.phraseText,
                        showTranslation && styles.translatedPhraseText
                    ]}>
                        {showTranslation && currentPhrase.translation ? currentPhrase.translation : currentPhrase.text}
                    </Text>
                )}
            </Animated.View>
        );
    };

    // Update the renderConversationContent function to include useEffect for typing indicators
    const renderConversationContent = () => {
        // Add useEffect for typing indicator haptics
        useEffect(() => {
            if (isTypingAI) {
                // Trigger a light haptic when system typing indicator appears
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }, [isTypingAI]);

        // Add useEffect for message haptics
        useEffect(() => {
            // Only trigger for system messages (non-user) when a new message is added
            if (messages.length > 0 && !messages[messages.length - 1].isUser) {
                // Trigger a light haptic when a system message appears
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }, [messages.length]);

        return (
            <View style={[styles.container, isExpanded && styles.expandedContainer]}>
                {/* Header with gradient */}
                <LinearGradient
                    colors={['rgba(24, 24, 24, 0.9)', 'rgba(24, 24, 24, 0)']}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                >
                    <Animated.View 
                        style={[
                            styles.headerContainer,
                            { transform: [{ translateY: headerY }] }
                        ]}
                    >
                        {isExpanded ? (
                            <View style={styles.expandedHeaderContainer}>
                                <LinearGradient
                                    colors={['#5a51e1', '#e15190']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientTitleContainer}
                                >
                                    <Text style={styles.sectionTitle}>SHIRA AI</Text>
                                    <Ionicons name="sparkles" size={18} color="#FFFFFF" style={styles.starIcon} />
                                </LinearGradient>
                            </View>
                        ) : (
                            <Text style={styles.sectionTitle}>CONVERSATION PRACTICE</Text>
                        )}
                            
                        {/* Close Button when in expanded modal view */}
                        {isExpanded && (
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={toggleExpand}
                            >
                                <Ionicons 
                                    name="close" 
                                    size={22} 
                                    color="#FFFFFF" 
                                />
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                </LinearGradient>
            
                {/* Messages Section */}
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => {
                        // Only scroll to bottom for first few messages or typing indicators
                        if (messages.length <= 2 || isTypingUser || isTypingAI) {
                            scrollToShowLatestMessage();
                        }
                    }}
                    onLayout={() => {
                        // When ScrollView layout changes, only scroll for initial messages
                        if (messages.length <= 2 || isTypingUser || isTypingAI) {
                            setTimeout(scrollToShowLatestMessage, 100);
                        }
                    }}
                >
                    {messages.map((msg, index) => (
                        <View 
                            key={index} 
                            style={[
                                styles.messageWrapper,
                                msg.isUser ? styles.userMessageWrapper : styles.systemMessageWrapper
                            ]}
                            ref={index === messages.length - 1 ? lastMessageRef : null}
                        >
                            {/* Message bubble with speaker icon for system messages */}
                            {msg.isUser ? (
                                // User message with gradient
                                <LinearGradient
                                    colors={['#5a51e1', '#e15190']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[
                                        styles.messageBubble,
                                        styles.userBubble,
                                    ]}
                                >
                                    <Text style={[styles.messageText, styles.userMessageText]}>
                                        {msg.text}
                                    </Text>
                                    
                                    {/* Show translation for user messages if available */}
                                    {msg.translation && (
                                        <Text style={styles.translationText}>
                                            {msg.translation}
                                        </Text>
                                    )}
                                </LinearGradient>
                            ) : (
                                // System message with speaker icon
                                <View style={styles.systemMessageContainer}>
                                    <View 
                                        style={[
                                            styles.messageBubble,
                                            index === 0 && !msg.isUser ? styles.firstMessageBubble : styles.systemBubble
                                        ]}
                                    >
                                        <Text style={[
                                            styles.messageText,
                                            index === 0 && !msg.isUser ? styles.firstMessageText : styles.systemMessageText
                                        ]}>
                                            {msg.text.split('\n').map((line, i) => (
                                                <Text key={i}>
                                                    {line}
                                                    {i < msg.text.split('\n').length - 1 ? '\n' : ''}
                                                </Text>
                                            ))}
                                        </Text>
                                    
                                        {/* Show translation if available (only for system messages) */}
                                        {!msg.isUser && msg.translation && (
                                            <Text style={styles.translationText}>
                                                {msg.translation}
                                            </Text>
                                        )}
                                    </View>
                                    
                                    {/* Speaker icon for AI prompt messages - now directly next to bubble */}
                                    {isPromptMessage(msg, index) && (
                                        <TouchableOpacity 
                                            style={[
                                                styles.speakerIconContainer,
                                                isPlayingAudio && playingItemId === `message-${index}` && styles.speakerIconContainerActive
                                            ]}
                                            onPress={() => handleSpeechPress(msg.text, `message-${index}`)}
                                            activeOpacity={0.7}
                                        >
                                            <Animated.View style={{ transform: [{ scale: micScale }] }}>
                                                <Ionicons 
                                                    name={isPlayingAudio && playingItemId === `message-${index}` ? "pause" : "volume-high"} 
                                                    size={22} 
                                                    color={isPlayingAudio && playingItemId === `message-${index}` ? "#FFFFFF" : "#AAAAAA"} 
                                                />
                                            </Animated.View>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}
                    
                    {/* Typing indicators */}
                    <View ref={typingUserRef}>
                        <TypingIndicator isTyping={isTypingUser} isUser={true} />
                    </View>
                    <View ref={typingAIRef}>
                        <TypingIndicator isTyping={isTypingAI} isUser={false} />
                    </View>
                
                    {/* Add space at bottom for better scrolling */}
                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Footer with phrase and buttons */}
                <View 
                    style={styles.purpleFooterContainer}
                    ref={footerRef}
                >
                    {/* Render phrase with loading skeleton when needed */}
                    {renderPhrase()}

                    {/* Mic and Translate Buttons container */}
                    <View style={styles.footerButtonsContainer}>
                        {/* Translate Button - now on the right side */}
                        <Animated.View style={{
                            transform: [{ scale: translateButtonScale }],
                            position: 'absolute',
                            left: '50%',         // Changed from 'right: 50%'
                            marginLeft: 50,      // Changed from 'marginRight: 50'
                        }}>
                            <TouchableOpacity
                                style={[
                                    styles.translateButton,
                                    showTranslation && styles.translateButtonActive
                                ]}
                                onPress={toggleTranslation}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons 
                                    name="translate" 
                                    size={26} 
                                    color={showTranslation ? "#FFFFFF" : "#AAAAAA"} 
                                />
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Mic Button with animation */}
                        <View style={styles.footerMicButtonContainer}>
                            {isRecording ? (
                                <TouchableOpacity
                                    style={styles.recordingContainer}
                                    onPress={toggleRecording}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#5a51e1', '#e15190']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.dotsContainer}>
                                        <Animated.View 
                                            style={[
                                                styles.dot,
                                                { 
                                                    transform: [{ 
                                                        scale: waveform1.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.6, 1.2]
                                                        })
                                                    }],
                                                    opacity: waveform1.interpolate({
                                                        inputRange: [0, 0.5, 1],
                                                        outputRange: [0.5, 1, 0.5]
                                                    })
                                                }
                                            ]}
                                        />
                                        <Animated.View 
                                            style={[
                                                styles.dot,
                                                { 
                                                    transform: [{ 
                                                        scale: waveform2.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.6, 1.2]
                                                        })
                                                    }],
                                                    opacity: waveform2.interpolate({
                                                        inputRange: [0, 0.5, 1],
                                                        outputRange: [0.5, 1, 0.5]
                                                    })
                                                }
                                            ]}
                                        />
                                        <Animated.View 
                                            style={[
                                                styles.dot,
                                                { 
                                                    transform: [{ 
                                                        scale: waveform3.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.6, 1.2]
                                                        })
                                                    }],
                                                    opacity: waveform3.interpolate({
                                                        inputRange: [0, 0.5, 1],
                                                        outputRange: [0.5, 1, 0.5]
                                                    })
                                                }
                                            ]}
                                        />
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <Animated.View style={{ transform: [{ scale: micScale }] }}>
                                    <TouchableOpacity
                                        style={styles.micButton}
                                        onPress={toggleRecording}
                                    >
                                        <Ionicons 
                                            name="mic" 
                                            size={28} 
                                            color="#fff" 
                                        />
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Update the main render function
    if (!conversationalData) {
        return (
            <View style={styles.container}>
                <Text style={styles.sectionTitle}>Loading...</Text>
            </View>
        );
    }

    return (
        <>
            {/* Non-expanded view with blur and Start/Continue button */}
            {!isExpanded && (
                <View style={styles.container}>
                    {/* Blurred background covering the entire view - no preview content */}
                    <BlurView intensity={40} style={styles.fullBlurBackground} tint="dark">
                        {/* Empty container with no preview content */}
                    </BlurView>
                    
                    {/* Header with gradient - above the blur */}
                    <LinearGradient
                        colors={['rgba(24, 24, 24, 0.9)', 'rgba(24, 24, 24, 0)']}
                        style={styles.headerGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    >
                        <Animated.View 
                            style={[
                                styles.headerContainer,
                                { transform: [{ translateY: headerY }] }
                            ]}
                        >
                            <Text style={styles.sectionTitle}>CONVERSATION PRACTICE</Text>
                            
                            {/* Remove the Expand Button in non-expanded state, only keep the close button when expanded */}
                            {isExpanded && (
                                <TouchableOpacity
                                    style={styles.expandButton}
                                    onPress={toggleExpand}
                                >
                                    <Ionicons 
                                        name="close" 
                                        size={22} 
                                        color="#FFFFFF" 
                                    />
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    </LinearGradient>
            
                    {/* Start/Continue Conversation Button - centered and above the blur */}
                    <View style={styles.centeredButtonContainer}>
                        <View style={styles.buttonBlurOutline}>
                            <TouchableOpacity
                                style={styles.conversationButtonOutline}
                                onPress={handleStartConversation}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['rgba(90, 81, 225, 0.8)', 'rgba(225, 81, 144, 0.8)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.conversationButtonGradient}
                                >
                                    {/* Animated sheen effect - only visible during animation */}
                                    <Animated.View 
                                        style={[
                                            styles.sheenContainer,
                                            {
                                                transform: [
                                                    { translateX: sheenAnimation }
                                                ]
                                            }
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.sheenGradient}
                                        />
                                    </Animated.View>
                                    <View style={styles.buttonContent}>
                                        {isButtonLoading ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator 
                                                    size="small" 
                                                    color="#FFFFFF" 
                                                    style={styles.loadingIndicator} 
                                                />
                                            </View>
                                        ) : (
                                            <Text style={styles.conversationButtonText}>
                                                {hasStartedConversation ? "CONTINUE CONVERSATION" : "START CONVERSATION"}
                                            </Text>
                                        )}
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
            
            {/* Modal view with full conversation */}
            <Modal
                visible={isExpanded}
                transparent={true}
                animationType="none"
                onRequestClose={toggleExpand}
            >
                <View style={styles.modalContainer}>
                    <BlurView intensity={80} style={styles.blurOverlay} tint="dark" />
                    
                    <Animated.View 
                        style={[
                            styles.modalContent,
                            {
                                marginTop: insets.top + 20,
                                marginBottom: insets.bottom + 30,
                                opacity: modalOpacity,
                                transform: [{ scale: modalScale }]
                            }
                        ]}
                    >
                        {renderConversationContent()}
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    expandedContainer: {
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: 'rgba(24, 24, 24, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 15,
        flex: 1,
        paddingBottom: Platform.OS === 'ios' ? 10 : 5, // Small bottom padding for expanded view
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingBottom: Platform.OS === 'ios' ? 10 : 5, // Add padding to bottom of modal container
    },
    modalContent: {
        width: '92%',
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 12,
        marginBottom: 20, // Increased from 15
    },
    blurOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        zIndex: 10, // Above everything
    },
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 12 : 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 60, // Adjusted to match CulturalView
    },
    expandButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10, // Add padding for better touch target
    },
    expandButtonActive: {
        // Just remove the background styling
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 0,
        marginLeft: 4,
        alignSelf: 'flex-start',
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
        height: height * 0.75, // Decreased from 80% to 75% to account for taller footer
        marginBottom: height * 0.25, // Increased from 20% to 25% to match taller footer
    },
    messagesContent: {
        paddingTop: 80, // Space for the header
    },
    messageWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
        width: '100%',
    },
    userMessageWrapper: {
        justifyContent: 'flex-end',
    },
    systemMessageWrapper: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 18,
        marginHorizontal: 4,
        paddingBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.18,
        shadowRadius: 1.0,
        elevation: 1,
    },
    firstMessageBubble: {
        backgroundColor: '#3b3b3d', 
        borderWidth: 0,
        paddingVertical: 16, // More vertical padding
        maxWidth: '85%', // Adjusted width now that icon is outside
    },
    firstMessageText: {
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 24, // Increased line height for better readability
        color: '#ffffff',
    },
    systemBubble: {
        backgroundColor: '#3b3b3d',
        alignSelf: 'flex-start',
        borderWidth: 0,
        paddingVertical: 14,
        marginRight: 'auto', // Ensure system messages are on the left
    },
    userBubble: {
        alignSelf: 'flex-end',
        paddingVertical: 14,
        shadowColor: '#5a51e1',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginLeft: 'auto', // Ensure user messages are on the right
    },
    messageText: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 22,
        letterSpacing: 0.2,
    },
    systemMessageText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 24,
        letterSpacing: 0.3,
    },
    userMessageText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.3,
        lineHeight: 24,
    },
    systemMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '100%',
    },
    speakerIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(59, 59, 61, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        marginLeft: 8,
    },
    speakerIconContainerActive: {
        backgroundColor: '#5A51E1',
    },
    purpleFooterContainer: {
        position: 'absolute',
        bottom: 0,
        left: 20,
        right: 20,
        height: '35%',
        backgroundColor: '#181818',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingBottom: Platform.OS === 'ios' ? 50 : 40,
        paddingTop: 16,
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderBottomWidth: 0,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 8,
        zIndex: 10,
    },
    footerButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        marginBottom: Platform.OS === 'ios' ? 50 : 40,
        height: 80,
        position: 'relative',
        width: '100%',
    },
    translateButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(59, 59, 61, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    translateButtonActive: {
        backgroundColor: '#5A51E1',
    },
    footerMicButtonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        marginBottom: Platform.OS === 'ios' ? 50 : 40,
        height: 80,
        position: 'relative',
    },
    recordingContainer: {
        width: 68,
        height: 68,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#5a51e1',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
        marginBottom: 0,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        marginHorizontal: 4,
    },
    micButton: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#5A51E1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#5a51e1',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    footer: {
        display: 'none',
    },
    instructionContainer: {
        display: 'none',
    },
    blurredContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    
    conversationButtonOutline: {
        borderRadius: 24,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: 'rgba(90, 81, 225, 0.5)',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
    },
    
    conversationButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 30,
        borderRadius: 24,
        minWidth: 240,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    conversationButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1.2,
        textAlign: 'center',
    },
    
    previewContainer: {
        display: 'none',
    },
    
    previewMessageBubble: {
        display: 'none',
    },
    
    previewUserBubble: {
        display: 'none',
    },
    
    previewSystemBubble: {
        display: 'none',
    },
    
    previewMessageText: {
        display: 'none',
    },
    fullBlurBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    
    centeredButtonContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    backgroundGradient: {
        display: 'none',
    },
    buttonBlurOutline: {
        borderRadius: 26,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 2,
        shadowColor: 'rgba(255, 255, 255, 0.4)',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    sheenContainer: {
        position: 'absolute',
        left: -30,
        top: -20,
        bottom: -20,
        width: 80,
        overflow: 'hidden',
        transform: [{ skewX: '-30deg' }],
        zIndex: 1,
    },
    sheenGradient: {
        width: '100%',
        height: '100%',
    },
    buttonContent: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 24,
    },
    loadingContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingIndicator: {
        transform: [{ scale: 1.2 }],
    },
    phraseSkeleton: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    phraseSkeletonLine: {
        height: 22, // Match the phraseText line height more closely
        width: '85%', // Slightly narrower for a more natural look
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Slightly brighter for visibility
        borderRadius: 6, // More rounded corners
        marginVertical: 4,
        position: 'relative', // Ensure the shimmer can be positioned absolutely inside
        overflow: 'hidden', // Clip the shimmer gradient
    },
    
    translationSkeleton: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    
    translationSkeletonLine: {
        height: 14,
        width: '70%',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 4,
    },
    expandedHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    
    gradientTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    
    gradientTitleText: {
        display: 'none', 
    },
    
    starIcon: {
        marginLeft: 6,
    },
    
    // Add style for phrase speaker icon
    phraseSpeakerIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(59, 59, 61, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    phraseContainer: {
        width: '95%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        paddingHorizontal: 12,
        marginTop: 8,
        position: 'relative',
    },
    sayLabelRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 5,
    },
    sayLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(90, 81, 225, 0.9)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    sayLabelText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginRight: 4,
    },
    sayLabelIcon: {
        marginLeft: 2,
        fontSize: 12,
    },
    phraseText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 28,
        letterSpacing: 0.3,
        paddingHorizontal: 4,
        marginBottom: 4,
    },
    phraseTranslationText: {
        color: 'rgba(255, 255, 255, 0.65)',
        fontSize: 14,
        marginTop: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    translationText: {
        color: 'rgba(255, 255, 255, 0.6)', 
        fontSize: 13,
        marginTop: 8,
        lineHeight: 18,
    },
    translatedPhraseText: {
        color: 'rgba(255, 255, 255, 0.6)', // Gray color for translated text
    },
    translationSpeakerRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 5,
    },
    phraseTextSkeleton: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    shimmerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    shimmerGradient: {
        position: 'absolute',
        top: 0,
        right: -80,
        width: 80,
        height: '100%',
    },
});

export default ConversationalView;
