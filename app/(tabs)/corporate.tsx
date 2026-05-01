/**
 * Corporate / B2B hub screen.
 *
 * Three states:
 * 1. No corporate account → onboarding CTA to create one.
 * 2. Member (not admin) → read-only "Your benefit" card.
 * 3. Admin/owner → full HR dashboard with seat gauge, member list, invite flow.
 */
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

import {
  useBulkInviteMembers,
  useCorporateMembers,
  useCreateCorporateAccount,
  useInviteMember,
  useMyCorporateAccount,
  useMyCorpAdminRole,
  usePendingInvites,
  useReactivateMember,
  useRevokeInvite,
  useSeatUsage,
  useSuspendMember,
} from '@/lib/queries/corporate';
import { useTheme } from '@/lib/useTheme';
import type { CorporateMemberWithProfile, CorporateInvite } from '@/lib/types/corporate';

// ── Seat gauge ────────────────────────────────────────────────────────────────

function SeatGauge({ used, total, accent }: { used: number; total: number; accent: string }) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0;
  const { colors } = useTheme();
  return (
    <View style={gauge.wrap}>
      <View style={[gauge.track, { backgroundColor: colors.border }]}>
        <View style={[gauge.fill, { width: `${pct * 100}%`, backgroundColor: accent }]} />
      </View>
      <Text style={[gauge.label, { color: colors.muted }]}>
        {used} / {total} seats used
      </Text>
    </View>
  );
}

const gauge = StyleSheet.create({
  wrap:  { gap: 6, marginBottom: 20 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill:  { height: 8, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '600' },
});

// ── Member row ────────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: CorporateMemberWithProfile;
  acctId: string;
  isAdmin: boolean;
}

