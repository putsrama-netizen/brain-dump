import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
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
import { useSession } from '../src/lib/supabase';
import { maybeImportLocalData } from '../src/lib/migrate';
import { SignInScreen } from '../src/components/auth/SignInScreen';
import { colors } from '../src/theme/colors';
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
  const session = useSession();

  // Run the one-shot SQLite→Supabase migration the first time a user is
  // authenticated (any auth method). Idempotent via the AsyncStorage flag
  // inside the function — repeated calls do nothing.
  useEffect(() => {
    if (session && session !== 'loading') {
      maybeImportLocalData().catch((e) => {
        console.error('[migrate]', e);
      });
    }
  }, [session]);

  // Hide splash once both fonts and the initial session check are settled.
  useEffect(() => {
    const fontsReady = fontsLoaded || !!fontError;
    const authReady = session !== 'loading';
    if (fontsReady && authReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, session]);

  if (!(fontsLoaded || fontError) || session === 'loading') return null;

  // No session → render the sign-in screen full-frame, no Stack navigator.
  if (!session) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <PhoneFrame>
            <SignInScreen />
          </PhoneFrame>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
});
