import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image, ActivityIndicator,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, StatusBar, Modal, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../utils/toast';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark:   '#3E2C23',
  saddle: '#8B4513',
  gold:   '#DAA520',
  cream:  '#FDF5E6',
  bg:     '#F5F0E8',
  white:  '#FFFFFF',
  muted:  '#A89070',
  red:    '#E74C3C',
};

// ── Login loading overlay ────────────────────────────────────────────────────
const STEPS = [
  { label: 'Verifying credentials', threshold: 30 },
  { label: 'Securing your session', threshold: 65 },
  { label: 'Loading your profile',  threshold: 90 },
];

function LoginLoadingOverlay({ visible, userName }) {
  const logoSpin = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!visible) {
      fadeAnim.setValue(0);
      logoSpin.setValue(0);
      setPct(0);
      return;
    }

    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    Animated.loop(
      Animated.timing(logoSpin, { toValue: 1, duration: 1100, useNativeDriver: true })
    ).start();

    let current = 0;
    const interval = setInterval(() => {
      current += current < 30 ? 3.5 : current < 65 ? 2.5 : current < 90 ? 1.5 : 0.8;
      if (current >= 100) { current = 100; clearInterval(interval); }
      setPct(current);
    }, 60);

    return () => clearInterval(interval);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const spin = logoSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const roundPct = Math.min(Math.round(pct), 100);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <LinearGradient colors={[C.dark, C.saddle]} style={ls.inner}>
          <View style={ls.logoWrap}>
            <Animated.View style={[ls.logoRing, { transform: [{ rotate: spin }] }]} />
            <Image source={require('../../assets/logo.png')} style={ls.logo} resizeMode="contain" />
          </View>

          <Text style={ls.title}>Signing In</Text>
          {userName ? <Text style={ls.subtitle}>Welcome back, {userName}!</Text> : null}

          <View style={ls.barTrack}>
            <View style={[ls.barFill, { width: `${roundPct}%` }]} />
          </View>
          <Text style={ls.pct}>{roundPct}% complete</Text>

          <View style={ls.steps}>
            {STEPS.map((step, i) => {
              const done = roundPct >= step.threshold;
              return (
                <View key={i} style={ls.stepRow}>
                  <View style={[ls.stepDot, done && ls.stepDotDone]}>
                    {done
                      ? <Ionicons name="checkmark" size={10} color={C.white} />
                      : <View style={ls.stepDotInner} />
                    }
                  </View>
                  <Text style={[ls.stepText, done && ls.stepTextDone]}>{step.label}</Text>
                </View>
              );
            })}
          </View>

          <View style={ls.badge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={C.gold} />
            <Text style={ls.badgeText}>Secured Connection</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

// ── Login screen ─────────────────────────────────────────────────────────────
export default function Login({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [focusedField, setFocusedField]     = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayName, setOverlayName]       = useState('');

  const emailRef    = useRef(null);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (!email.trim())                      { showToast('error', 'Email Required',    'Please enter your email'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email))     { showToast('error', 'Invalid Email',     'Please enter a valid email'); return; }
    if (!password.trim())                   { showToast('error', 'Password Required', 'Please enter your password'); return; }
    if (password.length < 6)               { showToast('error', 'Too Short',          'Password must be at least 6 characters'); return; }

    setLoading(true);

    // Wake up Render server first (cold start can take 30-60s)
    try {
      await axios.get(`${API_BASE_URL}/health`, { timeout: 60000 });
    } catch (_) { /* ignore — proceed anyway */ }

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email: email.trim().toLowerCase(), password: password.trim() },
        { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
      );

      if (!data.success) throw new Error(data.message || 'Login failed');
      if (!data.token || !data.user) throw new Error('Invalid response format');

      await AsyncStorage.multiSet([
        ['userToken',       data.token],
        ['userData',        JSON.stringify(data.user)],
        ['isAuthenticated', 'true'],
        ['userId',          data.user.id.toString()],
        ['userType',        data.user.userType || 'user'],
      ]);

      const name = data.user.username || data.user.email || '';
      const dest = data.user.userType === 'admin' ? 'AdminDashboard' : 'Home';

      setLoading(false);
      setOverlayName(name);
      setOverlayVisible(true);

      setTimeout(() => {
        setOverlayVisible(false);
        navigation.reset({ index: 0, routes: [{ name: dest }] });
      }, 2800);

    } catch (e) {
      setLoading(false);
      const status = e.response?.status;
      const serverMsg = e.response?.data?.message;

      let title = 'Login Failed';
      let msg = 'Something went wrong. Please try again.';

      if (e.request && !e.response) {
        title = 'No Connection';
        msg = 'Server is waking up. Please wait 30 seconds and try again.';
      } else if (status === 400) {
        title = 'Invalid Credentials';
        msg = serverMsg || 'The email or password you entered is incorrect.';
      } else if (status === 403) {
        title = 'Email Not Verified';
        msg = serverMsg || 'Please verify your email address before logging in. Check your inbox for the verification link.';
      } else if (status === 404) {
        title = 'Account Not Found';
        msg = 'No account found with this email address. Please register first.';
      } else if (status === 429) {
        title = 'Too Many Attempts';
        msg = 'Too many login attempts. Please wait a moment before trying again.';
      } else if (status >= 500) {
        title = 'Server Error';
        msg = 'The server is currently unavailable. Please try again later.';
      } else if (serverMsg) {
        msg = serverMsg;
      }

      showToast('error', title, msg);
    }
  };

  const inputStyle = (name) => [s.inputWrap, focusedField === name && s.inputWrapFocused];

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle="light-content" backgroundColor={C.dark} />

        <LinearGradient colors={[C.dark, C.saddle, '#A0522D']} style={{ flex: 1 }} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
          <View style={[s.circle, s.circleTopRight]} />
          <View style={[s.circle, s.circleBottomLeft]} />

          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Landing')}>
              <Ionicons name="arrow-back" size={20} color={C.cream} />
            </TouchableOpacity>

            <View style={s.brandSection}>
              <View style={s.logoWrap}>
                <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
              </View>
              <Text style={s.brandName}>NOISEWATCH</Text>
              <Text style={s.brandSub}>Noise Disturbance Reporting & Monitoring</Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Sign In</Text>
              <Text style={s.cardSub}>Welcome back! Enter your credentials to continue.</Text>

              <Text style={s.label}>Email Address</Text>
              <View style={inputStyle('email')}>
                <Ionicons name="mail-outline" size={19} color={focusedField === 'email' ? C.saddle : C.muted} style={s.inputIcon} />
                <TextInput
                  ref={emailRef}
                  style={s.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#C4B49A"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                />
              </View>

              <Text style={s.label}>Password</Text>
              <View style={inputStyle('password')}>
                <Ionicons name="lock-closed-outline" size={19} color={focusedField === 'password' ? C.saddle : C.muted} style={s.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[s.input, { paddingRight: 40 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#C4B49A"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(v => !v)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.muted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.forgotWrap} onPress={() => showToast('info', 'Coming Soon', 'Password reset will be available soon.')}>
                <Text style={s.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={[C.saddle, C.dark]} style={s.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading
                    ? <ActivityIndicator color={C.white} size="small" />
                    : <><Text style={s.submitText}>Sign In</Text><Ionicons name="arrow-forward" size={18} color={C.white} /></>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <View style={s.footer}>
                <Text style={s.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={loading}>
                  <Text style={s.footerLink}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>

      <LoginLoadingOverlay visible={overlayVisible} userName={overlayName} />
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:           { flexGrow: 1, paddingHorizontal: 24, paddingTop: SB_HEIGHT + 16, paddingBottom: 40 },
  circle:           { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)' },
  circleTopRight:   { width: 260, height: 260, top: -80, right: -80 },
  circleBottomLeft: { width: 200, height: 200, bottom: 60, left: -80 },
  backBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  brandSection:     { alignItems: 'center', marginBottom: 32 },
  logoWrap:         { width: 88, height: 88, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.5)' },
  logo:             { width: 68, height: 68, borderRadius: 14 },
  brandName:        { fontSize: 24, fontWeight: '900', color: C.white, letterSpacing: 3, marginBottom: 4 },
  brandSub:         { fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center', letterSpacing: 0.3 },
  card:             { backgroundColor: C.white, borderRadius: 24, padding: 28, elevation: 12, shadowColor: C.dark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  cardTitle:        { fontSize: 22, fontWeight: '800', color: C.dark, marginBottom: 4 },
  cardSub:          { fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 18 },
  label:            { fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 7 },
  inputWrap:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: '#E8DDD0', paddingHorizontal: 14, height: 52, marginBottom: 18 },
  inputWrapFocused: { borderColor: C.saddle, backgroundColor: C.cream },
  inputIcon:        { marginRight: 10 },
  input:            { flex: 1, fontSize: 15, color: C.dark },
  eyeBtn:           { position: 'absolute', right: 14, padding: 4 },
  forgotWrap:       { alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 },
  forgotText:       { fontSize: 13, color: C.saddle, fontWeight: '600' },
  submitBtn:        { borderRadius: 14, overflow: 'hidden', marginBottom: 24, elevation: 4, shadowColor: C.saddle, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitGradient:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  submitText:       { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: 0.5 },
  footer:           { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText:       { fontSize: 14, color: C.muted },
  footerLink:       { fontSize: 14, fontWeight: '700', color: C.saddle },
});

const ls = StyleSheet.create({
  inner:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, paddingVertical: 60 },
  logoWrap:     { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 28, position: 'relative' },
  logoRing:     { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: C.gold, borderTopColor: 'transparent' },
  logo:         { width: 72, height: 72, borderRadius: 16 },
  title:        { fontSize: 24, fontWeight: '900', color: C.white, marginBottom: 6, letterSpacing: 1 },
  subtitle:     { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 32 },
  barTrack:     { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill:      { height: '100%', backgroundColor: C.gold, borderRadius: 4 },
  pct:          { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 28 },
  steps:        { width: '100%', gap: 12, marginBottom: 36 },
  stepRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot:      { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  stepDotDone:  { backgroundColor: C.gold, borderColor: C.gold },
  stepDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  stepText:     { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  stepTextDone: { color: C.white, fontWeight: '700' },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(218,165,32,0.3)' },
  badgeText:    { fontSize: 12, color: C.gold, fontWeight: '600' },
});
