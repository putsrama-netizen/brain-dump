import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { ensureAnonSession } from '../src/lib/supabase';
import { maybeImportLocalData } from '../src/lib/migrate';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';

SplashScreen.preventAutoHideAsync().catch(() => {});

// On web, center the app in a phone-sized container so it doesn't sprawl
// across desktop browsers. Below the breakpoint we render full-width.
function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const constrained = Platform.OS === 'web' && width > 600;
  if (!constrained) {
    return <View style={styles.fullScreen}>{children}</View>;
  }
  return (
    <View style={styles.frameOuter}>
      <View style={styles.frameInner}>{children}</View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });
  const [bootDone, setBootDone] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await ensureAnonSession();
        await maybeImportLocalData();
        setBootDone(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setBootError(msg);
        console.error('[bootstrap]', msg);
      }
    })();
  }, []);

  useEffect(() => {
    const fontsReady = fontsLoaded || !!fontError;
    const bootReady = bootDone || !!bootError;
    if (fontsReady && bootReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, bootDone, bootError]);

  if (bootError) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Brain Dump couldn&apos;t start.</Text>
        <Text style={styles.errorBody}>{bootError}</Text>
      </View>
    );
  }

  if (!(fontsLoaded || fontError) || !bootDone) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <PhoneFrame>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="note/[id]"
              options={{ presentation: 'modal' }}
            />
          </Stack>
        </PhoneFrame>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  frameOuter: {
    flex: 1,
    backgroundColor: '#E8E5DE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  frameInner: {
    width: '100%',
    maxWidth: 414,
    flex: 1,
    maxHeight: 896,
    backgroundColor: colors.paper,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.08)',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  errorBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
