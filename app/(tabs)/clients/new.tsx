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

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { useCreateClient } from '@/lib/queries/clients';
import { clientCreateSchema } from '@/lib/validators/client';

export default function NewClient() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, accent } = useTheme();
  const create = useCreateClient(session?.user.id ?? '');
  const [email, setEmail] = useState('');
  const [goals, setGoals] = useState('');

  const handleSubmit = async () => {
    const parsed = clientCreateSchema.safeParse({
      email: email.trim().toLowerCase(),
      goals: goals.trim() || undefined,
    });
    if (!parsed.success) {
      Alert.alert('Check inputs', parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      router.back();
    } catch (error: unknown) {
      Alert.alert('Could not add', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.infoBox, { backgroundColor: colors.infoBg }]}>
        <Text style={[styles.infoText, { color: colors.ink }]}>
          If this email isn&apos;t registered yet, they&apos;ll receive an invitation link. Either way
          they&apos;ll appear in your client list once added.
        </Text>
      </View>

      <Text style={[styles.label, { color: colors.muted }]}>Email</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.borderInput, color: colors.ink }]}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        placeholder="client@example.com"
      />

      <Text style={[styles.label, { color: colors.muted }]}>Goals (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
        value={goals}
        onChangeText={setGoals}
        multiline
        placeholder="What is this client working toward?"
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: accent }, create.isPending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={create.isPending}
      >
        {create.isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.white }]}>Invite client</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  infoBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  infoText: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
