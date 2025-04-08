// app/views/SettingsView.tsx

import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';

interface SettingsViewProps {
    visible: boolean;                // from parent
    onClose: () => void;            // called once close animation finishes
    keyPhraseReplay: 'off' | 'once';
    onSetKeyPhraseReplay?: (mode: 'off' | 'once') => void;  // Make this optional
}

const screenHeight = Dimensions.get('window').height;

const SPEED_OPTIONS = [0.5, 0.75, 1.0];

const SettingsView: React.FC<SettingsViewProps> = ({
                                                       visible,
                                                       onClose,
                                                       keyPhraseReplay,
                                                       onSetKeyPhraseReplay,
                                                   }) => {
    // If the panel is physically rendered
    const [panelVisible, setPanelVisible] = useState<boolean>(false);
    // If overlay is visible (dark background)
    const [overlayVisible, setOverlayVisible] = useState<boolean>(false);

    // The vertical animated value
    const translateY = useRef(new Animated.Value(screenHeight)).current;

    const openDuration = 200;  // quick open
    const closeDuration = 300; // slower close

    const handleClose = () => {
        // Hide overlay first
        setOverlayVisible(false);

        // Slide panel down
        Animated.timing(translateY, {
            toValue: screenHeight,
            duration: closeDuration,
            useNativeDriver: false,
        }).start(() => {
            setPanelVisible(false);
            onClose();
        });
    };

    useEffect(() => {
        if (visible) {
            setOverlayVisible(true);
            setPanelVisible(true);

            Animated.timing(translateY, {
                toValue: screenHeight * 0.5,
                duration: openDuration,
                useNativeDriver: false,
            }).start();
        } else {
            handleClose();
        }
    }, [visible]);

    if (!panelVisible) {
        // Panel not mounted => no render
        return null;
    }

    return (
        <View style={styles.overlayContainer}>
            {/* Dark overlay => invisible if overlayVisible = false */}
            <Pressable
                style={[
                    styles.darkOverlay,
                    { backgroundColor: overlayVisible ? 'rgba(0,0,0,0.6)' : 'transparent' },
                ]}
                onPress={handleClose}
            />

            <Animated.View style={[styles.panel, { top: translateY }]}>
                {/* Title only (no X button) */}
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Settings</Text>
                </View>

                {/* Key Phrase Replay */}
                <Text style={styles.subtitle}>Key Phrase Replay</Text>
                <View style={styles.optionsRow}>
                    {["Off", "Once"].map(label => {
                        const mode = label.toLowerCase() as 'off' | 'once';
                        const selected = keyPhraseReplay === mode;
                        return (
                            <Pressable
                                key={label}
                                style={[
                                    styles.optionBox,
                                    selected && styles.optionBoxSelected
                                ]}
                                onPress={() => onSetKeyPhraseReplay?.(mode)}
                            >
                                <Text style={[
                                    styles.optionText,
                                    selected && styles.optionTextSelected
                                ]}>
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

            </Animated.View>
        </View>
    );
};

export default SettingsView;

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
    },
    darkOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    panel: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: '#242424',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
    },
    headerRow: {
        marginBottom: 12,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginTop: 10,
        marginBottom: 6,
    },
    optionsRow: {
        flexDirection: 'row',
        marginBottom: 12,
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    optionBox: {
        width: '45%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    optionBoxSelected: {
        backgroundColor: '#5A51E1',
        borderColor: '#5A51E1',
    },
    optionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    optionTextSelected: {
        color: '#fff',
    },
});
