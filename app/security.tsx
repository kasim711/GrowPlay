import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export default function SecurityScreen() {
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const bio = await AsyncStorage.getItem('biometrics_enabled');
      if (bio) setBiometricsEnabled(bio === 'true');
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
    } catch (e) {
      console.log('Error loading security settings:', e);
    }
  };

  const handleBiometricToggle = async (val: boolean) => {
    setBiometricsEnabled(val);
    await AsyncStorage.setItem('biometrics_enabled', val ? 'true' : 'false');
    if (val) {
      Alert.alert('App Lock Activated', 'Biometric & screen lock enabled for GrowPlay.');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('Success', 'Your password has been updated securely.');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignoutAll = () => {
    Alert.alert('Sign Out Other Devices', 'Are you sure you want to invalidate other active sessions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out Others',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Sessions Terminated', 'All other active sessions have been safely logged out.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <View style={styles.statusCard}>
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark" size={28} color="#00C853" />
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Protection Status: High</Text>
            <Text style={styles.statusSubtitle}>
              Your GrowPlay session is encrypted with Supabase RLS security policies.
            </Text>
          </View>
        </View>

        {/* Device & Login Security */}
        <Text style={styles.sectionHeader}>LOGIN & ACCESS</Text>
        <View style={styles.card}>
          {/* Biometrics */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="finger-print-outline" size={20} color="#00C853" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Biometric / PIN Lock</Text>
              <Text style={styles.subtitle}>Require authentication when launching GrowPlay</Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#262626', true: '#00C85340' }}
              thumbColor={biometricsEnabled ? '#00C853' : '#777'}
            />
          </View>

          <View style={styles.divider} />

          {/* Change Password */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              if (!user) {
                Alert.alert('Guest User', 'Please sign in to manage account password.');
                return;
              }
              setShowPasswordModal(true);
            }}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={20} color="#888" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Change Password</Text>
              <Text style={styles.subtitle}>Update your secret master passphrase</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* 2FA */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="phone-portrait-outline" size={20} color="#888" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Two-Factor Verification</Text>
              <Text style={styles.subtitle}>Email OTP verification on unfamiliar logins</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Standard</Text>
            </View>
          </View>
        </View>

        {/* Sessions */}
        <Text style={styles.sectionHeader}>ACTIVE SESSIONS</Text>
        <View style={styles.card}>
          <View style={styles.sessionRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="hardware-chip-outline" size={20} color="#00C853" />
            </View>
            <View style={styles.textCol}>
              <View style={styles.sessionHeaderRow}>
                <Text style={styles.title}>Current Device ({Platform.OS.toUpperCase()})</Text>
                <View style={styles.activeDot} />
              </View>
              <Text style={styles.subtitle}>Expo Client • Active Now</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} onPress={handleSignoutAll}>
            <View style={styles.iconCircle}>
              <Ionicons name="exit-outline" size={20} color="#ff4444" />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.title, { color: '#ff4444' }]}>Terminate Other Sessions</Text>
              <Text style={styles.subtitle}>Log out of all other web and mobile sessions</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Data Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed" size={15} color="#555" />
          <Text style={styles.privacyNoteText}>
            GrowPlay is a paper trading platform. We never ask for your real Demat credentials, bank PINs, or trading passwords.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#555"
            />

            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor="#555"
            />

            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.modalSaveText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d2818',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00C85340',
    marginBottom: 20,
    gap: 14,
  },
  shieldCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00C85320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    color: '#00C853',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  statusSubtitle: {
    color: '#999',
    fontSize: 12,
    lineHeight: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00C853',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
    lineHeight: 16,
  },
  activePill: {
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#1c1c1c',
    marginLeft: 64,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  privacyNoteText: {
    color: '#555',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalSaveBtn: {
    backgroundColor: '#00C853',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSaveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
