import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BrandLockup } from '@/components/BrandLockup';
import { usePublicTrainerDirectory } from '@/lib/queries/browse';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export default function PublicTrainerDirectory() {
  const router = useRouter();
  const { colors, accent } = useTheme();
  const { data: trainers = [], isLoading, error } = usePublicTrainerDirectory();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandLockup compact />
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={[styles.signIn, { color: accent }]}>Sign in</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>TRAINER DIRECTORY</Text>
          <Text style={styles.title}>Find the right trainer for your goals.</Text>
          <Text style={styles.sub}>Browse TrainerHub professionals by specialty, location, coaching style, session type, ratings, and price.</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator /></View>
        ) : error ? (
          <View style={styles.center}><Text style={{ color: colors.muted }}>Trainer directory is temporarily unavailable.</Text></View>
        ) : trainers.length === 0 ? (
          <View style={styles.center}><Text style={{ color: colors.muted }}>No trainer profiles are published yet.</Text></View>
        ) : (
          <View style={styles.grid}>
            {trainers.map((trainer) => {
              const name = trainer.full_name ?? 'Trainer';
              const rate = trainer.hourly_rate_cents != null ? `$${Math.round(trainer.hourly_rate_cents / 100)}/hr` : 'Rate on request';
              return (
                <TouchableOpacity
                  key={trainer.user_id}
                  activeOpacity={0.82}
                  onPress={() => router.push(`/trainers/${trainer.user_id}`)}
                  style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
                >
                  <Avatar seed={trainer.user_id} size={64} initial={name} imageUrl={trainer.avatar_url} />
                  <View style={styles.cardBody}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
                      {trainer.is_verified ? <Ionicons name="checkmark-circle" size={16} color={accent} /> : null}
                    </View>
                    {trainer.location ? <Text style={[styles.meta, { color: colors.muted }]}>{trainer.location}</Text> : null}
                    <Text style={[styles.meta, { color: colors.muted }]}>{trainer.avg_rating > 0 ? `${trainer.avg_rating.toFixed(1)} ★ · ${trainer.review_count} reviews` : 'New on TrainerHub'}</Text>
                    <Text style={[styles.rate, { color: colors.ink }]}>{rate}</Text>
                    {trainer.specialties.length > 0 ? <Text numberOfLines={2} style={[styles.specialties, { color: colors.inkSoft }]}>{trainer.specialties.slice(0, 4).join(' · ')}</Text> : null}
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 20, paddingBottom: 64 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  signIn: { fontSize: 13, fontWeight: '900' },
  hero: { backgroundColor: BRAND.navy, borderRadius: 24, padding: 24, marginBottom: 24 },
  eyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 36, lineHeight: 40, fontWeight: '900', letterSpacing: -0.8, marginTop: 8, maxWidth: 680 },
  sub: { color: '#AEBFD2', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 720 },
  center: { paddingVertical: 56, alignItems: 'center' },
  grid: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 16 },
  cardBody: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 18, fontWeight: '900' },
  meta: { fontSize: 12, fontWeight: '600' },
  rate: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  specialties: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
