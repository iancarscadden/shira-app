New Feature: Alright we are now going to work on setting up the pre requisite features in our for introducing a real paywall for users. Right now in or app when a paywall is supposed to come up it will be the paywall.tsx route we have, and for now we dont need to build anything further for the pay wall, that will come next. what we need to build now is the user experience of the paywall to come up. 

for this we will be working with the following fields on the profiles table in supabase, "is_pro" which if true that means the user is a paid pro user, and if false they are not, and then we have free_videos (you may need to add this to our supabase strucuture in our code), which will be our counter for how many free videos the user user has accesed. here is the flow:

Flow Summary for Subscription & Free Videos Feature

Swipe Event Trigger: When a user swipes up to view the next video, the app triggers a check before transitioning.

Pro Status Check:

If the user is a Pro subscriber (is_pro flag is true):
The next video loads immediately without restrictions.
If the user is not a Pro subscriber (is_pro flag is false):
The app checks the user's free video counter (free_videos) from their profile.
Free Video Counter Check:

If free_videos is less than 3:
The counter is incremented by one.
The app allows the user to proceed to the next video.
If free_videos is equal to or greater than 3:
The video transition is blocked.
A paywall is displayed, prompting the user to subscribe for unlimited access. (this is where paywall.tsx will automatically pop up over the screen.)