import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Weekly P&L & League Competition XP ─────────────────

export interface WeeklySeasonTimeline {
  isActive: boolean;
  days: number;
  hrs: number;
  mins: number;
  secs: number;
  label: string;
  statusBadge: string;
  subtext: string;
}

/**
 * Weekly Season Timeline: Monday 09:15 AM to Friday 04:00 PM (Indian Market Trading Window)
 * If current time is within this window -> Season is ACTIVE (counts down to Friday 16:00)
 * If outside -> Season is in INTERMISSION / WEEKEND SETTLEMENT (counts down to next Monday 09:15)
 */
export const getWeeklySeasonTimeline = (): WeeklySeasonTimeline => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = 9 * 60 + 15; // 09:15 AM -> 555 min
  const endMinutes = 16 * 60;       // 04:00 PM -> 960 min

  const isActive =
    (day === 1 && currentMinutes >= startMinutes) ||
    (day >= 2 && day <= 4) ||
    (day === 5 && currentMinutes < endMinutes);

  const targetDate = new Date(now);

  if (isActive) {
    // Target is this week's Friday at 16:00:00 (4:00 PM)
    const daysUntilFriday = 5 - day;
    targetDate.setDate(now.getDate() + daysUntilFriday);
    targetDate.setHours(16, 0, 0, 0);
  } else {
    // Target is next Monday at 09:15:00 AM
    let daysUntilMonday = 0;
    if (day === 1 && currentMinutes < startMinutes) {
      // Monday morning before 9:15 AM
      daysUntilMonday = 0;
    } else if (day === 5) {
      // Friday after 4:00 PM
      daysUntilMonday = 3;
    } else if (day === 6) {
      // Saturday
      daysUntilMonday = 2;
    } else if (day === 0) {
      // Sunday
      daysUntilMonday = 1;
    } else {
      daysUntilMonday = (8 - day) % 7;
    }
    targetDate.setDate(now.getDate() + daysUntilMonday);
    targetDate.setHours(9, 15, 0, 0);
  }

  const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / (3600 * 24));
  const hrs = Math.floor((totalSecs % (3600 * 24)) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  return {
    isActive,
    days,
    hrs,
    mins,
    secs,
    label: isActive ? 'WEEKLY SEASON ENDS IN' : 'NEXT SEASON STARTS IN',
    statusBadge: isActive ? '🟢 LIVE ARENA' : '🟡 INTERMISSION',
    subtext: isActive ? 'Mon 9:15 AM – Fri 4:00 PM IST' : 'Weekend Break • Resets Mon 9:15 AM',
  };
};

