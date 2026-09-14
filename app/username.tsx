import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Username() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanUsername = username.trim();
      await AsyncStorage.setItem('username', cleanUsername);

      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await supabase
          .from('profiles')
          .update({ username: cleanUsername })
          .eq('id', data.user.id);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.content}>
          <Text style={styles.title}>What should we {'\n'}call you? 👋</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#555"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoFocus
              maxLength={20}
            />
            <Text style={styles.hint}>This will be your profile name</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            <Text style={styles.continueText}>
              {loading ? 'Saving...' : 'Continue to Dashboard →'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    lineHeight: 48,
    marginBottom: 32,
  },
  inputContainer: {
    gap: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 18,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  hint: {
    color: '#555',
    fontSize: 13,
    marginLeft: 4,
  },
  error: {
    color: '#ff4444',
    fontSize: 13,
    marginLeft: 4,
  },
  continueButton: {
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueText: {
    color: '#000',
    fontSize: 17,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    color: '#888',
    fontSize: 15,
  },
});