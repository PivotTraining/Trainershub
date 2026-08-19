import { Ionicons } from '@expo/vector-icons';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { EnergyHero } from '@/components/EnergyHero';
import { useAuth } from '@/lib/auth';
import { ACCENT_COLORS, usePreferences, type AccentKey } from '@/lib/preferences';
import { pickAndUploadProfilePhoto, removeProfilePhoto } from '@/lib/profilePhoto';
import { useUpdateProfile } from '@/lib/queries/profile';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export default function Personalize() {
  const { session, profile, retryProfile } = useAuth();
  const userId = session?.user.id ?? '';
  const { colors, accent, spacing, typography } = useTheme();
  const { accentColor, setAccentColor } = usePreferences();
  const updateProfile = useUpdateProfile();
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const changePhoto = async () => {
    if (!userId) return;
    setPhotoBusy(true);
    try {
      const url = await pickAndUploadProfilePhoto(userId);
      if (!url) return;
      await updateProfile.mutateAsync({ id: userId, avatar_url: url });
      setPhotoUrl(url);
      retryProfile();
    } catch (error: unknown) {
      Alert.alert('Could not update photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const deletePhoto = async () => {
    if (!userId || !photoUrl) return;
    setPhotoBusy(true);
    try {
      await removeProfilePhoto(userId);
      await updateProfile.mutateAsync({ id: userId, avatar_url: null });
      setPhotoUrl(null);
      retryProfile();
    } catch (error: unknown) {
      Alert.alert('Could not remove photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]} showsVerticalScrollIndicator={false}>
        <EnergyHero eyebrow="MAKE IT YOURS" title="Personalize TrainerHub" subtitle="Choose the energy color you want across the app and add a profile photo people recognize." icon="color-palette-outline" compact />

        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.sectionRail, { backgroundColor: BRAND.blue }]} />
          <Text style={[styles.cardEyebrow, { color: accent }]}>IDENTITY</Text>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Profile photo</Text>
          <Text style={[styles.cardHelp, { color: colors.muted }]}>Your photo appears anywhere TrainerHub shows your public profile.</Text>

          <View style={styles.photoRow}>
            <Avatar seed={userId || 'trainerhub'} size={96} initial={profile?.full_name ?? profile?.email ?? 'You'} imageUrl={photoUrl} />
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.primaryButton} onPress={changePhoto} disabled={photoBusy}>
                {photoBusy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera-outline" size={17} color="#fff" />}
                <Text style={styles.primaryButtonText}>{photoUrl ? 'Change photo' : 'Add photo'}</Text>
              </TouchableOpacity>
              {photoUrl ? <TouchableOpacity onPress={deletePhoto} disabled={photoBusy}><Text style={[styles.removeText, { color: colors.danger }]}>Remove photo</Text></TouchableOpacity> : null}
            </View>
          </View>

          <Text style={[styles.note, { color: colors.muted, borderColor: colors.border }]}> 
            {Platform.OS !== 'web'
              ? 'Photo changes are currently available from TrainerHub in a web browser. Photos uploaded there still display in the native app.'
              : 'Use a square photo for the cleanest result. JPG, PNG, WEBP, or HEIC up to 5 MB.'}
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.sectionRail, { backgroundColor: BRAND.purple }]} />
          <Text style={[styles.cardEyebrow, { color: accent }]}>ENERGY COLOR</Text>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Choose your light</Text>
          <Text style={[styles.cardHelp, { color: colors.muted }]}>The core TrainerHub identity stays navy. Your color changes highlights, rails, progress and interactive light.</Text>

          <View style={styles.swatches}>
            {(Object.entries(ACCENT_COLORS) as [AccentKey, { label: string; value: string }][]).map(([key, item]) => {
              const selected = accentColor === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.colorOption, { borderColor: selected ? item.value : colors.border, backgroundColor: selected ? BRAND.navy : colors.surfaceRaised }]}
                  onPress={() => setAccentColor(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Use ${item.label} as TrainerHub color`}
                >
                  <View style={[styles.colorBeam, { backgroundColor: item.value }]} />
                  <Text style={[styles.colorLabel, { color: selected ? '#FFFFFF' : colors.ink }]}>{item.label}</Text>
                  {selected ? <Ionicons name="checkmark" size={17} color="#fff" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.preview}>
            <View style={[styles.previewBeam, { backgroundColor: accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewEyebrow, { color: accent }]}>LIVE PREVIEW</Text>
              <Text style={[styles.previewTitle, { color: colors.ink }]}>This is your TrainerHub.</Text>
              <Text style={[styles.previewSub, { color: colors.muted }]}>Your selected light updates immediately.</Text>
            </View>
            <View style={styles.previewButton}><Text style={styles.previewButtonText}>Continue</Text></View>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.placeholder, fontSize: typography.xs }]}>Your color preference is private to you. Your profile photo is public wherever your TrainerHub profile is shown.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 48, gap: 16 },
  sectionCard: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: 16, padding: 18 },
  sectionRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.72 },
  cardEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  cardTitle: { fontSize: 19, fontWeight: '900', marginTop: 3 },
  cardHelp: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18 },
  photoActions: { flex: 1, alignItems: 'flex-start', gap: 10 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 10, backgroundColor: BRAND.navy },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  removeText: { fontSize: 12, fontWeight: '800' },
  note: { fontSize: 11, lineHeight: 17, marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
  swatches: { gap: 8, marginTop: 16 },
  colorOption: { position: 'relative', overflow: 'hidden', minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  colorBeam: { width: 52, height: 3, borderRadius: 2 },
  colorLabel: { flex: 1, fontSize: 12, fontWeight: '800' },
  preview: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#DFE6EF', paddingTop: 16, marginTop: 18 },
  previewBeam: { position: 'absolute', top: -1, left: 0, width: 120, height: 2, opacity: 0.8 },
  previewEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  previewTitle: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  previewSub: { fontSize: 11, marginTop: 2 },
  previewButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9, backgroundColor: BRAND.navy },
  previewButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  footer: { textAlign: 'center', lineHeight: 18, marginTop: 2 },
});
