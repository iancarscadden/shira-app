New feature: 

Alright we are going to now imoplement a function for a user day-steak in the app. to implement this we will need to look over our codeabase and figure out where our main flie / functions are that handle the state of the user, and when ever the user opens the app / wherever you think we sohuld place this logic is where we will place it. here is an outline of the fields we added to the profiles table as well as a guideline for how we could create this feature

Here's the logic you can use, now that you've added the two new columns to your profiles table:

On App Launch or User Activity:

Retrieve the user's current_streak and last_active_at from their profile.
Compare the last_active_at timestamp to today’s date.
Determine the Streak Update:

If the user has already been active today:
Do nothing—the streak remains unchanged.
If the user was active yesterday:
Increment the current_streak by one.
If the user was not active yesterday (i.e., a gap of more than one day):
Reset the current_streak to 1, since the streak has been broken.
Update the Profile:

Set last_active_at to the current timestamp.
Update current_streak according to the logic above.
Integration in the App:

Trigger this streak-check logic on login or when the user performs an activity that qualifies as being “active.”
Use the updated streak information to display a streak counter or trigger any rewards in your UI.

also for reference here are all of the columns in the profiles table just incase you need a reference: 

INSERT INTO "public"."profiles" ("id", "display_name", "avatar_url", "target_lang", "created_at", "updated_at", "current_lesson_id", "current_streak", "last_active_at") VALUES ('5786f2dc-d722-4b11-a7af-2442d743d2b6', 'Iancar', null, 'Spanish', '2025-02-05 00:52:02.325403+00', '2025-02-05 00:52:02.325403+00', '1', '0', '2025-02-25 01:29:52.910112+00');