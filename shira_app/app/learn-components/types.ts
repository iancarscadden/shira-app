import { VideoData as BaseVideoData, ContextData, CulturalData, ConversationalData, ContentRow, LessonContent } from '../../supabase/types';
import { YoutubeIframeRef } from 'react-native-youtube-iframe';

// Core state types
export interface LearnState {
    currentLesson: ContentRow | null;
    lessonIndex: number;
    isTransitioning: boolean;
    isLastLesson: boolean;
    isLoading: boolean;
}

export type LearnAction =
    | { type: 'START_TRANSITION' }
    | { type: 'COMPLETE_TRANSITION'; payload: { currentLesson: ContentRow } }
    | { type: 'SET_LAST_LESSON' }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'RESET_STATE' };

// Component Props Types
export interface VideoPlayerProps {
    videoData: BaseVideoData;
    onVideoEnd: () => void;
    onFirstPlaythrough: () => void;
    isTransitioning: boolean;
    height: number;
    width: number;
    isTranslated: boolean;
}

export interface VideoPlayerRef {
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seekTo: (time: number) => Promise<void>;
    getCurrentTime: () => Promise<number>;
    getState: () => {
        playing: boolean;
        currentTime: number;
        isReady: boolean;
    };
}

export interface VideoControlsProps {
    playing: boolean;
    currentTime: number;
    duration: number;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onTranslateToggle: () => void;
    isTranslated: boolean;
    isReady: boolean;
}

export interface KeepLearningSectionProps {
    lesson: LessonContent;
    isExpanded: boolean;
    onToggle: () => void;
    width: number;
    topPosition: number;
    height: number;
}

export interface TopControlsProps {
    onInstructionsOpen: () => void;
    onSettingsOpen: () => void;
    showControls: boolean;
    topPosition: number;
}

export interface TabNavigationProps {
    activeTab: 'explore' | 'saved';
    onTabChange: (tab: 'explore' | 'saved') => void;
    topInset: number;
}

export interface NextVideoIndicatorProps {
    visible: boolean;
    topPosition: number;
    onSwipeUp: () => void;
}

// Shared State Types
export interface VideoPlayerState {
    playing: boolean;
    currentTime: number;
    isReady: boolean;
    isFirstPlaythrough: boolean;
    phraseReplayCount: number;
    isReplayingPhrase: boolean;
    hasCompletedFirstReplay: boolean;
    translated: boolean;
}

export interface VideoControlsState {
    isScrubbing: boolean;
    sliderWidth: number;
}

export interface KeepLearningSectionState {
    lessonsExpanded: boolean;
    currentScreenIndex: number;
}

// Default export to fix the warning
const LearnTypes = {
    // This is a dummy object to satisfy the default export requirement
    // The actual types are used via named exports
};

export default LearnTypes; 