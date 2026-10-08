import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Ionicons name="warning-outline" size={56} color="#E74C3C" />
        <Text style={styles.title}>{this.props.fallbackTitle ?? 'Something went wrong'}</Text>
        <Text style={styles.message} numberOfLines={4}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <Pressable style={styles.btn} onPress={this.reset}>
          <Text style={styles.btnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  btn: { backgroundColor: '#0F2952', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
