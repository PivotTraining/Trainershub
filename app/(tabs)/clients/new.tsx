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
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { useCreateClient } from '@/lib/queries/clients';
import { clientCreateSchema } from '@/lib/validators/client';

export default function NewClient() {
  const router = useRouter();
  const { session } = useAuth();
  const create = useCreateClient(session?.user.id ?? '');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [goals, setGoals] = useState('');

  const handleSubmit = async () => {
    const parsed = clientCreateSchema.safeParse({
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
      <Text style={styles.label}>Goals (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={goals}
        onChangeText={setGoals}
        multiline
      />
      <TouchableOpacity
        style={[styles.button, create.isPending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={create.isPending}
      >
        {create.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Add client</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  label: { fontSize: 13, color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
