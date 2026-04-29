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

import { useTheme } from '@/lib/useTheme';
import { useSession, useUpdateSession } from '@/lib/queries/sessions';
import { sessionUpdateSchema } from '@/lib/validators/session';

export default function EditSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { data, isLoading } = useSession(id);
  const update = useUpdateSession();
  const { colors, accent } = useTheme();

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
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.label, { color: colors.muted }]}>Date & time</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.pickerButton, { borderColor: colors.borderInput }]}
            onPress={() => setPickerMode(pickerMode === 'date' ? null : 'date')}
          >
            <Text style={[styles.pickerButtonText, { color: colors.ink }]}>{startsAt.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickerButton, { borderColor: colors.borderInput }]}
            onPress={() => setPickerMode(pickerMode === 'time' ? null : 'time')}
          >
            <Text style={[styles.pickerButtonText, { color: colors.ink }]}>
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

        <Text style={[styles.label, { color: colors.muted }]}>Duration (minutes)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.borderInput, color: colors.ink }]}
          keyboardType="number-pad"
          value={duration}
          onChangeText={setDuration}
        />

        <Text style={[styles.label, { color: colors.muted }]}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Session notes…"
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: accent }, update.isPending && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={update.isPending}
        >
          {update.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.white }]}>Save changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 24, flexGrow: 1 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 16 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  pickerButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerButtonText: { fontSize: 16 },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
