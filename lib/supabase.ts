import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[TrainerHub] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and fill in your project values.',
  );
}

// Fall back to placeholder values so the app renders (auth calls will fail gracefully).
const resolvedUrl = url ?? 'https://placeholder.supabase.co';
const resolvedKey = anonKey ?? 'placeholder-anon-key';

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
