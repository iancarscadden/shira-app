# RevenueCat Product ID Updates

## Overview

This document outlines the updates made to the RevenueCat product IDs in the Shira app. The product IDs were changed to match the new configuration in App Store Connect and RevenueCat dashboard.

## Changes Made

### Updated Product IDs

| Old Product ID | New Product ID |
|----------------|---------------|
| weekly_shira_pro | shira_pro_weekly |
| monthy_shira_pro | shira_pro_monthly |
| annual_shira_pro | shira_pro_annual |

### Files Updated

1. **shira_app/app/paywall.tsx**
   - Updated product identifiers in the `handlePurchase` function
   - Updated product identifiers in the `formatPrice` function
   - Fixed a typo in "monthy_shira_pro" to "shira_pro_monthly"

2. **documentation/revenue_cat_1st_update.md**
   - Updated the product IDs in the documentation to reflect the new naming convention

### Unchanged Configuration

- **Entitlement Identifier**: `Shira Pro` (remained the same)
- **Offering Identifier**: `default` (remained the same)
- **RevenueCat API Key**: `appl_zRRgtqSictCpKyyscMdIjxjasqd` (remained the same)

## Testing Instructions

After these changes, you should test the RevenueCat integration by:

1. Building a development client using the instructions in the previous documentation
2. Verifying that the correct product IDs are displayed in the logs when fetching offerings
3. Testing the purchase flow with sandbox testing accounts to ensure the new product IDs work correctly

## Next Steps

1. Monitor the RevenueCat dashboard to ensure purchases are being tracked correctly with the new product IDs
2. Update any analytics or tracking that might reference the old product IDs
3. Consider adding more detailed logging to verify the correct product IDs are being used at runtime 