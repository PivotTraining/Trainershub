/**
 * Sign-in screen — OTP email flow.
 *
 * Visual approach: the brand gradient (sky → indigo) is used as decorative
 * SVG blobs behind the content, giving the screen energy without being loud.
 * The CTA button carries the full gradient so it reads as the primary action.
 * Works in both light and dark mode.
 */
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
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Logo } from '@/components/Logo';
import { signInWithOtp, verifyOtp } from '@/lib/auth';
import { BRAND_GRADIENT } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const PREFERRED_ROLE_KEY = '@trainerhub:preferred_role';
type Mode = 'client' | 'trainer';

// ── Gradient button ────────────────────────────────────────────────────────────

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

function GradientButton({ label, onPress, loading, disabled }: GradientButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={{ marginBottom: 12, opacity: disabled && !loading ? 0.6 : 1 }}
    >
      <Svg height={52} width="100%" style={{ borderRadius: 14 }}>
        <Defs>
          <LinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={BRAND_GRADIENT.start} />
            <Stop offset="100%" stopColor={BRAND_GRADIENT.end} />
          </LinearGradient>
        </Defs>
        <Rect rx={14} fill="url(#btnGrad)" width="100%" height={52} />
      </Svg>
      {/* Overlay the text / spinner — positioned over the SVG */}
      <View style={s.gradBtnOverlay} pointerEvents="none">
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.gradBtnText}>{label}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Background decoration ──────────────────────────────────────────────────────

function BackgroundBlobs({ isDark }: { isDark: boolean }) {
  // Large blob top-right, smaller blob bottom-left — echoes the logo gradient.
  const opacity = isDark ? 0.18 : 0.12;
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="blobA" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={BRAND_GRADIENT.start} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={BRAND_GRADIENT.end} stopOpacity={opacity * 0.6} />
          </LinearGradient>
          <LinearGradient id="blobB" x1="100%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor={BRAND_GRADIENT.end} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={BRAND_GRADIENT.start} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* Large circle top-right */}
        <Circle cx="110%" cy="-8%" r="48%" fill="url(#blobA)" />
        {/* Medium circle bottom-left */}
        <Circle cx="-15%" cy="92%" r="40%" fill="url(#blobB)" />
        {/* Small accent mid-right */}
        <Circle cx="95%" cy="55%" r="12%" fill={BRAND_GRADIENT.end} fillOpacity={isDark ? 0.07 : 0.05} />
      </Svg>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function SignIn() {
  const { colors, accent, isDark, spacing, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [stage, setStage] = useState<'email' | 'token'>('email');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>('client');

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
      Alert.alert(
        'Verification failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isTrainerMode = mode === 'trainer';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <BackgroundBlobs isDark={isDark} />

      {/* Role toggle pill — top-right */}
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => switchMode(isTrainerMode ? 'client' : 'trainer')}
          style={[s.modePill, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}
        >
          <Text style={[s.modePillText, { color: colors.muted }]}>
            {isTrainerMode ? "I'm a client →" : "I'm a trainer →"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={[s.container, { paddingHorizontal: spacing.lg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Brand ─────────────────────────────────────────────────── */}
        <View style={s.brandRow}>
          <Logo size={56} />
          <Text style={[s.brandName, { color: colors.ink }]}>TrainerHub</Text>
        </View>

        <Text style={[s.tagline, { color: colors.ink }]}>
          {isTrainerMode
            ? 'Coach smarter.\nGet paid faster.'
            : 'Find the trainer who\ngets it done.'}
        </Text>

        <Text style={[s.subtitle, { color: colors.muted }]}>
          {stage === 'email'
            ? isTrainerMode
              ? 'Sign in to your trainer account with your email.'
              : 'Sign in or create an account with your email.'
            : 'Enter the 6-digit code we sent to your email.'}
        </Text>

        {/* ── Form ──────────────────────────────────────────────────── */}
        {stage === 'email' ? (
          <>
            <TextInput
              style={[
                s.input,
                {
                  borderColor: colors.borderInput,
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
            <GradientButton
              label="Send code"
              onPress={handleSendOtp}
              loading={submitting}
              disabled={submitting}
            />
          </>
        ) : (
          <>
            <TextInput
              style={[
                s.input,
                {
                  borderColor: colors.borderInput,
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  letterSpacing: 6,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: '700',
                },
              ]}
              placeholder="• • • • • •"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              value={token}
              onChangeText={setToken}
              editable={!submitting}
              maxLength={6}
            />
            <GradientButton
              label="Verify code"
              onPress={handleVerify}
              loading={submitting}
              disabled={submitting}
            />
            <TouchableOpacity onPress={() => setStage('email')} disabled={submitting}>
              <Text style={[s.linkText, { color: accent }]}>← Use a different email</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[s.disclaimer, { color: colors.placeholder }]}>
          By continuing you agree that TrainerHub is a marketplace and is{' '}
          <Text style={{ fontWeight: '700', color: colors.muted }}>not responsible</Text> for the{' '}
          {isTrainerMode ? 'trainers or clients' : 'trainers'} you meet through it.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:       { flex: 1 },
  topBar:     { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  modePill:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1 },
  modePillText: { fontSize: 12, fontWeight: '700' },

  container:  { flex: 1, justifyContent: 'center', paddingBottom: 32 },

  brandRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  brandName:  { fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },

  tagline:    { fontSize: 26, fontWeight: '800', lineHeight: 33, marginBottom: 10, letterSpacing: -0.3 },
  subtitle:   { fontSize: 15, marginBottom: 28, lineHeight: 22, fontWeight: '400' },

  input: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },

  // Gradient button — SVG takes the visual space, overlay carries the label
  gradBtnOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  linkText:    { textAlign: 'center', marginTop: 4, fontSize: 14, fontWeight: '600' },
  disclaimer:  { fontSize: 11, marginTop: 28, lineHeight: 16, textAlign: 'center' },
});
