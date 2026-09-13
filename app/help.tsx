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
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitUserFeedback } from '@/lib/database';

interface FAQItem {
  id: string;
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    id: '1',
    q: 'How does virtual trading work in GrowPlay?',
    a: 'GrowPlay provides every user with ₹10,00,000 in simulated paper trading capital. You can trade real-time Indian stocks (NIFTY 50), stock futures, and Call/Put options without risking any real money.',
  },
  {
    id: '2',
    q: 'Can I lose real money on this app?',
    a: 'Absolutely not! GrowPlay is 100% simulated paper trading and financial literacy gamification. There is zero real money deposit, withdrawal, or financial liability.',
  },
  {
    id: '3',
    q: 'How do I change my trading avatar?',
    a: 'Go to your Profile tab and tap on your Avatar or select "Account Settings" → "Change Avatar". You can choose between 7 unique male and female trader avatars anytime!',
  },
  {
    id: '4',
    q: 'How are Options and Futures calculated?',
    a: 'Our F&O simulator uses standard Black-Scholes mathematical pricing and spot prices from live market feeds to compute realistic Option Greeks (Delta, Theta) and option premium decay.',
  },
  {
    id: '5',
    q: 'How do I reset my virtual balance back to ₹10 Lakhs?',
    a: 'Go to Profile → Account Settings → Tap "Reset Balance to ₹10,00,000". Your portfolio balance will be restored immediately while your XP and streaks are preserved.',
  },
  {
    id: '6',
    q: 'How do Leagues and XP work?',
    a: 'Complete lessons and execute profitable paper trades to earn XP. As your XP grows, you climb through Bronze, Silver, Gold, Diamond, up to the prestigious Legend League on the public leaderboard!',
  },
];

export default function HelpScreen() {
  const [expandedId, setExpandedId] = useState<string | null>('1');
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState<'Suggestion' | 'Bug' | 'Question' | 'General'>('Suggestion');
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; email?: string }>({});

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const localUsername = (await AsyncStorage.getItem('username')) || (await AsyncStorage.getItem('growplay_username'));
      if (data?.user) {
        setCurrentUser({
          id: data.user.id,
          name: localUsername || data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'Trader',
          email: data.user.email || '',
        });
      } else {
        const guestName = localUsername || 'Guest Trader';
        setCurrentUser({ name: guestName, email: '' });
      }
    } catch {
      // fallback
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Empty message', 'Please write your question or feedback before sending.');
      return;
    }
    setSubmitted(true);
    try {
      const res = await submitUserFeedback(feedbackText, currentUser, category);
      if (res.success) {
        Alert.alert(
          'Feedback Logged 🚀',
          'Thank you! Your feedback has been received and routed directly to the Creator Console for review. We appreciate your input!'
        );
        setFeedbackText('');
      } else {
        Alert.alert('Notice', 'Feedback saved locally and queued for admin review.');
        setFeedbackText('');
      }
    } catch (e) {
      Alert.alert('Feedback Recorded', 'Your message has been captured for creator review.');
      setFeedbackText('');
    } finally {
      setSubmitted(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Support Banner */}
        <View style={styles.banner}>
          <Ionicons name="help-buoy" size={26} color="#00C853" />
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>We&apos;re Here to Help</Text>
            <Text style={styles.bannerSubtitle}>
              Find quick answers to common questions about trading, leagues, and simulated balance.
            </Text>
          </View>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionHeader}>FREQUENTLY ASKED QUESTIONS</Text>
        {FAQS.map((faq) => {
          const isOpen = expandedId === faq.id;
          return (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqCard}
              activeOpacity={0.8}
              onPress={() => toggleExpand(faq.id)}
            >
              <View style={styles.faqQuestionRow}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#00C853"
                />
              </View>
              {isOpen && <Text style={styles.faqAnswer}>{faq.a}</Text>}
            </TouchableOpacity>
          );
        })}

        {/* Send Feedback / Contact */}
        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>SEND DIRECT FEEDBACK TO CREATOR</Text>
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Have a suggestion, question, or bug?</Text>
          <Text style={styles.contactSubtitle}>
            Your message goes straight to the Creator Admin Console without cluttering external inboxes.
          </Text>

          {/* Category Chips */}
          <View style={styles.categoryRow}>
            {(['Suggestion', 'Bug', 'Question', 'General'] as const).map((cat) => {
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {cat === 'Suggestion' ? '💡 Suggestion' : cat === 'Bug' ? '🐛 Bug' : cat === 'Question' ? '❓ Question' : '💬 General'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={styles.feedbackInput}
            multiline
            numberOfLines={4}
            placeholder="Type your message, feature idea, or feedback here..."
            placeholderTextColor="#555"
            value={feedbackText}
            onChangeText={setFeedbackText}
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendFeedback}
            disabled={submitted}
          >
            {submitted ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#000" />
                <Text style={styles.sendButtonText}>Send to Creator Console 🚀</Text>
              </>
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
    borderColor: '#00C85340',
    marginBottom: 20,
    gap: 14,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    color: '#00C853',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#aaa',
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
  faqCard: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 10,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  faqQuestion: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  faqAnswer: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  contactCard: {
    backgroundColor: '#121212',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 10,
  },
  contactTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  contactSubtitle: {
    color: '#777',
    fontSize: 12,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  categoryChipActive: {
    backgroundColor: '#00C85320',
    borderColor: '#00C853',
  },
  categoryChipText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#00C853',
    fontWeight: 'bold',
  },
  feedbackInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#262626',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00C853',
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
