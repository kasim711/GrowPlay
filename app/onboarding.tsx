import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient, Stop, Rect, Line, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const AnimatedChart = () => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={chartStyles.container}>
      <Svg width="100%" height="200" viewBox="0 0 350 200">
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#00C853" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#00C853" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0d1a0d" stopOpacity="1" />
            <Stop offset="1" stopColor="#0a0a0a" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Rect width="350" height="200" fill="url(#bgGrad)" rx="16" />

        {/* Grid lines */}
        {[40, 80, 120, 160].map((y) => (
          <Line key={y} x1="20" y1={y} x2="330" y2={y} stroke="#1a2a1a" strokeWidth="1" />
        ))}

        {/* Chart fill */}
        <Path
          d="M20,160 C60,150 80,130 110,110 C140,90 160,95 190,75 C220,55 240,60 270,40 C290,28 310,20 330,10 L330,190 L20,190 Z"
          fill="url(#chartGrad)"
        />

        {/* Chart line */}
        <Path
          d="M20,160 C60,150 80,130 110,110 C140,90 160,95 190,75 C220,55 240,60 270,40 C290,28 310,20 330,10"
          fill="none"
          stroke="#00C853"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Dot at end */}
        <Circle cx="330" cy="10" r="5" fill="#00C853" />
        <Circle cx="330" cy="10" r="10" fill="#00C853" fillOpacity="0.3" />

        {/* Y axis labels */}
        {['₹80K', '₹60K', '₹40K', '₹20K'].map((label, i) => (
          <Text
            key={label}
            style={{
              position: 'absolute',
              left: 0,
              top: 30 + i * 40,
              color: '#2a4a2a',
              fontSize: 9,
            }}
          >
            {label}
          </Text>
        ))}
      </Svg>

      {/* Stats overlay */}
      <View style={chartStyles.statsRow}>
        <View style={chartStyles.statBadge}>
          <Text style={chartStyles.statValue}>+₹24.5K</Text>
          <Text style={chartStyles.statLabel}>Total Profit</Text>
        </View>
        <View style={chartStyles.statBadge}>
          <Text style={[chartStyles.statValue, { color: '#00C853' }]}>+12.4%</Text>
          <Text style={chartStyles.statLabel}>Returns</Text>
        </View>
      </View>
    </View>
  );
};

const chartStyles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a2a1a',
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#0d1a0d',
  },
  statBadge: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 8,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a2a1a',
  },
  statValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
});

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [level, setLevel] = useState('beginner');

  const handleNext = async () => {
    if (currentSlide === 0) {
      setCurrentSlide(1);
    } else {
      await AsyncStorage.setItem('onboarding_done', 'true');
      await AsyncStorage.setItem('user_level', level);
      router.replace('/auth');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Skip */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {currentSlide === 0 ? (
        // Slide 1 — Hero
        <View style={styles.slideContainer}>
          <Text style={styles.heroTitle}>Learn.{'\n'}Trade.{'\n'}Win.</Text>
          <Text style={styles.heroSubtitle}>
            Master the digital markets in a high-stakes, risk-free environment.
          </Text>
          <AnimatedChart />
        </View>
      ) : (
        // Slide 2 — Level Select
        <View style={styles.slideContainer}>
          <Text style={styles.levelTitle}>Select your level</Text>
          <Text style={styles.levelSubtitle}>We'll personalize your experience</Text>

          <View style={styles.optionsContainer}>
            {[
              { key: 'beginner', label: 'Beginner', desc: "I'm new to trading and want to learn.", icon: 'rocket-outline' },
              { key: 'intermediate', label: 'Intermediate', desc: 'I know the basics, looking to improve.', icon: 'trending-up-outline' },
              { key: 'expert', label: 'Expert', desc: "I'm a seasoned trader seeking edge.", icon: 'analytics-outline' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.levelOption, level === item.key && styles.levelOptionSelected]}
                onPress={() => setLevel(item.key)}
              >
                <View style={[styles.levelIcon, level === item.key && styles.levelIconSelected]}>
                  <Ionicons name={item.icon as any} size={22} color={level === item.key ? '#00C853' : '#888'} />
                </View>
                <View style={styles.levelText}>
                  <Text style={[styles.levelLabel, level === item.key && { color: '#00C853' }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.levelDesc}>{item.desc}</Text>
                </View>
                <View style={[styles.radio, level === item.key && styles.radioSelected]}>
                  {level === item.key && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Progress Lines */}
        <View style={styles.progressDots}>
          <View style={[styles.progressLine, { backgroundColor: '#00C853' }]} />
          <View style={[styles.progressLine, { backgroundColor: currentSlide >= 1 ? '#00C853' : '#222' }]} />
          <View style={[styles.progressLine, { backgroundColor: '#222' }]} />
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentSlide === 0 ? 'Next →' : 'Get Started →'}
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 24,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: '#555',
    fontSize: 15,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 60,
  },
  heroTitle: {
    color: '#00C853',
    fontSize: 52,
    fontWeight: 'bold',
    lineHeight: 58,
    marginBottom: 16,
  },
  heroSubtitle: {
    color: '#888',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  levelTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  levelSubtitle: {
    color: '#888',
    fontSize: 15,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    gap: 12,
  },
  levelOptionSelected: {
    borderColor: '#00C853',
    backgroundColor: '#0d1f0d',
  },
  levelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  levelIconSelected: {
    borderColor: '#00C853',
    backgroundColor: '#1a1a1a',
  },
  levelEmoji: {
    fontSize: 20,
  },
  levelText: {
    flex: 1,
  },
  levelLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  levelDesc: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#00C853',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00C853',
  },
  bottom: {
    paddingBottom: 32,
    gap: 20,
    alignItems: 'center',
  },
  progressDots: {
  flexDirection: 'row',
  gap: 6,
  alignItems: 'center',
  },
  progressLine: {
    height: 4,
    width: 60,
    borderRadius: 2,
  },
  nextButton: {
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});