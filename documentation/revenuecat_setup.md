We will now be integrating revenue cat into our application. i have already configured these  offerings in the revenue cat dashboard as well as app store connect: Below is a concise write-up of what you have in RevenueCat and how to integrate it into your React Native app. You can give this to your coding assistant (like Cursor AI) so it can generate the code.

What You Have
Offering: Named default
Packages in the default Offering:
Annual: Maps to annual_shira_pro
Monthly: Maps to monthly_shira_pro
Weekly: Maps to weekly_shira_pro
In RevenueCat’s terms, you now have an offering with three subscription tiers (annual, monthly, weekly). Each tier is linked to its corresponding in-app purchase product in App Store Connect.

How to Use This in Your App
Install & Import

Install RevenueCat’s React Native SDK:
bash
Copy
npm install react-native-purchases
# or
yarn add react-native-purchases
Import it in your code:
js
Copy
import Purchases from 'react-native-purchases';
Configure RevenueCat

In your app’s startup code (e.g., App.js or a dedicated config file), call:
js
Copy
Purchases.configure({
  apiKey: 'YOUR_REVENUECAT_PUBLIC_API_KEY', 
  appUserID: 'YOUR_USER_UUID',  // optional but recommended
  observerMode: false,          // set to true if you handle transactions manually
});
Replace 'YOUR_REVENUECAT_PUBLIC_API_KEY' with the key from the RevenueCat dashboard.
Optionally, pass a user identifier for appUserID if you track your own user IDs (recommended).
Fetch the Offering

In the screen where you want to display subscription options (e.g., SubscriptionScreen.js):
js
Copy
async function fetchOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current; // 'default' offering if it's marked as current

    if (offering && offering.availablePackages.length > 0) {
      // This array contains your annual, monthly, weekly packages
      console.log('Packages:', offering.availablePackages);
      // You’ll display these packages in the UI so the user can pick one
    } else {
      console.log('No available offerings');
    }
  } catch (error) {
    console.error('Error fetching offerings:', error);
  }
}
Purchase a Package

Once you have the user’s chosen package (annual, monthly, or weekly), call:
js
Copy
async function purchasePackage(selectedPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
    console.log('Purchase success:', customerInfo);

    // Check entitlement to confirm "pro" status
    const isPro = 
      customerInfo.entitlements.active['YOUR_ENTITLEMENT_ID'] !== undefined;
    if (isPro) {
      // Unlock features, update UI, or call your backend
      console.log('User is now PRO');
    }
  } catch (error) {
    if (error.userCancelled) {
      console.log('User cancelled purchase');
    } else {
      console.error('Purchase error:', error);
    }
  }
}
Note: The selectedPackage is one item from the offering.availablePackages array.
YOUR_ENTITLEMENT_ID should match the entitlement you created in RevenueCat (often something like shira_pro_entitlement).
Restore Purchases (Optional)

If you have a “Restore” button:
js
Copy
async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('Restored purchases:', customerInfo);
  } catch (error) {
    console.error('Restore error:', error);
  }
}


Now above is an interpretation of what we need to do, please take it in a then change anything if it is bad code. What we also want to do is integrate the revenue cat with out paywall.tsx file, and then add all of the required functionality.

What we also want to do is write code to write to the profiles table -> uuid -> is_pro set to true if the purchase goes though, if it doesnt we handle the error with a system message.  Also for any env vars let me know what we need and i will get them for you.