export const getCurrentWeekId = (): string => {
  const now = new Date();
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Weekly season starts Monday 09:15 AM
  const refDate = new Date(now);
  if (day === 0) {
    // Sunday belongs to the season that ended on Friday
    refDate.setDate(now.getDate() - 6);
  } else if (day === 1 && currentMinutes < 9 * 60 + 15) {
    // Monday pre-market belongs to previous week
    refDate.setDate(now.getDate() - 7);
  } else {
    // Current week started on the most recent Monday
    refDate.setDate(now.getDate() - (day - 1));
  }

  const startOfYear = new Date(refDate.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((refDate.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
  return `${refDate.getFullYear()}_W${weekNumber}`;
};

export const getWeeklyPnl = async (userId?: string): Promise<number> => {
  try {
    const weekKey = `weekly_pnl_${getCurrentWeekId()}`;
    const stored = await AsyncStorage.getItem(weekKey);
    if (stored !== null) return parseFloat(stored);

    if (userId) {
      const { data } = await supabase
        .from('profiles')
        .select('total_pnl')
        .eq('id', userId)
        .single();
      if (data?.total_pnl) return data.total_pnl;
    }
    return 0;
  } catch (e) {
    return 0;
  }
};

export const recordWeeklyTradePnl = async (pnl: number): Promise<number> => {
  try {
    const weekKey = `weekly_pnl_${getCurrentWeekId()}`;
    const stored = await AsyncStorage.getItem(weekKey);
    const current = stored ? parseFloat(stored) : 0;
    const updated = current + pnl;
    await AsyncStorage.setItem(weekKey, updated.toString());
    return updated;
  } catch (e) {
    return pnl;
  }
};

export const calculateWeeklyCompetitionXP = (baseXP: number, weeklyPnl: number) => {
  // Weekly net performance rule:
  // Profit: +1 XP per ₹100 weekly profit
  // Loss: -1 XP per ₹100 weekly loss
  // Zero Floor Guarantee: XP can never drop below 0!
  const safeBaseXP = Math.max(0, baseXP || 0);
  const weeklyPnlXP = Math.round(weeklyPnl / 100);
  const totalWeeklyXP = Math.max(0, safeBaseXP + weeklyPnlXP);
  return {
    totalWeeklyXP,
    baseXP: safeBaseXP,
    weeklyPnlXP,
    weeklyPnl,
  };
};

// ─── Arena Group & Transition (Stay / Swap Group / Solo Mode) ───

export type ArenaParticipationMode = 'group' | 'individual';
export type NextSeasonPreference = 'stay' | 'change' | 'individual';

export interface UserArenaState {
  mode: ArenaParticipationMode;
  groupNumber: number;
  nextSeasonPref: NextSeasonPreference;
}

/**
 * Ensures NO group is left incomplete.
 * Each group holds exactly 100 traders.
 * New entrants and users swapping groups auto-fill the current incomplete group (< 100 slots)
 * before opening the next group.
 */
export const calculateCohortAssignment = (totalTraders: number): { openGroup: number; groupFillCount: number } => {
  const safeCount = Math.max(0, totalTraders);
  const remainder = safeCount % 100;
  if (remainder === 0 && safeCount > 0) {
    return {
      openGroup: Math.floor(safeCount / 100) + 1,
      groupFillCount: 0,
    };
  }
  return {
    openGroup: Math.floor(safeCount / 100) + 1,
    groupFillCount: remainder,
  };
};

export const getUserArenaState = async (defaultGroup: number = 1): Promise<UserArenaState> => {
  try {
    const mode = ((await AsyncStorage.getItem('growplay_arena_mode')) as ArenaParticipationMode) || 'group';
    const groupSaved = await AsyncStorage.getItem('growplay_arena_group');
    let groupNumber = groupSaved ? parseInt(groupSaved, 10) : defaultGroup;
    // Auto-migrate legacy placeholder #14 to start from Arena #1
    if (isNaN(groupNumber) || groupNumber === 14) {
      groupNumber = 1;
      await AsyncStorage.setItem('growplay_arena_group', '1');
    }
    const pref =
      ((await AsyncStorage.getItem(`growplay_next_season_pref_${getCurrentWeekId()}`)) as NextSeasonPreference) ||
      'stay';

    return {
      mode: mode === 'individual' ? 'individual' : 'group',
      groupNumber,
      nextSeasonPref: pref,
    };
  } catch (e) {
    return { mode: 'group', groupNumber: 1, nextSeasonPref: 'stay' };
  }
};

export const saveUserArenaPreference = async (
  preference: NextSeasonPreference,
  currentGroup: number,
  totalRegisteredTraders: number
): Promise<UserArenaState> => {
  const weekId = getCurrentWeekId();
  await AsyncStorage.setItem(`growplay_next_season_pref_${weekId}`, preference);

  if (preference === 'individual') {
    await AsyncStorage.setItem('growplay_arena_mode', 'individual');
    return {
      mode: 'individual',
      groupNumber: currentGroup,
      nextSeasonPref: 'individual',
    };
  } else if (preference === 'change') {
    // User wants to swap group:
    // Auto-fill into the lowest incomplete group (< 100 slots)
    const { openGroup } = calculateCohortAssignment(totalRegisteredTraders);
    const newGroup = openGroup === currentGroup ? openGroup + 1 : Math.max(1, openGroup);
    await AsyncStorage.setItem('growplay_arena_mode', 'group');
    await AsyncStorage.setItem('growplay_arena_group', newGroup.toString());
    return {
      mode: 'group',
      groupNumber: newGroup,
      nextSeasonPref: 'change',
    };
  } else {
    // 'stay' in current group
    await AsyncStorage.setItem('growplay_arena_mode', 'group');
    await AsyncStorage.setItem('growplay_arena_group', currentGroup.toString());
    return {
      mode: 'group',
      groupNumber: currentGroup,
      nextSeasonPref: 'stay',
    };
  }
};

// ─── Profile ───────────────────────────────────────────

export const getOrCreateProfile = async (userId: string, email: string) => {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) {
    // Email update karo agar missing hai
    if (!existing.email) {
      await supabase
        .from('profiles')
        .update({ email, last_active: new Date().toISOString().split('T')[0] })
        .eq('id', userId);
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: email.split('@')[0],
      email,
      virtual_balance: 1000000,
      xp: 0,
      streak: 0,
      avatar_id: null,
      last_active: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) console.log('Profile create error:', error);
  return data;
};

export const getProfile = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
};

export const updateAvatar = async (userId: string, avatarId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_id: avatarId })
    .eq('id', userId)
    .select()
    .single();

  if (error) console.log('Avatar update error:', error);
  return data;
};

