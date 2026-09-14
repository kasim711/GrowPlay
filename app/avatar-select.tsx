import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/constants/avatars';
import AvatarPicker from '@/components/AvatarPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AvatarSelect() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (avatar: Avatar) => {
    setSelectedId(avatar.id);
  };

  const handleContinue = async () => {
    if (!selectedId) return;

    setLoading(true);
    try {
      // Save to AsyncStorage for instant access
      await AsyncStorage.setItem('avatar_id', selectedId);

      // Save to Supabase
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await supabase
          .from('profiles')
          .update({ avatar_url: selectedId })
          .eq('id', data.user.id);
      }

      router.replace('/(tabs)');
    } catch (e) {
      console.log('Avatar save error:', e);
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your{'\n'}Trading Avatar 🎮</Text>
          <Text style={styles.subtitle}>
            This will be your identity across GrowPlay
          </Text>
        </View>

        {/* Avatar Grid */}
        <AvatarPicker selected={selectedId} onSelect={handleSelect} />

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedId && styles.buttonDisabled,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedId || loading}
        >
          <Text style={styles.continueText}>
            {loading ? 'Setting up...' : selectedId ? 'Continue →' : 'Select an Avatar'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060606',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    color: '#666',
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  continueText: {
    color: '#000',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
