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
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut, useAuth } from '@/lib/auth';
import {
  useTrainerProfile,
  useUpdateProfile,
  useUpsertTrainerProfile,
} from '@/lib/queries/profile';

export default function Profile() {
  const { session, profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const userId = session?.user.id ?? '';

  const updateProfile = useUpdateProfile();
  const trainerQuery = useTrainerProfile(isTrainer ? userId : undefined);
  const upsertTrainer = useUpsertTrainerProfile();

  // ── base profile state ────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');

  // ── trainer-only state ────────────────────────────────────────────────────
  const [bio, setBio] = useState('');
  const [specialtiesRaw, setSpecialtiesRaw] = useState(''); // comma-separated
  const [rateStr, setRateStr] = useState(''); // displayed as dollars

  // seed once the data arrives
  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? '');
  }, [profile?.full_name]);

  useEffect(() => {
    if (trainerQuery.data) {
      setBio(trainerQuery.data.bio ?? '');
      setSpecialtiesRaw(trainerQuery.data.specialties.join(', '));
      const cents = trainerQuery.data.hourly_rate_cents;
      setRateStr(cents != null ? String(Math.round(cents / 100)) : '');
    }
  }, [trainerQuery.data]);

  const handleCancel = () => {
    setFullName(profile?.full_name ?? '');
    if (trainerQuery.data) {
      setBio(trainerQuery.data.bio ?? '');
      setSpecialtiesRaw(trainerQuery.data.specialties.join(', '));
      const cents = trainerQuery.data.hourly_rate_cents;
      setRateStr(cents != null ? String(Math.round(cents / 100)) : '');
    }
    setEditing(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      await updateProfile.mutateAsync({ id: userId, full_name: fullName });

      if (isTrainer) {
        const specialties = specialtiesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const hourly_rate_cents =
          rateStr.trim() ? Math.round(Number(rateStr) * 100) : null;
        if (rateStr.trim() && isNaN(Number(rateStr))) {
          Alert.alert('Invalid rate', 'Hourly rate must be a number.');
          return;
        }
        await upsertTrainer.mutateAsync({
          user_id: userId,
          bio: bio.trim() || null,
          specialties,
          hourly_rate_cents,
        });
      }

      setEditing(false);
    } catch (err: unknown) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const isSaving = updateProfile.isPending || upsertTrainer.isPending;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: unknown) {
      Alert.alert('Sign out failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>

          {/* ── Header row ─────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>My profile</Text>
            {!editing ? (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleCancel} disabled={isSaving}>
                  <Text style={styles.cancelLink}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text style={styles.saveLink}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Email (read-only) ───────────────────────────────────── */}
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session?.user.email ?? '—'}</Text>

          {/* ── Full name ──────────────────────────────────────────── */}
          <Text style={styles.label}>Display name</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              autoCapitalize="words"
            />
          ) : (
            <Text style={styles.value}>{profile?.full_name || '—'}</Text>
          )}

          {/* ── Role (read-only) ────────────────────────────────────── */}
          <Text style={styles.label}>Role</Text>
          <Text style={[styles.value, styles.roleBadge]}>
            {profile?.role ?? '—'}
          </Text>

          {/* ── Trainer-only section ────────────────────────────────── */}
          {isTrainer && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Trainer details</Text>

              <Text style={styles.label}>Bio</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell clients about yourself…"
                  multiline
                />
              ) : (
                <Text style={[styles.value, !bio && styles.muted]}>
                  {bio || 'No bio yet.'}
                </Text>
              )}

              <Text style={styles.label}>Specialties (comma-separated)</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={specialtiesRaw}
                  onChangeText={setSpecialtiesRaw}
                  placeholder="e.g. Strength, HIIT, Mobility"
                  autoCapitalize="words"
                />
              ) : (
                <View style={styles.chips}>
                  {trainerQuery.data?.specialties.length ? (
                    trainerQuery.data.specialties.map((s) => (
                      <View key={s} style={styles.chip}>
                        <Text style={styles.chipText}>{s}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.muted}>None set.</Text>
                  )}
                </View>
              )}

              <Text style={styles.label}>Hourly rate (USD)</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={rateStr}
                  onChangeText={setRateStr}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 75"
                />
              ) : (
                <Text style={styles.value}>
                  {trainerQuery.data?.hourly_rate_cents != null
                    ? `$${(trainerQuery.data.hourly_rate_cents / 100).toFixed(2)} / hr`
                    : '—'}
                </Text>
              )}
            </>
          )}

          {/* ── Sign out ────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: { padding: 24, flexGrow: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editActions: { flexDirection: 'row', gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  editLink: { color: '#0a7', fontWeight: '600' },
  cancelLink: { color: '#888' },
  saveLink: { color: '#0a7', fontWeight: '600' },
  label: { fontSize: 13, color: '#888', marginTop: 16, marginBottom: 4 },
  value: { fontSize: 16 },
  roleBadge: { textTransform: 'capitalize', fontWeight: '600', color: '#333' },
  muted: { color: '#aaa' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { fontSize: 13, color: '#333' },
  signOutButton: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#c33',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#c33', fontWeight: '600' },
});
