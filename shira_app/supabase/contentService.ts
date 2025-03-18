import { supabase } from './supabaseClient';
import { ContentRow, LessonContent } from './types';

export class ContentService {
  private static instance: ContentService;

  private constructor() {
    console.log('ContentService: Initializing singleton instance');
  }

  public static getInstance(): ContentService {
    if (!ContentService.instance) {
      ContentService.instance = new ContentService();
    }
    return ContentService.instance;
  }

  private async fetchLessonByIndex(index: number, language: string): Promise<LessonContent | null> {
    try {
      console.log(`ContentService.fetchLessonByIndex: Starting fetch for index ${index}, language ${language}`);
      
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('language', language)
        .eq('id', index)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`ContentService.fetchLessonByIndex: No more lessons available at index ${index}`);
          return null;
        }
        console.error('ContentService.fetchLessonByIndex: Error fetching lesson:', error);
        return null;
      }

      if (!data) {
        console.log(`ContentService.fetchLessonByIndex: No data returned for index ${index}`);
        return null;
      }

      const contentRow = data as ContentRow;
      console.log('ContentService.fetchLessonByIndex: Successfully fetched lesson:', {
        index,
        language,
        hasVideoData: !!contentRow.data?.video,
        videoId: contentRow.data?.video?.id,
        contentRowId: contentRow.id
      });
      
      return contentRow.data;
    } catch (error) {
      console.error('ContentService.fetchLessonByIndex: Unexpected error:', error);
      return null;
    }
  }

  public async fetchLesson(lessonId: number, language: string): Promise<LessonContent | null> {
    try {
      console.log(`ContentService.fetchLesson: Starting fetch for lesson ID ${lessonId}, language ${language}`);
      const lesson = await this.fetchLessonByIndex(lessonId, language);
      
      console.log('ContentService.fetchLesson: Fetch complete:', {
        success: !!lesson,
        lessonId,
        videoId: lesson?.video?.id,
        language
      });
      
      return lesson;
    } catch (error) {
      console.error(`ContentService.fetchLesson: Error fetching lesson ${lessonId}:`, error);
      return null;
    }
  }

  public async fetchNextLesson(currentId: number, language: string): Promise<LessonContent | null> {
    try {
      console.log(`ContentService.fetchNextLesson: Starting fetch for next lesson after ID ${currentId}`);
      
      // Calculate the next lesson ID
      const nextId = currentId + 1;
      
      // Try to fetch the next lesson
      let nextLesson = await this.fetchLessonByIndex(nextId, language);
      
      // If no next lesson is found, loop back to the first lesson
      if (!nextLesson) {
        console.log('ContentService.fetchNextLesson: No next lesson found, looping back to first lesson');
        nextLesson = await this.fetchLessonByIndex(1, language);
      }
      
      console.log('ContentService.fetchNextLesson: Fetch complete:', {
        success: !!nextLesson,
        nextId: nextLesson ? (nextId > currentId ? nextId : 1) : null,
        videoId: nextLesson?.video?.id
      });
      
      return nextLesson;
    } catch (error) {
      console.error('ContentService.fetchNextLesson: Error:', error);
      return null;
    }
  }

  public async saveVideoProgress(userId: string, videoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          video_id: videoId,
          completed: true,
          last_watched: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving video progress:', error);
      throw error;
    }
  }

  public async checkVideoSaved(userId: string, videoId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('saved_videos')
        .select('*')
        .match({ user_id: userId, video_id: videoId })
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking video saved state:', error);
      return false;
    }
  }

  public async toggleVideoSaved(userId: string, videoId: string, isSaved: boolean): Promise<boolean> {
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_videos')
          .insert({ user_id: userId, video_id: videoId });
        if (error) throw error;
        return true;
      } else {
        const { error } = await supabase
          .from('saved_videos')
          .delete()
          .match({ user_id: userId, video_id: videoId });
        if (error) throw error;
        return false;
      }
    } catch (error) {
      console.error('Error toggling video saved state:', error);
      throw error;
    }
  }

  public async hasMoreLessons(currentId: number, language: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })
        .eq('language', language)
        .gt('id', currentId);

      if (error) throw error;
      return (count ?? 0) > 0;
    } catch (error) {
      console.error('Error checking for more lessons:', error);
      return false;
    }
  }

  public async updateCurrentLesson(userId: string, lessonId: number, language: string = 'Spanish'): Promise<void> {
    try {
      console.log('ContentService.updateCurrentLesson: Updating current lesson:', {
        userId,
        lessonId,
        language
      });

      // First, verify that the lesson ID exists in the content table
      const { data, error: checkError } = await supabase
        .from('content')
        .select('id')
        .eq('id', lessonId)
        .eq('language', language)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          console.log(`ContentService.updateCurrentLesson: Lesson ID ${lessonId} does not exist, using ID 1 instead`);
          // If the lesson doesn't exist, use lesson ID 1 instead
          const { error } = await supabase
            .from('profiles')
            .update({ current_lesson_id: 1 })
            .eq('id', userId);

          if (error) throw error;
          console.log('ContentService.updateCurrentLesson: Successfully updated current lesson to ID 1');
          return;
        }
        throw checkError;
      }

      // If we get here, the lesson ID exists, so update it
      const { error } = await supabase
        .from('profiles')
        .update({ current_lesson_id: lessonId })
        .eq('id', userId);

      if (error) throw error;

      console.log('ContentService.updateCurrentLesson: Successfully updated current lesson');
    } catch (error) {
      console.error('ContentService.updateCurrentLesson: Error updating current lesson:', error);
      throw error;
    }
  }

  public async getCurrentLesson(userId: string, language: string): Promise<LessonContent | null> {
    try {
      console.log('ContentService.getCurrentLesson: Fetching current lesson for user:', userId);
      
      // First get the user's current_lesson_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_lesson_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // If no current lesson, start from the beginning
      if (!profile?.current_lesson_id) {
        console.log('ContentService.getCurrentLesson: No current lesson, fetching first lesson');
        return this.fetchLessonByIndex(1, language);
      }

      // Get the lesson content for the current_lesson_id
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', profile.current_lesson_id)
        .eq('language', language)
        .single();

      if (contentError) {
        if (contentError.code === 'PGRST116') {
          console.log('ContentService.getCurrentLesson: Current lesson not found, fetching first lesson');
          return this.fetchLessonByIndex(1, language);
        }
        throw contentError;
      }

      console.log('ContentService.getCurrentLesson: Successfully fetched current lesson:', {
        lessonId: content.id,
        videoId: content.data?.video?.id
      });

      return content.data;
    } catch (error) {
      console.error('ContentService.getCurrentLesson: Error:', error);
      return null;
    }
  }

  public async getCurrentLessonId(userId: string, language: string): Promise<number | null> {
    try {
      console.log('ContentService.getCurrentLessonId: Fetching current lesson ID for user:', userId);
      
      // Get the user's current_lesson_id from the profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_lesson_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('ContentService.getCurrentLessonId: Profile not found, returning default lesson ID 1');
          return 1; // Default to lesson 1 if profile not found
        }
        throw profileError;
      }

      // If no current lesson, return the default (1)
      if (!profile?.current_lesson_id) {
        console.log('ContentService.getCurrentLessonId: No current lesson ID, returning default lesson ID 1');
        return 1;
      }

      // Verify that the lesson exists in the content table
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select('id')
        .eq('id', profile.current_lesson_id)
        .eq('language', language)
        .single();

      if (contentError) {
        if (contentError.code === 'PGRST116') {
          console.log('ContentService.getCurrentLessonId: Current lesson not found in content table, returning default lesson ID 1');
          return 1; // Default to lesson 1 if the lesson doesn't exist
        }
        throw contentError;
      }

      console.log('ContentService.getCurrentLessonId: Successfully fetched current lesson ID:', profile.current_lesson_id);
      return profile.current_lesson_id;
    } catch (error) {
      console.error('ContentService.getCurrentLessonId: Error:', error);
      return 1; // Default to lesson 1 on error
    }
  }

  public async getMaxLessonId(language: string): Promise<number> {
    try {
      console.log('ContentService.getMaxLessonId: Fetching max lesson ID for language:', language);
      
      const { data, error } = await supabase
        .from('content')
        .select('id')
        .eq('language', language)
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ContentService.getMaxLessonId: No lessons found');
          return 0;
        }
        throw error;
      }
      
      console.log('ContentService.getMaxLessonId: Max lesson ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('ContentService.getMaxLessonId: Error:', error);
      return 10; // Use a higher fallback value to be more future-proof
    }
  }
}