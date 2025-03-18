Now what we need to do is work with the is_pro flag logic we have in the app. to my knowledfge the is pro flag should have logic for it in the learn.tsx as well as the profile.tsx.

In learn.tsx this is the file where the main function for the app goes on, where the user swipes up to go to the next video, in this file we have a checker implemented to increment the users free videos, the context for this being when the user first enters the app they are hit with our paywall, where they can then close it if they want to but we have trackers each time they swipe up to counter their free_videos and when it hits 3 we start checking if is_pro is true and if its not then we pull our our paywall, which right now is greatly impemented!

What we need to do now is modify our logic when the user subscribes, and it will now in revenue cat has them down as subscribed, we need to set is_pro to true, which then we also want to implement a way that we can every now and then check the status of the users subscription, and if it is not subscribed in revenue cat, then we set is_pro to false, you get the idea.



