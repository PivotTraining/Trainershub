import { Ionicons } from '@expo/vector-icons';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import { ACCENT_COLORS, usePreferences, type AccentKey } from '@/lib/preferences';
import { pickAndUploadProfilePhoto, removeProfilePhoto } from '@/lib/profilePhoto';
import { useUpdateProfile } from '@/lib/queries/profile';
import { useTheme } from '@/lib/useTheme';
import { useState } from 'react';

export default function Personalize() {
  const { session, profile, retryProfile } = useAuth();
  const userId = session?.user.id ?? '';
  const { colors, accent, spacing, radius, typography } = useTheme();
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
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]}>
        <Text style={[styles.eyebrow, { color: accent }]}>MAKE IT YOURS</Text>
        <Text style={[styles.title, { color: colors.ink }]}>Personalize TrainerHub</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Choose the color you want TrainerHub to use and add a profile photo people can recognize.</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Profile photo</Text>
          <Text style={[styles.cardHelp, { color: colors.muted }]}>Your photo appears anywhere TrainerHub shows your public profile.</Text>

          <View style={styles.photoRow}>
            <Avatar
              seed={userId || 'trainerhub'}
              size={92}
              initial={profile?.full_name ?? profile?.email ?? 'You'}
              imageUrl={photoUrl}
            />
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: accent, borderRadius: radius.md }]}
                onPress={changePhoto}
                disabled={photoBusy}
              >
                {photoBusy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera-outline" size={17} color="#fff" />}
                <Text style={styles.primaryButtonText}>{photoUrl ? 'Change photo' : 'Add photo'}</Text>
              </TouchableOpacity>
              {photoUrl ? (
                <TouchableOpacity onPress={deletePhoto} disabled={photoBusy}>
                  <Text style={[styles.removeText, { color: colors.danger }]}>Remove photo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {Platform.OS !== 'web' ? (
            <Text style={[styles.webNote, { color: colors.muted, backgroundColor: colors.surfaceRaised }]}>Photo changes are currently available from TrainerHub in a web browser. Photos you upload there will still display in the native app.</Text>
          ) : (
            <Text style={[styles.webNote, { color: colors.muted, backgroundColor: colors.surfaceRaised }]}>Use a square photo for the cleanest result. JPG, PNG, WEBP, or HEIC up to 5 MB.</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>TrainerHub color</Text>
          <Text style={[styles.cardHelp, { color: colors.muted }]}>This changes buttons, highlights, active navigation, and other accents across your TrainerHub experience.</Text>

          <View style={styles.swatches}>
            {(Object.entries(ACCENT_COLORS) as [AccentKey, { label: string; value: string }][]).map(([key, item]) => {
              const selected = accentColor === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.colorOption, { borderColor: selected ? item.value : colors.border, backgroundColor: colors.surfaceRaised, borderRadius: radius.md }]}
                  onPress={() => setAccentColor(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Use ${item.label} as TrainerHub color`}
                >
                  <View style={[styles.colorCircle, { backgroundColor: item.value }]}>
                    {selected ? <Ionicons name="checkmark" size={20} color="#fff" /> : null}
                  </View>
                  <Text style={[styles.colorLabel, { color: colors.ink }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewEyebrow, { color: accent }]}>LIVE PREVIEW</Text>
              <Text style={[styles.previewTitle, { color: colors.ink }]}>This is your TrainerHub.</Text>
              <Text style={[styles.previewSub, { color: colors.muted }]}>Your selected color updates immediately.</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: accent, borderRadius: radius.md }]}>
              <Text style={styles.previewButtonText}>Continue</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.placeholder, fontSize: typography.xs }]}>Your color preference is private to you. Your profile photo is public wherever your TrainerHub profile is shown.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 48 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -0.7, marginTop: 5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 22 },
  card: { borderWidth: 1, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  cardHelp: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18 },
  photoActions: { flex: 1, alignItems: 'flex-start', gap: 10 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 11 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  removeText: { fontSize: 12, fontWeight: '800' },
  webNote: { fontSize: 11, lineHeight: 17, marginTop: 16, padding: 11, borderRadius: 10 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  colorOption: { width: '31%', minWidth: 122, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1.5, padding: 10 },
  colorCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  colorLabel: { fontSize: 12, fontWeight: '800' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginTop: 18 },
  previewEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  previewTitle: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  previewSub: { fontSize: 11, marginTop: 2 },
  previewButton: { paddingHorizontal: 13, paddingVertical: 9 },
  previewButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  footer: { textAlign: 'center', lineHeight: 18, marginTop: 2 },
});
