import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/BrandLockup';
import { useAuth } from '@/lib/auth';
import { BRAND } from '@/lib/theme';

const SEEN_KEY = 'trainerhub.welcome_seen.v1';
const LAUNCH_COUNT_KEY = 'trainerhub.launch_count.v1';
const WEB_WELCOME_INTERVAL = 10;

export function LaunchWelcomeGate({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const { width } = useWindowDimensions();
  const [checking, setChecking] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkLaunch() {
      try {
        const [seenValue, countValue] = await Promise.all([
          AsyncStorage.getItem(SEEN_KEY),
          AsyncStorage.getItem(LAUNCH_COUNT_KEY),
        ]);
        const previousCount = Number.parseInt(countValue ?? '0', 10) || 0;
        const nextCount = previousCount + 1;
        await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(nextCount));

        const firstLaunch = seenValue !== 'yes';
        const periodicWebWelcome = Platform.OS === 'web' && !firstLaunch && nextCount % WEB_WELCOME_INTERVAL === 0;

        if (!active) return;
        setIsFirstLaunch(firstLaunch);
        setShowWelcome(firstLaunch || periodicWebWelcome);
      } catch {
        // Welcome tracking should never prevent the app from opening.
        if (active) setShowWelcome(false);
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkLaunch();
    return () => { active = false; };
  }, []);

  const continueIntoApp = async () => {
    if (isFirstLaunch) {
      try { await AsyncStorage.setItem(SEEN_KEY, 'yes'); } catch { /* non-blocking */ }
    }
    setShowWelcome(false);
  };

  if (checking) {
    return (
      <View style={styles.loadingShell}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!showWelcome) return <>{children}</>;

  const firstName = profile?.full_name?.trim().split(' ')[0] || null;
  const signedIn = !!session;
  const isWide = width >= 820;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.shell, isWide && styles.shellWide]}>
        <View style={[styles.brandPane, isWide && styles.brandPaneWide]}>
          <View style={styles.glowOne} />
          <View style={styles.glowTwo} />
          <View style={styles.brandTop}>
            <BrandLockup dark compact={false} />
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{isFirstLaunch ? 'WELCOME TO TRAINERHUB' : 'GOOD TO HAVE YOU BACK'}</Text>
            <Text style={styles.title}>
              {isFirstLaunch
                ? <>Training starts with the <Text style={styles.purple}>right connection.</Text></>
                : <>Ready for your <Text style={styles.purple}>next move?</Text></>}
            </Text>
            <Text style={styles.subtitle}>
              {isFirstLaunch
                ? 'Discover trainers, book sessions, build consistency, and keep your entire training journey in one place.'
                : `${firstName ? `${firstName}, ` : ''}your TrainerHub workspace is right where you left it.`}
            </Text>
          </View>

          <View style={styles.signalRow}>
            <Signal icon="search" label="Find" />
            <View style={styles.signalLine} />
            <Signal icon="calendar" label="Book" />
            <View style={styles.signalLine} />
            <Signal icon="flash" label="Train" />
          </View>
        </View>

        <View style={[styles.actionPane, isWide && styles.actionPaneWide]}>
          <View style={styles.actionInner}>
            <View style={styles.iconWrap}>
              <Ionicons name={signedIn ? 'sparkles' : 'people'} size={28} color={BRAND.purple} />
            </View>
            <Text style={styles.actionKicker}>{signedIn ? 'YOUR SPACE IS READY' : 'BETTER TOGETHER'}</Text>
            <Text style={styles.actionTitle}>{signedIn ? 'Jump back in.' : 'Let’s get you moving.'}</Text>
            <Text style={styles.actionBody}>
              {signedIn
                ? 'No sign-in needed. Continue straight into your TrainerHub account.'
                : 'Create an account or sign in after this screen to start building your training experience.'}
            </Text>

            <Pressable accessibilityRole="button" onPress={continueIntoApp} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}>
              <Text style={styles.primaryText}>{signedIn ? 'Continue to TrainerHub' : 'Get Started'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>

            {!isFirstLaunch && Platform.OS === 'web' ? (
              <Text style={styles.periodicNote}>A quick hello every {WEB_WELCOME_INTERVAL} opens. Your session stays signed in.</Text>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Signal({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.signal}>
      <View style={styles.signalIcon}><Ionicons name={icon} size={16} color="#FFFFFF" /></View>
      <Text style={styles.signalText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07172B' },
  loadingShell: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07172B' },
  shell: { flex: 1, backgroundColor: '#07172B' },
  shellWide: { flexDirection: 'row' },
  brandPane: { flex: 1.15, minHeight: 500, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 32, overflow: 'hidden', justifyContent: 'space-between' },
  brandPaneWide: { paddingHorizontal: 54, paddingTop: 42, paddingBottom: 46 },
  actionPane: { backgroundColor: '#F7F5F9', paddingHorizontal: 26, paddingVertical: 32 },
  actionPaneWide: { flex: 0.85, justifyContent: 'center', paddingHorizontal: 58 },
  actionInner: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brandTop: { zIndex: 2 },
  glowOne: { position: 'absolute', width: 330, height: 330, borderRadius: 165, backgroundColor: '#3B1570', opacity: 0.52, right: -140, top: 80 },
  glowTwo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#0A7FB0', opacity: 0.22, left: -120, bottom: -80 },
  heroCopy: { zIndex: 2, maxWidth: 640, marginTop: 56 },
  eyebrow: { color: '#7ED3FF', fontSize: 10, fontWeight: '900', letterSpacing: 2.6 },
  title: { color: '#FFFFFF', fontSize: 47, lineHeight: 49, fontWeight: '900', letterSpacing: -2.1, marginTop: 12 },
  purple: { color: '#B72CFF' },
  subtitle: { color: '#B5C2D2', fontSize: 15, lineHeight: 23, fontWeight: '600', maxWidth: 560, marginTop: 16 },
  signalRow: { zIndex: 2, flexDirection: 'row', alignItems: 'center', marginTop: 54, maxWidth: 450 },
  signal: { alignItems: 'center', gap: 7 },
  signalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#122D4C', borderWidth: 1, borderColor: '#21466E', alignItems: 'center', justifyContent: 'center' },
  signalText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  signalLine: { flex: 1, height: 1, marginHorizontal: 10, backgroundColor: '#31506F' },
  iconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#EEE5F8', alignItems: 'center', justifyContent: 'center' },
  actionKicker: { color: BRAND.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1.9, marginTop: 22 },
  actionTitle: { color: BRAND.navy, fontSize: 32, lineHeight: 36, fontWeight: '900', letterSpacing: -1.1, marginTop: 7 },
  actionBody: { color: '#69717F', fontSize: 13, lineHeight: 20, marginTop: 10 },
  primaryButton: { minHeight: 56, borderRadius: 14, backgroundColor: BRAND.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, marginTop: 28, shadowColor: BRAND.purple, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  primaryPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  periodicNote: { color: '#9297A1', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 13 },
});
