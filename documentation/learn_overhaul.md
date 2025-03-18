Here is what we are going to do to the learn.tsx file and its relating files.

We are going to do a complete overhaul of learn.tsx and take away the functionality the file has of preloading the next video. what we want to do instead
is make it so that there is one video at a time (row from content table) in the states, and then when the swipe it triggered, we pull the next content id form the database and replace all the new states with that.

We want to reetain all of our logic for other variables, like check subscription status, checking free_video, and many other things.

The main goal here is that we want to refactor the learn.tsx to only have one content at a time and not preload the next one, we want to pull the next one 
when the user swipes up to go the next one.

The name of the game here and why we are doing this is so that we completly dont need to worry about keeping track of 2 videos at once.

Please think about everywhere in the learn.ts file / its children files that need to be refactored for this, same with thinking about where in our 
database logic files also needs to be addressed for this refactor.