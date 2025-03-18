import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Import components
import TabBar from './TabBar';
import SidebarView from './SidebarView';
import BookmarkIcon from '../components/bookmark.svg';

const SavedView: React.FC = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [currentTab, setCurrentTab] = useState<'explore' | 'saved'>('saved');

    const handleTabChange = (tab: 'explore' | 'saved') => {
        setCurrentTab(tab);
        if (tab === 'explore') {
            router.back();
        }
    };

    return (
        <View style={styles.container}>
            {/* Tab Navigation */}
            <View style={[styles.tabNavigationContainer, { top: insets.top + 20 }]}>
                <TabBar
                    currentTab={currentTab}
                    onSidebarToggle={() => setIsSidebarVisible(true)}
                />
            </View>

            {/* Content */}
            <View style={[styles.contentContainer, { paddingTop: insets.top + 80 }]}>
                <Text style={styles.text}>Coming Soon!</Text>
                <Text style={styles.subText}>
                    Your saved videos will appear here.
                </Text>
            </View>

            {/* Sidebar */}
            <SidebarView
                visible={isSidebarVisible}
                onClose={() => setIsSidebarVisible(false)}
                currentTab={currentTab}
                onTabChange={handleTabChange}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#181818',
    },
    tabNavigationContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    subText: {
        color: '#888888',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default SavedView;
