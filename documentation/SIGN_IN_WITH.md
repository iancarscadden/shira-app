This document goes over the implementation for the sign in with apple and google buttons which are contained on the login.tsx screen, and then the sing in with apple and google buttons that are on onboardingstep6.tsx for creating an account with apple and google.

Now in my supabase auth setup i have fully configured both sign in with apple and sign in with google, so they should be ready and set to go.

What i need you to do is go into onobardingstep6.tsx, and login.tsx and code the whole functionality for these buttons as right now they are just dummy buttons. Also if we need to we should work on our supabase implementation if we need to add new things for these new ways of auth, as well as if we need to make any changes to files in our project that deal with user authentication, we will want to use chain of thought reasoning to identify all of these and work with them. 

We also want to make sure that creating and account / signing in with these buttons also follows with the flow of our app, and being put into the app after log in / sign up

I want you to tell me if you need any details about these setups like keys or anything outside of supabase keys. 

You are also to edit the onboarding step 6 file logic where it brings up the paywall right after you create an account, to bring up our revenue cat paywall hosted that we already have set up in paywall.tsx, and fully delete the dummy paywall that it brings up right now. 