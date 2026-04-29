import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useClients } from '@/lib/queries/clients';
import { useCreateSession } from '@/lib/queries/sessions';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
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
  const { colors, accent } = useTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.container]}>
          <Text style={[styles.label, { color: colors.muted }]}>Client</Text>
          <FlatList
            data={clients.data ?? []}
            keyExtractor={(c) => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.xs }}
            scrollEnabled
            renderItem={({ item }) => {
              const selected = item.id === clientId;
              const name = item.profile?.full_name ?? item.profile?.email ?? item.id.slice(0, 6);
              return (
                <TouchableOpacity
                  onPress={() => setClientId(item.id)}
                  style={[
                    styles.chip,
                    { borderColor: colors.borderInput },
                    selected && { backgroundColor: accent, borderColor: accent },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? '#fff' : colors.ink }]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.muted }]}>Add a client first.</Text>
            }
          />

          <Text style={[styles.label, { color: colors.muted }]}>Date &amp; time</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.borderInput }]}
              onPress={() => setPickerMode(pickerMode === 'date' ? null : 'date')}
            >
              <Text style={[styles.pickerButtonText, { color: colors.ink }]}>
                {startsAt.toLocaleDateString()}
              </Text>
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
            placeholderTextColor={colors.placeholder}
          />

          <Text style={[styles.label, { color: colors.muted }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Optional session notes…"
            placeholderTextColor={colors.placeholder}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }, create.isPending && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={create.isPending}
          >
            {create.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Schedule</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  flex:    { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: 40 },
  label:   { fontSize: typography.sm, marginBottom: spacing.xs, marginTop: spacing.md },
  row:     { flexDirection: 'row', gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  empty:   {},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipText:         { fontWeight: '500' },
  pickerButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerButtonText: { fontSize: typography.base },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: typography.base, fontWeight: '600' },
});
