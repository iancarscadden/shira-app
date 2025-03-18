import { VideoData, ContextData, CulturalData, ConversationalData } from '../supabase/types';

export interface VideoViewProps {
  data: VideoData;
  onComplete?: () => void;
}

export interface ContextViewProps {
  data: ContextData;
  onAnswerSelected?: (isCorrect: boolean) => void;
}

export interface CulturalViewProps {
  data: CulturalData;
}

export interface ConversationalViewProps {
  data: ConversationalData;
  onPhraseSpoken?: () => void;
}

export interface LearnScreenProps {
  userId: string;
} 