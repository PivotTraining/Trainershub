import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EnergyField } from '@/components/EnergyField';
import { BRAND } from '@/lib/theme';

interface EnergyHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  compact?: boolean;
}

export function EnergyHero({ eyebrow, title, subtitle, icon, right, compact = false }: EnergyHeroProps) {
  return (
    <View style={[styles.shell, compact && styles.compactShell]}>
      <EnergyField opacity={compact ? 0.72 : 1} />
      <View style={styles.inner}>
        <View style={styles.copyRow}>
          {icon ? (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={20} color="#FFFFFF" />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: BRAND.navy,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#193857',
    minHeight: 170,
    shadowColor: BRAND.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 7,
  },
  compactShell: { minHeight: 128 },
  inner: { flex: 1, justifyContent: 'flex-end', padding: 22 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  eyebrow: { color: '#7ED3FF', fontSize: 9, fontWeight: '900', letterSpacing: 2.1, marginBottom: 5 },
  title: { color: '#FFFFFF', fontSize: 31, lineHeight: 35, fontWeight: '900', letterSpacing: -0.8 },
  compactTitle: { fontSize: 25, lineHeight: 29 },
  subtitle: { color: '#AEBFD2', fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 5, maxWidth: 650 },
});
