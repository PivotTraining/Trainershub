import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useMyCorporateAccount, useMyCorpAdminRole } from '@/lib/queries/corporate';
import { useCalendarSync, useIntegrationConnections, useSaveIntegrationConnection, useStartIntegrationOAuth, type IntegrationScope, type OAuthIntegrationProvider } from '@/lib/queries/integrations';
import { useTrainerProfile } from '@/lib/queries/profile';
import { BRAND } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

type Provider = {
  key: string;
  name: string;
  category: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  scopes: IntegrationScope[];
  readiness: 'native' | 'oauth' | 'google-meet' | 'setup' | 'enterprise';
  badge?: string;
};

const PROVIDERS: Provider[] = [
  { key: 'stripe', name: 'Stripe', category: 'Payments', description: 'Collect session payments and manage trainer payouts.', icon: 'card-outline', scopes: ['personal', 'enterprise'], readiness: 'native', badge: 'Native' },
  { key: 'device_calendar', name: 'Device Calendar', category: 'Calendar', description: 'Add TrainerHub sessions to Apple, Google, or Outlook calendars already connected to the device.', icon: 'calendar-outline', scopes: ['personal'], readiness: 'native', badge: 'Native' },
  { key: 'google_calendar', name: 'Google Calendar', category: 'Calendar', description: 'Securely sync confirmed TrainerHub sessions to Google Calendar.', icon: 'logo-google', scopes: ['personal', 'enterprise'], readiness: 'oauth', badge: 'OAuth' },
  { key: 'microsoft_365', name: 'Microsoft 365', category: 'Calendar', description: 'Securely sync confirmed TrainerHub sessions to Outlook / Microsoft 365.', icon: 'logo-microsoft', scopes: ['personal', 'enterprise'], readiness: 'oauth', badge: 'OAuth' },
  { key: 'zoom', name: 'Zoom', category: 'Virtual sessions', description: 'Automatically generate Zoom links when trainers confirm virtual sessions.', icon: 'videocam-outline', scopes: ['personal', 'enterprise'], readiness: 'oauth', badge: 'OAuth' },
  { key: 'google_meet', name: 'Google Meet', category: 'Virtual sessions', description: 'Automatically generate Meet links using the trainer’s connected Google Calendar.', icon: 'videocam-outline', scopes: ['personal'], readiness: 'google-meet', badge: 'Via Google' },
  { key: 'slack', name: 'Slack', category: 'Messaging', description: 'Send booking, wellness, and admin notifications into Slack.', icon: 'logo-slack', scopes: ['enterprise'], readiness: 'enterprise' },
  { key: 'microsoft_teams', name: 'Microsoft Teams', category: 'Messaging', description: 'Enterprise notifications and virtual-session workflows.', icon: 'chatbubbles-outline', scopes: ['enterprise'], readiness: 'enterprise' },
  { key: 'quickbooks', name: 'QuickBooks', category: 'Accounting', description: 'Sync payment and payout activity into bookkeeping workflows.', icon: 'calculator-outline', scopes: ['personal', 'enterprise'], readiness: 'setup' },
  { key: 'zapier', name: 'Zapier / Make', category: 'Automation', description: 'Connect TrainerHub events to thousands of external apps.', icon: 'git-network-outline', scopes: ['personal', 'enterprise'], readiness: 'setup' },
  { key: 'okta', name: 'Okta', category: 'Identity', description: 'Enterprise SSO and managed workforce access.', icon: 'key-outline', scopes: ['enterprise'], readiness: 'enterprise', badge: 'Enterprise' },
  { key: 'entra', name: 'Microsoft Entra ID', category: 'Identity', description: 'SAML/OIDC SSO for Microsoft organizations.', icon: 'shield-checkmark-outline', scopes: ['enterprise'], readiness: 'enterprise', badge: 'Enterprise' },
  { key: 'google_workspace', name: 'Google Workspace', category: 'Identity', description: 'Workspace SSO and managed organization access.', icon: 'logo-google', scopes: ['enterprise'], readiness: 'enterprise', badge: 'Enterprise' },
  { key: 'scim', name: 'SCIM Provisioning', category: 'Identity', description: 'Automatically provision, update, and deactivate employee access.', icon: 'people-circle-outline', scopes: ['enterprise'], readiness: 'enterprise', badge: 'Enterprise' },
  { key: 'workday', name: 'Workday', category: 'HRIS', description: 'Employee roster and eligibility synchronization.', icon: 'briefcase-outline', scopes: ['enterprise'], readiness: 'enterprise' },
  { key: 'adp', name: 'ADP', category: 'HRIS', description: 'Employee eligibility and workforce synchronization.', icon: 'briefcase-outline', scopes: ['enterprise'], readiness: 'enterprise' },
  { key: 'ukg', name: 'UKG', category: 'HRIS', description: 'Workforce and benefits eligibility synchronization.', icon: 'briefcase-outline', scopes: ['enterprise'], readiness: 'enterprise' },
  { key: 'bamboohr', name: 'BambooHR', category: 'HRIS', description: 'Employee roster synchronization for growing companies.', icon: 'leaf-outline', scopes: ['enterprise'], readiness: 'enterprise' },
  { key: 'rippling', name: 'Rippling', category: 'HRIS', description: 'Employee lifecycle and access synchronization.', icon: 'people-outline', scopes: ['enterprise'], readiness: 'enterprise' },
  { key: 'gusto', name: 'Gusto', category: 'HRIS', description: 'Employee roster and benefits eligibility synchronization.', icon: 'people-outline', scopes: ['enterprise'], readiness: 'enterprise' },
  { key: 'webhooks', name: 'Webhooks & API', category: 'Developer', description: 'Enterprise event delivery and custom integrations.', icon: 'code-slash-outline', scopes: ['enterprise'], readiness: 'enterprise', badge: 'Enterprise' },
];

