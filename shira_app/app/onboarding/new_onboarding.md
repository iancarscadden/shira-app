# Shira App - New Onboarding Implementation Plan

## Overview
This document outlines the implementation plan for rebuilding the onboarding flow for Shira language learning app. The new flow will have a more comprehensive user journey with 16 steps, focusing on personalization, UX education, and user preference collection.

## Files to Preserve
- `OnboardingStep6.tsx` (to be renamed) - Account creation screen
- Login functionality
- Some reusable components like custom buttons

## Implementation Structure

### 1. Directory Organization
- Create a new structure within the onboarding folder:
  ```
  /onboarding
    /components            # Shared components used across steps
    /utils                 # Helper functions for onboarding
    /hooks                 # Custom hooks for onboarding state management
    /screens               # Individual screen components
    _layout.tsx            # Navigation layout for onboarding
    index.tsx              # Main entry point for onboarding
  ```

### 2. State Management
We'll implement a unified state management approach to track the user's progress through onboarding:

```typescript
// State interface
interface OnboardingState {
  step: number;
  selectedLanguage: string;
  mainGoal: string;
  surveyAnswers: {
    drivingFactor: string;
    biggestStruggle: string;
    currentLearningMethod: string;
    dailyLessonGoal: string;
    proficiencyLevel: string;
    culturalInterests: string;
  };
  geminiInsights: string | null;
}
```

We'll use React Context + useReducer to manage this state across the entire onboarding flow, making it easy to:
- Navigate between steps
- Persist data across steps
- Handle back navigation with preserved state

### 3. Navigation Structure
- Implement navigation using Expo Router
- Use Stack navigation for the main onboarding flow
- Use Modal presentation for specific screens (like conversation preview)

### 4. Component Development Plan

#### Shared Components:
1. **ProgressBar** - For question sequence (steps 8-15)
2. **OnboardingBackButton** - Consistent back button UI
3. **OnboardingNextButton** - Consistent next button UI
4. **SelectionButton** - For multiple choice questions
5. **AnimatedCard** - For interactive elements

#### Screen Implementation Sequence:

1. `WelcomeScreen.tsx` (Step 1)
   - Welcome message
   - Get started button
   - Login link

2. `LanguageSelectionScreen.tsx` (Step 2)
   - Reuse existing LanguageButton component with modifications
   - Store selection in context

3. `GoalSelectionScreen.tsx` (Step 3)
   - Create multiple choice UI for goals
   - Store selection in context

4. `KeyPhraseExplanationScreen.tsx` (Step 4)
   - UI for explaining key phrase concept
   - Visual example with highlighted phrase

5. `ShiraIntroductionScreen.tsx` (Step 5)
   - Conversation modal for preview
   - Reuse conversational UI components from main app

6. `SwipeGestureScreen.tsx` (Step 6)
   - Animation for swiping gesture education
   - Visual guide with repeating animation

7. `SurveyIntroScreen.tsx` (Step 7)
   - Introduction to survey section
   - Progress bar initialization

8-14. `SurveyQuestionScreen.tsx` (Steps 8-14)
   - Generic question screen component that accepts:
     - Question text
     - Options
     - Progress step (for progress bar)
   - Reused for all survey questions with different data

15. `SurveyInsightsScreen.tsx` (Step 15)
   - Gemini API integration
   - Loading state handling
   - Display of personalized insights

16. `AccountCreationScreen.tsx` (Step 16)
   - Refactor existing OnboardingStep6.tsx
   - Integrate with collected onboarding data

### 5. API Integration
- Implement Gemini API integration for insights generation
- Create a function to format collected user data into a prompt
- Handle API response parsing and error cases

### 6. Data Flow

1. Collect data through each step
2. Store in context
3. On account creation:
   - Create user account with Supabase
   - Store all collected preferences in user profile
   - Redirect to main app with personalized experience

### 7. UI/UX Considerations
- Consistent animations between screens
- Smooth transitions between steps
- Loading states for API calls
- Error handling for network issues or API failures
- Accessibility considerations

### 8. Implementation Approach

#### Phase 1: Foundation
1. Set up directory structure
2. Create state management context
3. Implement navigation flow
4. Develop shared components

#### Phase 2: Screen Development
1. Implement screens in sequence
2. Build reusable patterns for survey questions
3. Create animations and transitions

#### Phase 3: Integration
1. Connect to APIs (Supabase, Gemini)
2. Implement account creation with collected data
3. Test full user journey

#### Phase 4: Polish
1. Add animations and transitions
2. Optimize performance
3. Implement error handling
4. Add analytics tracking

### 9. Testing Strategy
- Unit tests for individual components
- Integration tests for state management
- End-to-end tests for complete onboarding flow
- Cross-device testing (iOS/Android)

### 10. Migration Plan
1. Develop new onboarding in parallel with existing flow
2. Test thoroughly
3. Switch routing in main app (`_layout.tsx`) to point to new onboarding
4. Monitor analytics for improved conversion

## Technical Implementation Details

### Context Provider Structure
```typescript
// OnboardingContext.tsx
import React, { createContext, useReducer, useContext } from 'react';

// Define the context shape
interface OnboardingContextType {
  state: OnboardingState;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  setLanguage: (language: string) => void;
  setMainGoal: (goal: string) => void;
  setSurveyAnswer: (question: keyof OnboardingState['surveyAnswers'], answer: string) => void;
  setGeminiInsights: (insights: string) => void;
}

// Create the context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Create a provider component
export const OnboardingProvider: React.FC = ({ children }) => {
  // Implementation with useReducer
  // ...

  return (
    <OnboardingContext.Provider value={/* context value */}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Custom hook for using the context
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
```

### Gemini API Integration
```typescript
// geminiService.ts
export async function generatePersonalizedInsights(userData: OnboardingState) {
  // Format the prompt with user data
  const prompt = `Based on the following information about a language learner:
  - They are learning ${userData.selectedLanguage}
  - Their main goal is ${userData.mainGoal}
  - Their main motivation is ${userData.surveyAnswers.drivingFactor}
  - They struggle with ${userData.surveyAnswers.biggestStruggle}
  - Their current learning method is ${userData.surveyAnswers.currentLearningMethod}
  - They want to complete ${userData.surveyAnswers.dailyLessonGoal} lessons per day
  - Their current level is ${userData.surveyAnswers.proficiencyLevel}
  - They're interested in ${userData.surveyAnswers.culturalInterests}
  
  Provide a personalized 2-3 sentence insight about how they can best succeed in learning the language with Shira.`;

  // Call Gemini API
  // Handle response
  // Return formatted insights
}
```

## Timeline and Priorities

1. **Week 1: Foundation**
   - Set up project structure
   - Implement state management
   - Create reusable components

2. **Week 2: Core Screens**
   - Implement Welcome through SwipeGesture screens
   - Begin survey screen implementation

3. **Week 3: Survey and API Integration**
   - Complete survey question screens
   - Implement Gemini API integration
   - Develop insights screen

4. **Week 4: Account Integration & Polish**
   - Refactor account creation screen
   - Connect all data flows
   - Add animations and transitions
   - Testing and bug fixes

## Conclusion
This implementation plan provides a structured approach to rebuilding the Shira onboarding experience. By focusing on modular components, unified state management, and a step-by-step implementation, we can create a more engaging and personalized onboarding flow that collects valuable user data while educating users about the app's functionality. 