import React, { useState, useEffect } from 'react';
import { 
    Modal, 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Dimensions 
} from 'react-native';
import { BlurView } from 'expo-blur';
import TranslateIcon from '../components/translate.svg';

interface InstructionsViewProps {
    visible: boolean;
    onClose: () => void;
}

const InstructionsView: React.FC<InstructionsViewProps> = ({ visible, onClose }) => {
    const [step, setStep] = useState(1);
    const totalSteps = 2;

    // Reset step when modal is opened
    useEffect(() => {
        if (visible) {
            setStep(1);
        }
    }, [visible]);

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
        >
            <BlurView intensity={40} style={styles.container} tint="dark">
                <View style={styles.modal}>
                    {step === 1 ? (
                        <View style={styles.content}>
                            <Text style={styles.title}>Learn Through Short Form Content</Text>
                            <View style={styles.instructionContainer}>
                                <Text style={styles.instruction}>
                                    Start by watching the video, keep an eye out for the{' '}
                                    <Text style={styles.highlight}>key phrase</Text>!
                                </Text>
                                <View style={styles.iconContainer}>
                                    <TranslateIcon width={24} height={24} fill="#fff" />
                                    <Text style={styles.iconText}>
                                        to switch between Spanish and English captions
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                style={styles.button} 
                                onPress={handleNext}
                            >
                                <Text style={styles.buttonText}>Next</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.content}>
                            <Text style={styles.title}>Complete the Activities</Text>
                            <Text style={styles.instruction}>
                                After you're done with the video, hit "Keep Learning" and complete the activities, 
                                swiping left to go to the next one.
                            </Text>
                            <TouchableOpacity 
                                style={styles.button} 
                                onPress={handleNext}
                            >
                                <Text style={styles.buttonText}>Let's go!</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modal: {
        width: '90%',
        backgroundColor: '#242424',
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    content: {
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    instructionContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    instruction: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 26,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    iconText: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#5A51E1',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    highlight: {
        backgroundColor: 'rgba(255, 255, 0, 0.5)',
        color: '#fff',
        fontWeight: 'bold',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        overflow: 'hidden',
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
});

export default InstructionsView; 