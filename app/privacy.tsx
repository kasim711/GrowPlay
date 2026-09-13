import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Privacy Highlight Card */}
        <View style={styles.highlightCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={24} color="#00C853" />
          </View>
          <View style={styles.highlightTextCol}>
            <Text style={styles.highlightTitle}>Your Privacy Comes First</Text>
            <Text style={styles.highlightSubtitle}>
              We do not sell your personal data. We will never ask for your real bank account, Demat credentials, or Aadhaar.
            </Text>
          </View>
        </View>

        <Text style={styles.effectiveDate}>Last Updated: September 2026 • GrowPlay Security</Text>

        {/* Section 1 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. What Information We Collect</Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Account Data:</Text> When you register, we collect your email address and chosen username.
          </Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Simulator Profile:</Text> Selected trading avatar (e.g. Bull King, Phoenix Rise), streak records, and experience points (XP).
          </Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Paper Trading Activity:</Text> Simulated buy/sell orders, mock holdings, and interactive lesson quiz completions.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
          <Text style={styles.paragraph}>
            • To maintain and sync your virtual portfolio across devices.
          </Text>
          <Text style={styles.paragraph}>
            • To compute league standings and display your avatar/username on the competitive leaderboard.
          </Text>
          <Text style={styles.paragraph}>
            • To track educational milestones and recommend personalized finance modules.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Storage & Data Security</Text>
          <Text style={styles.paragraph}>
            All user data is stored in modern cloud infrastructure utilizing Supabase, guarded by Row Level Security (RLS) policies. All communication between your mobile client and our servers is secured with TLS/SSL encryption.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Third-Party Integrations</Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Twelve Data API:</Text> Used to retrieve stock market price quotes. No personal user information is transmitted to market data providers.
          </Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Supabase Auth:</Text> Provides token-based encrypted session management.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5. User Rights & Data Deletion</Text>
          <Text style={styles.paragraph}>
            You have the right at any time to:
          </Text>
          <Text style={styles.paragraph}>
            • Update or modify your username and trading avatar.
          </Text>
          <Text style={styles.paragraph}>
            • Clear local cache and reset virtual simulator portfolio data.
          </Text>
          <Text style={styles.paragraph}>
            • Request permanent deletion of your profile and history by contacting support.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>6. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about this policy or our data practices, please email our privacy team at upthrivetechnologies@gmail.com.
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
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c2415',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00C85340',
    marginBottom: 16,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C85320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextCol: {
    flex: 1,
  },
  highlightTitle: {
    color: '#00C853',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  highlightSubtitle: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 17,
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
    marginBottom: 6,
  },
  bold: {
    color: '#ddd',
    fontWeight: '600',
  },
});
