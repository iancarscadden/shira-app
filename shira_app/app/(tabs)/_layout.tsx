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

// Define our colors
const PURPLE_COLOR = '#5a51e1';
const GRAY_COLOR = '#888888';

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
                            withSpring(1, {
                                damping: 12,
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

        const iconColor = focused ? PURPLE_COLOR : GRAY_COLOR;
        
        return (
            <Pressable onPress={onPress} style={styles.tabButton}>
                <Animated.View style={[styles.iconWrapper, animatedStyle]}>
                    <FontAwesome5
                        name={iconName}
                        size={24}
                        color={iconColor}
                        solid
                    />
                    <Text style={[
                        styles.tabLabel,
                        { color: iconColor }
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#181818',
        height: 85,
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(100, 100, 100, 0.3)',
        elevation: 0,
        paddingBottom: 25,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 0,
        marginTop: -5,
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingTop: 8,
    },
    tabLabel: {
        marginTop: 4,
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        width: '100%',
    }
});
