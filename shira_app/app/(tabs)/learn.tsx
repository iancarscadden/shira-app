// app/(tabs)/Learn.tsx

import React, { useReducer, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Animated,
    useWindowDimensions,
    PanResponder,
    Platform,
    LayoutChangeEvent,
    Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { BlurView } from 'expo-blur';
import InstructionsView from '../views/InstructionsView';
// @ts-ignore
import QuestionIcon from '../components/question.svg';
// @ts-ignore
import SettingsIcon from '../components/settings.svg';
// @ts-ignore
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// @ts-ignore
import Ionicons from 'react-native-vector-icons/Ionicons';

import ContextView from '../views/ContextView';
import CulturalView from '../views/CulturalView';
import ConversationalView from '../views/ConversationalView';
import SettingsView from '../views/SettingsView';
import CompletionView from '../views/CompletionView';

// SVG icons
// @ts-ignore
import PlayIcon from '../components/play.svg';
// @ts-ignore
import PauseIcon from '../components/pause.svg';
// @ts-ignore
import UpArrow from '../components/up_arrow.svg';
// @ts-ignore
import DownArrow from '../components/down_arrow.svg';
// @ts-ignore
import TranslateIcon from '../components/translate.svg';
// @ts-ignore
import WorldIcon from '../components/world.svg';

import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import useUser from '../../hooks/useUser';
import { ContentService } from '../../supabase/contentService';
import { ContentRow, LessonContent } from '../../supabase/types';
import { incrementDailyVideosWatched } from '../../supabase/progressService';
import { checkFreeVideosAvailable, incrementFreeVideos } from '../../supabase/services';
import { router } from 'expo-router';
import { checkSubscriptionStatus } from '../../supabase/revenueCatClient';

// Import components
import TopControls from '../learn-components/TopControls';
import NextVideoIndicator from '../learn-components/NextVideoIndicator';
import PreviousVideoIndicator from '../learn-components/PreviousVideoIndicator';

// Import reducer and types
import learnReducer, { initialLearnState } from '../learn-components/learnReducer';
import { VideoPlayerRef } from '../learn-components/types';

// Import new components
import SidebarView from '../views/SidebarView';
import TabBar from '../views/TabBar';
import DotIndicator from '../components/DotIndicator';
import { Video } from 'expo-av';

// Constants for the collapsible lessons container
const TAB_BAR_HEIGHT = 60;
const BOTTOM_MARGIN = 10;
const COLLAPSED_HEIGHT = 60;
const GAP_BETWEEN_CONTROLS_AND_LESSONS = 15;
const SLIDER_CONTAINER_HEIGHT = 40;

// Add the MAX_FREE_VIDEOS constant at the top of the file
const MAX_FREE_VIDEOS = 3;

// Debug flag to control logging verbosity
const DEBUG_MODE = process.env.NODE_ENV !== 'production';

// Add debounce utility
const debounce = <F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
): ((...args: Parameters<F>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<F>): void => {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        timeout = setTimeout(() => {
            func(...args);
        }, waitFor);
    };
};

// Inline KeepLearningSection component
interface KeepLearningSectionProps {
    lesson: LessonContent;
    width: number;
    topPosition: number;
    height: number;
    onScreenIndexChange?: (index: number) => void;
}

interface KeepLearningSectionState {
    currentScreenIndex: number;
}

// Custom equality function for React.memo to prevent unnecessary re-renders
const keepLearningSectionPropsAreEqual = (prevProps: KeepLearningSectionProps, nextProps: KeepLearningSectionProps) => {
    // Only re-render if these specific props change
    return (
        prevProps.lesson?.video?.id === nextProps.lesson?.video?.id &&
        prevProps.width === nextProps.width &&
        // For animated values, we'll always consider them equal since they change constantly
        // and we handle their changes internally in the component
        true
    );
};

