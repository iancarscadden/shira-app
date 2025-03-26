import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface TypingIndicatorProps {
    isTyping: boolean;
    isUser: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping, isUser }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isTyping) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true
                    }),
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true
                    })
                ])
            ).start();
        } else {
            fadeAnim.setValue(0);
        }

        return () => {
            fadeAnim.stopAnimation();
        };
    }, [isTyping]);

    if (!isTyping) return null;

    // Different rendering based on whether it's user or system typing
    if (isUser) {
        return (
            <LinearGradient
                colors={['#5a51e1', '#e15190']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.messageBubble,
                    styles.userBubble,
                ]}
            >
                <View style={styles.container}>
                    {[0, 1, 2].map((dotIndex) => (
                        <Animated.View
                            key={dotIndex}
                            style={[
                                styles.dot,
                                {
                                    opacity: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.3, 1],
                                        extrapolate: 'clamp',
                                    })
                                }
                            ]}
                        />
                    ))}
                </View>
            </LinearGradient>
        );
    }

    // System typing indicator
    return (
        <View style={[
            styles.messageBubble,
            styles.systemBubble
        ]}>
            <View style={styles.container}>
                {[0, 1, 2].map((dotIndex) => (
                    <Animated.View
                        key={dotIndex}
                        style={[
                            styles.dot,
                            {
                                opacity: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.3, 1],
                                    extrapolate: 'clamp',
                                })
                            }
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 18, // Increased to match message bubbles
        marginVertical: 4,
    },
    userBubble: {
        alignSelf: 'flex-end',
        shadowColor: '#5a51e1',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginLeft: 'auto', // Ensure right alignment
    },
    systemBubble: {
        backgroundColor: '#3b3b3d', // Updated to match system message
        alignSelf: 'flex-start',
        marginRight: 'auto', // Ensure left alignment
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginHorizontal: 3,
    },
});

export default TypingIndicator; 