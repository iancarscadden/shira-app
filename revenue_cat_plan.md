# RevenueCat Integration Plan for Shira App

## 1. Understanding the Codebase

### Project Structure
The Shira app is an Expo React Native application with the following structure:
- `shira_app/`: Main Expo project directory
  - `app/`: Main application code using Expo Router
    - `paywall.tsx`: Current paywall implementation (to be replaced with RevenueCat)
    - `_layout.tsx`: App layout and navigation structure
    - `login.tsx`: User authentication
  - `supabase/`: Supabase integration for backend services
  - `hooks/`: Custom React hooks including `useUser.ts` for user management
  - `components/`: Reusable UI components
  - Other standard Expo/React Native files and directories

### Current Paywall Implementation
The current paywall (`app/paywall.tsx`) is a custom implementation that:
- Displays subscription options (weekly, monthly, yearly)
- Handles user selection of subscription plans
- Simulates purchase flow
- Updates user's pro status in Supabase after purchase
- Uses a clean, modern UI with features like BlurView and LinearGradient

### User Authentication and Management
- The app uses Supabase for authentication and user management
- `useUser.ts` hook provides user state and profile data
- User profiles in Supabase include an `is_pro` field to track subscription status

## 2. RevenueCat Requirements

Based on the `revenuecat_2nd_implementation.md` document:

### RevenueCat Configuration
- **API Key**: `appl_zRRgtqSictCpKyyscMdIjxjasqd`
- **Project ID**: `a3abfc4f`

### Subscription Products
| Reference Name | Product ID | Duration |
|----------------|------------|----------|
| Weekly Shira Pro | weekly_shira_pro | 1 week |
| Monthly Shira Pro | monthy_shira_pro | 1 month |
| Annual Shira Pro | annual_shira_pro | 1 year |

### Entitlements
- **Identifier**: `Shira Pro`
- **Description**: Unlocks access to features in Shira - Spanish Video Lessons

### Offerings
- **Identifier**: `default`
- **Description**: Shira Pro Packages
- **Packages**: 3 packages (weekly, monthly, annual)
- **Paywall Template**: 4 - Persian

## 3. Implementation Plan

### Step 1: Install Required Dependencies
```bash
cd shira_app
npx expo install react-native-purchases expo-dev-client
```

### Step 2: Configure RevenueCat SDK

Create a new file `supabase/revenueCatClient.ts` to initialize and configure RevenueCat:

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

### Step 3: Integrate with User Authentication

Modify the `useUser.ts` hook to integrate with RevenueCat:

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

### Step 4: Initialize RevenueCat in App Layout

Modify `app/_layout.tsx` to initialize RevenueCat:

```typescript
// Add to imports
import { initializeRevenueCat } from '../supabase/revenueCatClient';

// Inside the component, add useEffect
useEffect(() => {
  // Initialize RevenueCat
  initializeRevenueCat();
}, []);
```

### Step 5: Create a New RevenueCat Paywall Component

Replace the existing `app/paywall.tsx` with a new implementation that uses RevenueCat:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase/supabaseClient';
import useUser from '../hooks/useUser';
import { getOfferings, purchasePackage, restorePurchases } from '../supabase/revenueCatClient';

// Colors
const COLORS = {
  primary: '#5a51e1', // Purple
  secondary: '#e15190', // Pink
  tertiary: '#51e1a2', // Teal
  accent: '#c4cc45', // Yellow
  background: '#181818', // Dark background
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  border: 'rgba(255,255,255,0.1)',
};

const { width, height } = Dimensions.get('window');
const statusBarHeight = StatusBar.currentHeight || 0;
const topPadding = Platform.OS === 'ios' ? 44 : statusBarHeight;

