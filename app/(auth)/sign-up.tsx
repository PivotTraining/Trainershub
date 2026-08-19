import { useRouter } from 'expo-router';
import { useState } from 'react';
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
    if (!normalizedEmail.includes('@')) {
      Alert.alert('Enter a valid email', 'We need an email address to create your account.');
      return;
    }
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
    if (token.trim().length < 6) {
      Alert.alert('Enter your code', 'Use the verification code from your email.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyOtp(normalizedEmail, token.trim());
      // AuthLayout detects the new incomplete profile and routes to /welcome.
    } catch (error: unknown) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.wrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={[styles.backText, { color: colors.muted }]}>← Back to sign in</Text>
          </TouchableOpacity>

          <View style={[styles.logoWrap, { backgroundColor: accent }]}>
            <Logo size={42} color="#fff" background="none" />
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>Create your TrainerHub account</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Choose how you’ll use TrainerHub. You can finish your profile after we verify your email.</Text>

          <View style={[styles.roleWrap, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}>
            <Pressable
              style={[styles.roleButton, role === 'client' && { backgroundColor: accent }]}
              onPress={() => setRole('client')}
            >
              <Text style={[styles.roleText, { color: role === 'client' ? '#fff' : colors.muted }]}>I need a trainer</Text>
            </Pressable>
            <Pressable
              style={[styles.roleButton, role === 'trainer' && { backgroundColor: accent }]}
              onPress={() => setRole('trainer')}
            >
              <Text style={[styles.roleText, { color: role === 'trainer' ? '#fff' : colors.muted }]}>I’m a trainer</Text>
            </Pressable>
          </View>

          {stage === 'email' ? (
            <>
              <Text style={[styles.label, { color: colors.muted }]}>Email address</Text>
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
                style={[styles.primary, { backgroundColor: accent }, submitting && styles.disabled]}
                onPress={sendCode}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create account</Text>}
              </TouchableOpacity>
              <Text style={[styles.helper, { color: colors.placeholder }]}>We’ll email you a one-time verification code. No password needed to get started.</Text>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.muted }]}>Verification code</Text>
              <Text style={[styles.helper, { color: colors.muted }]}>We sent a code to {normalizedEmail}.</Text>
              <TextInput
                style={[styles.input, styles.code, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surface }]}
                placeholder="• • • • • •"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                value={token}
                onChangeText={setToken}
                maxLength={10}
                editable={!submitting}
              />
              <TouchableOpacity
                style={[styles.primary, { backgroundColor: accent }, submitting && styles.disabled]}
                onPress={verify}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify & continue</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setToken(''); setStage('email'); }} disabled={submitting}>
                <Text style={[styles.secondary, { color: accent }]}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 26, paddingTop: 24 },
  back: { alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 18 },
  backText: { fontSize: 14, fontWeight: '700' },
  logoWrap: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title: { fontSize: 31, fontWeight: '900', letterSpacing: -0.6, lineHeight: 36 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 26 },
  roleWrap: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, marginBottom: 28 },
  roleButton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  roleText: { fontSize: 13, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
  code: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 7 },
  primary: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 2 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  helper: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  secondary: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 18 },
});
