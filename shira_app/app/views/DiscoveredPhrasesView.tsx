import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    TouchableOpacity, 
    ScrollView, 
    StatusBar,
    Dimensions,
    Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Define color constants
const COLORS = {
    primary: '#5a51e1', // Purple
    secondary: '#e15190', // Pink
    tertiary: '#51e1a2', // Teal
    accent: '#c4cc45', // Yellow
    background: '#181818', // Dark background
    cardBg: 'rgba(30, 30, 30, 0.8)', // Card background
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
};

// Dummy discovered phrases data
const DUMMY_PHRASES = [
    { id: '1', phrase: '¿Cómo estás?', translation: 'How are you?', category: 'Greetings' },
    { id: '2', phrase: 'Buenos días', translation: 'Good morning', category: 'Greetings' },
    { id: '3', phrase: 'Mucho gusto', translation: 'Nice to meet you', category: 'Greetings' },
    { id: '4', phrase: 'Me llamo...', translation: 'My name is...', category: 'Introduction' },
    { id: '5', phrase: '¿Dónde está el baño?', translation: 'Where is the bathroom?', category: 'Questions' },
    { id: '6', phrase: 'La cuenta, por favor', translation: 'The bill, please', category: 'Restaurant' },
    { id: '7', phrase: 'No entiendo', translation: 'I don\'t understand', category: 'Communication' },
    { id: '8', phrase: '¿Qué hora es?', translation: 'What time is it?', category: 'Questions' },
    { id: '9', phrase: 'Necesito ayuda', translation: 'I need help', category: 'Emergency' },
    { id: '10', phrase: 'Hasta luego', translation: 'See you later', category: 'Farewells' },
    { id: '11', phrase: 'Tengo hambre', translation: 'I\'m hungry', category: 'Feelings' },
    { id: '12', phrase: '¿Cuánto cuesta?', translation: 'How much does it cost?', category: 'Shopping' },
];

const DiscoveredPhrasesView: React.FC = () => {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Filter phrases by category if one is selected
    const filteredPhrases = selectedCategory 
        ? DUMMY_PHRASES.filter(phrase => phrase.category === selectedCategory)
        : DUMMY_PHRASES;

    // Get unique categories for the filter buttons
    const categories = [...new Set(DUMMY_PHRASES.map(phrase => phrase.category))];

    const handleBackPress = () => {
        router.back();
    };

    // Render category filter buttons
    const renderCategoryFilters = () => {
        return (
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryFiltersContainer}
            >
                <TouchableOpacity
                    style={[
                        styles.categoryButton,
                        selectedCategory === null && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedCategory(null)}
                >
                    <Text style={[
                        styles.categoryButtonText,
                        selectedCategory === null && styles.selectedCategoryButtonText
                    ]}>
                        All
                    </Text>
                </TouchableOpacity>
                
                {categories.map(category => (
                    <TouchableOpacity
                        key={category}
                        style={[
                            styles.categoryButton,
                            selectedCategory === category && styles.selectedCategoryButton
                        ]}
                        onPress={() => setSelectedCategory(category)}
                    >
                        <Text style={[
                            styles.categoryButtonText,
                            selectedCategory === category && styles.selectedCategoryButtonText
                        ]}>
                            {category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#181818" />
            
            {/* Header with gradient background */}
            <LinearGradient
                colors={['rgba(24, 24, 24, 0.95)', 'rgba(24, 24, 24, 0.7)', 'rgba(24, 24, 24, 0)']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={handleBackPress}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>DISCOVERED PHRASES</Text>
                    <View style={styles.placeholderView} />
                </View>
            </LinearGradient>
            
            {/* Main content */}
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info card */}
                <BlurView intensity={20} tint="dark" style={styles.infoCard}>
                    <LinearGradient
                        colors={['rgba(90, 81, 225, 0.6)', 'rgba(225, 81, 144, 0.4)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.infoCardGradient}
                    >
                        <View style={styles.infoCardContent}>
                            <View style={styles.infoIconContainer}>
                                <MaterialCommunityIcons name="text-box-multiple" size={28} color="#FFFFFF" />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoTitle}>Practice Your Phrases</Text>
                                <Text style={styles.infoDescription}>
                                    You've discovered {DUMMY_PHRASES.length} phrases so far. Practice them to improve your speaking skills.
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </BlurView>
                
                {/* Category filters */}
                {renderCategoryFilters()}
                
                {/* Phrases list */}
                <View style={styles.phrasesListContainer}>
                    {filteredPhrases.map((phrase) => (
                        <TouchableOpacity 
                            key={phrase.id}
                            style={styles.phraseItem}
                            activeOpacity={0.7}
                        >
                            <BlurView intensity={15} tint="dark" style={styles.phraseItemBlur}>
                                <View style={styles.phraseTextContainer}>
                                    <Text style={styles.phraseText}>{phrase.phrase}</Text>
                                    <Text style={styles.phraseTranslation}>{phrase.translation}</Text>
                                </View>
                                <View style={styles.phraseIconContainer}>
                                    <Ionicons 
                                        name="volume-high" 
                                        size={20} 
                                        color="rgba(255, 255, 255, 0.7)" 
                                    />
                                </View>
                            </BlurView>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerGradient: {
        paddingTop: 10,
        paddingBottom: 20,
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 1,
    },
    placeholderView: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingHorizontal: 16,
        paddingBottom: 30,
    },
    infoCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    infoCardGradient: {
        width: '100%',
    },
    infoCardContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    infoIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(90, 81, 225, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    infoDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    categoryFiltersContainer: {
        flexDirection: 'row',
        paddingBottom: 12,
        paddingLeft: 4,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    selectedCategoryButton: {
        backgroundColor: 'rgba(90, 81, 225, 0.2)',
        borderColor: 'rgba(90, 81, 225, 0.6)',
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    selectedCategoryButtonText: {
        color: COLORS.primary,
    },
    phrasesListContainer: {
        marginTop: 10,
    },
    phraseItem: {
        marginBottom: 10,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    phraseItemBlur: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    phraseTextContainer: {
        flex: 1,
    },
    phraseText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    phraseTranslation: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    phraseIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(59, 59, 61, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});

export default DiscoveredPhrasesView;
