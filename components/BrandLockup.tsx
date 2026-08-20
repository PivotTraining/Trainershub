import { StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/Logo';

interface BrandLockupProps {
  compact?: boolean;
  dark?: boolean;
}

export function BrandLockup({ compact = false, dark = true }: BrandLockupProps) {
  const ink = dark ? '#FFFFFF' : '#07172B';
  const muted = dark ? '#A9B8C9' : '#607086';

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Logo size={40} background="none" color={ink} />
        <View>
          <Text style={[styles.compactName, { color: ink }]}>
            TRAINER<Text style={styles.hub}>HUB</Text>
          </Text>
          <Text style={[styles.compactTag, { color: muted }]}>FIND  •  BOOK  •  TRAIN</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Logo size={58} background="none" color="#FFFFFF" />
      <View style={styles.divider} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: ink }]}>TRAINER<Text style={styles.hub}>HUB</Text></Text>
        <Text style={[styles.tag, { color: muted }]}>FIND  •  BOOK  •  TRAIN</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { width: 1, height: 46, backgroundColor: 'rgba(255,255,255,0.42)' },
  name: { fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.6 },
  compactName: { fontSize: 15, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.4 },
  hub: { color: '#9B22FF' },
  tag: { fontSize: 9, fontWeight: '800', letterSpacing: 2.7, marginTop: 5 },
  compactTag: { fontSize: 7, fontWeight: '800', letterSpacing: 1.6, marginTop: 3 },
});
