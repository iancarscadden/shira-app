// app/views/CulturalView.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CulturalData, CulturalBox } from '../../supabase/types';
import DotIndicator from '../components/DotIndicator';

interface CulturalViewProps {
    culturalData: CulturalData | null;
}

const CulturalView: React.FC<CulturalViewProps> = ({ culturalData }) => {
    const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);

    if (!culturalData) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Loading...</Text>
            </View>
        );
    }

    const handleTap = (index: number) => {
        setRevealed((prev) => {
            const newStates = [...prev];
            newStates[index] = !newStates[index];
            return newStates;
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{culturalData.title}</Text>
            <Text style={styles.subtitle}>Tap to find out!</Text>

            {culturalData.boxes.map((box: CulturalBox, i: number) => {
                const isOpen = revealed[i];
                let outlineColor = '#999';
                let bgColor = 'rgba(255,255,255,0.1)';

                if (isOpen) {
                    outlineColor = '#5A51E1';
                    bgColor = 'rgba(90,81,225,0.2)';
                }

                return (
                    <TouchableOpacity
                        key={i}
                        style={[styles.box, { borderColor: outlineColor, backgroundColor: bgColor }]}
                        onPress={() => handleTap(i)}
                    >
                        {!isOpen ? (
                            <Text style={styles.boxTitle}>{box.label}</Text>
                        ) : (
                            <Text style={styles.boxContent}>{box.blurb}</Text>
                        )}
                    </TouchableOpacity>
                );
            })}

            {/* Dot Indicator (replaces swipe indicator) */}
            <DotIndicator totalDots={4} activeDotIndex={1} />
        </View>
    );
};

export default CulturalView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
        padding: 12,            // slightly smaller padding
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,          // reduced from 18
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 4,       // smaller vertical spacing
    },
    subtitle: {
        fontSize: 12,          // reduced from 14
        color: '#ccc',
        marginBottom: 16,
        textAlign: 'center',
    },
    box: {
        width: '85%',          // shrunk from 90%
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 10,           // slightly smaller padding
        marginVertical: 6,     // smaller margin
    },
    boxTitle: {
        fontWeight: 'bold',
        fontSize: 13,          // smaller than 14
        color: '#fff',
    },
    boxContent: {
        fontSize: 12,          // smaller than 13
        color: '#fff',
        lineHeight: 16,        // slightly tighter
    },
});
