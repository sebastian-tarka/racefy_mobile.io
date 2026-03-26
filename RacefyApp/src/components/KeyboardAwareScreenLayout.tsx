import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme';

interface KeyboardAwareScreenLayoutProps {
  children: React.ReactNode;
  bottomContent?: React.ReactNode;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboardVerticalOffset?: { ios: number; android: number };
  scrollViewProps?: Omit<ScrollViewProps, 'refreshControl' | 'keyboardShouldPersistTaps'>;
}

export function KeyboardAwareScreenLayout({
  children,
  bottomContent,
  scrollViewRef,
  refreshing,
  onRefresh,
  keyboardVerticalOffset = { ios: 90, android: 0 },
  scrollViewProps,
}: KeyboardAwareScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={
        Platform.OS === 'ios'
          ? keyboardVerticalOffset.ios
          : keyboardVerticalOffset.android
      }
    >
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        {...(onRefresh && {
          refreshControl: (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
            />
          ),
        })}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
      {bottomContent && (
        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.xs }}>
          {bottomContent}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
});
