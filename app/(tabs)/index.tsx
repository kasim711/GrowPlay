import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfile, getOrCreateProfile, syncDailyLoginStreak } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LESSONS } from './learn';
import NavHeader from '@/components/NavHeader';

const PortfolioChart = ({ pnl }: { pnl: number }) => {
  const isPositive = pnl >= 0;
  const isZero = pnl === 0;
  const color = isPositive ? '#00C853' : '#ff4444';

  const path = isZero
    ? "M0,40 L300,40"
    : isPositive
    ? "M0,70 C20,65 40,60 60,55 C80,50 90,52 110,45 C130,38 140,42 160,35 C180,28 190,30 210,22 C230,14 250,18 270,10 C285,5 295,3 300,2"
    : "M0,10 C20,15 40,20 60,25 C80,30 90,28 110,35 C130,42 140,38 160,45 C180,52 190,50 210,58 C230,66 250,62 270,70 C285,75 295,77 300,78";

  const fillPath = isZero
    ? `M0,40 L300,40 L300,80 L0,80 Z`
    : isPositive
    ? "M0,70 C20,65 40,60 60,55 C80,50 90,52 110,45 C130,38 140,42 160,35 C180,28 190,30 210,22 C230,14 250,18 270,10 C285,5 295,3 300,2 L300,80 L0,80 Z"
    : "M0,10 C20,15 40,20 60,25 C80,30 90,28 110,35 C130,42 140,38 160,45 C180,52 190,50 210,58 C230,66 250,62 270,70 C285,75 295,77 300,78 L300,80 L0,80 Z";

  return (
    <Svg width="100%" height="80" viewBox="0 0 300 80">
      <Defs>
        <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d={fillPath} fill="url(#lineGrad)" />
    </Svg>
  );
};

const CHALLENGES = [
  { title: 'Complete a lesson today', reward: 50, icon: 'book-outline', action: '/(tabs)/learn' },
  { title: 'Make 3 virtual trades', reward: 50, icon: 'trending-up-outline', action: '/(tabs)/trade' },
  { title: 'Maintain your streak', reward: 30, icon: 'flame-outline', action: '/(tabs)/learn' },
  { title: 'Explore 5 different stocks', reward: 40, icon: 'search-outline', action: '/(tabs)/trade' },
  { title: 'Sell a stock for profit', reward: 60, icon: 'cash-outline', action: '/(tabs)/trade' },
  { title: 'Finish 2 lessons in a row', reward: 80, icon: 'school-outline', action: '/(tabs)/learn' },
  { title: 'Build a diversified portfolio', reward: 70, icon: 'pie-chart-outline', action: '/(tabs)/trade' },
];

