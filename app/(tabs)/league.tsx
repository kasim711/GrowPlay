import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLeaderboard,
  getWeeklyPnl,
  calculateWeeklyCompetitionXP,
  getWeeklySeasonTimeline,
  WeeklySeasonTimeline,
  getUserArenaState,
  saveUserArenaPreference,
  calculateCohortAssignment,
  UserArenaState,
  NextSeasonPreference,
} from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import NavHeader from '@/components/NavHeader';
import { getAvatarById } from '@/constants/avatars';
import { router, useFocusEffect } from 'expo-router';

export interface LeagueTier {
  id: string;
  name: string;
  tier: string;
  color: string;
  glowColor: string;
  minXP: number;
  maxXP: number;
  shieldEmoji: string;
  perk: string;
}

export const LEAGUES: LeagueTier[] = [
  { id: 'b1', name: 'Bronze I', tier: 'Bronze', color: '#CD7F32', glowColor: '#CD7F3225', minXP: 0, maxXP: 199, shieldEmoji: '🥉', perk: '5% Virtual Trade Rebate' },
  { id: 'b2', name: 'Bronze II', tier: 'Bronze', color: '#CD7F32', glowColor: '#CD7F3225', minXP: 200, maxXP: 399, shieldEmoji: '🥉', perk: '10% Virtual Trade Rebate' },
  { id: 'b3', name: 'Bronze III', tier: 'Bronze', color: '#CD7F32', glowColor: '#CD7F3225', minXP: 400, maxXP: 699, shieldEmoji: '🥉', perk: '15% Virtual Trade Rebate' },
  { id: 's1', name: 'Silver I', tier: 'Silver', color: '#C0C0C0', glowColor: '#C0C0C025', minXP: 700, maxXP: 999, shieldEmoji: '🥈', perk: '20% Virtual Trade Rebate' },
  { id: 's2', name: 'Silver II', tier: 'Silver', color: '#C0C0C0', glowColor: '#C0C0C025', minXP: 1000, maxXP: 1399, shieldEmoji: '🥈', perk: '25% Virtual Trade Rebate' },
  { id: 's3', name: 'Silver III', tier: 'Silver', color: '#C0C0C0', glowColor: '#C0C0C025', minXP: 1400, maxXP: 1799, shieldEmoji: '🥈', perk: '30% Virtual Trade Rebate' },
  { id: 'g1', name: 'Gold I', tier: 'Gold', color: '#FFD700', glowColor: '#FFD70025', minXP: 1800, maxXP: 2299, shieldEmoji: '🥇', perk: '+100 XP / Profitable Trade' },
  { id: 'g2', name: 'Gold II', tier: 'Gold', color: '#FFD700', glowColor: '#FFD70025', minXP: 2300, maxXP: 2899, shieldEmoji: '🥇', perk: '+150 XP / Profitable Trade' },
  { id: 'g3', name: 'Gold III', tier: 'Gold', color: '#FFD700', glowColor: '#FFD70025', minXP: 2900, maxXP: 3599, shieldEmoji: '🥇', perk: '+200 XP / Profitable Trade' },
  { id: 'd1', name: 'Diamond I', tier: 'Diamond', color: '#00BFFF', glowColor: '#00BFFF25', minXP: 3600, maxXP: 4499, shieldEmoji: '💎', perk: 'Diamond Crest + 300 XP Bonus' },
  { id: 'd2', name: 'Diamond II', tier: 'Diamond', color: '#00BFFF', glowColor: '#00BFFF25', minXP: 4500, maxXP: 5499, shieldEmoji: '💎', perk: 'Diamond Crest + 400 XP Bonus' },
  { id: 'd3', name: 'Diamond III', tier: 'Diamond', color: '#00BFFF', glowColor: '#00BFFF25', minXP: 5500, maxXP: 6999, shieldEmoji: '💎', perk: 'Diamond Crest + 500 XP Bonus' },
  { id: 'leg', name: 'Legend', tier: 'Legend', color: '#FFD700', glowColor: '#FFD70035', minXP: 7000, maxXP: 999999, shieldEmoji: '👑', perk: 'Legend Crown & Hall of Fame' },
];

const getUserLeague = (xp: number): LeagueTier => {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (xp >= LEAGUES[i].minXP) return LEAGUES[i];
  }
  return LEAGUES[0];
};

const getNextLeague = (xp: number): LeagueTier | null => {
  for (let i = 0; i < LEAGUES.length; i++) {
    if (xp < LEAGUES[i].minXP) return LEAGUES[i];
  }
  return null;
};

const getRankColor = (rank: number) => {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  if (rank <= 10) return '#00C853'; // Promotion
  if (rank > 85) return '#FF5252'; // Demotion
  return '#666';
};

