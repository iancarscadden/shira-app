import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { Stack, router } from 'expo-router';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import useUser from '../hooks/useUser';
import { identifyUser } from '../supabase/revenueCatClient';

// This component is for testing RevenueCat functionality
export default function RevenueCatTest() {
  const { user, loading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<Array<{type: string, result: string, timestamp: Date}>>([]);

  useEffect(() => {
    // Load customer info when component mounts
    if (!userLoading && user) {
      loadCustomerInfo();
    }
  }, [user, userLoading]);

  const loadCustomerInfo = async () => {
    try {
      setIsLoading(true);
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      addTestResult('Info', 'Customer info loaded successfully');
    } catch (error) {
      console.error('Error loading customer info:', error);
      addTestResult('Error', `Failed to load customer info: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addTestResult = (type: string, result: string) => {
    setTestResults(prev => [
      { type, result, timestamp: new Date() },
      ...prev
    ]);
  };

  const handleIdentifyUser = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    try {
      setIsLoading(true);
      addTestResult('Action', `Identifying user: ${user.id}`);
      
      await identifyUser(user.id);
      
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      
      if (info.originalAppUserId === user.id) {
        addTestResult('Success', `User successfully identified as: ${user.id}`);
      } else {
        addTestResult('Warning', `User identification may have failed. Expected ${user.id} but got ${info.originalAppUserId}`);
      }
    } catch (error) {
      console.error('Error identifying user:', error);
      addTestResult('Error', `Failed to identify user: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresentPaywall = async () => {
    try {
      setIsLoading(true);
      addTestResult('Action', 'Presenting paywall');
      
      const result = await RevenueCatUI.presentPaywall();
      addTestResult('Info', `Paywall result: ${PAYWALL_RESULT[result]}`);
      
      // Refresh customer info after paywall presentation
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        addTestResult('Success', 'Purchase or restoration successful');
      }
    } catch (error) {
      console.error('Error presenting paywall:', error);
      addTestResult('Error', `Failed to present paywall: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresentPaywallIfNeeded = async () => {
    try {
      setIsLoading(true);
      addTestResult('Action', 'Presenting paywall if needed for entitlement: Shira Pro');
      
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'Shira Pro'
      });
      addTestResult('Info', `Conditional paywall result: ${PAYWALL_RESULT[result]}`);
      
      // Refresh customer info after paywall presentation
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      
      if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        addTestResult('Info', 'Paywall not presented (user already has entitlement)');
      } else if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        addTestResult('Success', 'Purchase or restoration successful');
      }
    } catch (error) {
      console.error('Error presenting conditional paywall:', error);
      addTestResult('Error', `Failed to present conditional paywall: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      addTestResult('Action', 'Restoring purchases');
      
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      
      const hasPro = info.entitlements.active['Shira Pro'] !== undefined;
      if (hasPro) {
        addTestResult('Success', 'Purchases restored successfully, user has Shira Pro entitlement');
      } else {
        addTestResult('Info', 'Purchases restored, but user does not have Shira Pro entitlement');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      addTestResult('Error', `Failed to restore purchases: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetOfferings = async () => {
    try {
      setIsLoading(true);
      addTestResult('Action', 'Fetching offerings');
      
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        addTestResult('Success', `Offerings fetched successfully: ${offerings.current.identifier}`);
        
        const packages = offerings.current.availablePackages;
        if (packages && packages.length > 0) {
          addTestResult('Info', `Available packages: ${packages.map(pkg => pkg.product.identifier).join(', ')}`);
        } else {
          addTestResult('Warning', 'No packages available in the current offering');
        }
      } else {
        addTestResult('Warning', 'No current offering available');
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
      addTestResult('Error', `Failed to fetch offerings: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetProducts = async () => {
    try {
      setIsLoading(true);
      addTestResult('Action', 'Fetching individual products');
      
      const productIds = ['shira_pro_weekly', 'shira_pro_monthly', 'shira_pro_annual'];
      addTestResult('Info', `Attempting to fetch products: ${productIds.join(', ')}`);
      
      const products = await Purchases.getProducts(productIds);
      
      if (products && products.length > 0) {
        addTestResult('Success', `Products fetched successfully: ${products.map(p => p.identifier).join(', ')}`);
      } else {
        addTestResult('Warning', 'No products could be fetched');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      addTestResult('Error', `Failed to fetch products: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'RevenueCat Test' }} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          {userLoading ? (
            <ActivityIndicator size="small" color="#5a51e1" />
          ) : user ? (
            <View>
              <Text style={styles.infoText}>User ID: {user.id}</Text>
              <Text style={styles.infoText}>Email: {user.email}</Text>
            </View>
          ) : (
            <Text style={styles.warningText}>No user logged in</Text>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RevenueCat Customer Info</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#5a51e1" />
          ) : customerInfo ? (
            <View>
              <Text style={styles.infoText}>RevenueCat User ID: {customerInfo.originalAppUserId}</Text>
              <Text style={styles.infoText}>Is Anonymous: {customerInfo.originalAppUserId?.startsWith('$RCAnonymousID:') ? 'Yes' : 'No'}</Text>
              <Text style={styles.infoText}>Active Entitlements: {
                Object.keys(customerInfo.entitlements.active).length > 0 
                  ? Object.keys(customerInfo.entitlements.active).join(', ') 
                  : 'None'
              }</Text>
            </View>
          ) : (
            <Text style={styles.warningText}>No customer info available</Text>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleIdentifyUser}
            disabled={isLoading || !user}
          >
            <Text style={styles.buttonText}>Identify User</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handlePresentPaywall}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Present Paywall</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handlePresentPaywallIfNeeded}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Present Paywall If Needed</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRestorePurchases}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Restore Purchases</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleGetOfferings}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Get Offerings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleGetProducts}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Get Products</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={loadCustomerInfo}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Refresh Customer Info</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.length === 0 ? (
            <Text style={styles.infoText}>No test results yet</Text>
          ) : (
            testResults.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <Text style={[
                  styles.resultText,
                  result.type === 'Error' ? styles.errorText : 
                  result.type === 'Success' ? styles.successText :
                  result.type === 'Warning' ? styles.warningText :
                  styles.infoText
                ]}>
                  [{formatTime(result.timestamp)}] {result.type}: {result.result}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5a51e1" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#e6c02a',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#e15151',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#51e1a2',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#5a51e1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  resultItem: {
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    lineHeight: 18,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 