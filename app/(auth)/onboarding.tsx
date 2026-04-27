/**
 * Onboarding — shown after first sign-in when the user has no full_name set.
 * Lets them set a display name and confirm their role (trainers can self-select
 * here; clients are always set by trainer-invite so their role is pre-filled).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { useAuth } from '@/lib/auth';
import { useUpdateProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/lib/theme';

type RoleChoice = 'trainer' | 'client';

export default function Onboarding() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [role, setRole] = useState<RoleChoice>(profile?.role ?? 'client');

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your display name to continue.');
      return;
    }
    if (!session?.user.id) return;

    try {
      // Update role directly if changed (profiles.role is set at creation but
      // can be changed here before the user has done anything meaningful).
      if (role !== profile?.role) {
        const { error } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', session.user.id);
        if (error) throw new Error(error.message);
      }

      await updateProfile.mutateAsync({ id: session.user.id, full_name: name.trim() });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      Alert.alert('Setup failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const isSaving = updateProfile.isPending;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Welcome to TrainerHub</Text>
          <Text style={styles.subtitle}>
            Just a couple of things to get you started.
          </Text>

          {/* ── Name ─────────────────────────────────────────────── */}
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Alex Johnson"
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
          />

          {/* ── Role ─────────────────────────────────────────────── */}
          <Text style={styles.label}>I am a…</Text>
          <View style={styles.roleRow}>
            {(['trainer', 'client'] as RoleChoice[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleCard, role === r && styles.roleCardSelected]}
                onPress={() => setRole(r)}
              >
                <Text style={styles.roleIcon}>{r === 'trainer' ? '🏋️' : '🧑‍💼'}</Text>
                <Text
                  style={[styles.roleLabel, role === r && styles.roleLabelSelected]}
                >
                  {r === 'trainer' ? 'Trainer' : 'Client'}
                </Text>
                <Text style={styles.roleDesc}>
                  {r === 'trainer'
                    ? 'I manage clients & sessions'
                    : 'I train with a coach'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.button, isSaving && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isSaving}
          >
            {isSaving
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.buttonText}>Get started</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { fontSize: typography.display, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { fontSize: typography.md, color: colors.muted, marginBottom: spacing.xl },
  label: { fontSize: typography.sm, color: colors.inkSoft, marginBottom: 6, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: typography.base,
  },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  roleCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  roleCardSelected: { borderColor: colors.ink, backgroundColor: '#F5F5F5' },
  roleIcon: { fontSize: 28, marginBottom: spacing.xs },
  roleLabel: { fontSize: typography.md, fontWeight: '700', color: colors.muted },
  roleLabelSelected: { color: colors.ink },
  roleDesc: { fontSize: typography.xs, color: colors.placeholder, textAlign: 'center', marginTop: 4 },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: typography.base, fontWeight: '600' },
});