export default function League() {
  const [myBaseXP, setMyBaseXP] = useState(0);
  const [myWeeklyPnl, setMyWeeklyPnl] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [seasonTimeline, setSeasonTimeline] = useState<WeeklySeasonTimeline>(getWeeklySeasonTimeline());
  const [myUsername, setMyUsername] = useState('You');
  const [myAvatarEmoji, setMyAvatarEmoji] = useState('🐂');
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [showAllLeaguesModal, setShowAllLeaguesModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [hasJoinedArena, setHasJoinedArena] = useState(false);
  const [joiningArena, setJoiningArena] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // Group Allocation & Next Season Choice State
  const [arenaState, setArenaState] = useState<UserArenaState>({
    mode: 'group',
    groupNumber: 1,
    nextSeasonPref: 'stay',
  });
  const [savingPref, setSavingPref] = useState(false);
  const [showSeasonSwitchModal, setShowSeasonSwitchModal] = useState(false);

  const loadData = async () => {
    let baseXP = 0;
    const saved = await AsyncStorage.getItem('total_xp');
    if (saved) {
      baseXP = parseInt(saved);
      setMyBaseXP(baseXP);
    }

    const savedJoined = await AsyncStorage.getItem('growplay_arena_joined');
    if (savedJoined === 'true') {
      setHasJoinedArena(true);
    }

    const savedAvatarId = await AsyncStorage.getItem('avatar_id');
    if (savedAvatarId) {
      setMyAvatarEmoji(getAvatarById(savedAvatarId).emoji);
    }

    const currentArenaState = await getUserArenaState(1);
    if (currentArenaState.groupNumber === 14) {
      currentArenaState.groupNumber = 1;
      await AsyncStorage.setItem('growplay_arena_group', '1');
    }
    setArenaState(currentArenaState);

    const { data } = await supabase.auth.getUser();
    setUser(data?.user ?? null);
    let pnl = 0;
    if (data?.user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (p) {
        setProfile(p);
        if (p.xp !== undefined) {
          const validXP = Math.max(0, p.xp);
          baseXP = validXP;
          setMyBaseXP(validXP);
          await AsyncStorage.setItem('total_xp', validXP.toString());
        }
        setMyUsername(p.username ?? 'You');
        if (p.avatar_id) {
          setMyAvatarEmoji(getAvatarById(p.avatar_id).emoji);
        }
      }
      pnl = await getWeeklyPnl(data.user.id);
    } else {
      setProfile(null);
      setMyUsername('Trader');
      pnl = await getWeeklyPnl();
    }
    setMyWeeklyPnl(pnl);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadLeaderboard();
    }, [])
  );

  useEffect(() => {
    loadLeaderboard();
    const updateTimer = () => setSeasonTimeline(getWeeklySeasonTimeline());
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadLeaderboard = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setLeaderboard([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, xp, total_pnl, streak, avatar_url')
        .order('xp', { ascending: false })
        .limit(100);
      if (data) {
        setLeaderboard(data.map((u: any) => ({ ...u, avatar_id: u.avatar_id || u.avatar_url })));
      }
    } catch (e) {
      console.log('Error loading real leaderboard:', e);
    }
  };

  // Calculate user's active competition XP based on net weekly performance
  const { totalWeeklyXP, weeklyPnlXP } = calculateWeeklyCompetitionXP(myBaseXP, myWeeklyPnl);

  const myLeague = getUserLeague(totalWeeklyXP);
  const nextLeague = getNextLeague(totalWeeklyXP);
  const progress = nextLeague
    ? ((totalWeeklyXP - myLeague.minXP) / (nextLeague.minXP - myLeague.minXP)) * 100
    : 100;

  // 100% Real Registered Users from Supabase (Cohort of up to 100)
  const arena100Users = useMemo(() => {
    const list = [...leaderboard];

    const myIndex = list.findIndex(
      (u) => u.username === myUsername || (u.id && u.id === profile?.id)
    );

    const meUser = {
      id: profile?.id || 'me',
      name: myUsername,
      xp: Math.max(0, totalWeeklyXP),
      baseXP: Math.max(0, myBaseXP),
      weeklyPnl: myWeeklyPnl,
      weeklyPnlXP,
      avatar: myAvatarEmoji,
      isMe: true,
      streak: profile?.streak ?? 0,
    };

    if (myIndex >= 0) {
      list[myIndex] = meUser;
    } else {
      list.push(meUser);
    }

    const formatted = list.map((u) => {
      if (u.isMe) return u;
      const avatar = getAvatarById(u.avatar_id);
      const pnl = u.total_pnl ?? 0;
      return {
        id: u.id,
        name: u.username || 'Trader',
        xp: Math.max(0, u.xp ?? 0),
        weeklyPnl: pnl,
        weeklyPnlXP: Math.round(pnl / 100),
        avatar: avatar.emoji,
        streak: u.streak ?? 0,
        isMe: false,
      };
    });

    formatted.sort((a, b) => b.xp - a.xp);
    return formatted;
  }, [leaderboard, myUsername, profile, totalWeeklyXP, myBaseXP, myWeeklyPnl, weeklyPnlXP, myAvatarEmoji]);

  const myRank = Math.max(1, arena100Users.findIndex((u) => u.isMe) + 1);

  // Auto-Fill Incomplete Group Calculation
  const { openGroup, groupFillCount } = useMemo(() => {
    return calculateCohortAssignment(leaderboard.length);
  }, [leaderboard.length]);

  const handleSelectPreference = async (pref: NextSeasonPreference) => {
    setSavingPref(true);
    try {
      const updated = await saveUserArenaPreference(
        pref,
        arenaState.groupNumber,
        leaderboard.length
      );
      setArenaState(updated);

      let title = 'Next Season Choice Saved ⚔️';
      let msg = '';
      if (pref === 'stay') {
        msg = `You are locked in to remain in Arena Group #${updated.groupNumber} next season.`;
      } else if (pref === 'change') {
        msg = `You will swap and auto-fill into Arena Group #${updated.groupNumber} (100 traders capacity) on Monday 9:15 AM so no group stays incomplete.`;
      } else {
        msg = `Individual / Solo Mode selected! You will trade at your own pace to view where you stand on the Global Leaderboard (season rewards are exclusive to Arena groups).`;
      }
      Alert.alert(title, msg);
      setShowSeasonSwitchModal(false);
    } catch (e) {
      console.log('Error saving preference:', e);
    } finally {
      setSavingPref(false);
    }
  };

  const handleJoinArena = async () => {
    if (!user) {
      Alert.alert(
        'Login Required ⚔️',
        'You are browsing as Guest. Sign up or login to enter the 100-player arena tournament and compete on the leaderboard.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login / Sign Up 🚀', onPress: () => router.push('/auth' as any) }
        ]
      );
      return;
    }
    setJoiningArena(true);
    const assignedGroup = (hasJoinedArena && arenaState.groupNumber && arenaState.groupNumber !== 14) ? arenaState.groupNumber : (openGroup || 1);
    await AsyncStorage.setItem('growplay_arena_joined', 'true');
    await AsyncStorage.setItem('growplay_arena_group', assignedGroup.toString());
    await AsyncStorage.setItem('growplay_arena_mode', 'group');
    setArenaState((prev) => ({ ...prev, mode: 'group', groupNumber: assignedGroup }));
    setTimeout(() => {
      setHasJoinedArena(true);
      setJoiningArena(false);
      Alert.alert(
        `⚔️ Welcome to Arena Group #${assignedGroup}!`,
        `You have entered the 100-Trader Arena in ${myLeague.name}.\n\nYou are at Rank #${myRank} of 100.\n\nWeekly Performance Rule: Finishing in net profit boosts your competition XP (+1 XP / ₹100), while net losses deduct XP. Top performers qualify for Season Rewards!`,
        [{ text: 'Start Battling 🚀' }]
      );
    }, 500);
  };

  const LeaderCard = ({ user, rank }: { user: any; rank: number }) => {
    const rankColor = getRankColor(rank);
    const isTop3 = rank <= 3;
    const isPromotion = rank <= 10;
    const isDemotion = rank > 85;
    const pnl = user.weeklyPnl ?? 0;
    const pnlXP = user.weeklyPnlXP ?? Math.round(pnl / 100);

    return (
      <View
        style={[
          styles.leaderCard,
          user.isMe && styles.myCard,
          {
            borderLeftColor: user.isMe ? '#00C853' : rankColor,
            borderLeftWidth: 3,
          },
          isTop3 && { backgroundColor: rankColor + '0A' },
        ]}
      >
        <View style={styles.rankContainer}>
          <Text style={[styles.rankNumber, { color: user.isMe ? '#00C853' : rankColor }]}>
            {rank}
          </Text>
          {isPromotion && <View style={styles.promBadgeDot} />}
          {isDemotion && <View style={styles.demBadgeDot} />}
        </View>

        <View style={[styles.userAvatarCircle, isTop3 && { borderColor: rankColor }]}>
          <Text style={styles.userAvatarText}>{user.avatar}</Text>
        </View>

        <View style={[styles.userInfo, { minWidth: 0, marginRight: 8 }]}>
          <View style={[styles.userNameRow, { flexWrap: 'wrap' }]}>
            <Text style={[styles.userName, user.isMe && { color: '#00C853' }]} numberOfLines={1} ellipsizeMode="tail">
              {user.name}
            </Text>
            {user.isMe && (
              <View style={styles.youPill}>
                <Text style={styles.youPillText}>YOU</Text>
              </View>
            )}
          </View>
          <View style={styles.userWeeklyRow}>
            <Text style={[styles.userWeeklyPnlText, { color: pnl >= 0 ? '#00C853' : '#ff5252' }]} numberOfLines={1}>
              Week: {pnl >= 0 ? `+₹${pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(pnl).toLocaleString('en-IN')}`}
              <Text style={{ color: pnl >= 0 ? '#00C853' : '#ff5252', fontWeight: 'bold' }}>
                {' '}({pnlXP >= 0 ? `+${pnlXP}` : `${pnlXP}`} XP)
              </Text>
            </Text>
          </View>
        </View>

        <View style={[styles.userXPContainer, { flexShrink: 0 }]}>
          <Text style={[styles.userXPBig, { color: isTop3 ? rankColor : '#fff' }]} numberOfLines={1}>
            {user.xp.toLocaleString()}
          </Text>
          <Text style={styles.userXPLabel}>ARENA XP</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Navbar */}
      <NavHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Sleek Compact Tier & Guide Header */}
        <View style={[styles.compactTierCard, { borderColor: myLeague.color + '50' }]}>
          <View style={[styles.compactGlow, { backgroundColor: myLeague.glowColor }]} />
          
          <View style={styles.compactTierTopRow}>
            <View style={styles.compactTierLeft}>
              <View style={styles.compactTierTitleRow}>
                <Text style={styles.compactTierEmoji}>{myLeague.shieldEmoji}</Text>
                <View>
                  <Text style={[styles.compactTierName, { color: myLeague.color }]}>
                    {myLeague.name}
                  </Text>
                  <Text style={styles.compactRankText}>
                    {hasJoinedArena
                      ? arenaState.mode === 'individual'
                        ? `Global Rank #${myRank}`
                        : `Rank #${myRank} of 100 • Arena #${arenaState.groupNumber}`
                      : `Arena #${arenaState.groupNumber} Available`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Badges */}
            <View style={styles.compactActionsRow}>
              <TouchableOpacity
                style={styles.infoGuideBadge}
                activeOpacity={0.7}
                onPress={() => setShowInfoModal(true)}
              >
                <Ionicons name="information-circle" size={15} color="#00C853" />
                <Text style={styles.infoGuideBadgeText}>Rules & Info</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.allTiersBadge, { borderColor: myLeague.color + '40' }]}
                activeOpacity={0.7}
                onPress={() => setShowAllLeaguesModal(true)}
              >
                <Ionicons name="trophy-outline" size={13} color={myLeague.color} />
                <Text style={[styles.allTiersBadgeText, { color: myLeague.color }]}>13 Tiers</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress bar to next tier */}
          {nextLeague && (
            <View style={styles.compactProgressSection}>
              <View style={styles.xpProgressRow}>
                <Text style={styles.xpProgressLeft}>{totalWeeklyXP.toLocaleString()} XP</Text>
                <Text style={styles.xpProgressRight}>
                  Next: <Text style={{ color: nextLeague.color }}>{nextLeague.name}</Text> ({nextLeague.minXP.toLocaleString()} XP)
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: myLeague.color,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* 2. Compact Performance & Live Season Timer Strip */}
        <View style={styles.compactStatsStrip}>
          {/* Card A: Weekly Performance */}
          <TouchableOpacity
            style={styles.compactStatTile}
            activeOpacity={0.8}
            onPress={() => setShowInfoModal(true)}
          >
            <View style={styles.compactStatHeader}>
              <Ionicons
                name={myWeeklyPnl >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={myWeeklyPnl >= 0 ? '#00C853' : '#ff5252'}
              />
              <Text style={styles.compactStatTitle}>WEEKLY P&L</Text>
            </View>
            <Text
              style={[
                styles.compactStatValue,
                { color: myWeeklyPnl >= 0 ? '#00C853' : '#ff5252' },
              ]}
              numberOfLines={1}
            >
              {myWeeklyPnl >= 0 ? '+' : ''}₹{myWeeklyPnl.toLocaleString('en-IN')}
            </Text>
            <View style={styles.compactStatSubRow}>
              <Text style={styles.compactStatSubText}>
                {weeklyPnlXP >= 0 ? `+${weeklyPnlXP}` : weeklyPnlXP} XP Shift
              </Text>
              <Text style={styles.compactStatScoreVal}>
                Score: {totalWeeklyXP} XP
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card B: Live Season Countdown */}
          <TouchableOpacity
            style={[
              styles.compactStatTile,
              seasonTimeline.isActive ? styles.compactTimerLive : styles.compactTimerIntermission,
            ]}
            activeOpacity={0.8}
            onPress={() => setShowInfoModal(true)}
          >
            <View style={styles.compactStatHeader}>
              <View
                style={[
                  styles.compactStatusDot,
                  { backgroundColor: seasonTimeline.isActive ? '#00E676' : '#FFA000' },
                ]}
              />
              <Text
                style={[
                  styles.compactStatTitle,
                  { color: seasonTimeline.isActive ? '#00E676' : '#FFA000' },
                ]}
              >
                {seasonTimeline.isActive ? 'SEASON LIVE' : 'INTERMISSION'}
              </Text>
            </View>
            <Text style={styles.compactTimerDigits} numberOfLines={1}>
              {seasonTimeline.days}d {seasonTimeline.hrs}h {seasonTimeline.mins}m {seasonTimeline.secs}s
            </Text>
            <View style={styles.compactStatSubRow}>
              <Text style={styles.compactTimerHint}>
                {seasonTimeline.isActive ? 'Closes Fri 4 PM' : 'Opens Mon 9:15 AM'}
              </Text>
              <Text style={styles.compactTimerInfoIcon}>Rules ⓘ</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SEASON TRANSITION CHOICE CARD (WHEN SEASON SETTLES ON FRIDAY 4:00 PM) */}
        {!seasonTimeline.isActive && user && (
          <View style={styles.seasonTransitionCard}>
            <View style={styles.transitionHeaderRow}>
              <View style={styles.transitionBadge}>
                <Text style={styles.transitionBadgeText}>🏆 SEASON SETTLED</Text>
              </View>
              <Text style={styles.transitionSubBadge}>Next Kickoff: Mon 9:15 AM</Text>
            </View>

            <Text style={styles.transitionTitle}>Choose Next Season Path ⚔️</Text>
            <Text style={styles.transitionDesc}>
              The weekly trading season has settled! Before next Monday 9:15 AM kickoff, choose how you want to compete next week:
            </Text>

            {/* 3 Options */}
            <View style={styles.transitionOptionsContainer}>
              {/* Option 1: Stay in current group */}
              <TouchableOpacity
                style={[
                  styles.transitionOptionCard,
                  arenaState.nextSeasonPref === 'stay' && styles.transitionOptionCardSelected,
                ]}
                onPress={() => handleSelectPreference('stay')}
                disabled={savingPref}
              >
                <View style={styles.optionRadioCircle}>
                  {arenaState.nextSeasonPref === 'stay' && <View style={styles.optionRadioDot} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.optionTitle}>Stay in Arena #{arenaState.groupNumber}</Text>
                    <View style={styles.optionTagStay}>
                      <Text style={styles.optionTagStayText}>CURRENT GROUP</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>
                    Remain in your current 100-trader group and battle familiar rivals next season.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Change / Swap group */}
              <TouchableOpacity
                style={[
                  styles.transitionOptionCard,
                  arenaState.nextSeasonPref === 'change' && styles.transitionOptionCardSelected,
                ]}
                onPress={() => handleSelectPreference('change')}
                disabled={savingPref}
              >
                <View style={styles.optionRadioCircle}>
                  {arenaState.nextSeasonPref === 'change' && <View style={styles.optionRadioDot} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.optionTitle}>Swap to Arena #{openGroup}</Text>
                    <View style={styles.optionTagChange}>
                      <Text style={styles.optionTagChangeText}>AUTO-FILL 100 SLOTS</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>
                    Auto-fill into the current filling group ({groupFillCount}/100 filled) to keep every group 100% complete.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Individual / Solo mode */}
              <TouchableOpacity
                style={[
                  styles.transitionOptionCard,
                  arenaState.nextSeasonPref === 'individual' && styles.transitionOptionCardSelected,
                ]}
                onPress={() => handleSelectPreference('individual')}
                disabled={savingPref}
              >
                <View style={styles.optionRadioCircle}>
                  {arenaState.nextSeasonPref === 'individual' && <View style={styles.optionRadioDot} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.optionTitle}>Individual / Solo Mode</Text>
                    <View style={styles.optionTagSolo}>
                      <Text style={styles.optionTagSoloText}>GLOBAL STANDING ONLY</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>
                    Trade at your own pace to view where you stand globally. No season rewards or cohort demotion in Solo mode.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.selectionConfirmedRow}>
              <Ionicons name="checkmark-circle" size={16} color="#00C853" />
              <Text style={styles.selectionConfirmedText}>
                {arenaState.nextSeasonPref === 'stay'
                  ? `Preference: Staying in Group #${arenaState.groupNumber}`
                  : arenaState.nextSeasonPref === 'change'
                  ? `Preference: Swapping to Group #${arenaState.groupNumber} (Auto-Fill)`
                  : `Preference: Trading Solo (Individual Mode)`}
              </Text>
            </View>
          </View>
        )}

        {/* ARENA & LEADERBOARD (LOCKED FOR GUESTS) */}
        {!user ? (
          <View style={styles.lockedGuestCard}>
            <View style={styles.lockedShieldCircle}>
              <Ionicons name="lock-closed" size={32} color="#FFD700" />
            </View>
            <Text style={styles.lockedCardTitle}>Leaderboard & Arena Locked 🔒</Text>
            <Text style={styles.lockedCardSubtitle}>
              Live leaderboard standings and 100-Trader Arena Cohorts are reserved for registered GrowPlay traders. Sign up or login to enter weekly battles, crush the competition with your trading profits, and unlock exclusive season rewards!
            </Text>

            <View style={styles.lockedPerksList}>
              <View style={styles.lockedPerkRow}>
                <Ionicons name="shield-checkmark" size={16} color="#00C853" />
                <Text style={styles.lockedPerkText}>Enter 100-Trader Weekly Arena Battles</Text>
              </View>
              <View style={styles.lockedPerkRow}>
                <Ionicons name="trending-up" size={16} color="#00C853" />
                <Text style={styles.lockedPerkText}>XP shifts dynamically on weekly net P&L</Text>
              </View>
              <View style={styles.lockedPerkRow}>
                <Ionicons name="gift" size={16} color="#FFD700" />
                <Text style={styles.lockedPerkText}>Top arena traders qualify for Season Rewards 🎁</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.lockedLoginBtn}
              onPress={() => router.push('/auth' as any)}
            >
              <Ionicons name="log-in-outline" size={20} color="#000" />
              <Text style={styles.lockedLoginBtnText}>Login / Sign Up to Unlock 🚀</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ARENA GROUP STATUS OR JOIN CTA */}
            {!hasJoinedArena ? (
              <View style={styles.joinArenaCard}>
                <View style={styles.arenaBannerHeader}>
                  <View style={styles.arenaIconCircle}>
                    <Ionicons name="shield-half" size={20} color="#00C853" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.joinArenaTitle}>Arena Group #{arenaState.groupNumber}</Text>
                    <Text style={styles.joinArenaSubtitle}>100 Traders Max • Top 10 Promote</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.infoPillSmall}
                    onPress={() => setShowInfoModal(true)}
                  >
                    <Ionicons name="information-circle-outline" size={13} color="#00C853" />
                    <Text style={styles.infoPillSmallText}>Rules</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.enterArenaBtn}
                  onPress={handleJoinArena}
                  disabled={joiningArena}
                >
                  <Ionicons name="flash" size={16} color="#000" />
                  <Text style={styles.enterArenaBtnText}>
                    {joiningArena ? 'Joining Arena...' : `⚔️ Enter Arena Group #${arenaState.groupNumber} (Free)`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : arenaState.mode === 'individual' ? (
              <View style={styles.soloActiveBanner}>
                <View style={styles.soloHeaderRow}>
                  <View style={styles.activeArenaInfo}>
                    <View style={[styles.activeDot, { backgroundColor: '#29B6F6' }]} />
                    <Text style={styles.activeArenaTitle} numberOfLines={1}>Solo Mode Active</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.infoPillSmall}
                    onPress={() => setShowInfoModal(true)}
                  >
                    <Ionicons name="information-circle-outline" size={13} color="#29B6F6" />
                    <Text style={[styles.infoPillSmallText, { color: '#29B6F6' }]}>Info</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.changeNextSeasonBtn}
                  onPress={() => setShowSeasonSwitchModal(true)}
                >
                  <Ionicons name="options-outline" size={14} color="#29B6F6" />
                  <Text style={styles.changeNextSeasonBtnText} numberOfLines={1}>
                    Next Season: {arenaState.nextSeasonPref === 'stay' ? 'Stay in Group' : arenaState.nextSeasonPref === 'change' ? 'Change Group' : 'Individual Solo'} ⚙️
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.arenaActiveBanner}>
                <View style={styles.activeArenaTop}>
                  <View style={styles.activeArenaInfo}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeArenaTitle} numberOfLines={1}>Arena Group #{arenaState.groupNumber}</Text>
                  </View>
                  <View style={styles.myStandingBadge}>
                    <Text style={styles.myStandingText} numberOfLines={1}>Rank #{myRank} / 100</Text>
                  </View>
                </View>

                <View style={styles.arenaCompactActionsRow}>
                  <TouchableOpacity
                    style={styles.changeNextSeasonBtnCompact}
                    onPress={() => setShowSeasonSwitchModal(true)}
                  >
                    <Ionicons name="options-outline" size={13} color="#aaa" />
                    <Text style={styles.changeNextSeasonBtnText} numberOfLines={1}>
                      Next Season: {arenaState.nextSeasonPref === 'stay' ? 'Stay' : arenaState.nextSeasonPref === 'change' ? 'Swap' : 'Solo'} ⚙️
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.infoPillSmall}
                    onPress={() => setShowInfoModal(true)}
                  >
                    <Ionicons name="information-circle-outline" size={13} color="#00C853" />
                    <Text style={styles.infoPillSmallText}>Rules & Info</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Weekly Leaderboard Section */}
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  {arenaState.mode === 'individual'
                    ? 'Global Individual Standings'
                    : hasJoinedArena
                    ? `Arena #${arenaState.groupNumber} Standings`
                    : 'Preview Standings'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {arenaState.mode === 'individual'
                    ? 'Global Standings (Check where you stand • No rewards in Solo mode)'
                    : 'Ranked by Weekly Net Performance'}
                </Text>
              </View>
            </View>

            {/* Top 3 */}
            {arena100Users.slice(0, 3).map((user, index) => (
              <LeaderCard key={user.id} user={user} rank={index + 1} />
            ))}

            {/* User Card if not in top 3 */}
            {myRank > 3 && (
              <>
                <View style={styles.dotsRow}>
                  <Text style={styles.dots}>⋮</Text>
                  <Text style={styles.dotsText}>Your Current Position</Text>
                  <Text style={styles.dots}>⋮</Text>
                </View>
                <LeaderCard user={arena100Users.find((u) => (u as any).isMe)!} rank={myRank} />
              </>
            )}

            {/* View All Button */}
            <TouchableOpacity
              style={styles.fullLeaderboardBtn}
              onPress={() => setShowAllLeaderboard(true)}
            >
              <Text style={styles.fullLeaderboardBtnText}>
                {arenaState.mode === 'individual'
                  ? 'View Full Global Leaderboard →'
                  : 'View All 100 Arena Traders & Promotion Lines →'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Season Guide & Rewards Banner */}
        <TouchableOpacity
          style={styles.guideBannerBottom}
          activeOpacity={0.8}
          onPress={() => setShowInfoModal(true)}
        >
          <View style={styles.guideBannerLeft}>
            <View style={styles.guideBannerIconCircle}>
              <Ionicons name="sparkles" size={16} color="#FFD700" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.guideBannerTitle}>Arena Rules, Scoring & Rewards ℹ️</Text>
              <Text style={styles.guideBannerDesc} numberOfLines={1}>
                Learn about cohorts, dynamic P&L scoring, and season rewards.
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#00C853" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL 1: VIEW ALL 100 LEADERBOARD */}
      <Modal visible={showAllLeaderboard} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {arenaState.mode === 'individual' ? 'Global Leaderboard' : `Arena #${arenaState.groupNumber} Leaderboard`}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {arenaState.mode === 'individual'
                  ? 'Global Standings • View where you stand'
                  : '100 Players • Ranked by Weekly Performance'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowAllLeaderboard(false)}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={arena100Users}
            keyExtractor={(u) => u.id}
            renderItem={({ item, index }) => {
              const rank = index + 1;
              const isArenaGroup = arenaState.mode !== 'individual';
              return (
                <View>
                  {!isArenaGroup && rank === 1 && (
                    <View style={[styles.safeZoneHeader, { backgroundColor: '#0d1d28', borderColor: '#29B6F630', borderWidth: 1, marginBottom: 8 }]}>
                      <Text style={[styles.safeZoneHeaderText, { color: '#29B6F6' }]}>🌐 GLOBAL STANDINGS • VIEW WHERE YOU STAND</Text>
                    </View>
                  )}
                  {isArenaGroup && rank === 1 && (
                    <View style={styles.promotionHeader}>
                      <Text style={styles.promotionHeaderText}>🟢 PROMOTION ZONE (RANKS 1 – 10)</Text>
                    </View>
                  )}
                  {isArenaGroup && rank === 11 && (
                    <View style={styles.safeZoneHeader}>
                      <Text style={styles.safeZoneHeaderText}>⚪ SAFE ZONE (RANKS 11 – 85)</Text>
                    </View>
                  )}
                  {isArenaGroup && rank === 86 && (
                    <View style={styles.demotionHeader}>
                      <Text style={styles.demotionHeaderText}>🔴 RELEGATION DANGER ZONE (RANKS 86 – 100)</Text>
                    </View>
                  )}
                  <LeaderCard user={item} rank={rank} />
                </View>
              );
            }}
            contentContainerStyle={{ padding: 16 }}
          />
        </SafeAreaView>
      </Modal>

      {/* MODAL 2: CLASH OF CLANS STYLE ALL LEAGUES SCREEN */}
      <Modal
        visible={showAllLeaguesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllLeaguesModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>Leagues & Tiers 🏆</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>13 Tiers of Trading Prestige</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowAllLeaguesModal(false)}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.allLeaguesScroll}
          >
            {/* Info Banner */}
            <View style={styles.leaguesBanner}>
              <Text style={styles.leaguesBannerTitle}>Trade & Climb Ranks</Text>
              <Text style={styles.leaguesBannerSubtitle}>
                Complete virtual trades, maintain your streak, and finish lessons to earn XP. Every tier unlocks enhanced trading perks and higher prestige.
              </Text>
            </View>

            {/* List of 13 Leagues */}
            {LEAGUES.map((tier) => {
              const isCurrent = tier.name === myLeague.name;
              const isAchieved = totalWeeklyXP >= tier.minXP && !isCurrent;
              const isLocked = totalWeeklyXP < tier.minXP;

              return (
                <View
                  key={tier.id}
                  style={[
                    styles.cocTierCard,
                    isCurrent && {
                      borderColor: tier.color,
                      borderWidth: 2,
                      backgroundColor: tier.color + '12',
                    },
                  ]}
                >
                  {/* Shield & Details */}
                  <View style={styles.cocTierRow}>
                    <View
                      style={[
                        styles.cocShieldCircle,
                        {
                          backgroundColor: tier.color + '20',
                          borderColor: tier.color + '80',
                        },
                      ]}
                    >
                      <Text style={styles.cocShieldEmoji}>{tier.shieldEmoji}</Text>
                    </View>

                    <View style={styles.cocTierInfo}>
                      <View style={styles.cocTierNameRow}>
                        <Text style={[styles.cocTierName, { color: tier.color }]}>
                          {tier.name}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentPill, { backgroundColor: tier.color }]}>
                            <Text style={styles.currentPillText}>CURRENT LEAGUE</Text>
                          </View>
                        )}
                        {isAchieved && (
                          <View style={styles.achievedPill}>
                            <Ionicons name="checkmark" size={11} color="#00C853" />
                            <Text style={styles.achievedPillText}>Achieved</Text>
                          </View>
                        )}
                        {isLocked && (
                          <View style={styles.lockedPill}>
                            <Ionicons name="lock-closed" size={11} color="#666" />
                            <Text style={styles.lockedPillText}>Locked</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.cocXPRequirement}>
                        Requirement: {tier.minXP.toLocaleString()} XP
                        {tier.maxXP < 900000 ? ` – ${tier.maxXP.toLocaleString()} XP` : '+'}
                      </Text>
                      <Text style={styles.cocPerkText}>✨ {tier.perk}</Text>
                    </View>
                  </View>

                  {/* If Locked, show remaining XP needed */}
                  {isLocked && (
                    <View style={styles.lockedProgressRow}>
                      <Text style={styles.lockedNeedText}>
                        Need {(tier.minXP - totalWeeklyXP).toLocaleString()} more XP to unlock
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL 3: NEXT SEASON PATH CHOOSER */}
      <Modal
        visible={showSeasonSwitchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSeasonSwitchModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>Next Season Battle Path ⚔️</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>Effective Next Monday 09:15 AM</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowSeasonSwitchModal(false)}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.transitionDesc}>
              Choose how you wish to compete starting next Monday 9:15 AM. Incomplete groups are auto-filled to ensure exactly 100 traders per group:
            </Text>

            <View style={styles.transitionOptionsContainer}>
              {/* Option 1 */}
              <TouchableOpacity
                style={[
                  styles.transitionOptionCard,
                  arenaState.nextSeasonPref === 'stay' && styles.transitionOptionCardSelected,
                ]}
                onPress={() => handleSelectPreference('stay')}
                disabled={savingPref}
              >
                <View style={styles.optionRadioCircle}>
                  {arenaState.nextSeasonPref === 'stay' && <View style={styles.optionRadioDot} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.optionTitle}>Stay in Arena #{arenaState.groupNumber}</Text>
                    <View style={styles.optionTagStay}>
                      <Text style={styles.optionTagStayText}>CURRENT GROUP</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>
                    Remain in your current 100-trader group and battle familiar rivals next season.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2 */}
              <TouchableOpacity
                style={[
                  styles.transitionOptionCard,
                  arenaState.nextSeasonPref === 'change' && styles.transitionOptionCardSelected,
                ]}
                onPress={() => handleSelectPreference('change')}
                disabled={savingPref}
              >
                <View style={styles.optionRadioCircle}>
                  {arenaState.nextSeasonPref === 'change' && <View style={styles.optionRadioDot} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.optionTitle}>Swap to Arena #{openGroup}</Text>
                    <View style={styles.optionTagChange}>
                      <Text style={styles.optionTagChangeText}>AUTO-FILL 100 SLOTS</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>
                    Auto-fill into the current filling group ({groupFillCount}/100 filled) to keep every group 100% complete.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 3 */}
              <TouchableOpacity
                style={[
                  styles.transitionOptionCard,
                  arenaState.nextSeasonPref === 'individual' && styles.transitionOptionCardSelected,
                ]}
                onPress={() => handleSelectPreference('individual')}
                disabled={savingPref}
              >
                <View style={styles.optionRadioCircle}>
                  {arenaState.nextSeasonPref === 'individual' && <View style={styles.optionRadioDot} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.optionTitle}>Individual / Solo Mode</Text>
                    <View style={styles.optionTagSolo}>
                      <Text style={styles.optionTagSoloText}>GLOBAL STANDING ONLY</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>
                    Trade at your own pace to view where you stand globally. No season rewards or cohort demotion in Solo mode.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL 4: ARENA & SEASON RULES/INFO GUIDE */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>Arena & Season Guide 🏆</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>Rules, Scoring, Cohorts & Rewards</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowInfoModal(false)}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.infoModalScroll}
          >
            {/* 1. Live Season Clock Card */}
            <View
              style={[
                styles.timerCard,
                seasonTimeline.isActive ? styles.timerCardActive : styles.timerCardIntermission,
              ]}
            >
              <View style={styles.timerHeaderRow}>
                <View
                  style={[
                    styles.timerStatusPill,
                    seasonTimeline.isActive ? styles.timerStatusPillActive : styles.timerStatusPillInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.timerStatusDot,
                      seasonTimeline.isActive ? styles.timerStatusDotActive : styles.timerStatusDotInactive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.timerStatusText,
                      seasonTimeline.isActive ? styles.timerStatusTextActive : styles.timerStatusTextInactive,
                    ]}
                  >
                    {seasonTimeline.statusBadge}
                  </Text>
                </View>

                <View style={styles.cohortBadge}>
                  <Text style={styles.cohortBadgeText}>
                    {arenaState.mode === 'individual' ? 'SOLO TRADER' : `COHORT #${arenaState.groupNumber}`}
                  </Text>
                </View>
              </View>

              <Text style={styles.timerLabel}>{seasonTimeline.label}</Text>

              {/* Live continuous digital clock */}
              <View style={styles.timerClockContainer}>
                <View style={styles.timerSegment}>
                  <Text style={styles.timerSegmentValue}>
                    {String(seasonTimeline.days).padStart(2, '0')}
                  </Text>
                  <Text style={styles.timerSegmentLabel}>DAYS</Text>
                </View>
                <Text style={styles.timerColon}>:</Text>
                <View style={styles.timerSegment}>
                  <Text style={styles.timerSegmentValue}>
                    {String(seasonTimeline.hrs).padStart(2, '0')}
                  </Text>
                  <Text style={styles.timerSegmentLabel}>HRS</Text>
                </View>
                <Text style={styles.timerColon}>:</Text>
                <View style={styles.timerSegment}>
                  <Text style={styles.timerSegmentValue}>
                    {String(seasonTimeline.mins).padStart(2, '0')}
                  </Text>
                  <Text style={styles.timerSegmentLabel}>MIN</Text>
                </View>
                <Text style={styles.timerColon}>:</Text>
                <View
                  style={[
                    styles.timerSegment,
                    seasonTimeline.isActive ? styles.timerSegmentSecsActive : styles.timerSegmentSecsInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timerSegmentValue,
                      { color: seasonTimeline.isActive ? '#00E676' : '#FFD54F' },
                    ]}
                  >
                    {String(seasonTimeline.secs).padStart(2, '0')}
                  </Text>
                  <Text
                    style={[
                      styles.timerSegmentLabel,
                      { color: seasonTimeline.isActive ? '#00C853' : '#FFA000' },
                    ]}
                  >
                    SEC
                  </Text>
                </View>
              </View>

              <View style={styles.timerFooter}>
                <Ionicons
                  name={seasonTimeline.isActive ? 'trending-up-outline' : 'time-outline'}
                  size={13}
                  color={seasonTimeline.isActive ? '#00C853' : '#FFA000'}
                />
                <Text style={styles.timerFooterText}>{seasonTimeline.subtext}</Text>
              </View>
            </View>

            {/* 2. 100-Trader Arena Cohorts Section */}
            <View style={styles.infoSectionCard}>
              <View style={styles.infoSectionHeader}>
                <Text style={styles.infoSectionIcon}>⚔️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoSectionTitle}>100-Trader Arena Cohorts</Text>
                  <Text style={styles.infoSectionSub}>How groups and weekly battles work</Text>
                </View>
              </View>
              <Text style={styles.infoParagraph}>
                GrowPlay organizes traders into balanced cohorts of up to 100 real traders. Everyone starts the week with their Base XP and battles based on net weekly trading returns.
              </Text>

              {/* Promotion / Safe / Relegation Zones */}
              <View style={styles.zoneCardsList}>
                <View style={[styles.zoneDetailCard, { borderColor: '#00C85340', backgroundColor: '#00C85310' }]}>
                  <View style={styles.zoneDetailTop}>
                    <Text style={[styles.zoneBadgeLabel, { color: '#00C853' }]}>🟢 PROMOTION ZONE</Text>
                    <Text style={styles.zoneRanksPill}>Ranks 1 – 10</Text>
                  </View>
                  <Text style={styles.zoneDetailDesc}>
                    Top 10 traders earn automatic promotion to the next prestige League Tier, unlocking higher trade rebates and exclusive badges.
                  </Text>
                </View>

                <View style={[styles.zoneDetailCard, { borderColor: '#88888840', backgroundColor: '#88888810' }]}>
                  <View style={styles.zoneDetailTop}>
                    <Text style={[styles.zoneBadgeLabel, { color: '#bbb' }]}>⚪ SAFE ZONE</Text>
                    <Text style={styles.zoneRanksPill}>Ranks 11 – 85</Text>
                  </View>
                  <Text style={styles.zoneDetailDesc}>
                    Traders who finish in this zone retain their current league tier and battle position for the following season.
                  </Text>
                </View>

                <View style={[styles.zoneDetailCard, { borderColor: '#ff525240', backgroundColor: '#ff525210' }]}>
                  <View style={styles.zoneDetailTop}>
                    <Text style={[styles.zoneBadgeLabel, { color: '#ff5252' }]}>🔴 RELEGATION DANGER</Text>
                    <Text style={styles.zoneRanksPill}>Ranks 86 – 100</Text>
                  </View>
                  <Text style={styles.zoneDetailDesc}>
                    Traders in the bottom 15 positions face danger of demoting to a lower tier if negative weekly trading performance continues.
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Dynamic Weekly Performance Scoring */}
            <View style={styles.infoSectionCard}>
              <View style={styles.infoSectionHeader}>
                <Text style={styles.infoSectionIcon}>⚖️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoSectionTitle}>Weekly Performance Scoring</Text>
                  <Text style={styles.infoSectionSub}>How your Arena XP is calculated</Text>
                </View>
              </View>

              <View style={styles.ruleHighlightBox}>
                <Text style={styles.ruleHighlightTitle}>No Random Intraday Swings 🛡️</Text>
                <Text style={styles.ruleHighlightDesc}>
                  Individual intraday trades do NOT cause arbitrary XP fluctuations! Your tournament ranking is driven strictly by your cumulative weekly net trading outcome.
                </Text>
              </View>

              <View style={[styles.ruleHighlightBox, { backgroundColor: '#101c26', borderColor: '#29B6F640' }]}>
                <Text style={[styles.ruleHighlightTitle, { color: '#29B6F6' }]}>Zero Floor Guarantee 🔒 (No Negative XP)</Text>
                <Text style={[styles.ruleHighlightDesc, { color: '#9ecdf7' }]}>
                  Jis trader ki XP 0 ho, vo kabhi minus (negative) nahi hogi! Agar loss ki wajah se XP deduct hoti hai, tab bhi minimum floor humesha 0 par locked rehta hai (XP can never drop below 0).
                </Text>
              </View>

              <View style={styles.formulaBox}>
                <Text style={styles.formulaLabel}>SCORING FORMULA</Text>
                <Text style={styles.formulaText}>
                  Arena Score = Math.max(0, Base XP + (Weekly Net P&L / 100))
                </Text>
                <View style={styles.formulaPointsRow}>
                  <Text style={styles.formulaPoint}>• <Text style={{ color: '#00C853', fontWeight: 'bold' }}>+1 XP</Text> per ₹100 of net weekly profit</Text>
                  <Text style={styles.formulaPoint}>• <Text style={{ color: '#ff5252', fontWeight: 'bold' }}>-1 XP</Text> per ₹100 of net weekly loss</Text>
                  <Text style={styles.formulaPoint}>• <Text style={{ color: '#29B6F6', fontWeight: 'bold' }}>0 XP Minimum</Text> — Kabhi negative nahi hogi</Text>
                </View>
              </View>

              {/* User Live Breakdown */}
              <View style={styles.liveBreakdownBox}>
                <Text style={styles.liveBreakdownTitle}>Your Current Weekly Breakdown:</Text>
                <View style={styles.breakdownItemRow}>
                  <Text style={styles.breakdownLabel}>Base Trading & Streak XP</Text>
                  <Text style={styles.breakdownVal}>{myBaseXP} XP</Text>
                </View>
                <View style={styles.breakdownItemRow}>
                  <Text style={styles.breakdownLabel}>Net Weekly P&L</Text>
                  <Text style={[styles.breakdownVal, { color: myWeeklyPnl >= 0 ? '#00C853' : '#ff5252' }]}>
                    {myWeeklyPnl >= 0 ? '+' : ''}₹{myWeeklyPnl.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.breakdownItemRow}>
                  <Text style={styles.breakdownLabel}>P&L Shift Impact</Text>
                  <Text style={[styles.breakdownVal, { color: weeklyPnlXP >= 0 ? '#00C853' : '#ff5252' }]}>
                    {weeklyPnlXP >= 0 ? `+${weeklyPnlXP}` : weeklyPnlXP} XP
                  </Text>
                </View>
                <View style={[styles.breakdownItemRow, styles.breakdownTotalRow]}>
                  <Text style={styles.breakdownTotalLabel}>Total Arena Competition XP</Text>
                  <Text style={styles.breakdownTotalVal}>{totalWeeklyXP} XP</Text>
                </View>
              </View>
            </View>

            {/* 4. Weekly Timeline & Market Hours */}
            <View style={styles.infoSectionCard}>
              <View style={styles.infoSectionHeader}>
                <Text style={styles.infoSectionIcon}>⏰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoSectionTitle}>Weekly Season Schedule</Text>
                  <Text style={styles.infoSectionSub}>Aligned with Indian Stock Market</Text>
                </View>
              </View>
              <View style={styles.timelineRowsContainer}>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineDotGreen} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineRowTitle}>Season Kickoff (Mon 9:15 AM)</Text>
                    <Text style={styles.timelineRowSub}>Markets open. Weekly P&L starts tracking fresh for all cohort participants.</Text>
                  </View>
                </View>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineDotAmber} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineRowTitle}>Season Settlement (Fri 4:00 PM)</Text>
                    <Text style={styles.timelineRowSub}>Trading week ends. Final positions are locked in and weekly ranks are settled.</Text>
                  </View>
                </View>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineDotBlue} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineRowTitle}>Weekend Intermission (Sat - Sun)</Text>
                    <Text style={styles.timelineRowSub}>Promotion and demotions applied. Traders can choose their path for next week.</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 5. Next Season Battle Paths */}
            <View style={styles.infoSectionCard}>
              <View style={styles.infoSectionHeader}>
                <Text style={styles.infoSectionIcon}>🔄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoSectionTitle}>Next Season Battle Paths</Text>
                  <Text style={styles.infoSectionSub}>Your choices for the upcoming week</Text>
                </View>
              </View>
              <Text style={styles.infoParagraph}>
                During weekend intermission or anytime during the week, set your next week preference:
              </Text>
              <View style={styles.pathPillsContainer}>
                <View style={styles.pathPillItem}>
                  <Text style={styles.pathPillTitle}>🛡️ Stay in Current Group</Text>
                  <Text style={styles.pathPillSub}>Remain with familiar competitors in your 100-player arena.</Text>
                </View>
                <View style={styles.pathPillItem}>
                  <Text style={styles.pathPillTitle}>🔀 Auto-Fill Swap</Text>
                  <Text style={styles.pathPillSub}>Auto-transfers to an active filling group so cohorts stay 100% filled.</Text>
                </View>
                <View style={styles.pathPillItem}>
                  <Text style={styles.pathPillTitle}>👤 Solo / Individual Mode</Text>
                  <Text style={styles.pathPillSub}>Trade at your own pace. Global standings only (no cohort demotion or rewards).</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.managePreferenceBtn}
                onPress={() => {
                  setShowInfoModal(false);
                  setTimeout(() => setShowSeasonSwitchModal(true), 300);
                }}
              >
                <Ionicons name="options-outline" size={16} color="#000" />
                <Text style={styles.managePreferenceBtnText}>Change Next Season Preference ⚙️</Text>
              </TouchableOpacity>
            </View>

            {/* 6. Season Rewards (Arena Only - Coming Soon) */}
            <View style={styles.infoSectionCard}>
              <View style={styles.infoSectionHeader}>
                <Text style={styles.infoSectionIcon}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoSectionTitle}>Season Rewards (Coming Soon)</Text>
                  <Text style={styles.infoSectionSub}>Exclusive to 100-Trader Arena Cohorts</Text>
                </View>
              </View>
              <Text style={styles.infoParagraph}>
                Top cohort performers will receive exclusive GrowPlay merchandise, trophies, and mystery rewards when upcoming seasonal tournaments launch!
              </Text>
              <View style={styles.rewardsPillsRow}>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillEmoji}>🏆</Text>
                  <Text style={styles.rewardPillText}>Physical Trophies</Text>
                </View>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillEmoji}>👕</Text>
                  <Text style={styles.rewardPillText}>GrowPlay Merch</Text>
                </View>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillEmoji}>💎</Text>
                  <Text style={styles.rewardPillText}>Mystery Vouchers</Text>
                </View>
              </View>
            </View>

            {/* 7. League Tiers Link */}
            <View style={styles.infoSectionCard}>
              <View style={styles.infoSectionHeader}>
                <Text style={styles.infoSectionIcon}>👑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoSectionTitle}>13 League Tiers</Text>
                  <Text style={styles.infoSectionSub}>From Bronze I to Legend</Text>
                </View>
              </View>
              <Text style={styles.infoParagraph}>
                Your current tier is <Text style={{ color: myLeague.color, fontWeight: 'bold' }}>{myLeague.shieldEmoji} {myLeague.name}</Text> with perk: <Text style={{ color: '#00C853' }}>{myLeague.perk}</Text>.
              </Text>
              <TouchableOpacity
                style={[styles.viewTiersInsideModalBtn, { borderColor: myLeague.color + '60' }]}
                onPress={() => {
                  setShowInfoModal(false);
                  setTimeout(() => setShowAllLeaguesModal(true), 300);
                }}
              >
                <Ionicons name="trophy" size={16} color={myLeague.color} />
                <Text style={[styles.viewTiersInsideModalText, { color: myLeague.color }]}>
                  View All 13 League Tiers & Perks →
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  leagueCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  trophyGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  tierHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  viewAllLeaguesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewAllLeaguesText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  leagueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  currentTierLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  leagueName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  leagueDesc: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 18,
  },
  leaguePerkText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  trophyContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  trophyEmoji: {
    fontSize: 28,
  },
  xpProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpProgressLeft: {
    color: '#888',
    fontSize: 12,
  },
  xpProgressRight: {
    color: '#888',
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  tapToInspectHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  tapToInspectText: {
    color: '#777',
    fontSize: 11,
    flex: 1,
    marginLeft: 6,
  },
  weeklyPnlCard: {
    backgroundColor: '#131313',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#242424',
    overflow: 'hidden',
  },
  weeklyPnlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  weeklyPnlIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyPnlLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  weeklyPnlAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weeklyPnlXPShift: {
    fontSize: 13,
    fontWeight: '600',
  },
  weeklyXPScoreBox: {
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  weeklyXPScoreLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
  },
  weeklyXPScoreVal: {
    color: '#00C853',
    fontSize: 15,
    fontWeight: 'bold',
  },
  scoreBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    flexWrap: 'wrap',
  },
  scoreBreakdownText: {
    color: '#888',
    fontSize: 11,
  },
  weeklyRuleNote: {
    color: '#777',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  timerCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  timerCardActive: {
    borderColor: '#00C85335',
    backgroundColor: '#0d1510',
  },
  timerCardIntermission: {
    borderColor: '#FFA00030',
    backgroundColor: '#16130b',
  },
  timerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  timerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
  },
  timerStatusPillActive: {
    backgroundColor: '#00C85320',
  },
  timerStatusPillInactive: {
    backgroundColor: '#FFA00020',
  },
  timerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timerStatusDotActive: {
    backgroundColor: '#00E676',
  },
  timerStatusDotInactive: {
    backgroundColor: '#FFD54F',
  },
  timerStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  timerStatusTextActive: {
    color: '#00E676',
  },
  timerStatusTextInactive: {
    color: '#FFD54F',
  },
  cohortBadge: {
    backgroundColor: '#202020',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cohortBadgeText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  timerLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    textAlign: 'center',
  },
  timerClockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 12,
    flexWrap: 'nowrap',
  },
  timerSegment: {
    backgroundColor: '#161616',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 46,
    borderWidth: 1,
    borderColor: '#252525',
  },
  timerSegmentSecsActive: {
    borderColor: '#00C85340',
    backgroundColor: '#0f2415',
  },
  timerSegmentSecsInactive: {
    borderColor: '#FFA00040',
    backgroundColor: '#261b07',
  },
  timerSegmentValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  timerSegmentLabel: {
    color: '#666',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
  },
  timerColon: {
    color: '#555',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 0,
    marginBottom: 10,
  },
  timerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    width: '100%',
    justifyContent: 'center',
  },
  timerFooterText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  joinArenaCard: {
    backgroundColor: '#0c2415',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#00C85340',
    marginBottom: 20,
  },
  arenaBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  arenaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C85320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinArenaTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  joinArenaSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  capacityBadge: {
    backgroundColor: '#00C85320',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capacityText: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: 'bold',
  },
  joinArenaDesc: {
    color: '#bbb',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  arenaPerksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#091a0f',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perkBullet: {
    fontSize: 10,
  },
  perkItemText: {
    color: '#ddd',
    fontSize: 11,
    fontWeight: '600',
  },
  enterArenaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00C853',
    paddingVertical: 14,
    borderRadius: 12,
  },
  enterArenaBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  arenaActiveBanner: {
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 16,
  },
  activeArenaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeArenaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C853',
  },
  activeArenaTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeArenaPoolText: {
    color: '#888',
    fontSize: 13,
  },
  myStandingBadge: {
    backgroundColor: '#00C85315',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00C85330',
  },
  myStandingText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: 'bold',
  },
  zoneLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1c1c1c',
  },
  zoneLegendItem: {
    color: '#777',
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  viewAll: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: '600',
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    gap: 12,
    overflow: 'hidden',
  },
  myCard: {
    borderColor: '#00C853',
    backgroundColor: '#0d1a0d',
    borderLeftWidth: 3,
    borderLeftColor: '#00C853',
  },
  rankContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
  },
  rankNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  promBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00C853',
    marginTop: 2,
  },
  demBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF5252',
    marginTop: 2,
  },
  userAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  userAvatarText: {
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  youPill: {
    backgroundColor: '#00C85320',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  youPillText: {
    color: '#00C853',
    fontSize: 9,
    fontWeight: 'bold',
  },
  userWeeklyRow: {
    marginTop: 2,
  },
  userWeeklyPnlText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userXPContainer: {
    alignItems: 'flex-end',
  },
  userXPBig: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  userXPLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
  },
  dotsRow: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  dots: {
    color: '#555',
    fontSize: 18,
  },
  dotsText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: '600',
  },
  fullLeaderboardBtn: {
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
    marginTop: 8,
  },
  fullLeaderboardBtnText: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  rewardsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 14,
    marginTop: 18,
    marginBottom: 10,
    overflow: 'hidden',
    width: '100%',
  },
  rewardsEmoji: {
    fontSize: 28,
  },
  rewardsTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    flexShrink: 1,
  },
  rewardsDesc: {
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  promotionHeader: {
    backgroundColor: '#0c2415',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00C853',
  },
  promotionHeaderText: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  safeZoneHeader: {
    backgroundColor: '#161616',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#888',
  },
  safeZoneHeaderText: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  demotionHeader: {
    backgroundColor: '#2a1111',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5252',
  },
  demotionHeaderText: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  allLeaguesScroll: {
    padding: 16,
  },
  leaguesBanner: {
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 16,
  },
  leaguesBannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  leaguesBannerSubtitle: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  cocTierCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 12,
  },
  cocTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cocShieldCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  cocShieldEmoji: {
    fontSize: 26,
  },
  cocTierInfo: {
    flex: 1,
    minWidth: 0,
  },
  cocTierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  cocTierName: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  currentPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  currentPillText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  achievedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C85315',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  achievedPillText: {
    color: '#00C853',
    fontSize: 10,
    fontWeight: 'bold',
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  lockedPillText: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cocXPRequirement: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 2,
  },
  cocPerkText: {
    color: '#888',
    fontSize: 11,
  },
  lockedProgressRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  lockedNeedText: {
    color: '#666',
    fontSize: 11,
  },
  lockedGuestCard: {
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockedShieldCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFD70015',
    borderWidth: 2,
    borderColor: '#FFD70040',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  lockedCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  lockedCardSubtitle: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  lockedPerksList: {
    width: '100%',
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 16,
    gap: 8,
  },
  lockedPerkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockedPerkText: {
    color: '#ccc',
    fontSize: 12,
    flex: 1,
  },
  lockedLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00C853',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  lockedLoginBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  seasonTransitionCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00C85340',
    overflow: 'hidden',
  },
  transitionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transitionBadge: {
    backgroundColor: '#00C85320',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00C85350',
  },
  transitionBadgeText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  transitionSubBadge: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  transitionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transitionDesc: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  transitionOptionsContainer: {
    gap: 10,
    marginBottom: 12,
  },
  transitionOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 12,
  },
  transitionOptionCardSelected: {
    borderColor: '#00C853',
    backgroundColor: '#0c2415',
  },
  optionRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00C853',
  },
  optionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  optionSub: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  optionTagStay: {
    backgroundColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  optionTagStayText: {
    color: '#bbb',
    fontSize: 9,
    fontWeight: 'bold',
  },
  optionTagChange: {
    backgroundColor: '#00C85320',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  optionTagChangeText: {
    color: '#00C853',
    fontSize: 9,
    fontWeight: 'bold',
  },
  optionTagSolo: {
    backgroundColor: '#29B6F620',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  optionTagSoloText: {
    color: '#29B6F6',
    fontSize: 9,
    fontWeight: 'bold',
  },
  selectionConfirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  selectionConfirmedText: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: '600',
  },
  changeNextSeasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#292929',
  },
  changeNextSeasonBtnText: {
    color: '#bbb',
    fontSize: 11,
    fontWeight: 'bold',
  },
  soloActiveBanner: {
    backgroundColor: '#0d1820',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#29B6F640',
    marginBottom: 16,
    overflow: 'hidden',
    width: '100%',
  },
  soloHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  soloStandingBadge: {
    backgroundColor: '#29B6F618',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#29B6F635',
  },
  soloStandingBadgeText: {
    color: '#29B6F6',
    fontSize: 10,
    fontWeight: 'bold',
  },
  soloNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#07121b',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#29B6F625',
    marginVertical: 4,
  },
  soloActiveDesc: {
    color: '#8ab4f8',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  // Compact Header & Info Bar Styles
  compactTierCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  compactGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  compactTierTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  compactTierLeft: {
    flex: 1,
    minWidth: 0,
  },
  compactTierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactTierEmoji: {
    fontSize: 26,
  },
  compactTierName: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  compactRankText: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 2,
  },
  compactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoGuideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C85318',
    borderColor: '#00C85350',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  infoGuideBadgeText: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: 'bold',
  },
  allTiersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff0d',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  allTiersBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  compactProgressSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  compactStatsStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  compactStatTile: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242424',
  },
  compactStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  compactStatTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 0.6,
  },
  compactStatValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  compactStatSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    flexWrap: 'wrap',
    gap: 2,
  },
  compactStatSubText: {
    fontSize: 10,
    color: '#888',
  },
  compactStatScoreVal: {
    fontSize: 10,
    color: '#00C853',
    fontWeight: 'bold',
  },
  compactTimerLive: {
    borderColor: '#00C85335',
    backgroundColor: '#0c1810',
  },
  compactTimerIntermission: {
    borderColor: '#FFA00030',
    backgroundColor: '#18140b',
  },
  compactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactTimerDigits: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  compactTimerHint: {
    fontSize: 10,
    color: '#888',
  },
  compactTimerInfoIcon: {
    fontSize: 10,
    color: '#00C853',
    fontWeight: 'bold',
  },
  infoPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C85315',
    borderColor: '#00C85340',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoPillSmallText: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: 'bold',
  },
  arenaCompactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  changeNextSeasonBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a1a1a',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#292929',
    flex: 1,
  },
  guideBannerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131313',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  guideBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  guideBannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD70018',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  guideBannerDesc: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  // Info Modal Styles
  infoModalScroll: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  infoSectionCard: {
    backgroundColor: '#131313',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#242424',
  },
  infoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoSectionIcon: {
    fontSize: 22,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoSectionSub: {
    fontSize: 11,
    color: '#888',
  },
  infoParagraph: {
    fontSize: 13,
    color: '#bbb',
    lineHeight: 19,
    marginBottom: 12,
  },
  zoneCardsList: {
    gap: 8,
  },
  zoneDetailCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  zoneDetailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  zoneBadgeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  zoneRanksPill: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: '#ffffff15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  zoneDetailDesc: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 17,
  },
  ruleHighlightBox: {
    backgroundColor: '#0f2214',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#00C85335',
    marginBottom: 12,
  },
  ruleHighlightTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00E676',
    marginBottom: 4,
  },
  ruleHighlightDesc: {
    fontSize: 12,
    color: '#8cd5a6',
    lineHeight: 17,
  },
  formulaBox: {
    backgroundColor: '#191919',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  formulaLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  formulaPointsRow: {
    gap: 4,
  },
  formulaPoint: {
    fontSize: 12,
    color: '#ccc',
  },
  liveBreakdownBox: {
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  liveBreakdownTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ddd',
    marginBottom: 8,
  },
  breakdownItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#888',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#282828',
    marginTop: 4,
    paddingTop: 8,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  breakdownTotalVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00C853',
  },
  timelineRowsContainer: {
    gap: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00C853',
    marginTop: 4,
  },
  timelineDotAmber: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFA000',
    marginTop: 4,
  },
  timelineDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#29B6F6',
    marginTop: 4,
  },
  timelineRowTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  timelineRowSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    lineHeight: 16,
  },
  pathPillsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  pathPillItem: {
    backgroundColor: '#181818',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#282828',
  },
  pathPillTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  pathPillSub: {
    fontSize: 11,
    color: '#888',
    lineHeight: 15,
  },
  managePreferenceBtn: {
    backgroundColor: '#00C853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  managePreferenceBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  rewardsPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  rewardPillEmoji: {
    fontSize: 14,
  },
  rewardPillText: {
    fontSize: 11,
    color: '#ccc',
    fontWeight: '600',
  },
  viewTiersInsideModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#191919',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  viewTiersInsideModalText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});