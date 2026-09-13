import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Important Alert */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="alert-circle" size={24} color="#00C853" />
          <View style={styles.disclaimerTextCol}>
            <Text style={styles.disclaimerTitle}>STRICTLY EDUCATIONAL SIMULATION</Text>
            <Text style={styles.disclaimerSubtitle}>
              GrowPlay is purely a stock market simulation and financial literacy game. NO REAL MONEY, real securities, or actual financial transactions occur on this platform.
            </Text>
          </View>
        </View>

        <Text style={styles.effectiveDate}>Effective Date: September 12, 2026 • Version 1.2</Text>

        {/* Section 1 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By downloading, accessing, or using the GrowPlay mobile application (&quot;App&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Nature of Virtual Trading & Paper Currency</Text>
          <Text style={styles.paragraph}>
            The virtual balance of ₹10,00,000 provided in your account has zero commercial or cash value. It cannot be redeemed, withdrawn, transferred, or exchanged for fiat currency or real financial assets.
          </Text>
          <Text style={styles.paragraph}>
            Orders placed on GrowPlay (including Equity trades, Call/Put Options, and Futures contracts) are executed strictly in a sandbox simulation engine.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. No Financial Advice Disclaimer</Text>
          <Text style={styles.paragraph}>
            GrowPlay, its creators, and partners do NOT act as SEBI-registered investment advisors, portfolio managers, or brokers. All lessons, stock quotes, algorithmic calculations, and leaderboard rankings are intended solely for educational practice.
          </Text>
          <Text style={styles.paragraph}>
            Past simulation performance does NOT guarantee future real-world market gains. Always consult a certified financial advisor before risking real capital in live markets.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Market Data & Pricing Feeds</Text>
          <Text style={styles.paragraph}>
            Stock, index, and derivative prices are retrieved from market data APIs (including Twelve Data and public exchanges). While we endeavor to provide accurate delayed or real-time quotes, data may occasionally experience latency, calculation variance, or downtime.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5. Fair Play & Community Guidelines</Text>
          <Text style={styles.paragraph}>
            Traders compete in public leagues based on XP and simulated trading performance. You agree not to abuse system glitches, deploy automated trading bots to artificially manipulate XP leaderboards, or engage in toxic conduct.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>6. Intellectual Property & Modifications</Text>
          <Text style={styles.paragraph}>
            All game mechanics, avatar artwork, interactive lessons, algorithms, and interface design are proprietary to GrowPlay. We reserve the right to modify simulator mechanics or these Terms with advance in-app notice.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footerBox}>
          <Text style={styles.footerText}>
            Questions regarding our terms? Reach out to upthrivetechnologies@gmail.com
          </Text>
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
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0c2415',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00C85340',
    marginBottom: 16,
    gap: 12,
  },
  disclaimerTextCol: {
    flex: 1,
  },
  disclaimerTitle: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  disclaimerSubtitle: {
    color: '#bbb',
    fontSize: 12,
    lineHeight: 18,
  },
  effectiveDate: {
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#121212',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  paragraph: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  footerBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    color: '#555',
    fontSize: 12,
  },
});
