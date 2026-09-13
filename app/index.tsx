import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Entry() {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Platform.OS === 'web') {
        router.replace('/onboarding');
        return;
      }
      checkOnboarding();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const checkOnboarding = async () => {
    try {
      const seen = await AsyncStorage.getItem('onboarding_done');
      if (seen === 'true') {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    } catch {
      router.replace('/onboarding');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#00C853" />
    </View>
  );
}