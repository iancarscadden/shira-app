import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

// Import SVG components
import WorldIcon from '../components/world.svg';
import SidebarIcon from '../components/sidebar.svg';

interface TabBarProps {
    currentTab: 'explore' | 'saved';
    onSidebarToggle: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
    currentTab,
    onSidebarToggle,
}) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.sidebarButton}
                onPress={onSidebarToggle}
            >
                <SidebarIcon
                    width={24}
                    height={24}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                />
            </TouchableOpacity>

            <View style={styles.tabButton}>
                <Text style={styles.tabText}>
                    {currentTab === 'explore' ? 'Explore' : 'Saved'}
                </Text>
                {currentTab === 'explore' && (
                    <WorldIcon
                        width={24}
                        height={24}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
        paddingHorizontal: 20,
    },
    sidebarButton: {
        position: 'absolute',
        left: 20,
        padding: 8,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 22,
        color: '#FFFFFF',
        marginRight: 12,
        fontWeight: '600',
    },
});

export default TabBar; 