export const updateXP = async (userId: string, xpToAdd: number) => {
  const profile = await getProfile(userId);
  if (!profile) return;

  const current = Math.max(0, profile.xp || 0);
  const newXP = Math.max(0, current + xpToAdd);

  const { data, error } = await supabase
    .from('profiles')
    .update({ xp: newXP })
    .eq('id', userId)
    .select()
    .single();

  if (error) console.log('XP update error:', error);
  return data;
};

// ─── Daily Login Streak Algorithm ──────────────────────

export interface DailyStreakResult {
  streak: number;
  updated: boolean;
  isIncrement: boolean;
  isNew: boolean;
  isReset: boolean;
  message: string;
}

/**
 * Get date string in YYYY-MM-DD using local time
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates absolute calendar days between two YYYY-MM-DD dates using UTC
 */
export const getDaysBetweenDates = (fromDateStr: string, toDateStr: string): number => {
  const [y1, m1, d1] = fromDateStr.split('-').map(Number);
  const [y2, m2, d2] = toDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((utc2 - utc1) / msPerDay);
};

/**
 * Daily Login Streak Algorithm:
 * - When user logs in or opens the app, checks the last active date.
 * - If already logged in today (diff === 0): streak maintained, no double increment.
 * - If logged in on consecutive day (diff === 1): streak incremented by +1!
 * - If missed 1 or more days (diff > 1): streak broken, reset to 1 (Day 1).
 * - If first time (no last active date or streak === 0): started at 1.
 * - Updates both local AsyncStorage and Supabase profiles table.
 */
export const syncDailyLoginStreak = async (userId?: string): Promise<DailyStreakResult> => {
  try {
    const today = getLocalDateString(new Date());

    // 1. Fetch locally stored streak and last active date
    const storedStreakStr = await AsyncStorage.getItem('streak');
    const storedLastDate = await AsyncStorage.getItem('growplay_last_active_date');
    let currentStreak = storedStreakStr ? Math.max(0, parseInt(storedStreakStr) || 0) : 0;
    let lastActiveDate = storedLastDate || null;

    // 2. Fetch authoritative Supabase profile data if user is logged in
    let profile: any = null;
    if (userId) {
      profile = await getProfile(userId);
      if (profile) {
        if (profile.streak !== undefined && profile.streak !== null) {
          currentStreak = Math.max(currentStreak, profile.streak);
        }
        if (profile.last_active) {
          lastActiveDate = lastActiveDate || profile.last_active;
        }
      }
    }

    let newStreak = currentStreak;
    let isIncrement = false;
    let isNew = false;
    let isReset = false;
    let updated = false;
    let message = '';

    if (!lastActiveDate || currentStreak === 0) {
      // First day login or fresh start
      newStreak = 1;
      isNew = true;
      updated = true;
      message = 'Welcome! Daily streak started at 1 Day 🔥';
    } else {
      const dayDiff = getDaysBetweenDates(lastActiveDate, today);

      if (dayDiff === 0) {
        // Already recorded today!
        newStreak = Math.max(1, currentStreak);
        updated = false;
        message = `Streak active today: ${newStreak} Days 🔥`;
      } else if (dayDiff === 1) {
        // Consecutive daily login!
        newStreak = currentStreak + 1;
        isIncrement = true;
        updated = true;
        message = `Daily streak increased! You are on a ${newStreak}-day streak 🔥`;
      } else if (dayDiff > 1) {
        // Missed at least 1 day -> reset to 1
        newStreak = 1;
        isReset = true;
        updated = true;
        message = `Previous streak expired. Fresh streak started at 1 Day ⚡`;
      } else {
        // Date anomaly (device clock jumped back)
        newStreak = Math.max(1, currentStreak);
        updated = false;
        message = `Streak active: ${newStreak} Days`;
      }
    }

    // Save to AsyncStorage
    await AsyncStorage.setItem('streak', newStreak.toString());
    await AsyncStorage.setItem('growplay_last_active_date', today);

    // Save to Supabase profile if userId provided
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          streak: newStreak,
          last_active: today,
        })
        .eq('id', userId);
    }

    return {
      streak: newStreak,
      updated,
      isIncrement,
      isNew,
      isReset,
      message,
    };
  } catch (e) {
    console.error('Error syncing daily login streak:', e);
    return {
      streak: 1,
      updated: false,
      isIncrement: false,
      isNew: false,
      isReset: false,
      message: 'Streak active',
    };
  }
};

