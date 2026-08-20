import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { EnergyHero } from '@/components/EnergyHero';
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
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { CorporateInvite, CorporateMemberWithProfile } from '@/lib/types/corporate';

function SeatGauge({ used, total, accent }: { used: number; total: number; accent: string }) {
  const { colors } = useTheme();
  const pct = total ? Math.min(used / total, 1) : 0;
  return (
    <View style={styles.gaugeWrap}>
      <View style={[styles.gaugeTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.gaugeFill, { width: `${pct * 100}%`, backgroundColor: accent }]} />
      </View>
      <Text style={[styles.gaugeLabel, { color: colors.muted }]}>{used} / {total} seats used</Text>
    </View>
  );
}

function MemberRow({ member, acctId, isAdmin }: { member: CorporateMemberWithProfile; acctId: string; isAdmin: boolean }) {
  const { colors, accent } = useTheme();
  const suspend = useSuspendMember();
  const reactivate = useReactivateMember();
  const suspended = member.status === 'suspended';

  const toggle = () => {
    if (suspended) {
      reactivate.mutate({ memberId: member.id, acctId });
      return;
    }
    Alert.alert('Suspend member?', `${member.profile.full_name ?? member.profile.email} will lose access.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => suspend.mutate({ memberId: member.id, acctId }) },
    ]);
  };

  return (
    <View style={[styles.personRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.personRail, { backgroundColor: suspended ? colors.danger : accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.personName, { color: colors.ink }]}>{member.profile.full_name ?? '—'}</Text>
        <Text style={[styles.personMeta, { color: colors.muted }]}>{member.profile.email}</Text>
      </View>
      <Text style={[styles.statusText, { color: suspended ? colors.danger : colors.success }]}>{suspended ? 'SUSPENDED' : 'ACTIVE'}</Text>
      {isAdmin ? (
        <TouchableOpacity onPress={toggle}>
          <Text style={{ color: suspended ? colors.success : colors.danger, fontSize: 11, fontWeight: '800' }}>{suspended ? 'Restore' : 'Suspend'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function InviteRow({ invite, isAdmin }: { invite: CorporateInvite; isAdmin: boolean }) {
  const { colors, accent } = useTheme();
  const revoke = useRevokeInvite();
  return (
    <View style={[styles.personRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.personRail, { backgroundColor: BRAND.blue }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.personName, { color: colors.ink }]}>{invite.email}</Text>
        <Text style={[styles.personMeta, { color: colors.muted }]}>Expires {new Date(invite.expires_at).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.statusText, { color: accent }]}>PENDING</Text>
      {isAdmin ? (
        <TouchableOpacity onPress={() => revoke.mutate({ inviteId: invite.id, acctId: invite.corporate_account_id })}>
          <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '800' }}>Revoke</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function CreateAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, accent } = useTheme();
  const create = useCreateCorporateAccount();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [seats, setSeats] = useState('10');

  const handle = async () => {
    if (!name.trim()) return Alert.alert('Name required');
    try {
      await create.mutateAsync({ name: name.trim(), domain: domain.trim() || undefined, seat_count: parseInt(seats, 10) || 10 });
      onClose();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={styles.modalHead}>
          <Text style={[styles.modalTitle, { color: colors.ink }]}>Create corporate account</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: accent }}>Cancel</Text></TouchableOpacity>
        </View>
        <FormLabel text="COMPANY NAME" colors={colors} />
        <TextInput style={[styles.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surfaceCard }]} value={name} onChangeText={setName} placeholder="Acme Inc." placeholderTextColor={colors.placeholder} />
        <FormLabel text="EMAIL DOMAIN · OPTIONAL" colors={colors} />
        <TextInput style={[styles.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surfaceCard }]} value={domain} onChangeText={setDomain} autoCapitalize="none" placeholder="acme.com" placeholderTextColor={colors.placeholder} />
        <FormLabel text="SEAT COUNT" colors={colors} />
        <TextInput style={[styles.input, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surfaceCard }]} value={seats} onChangeText={setSeats} keyboardType="number-pad" />
        <TouchableOpacity style={styles.primary} onPress={handle} disabled={create.isPending}>
          {create.isPending ? <ActivityIndicator color="#fff" /> : <><Text style={styles.primaryText}>Create account</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></>}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

function InviteModal({ visible, acctId, onClose }: { visible: boolean; acctId: string; onClose: () => void }) {
  const { colors, accent } = useTheme();
  const invite = useInviteMember();
  const bulk = useBulkInviteMembers();
  const [text, setText] = useState('');
  const multi = text.includes('\n') || text.includes(',');

  const handle = async () => {
    const raw = text.trim();
    if (!raw) return;
    try {
      if (multi) {
        const emails = raw.split(/[\n,]+/).map((email) => email.trim()).filter(Boolean);
        await bulk.mutateAsync({ corporate_account_id: acctId, emails });
        Alert.alert('Invites sent', `${emails.length} invites queued.`);
      } else {
        await invite.mutateAsync({ corporate_account_id: acctId, email: raw });
        Alert.alert('Invite sent', `Invite sent to ${raw}`);
      }
      setText('');
      onClose();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const pending = invite.isPending || bulk.isPending;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={styles.modalHead}>
          <Text style={[styles.modalTitle, { color: colors.ink }]}>Invite members</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: accent }}>Cancel</Text></TouchableOpacity>
        </View>
        <FormLabel text="EMAIL ADDRESS(ES)" colors={colors} />
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>One per line or comma-separated.</Text>
        <TextInput style={[styles.input, styles.inviteInput, { borderColor: colors.borderInput, color: colors.ink, backgroundColor: colors.surfaceCard }]} value={text} onChangeText={setText} autoCapitalize="none" keyboardType="email-address" multiline placeholder={'jane@acme.com\njohn@acme.com'} placeholderTextColor={colors.placeholder} />
        <TouchableOpacity style={styles.primary} onPress={handle} disabled={pending}>
          {pending ? <ActivityIndicator color="#fff" /> : <><Text style={styles.primaryText}>{multi ? 'Send all invites' : 'Send invite'}</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></>}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

function FormLabel({ text, colors }: { text: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <Text style={[styles.formLabel, { color: colors.muted }]}>{text}</Text>;
}

function Section({ eyebrow, title, children, colors, accent, rail = BRAND.purple }: { eyebrow: string; title: string; children: React.ReactNode; colors: ReturnType<typeof useTheme>['colors']; accent: string; rail?: string }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={[styles.sectionRail, { backgroundColor: rail }]} />
      <Text style={[styles.sectionEyebrow, { color: accent }]}>{eyebrow}</Text>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function CorporateScreen() {
  const { colors, accent } = useTheme();
  const accountQ = useMyCorporateAccount();
  const account = accountQ.data;
  const acctId = account?.id;
  const adminQ = useMyCorpAdminRole(acctId);
  const isAdmin = !!adminQ.data;
  const membersQ = useCorporateMembers(acctId);
  const invitesQ = usePendingInvites(acctId);
  const seatQ = useSeatUsage(acctId);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  if (accountQ.isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={accent} /></View>;

  if (!account) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.inner}>
          <EnergyHero eyebrow="FOR TEAMS" title="Corporate TrainerHub" subtitle="Give employees access to coaching without individual payment friction." icon="business-outline" compact />
          <Section eyebrow="START" title="Set up your company" colors={colors} accent={accent}>
            <Text style={[styles.body, { color: colors.muted }]}>Create a corporate account, define your seat count, and invite your team.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => setShowCreate(true)}><Text style={styles.primaryText}>Create corporate account</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></TouchableOpacity>
          </Section>
          <Section eyebrow="JOIN" title="Already invited?" colors={colors} accent={accent} rail={BRAND.blue}>
            <Text style={[styles.body, { color: colors.muted }]}>Open the invite link from your HR team to join automatically.</Text>
          </Section>
        </ScrollView>
        <CreateAccountModal visible={showCreate} onClose={() => setShowCreate(false)} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.inner}>
          <EnergyHero eyebrow="COMPANY BENEFIT" title={account.name} subtitle="Your sessions are covered through your organization." icon="business-outline" compact />
          <Section eyebrow="YOUR BENEFIT" title="Train without checkout" colors={colors} accent={accent}>
            <Text style={[styles.body, { color: colors.muted }]}>Book any trainer available to your plan. Your company account handles payment.</Text>
          </Section>
          {seatQ.data ? <Section eyebrow="USAGE" title="Company seats" colors={colors} accent={accent} rail={BRAND.blue}><SeatGauge used={seatQ.data.seats_used} total={seatQ.data.seat_count} accent={accent} /></Section> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const members = membersQ.data ?? [];
  const invites = invitesQ.data ?? [];
  const seats = seatQ.data;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.inner}
        refreshControl={
          <RefreshControl
            refreshing={membersQ.isFetching || invitesQ.isFetching}
            onRefresh={() => { membersQ.refetch(); invitesQ.refetch(); seatQ.refetch(); }}
            tintColor={accent}
          />
        }
      >
        <EnergyHero
          eyebrow={`${account.plan.toUpperCase()} PLAN`}
          title={account.name}
          subtitle="Manage seats, members and access from one place."
          icon="business-outline"
          compact
          right={<TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(true)}><Ionicons name="add" size={16} color="#fff" /><Text style={styles.inviteText}>Invite</Text></TouchableOpacity>}
        />
        {seats ? <Section eyebrow="CAPACITY" title="Seat usage" colors={colors} accent={accent}><SeatGauge used={seats.seats_used} total={seats.seat_count} accent={accent} /></Section> : null}
        <Section eyebrow="PEOPLE" title={`Members · ${members.length}`} colors={colors} accent={accent} rail={BRAND.blue}>
          {members.length ? members.map((member) => <MemberRow key={member.id} member={member} acctId={account.id} isAdmin={isAdmin} />) : <Text style={[styles.empty, { color: colors.muted }]}>No members yet.</Text>}
        </Section>
        {invites.length ? <Section eyebrow="PENDING" title={`Invites · ${invites.length}`} colors={colors} accent={accent} rail={BRAND.purple}>{invites.map((invite) => <InviteRow key={invite.id} invite={invite} isAdmin={isAdmin} />)}</Section> : null}
      </ScrollView>
      <InviteModal visible={showInvite} acctId={account.id} onClose={() => setShowInvite(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 18, paddingBottom: 48, gap: 12 },
  section: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: 14, padding: 16 },
  sectionRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, opacity: 0.7 },
  sectionEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 2, marginBottom: 8 },
  body: { fontSize: 13, lineHeight: 20 },
  primary: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: BRAND.navy, borderRadius: 9, paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.15)', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  inviteText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  gaugeWrap: { gap: 6, marginTop: 5 },
  gaugeTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 3 },
  gaugeLabel: { fontSize: 11, fontWeight: '700' },
  personRow: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, paddingLeft: 9 },
  personRail: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, opacity: 0.7 },
  personName: { fontSize: 13, fontWeight: '900' },
  personMeta: { fontSize: 11, marginTop: 2 },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  empty: { fontSize: 12, paddingVertical: 8 },
  modalRoot: { flex: 1, padding: 24 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  formLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.9, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15 },
  inviteInput: { height: 120, textAlignVertical: 'top' },
});
