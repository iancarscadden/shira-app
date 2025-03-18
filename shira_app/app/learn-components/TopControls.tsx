import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { TopControlsProps } from './types';

// Import SVG components
// @ts-ignore
import QuestionIcon from '../components/question.svg';
// @ts-ignore
import SettingsIcon from '../components/settings.svg';

const TopControls: React.FC<TopControlsProps> = ({
    onInstructionsOpen,
    onSettingsOpen,
    showControls,
    topPosition,
}) => {
    if (!showControls) return null;

    return (
        <>
            <View style={[styles.questionButton, { top: topPosition }]}>
                <TouchableOpacity 
                    onPress={onInstructionsOpen}
                    style={styles.iconTouchable}
                >
                    <QuestionIcon width={24} height={24} stroke="#181818" />
                </TouchableOpacity>
            </View>

            <View style={[styles.settingsButton, { top: topPosition }]}>
                <TouchableOpacity 
                    onPress={onSettingsOpen}
                    style={styles.iconContainer}
                >
                    <SettingsIcon 
                        width={24} 
                        height={24} 
                        style={styles.iconGlow}
                    />
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    questionButton: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 10,
    },
    settingsButton: {
        position: 'absolute',
        right: 20,
        zIndex: 10,
    },
    iconTouchable: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    iconContainer: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconGlow: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
});

export default TopControls; 