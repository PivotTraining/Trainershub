import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing, typography } from '@/lib/theme';

interface Props {
  children: ReactNode;
  /** Optional context label shown in the error card, e.g. "Clients screen" */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          {this.props.label ? (
            <Text style={styles.label}>{this.props.label}</Text>
          ) : null}
          <Text style={styles.message} numberOfLines={4}>
            {this.state.error.message}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  icon: { fontSize: 40, marginBottom: spacing.md },
  title: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.inkSoft,
    textAlign: 'center',
  },
  label: {
    fontSize: typography.sm,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sm,
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
    fontFamily: 'Courier',
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: 8,
  },
  buttonText: { color: colors.white, fontWeight: '600' },
});