// Memoize the KeepLearningSection component to prevent unnecessary re-renders
const KeepLearningSection: React.FC<KeepLearningSectionProps> = React.memo(({
    lesson,
    width,
    topPosition,
    height,
    onScreenIndexChange,
}) => {
    // Local state for horizontal scroll
    const [state, setState] = useState<KeepLearningSectionState>({
        currentScreenIndex: 0,
    });

    // Refs for scroll control
    const scrollViewRef = useRef<ScrollView>(null);
    
    // Create animated value for border color transitions
    const borderColorAnim = useRef(new Animated.Value(0)).current;
    
    // This will interpolate the animated value to the correct color based on screen index
    const animatedBorderColor = borderColorAnim.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [
            "rgba(225, 81, 144, 0.6)", // Pink with opacity
            "rgba(90, 81, 225, 0.6)",  // Purple with opacity
            "rgba(81, 225, 162, 0.6)", // Teal with opacity
            "rgba(196, 204, 69, 0.6)"  // Yellow with opacity
        ]
    });

    // Reset screen index and scroll position when lesson changes
    useEffect(() => {
        // Reset to initial screen index
        setState({ currentScreenIndex: 0 });
        
        // Reset border color animation
        Animated.timing(borderColorAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
        
        // Force scroll back to the first screen
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ x: 0, animated: false });
        }
    }, [lesson?.video?.id, borderColorAnim]);

    // Handle horizontal scroll
    const handleHorizontalScroll = useCallback((event: any) => {
        const { contentOffset, layoutMeasurement } = event.nativeEvent;
        const pageIndex = Math.round(contentOffset.x / layoutMeasurement.width);
        
        // Update screen index state
        setState(prev => ({ ...prev, currentScreenIndex: pageIndex }));
        
        // Call the onScreenIndexChange callback if provided
        if (onScreenIndexChange) {
            onScreenIndexChange(pageIndex);
        }
        
        // Animate border color change
        Animated.timing(borderColorAnim, {
            toValue: pageIndex,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [borderColorAnim, onScreenIndexChange]);

    // Get the appropriate header title based on the current screen index
    const getHeaderTitle = () => {
        switch (state.currentScreenIndex) {
            case 0:
                return "Context Quiz";
            case 1:
                return "Inside the Culture";
            case 2:
                return "Conversational Practice";
            case 3:
                return "Video Completed";
            default:
                return "Context Quiz";
        }
    };

    // Move console.log to useEffect to prevent it from running on every render
    useEffect(() => {
        // Component rendering logic without logging
    }, [lesson?.video?.id, state.currentScreenIndex]);

    return (
        <View
            style={[
                styles.keepLearningContainer,
                {
                    width,
                    top: topPosition,
                    height,
                }
            ]}
        >
            {/* Remove the header section */}

            {/* Content area with horizontal scroll */}
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                scrollEnabled={true}
                    style={styles.scrollArea}
                contentContainerStyle={{ flexDirection: 'row' }}
                    onScroll={handleHorizontalScroll}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    snapToInterval={width}
                    snapToAlignment="center"
                >
                <View style={[styles.contentPage, { width }]}>
                        <ContextView 
                            key={`context-${lesson?.video?.id}`}
                            contextData={lesson?.context ?? null} 
                        />
                    </View>
                <View style={[styles.contentPage, { width }]}>
                        <CulturalView 
                            key={`cultural-${lesson?.video?.id}`}
                            culturalData={lesson?.cultural ?? null} 
                        />
                    </View>
                <View style={[styles.contentPage, { width }]}>
                        <ConversationalView 
                            key={`conversational-${lesson?.video?.id}`}
                            conversationalData={lesson?.conversational ?? null}
                        />
                    </View>
                <View style={[styles.contentPage, { width }]}>
                    <CompletionView 
                        key={`completion-${lesson?.video?.id}`}
                        isVisible={state.currentScreenIndex === 3}
                        />
                    </View>
                </ScrollView>
            
            {/* Dot indicator at the bottom of the container */}
            <View style={styles.dotIndicatorContainer}>
                <DotIndicator totalDots={4} activeDotIndex={state.currentScreenIndex} />
            </View>
        </View>
    );
}, keepLearningSectionPropsAreEqual);

// Add a dedicated logging function for better tracking
const logEvent = (eventName: string, data: any) => {
    // Only log in debug mode or for critical events
    if (DEBUG_MODE || eventName.includes('ERROR') || eventName.includes('FAILED')) {
        console.log(`[LEARN][${eventName}]`, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
};

// Helper function to calculate the next lesson ID
const calculateNextLessonId = async (
    currentLessonId: number, 
    targetLang: string, 
    contentService: ContentService
): Promise<number> => {
    try {
        logEvent('CALCULATING_NEXT_LESSON', {
            currentLessonId,
            targetLang
        });
        
        // Get the max lesson ID to determine when to loop back
        const maxLessonId = await contentService.getMaxLessonId(targetLang);
        
        // Calculate the next lesson ID
        let nextLessonId: number;
        if (currentLessonId < maxLessonId) {
            nextLessonId = currentLessonId + 1;
        } else {
            nextLessonId = 1; // Loop back to the first lesson
        }
        
        logEvent('NEXT_LESSON_CALCULATED', {
            currentLessonId,
            maxLessonId,
            nextLessonId,
            targetLang
        });
        
        return nextLessonId;
    } catch (error) {
        logEvent('NEXT_LESSON_CALCULATION_ERROR', {
            error: error instanceof Error ? error.message : String(error),
            currentLessonId,
            targetLang
        });
        
        // Default to incrementing by 1 in case of error
        return currentLessonId + 1;
    }
};

// Add a function to calculate the previous lesson ID
const calculatePreviousLessonId = async (
    currentLessonId: number, 
    targetLang: string, 
    contentService: ContentService
): Promise<number> => {
    if (!currentLessonId) {
        console.warn('No current lesson ID provided to calculatePreviousLessonId');
        return 1;
    }

    // Basic validation to ensure we don't go below lesson 1
    if (currentLessonId <= 1) {
        console.log('Already at first lesson, staying at lesson 1');
        return 1;
    }
    
    // Try to fetch the previous lesson to ensure it exists
    const previousLessonId = currentLessonId - 1;
    const previousLesson = await contentService.fetchLesson(previousLessonId, targetLang);
    
    // If the previous lesson exists, return its ID, otherwise return the current ID
    if (previousLesson) {
        return previousLessonId;
    } else {
        console.warn(`Previous lesson ${previousLessonId} not found, staying at current lesson`);
        return currentLessonId;
    }
};

const Learn: React.FC = () => {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { user } = useUser();
    const contentService = ContentService.getInstance();

    // Refs
    const playerRef = useRef<YoutubeIframeRef | null>(null);
    const currentVideoIdRef = useRef<string | null>(null);
    const lessonsAnim = useRef(new Animated.Value(0)).current;
    const endDetectionCount = useRef<number>(0);
    const lastEndTime = useRef<number>(0);
    const lastSeekTime = useRef<number>(0);
    const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Main state reducer
    const [state, dispatch] = useReducer(learnReducer, initialLearnState);

    // Add a state to track video transition
    const [transitionState, setTransitionState] = useState<'idle' | 'unloading' | 'loading' | 'seeking' | 'playing'>('idle');

    // Local UI states
    const [showContextView, setShowContextView] = useState(false);
    const [showCulturalView, setShowCulturalView] = useState(false);
    const [showConversationalView, setShowConversationalView] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showQuestionButton, setShowQuestionButton] = useState(true);
    const [keyPhraseReplay, setKeyPhraseReplay] = useState<'off' | 'once'>('off');
    const [translated, setTranslated] = useState(false);

    // Add video state
    const [videoState, setVideoState] = useState({
        playing: false,
        currentTime: 0,
        isReady: false,
    });

    // Add state for pause indicator opacity
    const [pauseIndicatorOpacity] = useState(new Animated.Value(0));

    // Add seeking flag to prevent overlapping seeks
    const [isSeeking, setIsSeeking] = useState(false);

    // Video player specific state
    const [currentCaption, setCurrentCaption] = useState<{
        targetLangLine: string;
        nativeLangLine: string;
    } | null>(null);
    const [isFirstPlay, setIsFirstPlay] = useState(true);
    // Add new state for phrase repetition
    const [phraseRepeatCount, setPhraseRepeatCount] = useState(0);
    const [isInHighlightedSection, setIsInHighlightedSection] = useState(false);
    const [shouldRepeatPhrase, setShouldRepeatPhrase] = useState(false);

    // Create pan responder state
    const [gestureState, setGestureState] = useState({
        isActive: false,
        gestureY: 0,
        direction: null as 'up' | 'down' | null,
    });

    // Calculate dimensions
    const videoHeight = (width * 9) / 16;
    const ELEMENT_PADDING = 16; // Use consistent padding between elements
    const VIDEO_TO_CONTROLS_GAP = ELEMENT_PADDING;
    const controlsHeight = 44; // Height of seek buttons container
    
    // Final top position for the fixed container (video player)
    const finalFixedTop = insets.top; // Remove the +20 padding to connect directly with safe area
    const questionMarkTop = finalFixedTop - 60;
    
    // Fixed container position
    const fixedContainerTop = finalFixedTop;

    // Update to make controls position dynamically based on video player
    // Instead of a fixed controlsTop value, we'll calculate it in the view
    
    // Lessons section position and dimensions - reduce the space between controls and lessons
    const lessonsTop = finalFixedTop + videoHeight + 8 + controlsHeight; // Recalculate based on dynamic controls
    const lessonsHeight = height - lessonsTop - TAB_BAR_HEIGHT - BOTTOM_MARGIN - insets.bottom;
    
    // Background color for safe area
    const safeAreaBgColor = '#000000'; // Change to black
    
    // Remove all duplicate variable declarations below this point

    // Background color animation for safe area
    // const safeAreaBgColorAnim = animationController.interpolate({...});
    // const uiElementsOpacity = animationController.interpolate({...});

    // Opacity animation for UI elements
    // const uiElementsOpacity = animationController.interpolate({
    //     inputRange: [0, 0.2],
    //     outputRange: [1, 0],
    //     extrapolate: 'clamp',
    // });

    // Update captions based on current time
    useEffect(() => {
        if (!state.currentLesson?.data.video.captions || !videoState.isReady) return;

        // videoState.currentTime is already relative to clipStart (adjusted in updateVideoState)
        // so we can use it directly with the caption's localStart and localEnd
        const currentTime = videoState.currentTime;

        // Find the caption that matches the current time
        const caption = state.currentLesson.data.video.captions.find(cap => {
            return currentTime >= cap.localStart && currentTime <= cap.localEnd;
        });

        // Check if current caption contains highlight phrase
        const highlightPhrase = state.currentLesson.data.video.highlightPhrase;
        const isHighlightedCaption = caption?.targetLangLine.toLowerCase().includes(highlightPhrase.toLowerCase());
        
        // Handle phrase repetition - only if keyPhraseReplay is not 'off'
        if (keyPhraseReplay !== 'off' && isFirstPlay && isHighlightedCaption && !isInHighlightedSection && phraseRepeatCount < 3 && caption) {
            setIsInHighlightedSection(true);
            setShouldRepeatPhrase(true);
        } else if (!isHighlightedCaption && isInHighlightedSection) {
            setIsInHighlightedSection(false);
            
            if (keyPhraseReplay !== 'off' && shouldRepeatPhrase && phraseRepeatCount < 2) {
                // Find the caption that comes right before the highlighted phrase
                const captions = state.currentLesson.data.video.captions;
                const highlightCaptionIndex = captions.findIndex(cap => 
                    cap.targetLangLine.toLowerCase().includes(highlightPhrase.toLowerCase())
                );
                
                if (highlightCaptionIndex > 0) {
                    // Jump to the beginning of the highlighted phrase caption
                    const jumpToTime = Math.max(0, captions[highlightCaptionIndex].localStart);
                    handleSeek(jumpToTime);
                    setPhraseRepeatCount(prev => prev + 1);
                }
            }
            setShouldRepeatPhrase(false);
        }

        // Log caption changes for debugging
        if (caption !== currentCaption) {
            logEvent('CAPTION_CHANGED', {
                currentTime,
                captionStart: caption?.localStart,
                captionEnd: caption?.localEnd,
                captionText: caption?.targetLangLine,
                videoId: state.currentLesson.data.video.id
            });
        }

        setCurrentCaption(caption || null);
    }, [videoState.currentTime, state.currentLesson?.data.video.captions, videoState.isReady, isFirstPlay, phraseRepeatCount, isInHighlightedSection, shouldRepeatPhrase, keyPhraseReplay, currentCaption]);

    // Reset phrase repeat state when video changes
    useEffect(() => {
        setPhraseRepeatCount(0);
        setIsInHighlightedSection(false);
        setShouldRepeatPhrase(false);
    }, [state.currentLesson?.data.video.id]);

    // Add effect to handle lesson changes with more debugging
    useEffect(() => {
        if (state.currentLesson) {
            const clipStart = state.currentLesson.data.video.clipStart;
            const clipEnd = state.currentLesson.data.video.clipEnd;
            const videoId = state.currentLesson.data.video.id;
            
            // Update the current video ID reference immediately when lesson changes
            // This is critical for preventing video ID mismatches
            currentVideoIdRef.current = videoId;
            
            console.log('Lesson changed to:', {
                id: state.currentLesson.id,
                videoId: videoId,
                clipStart,
                clipEnd,
                clipDuration: clipEnd - clipStart,
                timestamp: new Date().toISOString(),
                createdAt: state.currentLesson.created_at,
                currentVideoIdRef: currentVideoIdRef.current // Log the ref to verify it's updated
            });
            
            // Reset video state when lesson changes
            setVideoState({
                playing: false,
                currentTime: 0,
                isReady: false,
            });
            
            // Force unload the current video player if it exists
            if (playerRef.current) {
                try {
                    // Add a small delay before seeking to ensure the player is ready
                    setTimeout(async () => {
                        if (playerRef.current) {
                            // Ensure we're at the beginning of the clip, not the beginning of the video
                            await playerRef.current.seekTo(clipStart, true);
                            console.log('Reset video player position to beginning of clip at', clipStart);
                        }
                    }, 300);
                } catch (err) {
                    console.error('Error resetting video player:', err);
                }
            }
            
            setIsFirstPlay(true);
            setPhraseRepeatCount(0);
            setIsInHighlightedSection(false);
            setShouldRepeatPhrase(false);
            setCurrentCaption(null);
            
            // Reset other UI states
            setShowQuestionButton(true);
            setTranslated(false);
            
            // Reset gesture state
            setGestureState({ isActive: false, gestureY: 0, direction: null });
            
            // Force re-render of KeepLearningSection by setting a key
            console.log('Forcing re-render of KeepLearningSection with new lesson data');
        }
    }, [state.currentLesson]);

    // Add cleanup function to prevent memory leaks
    useEffect(() => {
        return () => {
            // Clear any pending timeouts
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
                seekTimeoutRef.current = null;
            }
            
            // Reset state variables
            lastSeekTime.current = 0;
            endDetectionCount.current = 0;
            lastEndTime.current = 0;
            
            // Reset the current video ID reference
            currentVideoIdRef.current = '';
            
            // Log cleanup
            logEvent('COMPONENT_CLEANUP', {
                timestamp: new Date().toISOString()
            });
        };
    }, []);

    // Complete reset of ALL state related to the video player
    const completeStateReset = useCallback(() => {
        // Make sure we keep a reference to the current video ID for logging
        const previousVideoId = currentVideoIdRef.current;
        
        logEvent('COMPLETE_STATE_RESET', {
            previousVideoId: previousVideoId,
            isTransitioning: state.isTransitioning,
            transitionState,
            clipStart: state.currentLesson?.data.video.clipStart,
            clipEnd: state.currentLesson?.data.video.clipEnd
        });
        
        // Clear any pending timeouts
        if (seekTimeoutRef.current) {
            clearTimeout(seekTimeoutRef.current);
            seekTimeoutRef.current = null;
        }
        
        // Reset all ref values
        lastSeekTime.current = 0;
        endDetectionCount.current = 0;
        lastEndTime.current = 0;
        
        // We'll set this to null but not clear it completely
        // It will be updated with the new video ID when the new lesson loads
        currentVideoIdRef.current = null;
        
        // Reset all video-related state
            setVideoState({
                playing: false,
                isReady: false,
            currentTime: 0
            });
            
        // Reset caption and phrase-related state
        setCurrentCaption(null);
            setIsFirstPlay(true);
            setPhraseRepeatCount(0);
            setIsInHighlightedSection(false);
            setShouldRepeatPhrase(false);
        
        // Reset UI state
        setShowQuestionButton(true);
        setTranslated(false);
        setIsSeeking(false);
        
        // Reset animations
            pauseIndicatorOpacity.setValue(0);
            
        // Log the reset
        logEvent('STATE_RESET_COMPLETED', {
            timestamp: new Date().toISOString()
        });
    }, [
        // Include all state variables that are being reset
        transitionState, 
        state.isTransitioning,
        state.currentLesson,
        pauseIndicatorOpacity,
        // Include all setter functions
    ]);
    
    // Simplified reset for video player only (used in some contexts)
    const resetVideoPlayer = useCallback(() => {
        logEvent('RESETTING_VIDEO_PLAYER', {
            currentVideoId: currentVideoIdRef.current
        });
        
        // Clear any pending timeouts
        if (seekTimeoutRef.current) {
            clearTimeout(seekTimeoutRef.current);
            seekTimeoutRef.current = null;
        }
        
        // Reset video state
        setVideoState({
            playing: false,
            isReady: false,
            currentTime: 0
        });
        
        // Ensure pause indicator is hidden
        pauseIndicatorOpacity.setValue(0);
        
        // Reset the current video ID reference
        currentVideoIdRef.current = null;
    }, [pauseIndicatorOpacity]);

    // Handle next video transition
    const handleNextVideo = useCallback(async () => {
        if (!user?.target_lang || !state.currentLesson || state.isTransitioning) {
            logEvent('TRANSITION_SKIPPED', {
                reason: !user?.target_lang ? 'No target language' : 
                       !state.currentLesson ? 'No current lesson' : 
                       'Already transitioning',
                userId: user?.id,
                targetLang: user?.target_lang,
                currentLessonId: state.currentLesson?.id
            });
            return;
        }

        // Store gesture state to restore after transition
        const wasGestureActive = gestureState.isActive;
        const currentGestureDirection = gestureState.direction;

        try {
            // Check if user is subscribed
            logEvent('CHECKING_SUBSCRIPTION', { userId: user?.id });
            const { isPro: isSubscribed } = await checkSubscriptionStatus();
            
            if (user) {
                user.is_pro = isSubscribed;
            }

            // Check if user has used all free videos
            if (!isSubscribed && !user?.is_pro) {
                const hasAvailableVideos = await checkFreeVideosAvailable(user.id);
                logEvent('FREE_VIDEOS_CHECK', { 
                    userId: user?.id, 
                    hasAvailableVideos, 
                    isSubscribed 
                });
                
                if (!hasAvailableVideos) {
                    logEvent('MAX_FREE_VIDEOS_REACHED', { 
                        userId: user?.id
                    });
                    router.push('/paywall');
                    return;
                }
                
                // Increment the free videos counter
                const newCount = await incrementFreeVideos(user.id);
                logEvent('FREE_VIDEOS_INCREMENTED', {
                    userId: user.id,
                    newCount
                });
            }

            // Start transition
            dispatch({ type: 'START_TRANSITION' });
            
            // IMPORTANT: Reset ALL state before changing the video
            // This ensures no state from the previous video persists
            completeStateReset();
            
            // Set transition state to unloading to trigger the state machine
            setTransitionState('unloading');
            
            logEvent('TRANSITION_STARTED', { 
                fromLessonId: state.currentLesson.id,
                targetLang: user.target_lang,
                transitionState: 'unloading'
            });
            
            // Calculate the next lesson ID
            const nextLessonId = await calculateNextLessonId(state.currentLesson.id, user.target_lang, contentService);
            
            // Fetch the next lesson content
            const nextLessonContent = await contentService.fetchLesson(nextLessonId, user.target_lang);
            
            if (!nextLessonContent) {
                logEvent('NEXT_LESSON_FETCH_FAILED', { 
                                nextLessonId,
                    targetLang: user.target_lang
                });
                
                // Try to fetch lesson 1 as a fallback
                const firstLessonContent = await contentService.fetchLesson(1, user.target_lang);
                
                if (!firstLessonContent) {
                    throw new Error('Failed to fetch any lesson content');
                }
                
                // Use lesson 1 as the next lesson
                const fallbackNextLesson = {
                    id: 1,
                                language: user.target_lang,
                    data: firstLessonContent,
                                created_at: new Date().toISOString()
                            };
                            
                logEvent('FALLBACK_TO_FIRST_LESSON', {
                    originalNextLessonId: nextLessonId,
                    fallbackLessonId: 1
                });
                
                // Update current_lesson_id in the database
                await contentService.updateCurrentLesson(user.id, fallbackNextLesson.id, user.target_lang);
                
                // Complete the transition with the fallback lesson
                dispatch({
                    type: 'COMPLETE_TRANSITION',
                    payload: {
                        currentLesson: fallbackNextLesson
                    }
                });
                
                logEvent('TRANSITION_COMPLETED_WITH_FALLBACK', {
                    newCurrentLessonId: fallbackNextLesson.id
                });
                
                return;
            }
            
            // Create the next lesson object
            const nextLesson = {
                id: nextLessonId,
                language: user.target_lang,
                data: nextLessonContent,
                created_at: new Date().toISOString()
            };
            
            // Update current_lesson_id in the database
            await contentService.updateCurrentLesson(user.id, nextLesson.id, user.target_lang);
            
            logEvent('TRANSITION_PREPARED', {
                currentLessonId: state.currentLesson.id,
                nextLessonId: nextLesson.id,
                targetLang: user.target_lang
            });
            
            // Complete the transition with the next lesson
                dispatch({
                    type: 'COMPLETE_TRANSITION',
                    payload: {
                    currentLesson: nextLesson
                }
            });
            
            logEvent('TRANSITION_COMPLETED', {
                newCurrentLessonId: nextLesson.id,
                targetLang: user.target_lang
            });
        } catch (error) {
            logEvent('TRANSITION_ERROR', { 
                error: error instanceof Error ? error.message : String(error),
                currentLessonId: state.currentLesson.id,
                targetLang: user?.target_lang
            });
            
            dispatch({ type: 'SET_ERROR', payload: 'Failed to transition to next lesson' });
            dispatch({ type: 'SET_LOADING', payload: false });
            
            // Reset transition state on error
            setTransitionState('idle');
            
            // Show error toast
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load the next lesson. Please try again.',
                position: 'bottom'
            });
        } finally {
            // Only reset gesture state if it was active before and not triggered by an upward swipe
            if (wasGestureActive && currentGestureDirection !== 'up') {
                setGestureState({ isActive: false, gestureY: 0, direction: null });
            }
        }
    }, [
        user?.target_lang, 
        user?.id, 
        state.currentLesson, 
        state.isTransitioning, 
        gestureState.isActive, 
        gestureState.direction, 
        contentService, 
        router,
        completeStateReset // Add the new function to dependencies
    ]);

    // Expose the current screen index from the KeepLearningSection for swipe gesture handling
    const [currentQuizScreenIndex, setCurrentQuizScreenIndex] = useState<number>(0);

    // Handle previous video transition
    const handlePreviousVideo = useCallback(async () => {
        if (!user?.target_lang || !state.currentLesson || state.isTransitioning) {
            logEvent('PREVIOUS_TRANSITION_SKIPPED', {
                reason: !user?.target_lang ? 'No target language' : 
                      !state.currentLesson ? 'No current lesson' : 
                      'Already transitioning',
                userId: user?.id,
                targetLang: user?.target_lang,
                currentLessonId: state.currentLesson?.id
            });
            return;
        }

        // Store gesture state to restore after transition
        const wasGestureActive = gestureState.isActive;
        const currentGestureDirection = gestureState.direction;

        try {
            // Start transition
            dispatch({ type: 'START_TRANSITION' });
            
            // Reset ALL state before changing the video
            completeStateReset();
            
            // Set transition state to unloading to trigger the state machine
            setTransitionState('unloading');
            
            logEvent('PREVIOUS_TRANSITION_STARTED', { 
                fromLessonId: state.currentLesson.id,
                targetLang: user.target_lang,
                transitionState: 'unloading'
            });
            
            // Calculate the previous lesson ID
            const previousLessonId = await calculatePreviousLessonId(state.currentLesson.id, user.target_lang, contentService);
            
            // Fetch the previous lesson content
            const previousLessonContent = await contentService.fetchLesson(previousLessonId, user.target_lang);
            
            if (!previousLessonContent) {
                logEvent('PREVIOUS_LESSON_FETCH_FAILED', { 
                    previousLessonId,
                    targetLang: user.target_lang
                });
                
                // Stay on current lesson if previous lesson fetch failed
                throw new Error(`Failed to fetch previous lesson content for ID ${previousLessonId}`);
            }
            
            // Create the previous lesson object
            const previousLesson = {
                id: previousLessonId,
                language: user.target_lang,
                data: previousLessonContent,
                created_at: new Date().toISOString()
            };
            
            // Update current_lesson_id in the database
            await contentService.updateCurrentLesson(user.id, previousLesson.id, user.target_lang);
            
            logEvent('PREVIOUS_TRANSITION_PREPARED', {
                currentLessonId: state.currentLesson.id,
                previousLessonId: previousLesson.id,
                targetLang: user.target_lang
            });
            
            // Complete the transition with the previous lesson
            dispatch({
                type: 'COMPLETE_TRANSITION',
                payload: {
                    currentLesson: previousLesson
                }
            });
            
            logEvent('PREVIOUS_TRANSITION_COMPLETED', {
                newCurrentLessonId: previousLesson.id,
                targetLang: user.target_lang
            });
        } catch (error) {
            logEvent('PREVIOUS_TRANSITION_ERROR', { 
                error: error instanceof Error ? error.message : String(error),
                currentLessonId: state.currentLesson.id,
                targetLang: user?.target_lang
            });
            
            dispatch({ type: 'SET_ERROR', payload: 'Failed to transition to previous lesson' });
            dispatch({ type: 'SET_LOADING', payload: false });
            
            // Reset transition state on error
            setTransitionState('idle');
            
            // Show error toast
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load the previous lesson. Please try again.',
                position: 'bottom'
            });
        } finally {
            // Only reset gesture state if it was active before and not triggered by a downward swipe
            if (wasGestureActive && currentGestureDirection !== 'down') {
                setGestureState({ isActive: false, gestureY: 0, direction: null });
            }
        }
    }, [
        user?.target_lang, 
        user?.id, 
        state.currentLesson, 
        state.isTransitioning, 
        gestureState.isActive, 
        gestureState.direction, 
        contentService, 
        completeStateReset
    ]);

    // Update the panResponder to handle swiping down
    const panResponder = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
            // Only respond to gestures when on the completion screen (4th screen, index 3)
            // or when not in any of the learning content screens
            if (currentQuizScreenIndex !== 3 && currentQuizScreenIndex >= 0) {
                return false;
            }
            
            // Only respond to vertical gestures
            return Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 3) && Math.abs(gestureState.dy) > 10;
        },
        onPanResponderGrant: () => {
            // Initial touch
        },
        onPanResponderMove: (_, gestureState) => {
            // Don't track movement if not on completion screen and in learning content
            if (currentQuizScreenIndex !== 3 && currentQuizScreenIndex >= 0) {
                return;
            }
            
            // Get direction based on dy
            const direction = gestureState.dy > 0 ? 'down' : 'up';
            
            // Amplify gesture for better visual feedback
            const amplifiedGestureY = Math.abs(gestureState.dy) * 1.2;
            
            setGestureState({ 
                isActive: true, 
                gestureY: amplifiedGestureY,
                direction 
            });
        },
        onPanResponderRelease: (_, gestureState) => {
            // Early return if not on completion screen and in learning content
            if (currentQuizScreenIndex !== 3 && currentQuizScreenIndex >= 0) {
                setGestureState({ isActive: false, gestureY: 0, direction: null });
                return;
            }

            // Handling for swipe up (next video)
            if (gestureState.dy < -80) {
                // Set the gesture state for the animation
                setGestureState({ 
                    isActive: false, 
                    gestureY: Math.abs(gestureState.dy) * 1.2,
                    direction: 'up' 
                });
                
                // Start loading the next video immediately
                handleNextVideo();
            } 
            // NEW: Handling for swipe down (previous video)
            else if (gestureState.dy > 80) {
                // Set the gesture state for the animation
                setGestureState({ 
                    isActive: false, 
                    gestureY: Math.abs(gestureState.dy) * 1.2,
                    direction: 'down' 
                });
                
                // Start loading the previous video immediately
                handlePreviousVideo();
            }
            else {
                // Reset if swipe wasn't sufficient
                setGestureState({ 
                    isActive: false, 
                    gestureY: Math.abs(gestureState.dy), 
                    direction: gestureState.dy > 0 ? 'down' : 'up' 
                });
                setTimeout(() => {
                    setGestureState({ isActive: false, gestureY: 0, direction: null });
                }, 300);
            }
        },
        onPanResponderTerminate: () => {
            setGestureState({ isActive: false, gestureY: 0, direction: null });
        },
    }), [handleNextVideo, handlePreviousVideo, currentQuizScreenIndex, logEvent, state.currentLesson]);

    // Create a debounced version of the seek function
    const debouncedSeek = useCallback(
        debounce((time: number) => {
            if (playerRef.current) {
                playerRef.current.seekTo(time, true);
            }
        }, 300),
        []
    );

    // Handle seek with proper state updates
    const handleSeek = useCallback(async (time: number) => {
        if (!playerRef.current || !state.currentLesson || isSeeking) return;
        
        try {
            setIsSeeking(true);
            
            // Ensure time is within clip boundaries (0 to clipEnd-clipStart)
        const clipStart = state.currentLesson.data.video.clipStart;
        const clipEnd = state.currentLesson.data.video.clipEnd;
            const clipDuration = clipEnd - clipStart;
        const videoId = state.currentLesson.data.video.id;
        
            // Clamp the time to ensure it's within the valid range
            const clampedTime = Math.max(0, Math.min(time, clipDuration));
            
            // Convert to absolute video time
            const actualTime = clipStart + clampedTime;
            
            logEvent('SEEKING_TO_TIME', {
                requestedTime: time,
                clampedTime,
                actualTime,
                clipStart,
                clipEnd,
                videoId
            });
            
            // Prevent seeking if we've recently tried to seek to avoid loops
            const now = Date.now();
            if (now - lastSeekTime.current < 300) {
                logEvent('SEEK_THROTTLED', {
                    timeSinceLastSeek: now - lastSeekTime.current,
                    requestedTime: time,
                videoId
            });
                setIsSeeking(false);
                return;
            }
            
            // Update the last seek time
            lastSeekTime.current = now;
            
            // Pause the video before seeking to ensure smooth seeking
            if (videoState.playing) {
                setVideoState(prev => ({ ...prev, playing: false }));
                
                // Short delay to ensure the pause takes effect
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Use direct seek instead of debounced seek for more precise control
            await playerRef.current.seekTo(actualTime, true);
            
            // Short delay to ensure the seek completes
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Resume playback if it was playing before
            if (videoState.playing) {
                setVideoState(prev => ({ ...prev, playing: true, currentTime: clampedTime }));
            } else {
                // Just update the current time if not playing
                setVideoState(prev => ({ ...prev, currentTime: clampedTime }));
            }
            
            // Verify the seek was successful
            const verifyTime = await playerRef.current.getCurrentTime().catch(() => -1);
            if (verifyTime !== -1 && Math.abs(verifyTime - actualTime) > 1) {
                logEvent('SEEK_VERIFICATION_FAILED', {
                    requestedTime: actualTime,
                    actualTime: verifyTime,
                    difference: Math.abs(verifyTime - actualTime),
                    videoId
                });
                
                // Try one more time if the seek failed
                await playerRef.current.seekTo(actualTime, true);
            }
        } catch (error) {
            logEvent('SEEK_ERROR', {
                error: error instanceof Error ? error.message : String(error),
                requestedTime: time
            });
        } finally {
            setIsSeeking(false);
        }
    }, [state.currentLesson?.data.video.clipStart, state.currentLesson?.data.video.clipEnd, state.currentLesson?.data.video.id, videoState.playing, isSeeking]);

    // Handle seeking by an offset amount (for -2s and +2s buttons)
    const handleSeekOffset = useCallback(async (offsetSeconds: number) => {
        if (!playerRef.current || !state.currentLesson || isSeeking) return;
        
        try {
            // Get current relative time
            const currentRelativeTime = videoState.currentTime;
            const clipStart = state.currentLesson.data.video.clipStart;
            const clipEnd = state.currentLesson.data.video.clipEnd;
            const clipDuration = clipEnd - clipStart;
            
            // Calculate new target time
            const newTargetTime = currentRelativeTime + offsetSeconds;
            
            // Handle boundary conditions
            if (newTargetTime < 0) {
                // If seeking backward would go before clip start, seek to clip start
                logEvent('SEEK_OFFSET_BOUNDARY', {
                    direction: 'backward',
                    currentTime: currentRelativeTime,
                    offsetSeconds,
                    newTargetTime,
                    action: 'seek_to_start',
                    videoId: state.currentLesson.data.video.id
                });
                return handleSeek(0);
            } else if (newTargetTime > clipDuration) {
                // If seeking forward would go beyond clip end, seek to clip start
                logEvent('SEEK_OFFSET_BOUNDARY', {
                    direction: 'forward',
                    currentTime: currentRelativeTime,
                    offsetSeconds,
                    newTargetTime,
                    clipDuration,
                    action: 'seek_to_start',
                    videoId: state.currentLesson.data.video.id
                });
                return handleSeek(0);
            }
            
            // Normal seek within bounds
            logEvent('SEEK_OFFSET', {
                direction: offsetSeconds > 0 ? 'forward' : 'backward',
                currentTime: currentRelativeTime,
                offsetSeconds,
                newTargetTime,
                videoId: state.currentLesson.data.video.id
            });
            return handleSeek(newTargetTime);
        } catch (error) {
            logEvent('SEEK_OFFSET_ERROR', {
                error: error instanceof Error ? error.message : String(error),
                offsetSeconds,
                videoId: state.currentLesson?.data.video.id
            });
        }
    }, [videoState.currentTime, state.currentLesson, isSeeking, handleSeek]);

    // Update video state based on current time
    const updateVideoState = async (currentTime: number) => {
        console.log("[DIAG][UPDATE_VIDEO_STATE] Called", {
            currentTime,
            isTransitioning: state.isTransitioning,
            timestamp: new Date().toISOString(),
            videoId: state.currentLesson?.data.video.id
        });
        
        if (!state.currentLesson || !playerRef.current || isSeeking) return;
        
            const clipStart = state.currentLesson.data.video.clipStart;
            const clipEnd = state.currentLesson.data.video.clipEnd;
            const videoId = state.currentLesson.data.video.id;
            
        // Skip updates if the video ID doesn't match the current one
        if (currentVideoIdRef.current !== videoId) {
            // If we're in a transition, update the reference instead of skipping
            if (state.isTransitioning || transitionState === 'loading') {
                console.log("[VIDEO_ID_AUTO_CORRECTION] Updating currentVideoIdRef during transition", {
                    oldVideoId: currentVideoIdRef.current,
                    newVideoId: videoId,
                    transitionState,
                    timestamp: new Date().toISOString()
                });
                currentVideoIdRef.current = videoId;
            } else {
                logEvent('VIDEO_STATE_UPDATE_SKIPPED', {
                    reason: 'Video ID mismatch',
                    currentVideoId: currentVideoIdRef.current,
                    receivedVideoId: videoId
                });
                return;
            }
        }
        
        // Check if we're in a transition state - don't try to update video state during transitions
        if (state.isTransitioning || transitionState !== 'playing') {
            logEvent('VIDEO_STATE_UPDATE_SKIPPED', {
                reason: state.isTransitioning ? 'In transition' : `Transition state: ${transitionState}`,
                videoId
            });
            return;
        }
        
        // Validate the current time - sometimes YouTube returns extremely large values
        if (currentTime > 10000 || currentTime < 0) {
            logEvent('INVALID_CURRENT_TIME', {
                currentTime,
                videoId
            });
            return;
        }
        
        // Ensure we're working with the absolute time from the player
        const absoluteTime = currentTime;
        
        // Calculate time relative to clip start for UI and captions
        const relativeTime = Math.max(0, absoluteTime - clipStart);
        
        // Log the time values for debugging
        logEvent('VIDEO_TIME_DEBUG', {
            absoluteTime,
            relativeTime,
                clipStart,
                clipEnd,
            videoId: currentVideoIdRef.current
            });
            
        // Update the current time in the video state - this updates the scrubber position
        // This makes videoState.currentTime relative to clipStart for consistent use with captions
            setVideoState(prev => ({ 
                ...prev, 
            currentTime: relativeTime,
            // Add progress calculation based on relative time and clip duration
            progress: relativeTime / (clipEnd - clipStart)
        }));
        
        // SINGLE SOURCE OF TRUTH FOR CLIP BOUNDARIES
        // Check if we're outside the clip boundaries
        if (absoluteTime < clipStart - 0.5) { // Add a small buffer to prevent excessive seeking
            logEvent('VIDEO_TIME_BEFORE_CLIP_START', {
                currentTime: absoluteTime,
                clipStart,
                difference: clipStart - absoluteTime,
                videoId
            });
            
            // Prevent seeking if we've recently tried to seek to avoid loops
            const now = Date.now();
            if (now - lastSeekTime.current > 1000 && !isSeeking) { // Reduced to 1 second to be more responsive
                lastSeekTime.current = now;
                
                try {
                    setIsSeeking(true);
                    
                    // Pause before seeking to ensure smooth seeking
                    const wasPlaying = videoState.playing;
                    setVideoState(prev => ({ ...prev, playing: false }));
                    
                    // Short delay to ensure pause takes effect
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Seek to the clip start
                    await playerRef.current.seekTo(clipStart, true);
                    
                    logEvent('SEEKING_TO_CLIP_START', {
                                    clipStart,
                        videoId
                    });
                    
                    // Short delay to let the seek complete
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Resume playback if it was playing before
                    if (wasPlaying) {
                        setVideoState(prev => ({ ...prev, playing: true, currentTime: 0 }));
                                } else {
                        setVideoState(prev => ({ ...prev, currentTime: 0 }));
                    }
                } catch (error) {
                    logEvent('SEEK_TO_CLIP_START_ERROR', {
                        error: error instanceof Error ? error.message : String(error),
                        videoId
                    });
                } finally {
                    setIsSeeking(false);
                }
                return; // Skip the rest of the processing after seeking
            }
        }
        
        // Check if we've reached the end of the clip
        if (absoluteTime >= clipEnd) {
            logEvent('VIDEO_REACHED_END_OF_CLIP', {
                currentTime: absoluteTime,
                clipEnd,
                difference: absoluteTime - clipEnd,
                videoId
            });
            
            // Prevent seeking if we've recently tried to seek to avoid loops
            const now = Date.now();
            if (now - lastSeekTime.current > 1000 && !isSeeking) {
                lastSeekTime.current = now;
                
                try {
                    setIsSeeking(true);
                    
                    // Force pause before seeking to avoid playback issues
                    const wasPlaying = videoState.playing;
                    setVideoState(prev => ({ ...prev, playing: false }));
                    
                    // Short delay to ensure pause takes effect
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Seek to the clip start
                                await playerRef.current.seekTo(clipStart, true);
                    
                    // Short delay to ensure the seek completes
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Resume playback if it was playing before
                    if (wasPlaying) {
                        setVideoState(prev => ({ ...prev, playing: true, currentTime: 0 }));
                    } else {
                        setVideoState(prev => ({ ...prev, currentTime: 0 }));
                    }
                    
                    logEvent('SEAMLESSLY_LOOPED_BACK', {
                        clipStart,
                        videoId
                    });
                    
                    // If this is the first playthrough, update the state
                    if (isFirstPlay) {
                        logEvent('FIRST_PLAYTHROUGH_COMPLETE', {
                            videoId
                        });
                        setIsFirstPlay(false);
                    }
        } catch (error) {
                    logEvent('LOOP_BACK_ERROR', {
                        error: error instanceof Error ? error.message : String(error),
                        videoId
                    });
                } finally {
                    setIsSeeking(false);
                }
                return; // Skip the rest of the processing after seeking
            }
        }
        
        // Use the relative time for caption finding
        
        // Find the current caption based on the time
        const currentCaptions = state.currentLesson.data.video.captions;
        if (currentCaptions && currentCaptions.length > 0) {
            // Rest of the caption handling code...
        }
    };

    // Handle errors in video playback
    const handleVideoError = (e: any) => {
        console.error('YouTube Player Error:', e);
        
        // Show error toast
        Toast.show({
            type: 'error',
            text1: 'Video playback error',
            position: 'top',
        });
        
        // If we're in a transition, reset the transition state
        if (state.isTransitioning) {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    // Load initial lessons
    useEffect(() => {
        let isMounted = true;

        async function loadLessons() {
            if (!user?.target_lang || !user?.id) return;
            
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                // Get the user's current lesson ID
                const currentLessonId = await contentService.getCurrentLessonId(user.id, user.target_lang);
                
                console.log('Initial lesson loading:', {
                    userId: user.id,
                    targetLang: user.target_lang,
                    currentLessonId,
                    timestamp: new Date().toISOString()
                });
                
                if (!isMounted) return;

                if (currentLessonId) {
                    // Fetch the current lesson content
                    const currentLessonContent = await contentService.fetchLesson(currentLessonId, user.target_lang);
                    
                    if (currentLessonContent) {
                        // Create lesson object with the correct ID
                    const currentLesson = {
                            id: currentLessonId,
                        language: user.target_lang,
                        data: currentLessonContent,
                        created_at: new Date().toISOString()
                    };
                    
                        console.log('Setting initial lesson:', {
                            currentLessonId: currentLesson.id,
                            timestamp: new Date().toISOString()
                        });

                        // Ensure the current lesson ID is updated in the database
                        await contentService.updateCurrentLesson(user.id, currentLessonId, user.target_lang);

                    dispatch({
                        type: 'COMPLETE_TRANSITION',
                            payload: { currentLesson }
                    });
                } else {
                        // Fallback to first lesson if current lesson content can't be fetched
                        fallbackToFirstLesson();
                    }
                } else {
                    // Fallback to first lesson if no current lesson ID
                    fallbackToFirstLesson();
                }
            } catch (error) {
                console.error('Error loading lessons:', error);
                if (isMounted) {
                    fallbackToFirstLesson();
                }
            } finally {
                if (isMounted) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
        }

        async function fallbackToFirstLesson() {
            if (!user?.target_lang || !user?.id || !isMounted) return;
            
            console.log('No current lesson found, falling back to first lesson');
            
            try {
                const firstLessonContent = await contentService.fetchLesson(1, user.target_lang);
                
                if (!firstLessonContent || !isMounted) return;

                // Always start with lesson 1 when falling back
                const initialLessonId = 1;
                
                        const initialLesson = {
                    id: initialLessonId,
                            language: user.target_lang,
                    data: firstLessonContent,
                            created_at: new Date().toISOString()
                        };
                        
                console.log('Setting fallback lesson:', {
                    initialLessonId,
                    timestamp: new Date().toISOString()
                });

                        // Set initial lesson as current
                await contentService.updateCurrentLesson(user.id, initialLessonId, user.target_lang);

                        dispatch({
                            type: 'COMPLETE_TRANSITION',
                    payload: { currentLesson: initialLesson }
                });
            } catch (fallbackError) {
                console.error('Error loading fallback lesson:', fallbackError);
                if (isMounted) {
                    dispatch({ type: 'SET_ERROR', payload: 'Failed to load any lessons' });
                }
            }
        }

        loadLessons();
        return () => { isMounted = false; };
    }, [user?.target_lang, user?.id, contentService]);
    
    // Add effect to update current_lesson_id when video successfully loads
    useEffect(() => {
        async function updateCurrentLessonId() {
            if (!user?.id || !state.currentLesson || !videoState.isReady) return;
            
            try {
                // Instead of updating the database, just log that the video has loaded successfully
                logEvent('VIDEO_READY_FOR_LESSON', {
                    userId: user.id,
                    lessonId: state.currentLesson.id,
                    videoId: state.currentLesson.data.video.id,
                    targetLang: user?.target_lang
                });
                
                // Note: We've removed the database update here to avoid race conditions
                // The database is already updated during initial load and transitions
            } catch (error) {
                logEvent('VIDEO_READY_ERROR', {
                    error: error instanceof Error ? error.message : String(error),
                    lessonId: state.currentLesson.id
                });
            }
        }

        updateCurrentLessonId();
    }, [user?.id, state.currentLesson?.id, videoState.isReady, user?.target_lang]);

    // Add new state for sidebar
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [currentTab, setCurrentTab] = useState<'explore' | 'saved'>('explore');

    // Styles that need insets
    const navigationStyles = {
        tabNavigationContainer: {
            position: 'absolute' as const,
            top: insets.top + 20,
            left: 0,
            right: 0,
            zIndex: 2,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
    };

    // Call when screen index changes
    const handleScreenIndexChange = useCallback((index: number) => {
        logEvent('QUIZ_SCREEN_INDEX_CHANGED', {
            previousIndex: currentQuizScreenIndex,
            newIndex: index,
            isCompletionView: index === 3
        });
        
        setCurrentQuizScreenIndex(index);
    }, [currentQuizScreenIndex, logEvent]);

    // Memoize the KeepLearningSection props to prevent unnecessary re-renders
    const keepLearningSectionProps = useMemo(() => {
        if (!state.currentLesson) return null;
        
        return {
            key: `keep-learning-${state.currentLesson.id}-${state.currentLesson.data.video.id}`,
            lesson: state.currentLesson.data,
            width: width - 40, // 20px padding on each side
            topPosition: lessonsTop,
            height: lessonsHeight,
            onScreenIndexChange: handleScreenIndexChange
        };
    }, [
        state.currentLesson?.id,
        state.currentLesson?.data.video.id,
        width,
        lessonsTop,
        lessonsHeight,
        handleScreenIndexChange
    ]);

    // Handle video progress updates
    const handleProgress = useCallback(async (data: { currentTime: number }) => {
        if (!state.currentLesson || state.isTransitioning) return;
        
        // Use updateVideoState instead of handleSeek for progress updates
        await updateVideoState(data.currentTime);
    }, [state.currentLesson, state.isTransitioning, updateVideoState]);

    // Update video state periodically with reduced frequency to prevent memory leaks
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        async function checkVideoPosition() {
            if (!playerRef.current || !state.currentLesson || !videoState.isReady || state.isTransitioning) {
                // Schedule next update if we're still playing
                if (videoState.playing && !state.isTransitioning) {
                    timeoutId = setTimeout(checkVideoPosition, 1000); // Increased to 1 second
                }
                return;
            }
            
            try {
                // Skip if we're already seeking
                if (isSeeking) {
                    logEvent('CHECK_POSITION_SKIPPED_ALREADY_SEEKING', {
                        videoId: state.currentLesson.data.video.id
                    });
                    
                    // Schedule next check
                    if (videoState.playing && !state.isTransitioning) {
                        timeoutId = setTimeout(checkVideoPosition, 1000); // Increased to 1 second
                    }
                    return;
                }
                
                // Get the current time from the player
                const time = await playerRef.current.getCurrentTime().catch(error => {
                    logEvent('GET_CURRENT_TIME_ERROR', {
                        error: error instanceof Error ? error.message : String(error),
                        videoId: state.currentLesson?.data.video.id
                    });
                    return -1; // Return invalid time to trigger rescheduling
                });
                
                // If we couldn't get the time, reschedule and try again
                if (time === -1) {
                    if (videoState.playing && !state.isTransitioning) {
                        timeoutId = setTimeout(checkVideoPosition, 1000); // Increased to 1 second
                    }
                    return;
                }
                
                // Only check for clip boundaries, don't update UI state as frequently
                const clipStart = state.currentLesson.data.video.clipStart;
                const clipEnd = state.currentLesson.data.video.clipEnd;
                
                // Check if we're outside the clip boundaries
                if (time < clipStart - 0.5 || time >= clipEnd - 0.2) {
                    // Only call updateVideoState when we need to enforce boundaries
                await updateVideoState(time);
                } else {
                    // Just update the current time without all the other checks
                    setVideoState(prev => ({
                        ...prev,
                        currentTime: Math.max(0, time - clipStart) // Ensure we don't go negative
                    }));
                }
                
                // Schedule next check if we're still playing
                if (videoState.playing && !state.isTransitioning) {
                    timeoutId = setTimeout(checkVideoPosition, 1000); // Increased to 1 second
                }
            } catch (error) {
                logEvent('CHECK_VIDEO_POSITION_ERROR', {
                    error: error instanceof Error ? error.message : String(error),
                    videoId: state.currentLesson?.data.video.id
                });
                
                // Schedule next check even if there was an error
                if (videoState.playing && !state.isTransitioning) {
                    timeoutId = setTimeout(checkVideoPosition, 1000); // Increased to 1 second
                }
            }
        }
        
        // Start checking position if video is playing and ready
        if (videoState.playing && videoState.isReady && !state.isTransitioning) {
            // Initial delay to prevent immediate checking
            timeoutId = setTimeout(checkVideoPosition, 1000);
        }
        
        return () => {
            if (timeoutId) {
            clearTimeout(timeoutId);
            }
        };
    }, [videoState.playing, videoState.isReady, state.currentLesson, state.isTransitioning, updateVideoState, isSeeking]);

    // Add effect to handle video transition state machine
    useEffect(() => {
        if (transitionState === 'unloading') {
            // Reset the video player when transitioning
            resetVideoPlayer();
            
            // Move to the loading state after a short delay
            setTimeout(() => {
                setTransitionState('loading');
                logEvent('TRANSITION_STATE_LOADING', {
                    transitionState: 'loading'
                });
            }, 100);
        } else if (transitionState === 'loading') {
            // Ensure we have a clean state when loading a new video
            // This is a safety check in case we enter the loading state from somewhere else
            if (currentVideoIdRef.current !== null) {
                logEvent('UNEXPECTED_VIDEO_ID_IN_LOADING_STATE', {
                    currentVideoId: currentVideoIdRef.current
                });
                currentVideoIdRef.current = null;
            }
        }
        // The 'seeking' and 'playing' states are handled in the handleReady function
    }, [transitionState, resetVideoPlayer]);

    // Video control handlers
    const handlePlayPause = useCallback(async () => {
        try {
            logEvent('PLAY_PAUSE_PRESSED', {
                currentState: videoState.playing ? 'playing' : 'paused',
                videoId: state.currentLesson?.data.video.id
            });
            
            if (!playerRef.current) {
                logEvent('PLAY_PAUSE_ERROR', {
                    error: 'Player reference is null',
                    wasPlaying: videoState.playing
                });
                return;
            }
            
            if (videoState.playing) {
                // First update our state
                setVideoState(prev => ({ ...prev, playing: false }));
                
                // Then try to pause the actual player
                try {
                    // Instead of using pauseVideo which doesn't exist on YoutubeIframeRef,
                    // we'll ensure the video is paused through the state
                    setVideoState(prev => ({ ...prev, playing: false }));
                    
                    // Short delay to ensure the pause takes effect
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    logEvent('PLAYER_EXPLICITLY_PAUSED', { videoId: state.currentLesson?.data.video.id });
                } catch (seekError) {
                    logEvent('PLAYER_PAUSE_ERROR', {
                        error: seekError instanceof Error ? seekError.message : String(seekError)
                    });
                }
                
                // Show pause indicator and fade it out quickly
                pauseIndicatorOpacity.setValue(1);
                Animated.timing(pauseIndicatorOpacity, {
                    toValue: 0,
                    duration: 500, // Fade out over 0.5 seconds
                    delay: 100,    // Stay visible for just 0.1 seconds
                    useNativeDriver: true,
                }).start();
                
                logEvent('VIDEO_PAUSED', {
                    videoId: state.currentLesson?.data.video.id
                });
            } else {
                // First update our state
                setVideoState(prev => ({ ...prev, playing: true }));
                
                // Then try to play the actual player
                try {
                    // Force the player to play by seeking to current position with autoplay
                    await playerRef.current.seekTo(await playerRef.current.getCurrentTime(), true);
                } catch (seekError) {
                    logEvent('PLAYER_PLAY_ERROR', {
                        error: seekError instanceof Error ? seekError.message : String(seekError)
                    });
                }
                
                logEvent('VIDEO_PLAYING', {
                    videoId: state.currentLesson?.data.video.id
                });
            }
        } catch (error) {
            logEvent('PLAY_PAUSE_ERROR', {
                error: error instanceof Error ? error.message : String(error),
                wasPlaying: videoState.playing
            });
        }
    }, [videoState.playing, pauseIndicatorOpacity, state.currentLesson?.data.video.id]);

    // Update the handleReady function to work with our state machine
    const handleReady = async () => {
        console.log("[DIAG][HANDLE_READY] Starting handleReady function", {
            videoLoaded: videoState.isReady,
            videoId: state.currentLesson?.data.video.id,
            playingState: videoState.playing,
            timestamp: new Date().toISOString()
        });

        if (!playerRef.current || !state.currentLesson) {
            logEvent('PLAYER_READY_MISSING_REFS', {
                hasPlayerRef: !!playerRef.current,
                hasCurrentLesson: !!state.currentLesson
            });
            return;
        }
        
        try {
            const clipStart = state.currentLesson.data.video.clipStart;
            const clipEnd = state.currentLesson.data.video.clipEnd;
            const videoId = state.currentLesson.data.video.id;
            
            // Validate clip boundaries
            if (clipStart === undefined || 
                clipEnd === undefined ||
                clipStart >= clipEnd) {
                logEvent('PLAYER_READY_INVALID_CLIP_BOUNDARIES', {
                    clipStart,
                    clipEnd,
                    videoId
                });
                // We'll continue with the values we have, but log the issue
            }
            
            // Log if we're handling a different video than expected
            if (currentVideoIdRef.current !== null && currentVideoIdRef.current !== videoId) {
                logEvent('VIDEO_ID_MISMATCH_IN_READY', {
                    expectedVideoId: currentVideoIdRef.current,
                    actualVideoId: videoId
                });
                
                // If there's a mismatch, reset tracking variables to ensure clean state
                lastSeekTime.current = 0;
                endDetectionCount.current = 0;
                lastEndTime.current = 0;
            }
            
            // Update the current video ID ref to ensure we're tracking the right video
            currentVideoIdRef.current = videoId;
            
            logEvent('PLAYER_READY', {
                videoId,
                lessonId: state.currentLesson.id,
                clipStart,
                clipEnd,
                isReady: videoState.isReady,
                isTransitioning: state.isTransitioning,
                transitionState,
                currentVideoIdRef: currentVideoIdRef.current // Add this to verify
            });
            
            // IMPORTANT: First, ensure we're not playing yet and mark as not ready
            // This prevents the initial playback glitch
            setVideoState(prev => ({ 
                ...prev, 
                playing: false, 
                isReady: false,
                currentTime: 0
            }));
            
            // Ensure pause indicator is hidden initially
            pauseIndicatorOpacity.setValue(0);
            
            // If we're in the loading state, move to seeking
            if (transitionState === 'loading') {
                setTransitionState('seeking');
                logEvent('TRANSITION_STATE_SEEKING', { videoId });
            }
            
            // Make sure we're not already seeking
            if (isSeeking) {
                logEvent('SEEK_SKIPPED_ALREADY_SEEKING', { videoId });
                return;
            }
            
            // Set seeking flag
            setIsSeeking(true);
            
            try {
                // Explicitly pause the player first to prevent any auto-play
                try {
                    console.log("[DIAG][SEEKING_PROCESS_START] Beginning seek operation", {
                        videoId,
                        clipStart,
                        clipEnd,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Instead of using pauseVideo which doesn't exist on YoutubeIframeRef,
                    // we'll ensure the video is paused through the state
                    setVideoState(prev => ({ ...prev, playing: false }));
                    
                    // Short delay to ensure the pause takes effect
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    console.log("[DIAG][PLAYER_PAUSED_FOR_SEEK] Player paused before seeking", {
                        videoId,
                        timestamp: new Date().toISOString()
                    });
                    
                    logEvent('PLAYER_EXPLICITLY_PAUSED', { videoId });
                } catch (pauseError) {
                    console.error("[DIAG][PAUSE_ERROR] Failed to pause player before seeking", {
                        error: pauseError instanceof Error ? pauseError.message : String(pauseError),
                        videoId,
                        timestamp: new Date().toISOString()
                    });
                    
                    logEvent('PLAYER_PAUSE_ERROR', { 
                        error: pauseError instanceof Error ? pauseError.message : String(pauseError),
                        videoId 
                    });
                }
                
                // Give the player a moment to initialize and ensure it's paused
                // Shorter delay since we're explicitly pausing
                await new Promise(resolve => setTimeout(resolve, 300));

                // Log the initial seek attempt
                const initialTime = await playerRef.current.getCurrentTime().catch(() => 0);
                console.log("[DIAG][PRE_SEEK_STATE] Player state before seeking", {
                    currentTime: initialTime,
                    targetTime: clipStart,
                    distance: Math.abs(initialTime - clipStart),
                    videoId,
                    timestamp: new Date().toISOString()
                });
                
                logEvent('INITIAL_SEEK_ATTEMPT', { 
                    clipStart, 
                    videoId,
                    currentTime: initialTime
                });
                
                // First seek attempt - seek to the exact clip start time
                console.log("[DIAG][PERFORMING_SEEK] Seeking to clip start", {
                    clipStart,
                    videoId,
                    timestamp: new Date().toISOString()
                });
                
                await playerRef.current.seekTo(clipStart, true);
                logEvent('INITIAL_SEEK_COMPLETED', { clipStart, videoId });
                
                // Wait a bit longer after seeking to ensure it completes
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Verify the seek was successful
                const verifyTime = await playerRef.current.getCurrentTime().catch(() => -1);
                console.log("[DIAG][SEEK_VERIFICATION] Verifying seek result", {
                    expectedTime: clipStart,
                    actualTime: verifyTime,
                    difference: verifyTime !== -1 ? Math.abs(verifyTime - clipStart) : 'unknown',
                    seekSuccessful: verifyTime !== -1 && Math.abs(verifyTime - clipStart) <= 2,
                    videoId,
                    timestamp: new Date().toISOString()
                });
                
                // If the seek wasn't successful, try again with improved approach
                if (verifyTime === -1 || Math.abs(verifyTime - clipStart) > 2) {
                    console.log("[DIAG][SEEK_FAILED] Initial seek was unsuccessful", {
                        expectedTime: clipStart,
                        actualTime: verifyTime,
                        difference: verifyTime !== -1 ? Math.abs(verifyTime - clipStart) : 'unknown',
                        videoId,
                        timestamp: new Date().toISOString()
                    });
                    
                    logEvent('INITIAL_SEEK_VERIFICATION_FAILED', {
                        expectedTime: clipStart,
                        actualTime: verifyTime,
                        difference: verifyTime !== -1 ? Math.abs(verifyTime - clipStart) : 'unknown',
                        videoId
                    });
                    
                    // Ensure player is still paused
                    setVideoState(prev => ({ ...prev, playing: false }));
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Try one more time with a longer delay
                    console.log("[DIAG][RETRY_SEEK] Attempting seek again", {
                        clipStart,
                        videoId,
                        timestamp: new Date().toISOString()
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await playerRef.current.seekTo(clipStart, true);
                    
                    // Give more time for the seek to complete
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Verify again
                    const secondVerifyTime = await playerRef.current.getCurrentTime().catch(() => -1);
                    console.log("[DIAG][SECOND_SEEK_VERIFICATION] Verifying retry seek", {
                        expectedTime: clipStart,
                        actualTime: secondVerifyTime,
                        difference: secondVerifyTime !== -1 ? Math.abs(secondVerifyTime - clipStart) : 'unknown',
                        seekSuccessful: secondVerifyTime !== -1 && Math.abs(secondVerifyTime - clipStart) <= 2,
                        videoId,
                        timestamp: new Date().toISOString()
                    });
                    
                    logEvent('SECOND_SEEK_VERIFICATION', {
                        expectedTime: clipStart,
                        actualTime: secondVerifyTime,
                        difference: secondVerifyTime !== -1 ? Math.abs(secondVerifyTime - clipStart) : 'unknown',
                        videoId
                    });
                    
                    // Log the retry
                    logEvent('INITIAL_SEEK_RETRY', { clipStart, videoId });
                }
                
                // Short delay to ensure the seek has fully completed
                await new Promise(resolve => setTimeout(resolve, 300));
                
                console.log("[DIAG][SEEK_COMPLETE] Seek operation finished, setting player to play", {
                    videoId,
                    clipStart,
                    timestamp: new Date().toISOString()
                });
                
                // Always transition to playing state
                setTransitionState('playing');
                logEvent('TRANSITION_STATE_PLAYING', { videoId });
                
                // Start playing only after we've confirmed the seek is complete
                setVideoState(prev => ({ 
                    ...prev, 
                    isReady: true, 
                    playing: true, 
                    currentTime: clipStart // Set the current time to match where we seeked to
                }));
                
                console.log("[DIAG][PLAYBACK_STARTED] Player set to playing state", {
                    videoId,
                    clipStart,
                    timestamp: new Date().toISOString()
                });
                
                logEvent('PLAYER_STARTED', { videoId, clipStart });
                
                // Record the initial seek time to prevent immediate re-seeking
                lastSeekTime.current = Date.now();
            } catch (error) {
                console.error("[DIAG][SEEK_CRITICAL_ERROR] Unhandled error during seek process", {
                    error: error instanceof Error ? error.message : String(error),
                    videoId,
                    timestamp: new Date().toISOString()
                });
                
                logEvent('PLAYER_INITIALIZATION_ERROR', { 
                    error: error instanceof Error ? error.message : String(error),
                    videoId
                });
                
                // Reset transition state on error
                if (transitionState !== 'idle') {
                    setTransitionState('playing'); // Force to playing state even on error
                    logEvent('FORCED_TRANSITION_TO_PLAYING', { videoId });
                }
                
                // Reset video state on error
                setVideoState(prev => ({ ...prev, isReady: true, playing: true }));
            } finally {
                // Always reset the seeking flag
                setIsSeeking(false);
            }
        } catch (error) {
            logEvent('HANDLE_READY_ERROR', {
                error: error instanceof Error ? error.message : String(error)
            });
            
            // Reset transition state on error
            if (transitionState !== 'idle') {
                setTransitionState('playing'); // Force to playing state even on error
                logEvent('FORCED_TRANSITION_TO_PLAYING_AFTER_ERROR', {});
            }
            
            // Reset video state on error
            setVideoState(prev => ({ ...prev, isReady: true, playing: true }));
            
            // Ensure seeking flag is reset
            setIsSeeking(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Fixed top elements with animated background */}
            <Animated.View 
                style={[
                    styles.topBlock, 
                    { 
                        height: insets.top,
                        backgroundColor: safeAreaBgColor 
                    }
                ]} 
            />

            {/* Gesture container */}
            <View style={styles.gestureContainer} {...panResponder.panHandlers}>
                {/* Video Player */}
                <Animated.View style={[styles.fixedContainer, { 
                    top: fixedContainerTop,
                    // Dynamic height based on content
                }]}>
                    {state.currentLesson && (
                        <>
                            <View style={styles.videoWrapper}>
                                {!videoState.isReady && (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color="#2A2A2A" />
                                    </View>
                                )}
                                <View style={styles.videoContainer}>
                                    <TouchableOpacity 
                                        style={styles.videoTouchable}
                                        activeOpacity={0.7}
                                        onPress={handlePlayPause}
                                        // Make sure touch events are properly captured
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <YoutubePlayer
                                            key={`video-${state.currentLesson?.id}-${state.currentLesson?.data.video.id}-${state.currentLesson?.created_at}`}
                                            ref={playerRef}
                                            height={videoHeight}
                                            width={width}
                                            play={videoState.playing}
                                            videoId={state.currentLesson?.data.video.id || ''}
                                            onReady={handleReady}
                                            onError={(e: any) => {
                                                console.error('YouTube Player Error:', e);
                                                logEvent('YOUTUBE_PLAYER_ERROR', {
                                                    error: e,
                                                    videoId: state.currentLesson?.data.video.id
                                                });
                                                
                                                // Reset transition state on error
                                                if (transitionState !== 'idle' && transitionState !== 'playing') {
                                                    setTransitionState('playing');
                                                    logEvent('FORCED_TRANSITION_TO_PLAYING_AFTER_YOUTUBE_ERROR', {
                                                        videoId: state.currentLesson?.data.video.id
                                                    });
                                                }
                                            }}
                                            onChangeState={(e: string) => {
                                                console.log('YouTube Player State Change:', e);
                                                logEvent('YOUTUBE_PLAYER_STATE_CHANGE', {
                                                    state: e,
                                                    videoId: state.currentLesson?.data.video.id,
                                                    transitionState
                                                });
                                                
                                                // If the player is paused, update our state
                                                if (e === 'paused' && videoState.playing) {
                                                    setVideoState(prev => ({ ...prev, playing: false }));
                                                } else if (e === 'playing' && !videoState.playing) {
                                                    // If the player is playing but our state says it's paused
                                                    setVideoState(prev => ({ ...prev, playing: true }));
                                                }
                                                
                                                // If the player is ended, log it but don't handle seeking here
                                                // Let the periodic check in updateVideoState handle looping
                                                if (e === 'ended' && state.currentLesson) {
                                                    logEvent('YOUTUBE_PLAYER_ENDED', {
                                                        videoId: state.currentLesson.data.video.id,
                                                        clipStart: state.currentLesson.data.video.clipStart
                                                    });
                                                }
                                            }}
                                            initialPlayerParams={{
                                                controls: false,
                                                modestbranding: true,
                                                rel: false,
                                                iv_load_policy: 3
                                            }}
                                            webViewProps={{
                                                pointerEvents: 'none', // Disable direct interaction with the webview
                                                javaScriptEnabled: true,
                                                allowsInlineMediaPlayback: true,
                                                mediaPlaybackRequiresUserAction: false, // Allow autoplay
                                                injectedJavaScript: `
                                                    // Fix for player not being found and ensure touch events bubble up
                                                    document.body.style.pointerEvents = 'none';
                                                    if (window.player && window.player.playVideo) {
                                                        true;
                                                    } else {
                                                        // Create a placeholder if player is not available
                                                        window.player = { playVideo: () => {}, pauseVideo: () => {} };
                                                        true;
                                                    }
                                                `,
                                                onError: (e: any) => {
                                                    console.error('WebView Error:', e);
                                                    logEvent('WEBVIEW_ERROR', {
                                                        error: e.nativeEvent,
                                                        videoId: state.currentLesson?.data.video.id
                                                    });
                                                }
                                            }}
                                        />
                                        
                                        {/* Play/Pause Indicator Overlay */}
                                        {!videoState.isReady ? null : (
                                            <Animated.View 
                                                style={[
                                                    styles.playPauseOverlay,
                                                    { opacity: pauseIndicatorOpacity }
                                                ]}
                                                pointerEvents="none"
                                            >
                                                <PlayIcon width={50} height={50} fill="#FFFFFF" />
                                            </Animated.View>
                                        )}
                                    </TouchableOpacity>
                                    
                                    {/* Translate button moved to bottom left corner */}
                                    <TouchableOpacity
                                        style={styles.translateButtonCorner}
                                        onPress={() => setTranslated(!translated)}
                                        activeOpacity={0.7}
                                    >
                                        <TranslateIcon 
                                            width={22} 
                                            height={22} 
                                            fill={translated ? "#ffffff" : "#888888"} // Gray when off, white when on
                                        />
                                    </TouchableOpacity>

                                    {/* Caption overlay */}
                                        <View style={styles.captionOverlay} pointerEvents="none">
                                        {currentCaption && (
                                            <View style={styles.captionWrapper}>
                                                <Text style={[
                                                    styles.captionText,
                                                ]}>
                                                {(() => {
                                                        // Skip highlighting if there's no highlight phrase
                                                        if (!state.currentLesson?.data.video.highlightPhrase || state.currentLesson.data.video.highlightPhrase.trim() === '') {
                                                            return translated ? currentCaption.nativeLangLine : currentCaption.targetLangLine;
                                                        }
                                                        
                                                        // Set up for highlighting
                                                    const text = translated ? currentCaption.nativeLangLine : currentCaption.targetLangLine;
                                                        const highlightPhrase = state.currentLesson.data.video.highlightPhrase;
                                                        
                                                        // If we're in translated mode, just return the text without highlighting
                                                        if (translated) return text;
                                                        
                                                        // Helper functions for more robust text matching
                                                        const escapeRegExp = (string: string) => {
                                                            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                                        };
                                                        
                                                        const normalizeText = (text: string) => {
                                                            return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                                                        };
                                                        
                                                        const stripPunctuation = (text: string) => {
                                                            return text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s+/g, " ").trim();
                                                        };
                                                        
                                                        // Try different matching strategies
                                                        let parts = [];
                                                        let foundMatch = false;
                                                        
                                                        try {
                                                            // Strategy 1: Standard case-insensitive matching with escaped regex
                                                            const escapedPhrase = escapeRegExp(highlightPhrase.trim());
                                                            const standardRegex = new RegExp(`(${escapedPhrase})`, 'i');
                                                            parts = text.split(standardRegex);
                                                            
                                                            // If we got more than one part, we found a match
                                                            if (parts.length > 1) {
                                                                foundMatch = true;
                                                                
                                                                if (DEBUG_MODE) {
                                                                    console.log('Phrase highlight match using standard regex:', {
                                                                        caption: text,
                                                                        highlightPhrase,
                                                                        parts
                                                                    });
                                                                }
                                                            } 
                                                            
                                                            // Strategy 2: Try with normalized text (removes accents, etc.)
                                                            if (!foundMatch) {
                                                                const normalizedText = normalizeText(text);
                                                                const normalizedPhrase = normalizeText(highlightPhrase);
                                                                const normalizedRegex = new RegExp(`(${escapeRegExp(normalizedPhrase)})`, 'i');
                                                                
                                                                // We need to find the match in the normalized text, but highlight in the original
                                                                const normalizedParts = normalizedText.split(normalizedRegex);
                                                                
                                                                if (normalizedParts.length > 1) {
                                                                    // If we found a match in normalized text, we need to locate it in the original
                                                                    const matchIndex = normalizedText.toLowerCase().indexOf(normalizedPhrase.toLowerCase());
                                                                    
                                                                    if (matchIndex >= 0) {
                                                                        const matchLength = normalizedPhrase.length;
                                                                        const beforeMatch = text.substring(0, matchIndex);
                                                                        const matchedText = text.substring(matchIndex, matchIndex + matchLength);
                                                                        const afterMatch = text.substring(matchIndex + matchLength);
                                                                        
                                                                        parts = [beforeMatch, matchedText, afterMatch].filter(part => part !== '');
                                                                        foundMatch = true;
                                                                        
                                                                        if (DEBUG_MODE) {
                                                                            console.log('Phrase highlight match using normalized text:', {
                                                                                caption: text,
                                                                                highlightPhrase,
                                                                                normalizedText,
                                                                                normalizedPhrase,
                                                                                matchIndex,
                                                                                parts
                                                                            });
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                            
                                                            // Strategy 3: Try with punctuation removed
                                                            if (!foundMatch) {
                                                                const strippedText = stripPunctuation(text);
                                                                const strippedPhrase = stripPunctuation(highlightPhrase);
                                                                const strippedRegex = new RegExp(`(${escapeRegExp(strippedPhrase)})`, 'i');
                                                                
                                                                // Find the match in the stripped text
                                                                const strippedMatch = strippedText.match(strippedRegex);
                                                                
                                                                if (strippedMatch && strippedMatch.index !== undefined) {
                                                                    // We need to map this back to the original text
                                                                    // This is more complex, so we'll use a simplified approach
                                                                    const lowerText = text.toLowerCase();
                                                                    const lowerPhrase = highlightPhrase.toLowerCase();
                                                                    const fuzzyIndex = lowerText.indexOf(lowerPhrase);
                                                                    
                                                                    if (fuzzyIndex >= 0) {
                                                                        const beforeMatch = text.substring(0, fuzzyIndex);
                                                                        const matchedText = text.substring(fuzzyIndex, fuzzyIndex + highlightPhrase.length);
                                                                        const afterMatch = text.substring(fuzzyIndex + highlightPhrase.length);
                                                                        
                                                                        parts = [beforeMatch, matchedText, afterMatch].filter(part => part !== '');
                                                                        foundMatch = true;
                                                                        
                                                                        if (DEBUG_MODE) {
                                                                            console.log('Phrase highlight match using punctuation stripping:', {
                                                                                caption: text,
                                                                                highlightPhrase,
                                                                                strippedText,
                                                                                strippedPhrase,
                                                                                fuzzyIndex,
                                                                                parts
                                                                            });
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                            
                                                            // Strategy 4: Try a more flexible substring matching approach
                                                            if (!foundMatch) {
                                                                // First, normalize both the text and phrase
                                                                const normalizedText = normalizeText(text);
                                                                const normalizedPhrase = normalizeText(highlightPhrase);
                                                                
                                                                // Look for the normalized phrase anywhere in the normalized text
                                                                const phraseIndex = normalizedText.indexOf(normalizedPhrase);
                                                                
                                                                if (phraseIndex >= 0) {
                                                                    // We need to map this index back to the original text
                                                                    // This is approximate but works for most cases
                                                                    const originalIndex = findApproximateIndex(text, highlightPhrase, phraseIndex);
                                                                    
                                                                    if (originalIndex >= 0) {
                                                                        const beforeMatch = text.substring(0, originalIndex);
                                                                        // Use original text length to preserve capitalization
                                                                        const matchLength = Math.min(highlightPhrase.length, text.length - originalIndex);
                                                                        const matchedText = text.substring(originalIndex, originalIndex + matchLength);
                                                                        const afterMatch = text.substring(originalIndex + matchLength);
                                                                        
                                                                        parts = [beforeMatch, matchedText, afterMatch].filter(part => part !== '');
                                                                        foundMatch = true;
                                                                        
                                                                        if (DEBUG_MODE) {
                                                                            console.log('Phrase highlight match using flexible substring approach:', {
                                                                                caption: text,
                                                                                highlightPhrase,
                                                                                normalizedText,
                                                                                normalizedPhrase,
                                                                                phraseIndex,
                                                                                originalIndex,
                                                                                parts
                                                                            });
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                            
                                                            // Strategy 5: Try fuzzy character-by-character approximate matching
                                                            if (!foundMatch) {
                                                                // Convert to lowercase for comparison
                                                                const lowerText = text.toLowerCase();
                                                                const lowerPhrase = highlightPhrase.toLowerCase();
                                                                
                                                                // Try to find the best matching substring
                                                                let bestMatchIndex = -1;
                                                                let bestMatchLen = 0;
                                                                
                                                                // Loop through potential starting positions
                                                                for (let i = 0; i < lowerText.length - 3; i++) {
                                                                    // Count matching characters starting from this position
                                                                    let matchCount = 0;
                                                                    for (let j = 0; j < lowerPhrase.length && i + j < lowerText.length; j++) {
                                                                        if (lowerText[i + j] === lowerPhrase[j]) {
                                                                            matchCount++;
                                                                        }
                                                                    }
                                                                    
                                                                    // If we found a better match, update our best match
                                                                    const matchPercentage = matchCount / lowerPhrase.length;
                                                                    if (matchPercentage > 0.7 && matchCount > bestMatchLen) {
                                                                        bestMatchIndex = i;
                                                                        bestMatchLen = matchCount;
                                                                    }
                                                                }
                                                                
                                                                // If we found a good match, use it
                                                                if (bestMatchIndex >= 0) {
                                                                    const beforeMatch = text.substring(0, bestMatchIndex);
                                                                    const matchedText = text.substring(bestMatchIndex, bestMatchIndex + highlightPhrase.length);
                                                                    const afterMatch = text.substring(bestMatchIndex + highlightPhrase.length);
                                                                    
                                                                    parts = [beforeMatch, matchedText, afterMatch].filter(part => part !== '');
                                                                    foundMatch = true;
                                                                    
                                                                    if (DEBUG_MODE) {
                                                                        console.log('Phrase highlight match using fuzzy character matching:', {
                                                                            caption: text,
                                                                            highlightPhrase,
                                                                            bestMatchIndex,
                                                                            bestMatchLen,
                                                                            matchPercentage: bestMatchLen / lowerPhrase.length,
                                                                            parts
                                                                        });
                                                                    }
                                                                }
                                                            }
                                                            
                                                            // If we still haven't found a match, just do a simple word-by-word search
                                                            if (!foundMatch) {
                                                                const words = text.split(' ');
                                                                const phraseWords = highlightPhrase.split(' ');
                                                                
                                                                // If the highlight phrase is just one word, try to find it
                                                                if (phraseWords.length === 1) {
                                                                    for (let i = 0; i < words.length; i++) {
                                                                        if (normalizeText(words[i]) === normalizeText(phraseWords[0])) {
                                                                            // Found a matching word
                                                                            const beforeMatch = words.slice(0, i).join(' ') + (i > 0 ? ' ' : '');
                                                                            const matchedText = words[i];
                                                                            const afterMatch = (i < words.length - 1 ? ' ' : '') + words.slice(i + 1).join(' ');
                                                                            
                                                                            parts = [beforeMatch, matchedText, afterMatch].filter(part => part !== '');
                                                                            foundMatch = true;
                                                                            
                                                                            if (DEBUG_MODE) {
                                                                                console.log('Phrase highlight match using single word match:', {
                                                                                    caption: text,
                                                                                    highlightPhrase,
                                                                                    matchedWord: words[i],
                                                                                    parts
                                                                                });
                                                                            }
                                                                            break;
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            // If we still haven't found a match, just return the original text
                                                            if (!foundMatch) {
                                                                if (DEBUG_MODE) {
                                                                    console.log('No phrase highlight match found:', {
                                                                        caption: text,
                                                                        highlightPhrase
                                                                    });
                                                                }
                                                                return text;
                                                            }
                                                            
                                                            // Helper function to find the approximate index in original text
                                                            function findApproximateIndex(originalText: string, phrase: string, normalizedIndex: number): number {
                                                                // Simple approach: just try a direct mapping first
                                                                const directIndex = originalText.toLowerCase().indexOf(phrase.toLowerCase());
                                                                if (directIndex >= 0) {
                                                                    return directIndex;
                                                                }
                                                                
                                                                // If that fails, try using the normalized index as an approximation
                                                                // This won't be perfect but should work for most cases
                                                                return Math.min(normalizedIndex, originalText.length - 1);
                                                            }
                                                            
                                                            // Map the parts to Text components, highlighting the matched parts
                                                            return parts.map((part, index) => {
                                                                // More flexible highlight detection
                                                                const isHighlight = 
                                                                    part.toLowerCase() === highlightPhrase.toLowerCase() ||
                                                                    normalizeText(part) === normalizeText(highlightPhrase) ||
                                                                    // Check for partial matches too
                                                                    (parts.length === 3 && index === 1);
                                                                    
                                                                return isHighlight ? (
                                                            <Text key={index} style={styles.highlightedPhrase}>
                                                                {part}
                                                            </Text>
                                                        ) : (
                                                            <Text key={index}>{part}</Text>
                                                                );
                                                            });
                                                        } catch (error) {
                                                            // If anything goes wrong, just return the original text
                                                            console.error('Error in phrase highlighting:', error);
                                                            return text;
                                                        }
                                                })()}
                                            </Text>
                                        </View>
                                    )}
                                    </View>
                                </View>
                            </View>
                            
                            {/* Integrated Video Controls - Seek buttons only - NOW RELATIVE TO VIDEO PLAYER */}
                            <View style={[
                                styles.controlsContainer, 
                                { marginTop: 8 } // Use the gap constant for consistency
                            ]}>
                                <View style={styles.seekButtonsContainer}>
                                    {/* Seek back button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.seekButton,
                                            (isSeeking || !videoState.isReady || state.isTransitioning) && { opacity: 0.5 }
                                        ]}
                                        onPress={() => handleSeekOffset(-2)}
                                        disabled={isSeeking || !videoState.isReady || state.isTransitioning}
                                    >
                                        <View style={[styles.seekButtonContent, { justifyContent: 'flex-start' }]}>
                                            <MaterialCommunityIcons name="arrow-left" size={16} color="#AAAAAA" />
                                            <Text style={styles.seekButtonText}>2s</Text>
                                        </View>
                                    </TouchableOpacity>

                                        <TouchableOpacity
                                        style={[
                                            styles.seekButton,
                                            (isSeeking || !videoState.isReady || state.isTransitioning) && { opacity: 0.5 }
                                        ]}
                                        onPress={() => handleSeekOffset(2)}
                                        disabled={isSeeking || !videoState.isReady || state.isTransitioning}
                                    >
                                        <View style={[styles.seekButtonContent, { justifyContent: 'flex-end' }]}>
                                            <Text style={styles.seekButtonText}>2s</Text>
                                            <MaterialCommunityIcons name="arrow-right" size={16} color="#AAAAAA" />
                                        </View>
                                        </TouchableOpacity>
                                    </View>
                            </View>
                        </>
                    )}
                </Animated.View>

                {/* Keep Learning Section */}
                {keepLearningSectionProps && (
                    <KeepLearningSection
                        key={keepLearningSectionProps.key}
                        lesson={keepLearningSectionProps.lesson}
                        width={keepLearningSectionProps.width}
                        topPosition={keepLearningSectionProps.topPosition as unknown as number}
                        height={keepLearningSectionProps.height as unknown as number}
                        onScreenIndexChange={setCurrentQuizScreenIndex}
                    />
                )}
            </View>

            {/* Top Controls - Now with opacity animation */}
            <Animated.View style={{ opacity: 0 }}>
                <TopControls
                    onInstructionsOpen={() => setShowInstructions(true)}
                    onSettingsOpen={() => setShowSettings(true)}
                    showControls={showQuestionButton}
                    topPosition={questionMarkTop}
                />
            </Animated.View>

            {/* Modals */}
            <SettingsView
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                keyPhraseReplay={keyPhraseReplay}
                onSetKeyPhraseReplay={setKeyPhraseReplay}
            />

            <InstructionsView 
                visible={showInstructions}
                onClose={() => setShowInstructions(false)}
            />

            {/* Add NextVideoIndicator */}
            <NextVideoIndicator
                gestureY={gestureState.gestureY}
                isActive={gestureState.isActive}
                height={height}
                direction={gestureState.direction}
                isVideoReady={videoState.isReady}
            />

            {/* Add PreviousVideoIndicator */}
            <PreviousVideoIndicator
                gestureY={gestureState.gestureY}
                isActive={gestureState.isActive}
                height={height}
                direction={gestureState.direction}
                isVideoReady={videoState.isReady}
            />

            {/* Toast */}
            <Toast position='top' topOffset={insets.top + 80} />
        </View>
    );
};

// Update styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#181818', // Change back to original dark grey
    },
    gestureContainer: {
        flex: 1,
        width: '100%',
        position: 'relative',
        zIndex: 1,
    },
    topBlock: {
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
    },
    fixedContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 2,
    },
    videoSection: {
        backgroundColor: 'transparent',
    },
    videoContainer: {
        width: '100%',
        backgroundColor: '#000000', // Changed from #181818 to #000000
        position: 'relative',
        borderRadius: 0,
        overflow: 'hidden',
    },
    skeletonContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    skeletonBox: {
        backgroundColor: '#000000', // Changed from #181818 to #000000
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoWrapper: {
        width: '100%',
        height: 'auto',
        aspectRatio: 16/9,
        backgroundColor: 'transparent',
    },
    videoShadow: {
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
        backgroundColor: '#000000', // Changed from #181818 to #000000
    },
    captionOverlay: {
        position: 'absolute',
        bottom: 30, // Moved down from 40 to 30
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    captionText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
        // Removed text shadow properties
        paddingHorizontal: 12,
        paddingVertical: 3, // Reduced from 6 to 3
    },
    sliderBlurContainer: {
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 15,
        borderRadius: 16,
        overflow: 'hidden',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
    },
    sliderContainer: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
        marginRight: 8, // Add margin to create space between seek buttons and translate button
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderGlow: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
    },
    iconGlow: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    timeTextBold: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
        width: 50,
        textAlign: 'center',
    },
    glowText: {
        textShadowColor: '#fff',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
    },
    translateButtonContainer: {
        marginLeft: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 28,
        height: 28,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    collapsibleContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 3,
        borderRadius: 16,
        overflow: 'hidden',
    },
    blurContainer: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    containerHeader: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        width: '100%',
    },
    headerTouchable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginRight: 10,
    },
    lessonsHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    tapContainer: {
        backgroundColor: 'rgba(90, 81, 225, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        overflow: 'hidden',
    },
    tapText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    arrowGlow: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    scrollArea: {
        flex: 1,
        marginTop: 0, // Remove top margin since we're removing the header
    },
    tabControlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        zIndex: 2,
        marginTop: 20,
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 22,
        color: '#FFFFFF',
        marginRight: 12,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
        textShadowColor: '#fff',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
    },
    tabIcon: {
        opacity: 1,
        width: 28,
        height: 28,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    activeTabIcon: {
        opacity: 1,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#888',
        position: 'absolute',
        left: '50%',
        transform: [{ translateX: -0.5 }], // Center the 1px divider
    },
    highlightedText: {
        backgroundColor: 'rgba(255, 255, 0, 0.5)',
        color: '#fff',
        fontWeight: 'bold',
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    questionButton: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 10,
    },
    bookmarkButton: {
        position: 'absolute',
        right: 70,
        zIndex: 10,
    },
    settingsButton: {
        position: 'absolute',
        right: 20,
        zIndex: 10,
    },
    iconTouchable: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    toastBaseContainer: {
        backgroundColor: '#181818',
        alignSelf: 'center',
        borderRadius: 8,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 99999,
    },
    toastTextContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    toastSuccessAccent: {
        width: 4,
        height: '100%',
        backgroundColor: '#5A51E1',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
    },
    toastErrorAccent: {
        width: 4,
        height: '100%',
        backgroundColor: '#FF4444',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
    },
    toastText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    hiddenVideo: {
        opacity: 0,
    },
    iconContainer: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextVideoIndicator: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    nextVideoText: {
        color: '#888',
        fontSize: 16,
        marginTop: 8,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    playPauseButton: {
        display: 'none', // Hide the button
    },
    controlsWrapper: {
        width: '100%',
        paddingTop: 8,
        backgroundColor: 'transparent',
    },
    controlsContainer: {
        paddingHorizontal: 20,
        width: '100%',
        // Remove top: controlsTop - this is what was causing the fixed positioning
    },
    controlsBlur: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    translateButton: {
        width: 44,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000', // Changed from #181818 to #000000
        zIndex: 2,
    },
    tabNavigationContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    highlightedPhrase: {
        backgroundColor: 'transparent', // No background color
        color: '#FFFFFF', // White text
        fontWeight: '700', // Bold text for emphasis
        padding: 2,
        borderRadius: 0, // No border radius needed
        textDecorationLine: 'underline', // Add underline
        textDecorationColor: 'rgb(255, 255, 0)', // Yellow underline
        textDecorationStyle: 'solid',
        // Remove textDecorationThickness as it might not be supported
        borderBottomWidth: 2, // Alternative way to create thicker underline
        borderBottomColor: 'rgb(255, 255, 0)', // Yellow border
    },
    videoTouchable: {
        width: '100%',
        height: '100%',
    },
    playPauseOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3,
    },
    playIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    seekButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Space buttons to opposite edges
        alignItems: 'center',
        width: '100%',
        height: 44, // Hard-coded height
        gap: 2, // Reduce gap to just 2px for a more connected look
    },
    seekButton: {
        flex: 0.495, // Increase to make buttons even wider
        backgroundColor: '#181818', // Match the main background color
        borderRadius: 16, // Round corners
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3, // For Android
        overflow: 'hidden', // Important for content overflow
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', // Light border like in profile.tsx
    },
    seekButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6, // Increase gap between icon and text
        position: 'relative',
        zIndex: 2, // Ensure content stays above the background
        width: '100%',
        paddingHorizontal: 16,
    },
    seekButtonText: {
        color: '#AAAAAA', // Slightly lighter text for better contrast
        fontSize: 14,
        fontWeight: '600',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    titleText: {
        fontSize: 22,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    keepLearningContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 3,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#181818', // Match the main background color
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', // Light border like in profile.tsx
    },
    headerBorder: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 10,
        marginHorizontal: 20,
        marginTop: 20,
    },
    translateButtonCorner: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.5)', // Slightly more opaque for better contrast without blur
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', // Add subtle border
    },
    
    
    captionWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        backgroundColor: '#5a51e1', // Purple pill background
        borderRadius: 16, // Reduced from 20 to 16
        paddingVertical: 4, // Reduced from 6 to 4
        paddingHorizontal: 8,
        maxWidth: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5, // For Android
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 10, // Reduced from 16 to 10
        paddingBottom: 12, // Reduced from 15 to 12
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    sectionHeaderText: {
        fontSize: 20, // Reduced from 22 to 20
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 6, // Reduced from 8 to 6
    },
    headerIndicator: {
        height: 3, // Reduced from 4 to 3
        width: 36, // Reduced from 40 to 36
        borderRadius: 1.5, // Adjusted for the new height
        marginTop: 6, // Reduced from 8 to 6
    },
    contentPage: {
        width: '100%', // This will be overridden by the inline width prop
        paddingHorizontal: 16,
        paddingTop: 16, // Add top padding for the heading in each view
        paddingBottom: 20,
        flexShrink: 0, // Prevent the view from shrinking
    },
    dotIndicatorContainer: {
        position: 'absolute',
        bottom: 15, // Increased from 10 to 15 for better spacing with the blurred pill
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5, // Add zIndex to ensure it appears above other content
        pointerEvents: 'none', // Allow touches to pass through to content underneath
    },
});

export default Learn;

