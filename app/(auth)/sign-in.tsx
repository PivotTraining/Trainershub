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
import { signInWithOtp, signInWithPassword, verifyOtp } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

const PREFERRED_ROLE_KEY = '@trainerhub:preferred_role';
const OTP_COOLDOWN_MS = 60_000;

// App Review Guideline 2.1(a): reviewers must be able to access trainer
// functionality without external credentials. These match the seeded account
// in supabase/migrations/20260511_review_demo_account.sql.
const DEMO_TRAINER_EMAIL = 'review-trainer@trainerhub.app';
const DEMO_TRAINER_PASSWORD = 'TrainerHubReview2026!';
type Mode = 'client' | 'trainer';
type Stage = 'email' | 'token';
type Method = 'password' | 'otp';

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
  const [password, setPassword] = useState('');
  const [stage, setStage]       = useState<Stage>('email');
  const [method, setMethod]     = useState<Method>('password');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode]         = useState<Mode>('client');
  const [lastSendAt, setLastSendAt] = useState<Record<string, number>>({});
  const [now, setNow]           = useState<number>(Date.now());

  const normalizedEmail = email.trim().toLowerCase();
  const lastSentForEmail = lastSendAt[normalizedEmail] ?? 0;
  const cooldownRemainingMs = Math.max(0, OTP_COOLDOWN_MS - (now - lastSentForEmail));
  const cooldownActive = cooldownRemainingMs > 0;
  const cooldownLabel = `${Math.floor(cooldownRemainingMs / 60000)}:${String(Math.ceil((cooldownRemainingMs % 60000) / 1000)).padStart(2, '0')}`;

  useEffect(() => {
    if (!cooldownActive) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [cooldownActive]);

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
    if (Date.now() - (lastSendAt[normalizedEmail] ?? 0) < OTP_COOLDOWN_MS) {
      // Still in cooldown — skip the network call and let the user enter the
      // code we already sent.
      setStage('token');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithOtp(normalizedEmail);
      setLastSendAt((m) => ({ ...m, [normalizedEmail]: Date.now() }));
      setNow(Date.now());
      setStage('token');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (/rate limit|over.?email|too many/i.test(msg)) {
        // Mark a cooldown so the user doesn't keep retrying the same address.
        setLastSendAt((m) => ({ ...m, [normalizedEmail]: Date.now() }));
        setNow(Date.now());
        Alert.alert(
          'Too many sign-in emails',
          'Please wait about 60 minutes before requesting another code, or contact support@trainerhub.app for help.',
        );
      } else {
        Alert.alert('Sign-in failed', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setSubmitting(true);
    try {
      await signInWithPassword(DEMO_TRAINER_EMAIL, DEMO_TRAINER_PASSWORD);
    } catch (error: unknown) {
      Alert.alert(
        'Demo sign-in failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSignIn = async () => {
    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (!password) {
      Alert.alert('Enter password', 'Password is required.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithPassword(normalizedEmail, password);
      if (inviteToken) {
        router.replace({ pathname: '/invite', params: { token: inviteToken } });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      // Surface a clearer hint when no password account exists for that email.
      if (/invalid login credentials|user not found/i.test(msg)) {
        Alert.alert(
          'Sign-in failed',
          'Wrong email or password. New here? Tap "Get a one-time code instead" to sign up with email.',
        );
      } else {
        Alert.alert('Sign-in failed', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    // Supabase OTP length is configurable per project (6–10 digits). Accept
    // any length in that range so the app keeps working if the project
    // setting is changed later.
    if (token.trim().length < 6) {
      Alert.alert('Invalid code', 'Enter the code from your email.');
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

            {method === 'password' ? (
              <>
                <Text style={[s.formLabel, { color: colors.muted, marginTop: 12 }]}>Password</Text>
                <TextInput
                  style={[s.input, {
                    borderColor: colors.borderInput,
                    color: colors.ink,
                    backgroundColor: colors.background,
                  }]}
                  placeholder="Password"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  editable={!submitting}
                />
                <TouchableOpacity
                  style={[s.btn, { backgroundColor: accent }, submitting && s.btnDisabled]}
                  onPress={handlePasswordSignIn}
                  disabled={submitting}
                  activeOpacity={0.82}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Sign in</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMethod('otp')}
                  disabled={submitting}
                  style={{ marginTop: 12 }}
                >
                  <Text style={[s.linkText, { color: accent }]}>
                    Get a one-time code instead
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[s.btn, { backgroundColor: accent }, (submitting || cooldownActive) && s.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={submitting || cooldownActive}
                  activeOpacity={0.82}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>{cooldownActive ? `Resend in ${cooldownLabel}` : 'Send code'}</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMethod('password')}
                  disabled={submitting}
                  style={{ marginTop: 12 }}
                >
                  <Text style={[s.linkText, { color: accent }]}>
                    Use password instead
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={[s.formLabel, { color: colors.muted }]}>
              Check your email — enter the code
            </Text>
            <Text style={[s.helperText, { color: colors.placeholder }]}>
              Type the code from the email. Ignore any &ldquo;Confirm&rdquo; link
              — it isn&rsquo;t needed.
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
              maxLength={10}
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

            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={submitting || cooldownActive}
              style={{ marginTop: 12 }}
            >
              <Text style={[s.linkText, { color: cooldownActive ? colors.placeholder : accent }]}>
                {cooldownActive ? `Resend in ${cooldownLabel}` : 'Resend code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setToken(''); setStage('email'); }} disabled={submitting}>
              <Text style={[s.linkText, { color: accent }]}>← Use a different email</Text>
            </TouchableOpacity>
          </>
        )}

        {stage === 'email' && (
          <View style={s.demoWrap}>
            <View style={[s.demoDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={[s.demoBtn, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
              onPress={handleDemoSignIn}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={[s.demoBtnText, { color: colors.ink }]}>
                Continue as Demo Trainer
              </Text>
              <Text style={[s.demoBtnHint, { color: colors.muted }]}>
                For App Review · pre-populated trainer account
              </Text>
            </TouchableOpacity>
          </View>
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
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
    marginTop: -4,
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

  // ── Demo (App Review) ────────────────────────────────────────
  demoWrap: { marginTop: 8, marginBottom: 12 },
  demoDivider: { height: 1, marginBottom: 16, opacity: 0.6 },
  demoBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  demoBtnText: { fontSize: 15, fontWeight: '700' },
  demoBtnHint: { fontSize: 11, marginTop: 2, fontWeight: '500' },
});
