import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getProfile, syncDailyLoginStreak } from '@/lib/database';
import { getAvatarById } from '@/constants/avatars';
import NavHeader from '@/components/NavHeader';

const LEAGUES = [
  { name: 'Bronze I', color: '#CD7F32', minXP: 0 },
  { name: 'Bronze II', color: '#CD7F32', minXP: 200 },
  { name: 'Bronze III', color: '#CD7F32', minXP: 400 },
  { name: 'Silver I', color: '#C0C0C0', minXP: 700 },
  { name: 'Silver II', color: '#C0C0C0', minXP: 1000 },
  { name: 'Silver III', color: '#C0C0C0', minXP: 1400 },
  { name: 'Gold I', color: '#FFD700', minXP: 1800 },
  { name: 'Gold II', color: '#FFD700', minXP: 2300 },
  { name: 'Gold III', color: '#FFD700', minXP: 2900 },
  { name: 'Diamond I', color: '#00BFFF', minXP: 3600 },
  { name: 'Diamond II', color: '#00BFFF', minXP: 4500 },
  { name: 'Diamond III', color: '#00BFFF', minXP: 5500 },
  { name: 'Legend', color: '#FFD700', minXP: 7000 },
];

const getUserLeague = (xp: number) => {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (xp >= LEAGUES[i].minXP) return LEAGUES[i];
  }
  return LEAGUES[0];
};

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [xp, setXp] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [streak, setStreak] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [adminTapCount, setAdminTapCount] = useState(0);

  const loadData = async () => {
    const savedXP = await AsyncStorage.getItem('total_xp');
    if (savedXP) setXp(Math.max(0, parseInt(savedXP) || 0));
    const savedStreak = await AsyncStorage.getItem('streak');
    if (savedStreak) setStreak(parseInt(savedStreak));
    const savedLessons = await AsyncStorage.getItem('completed_lessons');
    if (savedLessons) setCompletedLessons(JSON.parse(savedLessons).length);

    const savedAvatar = await AsyncStorage.getItem('avatar_id');
    if (savedAvatar) setAvatarId(savedAvatar);

    const { data } = await supabase.auth.getUser();
    setUser(data?.user ?? null);

    const streakResult = await syncDailyLoginStreak(data?.user?.id);
    setStreak(streakResult.streak);

    if (data?.user) {
      const p = await getProfile(data.user.id);
      if (p) {
        setProfile(p);
        const validXP = Math.max(0, p.xp ?? 0);
        setXp(validXP);
        await AsyncStorage.setItem('total_xp', validXP.toString());
        setStreak(streakResult.streak);
        if (p.avatar_id) {
          setAvatarId(p.avatar_id);
          await AsyncStorage.setItem('avatar_id', p.avatar_id);
        }
        if (p.username) {
          await AsyncStorage.setItem('username', p.username);
        }
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          await AsyncStorage.multiRemove([
            'completed_lessons',
            'total_xp',
            'streak',
            'onboarding_done',
            'avatar_id',
            'username',
          ]);
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const myLeague = getUserLeague(xp);
  const username = profile?.username ?? user?.email?.split('@')[0] ?? 'Trader';
  const currentAvatar = getAvatarById(avatarId || profile?.avatar_id);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navbar */}
      <NavHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Hero */}
        <View style={styles.heroSection}>
          {/* Avatar Large */}
          <TouchableOpacity
            style={[
              styles.heroAvatar,
              {
                borderColor: currentAvatar.color || myLeague.color,
                backgroundColor: (currentAvatar.color || myLeague.color) + '20',
              },
            ]}
            onPress={() => router.push('/avatar-select')}
            activeOpacity={0.8}
          >
            <Text style={styles.heroAvatarEmoji}>{currentAvatar.emoji}</Text>
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Name & Avatar Title */}
          <Text style={styles.heroName}>{username}</Text>
          <Text style={[styles.heroAvatarName, { color: currentAvatar.color }]}>
            {currentAvatar.name}
          </Text>

          {/* League Badge */}
          <View
            style={[
              styles.leagueBadge,
              {
                borderColor: myLeague.color + '60',
                backgroundColor: myLeague.color + '15',
              },
            ]}
          >
            <Ionicons name="trophy" size={13} color={myLeague.color} />
            <Text style={[styles.leagueBadgeText, { color: myLeague.color }]}>
              {myLeague.name.toUpperCase()} LEAGUE
            </Text>
          </View>

          {/* Change Avatar Button */}
          <TouchableOpacity
            style={styles.changeAvatarPill}
            onPress={() => router.push('/avatar-select')}
          >
            <Ionicons name="sparkles" size={13} color="#00C853" />
            <Text style={styles.changeAvatarPillText}>Change Avatar</Text>
          </TouchableOpacity>
        </View>

        {/* Guest Banner */}
        {!user && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => router.push('/auth' as any)}
          >
            <Ionicons name="log-in-outline" size={20} color="#00C853" />
            <Text style={styles.guestBannerText}>Login to sync portfolio & leaderboard!</Text>
            <Ionicons name="chevron-forward" size={16} color="#00C853" />
          </TouchableOpacity>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel} numberOfLines={1}>TOTAL XP</Text>
              <Ionicons name="flash" size={18} color="#00C853" style={{ flexShrink: 0 }} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{xp.toLocaleString()}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel} numberOfLines={1}>{streak} DAY STREAK</Text>
              <Ionicons name="flame" size={18} color="#ff6b35" style={{ flexShrink: 0 }} />
            </View>
            <Text style={[styles.statValue, { color: streak > 0 ? '#00C853' : '#888' }]} numberOfLines={1} adjustsFontSizeToFit>
              {streak > 0 ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel} numberOfLines={1}>LESSONS DONE</Text>
              <Ionicons name="checkmark-circle" size={18} color="#00C853" style={{ flexShrink: 0 }} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{completedLessons}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel} numberOfLines={1}>LEAGUE</Text>
              <Ionicons name="bar-chart" size={18} color={myLeague.color} style={{ flexShrink: 0 }} />
            </View>
            <Text style={[styles.statValue, { color: myLeague.color, fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
              {myLeague.name}
            </Text>
          </View>
        </View>

        {/* Account & App Settings */}
        <Text style={styles.sectionHeader}>PREFERENCES & SETTINGS</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/account')}
          >
            <Ionicons name="person-circle-outline" size={22} color="#00C853" />
            <Text style={styles.settingText}>Account Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#FF9100" />
            <Text style={styles.settingText}>Notification Preferences</Text>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/security')}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color="#00E5FF" />
            <Text style={styles.settingText}>Security & Privacy</Text>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <Text style={styles.sectionHeader}>SUPPORT & LEGAL</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/help')}
          >
            <Ionicons name="help-circle-outline" size={22} color="#888" />
            <Text style={styles.settingText}>Help & Support (FAQs)</Text>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/terms')}
          >
            <Ionicons name="document-text-outline" size={22} color="#888" />
            <Text style={styles.settingText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/privacy')}
          >
            <Ionicons name="lock-closed-outline" size={22} color="#888" />
            <Text style={styles.settingText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Logout / Login Button */}
        {user ? (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ff4444" />
            <Text style={styles.logoutText}>LOGOUT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth' as any)}
          >
            <Ionicons name="log-in-outline" size={20} color="#000" />
            <Text style={styles.loginText}>Login / Sign Up</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            const next = adminTapCount + 1;
            setAdminTapCount(next);
            if (next >= 5) {
              setAdminTapCount(0);
              router.push('/admin');
            }
          }}
        >
          <Text style={styles.version}>GrowPlay v1.0.0 • Paper Trading Sandbox</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 12,
    position: 'relative',
  },
  heroAvatarEmoji: {
    fontSize: 48,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00C853',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
  heroName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  heroAvatarName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  leagueBadgeText: {
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  changeAvatarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00C85315',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00C85340',
  },
  changeAvatarPillText: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: '600',
  },
  guestBanner: {
    backgroundColor: '#0d2818',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00C853',
    overflow: 'hidden',
  },
  guestBannerText: {
    color: '#00C853',
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    flex: 1,
    minWidth: '46%',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  statValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    flexShrink: 1,
  },
  sectionHeader: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  settingText: {
    color: '#fff',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ff444430',
  },
  logoutText: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  loginText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  version: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
});