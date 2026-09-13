import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/lib/database';
import { getAvatarById } from '@/constants/avatars';

export default function AccountScreen() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      if (data?.user) {
        const p = await getProfile(data.user.id);
        if (p) {
          setProfile(p);
          setUsername(p.username || '');
        }
      } else {
        // Guest user
        const localUsername = await AsyncStorage.getItem('username');
        setUsername(localUsername || 'Trader');
      }
    } catch (e) {
      console.log('Error loading account:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    setSavingUsername(true);
    try {
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ username: username.trim() })
          .eq('id', user.id);
        if (error) throw error;
      }
      await AsyncStorage.setItem('username', username.trim());
      setIsEditingUsername(false);
      Alert.alert('Success', 'Username updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };



  const handleClearCache = async () => {
    Alert.alert('Clear Cache', 'Clear temporary market cache and stock quotes?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          Alert.alert('Success', 'Cache cleared successfully!');
        },
      },
    ]);
  };

  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your GrowPlay account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await supabase.auth.signOut();
            await AsyncStorage.multiRemove([
              'completed_lessons',
              'total_xp',
              'streak',
              'avatar_id',
              'username',
              'growplay_arena_joined',
            ]);
            Alert.alert('Logged Out', 'You have been logged out successfully.');
            router.replace('/(tabs)/' as any);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Logout failed');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account Permanently',
      'Are you sure you want to delete your GrowPlay account? All your paper trading balance, simulated holdings, trade history, XP points, and arena cohort rankings will be permanently wiped from the database. This action cannot be reversed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. Confirming will purge all user records immediately.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      if (user) {
                        await supabase.from('trades').delete().eq('user_id', user.id);
                        await supabase.from('holdings').delete().eq('user_id', user.id);
                        await supabase.from('lesson_progress').delete().eq('user_id', user.id);
                        await supabase.from('profiles').delete().eq('id', user.id);
                        await supabase.auth.signOut();
                      }
                      await AsyncStorage.multiRemove([
                        'completed_lessons',
                        'total_xp',
                        'streak',
                        'avatar_id',
                        'username',
                        'growplay_arena_joined',
                      ]);
                      Alert.alert('Account Deleted', 'Your account and data have been permanently removed.');
                      router.replace('/(tabs)/' as any);
                    } catch (e: any) {
                      Alert.alert('Error', e.message || 'Failed to delete account');
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const currentAvatar = getAvatarById(profile?.avatar_id);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00C853" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatarCircle, { backgroundColor: currentAvatar.color + '25', borderColor: currentAvatar.color }]}>
            <Text style={styles.avatarEmoji}>{currentAvatar.emoji}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.avatarName}>{currentAvatar.name}</Text>
            <TouchableOpacity
              style={styles.changeAvatarBadge}
              onPress={() => router.push('/avatar-select')}
            >
              <Ionicons name="sparkles" size={12} color="#00C853" />
              <Text style={styles.changeAvatarText}>Change Avatar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Information Section */}
        <Text style={styles.sectionHeader}>PERSONAL DETAILS</Text>
        <View style={styles.card}>
          {/* Username Row */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="person-outline" size={20} color="#888" />
              <Text style={styles.rowLabel}>Username</Text>
            </View>
            {isEditingUsername ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={setUsername}
                  autoFocus
                  maxLength={20}
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveUsername}
                  disabled={savingUsername}
                >
                  {savingUsername ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#000" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setUsername(profile?.username || '');
                    setIsEditingUsername(false);
                  }}
                >
                  <Ionicons name="close" size={18} color="#888" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.rowRight}
                onPress={() => setIsEditingUsername(true)}
              >
                <Text style={styles.rowValue}>{username}</Text>
                <Ionicons name="pencil" size={15} color="#00C853" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Email Row */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="mail-outline" size={20} color="#888" />
              <Text style={styles.rowLabel}>Email</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{user?.email || 'Guest Session'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Account Status */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#888" />
              <Text style={styles.rowLabel}>Account Type</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>{user ? 'Paper Trader' : 'Guest'}</Text>
            </View>
          </View>
        </View>

        {/* Trading Account Preferences */}
        <Text style={styles.sectionHeader}>VIRTUAL TRADING SETTINGS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="wallet-outline" size={20} color="#888" />
              <View>
                <Text style={styles.rowLabel}>Virtual Balance</Text>
                <Text style={styles.rowSublabel}>Simulated funds</Text>
              </View>
            </View>
            <Text style={styles.balanceHighlight}>
              ₹{profile?.virtual_balance ? profile.virtual_balance.toLocaleString('en-IN') : '10,00,000'}
            </Text>
          </View>

          {/* Automatic Weekly Balance Reset Note */}
          <View style={styles.balanceNoteCard}>
            <View style={styles.balanceNoteIconWrap}>
              <Ionicons name="time-outline" size={18} color="#00C853" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.balanceNoteTitle}>Weekly Balance Reset Schedule</Text>
              <Text style={styles.balanceNoteText}>
                Your virtual balance of ₹10,00,000 resets automatically every Monday at 7:00 AM, before the market opens at 9:15 AM.
              </Text>
            </View>
          </View>
        </View>

        {/* Data & Cache */}
        <Text style={styles.sectionHeader}>DATA & STORAGE</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <View style={styles.rowLeft}>
              <Ionicons name="trash-outline" size={20} color="#888" />
              <Text style={styles.rowLabel}>Clear Market Cache</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Account Actions & Security */}
        <Text style={styles.sectionHeader}>ACCOUNT ACTIONS & DANGER ZONE</Text>
        <View style={styles.card}>
          {user ? (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={22} color="#FF9100" style={{ flexShrink: 0 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowLabel, { color: '#FF9100' }]} numberOfLines={1}>Log Out</Text>
                  <Text style={styles.rowSublabel} numberOfLines={1} ellipsizeMode="tail">Sign out of your active account session</Text>
                </View>
              </View>
              {loggingOut ? (
                <ActivityIndicator size="small" color="#FF9100" />
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#555" style={{ flexShrink: 0 }} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/auth' as any)}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="log-in-outline" size={22} color="#00C853" style={{ flexShrink: 0 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowLabel, { color: '#00C853' }]} numberOfLines={1}>Login / Sign Up</Text>
                  <Text style={styles.rowSublabel} numberOfLines={1} ellipsizeMode="tail">Connect an account to sync portfolio & arena</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#555" style={{ flexShrink: 0 }} />
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          {/* Delete Account Permanently */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="trash-bin-outline" size={22} color="#ff4444" style={{ flexShrink: 0 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowLabel, { color: '#ff4444' }]} numberOfLines={1}>Delete Account Permanently</Text>
                <Text style={styles.rowSublabel} numberOfLines={1} ellipsizeMode="tail">Wipe all holdings, XP, trades, and personal data</Text>
              </View>
            </View>
            {deletingAccount ? (
              <ActivityIndicator size="small" color="#ff4444" />
            ) : (
              <Ionicons name="chevron-forward" size={16} color="#555" style={{ flexShrink: 0 }} />
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 24,
    gap: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  profileDetails: {
    flex: 1,
  },
  avatarName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  changeAvatarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#00C85315',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00C85340',
  },
  changeAvatarText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    color: '#ddd',
    fontSize: 15,
    fontWeight: '500',
  },
  rowSublabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  balanceHighlight: {
    color: '#00C853',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameInput: {
    backgroundColor: '#1f1f1f',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#00C853',
    minWidth: 110,
  },
  saveBtn: {
    backgroundColor: '#00C853',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },
  verifiedBadge: {
    backgroundColor: '#00C85320',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#1c1c1c',
    marginLeft: 48,
  },
  balanceNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0c1a10',
    padding: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#16281a',
  },
  balanceNoteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00C85315',
    borderWidth: 1,
    borderColor: '#00C85330',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  balanceNoteTitle: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  balanceNoteText: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
  },
});
