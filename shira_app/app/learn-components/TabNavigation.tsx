import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { TabNavigationProps } from './types';

// Import SVG components
import WorldIcon from '../components/world.svg';
import BookmarkIcon from '../components/bookmark.svg';

const TabNavigation: React.FC<TabNavigationProps> = ({
    activeTab,
    onTabChange,
    topInset,
}) => {
    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: topInset,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.tabButton}
                onPress={() => onTabChange('explore')}
            >
                <Text style={[
                    styles.tabText,
                    activeTab === 'explore' && styles.activeTabText
                ]}>
                    Explore
                </Text>
                <WorldIcon
                    width={24}
                    height={24}
                    fill="none"
                    stroke={activeTab === 'explore' ? "#fff" : "#888"}
                    strokeWidth={2}
                    style={[
                        styles.tabIcon,
                        activeTab === 'explore' && styles.activeTabIcon
                    ]}
                />
            </TouchableOpacity>

            {/* Add vertical divider */}
            <View style={styles.divider} />

            <TouchableOpacity
                style={styles.tabButton}
                onPress={() => onTabChange('saved')}
            >
                <Text style={[
                    styles.tabText,
                    activeTab === 'saved' && styles.activeTabText
                ]}>
                    Saved
                </Text>
                <BookmarkIcon
                    width={24}
                    height={24}
                    fill="none"
                    stroke={activeTab === 'saved' ? "#fff" : "#888"}
                    strokeWidth={2}
                    style={[
                        styles.tabIcon,
                        activeTab === 'saved' && styles.activeTabIcon
                    ]}
                />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        zIndex: 2,
        marginTop: 20,
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '50%',
        paddingHorizontal: 20,
    },
    tabText: {
        fontSize: 22,
        color: '#888',
        marginRight: 12,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
        textShadowColor: '#fff',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
    },
    tabIcon: {
        opacity: 0.6,
        width: 28,
        height: 28,
    },
    activeTabIcon: {
        opacity: 1,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#888',
        position: 'absolute',
        left: '50%',
        transform: [{ translateX: -0.5 }],
    },
});

export default TabNavigation; 