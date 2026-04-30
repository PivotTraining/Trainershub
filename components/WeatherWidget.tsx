/**
 * WeatherWidget — small inline widget that shows the current temp & condition
 * for the user's saved location.  Uses the free Open-Meteo API (no API key
 * needed).  Gracefully renders nothing if we don't have coordinates.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/useTheme';

interface WeatherWidgetProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  city?: string | null;
}

interface WeatherData {
  tempF: number;
  code: number;
  isDay: boolean;
}

// Open-Meteo weather codes → emoji
function codeToEmoji(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2) return isDay ? '⛅' : '☁️';
  if (code === 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '🌡️';
}

function codeToLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunder';
  return '';
}

export function WeatherWidget({ lat, lng, city }: WeatherWidgetProps) {
  const { colors } = useTheme();
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    let cancelled = false;
    setLoading(true);

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit`;

    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.current) return;
        setData({
          tempF: Math.round(j.current.temperature_2m),
          code:  j.current.weather_code,
          isDay: j.current.is_day === 1,
        });
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (lat == null || lng == null) return null;
  if (loading) {
    return (
      <View style={[styles.pill, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }
  if (!data) return null;

  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <Text style={styles.emoji}>{codeToEmoji(data.code, data.isDay)}</Text>
      <View style={styles.text}>
        <Text style={[styles.temp, { color: colors.ink }]}>{data.tempF}°</Text>
        <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
          {city ?? codeToLabel(data.code)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  emoji: { fontSize: 18 },
  text:  { alignItems: 'flex-start' },
  temp:  { fontSize: 14, fontWeight: '700' },
  label: { fontSize: 10, marginTop: -2, maxWidth: 90 },
});
