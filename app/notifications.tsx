import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationsScreen() {
  const [streakAlert, setStreakAlert] = useState(true);
  const [marketOpenAlert, setMarketOpenAlert] = useState(true);
  const [marketCloseAlert, setMarketCloseAlert] = useState(false);
  const [orderAlert, setOrderAlert] = useState(true);
  const [leagueAlert, setLeagueAlert] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.streakAlert !== undefined) setStreakAlert(parsed.streakAlert);
        if (parsed.marketOpenAlert !== undefined) setMarketOpenAlert(parsed.marketOpenAlert);
        if (parsed.marketCloseAlert !== undefined) setMarketCloseAlert(parsed.marketCloseAlert);
        if (parsed.orderAlert !== undefined) setOrderAlert(parsed.orderAlert);
        if (parsed.leagueAlert !== undefined) setLeagueAlert(parsed.leagueAlert);
        if (parsed.weeklyDigest !== undefined) setWeeklyDigest(parsed.weeklyDigest);
        if (parsed.soundsEnabled !== undefined) setSoundsEnabled(parsed.soundsEnabled);
      }
    } catch (e) {
      console.log('Failed to load notification settings:', e);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      const current = stored ? JSON.parse(stored) : {};
      current[key] = value;
      await AsyncStorage.setItem('notification_settings', JSON.stringify(current));
    } catch (e) {
      console.log('Failed to save notification setting:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="notifications" size={24} color="#00C853" />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Stay Ahead in the Game</Text>
            <Text style={styles.bannerSubtitle}>
              Customize alerts so you never miss a market move or break your learning streak.
            </Text>
          </View>
        </View>

        {/* Learning & Streaks */}
        <Text style={styles.sectionHeader}>LEARNING & COMMUNITY</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="flame" size={18} color="#FF9100" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Daily Streak Reminder</Text>
              <Text style={styles.subtitle}>8:00 PM reminder to protect your active daily streak</Text>
            </View>
            <Switch
              value={streakAlert}
              onValueChange={(val) => {
                setStreakAlert(val);
                saveSetting('streakAlert', val);
              }}
              trackColor={{ false: '#262626', true: '#00C85340' }}
              thumbColor={streakAlert ? '#00C853' : '#777'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="trophy" size={18} color="#FFD700" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>League Rank Shifts</Text>
              <Text style={styles.subtitle}>Get notified when other traders overtake your ranking</Text>
            </View>
            <Switch
              value={leagueAlert}
              onValueChange={(val) => {
                setLeagueAlert(val);
                saveSetting('leagueAlert', val);
              }}
              trackColor={{ false: '#262626', true: '#00C85340' }}
              thumbColor={leagueAlert ? '#00C853' : '#777'}
            />
          </View>
        </View>

        {/* Market Timers */}
        <Text style={styles.sectionHeader}>MARKET ALERTS (IST)</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="sunny-outline" size={18} color="#00E5FF" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Market Open Bell</Text>
              <Text style={styles.subtitle}>9:15 AM alert when NSE/BSE regular trading begins</Text>
            </View>
            <Switch
              value={marketOpenAlert}
              onValueChange={(val) => {
                setMarketOpenAlert(val);
                saveSetting('marketOpenAlert', val);
              }}
              trackColor={{ false: '#262626', true: '#00C85340' }}
              thumbColor={marketOpenAlert ? '#00C853' : '#777'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="moon-outline" size={18} color="#B388FF" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Market Close Warning</Text>
              <Text style={styles.subtitle}>3:15 PM alert before intraday square-off at 3:30 PM</Text>
            </View>
            <Switch
              value={marketCloseAlert}
              onValueChange={(val) => {
                setMarketCloseAlert(val);
                saveSetting('marketCloseAlert', val);
              }}
              trackColor={{ false: '#262626', true: '#00C85340' }}
              thumbColor={marketCloseAlert ? '#00C853' : '#777'}
            />
          </View>
        </View>

        {/* Trading Orders */}
        <Text style={styles.sectionHeader}>PAPER TRADING ACTIVITY</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="flash-outline" size={18} color="#00C853" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Order Fulfillments</Text>
              <Text style={styles.subtitle}>Instant confirmation when virtual buy/sell trades execute</Text>
            </View>
            <Switch
              value={orderAlert}
              onValueChange={(val) => {
                setOrderAlert(val);
                saveSetting('orderAlert', val);
              }}
              trackColor={{ false: '#262626', true: '#00C85340' }}
              thumbColor={orderAlert ? '#00C853' : '#777'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="newspaper-outline" size={18} color="#888" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Weekly Performance Digest</Text>
              <Text style={styles.subtitle}>Sunday summary of your virtual P&L and XP earned</Text>
            </View>
            <Switch
              value={weeklyDigest}
              onValueChange={(val) => {
                setWeeklyDigest(val);
                saveSetting('weeklyDigest', val);
              }}
              trackColor={{ false: '#262626', true: '#00C85340' }}
              thumbColor={weeklyDigest ? '#00C853' : '#777'}
            />
          </View>
        </View>

        {/* In-app sound */}
        <Text style={styles.sectionHeader}>SOUNDS & HAPTICS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="volume-medium-outline" size={18} color="#00C853" />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Sound & Trade Haptics</Text>
              <Text style={styles.subtitle}>Play subtle sounds on quiz completion and trade placement</Text>
            </View>
            <Switch
              value={soundsEnabled}
              onValueChange={(val) => {
                setSoundsEnabled(val);
                saveSetting('soundsEnabled', val);
              }}
              trackColor={{ false: '#262626', true: '#00C85340' }}
              thumbColor={soundsEnabled ? '#00C853' : '#777'}
            />
          </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c2415',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00C85330',
    marginBottom: 20,
    gap: 14,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#00C853',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  bannerSubtitle: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 17,
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
  divider: {
    height: 1,
    backgroundColor: '#1c1c1c',
    marginLeft: 64,
  },
});
