import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

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

    return (
        <View style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.systemBubble
        ]}>
            <View style={styles.container}>
                {[0, 1, 2].map((_, index) => (
                    <Animated.View
                        key={index}
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
        borderRadius: 16,
        marginVertical: 4,
    },
    userBubble: {
        backgroundColor: '#5A51E1',
        alignSelf: 'flex-end',
    },
    systemBubble: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'flex-start',
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