// ─── Trades ───────────────────────────────────────────

export const placeTrade = async (
  userId: string,
  symbol: string,
  tradeType: 'BUY' | 'SELL',
  quantity: number,
  price: number
) => {
  const total = quantity * price;
  const profile = await getProfile(userId);
  if (!profile) return { error: 'Profile not found' };

  if (tradeType === 'BUY' && profile.virtual_balance < total) {
    return { error: 'Insufficient balance' };
  }

  // Record trade
  const { error: tradeError } = await supabase.from('trades').insert({
    user_id: userId,
    symbol,
    trade_type: tradeType,
    quantity,
    price,
    total,
  });

  if (tradeError) return { error: tradeError.message };

  // Update holdings
  if (tradeType === 'BUY') {
    const { data: existing } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .single();

    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg = ((existing.avg_buy_price * existing.quantity) + total) / newQty;
      await supabase
        .from('holdings')
        .update({ quantity: newQty, avg_buy_price: newAvg })
        .eq('id', existing.id);
    } else {
      await supabase.from('holdings').insert({
        user_id: userId,
        symbol,
        quantity,
        avg_buy_price: price,
      });
    }

    // Deduct balance
    await supabase
      .from('profiles')
      .update({ virtual_balance: profile.virtual_balance - total })
      .eq('id', userId);

  } else {
    // SELL
    const { data: holding } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .single();

    if (!holding || holding.quantity < quantity) {
      return { error: 'Not enough shares to sell' };
    }

    if (holding.quantity === quantity) {
      await supabase.from('holdings').delete().eq('id', holding.id);
    } else {
      await supabase
        .from('holdings')
        .update({ quantity: holding.quantity - quantity })
        .eq('id', holding.id);
    }

    // Add balance
    await supabase
      .from('profiles')
      .update({ virtual_balance: profile.virtual_balance + total })
      .eq('id', userId);

    // Realized P&L calculate karo aur weekly bucket mein add karo
    const pnl = (price - holding.avg_buy_price) * quantity;
    await recordWeeklyTradePnl(pnl);

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('total_pnl, xp')
      .eq('id', userId)
      .single();

    if (currentProfile) {
      const newPnl = (currentProfile.total_pnl ?? 0) + pnl;
      // XP individual trade pe fluctuate nahi hota.
      // Net weekly performance ke hisaab se League arena mein dynamically compute hota hai.
      await supabase
        .from('profiles')
        .update({
          total_pnl: newPnl,
        })
        .eq('id', userId);
    }
  }

  return { success: true };
};

// ─── Holdings ───────────────────────────────────────────

export const getHoldings = async (userId: string) => {
  const { data } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);
  return data ?? [];
};

// ─── Lesson Progress ───────────────────────────────────

export const saveLessonProgress = async (
  userId: string,
  lessonId: string,
  score: number,
  xpEarned: number
) => {
  // Save lesson progress
  await supabase.from('lesson_progress').upsert({
    user_id: userId,
    lesson_id: lessonId,
    completed: true,
    score,
    completed_at: new Date().toISOString(),
  });

  // Update XP
  await updateXP(userId, xpEarned);
};

export const getLessonProgress = async (userId: string) => {
  const { data } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true);
  return data ?? [];
};

// ─── Leaderboard ───────────────────────────────────────

export const getLeaderboard = async () => {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, xp, total_pnl')
    .order('total_pnl', { ascending: false })
    .limit(50);
  return data ?? [];
};

// ─── User Feedback & Support Inbox ─────────────────────

export interface UserFeedback {
  id: string;
  user_id?: string;
  user_name: string;
  user_email?: string;
  message: string;
  category?: 'Bug' | 'Suggestion' | 'Question' | 'General';
  created_at: string;
  status: 'unread' | 'reviewed' | 'resolved';
}

