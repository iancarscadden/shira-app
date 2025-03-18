import { ContentRow, LessonContent } from '../../supabase/types';

export interface LessonState {
    id: number;
    language: string;
    data: LessonContent;
    created_at: string;
}

export interface LearnState {
    currentLesson: LessonState | null;
    isLoading: boolean;
    isTransitioning: boolean;
    error: string | null;
}

type LearnAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'START_TRANSITION' }
    | { type: 'COMPLETE_TRANSITION'; payload: { currentLesson: LessonState } }
    | { type: 'SET_ERROR'; payload: string }
    | { type: 'CLEAR_ERROR' };

export const initialLearnState: LearnState = {
    currentLesson: null,
    isLoading: true,
    isTransitioning: false,
    error: null,
};

const learnReducer = (state: LearnState, action: LearnAction): LearnState => {
    switch (action.type) {
        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload,
            };
        case 'START_TRANSITION':
            return {
                ...state,
                isTransitioning: true,
            };
        case 'COMPLETE_TRANSITION':
            console.log('Reducer: COMPLETE_TRANSITION action', {
                newCurrentLessonId: action.payload.currentLesson.id,
                newCurrentVideoId: action.payload.currentLesson.data.video.id,
                timestamp: new Date().toISOString(),
                createdAt: action.payload.currentLesson.created_at
            });
            return {
                ...state,
                currentLesson: action.payload.currentLesson,
                isTransitioning: false,
                isLoading: false,
                error: null,
            };
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                isLoading: false,
                isTransitioning: false,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export default learnReducer; 