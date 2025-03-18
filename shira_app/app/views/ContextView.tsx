// app/views/ContextView.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import TranslateIcon from '../components/translate.svg';
import { ContextData, Choice } from '../../supabase/types';
import useUser from '../../hooks/useUser';
import DotIndicator from '../components/DotIndicator';

const correctSound = require('../components/correct_sound.mp3');
const wrongSound = require('../components/wrong_sound.mp3');

interface ContextViewProps {
    contextData: ContextData | null;
}

const ContextView: React.FC<ContextViewProps> = ({ contextData }) => {
    const [translated, setTranslated] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const { user } = useUser();

    // If no data, show loading or placeholder
    if (!contextData) {
        return (
            <View style={styles.container}>
                <Text style={styles.keyPhraseLabel}>Loading...</Text>
            </View>
        );
    }

    const playSound = async (isCorrect: boolean) => {
        try {
            const { sound } = await Audio.Sound.createAsync(isCorrect ? correctSound : wrongSound);
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (error) {
            console.warn('Sound playback error:', error);
        }
    };

    const handleChoice = async (index: number) => {
        setSelectedIndex(index);
        const isCorrect = contextData.choices[index].isCorrect;
        await playSound(isCorrect);
        
        // Note: XP and daily videos watched logic is now moved to CompletionView
    };

    return (
        <View style={styles.container}>
            <Text style={styles.keyPhraseLabel}>Key Phrase</Text>

            <View style={styles.titleRow}>
                <Text style={styles.title}>
                    {translated ? contextData.keyPhraseTranslation : contextData.keyPhrase}
                </Text>
                <TouchableOpacity
                    style={styles.translateButton}
                    onPress={() => setTranslated(!translated)}
                >
                    <TranslateIcon 
                        width={20} 
                        height={20} 
                        fill={translated ? "#FFFFFF" : "#888888"} 
                    />
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
                Tap the correct situation where you'd use this phrase
            </Text>

            {contextData.choices.map((choice: Choice, i: number) => {
                const isSelected = selectedIndex === i;
                let outlineColor = '#999';
                let bgColor = 'rgba(255,255,255,0.1)';

                if (isSelected) {
                    outlineColor = choice.isCorrect ? '#0f0' : '#f00';
                    bgColor = choice.isCorrect ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)';
                }

                return (
                    <TouchableOpacity
                        key={i}
                        onPress={() => handleChoice(i)}
                        style={[
                            styles.choiceButton,
                            { borderColor: outlineColor, backgroundColor: bgColor },
                        ]}
                    >
                        <Text style={styles.choiceText}>{choice.text}</Text>
                    </TouchableOpacity>
                );
            })}

            {/* Dot Indicator (replaces swipe indicator) */}
            <DotIndicator totalDots={4} activeDotIndex={0} />
        </View>
    );
};

export default ContextView;

const styles = StyleSheet.create({
    container: {
        flex: 1, // fill the expanded pane
        width: '100%',
        backgroundColor: 'transparent',
        padding: 12,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    keyPhraseLabel: {
        fontSize: 12,
        color: '#eee',
        marginBottom: 3,
        textAlign: 'center',
    },
    titleRow: {
        // We'll center the text, with a position:absolute for the icon
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        position: 'relative',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginHorizontal: 40, // ensures the text is truly centered
    },
    translateButton: {
        // position absolute to the right
        position: 'absolute',
        right: 0,
        top: 0,
        backgroundColor: 'rgba(255,255,255,0.1)',
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: '#ccc',
        marginBottom: 14,
        textAlign: 'center',
    },
    choiceButton: {
        width: '85%',
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 10,
        marginVertical: 6,
    },
    choiceText: {
        fontSize: 13,
        color: '#fff',
        textAlign: 'center',
    },
});