export default function Paywall() {
  const params = useLocalSearchParams();
  const returnTo = params.returnTo as string;
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useUser();
  
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);

  // Fetch offerings from RevenueCat
  useEffect(() => {
    const fetchOfferings = async () => {
      setIsLoading(true);
      try {
        const offerings = await getOfferings();
        setOfferings(offerings);
      } catch (error) {
        console.error('Error fetching offerings:', error);
        Alert.alert('Error', 'Failed to load subscription options. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOfferings();
  }, []);

  const handleClose = () => {
    if (returnTo) {
      router.push(returnTo as any);
    } else {
      router.push('/(tabs)/learn');
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to make a purchase.');
      return;
    }

    if (!offerings) {
      Alert.alert('Error', 'Subscription options are not available. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Get the selected package
      let packageToPurchase;
      
      switch (selectedPlan) {
        case 'weekly':
          packageToPurchase = offerings.availablePackages.find(
            (pkg: any) => pkg.product.identifier === 'weekly_shira_pro'
          );
          break;
        case 'monthly':
          packageToPurchase = offerings.availablePackages.find(
            (pkg: any) => pkg.product.identifier === 'monthy_shira_pro'
          );
          break;
        case 'yearly':
          packageToPurchase = offerings.availablePackages.find(
            (pkg: any) => pkg.product.identifier === 'annual_shira_pro'
          );
          break;
      }

      if (!packageToPurchase) {
        throw new Error('Selected package not found');
      }

      // Make the purchase
      const customerInfo = await purchasePackage(packageToPurchase);
      
      // Check if the user has the pro entitlement
      const isPro = customerInfo.entitlements.active['Shira Pro'] !== undefined;
      
      if (isPro) {
        // Update user's pro status in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ is_pro: true })
          .eq('id', user.id);

        if (error) throw error;

        // Refresh user data
        await refreshUser();

        Alert.alert(
          'Success!',
          'You are now a Shira Pro member!',
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        throw new Error('Purchase completed but pro entitlement not found');
      }
    } catch (error: any) {
      console.error('Error making purchase:', error);
      
      // Handle user cancellation
      if (error.code === 'user_cancelled') {
        console.log('User cancelled the purchase');
        return;
      }
      
      Alert.alert('Error', error.message || 'There was an issue with your purchase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to restore purchases.');
      return;
    }

    setIsRestoringPurchases(true);
    try {
      const { isPro, customerInfo } = await restorePurchases();
      
      if (isPro) {
        // Update user's pro status in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ is_pro: true })
          .eq('id', user.id);

        if (error) throw error;

        // Refresh user data
        await refreshUser();

        Alert.alert(
          'Success!',
          'Your purchases have been restored!',
          [{ text: 'OK', onPress: handleClose }]
        );
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', error.message || 'There was an issue restoring your purchases. Please try again.');
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  // Format price for display
  const formatPrice = (plan: 'weekly' | 'monthly' | 'yearly') => {
    if (!offerings) return '';
    
    let packageInfo;
    
    switch (plan) {
      case 'weekly':
        packageInfo = offerings.availablePackages.find(
          (pkg: any) => pkg.product.identifier === 'weekly_shira_pro'
        );
        break;
      case 'monthly':
        packageInfo = offerings.availablePackages.find(
          (pkg: any) => pkg.product.identifier === 'monthy_shira_pro'
        );
        break;
      case 'yearly':
        packageInfo = offerings.availablePackages.find(
          (pkg: any) => pkg.product.identifier === 'annual_shira_pro'
        );
        break;
    }
    
    return packageInfo ? packageInfo.product.priceString : '';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />
      
      <ImageBackground
        source={require('../assets/images/paywall_image_3.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <BlurView intensity={80} style={styles.blurView}>
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Unlock Shira Pro</Text>
              <Text style={styles.subtitle}>
                Get unlimited access to all features and content
              </Text>
            </View>

            {/* Features list */}
            <View style={styles.featuresContainer}>
              <BlurView intensity={20} style={styles.featuresBlurContainer}>
                <View style={styles.featureRow}>
                  <Text style={[styles.checkmark, { color: COLORS.tertiary }]}>✓</Text>
                  <Text style={styles.featureText}>Unlimited video lessons</Text>
                </View>
                <View style={styles.featureRow}>
                  <Text style={[styles.checkmark, { color: COLORS.tertiary }]}>✓</Text>
                  <Text style={styles.featureText}>Advanced pronunciation feedback</Text>
                </View>
                <View style={styles.featureRow}>
                  <Text style={[styles.checkmark, { color: COLORS.tertiary }]}>✓</Text>
                  <Text style={styles.featureText}>Personalized learning path</Text>
                </View>
                <View style={styles.featureRow}>
                  <Text style={[styles.checkmark, { color: COLORS.tertiary }]}>✓</Text>
                  <Text style={styles.featureText}>No ads or interruptions</Text>
                </View>
              </BlurView>
            </View>

            {/* Pricing options */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading subscription options...</Text>
              </View>
            ) : (
              <View style={styles.pricingContainer}>
                {/* Weekly Plan */}
                <TouchableOpacity
                  style={[
                    styles.pricingOption,
                    selectedPlan === 'weekly' && styles.selectedPricingOption,
                  ]}
                  onPress={() => setSelectedPlan('weekly')}
                  disabled={isLoading}
                >
                  <View style={styles.pricingContent}>
                    <Text style={styles.pricingTitle}>Weekly</Text>
                    <Text style={styles.pricingPrice}>
                      {formatPrice('weekly')}
                      <Text style={styles.pricingPeriod}>/week</Text>
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Monthly Plan */}
                <TouchableOpacity
                  style={[
                    styles.pricingOption,
                    selectedPlan === 'monthly' && styles.selectedPricingOption,
                  ]}
                  onPress={() => setSelectedPlan('monthly')}
                  disabled={isLoading}
                >
                  <View style={styles.pricingContent}>
                    <Text style={styles.pricingTitle}>Monthly</Text>
                    <Text style={styles.pricingPrice}>
                      {formatPrice('monthly')}
                      <Text style={styles.pricingPeriod}>/month</Text>
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Yearly Plan */}
                <TouchableOpacity
                  style={[
                    styles.pricingOption,
                    selectedPlan === 'yearly' && styles.selectedPricingOption,
                  ]}
                  onPress={() => setSelectedPlan('yearly')}
                  disabled={isLoading}
                >
                  <View style={styles.pricingContent}>
                    <Text style={styles.pricingTitle}>Yearly</Text>
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveText}>Save 47%</Text>
                    </View>
                    <Text style={styles.pricingPrice}>
                      {formatPrice('yearly')}
                      <Text style={styles.pricingPeriod}>/year</Text>
                    </Text>
                    <Text style={styles.monthlyEquivalent}>
                      Just {offerings ? (parseFloat(formatPrice('yearly').replace(/[^0-9.]/g, '')) / 12).toFixed(2) : '6.66'}/month
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Continue button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handlePurchase}
              disabled={isLoading || isRestoringPurchases}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* Restore purchases button */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
              disabled={isLoading || isRestoringPurchases}
            >
              {isRestoringPurchases ? (
                <ActivityIndicator color={COLORS.textSecondary} size="small" />
              ) : (
                <Text style={styles.restoreText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </ImageBackground>
      
      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 10 }]}
        onPress={handleClose}
        disabled={isLoading || isRestoringPurchases}
      >
        <Ionicons name="close" size={24} color={COLORS.text} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  blurView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: '80%',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featuresBlurContainer: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.text,
  },
  pricingContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pricingOption: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    alignItems: 'center',
  },
  selectedPricingOption: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(90,81,225,0.1)',
  },
  pricingContent: {
    alignItems: 'center',
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pricingPeriod: {
    fontSize: 14,
    fontWeight: 'normal',
    color: COLORS.textSecondary,
  },
  saveBadge: {
    backgroundColor: COLORS.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  saveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  monthlyEquivalent: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  continueButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  restoreButton: {
    padding: 8,
  },
  restoreText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
```

### Step 6: Update App Configuration for Development Client

Update `app.json` to configure the app for development client:

```json
{
  "expo": {
    // ... existing configuration
    "plugins": [
      // ... existing plugins
      "react-native-purchases"
    ]
  }
}
```

### Step 7: Testing and Validation

1. **Development Testing**:
   - Use sandbox testing accounts for iOS and Android
   - Test all subscription options (weekly, monthly, yearly)
   - Test purchase flow, cancellation, and restoration
   - Verify that user's pro status is correctly updated in Supabase

2. **Production Preparation**:
   - Ensure all product IDs match between App Store Connect and RevenueCat
   - Verify that the correct API keys are used for production
   - Test the complete purchase flow in TestFlight/Internal Testing

## 4. Implementation Considerations

### User Experience
- Maintain the current clean, modern UI design
- Add loading states for RevenueCat operations
- Add error handling with user-friendly messages
- Add a "Restore Purchases" button for users who have previously subscribed

### Security
- Verify subscription status on the server side for critical operations
- Don't rely solely on client-side verification for access control
- Implement proper error handling for network failures

### Performance
- Initialize RevenueCat early in the app lifecycle
- Cache offerings data to reduce API calls
- Implement retry logic for network failures

### Maintenance
- Use TypeScript interfaces for RevenueCat types
- Document the integration for future developers
- Set up monitoring for purchase failures

## 5. Future Enhancements

1. **Analytics Integration**:
   - Track conversion rates for different subscription options
   - Analyze user behavior before and after subscription

2. **Promotional Offers**:
   - Implement promotional codes and discounts
   - Create special offers for returning users

3. **Subscription Management**:
   - Add a subscription management screen
   - Allow users to view and manage their subscription status

4. **A/B Testing**:
   - Test different paywall designs and pricing strategies
   - Use RevenueCat's experiment features to optimize conversion

## 6. Conclusion

The integration of RevenueCat into the Shira app will provide a robust, reliable subscription management system. By leveraging RevenueCat's SDK and backend services, we can focus on delivering a great user experience while offloading the complexity of subscription management to a specialized service.

The implementation will maintain the current UI design while adding the powerful features of RevenueCat, including proper handling of purchases, restoration, and subscription status tracking. This will result in a more reliable subscription system and a better experience for users. 