import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/supabase/supabaseClient';
import { getUserMasteredPhrases, MasteredPhrase } from '@/supabase/progressService';
import PracticeCard from './PracticeCard';

interface MasteredViewProps {
    onBack: () => void;
}

const MasteredView: React.FC<MasteredViewProps> = ({ onBack }) => {
    const router = useRouter();
    const [masteredPhrases, setMasteredPhrases] = useState<MasteredPhrase[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedPhrase, setSelectedPhrase] = useState<MasteredPhrase | null>(null);
    const [showPracticeCard, setShowPracticeCard] = useState(false);

    // Fetch user ID and phrases
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                
                // Get current user
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    console.error('No user session found');
                    setLoading(false);
                    return;
                }
                
                setUserId(session.user.id);
                
                // Get mastered phrases
                const phrases = await getUserMasteredPhrases(session.user.id);
                setMasteredPhrases(phrases);
            } catch (error) {
                console.error('Error fetching mastered phrases:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchUserData();
    }, []);

    const handlePhrasePress = (phrase: MasteredPhrase) => {
        setSelectedPhrase(phrase);
        setShowPracticeCard(true);
    };

    const handleClosePracticeCard = () => {
        setShowPracticeCard(false);
        setSelectedPhrase(null);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Back button */}
                <TouchableOpacity 
                    style={styles.backButtonContainer} 
                    onPress={onBack}
                >
                    <View style={styles.backButtonGradient}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>
                
                {/* Title and subtitle */}
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Phrases you've mastered</Text>
                    <Text style={styles.subtitle}>
                        Great job! These are the phrases you've successfully mastered. Touch to practice.
                    </Text>
                </View>

                {/* Scrollable list of phrases */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6C63E0" />
                        <Text style={styles.loadingText}>Loading your mastered phrases...</Text>
                    </View>
                ) : masteredPhrases.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="trophy-outline" size={64} color="#6C63E0" />
                        <Text style={styles.emptyText}>
                            You haven't mastered any phrases yet
                        </Text>
                        <Text style={styles.emptySubtext}>
                            Practice phrases in the Video Quiz to master them.
                        </Text>
                    </View>
                ) : (
                    <ScrollView 
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {masteredPhrases.map((phrase, index) => (
                            <TouchableOpacity 
                                key={phrase.id || index}
                                style={styles.phraseBox}
                                onPress={() => handlePhrasePress(phrase)}
                            >
                                <View style={styles.phraseContent}>
                                    <Text style={styles.phraseText}>"{phrase.target_phrase}"</Text>
                                    <Text style={styles.masteredDate}>
                                        Mastered: {new Date(phrase.mastered_at || '').toLocaleDateString()}
                                    </Text>
                                </View>
                                <Ionicons name="checkmark-circle" size={24} color="#6C63E0" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Practice Card Modal */}
            {selectedPhrase && (
                <PracticeCard
                    visible={showPracticeCard}
                    onClose={handleClosePracticeCard}
                    phrase={selectedPhrase}
                    isFromMasteredView={true}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#181818',
    },
    container: {
        flex: 1,
        padding: 20,
    },
    backButtonContainer: {
        alignSelf: 'flex-start',
        marginBottom: 24,
    },
    backButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#5A51E1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    textContainer: {
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 20,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    phraseBox: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    phraseContent: {
        flex: 1,
        marginRight: 8,
    },
    phraseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    masteredDate: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 16,
    },
    emptySubtext: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
});

export default MasteredView; 