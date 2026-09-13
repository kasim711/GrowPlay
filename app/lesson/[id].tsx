import { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LESSONS } from '../(tabs)/learn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { saveLessonProgress } from '@/lib/database';

export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = LESSONS.find(l => l.id === id);

  const [phase, setPhase] = useState<'lesson' | 'quiz'>('lesson');
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const scoreRef = useRef(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        Alert.alert(
          'Login Required 🎓',
          'You must be logged in to participate in lessons and earn XP.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            { text: 'Login / Sign Up 🚀', onPress: () => router.replace('/auth' as any) },
          ]
        );
      }
    };
    checkAuth();
  }, []);

  if (!lesson) return null;

  const question = lesson.quiz[currentQ];

  const handleAnswer = (index: number) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    if (index === question.correct) {
      scoreRef.current += 1;
    }
  };

  const handleNext = async () => {
    if (currentQ < lesson.quiz.length - 1) {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      const total = scoreRef.current;
      const passingScore = Math.ceil(lesson.quiz.length * 0.7);
      const passed = total >= passingScore;

      const saved = await AsyncStorage.getItem('completed_lessons');
      const completed: string[] = saved ? JSON.parse(saved) : [];
      const isAlreadyCompleted = completed.includes(id as string);

      Alert.alert(
        passed ? (isAlreadyCompleted ? '📖 Lesson Reviewed!' : '🎉 Lesson Complete!') : '😅 Keep Practicing!',
        passed
          ? isAlreadyCompleted
            ? `Great review! You scored ${total}/${lesson.quiz.length}. (XP already claimed previously)`
            : `Great job! You scored ${total}/${lesson.quiz.length} and earned ⚡ ${lesson.xp} XP!`
          : `You scored ${total}/${lesson.quiz.length}. You need at least ${passingScore} correct to pass. Review the lesson and try again!`,
        [{
          text: passed ? 'Awesome!' : 'Review Lesson',
          onPress: async () => {
            if (passed) {
              if (!isAlreadyCompleted) {
                completed.push(id as string);
                await AsyncStorage.setItem('completed_lessons', JSON.stringify(completed));

                // XP AsyncStorage mein save karo
                const savedXP = await AsyncStorage.getItem('total_xp');
                const currentXP = savedXP ? Math.max(0, parseInt(savedXP) || 0) : 0;
                await AsyncStorage.setItem('total_xp', (currentXP + lesson.xp).toString());

                // Supabase mein save karo agar logged in hai
                const { data } = await supabase.auth.getUser();
                if (data?.user) {
                  await saveLessonProgress(data.user.id, id as string, total, lesson.xp);
                }
              }

              scoreRef.current = 0;
              router.back();
            } else {
              scoreRef.current = 0;
              setCurrentQ(0);
              setSelected(null);
              setAnswered(false);
              setPhase('lesson');
            }
          }
        }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { flexShrink: 0 }]}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{lesson.emoji} {lesson.title}</Text>
        <View style={[styles.xpBadge, { flexShrink: 0 }]}>
          <Text style={styles.xpText}>⚡{lesson.xp}</Text>
        </View>
      </View>

      {phase === 'lesson' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.contentCard}>
            <Text style={styles.content}>{lesson.content}</Text>
          </View>
          <TouchableOpacity
            style={styles.quizButton}
            onPress={() => setPhase('quiz')}
          >
            <Text style={styles.quizButtonText} numberOfLines={1} adjustsFontSizeToFit>Take Quiz → Earn ⚡{lesson.xp} XP</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>

      ) : (
        <View style={styles.quizContainer}>

          <Text style={styles.questionCount}>
            Question {currentQ + 1} of {lesson.quiz.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentQ + 1) / lesson.quiz.length) * 100}%` }]} />
          </View>

          <Text style={styles.question}>{question.question}</Text>

          <View style={styles.options}>
            {question.options.map((option, index) => {
              let optionStyle = styles.option;
              let textStyle = styles.optionText;

              if (answered) {
                if (index === question.correct) {
                  optionStyle = { ...styles.option, ...styles.optionCorrect };
                  textStyle = { ...styles.optionText, color: '#fff' };
                } else if (index === selected && index !== question.correct) {
                  optionStyle = { ...styles.option, ...styles.optionWrong };
                  textStyle = { ...styles.optionText, color: '#fff' };
                }
              } else if (selected === index) {
                optionStyle = { ...styles.option, ...styles.optionSelected };
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={optionStyle}
                  onPress={() => handleAnswer(index)}
                  disabled={answered}
                >
                  <Text style={textStyle}>{option}</Text>
                  {answered && index === question.correct && (
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  )}
                  {answered && index === selected && index !== question.correct && (
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {answered && (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentQ < lesson.quiz.length - 1 ? 'Next Question →' : 'Finish Quiz 🎉'}
              </Text>
            </TouchableOpacity>
          )}

        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  xpBadge: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00C853',
  },
  xpText: {
    color: '#00C853',
    fontWeight: 'bold',
    fontSize: 12,
  },
  contentCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  content: {
    color: '#eee',
    fontSize: 15,
    lineHeight: 25,
  },
  quizButton: {
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  quizButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  quizContainer: {
    flex: 1,
    paddingTop: 8,
  },
  questionCount: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    marginBottom: 28,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#00C853',
    borderRadius: 3,
  },
  question: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
    marginBottom: 24,
  },
  options: {
    gap: 12,
  },
  option: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#00C853',
    backgroundColor: '#0d2818',
  },
  optionCorrect: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  optionWrong: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  optionText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  nextButton: {
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});