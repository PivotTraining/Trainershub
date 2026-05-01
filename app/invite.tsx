/**
 * Deep-link invite accept screen.
 * Opened via: trainerhub://invite?token=<uuid>
 *
 * If the user isn't signed in they're sent to sign-in first; the token
 * is preserved in the URL and handled again after auth.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAcceptInvite } from '@/lib/queries/corporate';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { colors, accent, spacing, typography, radius } = useTheme();
  const { session } = useAuth();
  const acceptInvite = useAcceptInvite();
  const attempted = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (!session) {
      // Not signed in — redirect to sign-in, pass token so we come back
      router.replace({ pathname: '/(auth)/sign-in', params: { inviteToken: token } });
      return;
    }
    if (attempted.current) return;
    attempted.current = true;
    acceptInvite.mutate({ token });
  }, [token, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPending = acceptInvite.isPending;
  const isSuccess = acceptInvite.isSuccess;
  const isError   = acceptInvite.isError;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isPending && (
        <>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.title, { color: colors.ink, fontSize: typography.lg }]}>
            Joining your team…
          </Text>
        </>
      )}

      {isSuccess && (
        <>
          <Text style={styles.check}>✓</Text>
          <Text style={[styles.title, { color: colors.ink, fontSize: typography.lg }]}>
            You're in!
          </Text>
          <Text style={[styles.sub, { color: colors.muted, fontSize: typography.sm }]}>
            Your corporate account is now active. Sessions will be billed to your company.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accent, borderRadius: radius.lg }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={[styles.btnText, { fontSize: typography.md }]}>Go to TrainerHub</Text>
          </TouchableOpacity>
        </>
      )}

      {isError && (
        <>
          <Text style={styles.errorIcon}>✕</Text>
          <Text style={[styles.title, { color: colors.ink, fontSize: typography.lg }]}>
            Invite not valid
          </Text>
          <Text style={[styles.sub, { color: colors.muted, fontSize: typography.sm }]}>
            {acceptInvite.error?.message ?? 'This invite may have expired or already been used.'}
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accent, borderRadius: radius.lg }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={[styles.btnText, { fontSize: typography.md }]}>Go to Home</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  check:     { fontSize: 56, color: '#22c55e' },
  errorIcon: { fontSize: 56, color: '#ef4444' },
  title: { fontWeight: '700', textAlign: 'center' },
  sub:   { textAlign: 'center', lineHeight: 22 },
  btn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
