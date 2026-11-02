import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logger } from '../services/logger';
import { fontSize, msFont } from '../theme';
// Class component — no useTheme(); the error screen is a fixed dark surface, so the static palette is fine.
import { lightColors } from '../theme/colors';
import i18n from '../i18n';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('general', 'Unhandled render error caught by ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>{i18n.t('errorBoundary.title')}</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? i18n.t('errorBoundary.message')}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>{i18n.t('common.tryAgain')}</Text>
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
    padding: 24,
    backgroundColor: '#111827',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 8,
  },
  message: {
    fontSize: fontSize.md,
    color: lightColors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: lightColors.primary,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: msFont(15),
    fontWeight: '600',
    color: lightColors.onPrimary,
  },
});
