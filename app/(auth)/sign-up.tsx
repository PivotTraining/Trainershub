import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { signInWithOtp, verifyOtp } from '@/lib/auth';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

type Role = 'client' | 'trainer';
type Stage = 'email' | 'token';

export default function SignUp() {
  const router = useRouter();
  const { colors, accent } = useTheme();
  const [role, setRole] = useState<Role>('client');
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();

  const sendCode = async () => {
    if (!normalizedEmail.includes('@')) return Alert.alert('Enter a valid email', 'We need an email address to create your account.');
    setSubmitting(true);
    try {
      await signInWithOtp(normalizedEmail, { role });
      setStage('token');
    } catch (error: unknown) {
      Alert.alert('Could not create account', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async () => {
    if (token.trim().length < 6) return Alert.alert('Enter your code', 'Use the verification code from your email.');
    setSubmitting(true);
    try { await verifyOtp(normalizedEmail, token.trim()); }
    catch (error: unknown) { Alert.alert('Verification failed', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={17} color={colors.muted} /><Text style={[styles.backText, { color: colors.muted }]}>Sign in</Text></TouchableOpacity>

          <View style={styles.hero}>
            <EnergyField flip />
            <BrandLockup compact dark />
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>START HERE</Text>
              <Text style={styles.heroTitle}>{role === 'trainer' ? 'Build your trainer presence.' : 'Find your training fit.'}</Text>
              <Text style={styles.heroSub}>Create your account, verify your email, then personalize the experience.</Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.headingRow}><View><Text style={[styles.formEyebrow, { color: accent }]}>{stage === 'token' ? 'VERIFY' : 'YOUR ROLE'}</Text><Text style={[styles.formTitle, { color: colors.ink }]}>{stage === 'token' ? 'Check your email' : 'Create account'}</Text></View><View style={styles.beam} /></View>

            {stage === 'email' ? (
              <>
                <View style={[styles.roleSwitch, { borderBottomColor: colors.border }]}>
                  {(['client', 'trainer'] as const).map((item) => {
                    const selected = role === item;
                    return <Pressable key={item} style={[styles.roleOption, selected && { backgroundColor: BRAND.navy }]} onPress={() => setRole(item)}>{selected ? <View style={[styles.roleRail, { backgroundColor: accent }]} /> : null}<Ionicons name={item === 'client' ? 'search-outline' : 'people-outline'} size={18} color={selected ? '#FFFFFF' : accent} /><Text style={[styles.roleText, { color: selected ? '#FFFFFF' : colors.ink }]}>{item === 'client' ? 'I need a trainer' : 'I’m a trainer'}</Text></Pressable>;
                  })}
                </View>

                <Text style={[styles.label, { color: colors.muted }]}>EMAIL ADDRESS</Text>
                <View style={[styles.inputWrap, { borderColor: colors.borderInput, backgroundColor: colors.surfaceCard }]}><Ionicons name="mail-outline" size={17} color={accent} /><TextInput style={[styles.input, { color: colors.ink }]} placeholder="you@example.com" placeholderTextColor={colors.placeholder} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!submitting} /></View>
                <TouchableOpacity style={[styles.primary, submitting && { opacity: 0.6 }]} onPress={sendCode} disabled={submitting}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>Create account</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></>}</TouchableOpacity>
                <Text style={[styles.helper, { color: colors.muted }]}>We’ll send a one-time verification code. No password is required to get started.</Text>
              </>
            ) : (
              <>
                <Text style={[styles.helper, { color: colors.muted }]}>We sent a code to {normalizedEmail}.</Text>
                <TextInput style={[styles.codeInput, { borderColor: colors.borderInput, backgroundColor: colors.surfaceCard, color: colors.ink }]} placeholder="• • • • • •" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={token} onChangeText={setToken} maxLength={10} editable={!submitting} />
                <TouchableOpacity style={[styles.primary, submitting && { opacity: 0.6 }]} onPress={verify} disabled={submitting}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>Verify & continue</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></>}</TouchableOpacity>
                <TouchableOpacity onPress={() => { setToken(''); setStage('email'); }} disabled={submitting}><Text style={[styles.secondary, { color: accent }]}>Use a different email</Text></TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 },
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 48 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 10 },
  backText: { fontSize: 13, fontWeight: '800' },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 245, justifyContent: 'space-between', backgroundColor: BRAND.navy, borderRadius: 24, borderWidth: 1, borderColor: '#193857', padding: 21 },
  heroCopy: { zIndex: 2 },
  eyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: '#FFFFFF', fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8, marginTop: 6 },
  heroSub: { color: '#AEBFD2', fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 510 },
  form: { paddingTop: 27, paddingHorizontal: 3 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 11, marginBottom: 18 },
  formEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  formTitle: { fontSize: 27, fontWeight: '900', marginTop: 2 },
  beam: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.22, marginBottom: 6 },
  roleSwitch: { flexDirection: 'row', gap: 7, borderBottomWidth: 1, paddingBottom: 12, marginBottom: 20 },
  roleOption: { position: 'relative', overflow: 'hidden', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 9, paddingVertical: 11 },
  roleRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2 },
  roleText: { fontSize: 12, fontWeight: '800' },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 0.9, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13 },
  input: { flex: 1, fontSize: 16, paddingVertical: 13 },
  codeInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 8, marginTop: 12 },
  primary: { marginTop: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND.navy, borderRadius: 10, paddingVertical: 15 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  helper: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  secondary: { textAlign: 'center', fontSize: 13, fontWeight: '800', marginTop: 15 },
});