function providerName(provider?: string) {
  if (provider === 'microsoft_365') return 'Microsoft 365';
  if (provider === 'zoom') return 'Zoom';
  return 'Google Calendar';
}

export default function IntegrationsScreen() {
  const router = useRouter();
  const callback = useLocalSearchParams<{ connected?: string; provider?: string; oauth_error?: string }>();
  const callbackHandled = useRef(false);
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const userId = session?.user.id;
  const trainerQ = useTrainerProfile(profile?.role === 'trainer' ? userId : undefined);
  const accountQ = useMyCorporateAccount();
  const accountId = accountQ.data?.id;
  const adminQ = useMyCorpAdminRole(accountId);
  const canEnterprise = !!accountId && !!adminQ.data;
  const [scope, setScope] = useState<IntegrationScope>('personal');

  const activeCorporateId = scope === 'enterprise' && canEnterprise ? accountId : undefined;
  const connectionsQ = useIntegrationConnections(scope === 'personal' ? userId : undefined, activeCorporateId);
  const save = useSaveIntegrationConnection();
  const oauth = useStartIntegrationOAuth();
  const calendarSync = useCalendarSync();
  const connections = connectionsQ.data ?? [];
  const byProvider = useMemo(() => new Map(connections.map((c) => [c.provider, c])), [connections]);
  const visible = PROVIDERS.filter((p) => p.scopes.includes(scope));
  const googleConnected = byProvider.get('google_calendar')?.status === 'connected';

  useEffect(() => {
    if (callbackHandled.current) return;
    if (callback.connected === '1') {
      callbackHandled.current = true;
      connectionsQ.refetch();
      Alert.alert('Integration connected', `${providerName(callback.provider)} is now connected to TrainerHub.`);
    } else if (callback.oauth_error) {
      callbackHandled.current = true;
      Alert.alert('Connection failed', String(callback.oauth_error));
    }
  }, [callback.connected, callback.oauth_error, callback.provider, connectionsQ]);

  const beginOAuth = async (provider: OAuthIntegrationProvider) => {
    const returnUrl = Platform.OS === 'web' ? 'https://trainershub.app/integrations' : 'trainerhub://integrations';
    try {
      const result = await oauth.mutateAsync({ provider, scope, corporateAccountId: scope === 'enterprise' ? accountId : undefined, returnUrl });
      await Linking.openURL(result.authorization_url);
    } catch (error) {
      Alert.alert('Connection unavailable', error instanceof Error ? error.message : 'Unable to start authorization.');
    }
  };

  const syncCalendar = async (provider: 'google_calendar' | 'microsoft_365') => {
    try {
      const result = await calendarSync.mutateAsync({ provider, scope, corporateAccountId: scope === 'enterprise' ? accountId : undefined });
      Alert.alert('Calendar synced', `${result.synced} confirmed TrainerHub session${result.synced === 1 ? '' : 's'} synced${result.failed ? ` · ${result.failed} failed` : ''}.`);
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'Unable to sync calendar.');
    }
  };

  const connect = async (provider: Provider) => {
    if (!userId) return;
    if (scope === 'enterprise' && !canEnterprise) return Alert.alert('Enterprise admin required', 'Only a corporate account admin can configure organization integrations.');

    if (provider.readiness === 'google-meet') {
      if (googleConnected) return Alert.alert('Google Meet ready', 'Virtual bookings can now receive Google Meet links automatically when the trainer confirms them.');
      return beginOAuth('google_calendar');
    }

    const connection = byProvider.get(provider.key);
    if (provider.readiness === 'oauth') {
      if (connection?.status === 'connected' && provider.key !== 'zoom') return syncCalendar(provider.key as 'google_calendar' | 'microsoft_365');
      if (connection?.status === 'connected' && provider.key === 'zoom') return Alert.alert('Zoom ready', 'TrainerHub will use Zoom first for newly confirmed virtual sessions.');
      return beginOAuth(provider.key as OAuthIntegrationProvider);
    }

    if (provider.key === 'stripe' && scope === 'personal' && profile?.role === 'trainer') {
      router.push('/(tabs)/profile');
      return;
    }

    if (provider.key === 'device_calendar') {
      if (Platform.OS === 'web') Alert.alert('Available in the mobile app', 'TrainerHub already supports device calendar export on iPhone and Android.');
      await save.mutateAsync({ ownerUserId: userId, provider: provider.key, category: provider.category, scope: 'personal', status: 'connected', displayName: provider.name, configPublic: { platform: Platform.OS } });
      return;
    }

    await save.mutateAsync({ ownerUserId: scope === 'personal' ? userId : undefined, corporateAccountId: scope === 'enterprise' ? accountId : undefined, provider: provider.key, category: provider.category, scope, status: 'needs_setup', displayName: provider.name, configPublic: { requested_at: new Date().toISOString() } });
    Alert.alert('Integration staged', `${provider.name} is attached to this ${scope === 'enterprise' ? 'organization' : 'account'}. Provider credentials or enterprise configuration are still required before live syncing can begin.`);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CONNECT YOUR STACK</Text>
          <Text style={styles.title}>Integrations</Text>
          <Text style={styles.subtitle}>Run TrainerHub inside the tools you already use—from payments and calendars to enterprise identity and HR systems.</Text>
        </View>

        <View style={styles.scopeRow}>
          <ScopeButton label="Personal" active={scope === 'personal'} onPress={() => setScope('personal')} />
          <ScopeButton label="Enterprise" active={scope === 'enterprise'} onPress={() => canEnterprise ? setScope('enterprise') : Alert.alert('Enterprise admin access', 'Create or join a corporate account as an admin to configure organization integrations.')} locked={!canEnterprise} />
        </View>

        {scope === 'personal' && profile?.role === 'trainer' ? (
          <View style={styles.nativeSummary}>
            <Ionicons name={trainerQ.data?.stripe_onboarded ? 'checkmark-circle' : 'alert-circle-outline'} size={20} color={trainerQ.data?.stripe_onboarded ? '#20A66A' : BRAND.purple} />
            <View style={{ flex: 1 }}><Text style={styles.nativeTitle}>Stripe payout status</Text><Text style={styles.nativeText}>{trainerQ.data?.stripe_onboarded ? 'Connected and ready for trainer payouts.' : 'Stripe Connect onboarding still needs to be completed.'}</Text></View>
          </View>
        ) : null}

        <View style={styles.grid}>
          {visible.map((provider) => {
            const connection = byProvider.get(provider.key);
            const googleMeetReady = provider.key === 'google_meet' && googleConnected;
            const connected = googleMeetReady || connection?.status === 'connected' || (provider.key === 'stripe' && scope === 'personal' && !!trainerQ.data?.stripe_onboarded);
            const staged = connection?.status === 'needs_setup' || connection?.status === 'pending';
            const busy = oauth.isPending || calendarSync.isPending || save.isPending;
            const buttonLabel = connected && (provider.key === 'google_calendar' || provider.key === 'microsoft_365') ? 'Sync now' : connected ? 'Ready' : staged && provider.readiness !== 'oauth' ? 'Continue' : 'Connect';
            const accountLabel = provider.key === 'google_meet' ? byProvider.get('google_calendar')?.external_account_label : connection?.external_account_label;
            const lastSync = provider.key === 'google_meet' ? byProvider.get('google_calendar')?.last_sync_at : connection?.last_sync_at;
            return (
              <View key={provider.key} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}><Ionicons name={provider.icon} size={21} color={BRAND.purple} /></View>
                  <View style={styles.badgeWrap}>{provider.badge ? <Text style={styles.badge}>{provider.badge}</Text> : null}</View>
                </View>
                <Text style={styles.provider}>{provider.name}</Text>
                <Text style={styles.category}>{provider.category}</Text>
                <Text style={styles.description}>{provider.description}</Text>
                {accountLabel ? <Text style={styles.accountLabel}>{accountLabel}</Text> : null}
                {lastSync ? <Text style={styles.syncLabel}>Last sync {new Date(lastSync).toLocaleString()}</Text> : null}
                <View style={styles.cardBottom}>
                  <View style={[styles.statusDot, { backgroundColor: connected ? '#20A66A' : staged ? '#E1A21A' : '#B8BCC5' }]} />
                  <Text style={styles.statusText}>{connected ? 'Connected' : staged ? 'Setup required' : 'Available'}</Text>
                  <TouchableOpacity style={[styles.connectButton, connected && styles.connectedButton]} onPress={() => connect(provider)} disabled={busy}>
                    <Text style={[styles.connectText, connected && styles.connectedText]}>{buttonLabel}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {scope === 'enterprise' ? (
          <View style={styles.enterpriseNote}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#FFFFFF" />
            <View style={{ flex: 1 }}><Text style={styles.enterpriseTitle}>Enterprise credential boundary</Text><Text style={styles.enterpriseText}>OAuth refresh tokens and future SAML/SCIM/HRIS secrets stay outside client-readable tables. Provider OAuth tokens are encrypted in Supabase Vault; the app receives only connection status and safe metadata.</Text></View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScopeButton({ label, active, onPress, locked = false }: { label: string; active: boolean; onPress: () => void; locked?: boolean }) {
  return <TouchableOpacity onPress={onPress} style={[styles.scopeButton, active && styles.scopeActive]}><Text style={[styles.scopeText, active && styles.scopeTextActive]}>{label}</Text>{locked ? <Ionicons name="lock-closed" size={12} color="#89909B" /> : null}</TouchableOpacity>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 22, paddingBottom: 48 },
  hero: { borderRadius: 24, backgroundColor: BRAND.navy, padding: 24, marginBottom: 16 },
  eyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#AAB9C9', fontSize: 13, lineHeight: 20, maxWidth: 700, marginTop: 7 },
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  scopeButton: { minHeight: 42, borderRadius: 999, borderWidth: 1, borderColor: '#E1DCE8', backgroundColor: '#FFFFFF', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  scopeActive: { backgroundColor: BRAND.purple, borderColor: BRAND.purple },
  scopeText: { color: '#555B67', fontSize: 12, fontWeight: '800' }, scopeTextActive: { color: '#FFFFFF' },
  nativeSummary: { borderRadius: 16, borderWidth: 1, borderColor: '#E6E1EA', backgroundColor: '#FFFFFF', padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  nativeTitle: { color: BRAND.navy, fontSize: 12, fontWeight: '900' }, nativeText: { color: '#747A86', fontSize: 10, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '31.8%', minWidth: 260, flexGrow: 1, maxWidth: 360, minHeight: 260, borderRadius: 18, borderWidth: 1, borderColor: '#E8E4EC', backgroundColor: '#FFFFFF', padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F1EAF9', alignItems: 'center', justifyContent: 'center' },
  badgeWrap: { minHeight: 24 }, badge: { color: BRAND.purple, fontSize: 9, fontWeight: '900', backgroundColor: '#F4EEFA', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  provider: { color: BRAND.navy, fontSize: 17, fontWeight: '900', marginTop: 15 }, category: { color: BRAND.purple, fontSize: 9, fontWeight: '900', letterSpacing: 0.6, marginTop: 3 },
  description: { color: '#6F7581', fontSize: 11, lineHeight: 17, marginTop: 9, flex: 1 },
  accountLabel: { color: BRAND.navy, fontSize: 10, fontWeight: '800', marginTop: 8 },
  syncLabel: { color: '#8A8F99', fontSize: 9, marginTop: 3 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 16 }, statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 }, statusText: { color: '#777D88', fontSize: 9, fontWeight: '800', flex: 1 },
  connectButton: { minHeight: 36, borderRadius: 10, backgroundColor: BRAND.navy, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, connectedButton: { backgroundColor: '#EEF7F2' }, connectText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' }, connectedText: { color: '#188254' },
  enterpriseNote: { marginTop: 18, borderRadius: 16, backgroundColor: BRAND.navy, padding: 16, flexDirection: 'row', gap: 11 }, enterpriseTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, enterpriseText: { color: '#AEBCCD', fontSize: 10, lineHeight: 16, marginTop: 3 },
});
