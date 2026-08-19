import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
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

import { EnergyHero } from '@/components/EnergyHero';
import { useAuth } from '@/lib/auth';
import { registerPushToken } from '@/lib/notifications';
import { useUpdateProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

type RoleChoice = 'trainer' | 'client';
const MIN_AGE = 13;

function isAtLeast(years: number, dob: Date): boolean {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return dob <= cutoff;
}
function formatDate(d: Date): string { return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }); }
function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

export default function Onboarding() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const { colors, accent } = useTheme();

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
        Alert.alert('Location off', 'No problem — type your city instead.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords({ lat, lng });
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
    const errorMessage = validate();
    if (errorMessage) return Alert.alert('Almost there', errorMessage);
    if (!session?.user.id || !dob) return;

    try {
      if (role !== profile?.role) {
        const { error } = await supabase.from('profiles').update({ role }).eq('id', session.user.id);
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
      await registerPushToken(session.user.id, { promptIfNeeded: true }).catch(() => null);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      Alert.alert('Setup failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const isSaving = updateProfile.isPending;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <EnergyHero eyebrow="SETUP" title="Tell us about you." subtitle="A few details help TrainerHub match, book and prepare the right experience." icon="person-outline" compact />

          <SectionLabel number="01" title="Basics" accent={accent} colors={colors} />
          <FieldLabel text="Full name" colors={colors} />
          <TextInput style={[styles.input, { borderColor: colors.borderInput, backgroundColor: colors.surfaceCard, color: colors.ink }]} value={name} onChangeText={setName} placeholder="Alex Johnson" placeholderTextColor={colors.placeholder} autoCapitalize="words" />

          <FieldLabel text="Date of birth" colors={colors} />
          <TouchableOpacity style={[styles.input, styles.dateInput, { borderColor: colors.borderInput, backgroundColor: colors.surfaceCard }]} onPress={() => setShowDatePicker((current) => !current)}>
            <Text style={{ color: dob ? colors.ink : colors.placeholder, fontSize: 16 }}>{dob ? formatDate(dob) : 'Choose date'}</Text>
            <Ionicons name="calendar-outline" size={17} color={accent} />
          </TouchableOpacity>
          {showDatePicker ? <DateTimePicker value={dob ?? new Date(2000, 0, 1)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()} onChange={handleDateChange} /> : null}

          <SectionLabel number="02" title="Where you train" accent={accent} colors={colors} />
          <FieldLabel text="City" colors={colors} />
          <View style={styles.locationRow}>
            <TextInput style={[styles.input, styles.locationInput, { borderColor: colors.borderInput, backgroundColor: colors.surfaceCard, color: colors.ink }]} value={city} onChangeText={setCity} placeholder="Atlanta, GA" placeholderTextColor={colors.placeholder} autoCapitalize="words" />
            <TouchableOpacity style={styles.locationBtn} onPress={handleUseMyLocation} disabled={locating}>
              {locating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="locate-outline" size={19} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>

          <FieldLabel text="Phone number" colors={colors} />
          <TextInput style={[styles.input, { borderColor: colors.borderInput, backgroundColor: colors.surfaceCard, color: colors.ink }]} value={phone} onChangeText={setPhone} placeholder="+1 555 123 4567" placeholderTextColor={colors.placeholder} keyboardType="phone-pad" />

          <SectionLabel number="03" title="How you use TrainerHub" accent={accent} colors={colors} />
          <View style={styles.roleRow}>
            <RoleChoice selected={role === 'client'} icon="search-outline" title="Find a trainer" detail="I’m looking for coaching" onPress={() => setRole('client')} accent={accent} colors={colors} rail={BRAND.purple} />
            <RoleChoice selected={role === 'trainer'} icon="people-outline" title="Coach others" detail="I’m a trainer or coach" onPress={() => setRole('trainer')} accent={accent} colors={colors} rail={BRAND.blue} />
          </View>

          <TouchableOpacity style={[styles.liabilityRow, { borderColor: colors.border }]} onPress={() => setLiability((current) => !current)} activeOpacity={0.84}>
            <View style={[styles.checkbox, { borderColor: liability ? accent : colors.border }, liability && { backgroundColor: BRAND.navy }]}>{liability ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}</View>
            <Text style={[styles.liabilityText, { color: colors.muted }]}>I understand TrainerHub is a marketplace. I’ll review trainers or clients myself and use the service at my own discretion.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primary, isSaving && { opacity: 0.6 }]} onPress={handleContinue} disabled={isSaving} activeOpacity={0.86}>
            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>Finish setup</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ text, colors }: { text: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <Text style={[styles.label, { color: colors.muted }]}>{text.toUpperCase()}</Text>;
}

function SectionLabel({ number, title, accent, colors }: { number: string; title: string; accent: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionNumber, { color: accent }]}>{number}</Text>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
      <View style={styles.sectionBeam} />
    </View>
  );
}

function RoleChoice({ selected, icon, title, detail, onPress, accent, colors, rail }: { selected: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void; accent: string; colors: ReturnType<typeof useTheme>['colors']; rail: string }) {
  return (
    <TouchableOpacity style={[styles.roleCard, { backgroundColor: selected ? BRAND.navy : colors.surfaceCard, borderColor: selected ? accent : colors.border }]} onPress={onPress}>
      <View style={[styles.roleRail, { backgroundColor: rail }]} />
      <Ionicons name={icon} size={21} color={selected ? '#FFFFFF' : accent} />
      <Text style={[styles.roleTitle, { color: selected ? '#FFFFFF' : colors.ink }]}>{title}</Text>
      <Text style={[styles.roleDetail, { color: selected ? '#AEBFD2' : colors.muted }]}>{detail}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 },
  scroll: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 52 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, marginTop: 28, marginBottom: 12 },
  sectionNumber: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionBeam: { flex: 1, height: 1, backgroundColor: BRAND.blue, opacity: 0.2, marginBottom: 5 },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 13, fontSize: 16 },
  dateInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationRow: { flexDirection: 'row', gap: 8 },
  locationInput: { flex: 1 },
  locationBtn: { width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.navy, borderRadius: 10 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleCard: { position: 'relative', overflow: 'hidden', flex: 1, minHeight: 126, borderWidth: 1, borderRadius: 13, padding: 14 },
  roleRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.75 },
  roleTitle: { fontSize: 14, fontWeight: '900', marginTop: 12 },
  roleDetail: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  liabilityRow: { flexDirection: 'row', gap: 11, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16, marginTop: 24 },
  checkbox: { width: 24, height: 24, borderWidth: 1.5, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  liabilityText: { flex: 1, fontSize: 12, lineHeight: 18 },
  primary: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND.navy, borderRadius: 10, paddingVertical: 15 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
