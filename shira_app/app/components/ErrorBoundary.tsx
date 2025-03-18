import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error('Error caught by boundary:', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>Something went wrong.</Text>
                    <TouchableOpacity onPress={() => this.setState({ hasError: false })}>
                        <Text>Try again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 