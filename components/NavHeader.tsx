import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/lib/database';
import { getAvatarById } from '@/constants/avatars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';

interface NavHeaderProps {
  showXP?: boolean;
}

export default function NavHeader({ showXP = true }: NavHeaderProps) {
  const [avatarEmoji, setAvatarEmoji] = useState('🐂');
  const [avatarColor, setAvatarColor] = useState('#00C853');
  const [xp, setXp] = useState(0);

  const loadData = async () => {
    // Load avatar from AsyncStorage first (instant)
    const savedAvatarId = await AsyncStorage.getItem('avatar_id');
    if (savedAvatarId) {
      const avatar = getAvatarById(savedAvatarId);
      setAvatarEmoji(avatar.emoji);
      setAvatarColor(avatar.color);
    }

    // Load XP
    const savedXP = await AsyncStorage.getItem('total_xp');
    if (savedXP) setXp(Math.max(0, parseInt(savedXP) || 0));

    // Sync from Supabase
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      const profile = await getProfile(data.user.id);
      if (profile) {
        const validXP = Math.max(0, profile.xp ?? 0);
        setXp(validXP);
        await AsyncStorage.setItem('total_xp', validXP.toString());
        if (profile.avatar_id) {
          const avatar = getAvatarById(profile.avatar_id);
          setAvatarEmoji(avatar.emoji);
          setAvatarColor(avatar.color);
          await AsyncStorage.setItem('avatar_id', profile.avatar_id);
        }
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        style={styles.logoRow}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/profile')}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor + '25', borderColor: avatarColor + '50' }]}>
          <Text style={styles.avatarText}>{avatarEmoji}</Text>
        </View>
        <Text style={styles.logoText}>GrowPlay</Text>
      </TouchableOpacity>
      {showXP && (
        <TouchableOpacity
          style={styles.xpBadge}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/league')}
        >
          <View style={styles.starCircle}>
            <Ionicons name="star" size={11} color="#00C853" />
          </View>
          <Text style={styles.xpText}>{xp.toLocaleString()} XP</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 20,
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00C85315',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00C85330',
    flexShrink: 0,
  },
  starCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00C85320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpText: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: '700',
  },
});
