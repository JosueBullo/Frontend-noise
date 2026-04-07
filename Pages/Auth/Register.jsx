import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image, ActivityIndicator,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { showToast } from '../../utils/toast';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark:   '#3E2C23',
  saddle: '#8B4513',
  mid:    '#654321',
  gold:   '#DAA520',
  cream:  '#FDF5E6',
  bg:     '#F5F0E8',
  white:  '#FFFFFF',
  sub:    '#8B7355',
  muted:  '#A89070',
  red:    '#E74C3C',
  green:  '#27AE60',
};

export default function Register({ navigation }) {
  const [username, setUsername]             = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto]     = useState(null);
  const [loading, setLoading]               = useState(false);
  const [showPw, setShowPw]                 = useState(false);
  const [showConfirmPw, setShowConfirmPw]   = useState(false);
  const [focusedField, setFocusedField]     = useState(null);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { showToast('error', 'Permission Denied', 'Camera roll access is required'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) setProfilePhoto(result.assets[0]);
    } catch { showToast('error', 'Image Error', 'Failed to select image. Please try again.'); }
  };

  const handleRegister = async () => {
    if (!profilePhoto)              { showToast('error', 'Photo Required',    'Please select a profile photo'); return; }
    if (!username.trim())           { showToast('error', 'Username Required', 'Please enter your username'); return; }
    if (username.trim().length < 2) { showToast('error', 'Invalid Username',  'Username must be at least 2 characters'); return; }
    if (!email.trim())              { showToast('error', 'Email Required',    'Please enter your email'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { showToast('error', 'Invalid Email', 'Please enter a valid email'); return; }
    if (!password.trim())           { showToast('error', 'Password Required', 'Please enter a password'); return; }
    if (password.length < 6)        { showToast('error', 'Too Short',         'Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { showToast('error', 'Mismatch',        "Passwords don't match"); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password.trim());
      formData.append('userType', 'user');
      formData.append('profilePhoto', { uri: profilePhoto.uri, type: 'image/jpeg', name: 'profile.jpg' });

      const { data } = await axios.post(`${API_BASE_URL}/auth/register`, formData, {
        headers: { Accept: 'application/json', 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      if (!data.user) throw new Error('Invalid response format');

      showToast('success', 'Account Created!', data.message || 'Please check your email to verify your account.');
      setTimeout(() => navigation.navigate('Login'), 2000);
    } catch (e) {
      const msg = e.response?.data?.message || (e.request ? 'Network error. Check your connection.' : e.message) || 'Registration failed';
      showToast('error', 'Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const togglePw        = useCallback(() => setShowPw(v => !v), []);
  const toggleConfirmPw = useCallback(() => setShowConfirmPw(v => !v), []);
  const field = (name) => [s.inputWrap, focusedField === name && s.inputWrapFocused];

  const pwMatch = confirmPassword.length > 0 && password === confirmPassword;
  const pwMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      <LinearGradient colors={[C.dark, C.saddle, '#A0522D']} style={s.bg} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>

        {/* Decorative circles */}
        <View style={[s.circle, s.circleTopRight]} />
        <View style={[s.circle, s.circleBottomLeft]} />

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.cream} />
          </TouchableOpacity>

          {/* Brand */}
          <View style={s.brandSection}>
            <View style={s.logoWrap}>
              <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
            </View>
            <Text style={s.brandName}>NOISEWATCH</Text>
            <Text style={s.brandSub}>Create your account to get started</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Create Account</Text>
            <Text style={s.cardSub}>Join the community and help monitor noise disturbances.</Text>

            {/* Avatar picker */}
            <TouchableOpacity style={s.avatarWrap} onPress={pickImage} activeOpacity={0.85}>
              <Image
                source={profilePhoto ? { uri: profilePhoto.uri } : require('../../assets/default-profile.png')}
                style={[s.avatar, !profilePhoto && s.avatarEmpty]}
                resizeMode="cover"
              />
              <View style={s.cameraBtn}>
                <Ionicons name="camera" size={16} color={C.white} />
              </View>
              <Text style={s.avatarHint}>{profilePhoto ? 'Tap to change photo' : 'Add profile photo *'}</Text>
            </TouchableOpacity>

            {/* Username */}
            <Text style={s.label}>Username <Text style={s.req}>*</Text></Text>
            <View style={field('username')}>
              <Ionicons name="person-outline" size={19} color={focusedField === 'username' ? C.saddle : C.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="your_username"
                placeholderTextColor="#C4B49A"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                editable={!loading}
              />
            </View>

            {/* Email */}
            <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
            <View style={field('email')}>
              <Ionicons name="mail-outline" size={19} color={focusedField === 'email' ? C.saddle : C.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor="#C4B49A"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
            <View style={field('password')}>
              <Ionicons name="lock-closed-outline" size={19} color={focusedField === 'password' ? C.saddle : C.muted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { paddingRight: 40 }]}
                placeholder="Min. 6 characters"
                placeholderTextColor="#C4B49A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                editable={!loading}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={togglePw}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <Text style={s.label}>Confirm Password <Text style={s.req}>*</Text></Text>
            <View style={[field('confirm'), pwMismatch && s.inputWrapError, pwMatch && s.inputWrapOk]}>
              <Ionicons name="checkmark-circle-outline" size={19} color={pwMatch ? C.green : focusedField === 'confirm' ? C.saddle : C.muted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { paddingRight: 40 }]}
                placeholder="Re-enter your password"
                placeholderTextColor="#C4B49A"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPw}
                autoCapitalize="none"
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                editable={!loading}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={toggleConfirmPw}>
                <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.muted} />
              </TouchableOpacity>
            </View>
            {pwMismatch && <Text style={s.errorHint}>Passwords do not match</Text>}
            {pwMatch    && <Text style={s.okHint}><Ionicons name="checkmark" size={12} /> Passwords match</Text>}

            {/* Terms */}
            <Text style={s.terms}>
              By creating an account, you agree to our{' '}
              <Text style={s.termsLink}>Terms of Service</Text> and{' '}
              <Text style={s.termsLink}>Privacy Policy</Text>.
            </Text>

            {/* Submit */}
            <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[C.saddle, C.dark]} style={s.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <><Text style={s.submitText}>Create Account</Text><Ionicons name="arrow-forward" size={18} color={C.white} /></>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
                <Text style={s.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bg:               { flex: 1 },
  scroll:           { flexGrow: 1, paddingHorizontal: 24, paddingTop: SB_HEIGHT + 16, paddingBottom: 40 },

  circle:           { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)' },
  circleTopRight:   { width: 260, height: 260, top: -80, right: -80 },
  circleBottomLeft: { width: 200, height: 200, bottom: 60, left: -80 },

  backBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },

  brandSection:     { alignItems: 'center', marginBottom: 28 },
  logoWrap:         { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: 'rgba(218,165,32,0.5)' },
  logo:             { width: 62, height: 62, borderRadius: 12 },
  brandName:        { fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: 3, marginBottom: 4 },
  brandSub:         { fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  card:             { backgroundColor: C.white, borderRadius: 24, padding: 26, elevation: 12, shadowColor: C.dark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  cardTitle:        { fontSize: 22, fontWeight: '800', color: C.dark, marginBottom: 4 },
  cardSub:          { fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 18 },

  // Avatar
  avatarWrap:       { alignItems: 'center', marginBottom: 22 },
  avatar:           { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: C.gold },
  avatarEmpty:      { borderColor: '#E8DDD0', borderStyle: 'dashed' },
  cameraBtn:        { position: 'absolute', bottom: 22, right: width / 2 - 57, width: 30, height: 30, borderRadius: 15, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.white },
  avatarHint:       { fontSize: 11, color: C.muted, marginTop: 6 },

  // Inputs
  label:            { fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 7 },
  req:              { color: C.red },
  inputWrap:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: '#E8DDD0', paddingHorizontal: 14, height: 52, marginBottom: 16 },
  inputWrapFocused: { borderColor: C.saddle, backgroundColor: C.cream },
  inputWrapError:   { borderColor: C.red, backgroundColor: '#FFF5F5' },
  inputWrapOk:      { borderColor: C.green, backgroundColor: '#F0FFF4' },
  inputIcon:        { marginRight: 10 },
  input:            { flex: 1, fontSize: 15, color: C.dark },
  eyeBtn:           { position: 'absolute', right: 14, padding: 4 },
  errorHint:        { fontSize: 12, color: C.red, marginTop: -10, marginBottom: 12, marginLeft: 4 },
  okHint:           { fontSize: 12, color: C.green, marginTop: -10, marginBottom: 12, marginLeft: 4, fontWeight: '600' },

  // Terms
  terms:            { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18, marginBottom: 22, marginTop: 4 },
  termsLink:        { color: C.saddle, fontWeight: '600' },

  // Submit
  submitBtn:        { borderRadius: 14, overflow: 'hidden', marginBottom: 22, elevation: 4, shadowColor: C.saddle, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitGradient:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  submitText:       { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: 0.5 },

  // Footer
  footer:           { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText:       { fontSize: 14, color: C.muted },
  footerLink:       { fontSize: 14, fontWeight: '700', color: C.saddle },
});
