import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth';
import { useClientPrograms, useCreateProgram, useTrainerPrograms } from '@/lib/queries/programs';
import { programCreateSchema } from '@/lib/validators/program';

export default function Programs() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const isTrainer = profile?.role === 'trainer';
  const trainerQuery = useTrainerPrograms(isTrainer ? userId : undefined);
  const clientQuery = useClientPrograms(!isTrainer ? userId : undefined);
  const list = isTrainer ? trainerQuery : clientQuery;
  const create = useCreateProgram(userId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    const parsed = programCreateSchema.safeParse({
      title: title.trim(),
      description: description.trim() || undefined,
    });
    if (!parsed.success) {
      Alert.alert('Check inputs', parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      setTitle('');
      setDescription('');
    } catch (error: unknown) {
      Alert.alert('Could not create', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (list.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={list.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[{ padding: 16 }, (list.data ?? []).length === 0 && { flex: 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching && !list.isLoading}
            onRefresh={list.refetch}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="barbell-outline"
            title="No programs yet"
            subtitle={
              isTrainer
                ? 'Create a program below and assign it to clients.'
                : 'Your trainer will assign programs here.'
            }
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              router.push({ pathname: '/(tabs)/programs/[id]', params: { id: item.id } })
            }
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            {item.description ? <Text style={styles.rowSub}>{item.description}</Text> : null}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
      {isTrainer && (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Program title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TouchableOpacity
            style={[styles.button, create.isPending && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={create.isPending}
          >
            {create.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add program</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },
  rowTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  rowSub: { color: '#666', marginTop: 4 },
  chevron: { fontSize: 20, color: '#bbb', alignSelf: 'center' },
  composer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
