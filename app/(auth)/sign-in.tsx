import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { signInWithOtp, verifyOtp } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

const PREFERRED_ROLE_KEY = '@trainerhub:preferred_role';
type Mode = 'client' | 'trainer';

export default function SignIn() {
  const { colors, accent, spacing, typography, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [stage, setStage] = useState<'email' | 'token'>('email');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>('client');

  // Remember the user's preferred entry side (client vs trainer) across launches
  useEffect(() => {
    AsyncStorage.getItem(PREFERRED_ROLE_KEY).then((v) => {
      if (v === 'trainer' || v === 'client') setMode(v);
    });
  }, []);

  const switchMode = async (m: Mode) => {
    setMode(m);
    await AsyncStorage.setItem(PREFERRED_ROLE_KEY, m);
  };

  const handleSendOtp = async () => {
    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithOtp(email.trim().toLowerCase());
      setStage('token');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      // Surface email rate-limit cleanly: Supabase free-tier capped at ~3/hour.
      if (/rate limit|over.?email|too many/i.test(msg)) {
        Alert.alert(
          'Too many sign-in emails',
          "We've hit the email rate limit for now. Wait a couple minutes and try again — or if you've already received a code recently, just enter it below.",
          [
            { text: 'Enter code', onPress: () => setStage('token') },
            { text: 'OK', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('Sign-in failed', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (token.trim().length < 6) {
      Alert.alert('Invalid code', 'Check the 6-digit code in your email.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyOtp(email.trim().toLowerCase(), token.trim());
    } catch (error: unknown) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const isTrainerMode = mode === 'trainer';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Top bar — role switcher in the top-right per spec */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => switchMode(isTrainerMode ? 'client' : 'trainer')}
          style={[styles.modePill, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}
        >
          <Text style={[styles.modePillText, { color: colors.muted }]}>
            {isTrainerMode ? 'I’m a client →' : 'I’m a trainer →'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={[styles.container, { padding: spacing.lg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Logo size={48} />
          <Text style={[styles.brand, { color: colors.ink, fontSize: typography.display }]}>
            TrainerHub
          </Text>
        </View>
        <Text style={[styles.tagline, { color: colors.ink }]}>
          {isTrainerMode
            ? 'Coach. Track. Get paid.'
            : 'Find the right trainer for what you’re working on.'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {stage === 'email'
            ? `Sign ${isTrainerMode ? 'in to your trainer account' : 'in or create an account'} with your email.`
            : 'Enter the 6-digit code we sent to your email.'}
        </Text>

        {stage === 'email' ? (
          <>
            <TextInput
              style={[styles.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surface }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: accent, borderRadius: radius.md }, submitting && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={[styles.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surface }]}
              placeholder="123456"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              value={token}
              onChangeText={setToken}
              editable={!submitting}
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: accent, borderRadius: radius.md }, submitting && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStage('email')} disabled={submitting}>
              <Text style={[styles.linkText, { color: accent }]}>Use a different email</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.disclaimer, { color: colors.placeholder }]}>
          By continuing you agree that TrainerHub is a marketplace and is{' '}
          <Text style={{ fontWeight: '600' }}>not responsible</Text> for the trainers
          {isTrainerMode ? ' or clients' : ''} you meet through it.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  modePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  modePillText: { fontSize: 12, fontWeight: '600' },
  container: { flex: 1, justifyContent: 'center' },
  brand: { fontWeight: '800', marginBottom: 6 },
  tagline: { fontSize: 18, fontWeight: '700', marginBottom: 8, lineHeight: 24 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { textAlign: 'center', marginTop: 8 },
  disclaimer: { fontSize: 11, marginTop: 24, lineHeight: 16, textAlign: 'center' },
});