export const submitUserFeedback = async (
  message: string,
  user?: { id?: string; name?: string; email?: string },
  category?: 'Bug' | 'Suggestion' | 'Question' | 'General'
): Promise<{ success: boolean; error?: string }> => {
  const newFeedback: UserFeedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: user?.id || 'guest',
    user_name: user?.name || 'Anonymous Trader',
    user_email: user?.email || '',
    message: message.trim(),
    category: category || 'General',
    created_at: new Date().toISOString(),
    status: 'unread',
  };

  try {
    // 1. Save to Supabase if table exists
    try {
      await supabase.from('feedbacks').insert({
        id: newFeedback.id,
        user_id: newFeedback.user_id !== 'guest' ? newFeedback.user_id : null,
        user_name: newFeedback.user_name,
        user_email: newFeedback.user_email,
        message: newFeedback.message,
        category: newFeedback.category,
        created_at: newFeedback.created_at,
        status: newFeedback.status,
      });
    } catch (dbErr) {
      console.log('Supabase feedback insert optional fallback:', dbErr);
    }

    // 2. Always persist in AsyncStorage so admin sees it directly
    const existingRaw = await AsyncStorage.getItem('growplay_user_feedbacks');
    const existingList: UserFeedback[] = existingRaw ? JSON.parse(existingRaw) : [];
    existingList.unshift(newFeedback);
    await AsyncStorage.setItem('growplay_user_feedbacks', JSON.stringify(existingList));

    return { success: true };
  } catch (err: any) {
    console.error('Error submitting feedback:', err);
    return { success: false, error: err.message };
  }
};

export const getStoredFeedbacks = async (): Promise<UserFeedback[]> => {
  try {
    // Attempt remote fetch from Supabase if table exists
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0 && !error) {
        // Merge with local storage
        const existingRaw = await AsyncStorage.getItem('growplay_user_feedbacks');
        const localList: UserFeedback[] = existingRaw ? JSON.parse(existingRaw) : [];
        const mergedMap = new Map<string, UserFeedback>();
        data.forEach((item: any) => mergedMap.set(item.id, item));
        localList.forEach((item: any) => {
          if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
        });
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        await AsyncStorage.setItem('growplay_user_feedbacks', JSON.stringify(merged));
        return merged;
      }
    } catch {
      // ignore
    }

    const existingRaw = await AsyncStorage.getItem('growplay_user_feedbacks');
    return existingRaw ? JSON.parse(existingRaw) : [];
  } catch {
    return [];
  }
};

export const updateFeedbackStatus = async (
  feedbackId: string,
  status: 'unread' | 'reviewed' | 'resolved'
): Promise<void> => {
  try {
    try {
      await supabase.from('feedbacks').update({ status }).eq('id', feedbackId);
    } catch {
      // ignore
    }
    const existingRaw = await AsyncStorage.getItem('growplay_user_feedbacks');
    if (existingRaw) {
      const list: UserFeedback[] = JSON.parse(existingRaw);
      const updated = list.map((fb) => (fb.id === feedbackId ? { ...fb, status } : fb));
      await AsyncStorage.setItem('growplay_user_feedbacks', JSON.stringify(updated));
    }
  } catch (err) {
    console.log('Error updating feedback status:', err);
  }
};

export const deleteStoredFeedback = async (feedbackId: string): Promise<void> => {
  try {
    try {
      await supabase.from('feedbacks').delete().eq('id', feedbackId);
    } catch {
      // ignore
    }
    const existingRaw = await AsyncStorage.getItem('growplay_user_feedbacks');
    if (existingRaw) {
      const list: UserFeedback[] = JSON.parse(existingRaw);
      const updated = list.filter((fb) => fb.id !== feedbackId);
      await AsyncStorage.setItem('growplay_user_feedbacks', JSON.stringify(updated));
    }
  } catch (err) {
    console.log('Error deleting feedback:', err);
  }
};

export const clearResolvedFeedbacks = async (): Promise<void> => {
  try {
    try {
      await supabase.from('feedbacks').delete().eq('status', 'resolved');
    } catch {
      // ignore
    }
    const existingRaw = await AsyncStorage.getItem('growplay_user_feedbacks');
    if (existingRaw) {
      const list: UserFeedback[] = JSON.parse(existingRaw);
      const updated = list.filter((fb) => fb.status !== 'resolved');
      await AsyncStorage.setItem('growplay_user_feedbacks', JSON.stringify(updated));
    }
  } catch (err) {
    console.log('Error clearing resolved feedback:', err);
  }
};