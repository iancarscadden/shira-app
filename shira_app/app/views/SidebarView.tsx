import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

// Import SVG components
import WorldIcon from '../components/world.svg';
import BookmarkIcon from '../components/bookmark.svg';

interface SidebarViewProps {
    visible: boolean;
    onClose: () => void;
    currentTab: 'explore' | 'saved';
    onTabChange: (tab: 'explore' | 'saved') => void;
}

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.7;

const SidebarView: React.FC<SidebarViewProps> = ({
    visible,
    onClose,
    currentTab,
    onTabChange,
}) => {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(visible);
    const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setIsVisible(true);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -SIDEBAR_WIDTH,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsVisible(false);
            });
        }
    }, [visible]);

    const handleClose = () => {
        onClose();
    };

    const handleTabPress = (tab: 'explore' | 'saved') => {
        onTabChange(tab);
        if (tab === 'explore') {
            router.push('/learn');
        } else if (tab === 'saved') {
            router.push('/views/SavedView');
        }
        handleClose();
    };

    if (!isVisible) return null;

    return (
        <View style={styles.container}>
            <Animated.View 
                style={[
                    styles.blurOverlay,
                    { opacity: fadeAnim }
                ]}
            >
                <BlurView style={styles.blurContent} intensity={20} tint="dark">
                    <TouchableOpacity 
                        style={styles.dismissArea} 
                        onPress={handleClose} 
                    />
                </BlurView>
            </Animated.View>
            
            <Animated.View 
                style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX: slideAnim }]
                    }
                ]}
            >
                <View style={styles.content}>
                    <TouchableOpacity
                        style={[
                            styles.option,
                            currentTab === 'explore' && styles.selectedOption
                        ]}
                        onPress={() => handleTabPress('explore')}
                    >
                        <WorldIcon
                            width={24}
                            height={24}
                            fill="none"
                            stroke={currentTab === 'explore' ? "#5A51E1" : "#888"}
                            strokeWidth={2}
                        />
                        <Text style={[
                            styles.optionText,
                            currentTab === 'explore' && styles.selectedText
                        ]}>Explore</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.option,
                            currentTab === 'saved' && styles.selectedOption
                        ]}
                        onPress={() => handleTabPress('saved')}
                    >
                        <BookmarkIcon
                            width={24}
                            height={24}
                            fill="none"
                            stroke={currentTab === 'saved' ? "#5A51E1" : "#888"}
                            strokeWidth={2}
                        />
                        <Text style={[
                            styles.optionText,
                            currentTab === 'saved' && styles.selectedText
                        ]}>Saved</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.dragIndicator} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    blurOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    blurContent: {
        flex: 1,
    },
    dismissArea: {
        flex: 1,
    },
    sidebar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: '#181818',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        flex: 1,
        paddingTop: 100,
        paddingHorizontal: 20,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    selectedOption: {
        backgroundColor: 'rgba(90,81,225,0.1)',
    },
    optionText: {
        fontSize: 18,
        color: '#888',
        marginLeft: 16,
        fontWeight: '600',
    },
    selectedText: {
        color: '#5A51E1',
        fontWeight: 'bold',
    },
    dragIndicator: {
        position: 'absolute',
        right: 12,
        top: '55%',
        transform: [{ translateY: -30 }],
        width: 4,
        height: 60,
        backgroundColor: '#666',
        borderRadius: 2,
        opacity: 0.9,
    },
});

export default SidebarView; 