export default function Home() {
  const [marketData, setMarketData] = useState({
    nifty: { price: '--', change: '--', isPositive: true },
    sensex: { price: '--', change: '--', isPositive: true },
  });
  const [profile, setProfile] = useState<any>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  useEffect(() => {
    fetchMarketData();
    loadProfile();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    const savedXP = await AsyncStorage.getItem('total_xp');
    if (savedXP) setXp(Math.max(0, parseInt(savedXP) || 0));
    const savedLessons = await AsyncStorage.getItem('completed_lessons');
    if (savedLessons) setCompletedLessons(JSON.parse(savedLessons));

    const { data } = await supabase.auth.getUser();
    const streakResult = await syncDailyLoginStreak(data?.user?.id);
    setStreak(streakResult.streak);

    if (data?.user) {
      let p = await getProfile(data.user.id);
      if (!p) {
        p = await getOrCreateProfile(data.user.id, data.user.email || '');
      }
      if (p) {
        setProfile(p);
        const validXP = Math.max(0, p.xp ?? 0);
        setXp(validXP);
        await AsyncStorage.setItem('total_xp', validXP.toString());
        setStreak(streakResult.streak);
      }
    }
  };

  const fetchMarketData = async () => {
    try {
      const [niftyRes, sensexRes] = await Promise.all([
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI'),
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN'),
      ]);
      const niftyData = await niftyRes.json();
      const sensexData = await sensexRes.json();

      const niftyPrice = niftyData?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const niftyPrevClose = niftyData?.chart?.result?.[0]?.meta?.previousClose;
      const sensexPrice = sensexData?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const sensexPrevClose = sensexData?.chart?.result?.[0]?.meta?.previousClose;

      const niftyChange = (niftyPrice - niftyPrevClose).toFixed(2);
      const sensexChange = (sensexPrice - sensexPrevClose).toFixed(2);

      setMarketData({
        nifty: {
          price: niftyPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '--',
          change: `${Number(niftyChange) >= 0 ? '+' : ''}${niftyChange}`,
          isPositive: Number(niftyChange) >= 0,
        },
        sensex: {
          price: sensexPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '--',
          change: `${Number(sensexChange) >= 0 ? '+' : ''}${sensexChange}`,
          isPositive: Number(sensexChange) >= 0,
        },
      });
    } catch (e) {
      console.log('Market data error:', e);
    }
  };

  const nextLesson = LESSONS.find(l => !completedLessons.includes(l.id));
  const lessonProgress = completedLessons.length / LESSONS.length;
  const todayChallenge = CHALLENGES[new Date().getDate() % CHALLENGES.length];
  const totalPnl = profile?.total_pnl ?? 0;
  const isPnlPositive = totalPnl >= 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <NavHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Professional Portfolio Balance Card */}
        <View style={styles.portfolioCard}>
          <View
            style={[
              styles.portfolioCardGlow,
              { backgroundColor: isPnlPositive ? '#00C85312' : '#ff444412' },
            ]}
          />

          <View style={styles.portfolioHeader}>
            <View style={styles.portfolioTitleGroup}>
              <Text style={styles.portfolioLabel}>VIRTUAL TRADING BALANCE</Text>
            </View>

            <View
              style={[
                styles.portfolioBadge,
                {
                  borderColor: isPnlPositive ? '#00C85340' : '#ff444440',
                  backgroundColor: isPnlPositive ? '#00C85315' : '#ff444415',
                },
              ]}
            >
              <Ionicons
                name={isPnlPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={isPnlPositive ? '#00C853' : '#ff4444'}
              />
              <Text style={[styles.portfolioBadgeText, { color: isPnlPositive ? '#00C853' : '#ff4444' }]}>
                {isPnlPositive ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          <Text style={styles.portfolioAmount} numberOfLines={1} adjustsFontSizeToFit>
            ₹{profile
              ? profile.virtual_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '10,00,000.00'}
          </Text>

          {/* Clean P&L row */}
          <View style={styles.portfolioSubMetrics}>
            <View style={[styles.pnlChipHome, { backgroundColor: isPnlPositive ? '#00C85318' : '#ff444418', borderColor: isPnlPositive ? '#00C85340' : '#ff444440' }]}>
              <Ionicons name={isPnlPositive ? 'arrow-up' : 'arrow-down'} size={11} color={isPnlPositive ? '#00C853' : '#ff4444'} />
              <Text style={[styles.pnlChipHomeText, { color: isPnlPositive ? '#00C853' : '#ff4444' }]}>
                {isPnlPositive ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Overall P&L
              </Text>
            </View>
          </View>

          <PortfolioChart pnl={profile?.total_pnl ?? 0} />
        </View>

        {/* 2 Column Cards */}
        <View style={styles.twoCol}>

          {/* Streak */}
          <View style={styles.streakCard}>
            <View style={styles.fireCircle}>
              <Ionicons name="flame" size={24} color="#ff6b35" />
            </View>
            <Text style={styles.streakDays} numberOfLines={1} adjustsFontSizeToFit>{streak} Days</Text>
            <Text style={styles.streakLabel}>Streak</Text>
          </View>

          {/* Next Lesson */}
          <TouchableOpacity
            style={styles.lessonCard}
            onPress={() => router.push('/(tabs)/learn' as any)}
          >
            <Text style={styles.lessonLabel}>NEXT LESSON</Text>
            <Text style={styles.lessonTitle} numberOfLines={2} ellipsizeMode="tail">
              {nextLesson ? nextLesson.title : 'All done! 🎉'}
            </Text>
            <View style={styles.lessonProgressRow}>
              <View style={styles.lessonProgressBar}>
                <View style={[styles.lessonProgressFill, { width: `${lessonProgress * 100}%` }]} />
              </View>
              <Text style={styles.lessonProgressText}>
                {Math.round(lessonProgress * 100)}%
              </Text>
            </View>
            <Ionicons name="school" size={40} color="#1a2a1a" style={styles.lessonIcon} />
          </TouchableOpacity>

        </View>

        {/* Markets Card */}
        <View style={styles.marketsCard}>
          <Text style={styles.marketsLabel}>MARKETS</Text>
          <View style={styles.marketRow}>
            <Text style={styles.marketName} numberOfLines={1}>NIFTY 50</Text>
            <View style={styles.marketRight}>
              <Text style={styles.marketPrice} numberOfLines={1}>{marketData.nifty.price}</Text>
              <Text style={[styles.marketChange, { color: marketData.nifty.isPositive ? '#00C853' : '#ff4444' }]} numberOfLines={1}>
                {marketData.nifty.change}
              </Text>
            </View>
          </View>
          <View style={styles.marketDivider} />
          <View style={styles.marketRow}>
            <Text style={styles.marketName} numberOfLines={1}>SENSEX</Text>
            <View style={styles.marketRight}>
              <Text style={styles.marketPrice} numberOfLines={1}>{marketData.sensex.price}</Text>
              <Text style={[styles.marketChange, { color: marketData.sensex.isPositive ? '#00C853' : '#ff4444' }]} numberOfLines={1}>
                {marketData.sensex.change}
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Challenge */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeLeft}>
            <View style={styles.trophyCircle}>
              <Ionicons name="trophy" size={24} color="#00C853" />
            </View>
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeLabel}>DAILY CHALLENGE</Text>
              <Text style={styles.challengeTitle} numberOfLines={1} ellipsizeMode="tail">{todayChallenge.title}</Text>
              <Text style={styles.challengeReward} numberOfLines={1}>Reward: {todayChallenge.reward} XP</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => router.push(todayChallenge.action as any)}
          >
            <Text style={styles.playButtonText}>Play Now</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  avatarText: {
    color: '#00C853',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoText: {
    color: '#00C853',
    fontSize: 20,
    fontWeight: 'bold',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  starCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  portfolioCard: {
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#242424',
    overflow: 'hidden',
    position: 'relative',
  },
  portfolioCardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  portfolioTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portfolioLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C85315',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00C85330',
  },
  liveGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
  simBadgeText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  portfolioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  portfolioBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  portfolioAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  portfolioSubMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pnlChipHome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  pnlChipHomeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  subMetricLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subMetricValue: {
    color: '#ddd',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#292929',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  streakCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222',
    gap: 8,
    overflow: 'hidden',
  },
  fireCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  streakDays: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  streakLabel: {
    color: '#888',
    fontSize: 13,
  },
  lessonCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  lessonLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  lessonTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 22,
    marginBottom: 12,
  },
  lessonProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lessonProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
  },
  lessonProgressFill: {
    height: 4,
    backgroundColor: '#00C853',
    borderRadius: 2,
  },
  lessonProgressText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lessonIcon: {
    position: 'absolute',
    right: -8,
    bottom: -8,
  },
  marketsCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  marketsLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  marketDivider: {
    height: 1,
    backgroundColor: '#1a1a1a',
  },
  marketName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  marketRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  marketPrice: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  marketChange: {
    fontSize: 13,
    marginTop: 2,
  },
  challengeCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00C853',
    gap: 12,
    overflow: 'hidden',
  },
  challengeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trophyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a2a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00C853',
    flexShrink: 0,
  },
  challengeInfo: {
    flex: 1,
    minWidth: 0,
  },
  challengeLabel: {
    color: '#00C853',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  challengeTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  challengeReward: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  playButton: {
    backgroundColor: '#00C853',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});