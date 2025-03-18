export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      content: {
        Row: {
          id: number
          language: string
          data: Json
          created_at: string
        }
        Insert: {
          id?: number
          language: string
          data: Json
          created_at?: string
        }
        Update: {
          id?: number
          language?: string
          data?: Json
          created_at?: string
        }
      }
      saved_videos: {
        Row: {
          id: number
          user_id: string
          video_id: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          video_id: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          video_id?: string
          created_at?: string
        }
      }
      user_progress: {
        Row: {
          id: number
          user_id: string
          video_id: string
          completed: boolean
          last_watched: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          video_id: string
          completed?: boolean
          last_watched?: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          video_id?: string
          completed?: boolean
          last_watched?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          target_lang: string | null
          created_at: string
          updated_at: string
          daily_goal: number | null
          current_streak: number | null
          last_active_at: string | null
          is_pro: boolean | null
          xp_level: number | null
          daily_videos_watched: number | null
          free_videos: number | null
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          target_lang?: string | null
          created_at?: string
          updated_at?: string
          daily_goal?: number | null
          current_streak?: number | null
          last_active_at?: string | null
          is_pro?: boolean | null
          xp_level?: number | null
          daily_videos_watched?: number | null
          free_videos?: number | null
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          target_lang?: string | null
          created_at?: string
          updated_at?: string
          daily_goal?: number | null
          current_streak?: number | null
          last_active_at?: string | null
          is_pro?: boolean | null
          xp_level?: number | null
          daily_videos_watched?: number | null
          free_videos?: number | null
        }
      }
    }
  }
} 