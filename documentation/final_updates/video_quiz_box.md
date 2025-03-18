# Video Quiz Box Implementation Plan

## Overview

This document outlines the implementation plan for enhancing the video quiz expandable box in the learn.tsx file. The implementation will focus on three major aspects:

1. Updating the header title based on the current screen
2. Adding a fourth completion screen
3. Replacing the swipe indicator with dot indicators

## Current Structure Analysis

The video quiz box is implemented as part of the `KeepLearningSection` component in `learn.tsx`. It contains a horizontal `ScrollView` with three screens:

1. `ContextView` - Multiple choice questions about the video context
2. `CulturalView` - Information about cultural aspects of the video
3. `ConversationalView` - Speaking practice related to the video

Each view has its own implementation in separate files in the `app/views` directory. The user can swipe horizontally between these screens, and the current screen index is tracked in the component's state.

Currently, XP and daily goal updates happen in the `ContextView` when a user answers a question correctly.

## Detailed Implementation Plan

### 1. Dynamic Header Title

**Current Implementation:**
- The header title is currently hardcoded as "Video Quiz" in the `KeepLearningSection` component.

**Implementation Strategy:**
- Update the `containerHeader` in `KeepLearningSection` to display different titles based on `state.currentScreenIndex`:
  - Index 0: "Video Quiz" (ContextView)
  - Index 1: "Cultural Info" (CulturalView)
  - Index 2: "Speaking Practice" (ConversationalView)
  - Index 3: "Good Job!" (New CompletionView)
- Use the existing state tracking for `currentScreenIndex` to determine which title to display.

### 2. Add Fourth Completion Screen

**Current Implementation:**
- The `ScrollView` contains three screens and its content width is set to `width * 3`.
- XP and daily goal updates happen in `ContextView.tsx` when a correct answer is selected.

**Implementation Strategy:**
1. Create a new component `CompletionView.tsx` in the `app/views` directory:
   - Display "Good Job!" as the main title
   - Show "You completed the video and got 100xp"
   - Include an XP bar visualization similar to progress.tsx
   - Display daily goal progress
   - Add "Swipe up to continue" text with an upward arrow
   
2. Modify the `KeepLearningSection` component:
   - Update the `ScrollView`'s content width to `width * 4`
   - Add the fourth view for the `CompletionView` component
   - Pass necessary props (user, currentXP, dailyGoal, etc.) to the `CompletionView`

3. Move XP Update Logic:
   - Move the XP and daily goal update logic from `ContextView` to the `CompletionView`
   - Trigger the update when the screen is first shown
   - Import the necessary functions from `progressService.ts`

### 3. Replace Swipe Indicator with Dot Indicators

**Current Implementation:**
- Each view has a "← swipe" text at the bottom.

**Implementation Strategy:**
1. Create a `DotIndicator` component:
   - Accept props for total dots (4) and current active dot
   - Display 4 dots horizontally with spacing
   - Fill the active dot with color (#5a51e1)
   - Use small dots to save space (around 6-8px in diameter)

2. Remove the existing swipe indicators:
   - Update each view component to remove the swipe arrow and text
   - Add the `DotIndicator` component instead, passing the current screen index

3. Style the dots correctly:
   - Ensure dots are positioned at the bottom of each screen
   - Maintain consistent styling across all screens
   - Ensure they are not too large to maintain good UI proportions

## Implementation Steps

1. **Create CompletionView Component**:
   - Create `CompletionView.tsx` in the `app/views` directory
   - Implement the UI following design principles from the rest of the app
   - Add XP bar and daily goal display
   - Import XP update functions from `progressService.ts`

2. **Create DotIndicator Component**:
   - Create a reusable component for the dot indicators
   - Implement styling that matches the app's design language

3. **Update KeepLearningSection**:
   - Modify the header title logic to be dynamic based on the current screen
   - Expand `ScrollView` to accommodate 4 screens
   - Add the `CompletionView` component as the 4th screen

4. **Update Existing View Components**:
   - Remove "← swipe" from `ContextView`, `CulturalView`, and `ConversationalView`
   - Add the `DotIndicator` component to each view

5. **Move XP Update Logic**:
   - Remove XP update code from `ContextView.tsx`
   - Add it to `CompletionView.tsx` with a useEffect hook to trigger on screen load

## Technical Considerations

1. **State Management**:
   - The `currentScreenIndex` is already being tracked in the `KeepLearningSection` component
   - This index will be used to determine which header title to show and which dot to highlight

2. **XP and Daily Goal Updates**:
   - Need to import and use `incrementXP` and `incrementDailyVideosWatched` from `progressService.ts`
   - Need to ensure the update happens only once when the user reaches the completion screen

3. **UI Design**:
   - The completion screen should fit within the same constrained space as the other screens
   - The dot indicators should be small enough to not take up too much vertical space
   - Follow the app's existing UI patterns for consistency

4. **Performance**:
   - Ensure smooth scrolling between screens by optimizing renders
   - Avoid unnecessary re-renders when updating the header title or dot indicators

## Testing Strategy

1. **Visual Testing**:
   - Verify the header title changes correctly with each swipe
   - Confirm the dot indicators highlight correctly with each swipe
   - Ensure the completion screen fits well and displays all information

2. **Functional Testing**:
   - Verify XP and daily goal updates happen when reaching the completion screen
   - Confirm the updates only happen once per video
   - Test that swiping between screens works smoothly

3. **Edge Cases**:
   - Test with different screen sizes to ensure responsive design
   - Verify behavior when a user swipes quickly through screens
   - Check behavior when a new video is loaded while on a non-first screen 