function MemberRow({ member, acctId, isAdmin }: MemberRowProps) {
  const { colors } = useTheme();
  const suspend    = useSuspendMember();
  const reactivate = useReactivateMember();
  const isSuspended = member.status === 'suspended';

  const handleToggle = () => {
    if (isSuspended) {
      reactivate.mutate({ memberId: member.id, acctId });
    } else {
      Alert.alert(
        'Suspend member?',
        `${member.profile.full_name ?? member.profile.email} will lose access.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Suspend',
            style: 'destructive',
            onPress: () => suspend.mutate({ memberId: member.id, acctId }),
          },
        ],
      );
    }
  };

  return (
    <View style={[mrow.wrap, { borderBottomColor: colors.border }]}>
      <View style={mrow.info}>
        <Text style={[mrow.name, { color: colors.ink }]} numberOfLines={1}>
          {member.profile.full_name ?? '—'}
        </Text>
        <Text style={[mrow.email, { color: colors.muted }]} numberOfLines={1}>
          {member.profile.email}
        </Text>
      </View>
      <View style={mrow.right}>
        <View style={[mrow.badge, { backgroundColor: isSuspended ? '#FEF2F2' : '#F0FDF4' }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: isSuspended ? '#DC2626' : '#16A34A' }}>
            {isSuspended ? 'Suspended' : 'Active'}
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={handleToggle} style={mrow.toggleBtn}>
            <Text style={[mrow.toggleText, { color: isSuspended ? '#16A34A' : '#DC2626' }]}>
              {isSuspended ? 'Restore' : 'Suspend'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const mrow = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  info:       { flex: 1, gap: 2 },
  name:       { fontSize: 14, fontWeight: '600' },
  email:      { fontSize: 12 },
  right:      { alignItems: 'flex-end', gap: 4 },
  badge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  toggleBtn:  { paddingHorizontal: 4 },
  toggleText: { fontSize: 12, fontWeight: '600' },
});

// ── Invite row ────────────────────────────────────────────────────────────────

function InviteRow({ invite, isAdmin }: { invite: CorporateInvite; isAdmin: boolean }) {
  const { colors } = useTheme();
  const revoke = useRevokeInvite();
  return (
    <View style={[irow.wrap, { borderBottomColor: colors.border }]}>
      <Text style={[irow.email, { color: colors.ink }]} numberOfLines={1}>{invite.email}</Text>
      <View style={irow.right}>
        <Text style={[irow.expires, { color: colors.muted }]}>
          Expires {new Date(invite.expires_at).toLocaleDateString()}
        </Text>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => revoke.mutate({ inviteId: invite.id, acctId: invite.corporate_account_id })}
          >
            <Text style={irow.revoke}>Revoke</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const irow = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  email:   { flex: 1, fontSize: 13, fontWeight: '500' },
  right:   { alignItems: 'flex-end', gap: 2 },
  expires: { fontSize: 11 },
  revoke:  { fontSize: 12, fontWeight: '600', color: '#DC2626' },
});

// ── Create account modal ──────────────────────────────────────────────────────

function CreateAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, accent } = useTheme();
  const create = useCreateCorporateAccount();
  const [name, setName]   = useState('');
  const [domain, setDomain] = useState('');
  const [seats, setSeats] = useState('10');

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    try {
      await create.mutateAsync({
        name: name.trim(),
        domain: domain.trim() || undefined,
        seat_count: parseInt(seats, 10) || 10,
      });
      onClose();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[cam.root, { backgroundColor: colors.background }]}>
        <View style={cam.header}>
          <Text style={[cam.title, { color: colors.ink }]}>Create corporate account</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: accent, fontSize: 16 }}>Cancel</Text></TouchableOpacity>
        </View>

        <Text style={[cam.label, { color: colors.muted }]}>Company name</Text>
        <TextInput style={[cam.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surface }]}
          placeholder="Acme Inc." placeholderTextColor={colors.placeholder}
          value={name} onChangeText={setName} />

        <Text style={[cam.label, { color: colors.muted }]}>Email domain (optional)</Text>
        <TextInput style={[cam.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surface }]}
          placeholder="acme.com" placeholderTextColor={colors.placeholder} autoCapitalize="none"
          value={domain} onChangeText={setDomain} keyboardType="url" />

        <Text style={[cam.label, { color: colors.muted }]}>Seat count</Text>
        <TextInput style={[cam.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surface }]}
          placeholder="10" placeholderTextColor={colors.placeholder} keyboardType="number-pad"
          value={seats} onChangeText={setSeats} />

        <TouchableOpacity
          style={[cam.btn, { backgroundColor: accent }]}
          onPress={handleCreate}
          disabled={create.isPending}
        >
          {create.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={cam.btnText}>Create account</Text>}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const cam = StyleSheet.create({
  root:    { flex: 1, padding: 24 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title:   { fontSize: 20, fontWeight: '700' },
  label:   { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 16 },
  input:   { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  btn:     { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({ visible, acctId, onClose }: { visible: boolean; acctId: string; onClose: () => void }) {
  const { colors, accent } = useTheme();
  const invite     = useInviteMember();
  const bulkInvite = useBulkInviteMembers();
  const [text, setText] = useState('');
  const isMulti = text.includes('\n') || text.includes(',');

  const handleInvite = async () => {
    const raw = text.trim();
    if (!raw) return;
    try {
      if (isMulti) {
        const emails = raw.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
        await bulkInvite.mutateAsync({ corporate_account_id: acctId, emails });
        Alert.alert('Invites sent', `${emails.length} invites queued.`);
      } else {
        await invite.mutateAsync({ corporate_account_id: acctId, email: raw });
        Alert.alert('Invite sent', `Invite sent to ${raw}`);
      }
      setText('');
      onClose();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const isPending = invite.isPending || bulkInvite.isPending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[cam.root, { backgroundColor: colors.background }]}>
        <View style={cam.header}>
          <Text style={[cam.title, { color: colors.ink }]}>Invite members</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: accent, fontSize: 16 }}>Cancel</Text></TouchableOpacity>
        </View>
        <Text style={[cam.label, { color: colors.muted }]}>Email address(es)</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
          One email per line, or comma-separated for bulk invite.
        </Text>
        <TextInput
          style={[cam.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surface, height: 120, textAlignVertical: 'top' }]}
          placeholder={'jane@acme.com\njohn@acme.com'}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          multiline
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity
          style={[cam.btn, { backgroundColor: accent }]}
          onPress={handleInvite}
          disabled={isPending}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={cam.btnText}>{isMulti ? 'Send all invites' : 'Send invite'}</Text>}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CorporateScreen() {
  const { colors, accent, spacing, typography, radius } = useTheme();
  const accountQuery = useMyCorporateAccount();
  const account      = accountQuery.data;
  const acctId       = account?.id;

  const adminRoleQuery = useMyCorpAdminRole(acctId);
  const adminRole      = adminRoleQuery.data;
  const isAdmin        = !!adminRole;

  const membersQuery  = useCorporateMembers(acctId);
  const invitesQuery  = usePendingInvites(acctId);
  const seatQuery     = useSeatUsage(acctId);

  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const isLoading = accountQuery.isLoading;

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  // ── No account ──────────────────────────────────────────────────────────────
  if (!account) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={[s.inner, { paddingHorizontal: spacing.lg }]}>
          <Text style={[s.pageTitle, { color: colors.ink, fontSize: typography.xxl }]}>
            Corporate accounts
          </Text>
          <View style={[s.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <Text style={[s.cardTitle, { color: colors.ink }]}>Set up your company</Text>
            <Text style={[s.cardBody, { color: colors.muted }]}>
              Create a corporate account to give your team access to TrainerHub. Employees book sessions with no payment friction — everything is billed to your company.
            </Text>
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: accent, borderRadius: radius.lg }]}
              onPress={() => setShowCreate(true)}
            >
              <Text style={s.primaryBtnText}>Create corporate account</Text>
            </TouchableOpacity>
          </View>

          <View style={[s.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border, marginTop: 12 }]}>
            <Text style={[s.cardTitle, { color: colors.ink }]}>Already have an invite?</Text>
            <Text style={[s.cardBody, { color: colors.muted }]}>
              Check your email for an invite link from your HR team. Tap it to join your company's account automatically.
            </Text>
          </View>
        </ScrollView>
        <CreateAccountModal visible={showCreate} onClose={() => setShowCreate(false)} />
      </SafeAreaView>
    );
  }

  // ── Member (not admin) — read-only benefit card ─────────────────────────────
  if (!isAdmin) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={[s.inner, { paddingHorizontal: spacing.lg }]}>
          <Text style={[s.pageTitle, { color: colors.ink, fontSize: typography.xxl }]}>
            Corporate benefit
          </Text>
          <View style={[s.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <Text style={[s.acctName, { color: accent }]}>{account.name}</Text>
            <Text style={[s.cardBody, { color: colors.muted }]}>
              Your sessions are covered by your company. Book any trainer and your company's account will be charged — you'll never see a payment screen.
            </Text>
          </View>
          {seatQuery.data && (
            <View style={[s.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border, marginTop: 12 }]}>
              <Text style={[s.cardTitle, { color: colors.ink }]}>Company usage</Text>
              <SeatGauge used={seatQuery.data.seats_used} total={seatQuery.data.seat_count} accent={accent} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Admin dashboard ─────────────────────────────────────────────────────────
  const members = membersQuery.data ?? [];
  const invites = invitesQuery.data ?? [];
  const seats   = seatQuery.data;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[s.inner, { paddingHorizontal: spacing.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={membersQuery.isFetching || invitesQuery.isFetching}
            onRefresh={() => { membersQuery.refetch(); invitesQuery.refetch(); seatQuery.refetch(); }}
            tintColor={accent}
          />
        }
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={[s.pageTitle, { color: colors.ink, fontSize: typography.xxl }]}>
              {account.name}
            </Text>
            <Text style={[s.planBadge, { color: accent }]}>
              {account.plan.charAt(0).toUpperCase() + account.plan.slice(1)} plan
            </Text>
          </View>
          <TouchableOpacity
            style={[s.inviteBtn, { backgroundColor: accent, borderRadius: radius.md }]}
            onPress={() => setShowInvite(true)}
          >
            <Text style={s.inviteBtnText}>+ Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Seat gauge */}
        {seats && (
          <View style={[s.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <Text style={[s.cardTitle, { color: colors.ink }]}>Seat usage</Text>
            <SeatGauge used={seats.seats_used} total={seats.seat_count} accent={accent} />
          </View>
        )}

        {/* Members */}
        <View style={[s.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border, marginTop: 12 }]}>
          <Text style={[s.cardTitle, { color: colors.ink }]}>
            Members ({members.length})
          </Text>
          {members.length === 0 ? (
            <Text style={[s.empty, { color: colors.placeholder }]}>No members yet.</Text>
          ) : (
            members.map((m) => (
              <MemberRow key={m.id} member={m} acctId={account.id} isAdmin={isAdmin} />
            ))
          )}
        </View>

        {/* Pending invites */}
        {invites.length > 0 && (
          <View style={[s.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border, marginTop: 12 }]}>
            <Text style={[s.cardTitle, { color: colors.ink }]}>
              Pending invites ({invites.length})
            </Text>
            {invites.map((inv) => (
              <InviteRow key={inv.id} invite={inv} isAdmin={isAdmin} />
            ))}
          </View>
        )}
      </ScrollView>

      <InviteModal
        visible={showInvite}
        acctId={account.id}
        onClose={() => setShowInvite(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:  { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { paddingTop: 16, paddingBottom: 40 },

  pageTitle: { fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  planBadge: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  acctName:  { fontSize: 22, fontWeight: '800', marginBottom: 8 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inviteBtn:     { paddingHorizontal: 16, paddingVertical: 10 },
  inviteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  cardBody:  { fontSize: 14, lineHeight: 22 },
  empty:     { fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },

  primaryBtn:     { marginTop: 16, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
