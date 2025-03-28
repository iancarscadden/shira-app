import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated, Platform } from 'react-native';

// Get the screen dimensions
const { width, height } = Dimensions.get('window');

// The actual dimensions of the splash image (1242 × 2436)
const SPLASH_IMAGE_WIDTH = 1242;
const SPLASH_IMAGE_HEIGHT = 2436;
const SPLASH_IMAGE_RATIO = SPLASH_IMAGE_HEIGHT / SPLASH_IMAGE_WIDTH;

interface CustomSplashScreenProps {
  isVisible: boolean;
}

const CustomSplashScreen: React.FC<CustomSplashScreenProps> = ({ isVisible }) => {
  // Use Animated.Value for opacity
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (!isVisible) {
      // When isVisible turns false, start fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400, // Faster fade duration
        useNativeDriver: true,
      }).start();
    } else {
      // When visible, ensure opacity is 1
      fadeAnim.setValue(1);
    }
  }, [isVisible, fadeAnim]);

  // Calculate the scaled dimensions to maintain aspect ratio in "contain" mode
  // This exactly mimics how the native splash screen displays the image
  const screenRatio = height / width;
  
  let imageWidth, imageHeight;
  
  if (screenRatio > SPLASH_IMAGE_RATIO) {
    // Screen is taller than image ratio - image will be width-constrained
    imageWidth = width;
    imageHeight = width * SPLASH_IMAGE_RATIO;
  } else {
    // Screen is wider than image ratio - image will be height-constrained
    imageHeight = height;
    imageWidth = height / SPLASH_IMAGE_RATIO;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
      pointerEvents={isVisible ? "auto" : "none"}
    >
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/images/splash.png')}
          style={[
            styles.splashImage,
            {
              width: imageWidth,
              height: imageHeight,
            }
          ]}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
    width: width,
    height: height,
    backgroundColor: '#181818', // Match the app.json splash background color
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Prevent image from overflowing container
  },
  splashImage: {
    // Width and height will be dynamically calculated
  },
});

export default CustomSplashScreen; 