import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const DEFAULT_SUPABASE_URL = 'https://juaswmxtiokhkyjvvqhp.supabase.co';
const DEFAULT_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YXN3bXh0aW9raGt5anZ2cWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTkxMDYsImV4cCI6MjA5MTgzNTEwNn0.sCbqQh4plpBuGa7vESMdMrCBvLy-KHiSlBVps6k6aZs';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

const getStorage = () => {
  if (Platform.OS === 'web') return undefined;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  } catch {
    return undefined;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: Platform.OS !== 'web',
    persistSession: Platform.OS !== 'web',
    detectSessionInUrl: false,
  },
});
