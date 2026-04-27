import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSession, useUpdateSession } from '@/lib/queries/sessions';
import { sessionUpdateSchema } from '@/lib/validators/session';

export default function EditSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { data, isLoading } = useSession(id);
  const update = useUpdateSession();

  const [startsAt, setStartsAt] = useState<Date>(new Date());
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (data && !seeded) {
      setStartsAt(new Date(data.starts_at));
      setDuration(String(data.duration_min));
      setNotes(data.notes ?? '');
      setSeeded(true);
      navigation.setOptions({ title: 'Edit session' });
    }
  }, [data, seeded, navigation]);

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !selected) return;
    setStartsAt(selected);
  };

  const handleSave = async () => {
    const parsed = sessionUpdateSchema.safeParse({
      starts_at: startsAt.toISOString(),
      duration_min: Number(duration),
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      Alert.alert('Check inputs', parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      await update.mutateAsync({ id: id!, ...parsed.data });
      router.back();
    } catch (err: unknown) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
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
          placeholder="Session notes…"
        />

        <TouchableOpacity
          style={[styles.button, update.isPending && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={update.isPending}
        >
          {update.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  label: { fontSize: 13, color: '#555', marginBottom: 6, marginTop: 16 },
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
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
