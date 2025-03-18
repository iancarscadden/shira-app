import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="PaywallScreen"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          // Ensure the modal doesn't affect tab navigation
          freezeOnBlur: true,
        }}
      />
    </Stack>
  );
} 