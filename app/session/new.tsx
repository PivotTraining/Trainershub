import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { useClients } from '@/lib/queries/clients';
import { useCreateSession } from '@/lib/queries/sessions';
import { sessionCreateSchema } from '@/lib/validators/session';

function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function NewSession() {
  const router = useRouter();
  const { session } = useAuth();
  const trainerId = session?.user.id ?? '';
  const clients = useClients(trainerId);
  const create = useCreateSession(trainerId);

  const [clientId, setClientId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<Date>(defaultStart);
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !selected) return;
    setStartsAt(selected);
  };

  const handleSubmit = async () => {
    const parsed = sessionCreateSchema.safeParse({
      client_id: clientId,
      starts_at: startsAt.toISOString(),
      duration_min: Number(duration),
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      Alert.alert('Check inputs', parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      router.back();
    } catch (error: unknown) {
      Alert.alert('Could not create', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Client</Text>
      <FlatList
        data={clients.data ?? []}
        keyExtractor={(c) => c.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const selected = item.id === clientId;
          return (
            <TouchableOpacity
              onPress={() => setClientId(item.id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={selected ? styles.chipTextSelected : styles.chipText}>
                {item.goals ?? item.id.slice(0, 6)}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Add a client first.</Text>}
      />

      <Text style={styles.label}>Date & time</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setPickerMode(pickerMode === 'date' ? null : 'date')}
        >
          <Text style={styles.pickerButtonText}>{startsAt.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setPickerMode(pickerMode === 'time' ? null : 'time')}
        >
          <Text style={styles.pickerButtonText}>
            {startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      </View>
      {pickerMode && (
        <DateTimePicker
          value={startsAt}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePickerChange}
        />
      )}

      <Text style={styles.label}>Duration (minutes)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={duration}
        onChangeText={setDuration}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
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
          <Text style={styles.buttonText}>Schedule</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  label: { fontSize: 13, color: '#555', marginBottom: 6, marginTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  empty: { color: '#666' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#333' },
  chipTextSelected: { color: '#fff' },
  pickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerButtonText: { fontSize: 16 },
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
