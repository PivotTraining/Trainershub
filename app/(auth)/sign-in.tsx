import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/BrandLockup';
import { EnergyField } from '@/components/EnergyField';
import { trackEvent } from '@/lib/analytics';
import { requestPasswordReset, signInWithOtp, signInWithPassword, verifyOtp } from '@/lib/auth';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const PREFERRED_ROLE_KEY = '@trainerhub:preferred_role';
const OTP_COOLDOWN_MS = 60_000;
type Mode = 'client' | 'trainer';
type Stage = 'email' | 'token';
type Method = 'password' | 'otp';

export default function SignIn() {
  const { colors, accent } = useTheme();
  const router = useRouter();
  const { inviteToken } = useLocalSearchParams<{ inviteToken?: string }>();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [stage, setStage] = useState<Stage>('email');
  const [method, setMethod] = useState<Method>('password');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>('client');
  const [lastSendAt, setLastSendAt] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

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
    AsyncStorage.getItem(PREFERRED_ROLE_KEY).then((value) => {
      if (value === 'trainer' || value === 'client') setMode(value);
    });
  }, []);

  const switchMode = async (next: Mode) => {
    setMode(next);
    await AsyncStorage.setItem(PREFERRED_ROLE_KEY, next);
  };

  const handlePasswordSignIn = async () => {
    if (!normalizedEmail.includes('@')) return Alert.alert('Invalid email', 'Enter a valid email address.');
    if (!password) return Alert.alert('Enter password', 'Password is required.');
    setSubmitting(true);
    try {
      await signInWithPassword(normalizedEmail, password);
      void trackEvent('sign_in_completed', { method: 'password', role: mode });
      if (inviteToken) router.replace({ pathname: '/invite', params: { token: inviteToken } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Sign-in failed', /invalid login credentials|user not found/i.test(message)
        ? 'Wrong email or password. New here? Choose one-time code or Create account.'
        : message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!normalizedEmail.includes('@')) return Alert.alert('Invalid email', 'Enter a valid email address.');
    if (Date.now() - (lastSendAt[normalizedEmail] ?? 0) < OTP_COOLDOWN_MS) {
      setStage('token');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithOtp(normalizedEmail, { role: mode });
      setLastSendAt((current) => ({ ...current, [normalizedEmail]: Date.now() }));
      setNow(Date.now());
      setStage('token');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (/rate limit|over.?email|too many/i.test(message)) {
        setLastSendAt((current) => ({ ...current, [normalizedEmail]: Date.now() }));
        setNow(Date.now());
        Alert.alert('Too many sign-in emails', 'Please wait before requesting another code.');
      } else {
        Alert.alert('Sign-in failed', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (token.trim().length < 6) return Alert.alert('Invalid code', 'Enter the code from your email.');
    setSubmitting(true);
    try {
      await verifyOtp(normalizedEmail, token.trim());
      void trackEvent('sign_in_completed', { method: 'otp', role: mode });
      if (inviteToken) router.replace({ pathname: '/invite', params: { token: inviteToken } });
    } catch (error: unknown) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!normalizedEmail.includes('@')) return Alert.alert('Enter your email', 'Enter your account email first.');
    setSubmitting(true);
    try {
      await requestPasswordReset(normalizedEmail);
      void trackEvent('password_reset_requested');
      Alert.alert('Check your email', 'If an account exists for that address, a secure reset link is on the way.');
    } catch (error: unknown) {
      Alert.alert('Reset unavailable', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const isTrainer = mode === 'trainer';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <EnergyField />
            <BrandLockup compact dark />
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>FIND  •  BOOK  •  TRAIN</Text>
              <Text style={styles.heroTitle}>{isTrainer ? 'Build your business.' : 'Move toward your goals.'}</Text>
              <Text style={styles.heroSub}>{isTrainer ? 'Manage clients, bookings and payments in one place.' : 'Find the right trainer and keep your momentum visible.'}</Text>
            </View>
          </View>

          <View style={styles.formWrap}>
            <View style={styles.formHeadingRow}>
              <View>
                <Text style={[styles.formEyebrow, { color: accent }]}>{stage === 'token' ? 'VERIFY EMAIL' : 'WELCOME BACK'}</Text>
                <Text style={[styles.formTitle, { color: colors.ink }]}>{stage === 'token' ? 'Enter your code' : 'Sign in'}</Text>
              </View>
              <View style={styles.headingBeam} />
            </View>

            {stage === 'email' ? (
              <>
                <View style={[styles.roleSwitch, { borderColor: colors.border }]}>
                  {(['client', 'trainer'] as const).map((role) => {
                    const selected = mode === role;
                    return (
                      <Pressable key={role} style={[styles.roleOption, selected && { backgroundColor: BRAND.navy }]} onPress={() => switchMode(role)}>
                        {selected ? <View style={[styles.roleRail, { backgroundColor: accent }]} /> : null}
                        <Text style={[styles.roleLabel, { color: selected ? '#FFFFFF' : colors.muted }]}>{role === 'client' ? 'I’m a client' : 'I’m a trainer'}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: colors.muted }]}>Email address</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surfaceCard, borderColor: colors.borderInput }]}>
                  <Ionicons name="mail-outline" size={17} color={accent} />
                  <TextInput style={[styles.input, { color: colors.ink }]} placeholder="you@example.com" placeholderTextColor={colors.placeholder} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!submitting} />
                </View>

                {method === 'password' ? (
                  <>
                    <Text style={[styles.label, { color: colors.muted }]}>Password</Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.surfaceCard, borderColor: colors.borderInput }]}>
                      <Ionicons name="lock-closed-outline" size={17} color={accent} />
                      <TextInput style={[styles.input, { color: colors.ink }]} placeholder="Password" placeholderTextColor={colors.placeholder} secureTextEntry autoCapitalize="none" autoComplete="password" value={password} onChangeText={setPassword} editable={!submitting} />
                    </View>
                    <TouchableOpacity style={styles.primary} onPress={handlePasswordSignIn} disabled={submitting} activeOpacity={0.86}>
                      {submitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>Sign in</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMethod('otp')} disabled={submitting}><Text style={[styles.link, { color: accent }]}>Use a one-time code instead</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleForgotPassword} disabled={submitting}><Text style={[styles.mutedLink, { color: colors.muted }]}>Forgot password?</Text></TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[styles.helper, { color: colors.muted }]}>We’ll send a secure code to your email. No password required.</Text>
                    <TouchableOpacity style={styles.primary} onPress={handleSendOtp} disabled={submitting || cooldownActive} activeOpacity={0.86}>
                      {submitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>{cooldownActive ? `Resend in ${cooldownLabel}` : 'Send code'}</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMethod('password')} disabled={submitting}><Text style={[styles.link, { color: accent }]}>Use password instead</Text></TouchableOpacity>
                  </>
                )}

                <View style={[styles.createAccountBox, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}>
                  <Text style={[styles.createAccountText, { color: colors.muted }]}>New to TrainerHub?</Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} disabled={submitting}>
                    <Text style={[styles.createAccountLink, { color: accent }]}>Create an account</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.helper, { color: colors.muted }]}>We sent a verification code to {normalizedEmail}.</Text>
                <TextInput style={[styles.codeInput, { backgroundColor: colors.surfaceCard, borderColor: colors.borderInput, color: colors.ink }]} placeholder="• • • • • •" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={token} onChangeText={setToken} editable={!submitting} maxLength={10} />
                <TouchableOpacity style={styles.primary} onPress={handleVerify} disabled={submitting} activeOpacity={0.86}>
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>Verify & continue</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></>}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOtp} disabled={submitting || cooldownActive}><Text style={[styles.link, { color: cooldownActive ? colors.placeholder : accent }]}>{cooldownActive ? `Resend in ${cooldownLabel}` : 'Resend code'}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setToken(''); setStage('email'); }} disabled={submitting}><Text style={[styles.mutedLink, { color: colors.muted }]}>Use a different email</Text></TouchableOpacity>
              </>
            )}

            <View style={[styles.disclaimer, { borderTopColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color={colors.placeholder} />
              <Text style={[styles.disclaimerText, { color: colors.placeholder }]}>TrainerHub is a marketplace. Review profiles and use your judgment when meeting trainers or clients.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 48 },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 270, justifyContent: 'space-between', backgroundColor: BRAND.navy, borderRadius: 26, borderWidth: 1, borderColor: '#193857', padding: 22 },
  heroCopy: { zIndex: 2 },
  eyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 2.2 },
  heroTitle: { color: '#FFFFFF', fontSize: 36, lineHeight: 40, fontWeight: '900', letterSpacing: -0.9, marginTop: 7 },
  heroSub: { color: '#AEBFD2', fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 520 },
  formWrap: { paddingTop: 28, paddingHorizontal: 4 },
  formHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 20 },
  formEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  formTitle: { fontSize: 28, fontWeight: '900', marginTop: 2 },
  headingBeam: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.22, marginBottom: 6 },
  roleSwitch: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 22 },
  roleOption: { position: 'relative', flex: 1, alignItems: 'center', paddingVertical: 12 },
  roleRail: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 2 },
  roleLabel: { fontSize: 13, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7, marginTop: 12 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13 },
  input: { flex: 1, fontSize: 16, paddingVertical: 13 },
  codeInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, textAlign: 'center', letterSpacing: 8, fontWeight: '800', marginTop: 12 },
  helper: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  primary: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND.navy, borderRadius: 10, paddingVertical: 15 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  link: { textAlign: 'center', fontSize: 13, fontWeight: '800', marginTop: 14 },
  mutedLink: { textAlign: 'center', fontSize: 12, fontWeight: '700', marginTop: 10 },
  createAccountBox: { marginTop: 22, borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  createAccountText: { fontSize: 13, fontWeight: '700' },
  createAccountLink: { fontSize: 13, fontWeight: '900' },
  disclaimer: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 16, marginTop: 25 },
  disclaimerText: { flex: 1, fontSize: 10, lineHeight: 16 },
});
