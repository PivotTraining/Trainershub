import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { establishRecoverySession, updatePassword } from '@/lib/auth';
import { colors, spacing, typography } from '@/lib/theme';

export default function ResetPassword() {
  const router = useRouter();
  const incomingUrl = Linking.useURL();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const url = incomingUrl ?? await Linking.getInitialURL();
        if (!url) throw new Error('Open the password reset link from your email to continue.');
        await establishRecoverySession(url);
        if (active) setReady(true);
      } catch (error: unknown) {
        if (active) {
          setLinkError(error instanceof Error ? error.message : 'This reset link is invalid.');
        }
      }
    })();
    return () => { active = false; };
  }, [incomingUrl]);

  const handleUpdate = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(password);
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        { text: 'Continue', onPress: () => router.replace('/') },
      ]);
    } catch (error: unknown) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>Choose a new password for your TrainerHub account.</Text>

        {!ready && !linkError ? <ActivityIndicator color={colors.ink} /> : null}

        {linkError ? (
          <>
            <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={styles.secondaryText}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {ready ? (
          <>
            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              editable={!saving}
              accessibilityLabel="New password"
            />
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              editable={!saving}
              accessibilityLabel="Confirm new password"
            />
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.disabled]}
              onPress={handleUpdate}
              disabled={saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving, busy: saving }}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Update password</Text>}
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface, justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: spacing.xl, gap: spacing.sm },
  title: { fontSize: typography.xl, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: typography.sm, color: colors.muted, lineHeight: 20, marginBottom: spacing.md },
  label: { fontSize: typography.sm, fontWeight: '600', color: colors.inkSoft, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: typography.md },
  error: { color: colors.danger, fontSize: typography.sm, lineHeight: 20 },
  primaryButton: { backgroundColor: colors.ink, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: spacing.md },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: typography.md },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: spacing.md },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
