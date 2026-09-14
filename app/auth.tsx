import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile, syncDailyLoginStreak } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const profile = await getOrCreateProfile(data.user.id, email);
          await syncDailyLoginStreak(data.user.id);

          if (profile?.username) {
            await AsyncStorage.setItem('username', profile.username);
          }
          if (profile?.avatar_url) {
            await AsyncStorage.setItem('avatar_id', profile.avatar_url);
          }
        }
        // Directly enter dashboard!
        router.replace('/(tabs)');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          // If already registered in auth, sign in directly and go to dashboard
          if (error.message.toLowerCase().includes('already registered')) {
            const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
            if (!loginErr && loginData.user) {
              const profile = await getOrCreateProfile(loginData.user.id, email);
              await syncDailyLoginStreak(loginData.user.id);
              if (profile?.username) {
                await AsyncStorage.setItem('username', profile.username);
              }
              if (profile?.avatar_url) {
                await AsyncStorage.setItem('avatar_id', profile.avatar_url);
              }
              router.replace('/(tabs)');
              return;
            }
          }
          throw error;
        }

        // Auto sign in to guarantee active session
        if (!data.session) {
          try {
            await supabase.auth.signInWithPassword({ email, password });
          } catch {
            // Email confirmation might be required
          }
        }

        if (data.user) {
          await getOrCreateProfile(data.user.id, email);
          await syncDailyLoginStreak(data.user.id);
        }

        Alert.alert(
          'Account Created! 🎉',
          'You can now login with this email and password anytime.',
          [
            {
              text: 'Set Username (Optional)',
              onPress: () => router.replace('/username'),
            },
            {
              text: 'Go to Dashboard →',
              style: 'default',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleRequestReset = async () => {
    const targetEmail = forgotEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail);
      if (error) throw error;
      setForgotMessage(
        '✉️ Password reset instructions sent! Check your email inbox (and spam folder) for the reset link or 8-digit recovery code.'
      );
      setForgotStep('verify');
    } catch (e: any) {
      setForgotError(e.message || 'Failed to dispatch reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (!otpCode.trim()) {
      setForgotError('Please enter the 8-digit recovery code from your email.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('New passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: otpCode.trim(),
        type: 'recovery',
      });
      if (error) throw error;

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      Alert.alert(
        'Password Reset Successful! 🎉',
        'Your password has been updated. You can now log in securely with your new password.',
        [
          {
            text: 'Log In Now',
            onPress: () => {
              setPassword(newPassword);
              setEmail(forgotEmail.trim());
              setShowForgotModal(false);
              setOtpCode('');
              setNewPassword('');
              setConfirmNewPassword('');
            },
          },
        ]
      );
    } catch (e: any) {
      setForgotError(e.message || 'Invalid or expired code. Please check your email or request a new code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSkip = () => router.replace('/(tabs)');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.appName}>GrowPlay</Text>
          <Text style={styles.tagline}>Welcome to the future of wealth.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Tab Toggle */}
          <View style={styles.tabRow}>
            <TouchableOpacity style={styles.tabBtn} onPress={() => setIsLogin(true)}>
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Log In</Text>
              {isLogin && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => setIsLogin(false)}>
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Sign Up</Text>
              {!isLogin && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#555" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#444"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {!isLogin && (
            <Text style={styles.emailRewardNote}>
              🎁 Ensure you enter your correct email — exciting rewards are coming in the future!
            </Text>
          )}

          {/* Password */}
          <View style={styles.passwordRow}>
            <Text style={styles.inputLabel}>Password</Text>
            {isLogin && (
              <TouchableOpacity
                onPress={() => {
                  setForgotEmail(email);
                  setForgotError('');
                  setForgotMessage('');
                  setForgotStep('request');
                  setShowForgotModal(true);
                }}
              >
                <Text style={styles.forgotText}>Forgot?</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#444"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Auth Button */}
          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.authButtonText}>
              {loading ? 'Please wait...' : isLogin ? 'Log In Securely' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* OR Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest */}
          <TouchableOpacity style={styles.guestButton} onPress={handleSkip}>
            <Ionicons name="person-outline" size={18} color="#888" />
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>

        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/terms')}>Terms</Text>
          <Text style={styles.termsText}> and </Text>
          <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
          <Text style={styles.termsText}>.</Text>
        </Text>

      </KeyboardAvoidingView>

      {/* FORGOT PASSWORD MODAL */}
      <Modal visible={showForgotModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.keyIconCircle}>
                  <Ionicons name="key" size={20} color="#00C853" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {forgotStep === 'request' ? 'Reset Password 🔑' : 'Verify Recovery Code 📩'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {forgotStep === 'request'
                      ? "We'll send recovery instructions to your email."
                      : 'Enter the code from your email to set a new password.'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowForgotModal(false)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Error & Message Banners */}
              {forgotError ? (
                <View style={styles.forgotErrorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#ff4444" />
                  <Text style={styles.forgotErrorText}>{forgotError}</Text>
                </View>
              ) : null}

              {forgotMessage ? (
                <View style={styles.forgotSuccessBanner}>
                  <Ionicons name="mail" size={16} color="#00C853" />
                  <Text style={styles.forgotSuccessText}>{forgotMessage}</Text>
                </View>
              ) : null}

              {forgotStep === 'request' ? (
                /* STEP 1: REQUEST RESET */
                <View style={styles.stepContainer}>
                  <Text style={styles.modalInputLabel}>REGISTERED EMAIL ADDRESS</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#555" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor="#444"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.authButton, forgotLoading && styles.authButtonDisabled]}
                    onPress={handleRequestReset}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.authButtonText}>Send Reset Link & OTP ✉️</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.switchStepBtn}
                    onPress={() => {
                      setForgotError('');
                      setForgotStep('verify');
                    }}
                  >
                    <Text style={styles.switchStepText}>
                      Already have a recovery OTP? <Text style={{ color: '#00C853', fontWeight: 'bold' }}>Enter Code →</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* STEP 2: ENTER OTP & NEW PASSWORD */
                <View style={styles.stepContainer}>
                  <Text style={styles.modalInputLabel}>EMAIL ADDRESS</Text>
                  <View style={[styles.inputWrapper, { opacity: 0.7 }]}>
                    <Ionicons name="mail-outline" size={18} color="#555" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <Text style={styles.modalInputLabel}>8-DIGIT RECOVERY OTP</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="shield-outline" size={18} color="#555" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { letterSpacing: 4, fontWeight: 'bold' }]}
                      placeholder="12345678"
                      placeholderTextColor="#444"
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={8}
                    />
                  </View>

                  <Text style={styles.modalInputLabel}>NEW PASSWORD</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#444"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPass}
                    />
                    <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                      <Ionicons name={showNewPass ? 'eye-outline' : 'eye-off-outline'} size={18} color="#555" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalInputLabel}>CONFIRM NEW PASSWORD</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#444"
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry={!showNewPass}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.authButton, forgotLoading && styles.authButtonDisabled]}
                    onPress={handleVerifyAndReset}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.authButtonText}>Update Password & Unlock 🚀</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.switchStepBtn}
                    onPress={() => {
                      setForgotError('');
                      setForgotStep('request');
                    }}
                  >
                    <Text style={styles.switchStepText}>
                      ← <Text style={{ color: '#00C853', fontWeight: 'bold' }}>Resend email or change address</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060606',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tabBtn: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00C853',
    borderRadius: 1,
  },
  inputLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  emailRewardNote: {
    color: '#00E676',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 14,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotText: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: '#ff4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#00C853',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222',
  },
  dividerText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  guestText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  termsText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#00C853',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#262626',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitleRow: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  keyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00C85315',
    borderWidth: 1,
    borderColor: '#00C85340',
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 16,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInputLabel: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  stepContainer: {
    marginTop: 8,
  },
  forgotErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff444415',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff444435',
    marginBottom: 14,
    gap: 8,
  },
  forgotErrorText: {
    color: '#ff6666',
    fontSize: 12,
    flex: 1,
  },
  forgotSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C85315',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00C85335',
    marginBottom: 14,
    gap: 8,
  },
  forgotSuccessText: {
    color: '#00C853',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  switchStepBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchStepText: {
    color: '#888',
    fontSize: 13,
  },
});