import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import {
  useMyPackages,
  useCreatePackage,
  useDeletePackage,
  useMyPackagePurchases,
} from '@/lib/queries/packages';
import { radius, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { Package, PackagePurchase } from '@/lib/types';

// ── Trainer: create package modal ──────────────────────────────────────────────

interface CreatePackageModalProps {
  visible: boolean;
  trainerId: string;
  onClose: () => void;
}

function CreatePackageModal({ visible, trainerId, onClose }: CreatePackageModalProps) {
  const { colors, accent } = useTheme();
  const createPackage = useCreatePackage(trainerId);
  const [title, setTitle] = useState('');
  const [sessionCount, setSessionCount] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setTitle('');
    setSessionCount('');
    setPriceDollars('');
    setDescription('');
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a package title.');
      return;
    }
    const count = parseInt(sessionCount, 10);
    if (isNaN(count) || count < 1) {
      Alert.alert('Invalid sessions', 'Enter a valid session count.');
      return;
    }
    const price = parseFloat(priceDollars);
    if (isNaN(price) || price < 0) {
      Alert.alert('Invalid price', 'Enter a valid price in dollars.');
      return;
    }
    try {
      await createPackage.mutateAsync({
        title: title.trim(),
        session_count: count,
        price_cents: Math.round(price * 100),
        description: description.trim() || null,
        is_active: true,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.ink }]}>Create Package</Text>
          <TouchableOpacity onPress={handleCreate} disabled={createPackage.isPending}>
            {createPackage.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={[styles.modalSave, { color: accent }]}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={[styles.label, { color: colors.muted }]}>Title</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.borderInput, color: colors.ink }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. 5-Session Starter Pack"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Number of Sessions</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.borderInput, color: colors.ink }]}
            value={sessionCount}
            onChangeText={setSessionCount}
            placeholder="e.g. 5"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
          />
          <Text style={[styles.label, { color: colors.muted }]}>Total Price (USD)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.borderInput, color: colors.ink }]}
            value={priceDollars}
            onChangeText={setPriceDollars}
            placeholder="e.g. 250.00"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, { color: colors.muted }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline, { borderColor: colors.borderInput, color: colors.ink }]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's included…"
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Trainer package card ───────────────────────────────────────────────────────

interface TrainerPackageCardProps {
  pkg: Package;
  trainerId: string;
}

function TrainerPackageCard({ pkg, trainerId }: TrainerPackageCardProps) {
  const { colors } = useTheme();
  const deletePackage = useDeletePackage(trainerId);
  const pricePerSession =
    pkg.session_count > 0
      ? (pkg.price_cents / pkg.session_count / 100).toFixed(2)
      : '—';
  const totalPrice = (pkg.price_cents / 100).toFixed(2);

  const handleDelete = () => {
    Alert.alert('Delete package?', `"${pkg.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePackage.mutateAsync(pkg.id);
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={[styles.packageTitle, { color: colors.ink }]}>{pkg.title}</Text>
          <Text style={[styles.packageMeta, { color: colors.muted }]}>
            {pkg.session_count} sessions · ${pricePerSession}/session
          </Text>
          {pkg.description ? (
            <Text style={[styles.packageDesc, { color: colors.muted }]} numberOfLines={2}>
              {pkg.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.packagePrice, { color: colors.ink }]}>${totalPrice}</Text>
          <TouchableOpacity onPress={handleDelete} disabled={deletePackage.isPending} style={styles.deleteBtn}>
            {deletePackage.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={[styles.deleteBtnText, { color: colors.danger }]}>✕</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Client purchase card ───────────────────────────────────────────────────────

interface PurchaseCardProps {
  purchase: PackagePurchase;
}

function PurchaseCard({ purchase }: PurchaseCardProps) {
  const { colors, accent } = useTheme();
  const total = purchase.package?.session_count ?? 0;
  const remaining = purchase.sessions_remaining;
  const used = total - remaining;
  const progress = total > 0 ? used / total : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <Text style={[styles.packageTitle, { color: colors.ink }]}>
        {purchase.package?.title ?? 'Package'}
      </Text>
      <Text style={[styles.packageMeta, { color: colors.muted }]}>
        {remaining} / {total} sessions remaining
      </Text>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceRaised }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: accent, width: `${Math.min(progress * 100, 100)}%` as unknown as number },
          ]}
        />
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function Packages() {
  const { session, profile } = useAuth();
  const userId = session?.user.id ?? '';
  const isTrainer = profile?.role === 'trainer';
  const { colors, accent } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const trainerPackagesQuery = useMyPackages(isTrainer ? userId : undefined);
  const clientPurchasesQuery = useMyPackagePurchases(!isTrainer ? userId : undefined);

  const isLoading = isTrainer ? trainerPackagesQuery.isLoading : clientPurchasesQuery.isLoading;
  const isFetching = isTrainer ? trainerPackagesQuery.isFetching : clientPurchasesQuery.isFetching;
  const refetch = isTrainer ? trainerPackagesQuery.refetch : clientPurchasesQuery.refetch;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isTrainer) {
    const packages = trainerPackagesQuery.data ?? [];
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <FlatList
          data={packages}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, packages.length === 0 && { flex: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !trainerPackagesQuery.isLoading}
              onRefresh={refetch}
            />
          }
          renderItem={({ item }) => (
            <TrainerPackageCard pkg={item} trainerId={userId} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                No packages yet. Create one to offer bundles to clients.
              </Text>
            </View>
          }
        />
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: accent }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.fabText}>+ Create Package</Text>
        </TouchableOpacity>
        <CreatePackageModal
          visible={showCreateModal}
          trainerId={userId}
          onClose={() => setShowCreateModal(false)}
        />
      </SafeAreaView>
    );
  }

  // Client view
  const purchases = clientPurchasesQuery.data ?? [];
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Text style={[styles.screenTitle, { color: colors.ink }]}>My Packages</Text>
      <FlatList
        data={purchases}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, purchases.length === 0 && { flex: 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !clientPurchasesQuery.isLoading}
            onRefresh={refetch}
          />
        }
        renderItem={({ item }) => <PurchaseCard purchase={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.placeholder }]}>
              Browse trainers to purchase session packages.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 100 },
  screenTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: typography.sm, textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: spacing.xs },
  packageTitle: { fontSize: typography.md, fontWeight: '600' },
  packageMeta: { fontSize: typography.xs, marginTop: 2 },
  packageDesc: { fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' },
  packagePrice: { fontSize: typography.lg, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: typography.lg, fontWeight: '600' },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: radius.pill },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: typography.md },
  // Modal
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: typography.md, fontWeight: '700' },
  modalCancel: { fontSize: typography.md },
  modalSave: { fontSize: typography.md, fontWeight: '600' },
  modalContent: { padding: spacing.lg },
  label: { fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.base,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
