/**
 * ShareableProfileCard — printable, downloadable trainer card for social media.
 *
 * The card layout is captured to a PNG via react-native-view-shot, then handed
 * to the system share sheet (or saved to camera roll on iOS).  The QR code on
 * the card encodes a deep link back to the trainer's profile on the app.
 */
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { Logo } from '@/components/Logo';
import { useTheme } from '@/lib/useTheme';

interface ShareableProfileCardProps {
  trainerId: string;
  trainerName: string;
  specialty: string | null;
  city: string | null;
  rating: number | null;
  reviewCount: number;
  visible: boolean;
  onClose: () => void;
}

const APP_URL_BASE = 'https://trainerhub.app/t/';

export function ShareableProfileCard({
  trainerId, trainerName, specialty, city, rating, reviewCount,
  visible, onClose,
}: ShareableProfileCardProps) {
  const { colors, accent } = useTheme();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const profileUrl = `${APP_URL_BASE}${trainerId}`;

  const handleShare = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your TrainerHub card' });
      } else {
        Alert.alert('Saved', 'Card image is ready.');
      }
    } catch (e: unknown) {
      Alert.alert('Could not share', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow photo library access to save the card.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Card saved to your photo library.');
    } catch (e: unknown) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.headerBtn, { color: colors.muted }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>Share your card</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.cardWrap}>
          <ViewShot
            ref={cardRef as unknown as React.RefObject<ViewShot>}
            options={{ format: 'png', quality: 1 }}
            style={[styles.card, { backgroundColor: '#fff' }]}
          >
            <View style={[styles.cardHeader, { backgroundColor: accent }]}>
              <Logo size={36} background="none" color="#fff" />
              <Text style={styles.cardBrand}>TrainerHub</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{trainerName}</Text>
              {specialty && (
                <Text style={[styles.cardSpecialty, { color: accent }]}>{specialty}</Text>
              )}
              {city && <Text style={styles.cardCity}>{city}</Text>}

              {rating !== null && reviewCount > 0 && (
                <Text style={styles.cardRating}>
                  ⭐ {rating.toFixed(1)} ({reviewCount} review{reviewCount === 1 ? '' : 's'})
                </Text>
              )}

              <View style={styles.qrWrap}>
                <QRCode value={profileUrl} size={140} />
              </View>

              <Text style={styles.cardCta}>Book a session on TrainerHub</Text>
              <Text style={styles.cardUrl}>{profileUrl}</Text>
            </View>
          </ViewShot>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: accent }]}
            onPress={handleShare}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Share</Text>}
          </TouchableOpacity>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surfaceCard, borderColor: colors.border, borderWidth: 1 }]}
              onPress={handleSave}
              disabled={busy}
            >
              <Text style={[styles.actionBtnText, { color: colors.ink }]}>Save to Photos</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  headerBtn: { fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: '700' },

  cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: 320,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  cardBrand:  { color: '#fff', fontSize: 18, fontWeight: '800' },

  cardBody:   { padding: 22, alignItems: 'center' },
  cardName:   { fontSize: 26, fontWeight: '800', color: '#111', textAlign: 'center' },
  cardSpecialty: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize', marginTop: 6 },
  cardCity:   { fontSize: 13, color: '#666', marginTop: 2 },
  cardRating: { fontSize: 13, color: '#444', marginTop: 8, fontWeight: '600' },
  qrWrap:     { marginTop: 18, padding: 10, backgroundColor: '#fff', borderRadius: 12 },
  cardCta:    { fontSize: 13, color: '#444', marginTop: 14, fontWeight: '600' },
  cardUrl:    { fontSize: 11, color: '#999', marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 10, padding: 18 },
  actionBtn:  { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
