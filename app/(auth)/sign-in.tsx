/**
 * Sign-in screen — email OTP flow.
 *
 * Visual approach: warm split-screen.
 * - Top ~42% of screen: solid accent colour with logo + tagline in white.
 *   The colour IS the design — no blobs, no gradients needed.
 * - Bottom ~58%: white card with generous rounded top corners slides over
 *   the colour area. Role toggle lives inside the card as a tab row.
 * - Clean, human, Airbnb/Apple Calm inspired.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
type Stage = 'email' | 'token';

// ── Role toggle tab ────────────────────────────────────────────────────────────

interface RoleTabProps {
  mode: Mode;
  onSwitch: (m: Mode) => void;
  accent: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function RoleTab({ mode, onSwitch, accent, colors }: RoleTabProps) {
  return (
    <View style={[tab.wrap, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      <Pressable
        style={[tab.btn, mode === 'client' && { backgroundColor: accent }]}
        onPress={() => onSwitch('client')}
      >
        <Text style={[tab.label, { color: mode === 'client' ? '#fff' : colors.muted }]}>
          I'm a client
        </Text>
      </Pressable>
      <Pressable
        style={[tab.btn, mode === 'trainer' && { backgroundColor: accent }]}
        onPress={() => onSwitch('trainer')}
      >
        <Text style={[tab.label, { color: mode === 'trainer' ? '#fff' : colors.muted }]}>
          I'm a trainer
        </Text>
      </Pressable>
    </View>
  );
}

const tab = StyleSheet.create({
  wrap:  {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 24,
  },
  btn:   {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600' },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function SignIn() {
  const { colors, accent, isDark } = useTheme();
  const router = useRouter();
  const { inviteToken } = useLocalSearchParams<{ inviteToken?: string }>();
  const [email, setEmail]       = useState('');
  const [token, setToken]       = useState('');
  const [stage, setStage]       = useState<Stage>('email');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode]         = useState<Mode>('client');

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
      if (/rate limit|over.?email|too many/i.test(msg)) {
        Alert.alert(
          'Too many sign-in emails',
          "We've hit the email rate limit. Wait a moment and try again — or enter a code you already received.",
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
      // If the user arrived via a corporate invite link, redirect back to accept it
      if (inviteToken) {
        router.replace({ pathname: '/invite', params: { token: inviteToken } });
      }
    } catch (error: unknown) {
      Alert.alert(
        'Verification failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isTrainerMode = mode === 'trainer';

  // Card background adapts to dark mode
  const cardBg = isDark ? colors.surfaceCard : '#FFFFFF';

  return (
    <SafeAreaView style={[s.root, { backgroundColor: accent }]} edges={['top']}>

      {/* ── Colour band — top portion ──────────────────────────── */}
      <View style={s.colorBand}>
        {/* background="none" = just the white chevron mark, no box */}
        <Logo size={52} color="#fff" background="none" />
        <Text style={s.brandName}>TrainerHub</Text>
        <Text style={s.tagline}>
          {isTrainerMode
            ? 'Coach smarter. Get paid faster.'
            : 'Find the trainer who gets it done.'}
        </Text>
      </View>

      {/* ── White card — slides up over colour band ────────────── */}
      <KeyboardAvoidingView
        style={[s.card, { backgroundColor: cardBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Role toggle — inside card */}
        {stage === 'email' && (
          <RoleTab mode={mode} onSwitch={switchMode} accent={accent} colors={colors} />
        )}

        {stage === 'email' ? (
          <>
            <Text style={[s.formLabel, { color: colors.muted }]}>Email address</Text>
            <TextInput
              style={[s.input, {
                borderColor: colors.borderInput,
                color: colors.ink,
                backgroundColor: colors.background,
              }]}
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
              style={[s.btn, { backgroundColor: accent }, submitting && s.btnDisabled]}
              onPress={handleSendOtp}
              disabled={submitting}
              activeOpacity={0.82}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Send code</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[s.formLabel, { color: colors.muted }]}>
              Check your email — enter the 6-digit code
            </Text>
            <TextInput
              style={[s.input, s.codeInput, {
                borderColor: colors.borderInput,
                color: colors.ink,
                backgroundColor: colors.background,
              }]}
              placeholder="• • • • • •"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              value={token}
              onChangeText={setToken}
              editable={!submitting}
              maxLength={6}
            />

            <TouchableOpacity
              style={[s.btn, { backgroundColor: accent }, submitting && s.btnDisabled]}
              onPress={handleVerify}
              disabled={submitting}
              activeOpacity={0.82}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Verify code</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStage('email')} disabled={submitting}>
              <Text style={[s.linkText, { color: accent }]}>← Use a different email</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[s.disclaimer, { color: colors.placeholder }]}>
          By continuing you agree TrainerHub is a marketplace and is{' '}
          <Text style={{ fontWeight: '700', color: colors.muted }}>not responsible</Text>
          {' '}for the {isTrainerMode ? 'trainers or clients' : 'trainers'} you meet through it.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const CARD_RADIUS = 32;

const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Colour band ──────────────────────────────────────────────
  colorBand: {
    // Fixed height — tall enough to feel bold, small enough to leave room for the card
    minHeight: 240,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 36,
    gap: 10,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
  },

  // ── White card ────────────────────────────────────────────────
  card: {
    flex: 1,
    borderTopLeftRadius:  CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
    // Shadow casting up onto the colour band
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 12,
  },

  // ── Form ─────────────────────────────────────────────────────
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: '700',
  },

  // ── Button ───────────────────────────────────────────────────
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  linkText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});
