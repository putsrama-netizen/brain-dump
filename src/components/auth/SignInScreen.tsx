import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { PaperGrain } from '../ui/PaperGrain';
import { HandDrawnUnderline } from '../ui/HandDrawnUnderline';
import {
  signInWithEmail,
  signUpWithEmail,
} from '../../lib/supabase';

type Mode = 'signIn' | 'signUp';

// Supabase's PostgrestError / AuthError are plain objects — pull the .message.
function formatAuthError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null) {
    const obj = e as Record<string, unknown>;
    const msg = obj.message ?? obj.error_description ?? obj.error;
    if (typeof msg === 'string') return msg;
    try {
      return JSON.stringify(e);
    } catch {
      /* noop */
    }
  }
  return String(e);
}

export function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    !submitting && email.trim().length > 0 && password.length > 0;

  const switchMode = () => {
    setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'));
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === 'signUp') {
        const { session } = await signUpWithEmail(email.trim(), password);
        if (!session) {
          // Email confirmation is on in Supabase — no session yet.
          setInfo(
            'Almost there. Check your inbox for a confirmation link, then come back and sign in.',
          );
        }
        // If session was returned (confirmation off), the auth listener
        // in _layout.tsx swaps to the app automatically.
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'signIn' ? 'Welcome back' : 'Create your account';
  const submitLabel = mode === 'signIn' ? 'Sign in' : 'Create account';
  const switchPrompt =
    mode === 'signIn'
      ? 'Need an account? Sign up'
      : 'Already have an account? Log in';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <PaperGrain>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.body}>
            <View style={styles.card}>
              <Text style={styles.brand}>Brain Dump</Text>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.titleUnderline}>
                <HandDrawnUnderline />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={
                    mode === 'signUp' ? 'new-password' : 'current-password'
                  }
                  textContentType={
                    mode === 'signUp' ? 'newPassword' : 'password'
                  }
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  !canSubmit && styles.submitBtnDisabled,
                  pressed && styles.submitBtnPressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.submitText}>
                  {submitting ? 'One moment…' : submitLabel}
                </Text>
              </Pressable>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {info ? <Text style={styles.infoText}>{info}</Text> : null}

              <Pressable
                onPress={switchMode}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.switchBtn,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.switchText}>{switchPrompt}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </PaperGrain>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.paper },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  brand: {
    ...typography.display,
    fontSize: 22,
    color: colors.text,
  },
  title: {
    ...typography.title,
    fontStyle: 'italic',
    color: colors.text,
  },
  titleUnderline: {
    width: 120,
    marginBottom: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  input: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.slate,
    alignItems: 'center',
  },
  submitBtnPressed: { opacity: 0.85 },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: {
    ...typography.body,
    color: colors.paper,
    fontWeight: '600',
  },
  errorText: {
    ...typography.body,
    fontSize: 13,
    color: '#9A3A1F',
    paddingVertical: spacing.xs,
    fontStyle: 'italic',
  },
  infoText: {
    ...typography.body,
    fontSize: 13,
    color: colors.text,
    paddingVertical: spacing.xs,
    fontStyle: 'italic',
  },
  switchBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  switchText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
});
