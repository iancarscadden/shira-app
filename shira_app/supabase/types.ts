import { Database } from './database.types';

// Types for our content structure
export interface VideoData {
    id: string;
    length: number;
    clipStart: number;
    clipEnd: number;
    highlightPhrase: string;
    captions: Caption[];
}

export interface Caption {
    targetLangLine: string;
    nativeLangLine: string;
    localStart: number;
    localEnd: number;
}

export interface ContextData {
    keyPhrase: string;
    keyPhraseTranslation: string;
    choices: Choice[];
}

export interface Choice {
    text: string;
    isCorrect: boolean;
}

export interface CulturalData {
    title: string;
    boxes: CulturalBox[];
}

export interface CulturalBox {
    label: string;
    blurb: string;
}

export interface ConversationalData {
    responsePrompt: string;
    responsePromptTranslation: string;
    speakingPhrase: string;
    speakingPhraseTranslation: string;
}

export interface LessonContent {
    video: VideoData;
    context: ContextData;
    cultural: CulturalData;
    conversational: ConversationalData;
}

export interface ContentRow {
    id: number;           // PostgreSQL SERIAL primary key
    language: string;     // PostgreSQL TEXT
    data: LessonContent; // PostgreSQL JSONB
    created_at: string;   // PostgreSQL TIMESTAMP
}

export interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    target_lang: string | null;
    created_at: string;
    updated_at: string;
    daily_goal: number | null;
    current_streak: number | null;
    last_active_at: string | null;
    is_pro: boolean | null;
    xp_level: number | null;
    daily_videos_watched: number | null;
} 