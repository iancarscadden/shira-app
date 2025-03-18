# Implementation Plan for -2s and +2s Buttons

## Overview

We need to implement functionality for the existing -2s and +2s buttons in the video player's control bar to allow users to skip backward or forward by 2 seconds while maintaining proper clip boundaries.

## Current State Analysis

The buttons currently exist in the UI but don't have any functionality. They are located in the `learn.tsx` file within the video controls section.

```typescript
<TouchableOpacity
    style={styles.seekButton}
    onPress={() => {
        // No functionality for now
        console.log('Seek backward 2s');
    }}
>
    <Text style={styles.seekButtonText}>- 2s</Text>
</TouchableOpacity>

<TouchableOpacity
    style={styles.seekButton}
    onPress={() => {
        // No functionality for now
        console.log('Seek forward 2s');
    }}
>
    <Text style={styles.seekButtonText}>+ 2s</Text>
</TouchableOpacity>
```

## Existing Seek Logic

The app already has a robust seeking mechanism:

1. The `handleSeek` function is used for seeking to a specific time.
2. The video player uses `playerRef.current.seekTo()` to control playback position.
3. The app maintains two time contexts:
   - **Absolute time**: The actual position in the YouTube video
   - **Relative time**: Time relative to the clip start (stored in `videoState.currentTime`)
4. Boundary checks ensure seeking stays within `clipStart` and `clipEnd`.
5. The app includes verification to ensure seeking was successful.

## Implementation Rules

1. **Create a new function**: Implement a `handleSeekOffset` function that will:
   - Accept a time offset (positive or negative seconds)
   - Calculate the new target position based on current position
   - Call the existing `handleSeek` function with the new target position

2. **Boundary Handling**:
   - **Lower Boundary (-2s button)**: 
     - If seeking backwards would go before clip start, seek to clip start
     - Example: If current position is 1.5s into the clip and user presses -2s, seek to clip start (0s)
   - **Upper Boundary (+2s button)**:
     - If seeking forward would go past clip end, seek to clip start
     - Example: If current position is at clipDuration - 1s and user presses +2s, seek to clip start (0s)

3. **State Management**:
   - Ensure `isSeeking` state is properly set to prevent multiple seeks
   - Update `videoState.currentTime` appropriately
   - Handle the playing state during and after seeking

4. **Error Handling**:
   - Add proper error logging
   - Ensure app doesn't crash if seeking fails
   - Add recovery mechanisms

5. **User Experience**:
   - Provide visual feedback when seeking (e.g., briefly show the time change)
   - Prevent button spamming by debouncing or disabling during seeking

## Implementation Steps

1. **Create the `handleSeekOffset` function**:
   ```typescript
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
               return handleSeek(0);
           } else if (newTargetTime > clipDuration) {
               // If seeking forward would go beyond clip end, seek to clip start
               return handleSeek(0);
           }
           
           // Normal seek within bounds
           return handleSeek(newTargetTime);
       } catch (error) {
           logEvent('SEEK_OFFSET_ERROR', {
               error: error instanceof Error ? error.message : String(error),
               offsetSeconds,
               videoId: state.currentLesson?.data.video.id
           });
       }
   }, [videoState.currentTime, state.currentLesson, isSeeking, handleSeek]);
   ```

2. **Update the button handlers**:
   ```typescript
   // -2s button
   <TouchableOpacity
       style={styles.seekButton}
       onPress={() => handleSeekOffset(-2)}
       disabled={isSeeking || !videoState.isReady}
   >
       <Text style={styles.seekButtonText}>- 2s</Text>
   </TouchableOpacity>
   
   // +2s button
   <TouchableOpacity
       style={styles.seekButton}
       onPress={() => handleSeekOffset(2)}
       disabled={isSeeking || !videoState.isReady}
   >
       <Text style={styles.seekButtonText}>+ 2s</Text>
   </TouchableOpacity>
   ```

## Edge Cases and Considerations

1. **Rapid Multiple Clicks**:
   - Use the `isSeeking` state to prevent multiple seeks from occurring simultaneously
   - Consider adding a short debounce if needed

2. **Seeking While Paused/Playing**:
   - The existing `handleSeek` function already preserves the playing state

3. **Failed Seeks**:
   - Add retry logic for failed seeks
   - Log failures for debugging

4. **Initial Loading State**:
   - Disable buttons until the video is fully loaded and ready (`videoState.isReady`)

5. **During Transitions**:
   - Disable buttons during video transitions

## Testing Plan

1. **Basic Functionality**:
   - Test -2s button when in the middle of a clip
   - Test +2s button when in the middle of a clip

2. **Boundary Tests**:
   - Test -2s button when less than 2 seconds from clip start
   - Test +2s button when less than 2 seconds from clip end
   - Test +2s button at the very end of a clip (should reset to beginning)

3. **Stress Testing**:
   - Test rapid clicking of seek buttons
   - Test alternating between -2s and +2s quickly

4. **State Consistency**:
   - Ensure captions update correctly after seeking
   - Verify the video timeline/progress updates correctly
   - Check that the playing/paused state is maintained correctly

## Implementation Timeline

1. Implement the `handleSeekOffset` function
2. Update the button handlers
3. Add error handling and logging
4. Test all scenarios 
5. Verify user experience is smooth and intuitive

## Conclusion

This implementation will enhance the user experience by allowing precise navigation within video clips while maintaining the clip boundaries. The implementation leverages existing robust seeking mechanisms in the app while adding the new specific functionality for the -2s and +2s buttons. 