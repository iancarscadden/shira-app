// app/(tabs)/_layout.tsx

import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { 
    useAnimatedStyle, 
    withSpring,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Define our colors
const PURPLE_COLOR = '#5a51e1';
const PINK_COLOR = '#e15190';
const GRAY_COLOR = 'rgba(255, 255, 255, 0.5)';
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.35)';

const TabsLayout = () => {
    const TabIcon = ({ 
        iconName, 
        label, 
        focused,
        onPress 
    }: { 
        iconName: string; 
        label: string; 
        focused: boolean;
        onPress: () => void;
    }) => {
        const animatedStyle = useAnimatedStyle(() => {
            return {
                transform: [{
                    scale: focused 
                        ? withSequence(
                            withTiming(0.9, { duration: 100 }),
                            withSpring(1.05, {
                                damping: 15,
                                stiffness: 200
                            })
                        )
                        : withSpring(1, {
                            damping: 12,
                            stiffness: 200
                        })
                }]
            };
        });

        return (
            <Pressable onPress={onPress} style={styles.tabButton}>
                <Animated.View style={[styles.iconWrapper, animatedStyle]}>
                    {focused ? (
                        <View style={styles.iconContainer}>
                            <LinearGradient
                                colors={[PURPLE_COLOR, PINK_COLOR]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradientIconBackground}
                            />
                            <FontAwesome5
                                name={iconName}
                                size={20}
                                color="#FFFFFF"
                                solid
                                style={[
                                    styles.tabIcon,
                                    iconName === "play" ? styles.playIcon : null
                                ]}
                            />
                        </View>
                    ) : (
                        <View style={styles.inactiveIconContainer}>
                            <FontAwesome5
                                name={iconName}
                                size={20}
                                color={INACTIVE_COLOR}
                                solid
                                style={[
                                    styles.tabIcon,
                                    iconName === "play" ? styles.playIcon : null
                                ]}
                            />
                        </View>
                    )}
                    <Text style={[
                        styles.tabLabel,
                        focused ? styles.activeTabLabel : styles.inactiveTabLabel
                    ]}>
                        {label}
                    </Text>
                </Animated.View>
            </Pressable>
        );
    };

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    display: 'none'
                }
            }}
            tabBar={({ state, navigation }) => (
                <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
                    <View style={styles.tabBar}>
                        <TabIcon 
                            iconName="trophy"
                            label="Progress"
                            focused={state.index === 0}
                            onPress={() => navigation.navigate('progress')}
                        />
                        <TabIcon 
                            iconName="play"
                            label="Watch"
                            focused={state.index === 1}
                            onPress={() => navigation.navigate('learn')}
                        />
                        <TabIcon 
                            iconName="user"
                            label="Profile"
                            focused={state.index === 2}
                            onPress={() => navigation.navigate('profile')}
                        />
                    </View>
                </BlurView>
            )}
        >
            <Tabs.Screen name="progress" />
            <Tabs.Screen name="learn" />
            <Tabs.Screen name="profile" />
        </Tabs>
    );
};

export default TabsLayout;

const styles = StyleSheet.create({
    blurContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(24, 24, 24, 0.7)',
        height: 80,
        justifyContent: 'space-around',
        alignItems: 'center',
        elevation: 0,
        paddingBottom: 22,
        paddingTop: 8,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 0,
        marginTop: 0,
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingTop: 4,
        height: 58,
    },
    iconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PURPLE_COLOR,
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 2,
    },
    gradientIconBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 19,
        opacity: 0.9,
    },
    inactiveIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 2,
    },
    tabIcon: {
        zIndex: 1,
    },
    playIcon: {
        marginLeft: 2,
    },
    tabLabel: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
        letterSpacing: 0.3,
    },
    activeTabLabel: {
        color: GRAY_COLOR,
        opacity: 1,
    },
    inactiveTabLabel: {
        color: INACTIVE_COLOR,
        opacity: 0.8,
    }
});
