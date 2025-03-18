# RevenueCat Integration - First Implementation

## Overview

This document outlines the implementation of RevenueCat for in-app purchases and subscriptions in the Shira app. The integration allows users to subscribe to Shira Pro with weekly, monthly, and annual subscription options.

## Implementation Steps

### 1. Dependencies Installation

```bash
cd shira_app
npx expo install react-native-purchases expo-dev-client
```

The `react-native-purchases` package provides the RevenueCat SDK, while `expo-dev-client` enables development builds with native modules.

### 2. RevenueCat Client Setup

Created a new file `shira_app/supabase/revenueCatClient.ts` to handle all RevenueCat-related functionality:

```typescript
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API keys
const REVENUECAT_API_KEYS = {
  ios: 'appl_zRRgtqSictCpKyyscMdIjxjasqd',
  android: 'appl_zRRgtqSictCpKyyscMdIjxjasqd', // Using same key for now
};

export const initializeRevenueCat = () => {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  const apiKey = Platform.OS === 'ios' 
    ? REVENUECAT_API_KEYS.ios 
    : REVENUECAT_API_KEYS.android;

  Purchases.configure({
    apiKey,
    appUserID: null, // We'll set this after user authentication
  });

  console.log('RevenueCat SDK initialized');
};

// Set the user ID for RevenueCat
export const identifyUser = async (userId: string) => {
  try {
    await Purchases.logIn(userId);
    console.log('User identified with RevenueCat:', userId);
  } catch (error) {
    console.error('Error identifying user with RevenueCat:', error);
  }
};

// Reset user ID (for logout)
export const resetUser = async () => {
  try {
    await Purchases.logOut();
    console.log('User logged out from RevenueCat');
  } catch (error) {
    console.error('Error logging out user from RevenueCat:', error);
  }
};

// Get available packages
export const getOfferings = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
};

// Make a purchase
export const purchasePackage = async (packageToPurchase: any) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo;
  } catch (error) {
    console.error('Error making purchase:', error);
    throw error;
  }
};

// Check subscription status
export const checkSubscriptionStatus = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return {
      isPro: customerInfo.entitlements.active['Shira Pro'] !== undefined,
      customerInfo
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { isPro: false, customerInfo: null };
  }
};

// Restore purchases
export const restorePurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return {
      isPro: customerInfo.entitlements.active['Shira Pro'] !== undefined,
      customerInfo
    };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { isPro: false, customerInfo: null };
  }
};
```

This client provides functions for:
- Initializing the RevenueCat SDK
- Identifying users with RevenueCat
- Fetching available subscription offerings
- Making purchases
- Checking subscription status
- Restoring previous purchases

### 3. App Initialization

Updated `shira_app/app/_layout.tsx` to initialize RevenueCat when the app starts:

```typescript
// Add to imports
import { initializeRevenueCat } from '../supabase/revenueCatClient';

// Inside the component, add useEffect
useEffect(() => {
  // Initialize RevenueCat
  initializeRevenueCat();
}, []);
```

### 4. User Authentication Integration

Modified `shira_app/hooks/useUser.ts` to integrate RevenueCat with the user authentication flow:

```typescript
// Add to imports
import { identifyUser, resetUser, checkSubscriptionStatus } from '../supabase/revenueCatClient';

// Inside handleUser function, after setting user state
if (authUser) {
  // Identify user with RevenueCat
  await identifyUser(authUser.id);
  
  // Check subscription status with RevenueCat
  const { isPro } = await checkSubscriptionStatus();
  
  // If RevenueCat says user is Pro but Supabase doesn't, update Supabase
  if (isPro && !profile?.is_pro) {
    await supabase
      .from('profiles')
      .update({ is_pro: true })
      .eq('id', authUser.id);
      
    // Update local user state
    setUser(prevUser => prevUser ? {
      ...prevUser,
      is_pro: true
    } : null);
  }
}

// Inside the useEffect cleanup function
return () => {
  console.log('useUser: Cleaning up auth listener');
  subscription.unsubscribe();
  
  // Reset RevenueCat user on cleanup
  if (user) {
    resetUser();
  }
};
```

This integration:
- Identifies the user with RevenueCat when they log in
- Checks their subscription status with RevenueCat
- Updates the Supabase database if the user has an active subscription
- Resets the RevenueCat user when they log out

### 5. Paywall Implementation

Replaced the existing `shira_app/app/paywall.tsx` with a new implementation that uses RevenueCat:

The new paywall:
- Fetches subscription offerings from RevenueCat
- Displays the available subscription options (weekly, monthly, yearly)
- Handles the purchase flow using RevenueCat
- Updates the user's pro status in Supabase after a successful purchase
- Provides a "Restore Purchases" button for users who have previously subscribed

Key features of the paywall implementation:
- Loading state while fetching offerings
- Error handling for failed purchases
- Proper handling of user cancellation
- Subscription restoration functionality
- Dynamic pricing display based on RevenueCat offerings

### 6. App Configuration

Updated `shira_app/app.json` to add the RevenueCat plugin:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      "react-native-purchases"
    ]
  }
}
```

## RevenueCat Configuration

The RevenueCat dashboard is configured with:

- **API Key**: `appl_zRRgtqSictCpKyyscMdIjxjasqd`
- **Project ID**: `a3abfc4f`

### Subscription Products

| Reference Name | Product ID | Duration |
|----------------|------------|----------|
| Weekly Shira Pro | shira_pro_weekly | 1 week |
| Monthly Shira Pro | shira_pro_monthly | 1 month |
| Annual Shira Pro | shira_pro_annual | 1 year |

### Entitlements

- **Identifier**: `Shira Pro`
- **Description**: Unlocks access to features in Shira - Spanish Video Lessons

### Offerings

- **Identifier**: `default`
- **Description**: Shira Pro Packages
- **Packages**: 3 packages (weekly, monthly, annual)
- **Paywall Template**: 4 - Persian

## Testing Instructions

To test the RevenueCat integration:

1. Build a development client:
   ```bash
   cd shira_app
   npx expo run:ios  # or npx expo run:android
   ```

2. Navigate to the profile screen and tap the "GO PRO" button.

3. Test the purchase flow using sandbox testing accounts:
   - For iOS: Use sandbox testing accounts in App Store Connect
   - For Android: Use test cards in Google Play Console

4. Verify that the user's pro status is correctly updated in Supabase after a successful purchase.

5. Test the "Restore Purchases" functionality to ensure it correctly restores previous purchases.

## Next Steps

1. **Production Testing**: Test the complete purchase flow in TestFlight/Internal Testing.
2. **Analytics Integration**: Set up analytics to track conversion rates and user behavior.
3. **Subscription Management**: Add a subscription management screen for users to view and manage their subscriptions.
4. **A/B Testing**: Implement A/B testing for different paywall designs and pricing strategies.

## Troubleshooting

- If offerings aren't loading, check the RevenueCat API key and ensure the products are correctly configured in the RevenueCat dashboard.
- If purchases aren't working, verify that the product IDs match between App Store Connect/Google Play Console and RevenueCat.
- For debugging, check the console logs which include detailed information about the RevenueCat operations. 