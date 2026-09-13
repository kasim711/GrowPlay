import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getAvatarById } from '@/constants/avatars';
import {
  getStoredFeedbacks,
  updateFeedbackStatus,
  deleteStoredFeedback,
  clearResolvedFeedbacks,
  UserFeedback,
} from '@/lib/database';

// System Default Fallback Credentials (can be updated by creator in Admin Settings)
const DEFAULT_ADMIN_ID = 'admin';
const DEFAULT_ADMIN_PASS = 'growplay@2026';

export default function AdminScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  // Main Terminal Tab Mode: Cohorts vs Feedback
  const [adminTab, setAdminTab] = useState<'cohorts' | 'feedback'>('cohorts');

  // Feedback Inbox State
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'unread' | 'resolved'>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');

  // Settings / Change Password Modal
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [credsSuccess, setCredsSuccess] = useState('');

  // Real Database Data
  const [realProfiles, setRealProfiles] = useState<any[]>([]);
  const [realTradesCount, setRealTradesCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState(1);
  const [filterMode, setFilterMode] = useState<'all' | 'winners' | 'losers' | 'loss_makers'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mass Broadcast Email Hub State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'winners' | 'losers' | 'loss_makers'>('all');
  const [broadcastSubject, setBroadcastSubject] = useState('[GrowPlay] Quick question about your trading experience 💡');
  const [broadcastBody, setBroadcastBody] = useState(
    `Hey Trader,\n\nWe want to make GrowPlay the most exciting gamified trading arena in India! Could you please reply with your quick feedback?\n\n1. What do you love most about the app (Stocks, F&O Options, or Leagues)?\n2. Any specific stocks or features you want us to add?\n3. Any bug, lag, or design issue you noticed?\n\nYour feedback directly shapes our next update!\n\nBest,\nGrowPlay Creator`
  );

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const savedAuth = await AsyncStorage.getItem('growplay_admin_auth_token');
      if (savedAuth === 'authorized_session') {
        setIsAuthenticated(true);
        loadRealDatabaseData();
      }
    } catch (e) {
      console.log('Auth check error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setAuthError('');
    const id = adminIdInput.trim();
    const pass = adminPassInput.trim();

    if (!id || !pass) {
      setAuthError('Please enter both Admin ID and Password.');
      return;
    }

    try {
      // Check custom stored credentials first, else check default
      const customId = await AsyncStorage.getItem('growplay_admin_custom_id');
      const customPass = await AsyncStorage.getItem('growplay_admin_custom_pass');

      const expectedId = customId || DEFAULT_ADMIN_ID;
      const expectedPass = customPass || DEFAULT_ADMIN_PASS;

      if (id.toLowerCase() === expectedId.toLowerCase() && pass === expectedPass) {
        await AsyncStorage.setItem('growplay_admin_auth_token', 'authorized_session');
        setIsAuthenticated(true);
        setAdminPassInput('');
        loadRealDatabaseData();
      } else {
        setAuthError('Access Denied: Incorrect Admin ID or Secret Password.');
      }
    } catch (e) {
      setAuthError('Authentication verification failed.');
    }
  };

  const handleAdminLogout = async () => {
    await AsyncStorage.removeItem('growplay_admin_auth_token');
    setIsAuthenticated(false);
    setAdminIdInput('');
    setAdminPassInput('');
  };

  const handleSaveNewCreds = async () => {
    setCredsSuccess('');
    if (!newAdminId.trim() || !newAdminPass.trim()) {
      Alert.alert('Incomplete', 'Please provide both a new Admin ID and Password.');
      return;
    }
    if (newAdminPass !== confirmAdminPass) {
      Alert.alert('Mismatch', 'New password and confirmation password do not match.');
      return;
    }
    if (newAdminPass.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters long.');
      return;
    }

    await AsyncStorage.setItem('growplay_admin_custom_id', newAdminId.trim());
    await AsyncStorage.setItem('growplay_admin_custom_pass', newAdminPass.trim());
    setCredsSuccess('Credentials updated successfully!');
    Alert.alert('Success', 'Private Admin ID and Password have been updated.');
    setShowCredsModal(false);
    setNewAdminId('');
    setNewAdminPass('');
    setConfirmAdminPass('');
  };

  const loadRealDatabaseData = async () => {
    setRefreshing(true);
    try {
      // 100% Real registered users directly from Supabase
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('xp', { ascending: false });

      if (pError) console.log('Error loading real profiles:', pError);
      if (profiles) setRealProfiles(profiles);

      // Real trades count
      const { count, error: tError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true });
      if (count !== null) setRealTradesCount(count);

      // Real user feedbacks from Creator Console storage
      const fbList = await getStoredFeedbacks();
      setFeedbacks(fbList);
    } catch (e) {
      console.log('Error querying Supabase:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleFeedbackStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'resolved' ? 'unread' : 'resolved';
    await updateFeedbackStatus(id, nextStatus);
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f))
    );
  };

  const handleDeleteFeedback = (id: string) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to permanently remove this feedback message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteStoredFeedback(id);
            setFeedbacks((prev) => prev.filter((f) => f.id !== id));
          },
        },
      ]
    );
  };

  const handleClearResolved = () => {
    const resolvedCount = feedbacks.filter((f) => f.status === 'resolved').length;
    if (resolvedCount === 0) {
      Alert.alert('No Resolved Messages', 'There are no resolved messages to clean up.');
      return;
    }
    Alert.alert(
      'Clear Resolved',
      `Permanently clear all ${resolvedCount} resolved messages?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearResolvedFeedbacks();
            setFeedbacks((prev) => prev.filter((f) => f.status !== 'resolved'));
          },
        },
      ]
    );
  };

  const handleExportFeedbacks = async () => {
    if (feedbacks.length === 0) {
      Alert.alert('No Feedback', 'No feedback messages to export.');
      return;
    }
    let text = `=== GROWPLAY TRADER FEEDBACK REPORT ===\nGenerated: ${new Date().toLocaleString()}\nTotal Messages: ${feedbacks.length}\n\n`;
    feedbacks.forEach((fb, idx) => {
      text += `[#${idx + 1}] [${fb.category || 'General'}] [${fb.status.toUpperCase()}]\n`;
      text += `From: ${fb.user_name} (${fb.user_email || 'No email'})\n`;
      text += `Date: ${new Date(fb.created_at).toLocaleString()}\n`;
      text += `Message:\n${fb.message}\n`;
      text += `----------------------------------------\n\n`;
    });
    try {
      await Share.share({ message: text });
    } catch {
      // ignore
    }
  };

  const handleReplyToTrader = (fb: UserFeedback) => {
    if (!fb.user_email) {
      Alert.alert('No Email', 'This feedback was sent by a trader without an email address.');
      return;
    }
    const subject = encodeURIComponent(`Re: GrowPlay Feedback (${fb.category || 'Support'})`);
    const body = encodeURIComponent(
      `Hi ${fb.user_name},\n\nThank you for reaching out to GrowPlay regarding:\n"${fb.message}"\n\n`
    );
    Linking.openURL(`mailto:${fb.user_email}?subject=${subject}&body=${body}`);
  };

  const unreadFeedbackCount = useMemo(() => {
    return feedbacks.filter((f) => f.status === 'unread').length;
  }, [feedbacks]);

  const displayedFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      if (feedbackFilter === 'unread' && f.status !== 'unread') return false;
      if (feedbackFilter === 'resolved' && f.status !== 'resolved') return false;
      if (feedbackSearch.trim()) {
        const q = feedbackSearch.toLowerCase();
        const matchName = f.user_name?.toLowerCase().includes(q);
        const matchEmail = f.user_email?.toLowerCase().includes(q);
        const matchMsg = f.message?.toLowerCase().includes(q);
        const matchCat = f.category?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchMsg && !matchCat) return false;
      }
      return true;
    });
  }, [feedbacks, feedbackFilter, feedbackSearch]);

  // Group real profiles into cohorts of 100
  const cohorts = useMemo(() => {
    const list = [];
    const size = 100;
    const totalCohorts = Math.max(1, Math.ceil(realProfiles.length / size));

    for (let i = 0; i < totalCohorts; i++) {
      const usersInCohort = realProfiles.slice(i * size, (i + 1) * size);
      list.push({
        cohortNumber: i + 1,
        totalInCohort: usersInCohort.length,
        users: usersInCohort,
      });
    }
    return list;
  }, [realProfiles]);

  const activeCohort = cohorts.find((c) => c.cohortNumber === selectedCohort) || cohorts[0];

  // Filter cohort users by winners / losers / loss makers / search
  const displayedUsers = useMemo(() => {
    let list = activeCohort?.users ? [...activeCohort.users] : [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.id?.toLowerCase().includes(q)
      );
    }

    if (filterMode === 'winners') {
      // Top 3 in cohort (Rank 1, 2 & 3 only)
      return list.slice(0, 3);
    } else if (filterMode === 'losers') {
      // Bottom users in cohort (ranks 86 to 100, or lowest rank holders)
      if (list.length <= 1) return list;
      const countToShow = Math.min(15, Math.max(1, Math.ceil(list.length * 0.2)));
      // Return the bottom ranked traders (lowest XP / bottom slots)
      return list.slice(list.length - countToShow);
    } else if (filterMode === 'loss_makers') {
      // Users with net negative P&L sorted by deepest loss
      return list
        .filter((u) => (u.total_pnl ?? 0) < 0)
        .sort((a, b) => (a.total_pnl ?? 0) - (b.total_pnl ?? 0));
    }

    return list;
  }, [activeCohort, filterMode, searchQuery]);

  const handleCopy = (label: string, text: string) => {
    Share.share({
      message: text,
      title: label,
    });
  };

  const handleExportAll = async () => {
    if (realProfiles.length === 0) {
      Alert.alert('No Data', 'No real registered users found in database yet.');
      return;
    }

    let report = `🏆 GROWPLAY OFFICIAL AUDIT & REWARDS REPORT 🏆\nGenerated: ${new Date().toLocaleString()}\n`;
    report += `Total Real Registered Users: ${realProfiles.length}\n`;
    report += `Total Real Simulated Trades: ${realTradesCount}\n\n`;

    report += `=================================================\n`;
    report += `🥇 SECTION 1: TOP 3 WINNERS (RANKS 1, 2 & 3 • PHYSICAL REWARDS)\n`;
    report += `=================================================\n`;
    const top3 = realProfiles.slice(0, 3);
    top3.forEach((u, idx) => {
      report += `#${idx + 1} | Name: ${u.username} | Email: ${u.email || 'N/A'}\n`;
      report += `     UUID: ${u.id}\n`;
      report += `     XP: ${u.xp ?? 0} | P&L: ₹${u.total_pnl ?? 0} | Streak: ${u.streak ?? 0}d\n\n`;
    });

    report += `=================================================\n`;
    report += `🔴 SECTION 2: BOTTOM RELEGATED TRADERS (LOSERS)\n`;
    report += `=================================================\n`;
    const bottomUsers = realProfiles.slice(Math.max(0, realProfiles.length - 15));
    bottomUsers.forEach((u, idx) => {
      const rank = realProfiles.length - bottomUsers.length + idx + 1;
      report += `#${rank} | Name: ${u.username} | Email: ${u.email || 'N/A'}\n`;
      report += `     UUID: ${u.id}\n`;
      report += `     XP: ${u.xp ?? 0} | P&L: ₹${u.total_pnl ?? 0}\n\n`;
    });

    report += `=================================================\n`;
    report += `📉 SECTION 3: TRADERS WITH NEGATIVE P&L (LOSSES)\n`;
    report += `=================================================\n`;
    const lossMakers = realProfiles
      .filter((u) => (u.total_pnl ?? 0) < 0)
      .sort((a, b) => (a.total_pnl ?? 0) - (b.total_pnl ?? 0));
    if (lossMakers.length === 0) {
      report += `No traders currently in negative net P&L.\n`;
    } else {
      lossMakers.forEach((u, idx) => {
        report += `${idx + 1}. User: ${u.username} | Email: ${u.email || 'N/A'}\n`;
        report += `   UUID: ${u.id}\n`;
        report += `   Net Loss: -₹${Math.abs(u.total_pnl ?? 0).toLocaleString('en-IN')}\n\n`;
      });
    }

    try {
      await Share.share({
        title: 'GrowPlay Production Winners & Losers Export',
        message: report,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  // ─── MASS BROADCAST EMAIL LOGIC ───
  const targetEmails = useMemo(() => {
    let list: any[] = [];
    if (broadcastTarget === 'all') {
      list = realProfiles;
    } else if (broadcastTarget === 'winners') {
      list = realProfiles.slice(0, 3);
    } else if (broadcastTarget === 'losers') {
      const count = Math.min(15, Math.max(1, Math.ceil(realProfiles.length * 0.2)));
      list = realProfiles.slice(Math.max(0, realProfiles.length - count));
    } else if (broadcastTarget === 'loss_makers') {
      list = realProfiles.filter((u) => (u.total_pnl ?? 0) < 0);
    }
    return list
      .map((u) => u.email?.trim())
      .filter((email): email is string => Boolean(email && email.includes('@')));
  }, [realProfiles, broadcastTarget]);

  const applyTemplate = (templateType: 'feedback' | 'season_drop' | 'winner_prize' | 'blank') => {
    if (templateType === 'feedback') {
      setBroadcastSubject('[GrowPlay] Quick question about your trading experience 💡');
      setBroadcastBody(
        `Hey Trader,\n\nWe want to make GrowPlay the most exciting gamified trading arena in India! Could you please reply with your quick feedback?\n\n1. What do you love most about the app (Stocks, F&O Options, or Leagues)?\n2. Any specific stocks or features you want us to add?\n3. Any bug, lag, or design issue you noticed?\n\nYour feedback directly shapes our next update!\n\nBest,\nGrowPlay Creator`
      );
    } else if (templateType === 'season_drop') {
      setBroadcastSubject('🔥 [GrowPlay Arena] Season Finale & Secret Drops Alert!');
      setBroadcastBody(
        `Attention Traders,\n\nThe weekly 100-trader arena season is entering its final stretch! Make your moves, protect your capital, and climb up the leaderboard.\n\nExclusive season finale mystery drops and creator bounties are dropping soon for top rankers.\n\nTrade smart,\nGrowPlay Team`
      );
    } else if (templateType === 'winner_prize') {
      setBroadcastSubject('🎉 [GrowPlay] Congratulations! You\'re a Top 3 Winner!');
      setBroadcastBody(
        `Hey Champion,\n\nCongratulations on securing a Top 3 rank in the GrowPlay Arena! You have qualified for our Season Physical Reward.\n\nPlease reply to this email with your shipping address and contact number so we can dispatch your reward.\n\nKeep trading,\nGrowPlay Admin`
      );
    } else if (templateType === 'blank') {
      setBroadcastSubject('');
      setBroadcastBody('');
    }
  };

  const handleLaunchEmailClient = async () => {
    if (targetEmails.length === 0) {
      Alert.alert('No Emails Found', 'There are no registered user emails in this selected group yet.');
      return;
    }
    if (!broadcastSubject.trim()) {
      Alert.alert('Subject Required', 'Please enter an email subject line.');
      return;
    }

    try {
      const subject = encodeURIComponent(broadcastSubject.trim());
      const body = encodeURIComponent(broadcastBody.trim());
      // All user emails put into BCC for 100% privacy
      const bcc = encodeURIComponent(targetEmails.join(','));
      const mailtoUrl = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;

      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        await Share.share({
          title: broadcastSubject,
          message: `Subject: ${broadcastSubject}\n\nRecipients (BCC):\n${targetEmails.join(', ')}\n\n${broadcastBody}`,
        });
      }
    } catch (e) {
      Alert.alert(
        'Email Client Notice',
        'Opening email app failed. Would you like to copy the recipient list and message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Copy Details',
            onPress: () => {
              Share.share({
                title: broadcastSubject,
                message: `Recipients BCC:\n${targetEmails.join(', ')}\n\nSubject:\n${broadcastSubject}\n\nBody:\n${broadcastBody}`,
              });
            },
          },
        ]
      );
    }
  };

  const handleCopyEmailList = () => {
    if (targetEmails.length === 0) {
      Alert.alert('No Emails', 'No emails found in this category.');
      return;
    }
    Share.share({
      title: 'GrowPlay User Emails (BCC List)',
      message: targetEmails.join(', '),
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#00C853" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── PRIVATE LOGIN GATE (NO CREDENTIALS DISPLAYED) ───
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Private Console</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.gateScroll}>
          <View style={styles.gateShield}>
            <Ionicons name="lock-closed" size={44} color="#FFD700" />
          </View>
          <Text style={styles.gateTitle}>Private Creator Console 👑</Text>
          <Text style={styles.gateSubtitle}>
            Restricted master terminal. Enter your private Administrator ID and secret master passphrase to manage real database cohorts, winners, and losers.
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>PRIVATE ADMIN ID</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#777" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.gateInputInner}
                value={adminIdInput}
                onChangeText={setAdminIdInput}
                placeholder="Enter your admin ID"
                placeholderTextColor="#555"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.inputLabel}>MASTER PASSPHRASE</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="key-outline" size={18} color="#777" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.gateInputInner}
                value={adminPassInput}
                onChangeText={setAdminPassInput}
                placeholder="Enter master passphrase"
                placeholderTextColor="#555"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            {authError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#ff4444" />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.loginBtn} onPress={handleAdminLogin}>
              <Ionicons name="shield-checkmark" size={18} color="#000" />
              <Text style={styles.loginBtnText}>Unlock Private Console</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── AUTHENTICATED REAL CONSOLE ───
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Creator Console 👑</Text>
          <Text style={styles.headerSubtitle}>100% Real Live Database</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowCredsModal(true)}>
          <Ionicons name="key" size={18} color="#FFD700" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.lockBtn} onPress={handleAdminLogout}>
          <Ionicons name="lock-closed" size={18} color="#ff4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Real Summary Metrics */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>REAL REGISTERED</Text>
            <Text style={styles.summaryVal}>{realProfiles.length}</Text>
            <Text style={styles.summarySub}>Live Supabase Profiles</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ARENA COHORTS</Text>
            <Text style={[styles.summaryVal, { color: '#00C853' }]}>{cohorts.length}</Text>
            <Text style={styles.summarySub}>100 Traders/Group</Text>
          </View>
          <TouchableOpacity
            style={[styles.summaryCard, unreadFeedbackCount > 0 && { borderColor: '#FFB300', borderWidth: 1.5 }]}
            onPress={() => setAdminTab('feedback')}
          >
            <Text style={styles.summaryLabel}>FEEDBACK INBOX</Text>
            <Text style={[styles.summaryVal, { color: unreadFeedbackCount > 0 ? '#FFB300' : '#29B6F6' }]}>
              {feedbacks.length}
            </Text>
            <Text style={styles.summarySub}>
              {unreadFeedbackCount > 0 ? `🔥 ${unreadFeedbackCount} unread` : 'All reviewed'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Master Console Switcher Tabs */}
        <View style={styles.consoleTabRow}>
          <TouchableOpacity
            style={[styles.consoleTabBtn, adminTab === 'cohorts' && styles.consoleTabBtnActive]}
            onPress={() => setAdminTab('cohorts')}
          >
            <Ionicons
              name="people"
              size={16}
              color={adminTab === 'cohorts' ? '#00C853' : '#777'}
            />
            <Text
              style={[
                styles.consoleTabBtnText,
                adminTab === 'cohorts' && styles.consoleTabBtnTextActive,
              ]}
            >
              100-Trader Arenas ({realProfiles.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.consoleTabBtn,
              adminTab === 'feedback' && styles.consoleTabBtnActiveFeedback,
            ]}
            onPress={() => setAdminTab('feedback')}
          >
            <Ionicons
              name="chatbubbles"
              size={16}
              color={adminTab === 'feedback' ? '#FFB300' : '#777'}
            />
            <Text
              style={[
                styles.consoleTabBtnText,
                adminTab === 'feedback' && { color: '#FFB300', fontWeight: 'bold' },
              ]}
            >
              Feedback Inbox ({feedbacks.length})
            </Text>
            {unreadFeedbackCount > 0 && (
              <View style={styles.unreadBadgePill}>
                <Text style={styles.unreadBadgeText}>{unreadFeedbackCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {adminTab === 'cohorts' ? (
          <>
            {/* Action Button: Export Real Winners & Losers */}
            <TouchableOpacity style={styles.actionBanner} onPress={handleExportAll}>
              <Ionicons name="share-social" size={20} color="#000" />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionBannerTitle}>Export Winners & Losers Report 📋</Text>
                <Text style={styles.actionBannerSub}>Exports complete real user UUIDs, emails, XP, & P&L</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#000" />
            </TouchableOpacity>

            {/* Action Button: Broadcast Email to Users */}
            <TouchableOpacity
              style={styles.broadcastBanner}
              onPress={() => setShowBroadcastModal(true)}
            >
              <View style={styles.broadcastBannerIconWrap}>
                <Ionicons name="mail" size={20} color="#FFD700" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.broadcastBannerTitle}>Broadcast Email to Users ✉️</Text>
                  <View style={styles.broadcastCountPill}>
                    <Text style={styles.broadcastCountText}>
                      {realProfiles.filter((p) => p.email).length} Traders
                    </Text>
                  </View>
                </View>
                <Text style={styles.broadcastBannerSub}>
                  Send mass feedback requests, announcements & secret drop updates
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFD700" />
            </TouchableOpacity>

            {/* Search Bar */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by username, email, or UUID..."
                  placeholderTextColor="#555"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#666" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={loadRealDatabaseData} disabled={refreshing}>
                {refreshing ? (
                  <ActivityIndicator size="small" color="#00C853" />
                ) : (
                  <Ionicons name="refresh" size={18} color="#00C853" />
                )}
              </TouchableOpacity>
            </View>

            {/* Cohort Selector (100 Users/Cohort) */}
            {cohorts.length > 1 && (
              <>
                <Text style={styles.sectionHeader}>SELECT 100-TRADER ARENA GROUP</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cohortScroll}>
                  {cohorts.map((c) => {
                    const isSelected = c.cohortNumber === selectedCohort;
                    return (
                      <TouchableOpacity
                        key={c.cohortNumber}
                        style={[styles.cohortPill, isSelected && styles.cohortPillActive]}
                        onPress={() => setSelectedCohort(c.cohortNumber)}
                      >
                        <Text style={[styles.cohortPillText, isSelected && styles.cohortPillTextActive]}>
                          Arena #{c.cohortNumber} ({c.totalInCohort}/100)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* 4 Categorized Filter Tabs (All, Winners, Losers, Loss Makers) */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterTab, filterMode === 'all' && styles.filterTabActive]}
                onPress={() => setFilterMode('all')}
              >
                <Text style={[styles.filterTabText, filterMode === 'all' && styles.filterTabTextActive]}>
                  All ({activeCohort?.users?.length ?? 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filterMode === 'winners' && styles.filterTabActive]}
                onPress={() => setFilterMode('winners')}
              >
                <Text style={[styles.filterTabText, filterMode === 'winners' && styles.filterTabTextActive]}>
                  🥇 Winners (Top 3)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filterMode === 'losers' && styles.filterTabActiveLoser]}
                onPress={() => setFilterMode('losers')}
              >
                <Text style={[styles.filterTabText, filterMode === 'losers' && { color: '#ff4444', fontWeight: 'bold' }]}>
                  🔴 Losers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filterMode === 'loss_makers' && styles.filterTabActiveLoss]}
                onPress={() => setFilterMode('loss_makers')}
              >
                <Text style={[styles.filterTabText, filterMode === 'loss_makers' && { color: '#ff6b35', fontWeight: 'bold' }]}>
                  📉 Losses
                </Text>
              </TouchableOpacity>
            </View>

            {/* User List Header */}
            <Text style={styles.sectionHeader}>
              {filterMode === 'winners'
                ? '🏆 TOP 3 WINNERS (RANKS 1, 2 & 3 • PHYSICAL REWARDS)'
                : filterMode === 'losers'
                ? '🔴 RELEGATED / BOTTOM TRADERS (REAL LOSERS WITH UUID)'
                : filterMode === 'loss_makers'
                ? '📉 TRADERS WITH NEGATIVE P&L (NET LOSSES)'
                : `REAL PARTICIPANTS IN ARENA #${selectedCohort}`}
            </Text>

            {displayedUsers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={36} color="#555" />
                <Text style={styles.emptyTitle}>No Real Traders Found</Text>
                <Text style={styles.emptySubtitle}>
                  {filterMode === 'loss_makers'
                    ? 'No registered users currently have a negative P&L.'
                    : 'Registered accounts from Supabase will automatically appear here.'}
                </Text>
              </View>
            ) : (
              displayedUsers.map((u) => {
                const rank = activeCohort.users.findIndex((item) => item.id === u.id) + 1;
                const isWinner = rank <= 3;
                const isLoser = rank > Math.max(10, activeCohort.users.length - 15);
                const avatar = getAvatarById(u.avatar_id);
                const pnl = u.total_pnl ?? 0;

                return (
                  <View
                    key={u.id}
                    style={[
                      styles.realUserCard,
                      isWinner && { borderColor: rank === 1 ? '#FFD700' : '#00C85360' },
                      (isLoser || pnl < 0) && { borderColor: '#ff444450' },
                    ]}
                  >
                    {/* Top Row: Rank, Avatar, Name/Email, XP & PnL */}
                    <View style={styles.userCardTop}>
                      <View
                        style={[
                          styles.rankPill,
                          isWinner && styles.rankPillWinner,
                          (isLoser || pnl < 0) && styles.rankPillLoser,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankPillText,
                            isWinner && { color: rank === 1 ? '#FFD700' : '#00C853' },
                            (isLoser || pnl < 0) && { color: '#ff4444' },
                          ]}
                        >
                          #{rank}
                        </Text>
                      </View>

                      <View style={styles.userAvatarBox}>
                        <Text style={{ fontSize: 22 }}>{avatar.emoji}</Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.userNameText} numberOfLines={1} ellipsizeMode="tail">{u.username || 'Anonymous'}</Text>
                          {isWinner && (
                            <View style={styles.winnerBadge}>
                              <Text style={styles.winnerBadgeText}>WINNER 🎁</Text>
                            </View>
                          )}
                          {(isLoser || pnl < 0) && (
                            <View style={styles.loserBadge}>
                              <Text style={styles.loserBadgeText}>LOSER 🔴</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.userEmailText} numberOfLines={1} ellipsizeMode="tail">{u.email || 'No email attached'}</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={styles.userXPText} numberOfLines={1}>{u.xp?.toLocaleString() ?? 0} XP</Text>
                        <Text style={[styles.userPnlText, { color: pnl >= 0 ? '#00C853' : '#ff4444' }]} numberOfLines={1}>
                          {pnl >= 0 ? `+₹${pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(pnl).toLocaleString('en-IN')}`}
                        </Text>
                      </View>
                    </View>

                    {/* Status Explanation Bar */}
                    <View style={[styles.statusBar, isWinner ? styles.statusBarWinner : styles.statusBarLoser]}>
                      <Ionicons
                        name={isWinner ? 'trophy' : 'alert-circle'}
                        size={14}
                        color={isWinner ? '#FFD700' : '#ff4444'}
                      />
                      <Text style={[styles.statusBarText, { color: isWinner ? '#FFD700' : '#ff7777' }]} numberOfLines={2}>
                        {isWinner
                          ? `Rank #${rank} in Arena: Top 3 Winner • Physical Reward Qualifier`
                          : pnl < 0
                          ? `Negative Trading P&L (-₹${Math.abs(pnl).toLocaleString('en-IN')} loss)`
                          : `Rank #${rank} in Arena: In Danger of Relegation`}
                      </Text>
                    </View>

                    {/* Bottom Row: User UUID & Action Buttons */}
                    <View style={styles.uuidRow}>
                      <Text style={styles.uuidLabel}>UUID:</Text>
                      <Text style={styles.uuidValue} numberOfLines={1} ellipsizeMode="middle">
                        {u.id}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyPill}
                        onPress={() => handleCopy('User UUID', u.id)}
                      >
                        <Ionicons name="copy-outline" size={12} color="#00C853" />
                        <Text style={styles.copyPillText}>Copy ID</Text>
                      </TouchableOpacity>
                      {u.email ? (
                        <TouchableOpacity
                          style={[styles.copyPill, { backgroundColor: '#202020' }]}
                          onPress={() => handleCopy('User Email', u.email)}
                        >
                          <Ionicons name="mail-outline" size={12} color="#aaa" />
                          <Text style={[styles.copyPillText, { color: '#aaa' }]}>Email</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          /* FEEDBACK INBOX TAB */
          <View style={styles.feedbackContainer}>
            {/* Top Action Buttons: Export & Clear */}
            <View style={styles.feedbackTopActionsRow}>
              <TouchableOpacity style={styles.feedbackActionBtn} onPress={handleExportFeedbacks}>
                <Ionicons name="share-social-outline" size={16} color="#00C853" />
                <Text style={styles.feedbackActionBtnText}>Export Feedback Report 📋</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.feedbackActionBtn, { borderColor: '#ff444430', backgroundColor: '#201010' }]}
                onPress={handleClearResolved}
              >
                <Ionicons name="trash-outline" size={15} color="#ff7777" />
                <Text style={[styles.feedbackActionBtnText, { color: '#ff7777' }]}>Clear Resolved</Text>
              </TouchableOpacity>
            </View>

            {/* Feedback Search Bar */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  value={feedbackSearch}
                  onChangeText={setFeedbackSearch}
                  placeholder="Search feedback, username, email..."
                  placeholderTextColor="#555"
                />
                {feedbackSearch ? (
                  <TouchableOpacity onPress={() => setFeedbackSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#666" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={loadRealDatabaseData} disabled={refreshing}>
                {refreshing ? (
                  <ActivityIndicator size="small" color="#00C853" />
                ) : (
                  <Ionicons name="refresh" size={18} color="#00C853" />
                )}
              </TouchableOpacity>
            </View>

            {/* 3 Status Filter Tabs */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterTab, feedbackFilter === 'all' && styles.filterTabActive]}
                onPress={() => setFeedbackFilter('all')}
              >
                <Text style={[styles.filterTabText, feedbackFilter === 'all' && styles.filterTabTextActive]}>
                  All ({feedbacks.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, feedbackFilter === 'unread' && styles.filterTabActiveUnread]}
                onPress={() => setFeedbackFilter('unread')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    feedbackFilter === 'unread' && { color: '#FFB300', fontWeight: 'bold' },
                  ]}
                >
                  🟡 Unread ({unreadFeedbackCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, feedbackFilter === 'resolved' && styles.filterTabActiveResolved]}
                onPress={() => setFeedbackFilter('resolved')}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    feedbackFilter === 'resolved' && { color: '#00C853', fontWeight: 'bold' },
                  ]}
                >
                  🟢 Resolved ({feedbacks.filter((f) => f.status === 'resolved').length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section Header */}
            <Text style={styles.sectionHeader}>
              {feedbackFilter === 'unread'
                ? '🟡 UNREAD MESSAGES AWAITING CREATOR REVIEW'
                : feedbackFilter === 'resolved'
                ? '🟢 RESOLVED / COMPLETED FEEDBACK'
                : 'REAL USER FEEDBACK, QUESTIONS & SUGGESTIONS'}
            </Text>

            {displayedFeedbacks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={40} color="#555" />
                <Text style={styles.emptyTitle}>No Feedback In This View</Text>
                <Text style={styles.emptySubtitle}>
                  {feedbackFilter === 'unread'
                    ? 'All user feedback has been reviewed and resolved!'
                    : 'Any messages sent by users from the Help screen will arrive here directly without emailing you.'}
                </Text>
              </View>
            ) : (
              displayedFeedbacks.map((fb) => {
                const isResolved = fb.status === 'resolved';
                const isBug = fb.category === 'Bug';
                const isSuggestion = fb.category === 'Suggestion';

                return (
                  <View
                    key={fb.id}
                    style={[
                      styles.feedbackCard,
                      !isResolved && { borderColor: '#FFB30040' },
                    ]}
                  >
                    {/* Header Row: User Info, Category Badge, Status Pill */}
                    <View style={styles.fbHeaderRow}>
                      <View style={styles.fbUserAvatar}>
                        <Text style={{ fontSize: 18 }}>
                          {isBug ? '🐛' : isSuggestion ? '💡' : fb.category === 'Question' ? '❓' : '💬'}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.fbUserName} numberOfLines={1}>
                            {fb.user_name || 'Anonymous Trader'}
                          </Text>
                          <View
                            style={[
                              styles.fbCategoryBadge,
                              isBug
                                ? { backgroundColor: '#ff444420', borderColor: '#ff444440' }
                                : isSuggestion
                                ? { backgroundColor: '#00C85320', borderColor: '#00C85340' }
                                : { backgroundColor: '#29B6F620', borderColor: '#29B6F640' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.fbCategoryBadgeText,
                                isBug ? { color: '#ff6666' } : isSuggestion ? { color: '#00E676' } : { color: '#29B6F6' },
                              ]}
                            >
                              {fb.category || 'General'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.fbUserEmail} numberOfLines={1}>
                          {fb.user_email || 'No email (Guest / App session)'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.fbStatusPill,
                          isResolved ? styles.fbStatusPillResolved : styles.fbStatusPillUnread,
                        ]}
                      >
                        <Text
                          style={[
                            styles.fbStatusPillText,
                            isResolved ? { color: '#00C853' } : { color: '#FFB300' },
                          ]}
                        >
                          {isResolved ? 'RESOLVED' : 'UNREAD'}
                        </Text>
                      </View>
                    </View>

                    {/* Message Body */}
                    <View style={styles.fbMessageContainer}>
                      <Text style={styles.fbMessageText}>{fb.message}</Text>
                    </View>

                    {/* Footer Row: Date & Quick Actions */}
                    <View style={styles.fbFooterRow}>
                      <Text style={styles.fbDateText}>
                        {new Date(fb.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>

                      <View style={styles.fbActionsWrap}>
                        {fb.user_email ? (
                          <TouchableOpacity
                            style={styles.fbActionPill}
                            onPress={() => handleReplyToTrader(fb)}
                          >
                            <Ionicons name="mail-outline" size={13} color="#29B6F6" />
                            <Text style={[styles.fbActionPillText, { color: '#29B6F6' }]}>Reply</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={[
                            styles.fbActionPill,
                            isResolved && { borderColor: '#444' },
                          ]}
                          onPress={() => handleToggleFeedbackStatus(fb.id, fb.status)}
                        >
                          <Ionicons
                            name={isResolved ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
                            size={13}
                            color={isResolved ? '#aaa' : '#00C853'}
                          />
                          <Text
                            style={[
                              styles.fbActionPillText,
                              { color: isResolved ? '#aaa' : '#00C853' },
                            ]}
                          >
                            {isResolved ? 'Re-open' : 'Resolve'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.fbActionPill, { borderColor: '#ff444430' }]}
                          onPress={() => handleDeleteFeedback(fb.id)}
                        >
                          <Ionicons name="trash-outline" size={13} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Direct Supabase Production Status */}
        <View style={styles.dbInfoBox}>
          <Ionicons name="shield-checkmark" size={20} color="#00C853" />
          <View style={{ flex: 1 }}>
            <Text style={styles.dbInfoTitle}>Pure Production Supabase Database</Text>
            <Text style={styles.dbInfoText}>
              All data shown is 100% real. Zero mock or generated bots exist in this environment.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL: UPDATE PRIVATE ADMIN CREDENTIALS */}
      <Modal visible={showCredsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>Update Master Credentials 🔐</Text>
              <TouchableOpacity onPress={() => setShowCredsModal(false)}>
                <Ionicons name="close-circle" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitleText}>
              Change your private Admin ID and secret password so only you can access this terminal.
            </Text>

            <Text style={styles.inputLabel}>NEW PRIVATE ADMIN ID</Text>
            <TextInput
              style={styles.modalInput}
              value={newAdminId}
              onChangeText={setNewAdminId}
              placeholder="e.g. my_private_id"
              placeholderTextColor="#555"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>NEW MASTER PASSWORD</Text>
            <TextInput
              style={styles.modalInput}
              value={newAdminPass}
              onChangeText={setNewAdminPass}
              placeholder="Enter new secret password"
              placeholderTextColor="#555"
              secureTextEntry
            />

            <Text style={styles.inputLabel}>CONFIRM MASTER PASSWORD</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmAdminPass}
              onChangeText={setConfirmAdminPass}
              placeholder="Re-enter new secret password"
              placeholderTextColor="#555"
              secureTextEntry
            />

            {credsSuccess ? <Text style={styles.successText}>{credsSuccess}</Text> : null}

            <TouchableOpacity style={styles.saveCredsBtn} onPress={handleSaveNewCreds}>
              <Text style={styles.saveCredsBtnText}>Save Private Credentials</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: BROADCAST EMAIL TO USERS */}
      <Modal visible={showBroadcastModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.broadcastModalContainer}>
          <View style={styles.broadcastModalHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.broadcastModalTitle} numberOfLines={1}>Broadcast Email to Users ✉️</Text>
              <Text style={styles.broadcastModalSubtitle} numberOfLines={1}>
                Mass mail real registered traders for feedback & announcements
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowBroadcastModal(false)}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.broadcastScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Target Audience Selector */}
            <Text style={styles.inputLabel}>SELECT AUDIENCE</Text>
            <View style={styles.audienceRow}>
              <TouchableOpacity
                style={[
                  styles.audienceBtn,
                  broadcastTarget === 'all' && styles.audienceBtnActive,
                ]}
                onPress={() => setBroadcastTarget('all')}
              >
                <Text
                  style={[
                    styles.audienceBtnText,
                    broadcastTarget === 'all' && styles.audienceBtnTextActive,
                  ]}
                >
                  All Users ({realProfiles.filter((p) => p.email).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.audienceBtn,
                  broadcastTarget === 'winners' && styles.audienceBtnActive,
                ]}
                onPress={() => setBroadcastTarget('winners')}
              >
                <Text
                  style={[
                    styles.audienceBtnText,
                    broadcastTarget === 'winners' && styles.audienceBtnTextActive,
                  ]}
                >
                  🥇 Top 3 ({realProfiles.slice(0, 3).filter((p) => p.email).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.audienceBtn,
                  broadcastTarget === 'losers' && styles.audienceBtnActive,
                ]}
                onPress={() => setBroadcastTarget('losers')}
              >
                <Text
                  style={[
                    styles.audienceBtnText,
                    broadcastTarget === 'losers' && styles.audienceBtnTextActive,
                  ]}
                >
                  🔴 Losers (Bottom)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.audienceBtn,
                  broadcastTarget === 'loss_makers' && styles.audienceBtnActive,
                ]}
                onPress={() => setBroadcastTarget('loss_makers')}
              >
                <Text
                  style={[
                    styles.audienceBtnText,
                    broadcastTarget === 'loss_makers' && styles.audienceBtnTextActive,
                  ]}
                >
                  📉 Loss Makers ({realProfiles.filter((p) => (p.total_pnl ?? 0) < 0 && p.email).length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Templates */}
            <Text style={styles.inputLabel}>QUICK MESSAGE TEMPLATES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.templatePill}
                  onPress={() => applyTemplate('feedback')}
                >
                  <Text style={styles.templatePillText}>📝 Request Feedback</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.templatePill}
                  onPress={() => applyTemplate('season_drop')}
                >
                  <Text style={styles.templatePillText}>🔥 Season Drop Alert</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.templatePill}
                  onPress={() => applyTemplate('winner_prize')}
                >
                  <Text style={styles.templatePillText}>🎉 Top Winner Prize</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.templatePill}
                  onPress={() => applyTemplate('blank')}
                >
                  <Text style={styles.templatePillText}>⚡ Blank</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Subject Input */}
            <Text style={styles.inputLabel}>EMAIL SUBJECT</Text>
            <TextInput
              style={styles.broadcastSubjectInput}
              value={broadcastSubject}
              onChangeText={setBroadcastSubject}
              placeholder="e.g. Quick feedback on your GrowPlay experience..."
              placeholderTextColor="#555"
            />

            {/* Body Input */}
            <Text style={styles.inputLabel}>EMAIL MESSAGE / BODY</Text>
            <TextInput
              style={styles.broadcastBodyInput}
              value={broadcastBody}
              onChangeText={setBroadcastBody}
              placeholder="Type your announcement or feedback questions here..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            {/* Privacy & Recipient Summary Badge */}
            <View style={styles.privacyBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="shield-checkmark" size={16} color="#00C853" />
                <Text style={styles.privacyTitle}>
                  {targetEmails.length} Recipients (BCC Protected)
                </Text>
              </View>
              <Text style={styles.privacySub}>
                All user emails are added to BCC so recipient email addresses remain completely private and hidden from one another.
              </Text>
              {targetEmails.length > 0 && (
                <Text style={styles.emailPreviewText} numberOfLines={2}>
                  {targetEmails.slice(0, 4).join(', ')}
                  {targetEmails.length > 4 ? ` + ${targetEmails.length - 4} more` : ''}
                </Text>
              )}
            </View>

            {/* Dispatch Buttons */}
            <TouchableOpacity
              style={styles.sendEmailBtn}
              onPress={handleLaunchEmailClient}
            >
              <Ionicons name="send" size={18} color="#000" />
              <Text style={styles.sendEmailBtnText}>
                Open Email Client & Send (BCC {targetEmails.length})
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={handleCopyEmailList}
              >
                <Ionicons name="copy-outline" size={16} color="#00C853" />
                <Text style={styles.secondaryActionText}>Copy BCC Emails</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => {
                  Share.share({
                    title: broadcastSubject,
                    message: `${broadcastSubject}\n\n${broadcastBody}`,
                  });
                }}
              >
                <Ionicons name="share-outline" size={16} color="#FFD700" />
                <Text style={[styles.secondaryActionText, { color: '#FFD700' }]}>
                  Share Draft
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: '500',
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFD70018',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  lockBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2b1111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff444440',
  },
  scrollContent: {
    padding: 16,
  },
  gateScroll: {
    padding: 24,
    alignItems: 'center',
  },
  gateShield: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD70012',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD70035',
    marginTop: 20,
    marginBottom: 16,
  },
  gateTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gateSubtitle: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  formCard: {
    width: '100%',
    backgroundColor: '#121212',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#222',
  },
  inputLabel: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  gateInputInner: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff444415',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff444430',
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 12,
    flex: 1,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00C853',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
    gap: 8,
  },
  loginBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#141414',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#777',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryVal: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  summarySub: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 12,
    overflow: 'hidden',
  },
  actionBannerTitle: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  actionBannerSub: {
    color: '#333',
    fontSize: 11,
    marginTop: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    color: '#777',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  cohortScroll: {
    marginBottom: 14,
  },
  cohortPill: {
    backgroundColor: '#161616',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    marginRight: 8,
  },
  cohortPillActive: {
    backgroundColor: '#00C85320',
    borderColor: '#00C853',
  },
  cohortPillText: {
    color: '#888',
    fontSize: 12,
  },
  cohortPillTextActive: {
    color: '#00C853',
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
  },
  filterTabActive: {
    backgroundColor: '#00C85320',
    borderColor: '#00C853',
  },
  filterTabActiveLoser: {
    backgroundColor: '#ff444420',
    borderColor: '#ff4444',
  },
  filterTabActiveLoss: {
    backgroundColor: '#ff6b3520',
    borderColor: '#ff6b35',
  },
  filterTabText: {
    color: '#777',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#00C853',
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#121212',
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  realUserCard: {
    backgroundColor: '#131313',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 10,
    overflow: 'hidden',
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankPillWinner: {
    backgroundColor: '#FFD70018',
  },
  rankPillLoser: {
    backgroundColor: '#ff444418',
  },
  rankPillText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  winnerBadge: {
    backgroundColor: '#FFD70020',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFD70050',
  },
  winnerBadgeText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: 'bold',
  },
  loserBadge: {
    backgroundColor: '#ff444420',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff444450',
  },
  loserBadgeText: {
    color: '#ff4444',
    fontSize: 9,
    fontWeight: 'bold',
  },
  userEmailText: {
    color: '#777',
    fontSize: 11,
    marginTop: 1,
  },
  userXPText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  userPnlText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  statusBarWinner: {
    backgroundColor: '#FFD70010',
    borderWidth: 1,
    borderColor: '#FFD70030',
  },
  statusBarLoser: {
    backgroundColor: '#ff444410',
    borderWidth: 1,
    borderColor: '#ff444430',
  },
  statusBarText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  uuidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
    gap: 8,
  },
  uuidLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: 'bold',
  },
  uuidValue: {
    flex: 1,
    color: '#999',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C85315',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  copyPillText: {
    color: '#00C853',
    fontSize: 10,
    fontWeight: '600',
  },
  dbInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    marginTop: 10,
    gap: 12,
  },
  dbInfoTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dbInfoText: {
    color: '#777',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#141414',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalSubtitleText: {
    color: '#888',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#333',
  },
  saveCredsBtn: {
    backgroundColor: '#00C853',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  saveCredsBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successText: {
    color: '#00C853',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  broadcastBanner: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  broadcastBannerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFD70018',
    borderWidth: 1,
    borderColor: '#FFD70040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  broadcastCountPill: {
    backgroundColor: '#00C85320',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00C85350',
  },
  broadcastCountText: {
    color: '#00C853',
    fontSize: 11,
    fontWeight: '700',
  },
  broadcastBannerSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  broadcastModalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  broadcastModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  broadcastModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  broadcastModalSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  broadcastScroll: {
    padding: 16,
  },
  audienceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  audienceBtn: {
    backgroundColor: '#161616',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  audienceBtnActive: {
    backgroundColor: '#00C85320',
    borderColor: '#00C853',
  },
  audienceBtnText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  audienceBtnTextActive: {
    color: '#00C853',
    fontWeight: 'bold',
  },
  templatePill: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  templatePillText: {
    color: '#ddd',
    fontSize: 12,
    fontWeight: '600',
  },
  broadcastSubjectInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
  },
  broadcastBodyInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 140,
    marginBottom: 16,
  },
  privacyBadge: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 16,
  },
  privacyTitle: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: 'bold',
  },
  privacySub: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
  },
  emailPreviewText: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 6,
  },
  sendEmailBtn: {
    backgroundColor: '#00C853',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sendEmailBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#262626',
  },
  secondaryActionText: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: '600',
  },
  consoleTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
  },
  consoleTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#141414',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242424',
  },
  consoleTabBtnActive: {
    backgroundColor: '#00C85315',
    borderColor: '#00C853',
  },
  consoleTabBtnActiveFeedback: {
    backgroundColor: '#FFB30015',
    borderColor: '#FFB300',
  },
  consoleTabBtnText: {
    color: '#777',
    fontSize: 12,
    fontWeight: '600',
  },
  consoleTabBtnTextActive: {
    color: '#00C853',
    fontWeight: 'bold',
  },
  unreadBadgePill: {
    backgroundColor: '#FFB300',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  unreadBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterTabActiveUnread: {
    borderColor: '#FFB300',
    backgroundColor: '#FFB30018',
  },
  filterTabActiveResolved: {
    borderColor: '#00C853',
    backgroundColor: '#00C85318',
  },
  feedbackContainer: {
    width: '100%',
  },
  feedbackTopActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  feedbackActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  feedbackActionBtnText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: 'bold',
  },
  feedbackCard: {
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 12,
  },
  fbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  fbUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbUserName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fbCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  fbCategoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  fbUserEmail: {
    color: '#777',
    fontSize: 11,
    marginTop: 2,
  },
  fbStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  fbStatusPillUnread: {
    backgroundColor: '#FFB30015',
    borderColor: '#FFB30050',
  },
  fbStatusPillResolved: {
    backgroundColor: '#00C85315',
    borderColor: '#00C85350',
  },
  fbStatusPillText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  fbMessageContainer: {
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#00C853',
    marginBottom: 12,
  },
  fbMessageText: {
    color: '#ddd',
    fontSize: 13,
    lineHeight: 19,
  },
  fbFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1c1c1c',
    gap: 8,
  },
  fbDateText: {
    color: '#666',
    fontSize: 11,
  },
  fbActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fbActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#292929',
  },
  fbActionPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
