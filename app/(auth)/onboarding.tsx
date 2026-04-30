/**
 * Onboarding — captures the four pieces of info trainers need from clients
 * (Name, DOB, Location, Phone) plus the role choice and liability acceptance.
 *
 * Flow (single screen, sectioned):
 *   1. Name (required)
 *   2. DOB (required, age-gated 13+)
 *   3. Location — uses native geolocation if granted; falls back to city text
 *   4. Phone (required, visible to trainers they book)
 *   5. Role: Client or Trainer
 *   6. Liability disclaimer checkbox (required)
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { useAuth } from '@/lib/auth';
import { requestNotificationPermission } from '@/lib/notifications';
import { useUpdateProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/useTheme';

type RoleChoice = 'trainer' | 'client';

const MIN_AGE = 13;

function isAtLeast(years: number, dob: Date): boolean {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return dob <= cutoff;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function Onboarding() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const { colors, accent, spacing, typography, radius } = useTheme();

  const [name, setName] = useState(profile?.full_name ?? '');
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [role, setRole] = useState<RoleChoice>(profile?.role ?? 'client');
  const [liability, setLiability] = useState(false);

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location off',
          'No worries — type your city below instead.',
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords({ lat, lng });

      // Reverse-geocode for a human-readable city
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const place = places[0];
      if (place) {
        const parts = [place.city ?? place.subregion, place.region].filter(Boolean).join(', ');
        if (parts) setCity(parts);
      }
    } catch {
      Alert.alert('Could not detect location', 'Please type your city below.');
    } finally {
      setLocating(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setDob(selected);
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Please enter your name.';
    if (!dob) return 'Please select your date of birth.';
    if (!isAtLeast(MIN_AGE, dob)) return `You must be at least ${MIN_AGE} years old to use TrainerHub.`;
    if (!city.trim()) return 'Please add your city or use the location button.';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) return 'Please enter a valid phone number.';
    if (!liability) return 'Please confirm you accept the liability terms.';
    return null;
  };

  const handleContinue = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Almost there', err);
      return;
    }
    if (!session?.user.id || !dob) return;

    try {
      if (role !== profile?.role) {
        const { error } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', session.user.id);
        if (error) throw new Error(error.message);
      }

      await updateProfile.mutateAsync({
        id: session.user.id,
        full_name: name.trim(),
        date_of_birth: isoDate(dob),
        phone: phone.trim(),
        location_city: city.trim(),
        location_lat: coords?.lat ?? null,
        location_lng: coords?.lng ?? null,
        liability_accepted_at: new Date().toISOString(),
      });

      // Ask for notification permission right after onboarding — better context
      // than a cold prompt at app launch.
      await requestNotificationPermission().catch(() => null);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      Alert.alert('Setup failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const isSaving = updateProfile.isPending;
  const s = makeStyles(colors, accent, spacing, typography, radius);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Tell us about you</Text>
          <Text style={s.subtitle}>
            Your trainer will see your name, age, location, and phone number so they can prepare for your sessions.
          </Text>

          {/* ── Name ─────────────────────────────────────────────── */}
          <Text style={s.label}>Full name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Alex Johnson"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* ── DOB ──────────────────────────────────────────────── */}
          <Text style={s.label}>Date of birth</Text>
          <TouchableOpacity style={s.input} onPress={() => setShowDatePicker((v) => !v)}>
            <Text style={[s.inputText, { color: dob ? colors.ink : colors.placeholder }]}>
              {dob ? formatDate(dob) : 'Tap to choose…'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dob ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {/* ── Location ─────────────────────────────────────────── */}
          <Text style={s.label}>City</Text>
          <View style={s.row}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={city}
              onChangeText={setCity}
              placeholder="San Francisco, CA"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TouchableOpacity
              style={s.locBtn}
              onPress={handleUseMyLocation}
              disabled={locating}
              activeOpacity={0.85}
            >
              {locating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={s.locBtnText}>📍 Use mine</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Phone ────────────────────────────────────────────── */}
          <Text style={s.label}>Phone number</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 555 123 4567"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            returnKeyType="done"
          />

          {/* ── Role ─────────────────────────────────────────────── */}
          <Text style={s.label}>I want to…</Text>
          <View style={s.roleRow}>
            <TouchableOpacity
              style={[s.roleCard, role === 'client' && s.roleCardSelected]}
              onPress={() => setRole('client')}
            >
              <Text style={s.roleIcon}>🙋</Text>
              <Text style={[s.roleLabel, role === 'client' && s.roleLabelSelected]}>
                Find a trainer
              </Text>
              <Text style={s.roleDesc}>I&apos;m looking for coaching</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.roleCard, role === 'trainer' && s.roleCardSelected]}
              onPress={() => setRole('trainer')}
            >
              <Text style={s.roleIcon}>🎯</Text>
              <Text style={[s.roleLabel, role === 'trainer' && s.roleLabelSelected]}>
                Coach others
              </Text>
              <Text style={s.roleDesc}>I&apos;m a trainer / coach</Text>
            </TouchableOpacity>
          </View>

          {/* ── Liability ────────────────────────────────────────── */}
          <TouchableOpacity
            style={s.liabilityRow}
            onPress={() => setLiability((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[s.checkbox, liability && s.checkboxOn]}>
              {liability && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.liabilityText}>
              I understand TrainerHub is a marketplace and is{' '}
              <Text style={{ fontWeight: '700' }}>not responsible</Text> for the trainers I meet
              or the outcomes of any sessions. I agree to vet trainers myself and to use the
              service at my own risk.
            </Text>
          </TouchableOpacity>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.button, isSaving && s.buttonDisabled]}
            onPress={handleContinue}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  accent: string,
  spacing: ReturnType<typeof useTheme>['spacing'],
  typography: ReturnType<typeof useTheme>['typography'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: colors.background },
    flex:    { flex: 1 },
    scroll:  { padding: spacing.lg, paddingBottom: spacing.xxl },
    title:   { fontSize: typography.display, fontWeight: '700', color: colors.ink, marginBottom: spacing.xs },
    subtitle:{ fontSize: typography.md, color: colors.muted, marginBottom: spacing.lg, lineHeight: 22 },
    label:   { fontSize: typography.sm, color: colors.muted, marginBottom: 6, marginTop: spacing.md, fontWeight: '500' },
    row:     { flexDirection: 'row', gap: 8 },
    input:   {
      borderWidth: 1, borderColor: colors.borderInput, borderRadius: radius.md,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: typography.base, color: colors.ink,
      backgroundColor: colors.surface,
    },
    inputText: { fontSize: typography.base },
    locBtn:  {
      backgroundColor: accent, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
      justifyContent: 'center', alignItems: 'center', minWidth: 110,
    },
    locBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    roleRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
    roleCard:{
      flex: 1, borderWidth: 2, borderColor: colors.border,
      borderRadius: radius.lg, padding: spacing.md, alignItems: 'center',
      backgroundColor: colors.surface,
    },
    roleCardSelected:{ borderColor: accent, backgroundColor: colors.surfaceCard },
    roleIcon:        { fontSize: 28, marginBottom: spacing.xs },
    roleLabel:       { fontSize: typography.md, fontWeight: '700', color: colors.muted },
    roleLabelSelected:{ color: colors.ink },
    roleDesc:        { fontSize: typography.xs, color: colors.placeholder, textAlign: 'center', marginTop: 4 },
    liabilityRow:    { flexDirection: 'row', gap: 12, marginTop: spacing.lg, alignItems: 'flex-start' },
    checkbox:        {
      width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    checkboxOn:      { backgroundColor: accent, borderColor: accent },
    checkmark:       { color: '#fff', fontSize: 14, fontWeight: '800' },
    liabilityText:   { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 19 },
    button:          {
      marginTop: spacing.xl, backgroundColor: accent, borderRadius: radius.md,
      paddingVertical: 14, alignItems: 'center',
    },
    buttonDisabled:  { opacity: 0.6 },
    buttonText:      { color: '#fff', fontSize: typography.base, fontWeight: '600' },
  });
}
