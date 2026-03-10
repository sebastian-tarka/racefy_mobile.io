import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

const ONLINE_DISMISS_DELAY = 2500;
const BAR_CONTENT_HEIGHT = 32;

export function NetworkStatusBar() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [isOnline, setIsOnline] = useState(true);
  const [visible, setVisible] = useState(false);

  const translateY = useRef(new Animated.Value(-120)).current;
  const wasOfflineRef = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideIn = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  };

  const slideOut = (callback?: () => void) => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 280,
      useNativeDriver: true,
    }).start(() => callback?.());
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;

      if (!online && !wasOfflineRef.current) {
        wasOfflineRef.current = true;
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        setIsOnline(false);
        setVisible(true);
        slideIn();
      } else if (online && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setIsOnline(true);
        dismissTimer.current = setTimeout(() => {
          slideOut(() => setVisible(false));
        }, ONLINE_DISMISS_DELAY);
      }
    });

    return () => {
      unsubscribe();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!visible) return null;

  const barColor = isOnline ? colors.success : colors.error;
  const iconName = isOnline ? 'wifi' : 'cloud-offline-outline';
  const message = isOnline ? t('network.backOnline') : t('network.offline');

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: barColor,
          paddingTop: insets.top + 8,
          height: insets.top + BAR_CONTENT_HEIGHT,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons name={iconName} size={14} color={colors.white} />
      <Text style={[styles.text, { color: colors.white }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 8,
    gap: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});