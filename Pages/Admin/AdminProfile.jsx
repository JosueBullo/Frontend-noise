import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, StatusBar,
  Dimensions, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import API_BASE_URL from '../../utils/api';

const { height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark: '#3E2C23', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', bg: '#F5F0E8', white: '#FFFFFF',
  green: '#4CAF50', red: '#E74C3C', blue: '#2196F3', text: '#333333',
};

const getPasswordStrength = (pw) => {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak',   color: C.red,   width: '25%' };
  if (score <= 2) return { label: 'Fair',   color: '#F39C12', width: '50%' };
  if (score <= 3) return { label: 'Good',   color: C.blue,  width: '75%' };
  return              { label: 'Strong', color: C.green, width: '100%' };
};

export default function AdminProfile({ navigation }) {
  const [activeTab, setActiveTab]   = useState('profile');
  const [loading, setLoading]       = useState(true);
  const [profileData, setProfileData] = useState(null);

  const [editForm, setEditForm]     = useState({ username: '', email: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg]   = useState({ type: '', text: '' });

  const [pwForm, setPwForm]         = useState({ current: '', newPw: '', confirm: '' });
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwMsg, setPwMsg]           = useState({ type: '', text: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [imageUri, setImageUri]     = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarMsg, setAvatarMsg]   = useState({ type: '', text: '' });

  // ── Auth check ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const auth  = await AsyncStorage.getItem('isAuthenticated');
      const token = await AsyncStorage.getItem('userToken');
      const type  = await AsyncStorage.getItem('userType');
      if (auth !== 'true' || !token || type !== 'admin') {
        await AsyncStorage.multiRemove(['userToken','userData','isAuthenticated','userId','userType']);
        navigation.replace('Login');
      }
    })();
  }, [navigation]);

  // ── Fetch profile ────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) { navigation.replace('Login'); return; }
      const res = await axios.get(`${API_BASE_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const u = res.data.user;
        setProfileData(u);
        setEditForm({ username: u.username || '', email: u.email || '' });
        await AsyncStorage.setItem('userData', JSON.stringify(u));
      }
    } catch (e) {
      if (e.response?.status === 401) { navigation.replace('Login'); return; }
      const stored = await AsyncStorage.getItem('userData');
      if (stored) { const u = JSON.parse(stored); setProfileData(u); setEditForm({ username: u.username || '', email: u.email || '' }); }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update profile ───────────────────────────────────────────
  const handleProfileUpdate = async () => {
    setUpdateMsg({ type: '', text: '' });
    if (!editForm.username.trim() || editForm.username.trim().length < 3) { setUpdateMsg({ type: 'error', text: 'Username must be at least 3 characters.' }); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(editForm.username.trim())) { setUpdateMsg({ type: 'error', text: 'Username: letters, numbers, underscores only.' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) { setUpdateMsg({ type: 'error', text: 'Please enter a valid email.' }); return; }
    try {
      setIsUpdating(true);
      const token  = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      const formData = new FormData();
      formData.append('username', editForm.username.trim());
      formData.append('email', editForm.email.trim());
      if (profileData?.userType) formData.append('userType', profileData.userType);
      const res = await axios.put(`${API_BASE_URL}/user/update/${userId}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.user) {
        setProfileData(res.data.user);
        await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
        setUpdateMsg({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setUpdateMsg({ type: '', text: '' }), 4000);
      }
    } catch (e) { setUpdateMsg({ type: 'error', text: e.response?.data?.message || 'Failed to update profile.' }); }
    finally { setIsUpdating(false); }
  };

  // ── Change password ──────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwMsg({ type: '', text: '' });
    if (!pwForm.current) { setPwMsg({ type: 'error', text: 'Current password is required.' }); return; }
    if (pwForm.newPw.length < 8) { setPwMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (pwForm.current === pwForm.newPw) { setPwMsg({ type: 'error', text: 'New password must differ from current.' }); return; }
    try {
      setIsChangingPw(true);
      const token  = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      await axios.put(`${API_BASE_URL}/user/change-password/${userId}`, { currentPassword: pwForm.current, newPassword: pwForm.newPw }, { headers: { Authorization: `Bearer ${token}` } });
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwMsg({ type: '', text: '' }), 4000);
    } catch (e) { setPwMsg({ type: 'error', text: e.response?.data?.message || 'Failed to change password.' }); }
    finally { setIsChangingPw(false); }
  };

  // ── Avatar ───────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setImageUri(result.assets[0].uri);
  };

  const uploadAvatar = async () => {
    if (!imageUri) return;
    setAvatarMsg({ type: '', text: '' });
    try {
      setIsUploadingPhoto(true);
      const token  = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      const formData = new FormData();
      formData.append('profilePhoto', { uri: imageUri, type: 'image/jpeg', name: 'avatar.jpg' });
      if (profileData) { formData.append('username', profileData.username); formData.append('email', profileData.email); if (profileData.userType) formData.append('userType', profileData.userType); }
      const res = await axios.put(`${API_BASE_URL}/user/update/${userId}`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      if (res.data.user) {
        setProfileData(res.data.user);
        await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
        setImageUri(null);
        setAvatarMsg({ type: 'success', text: 'Profile photo updated!' });
        setTimeout(() => setAvatarMsg({ type: '', text: '' }), 4000);
      }
    } catch (e) { setAvatarMsg({ type: 'error', text: e.response?.data?.message || 'Failed to upload photo.' }); }
    finally { setIsUploadingPhoto(false); }
  };

  const strength = getPasswordStrength(pwForm.newPw);
  const user = profileData || { username: 'Admin', email: '', userType: 'admin', profilePhoto: null };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={C.saddle} /><Text style={s.loadingText}>Loading profile...</Text></View>
  );

  const MsgBox = ({ msg }) => msg.text ? (
    <View style={[s.msgBox, msg.type === 'success' ? s.msgSuccess : s.msgError]}>
      <Ionicons name={msg.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={16} color={msg.type === 'success' ? C.green : C.red} />
      <Text style={[s.msgText, { color: msg.type === 'success' ? C.green : C.red }]}>{msg.text}</Text>
    </View>
  ) : null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.saddle} />

      {/* Header */}
      <LinearGradient colors={[C.saddle, '#654321']} style={s.header}>
        <View style={{ paddingTop: SB_HEIGHT + 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.gold} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Account Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar section */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={s.avatarWrap} activeOpacity={0.8}>
            {imageUri || user.profilePhoto ? (
              <Image source={{ uri: imageUri || user.profilePhoto }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarInitials}>
                <Text style={s.avatarInitialsText}>{(user.username || 'A').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={s.avatarEditIcon}><Ionicons name="camera" size={16} color={C.white} /></View>
          </TouchableOpacity>
          <Text style={s.avatarName}>{user.username}</Text>
          <Text style={s.avatarEmail}>{user.email}</Text>
          <View style={s.roleBadge}><Text style={s.roleBadgeText}>System Administrator</Text></View>

          {imageUri && (
            <View style={s.avatarActions}>
              <MsgBox msg={avatarMsg} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={s.uploadBtn} onPress={uploadAvatar} disabled={isUploadingPhoto}>
                  {isUploadingPhoto ? <ActivityIndicator size="small" color={C.white} /> : <Text style={s.uploadBtnText}>Upload Photo</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setImageUri(null)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!imageUri && avatarMsg.text && <MsgBox msg={avatarMsg} />}
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {[{ id: 'profile', label: 'Public Profile', icon: 'person-outline' }, { id: 'password', label: 'Password & Security', icon: 'lock-closed-outline' }].map(tab => (
            <TouchableOpacity key={tab.id} style={[s.tab, activeTab === tab.id && s.tabActive]} onPress={() => setActiveTab(tab.id)}>
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? C.saddle : '#999'} />
              <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <View style={s.formSection}>
            <Text style={s.sectionTitle}>Public Profile</Text>
            <Text style={s.sectionDesc}>This information will appear on your profile page.</Text>
            <MsgBox msg={updateMsg} />

            <Text style={s.label}>Username <Text style={s.required}>*</Text></Text>
            <View style={s.inputRow}>
              <Text style={s.inputPrefix}>@</Text>
              <TextInput style={[s.input, s.inputWithPrefix]} value={editForm.username} onChangeText={v => setEditForm(p => ({ ...p, username: v }))} placeholder="your_username" placeholderTextColor="#BBB" autoCapitalize="none" />
            </View>
            <Text style={s.hint}>Letters, numbers, underscores. Min 3 characters.</Text>

            <Text style={[s.label, { marginTop: 16 }]}>Email Address <Text style={s.required}>*</Text></Text>
            <TextInput style={s.input} value={editForm.email} onChangeText={v => setEditForm(p => ({ ...p, email: v }))} placeholder="you@example.com" placeholderTextColor="#BBB" keyboardType="email-address" autoCapitalize="none" />

            <Text style={[s.label, { marginTop: 16 }]}>Role</Text>
            <TextInput style={[s.input, s.inputReadonly]} value="System Administrator" editable={false} />
            <Text style={s.hint}>Your role is managed by a system administrator.</Text>

            <TouchableOpacity style={[s.primaryBtn, isUpdating && { opacity: 0.6 }]} onPress={handleProfileUpdate} disabled={isUpdating}>
              {isUpdating ? <ActivityIndicator size="small" color={C.white} /> : <Text style={s.primaryBtnText}>Save Profile</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Password tab */}
        {activeTab === 'password' && (
          <View style={s.formSection}>
            <Text style={s.sectionTitle}>Change Password</Text>
            <Text style={s.sectionDesc}>Update your password regularly. Use at least 8 characters.</Text>
            <MsgBox msg={pwMsg} />

            <Text style={s.label}>Current Password <Text style={s.required}>*</Text></Text>
            <View style={s.pwInputWrap}>
              <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} value={pwForm.current} onChangeText={v => setPwForm(p => ({ ...p, current: v }))} placeholder="Enter current password" placeholderTextColor="#BBB" secureTextEntry={!showCurrent} />
              <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={s.eyeBtn}><Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" /></TouchableOpacity>
            </View>

            <View style={s.divider} />

            <Text style={s.label}>New Password <Text style={s.required}>*</Text></Text>
            <View style={s.pwInputWrap}>
              <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} value={pwForm.newPw} onChangeText={v => setPwForm(p => ({ ...p, newPw: v }))} placeholder="Min. 8 characters" placeholderTextColor="#BBB" secureTextEntry={!showNew} />
              <TouchableOpacity onPress={() => setShowNew(v => !v)} style={s.eyeBtn}><Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" /></TouchableOpacity>
            </View>

            {pwForm.newPw && strength && (
              <View style={s.strengthWrap}>
                <View style={s.strengthBar}><View style={[s.strengthFill, { width: strength.width, backgroundColor: strength.color }]} /></View>
                <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            {pwForm.newPw && (
              <View style={s.pwChecklist}>
                {[
                  { label: 'At least 8 characters', ok: pwForm.newPw.length >= 8 },
                  { label: 'At least one uppercase', ok: /[A-Z]/.test(pwForm.newPw) },
                  { label: 'At least one number', ok: /[0-9]/.test(pwForm.newPw) },
                  { label: 'At least one special character', ok: /[^A-Za-z0-9]/.test(pwForm.newPw) },
                ].map((rule, i) => (
                  <View key={i} style={s.pwRule}>
                    <Ionicons name={rule.ok ? 'checkmark-circle' : 'radio-button-off'} size={14} color={rule.ok ? C.green : '#CCC'} />
                    <Text style={[s.pwRuleText, rule.ok && { color: C.green }]}>{rule.label}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[s.label, { marginTop: 16 }]}>Confirm New Password <Text style={s.required}>*</Text></Text>
            <View style={s.pwInputWrap}>
              <TextInput style={[s.input, { flex: 1, borderWidth: 0 }, pwForm.confirm && pwForm.newPw !== pwForm.confirm && { color: C.red }]} value={pwForm.confirm} onChangeText={v => setPwForm(p => ({ ...p, confirm: v }))} placeholder="Re-enter new password" placeholderTextColor="#BBB" secureTextEntry={!showConfirm} />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}><Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" /></TouchableOpacity>
            </View>
            {pwForm.confirm && pwForm.newPw !== pwForm.confirm && <Text style={s.fieldError}>Passwords do not match.</Text>}
            {pwForm.confirm && pwForm.newPw === pwForm.confirm && <Text style={s.fieldOk}><Ionicons name="checkmark" size={12} /> Passwords match</Text>}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1 }, isChangingPw && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={isChangingPw}>
                {isChangingPw ? <ActivityIndicator size="small" color={C.white} /> : <Text style={s.primaryBtnText}>Update Password</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => setPwForm({ current: '', newPw: '', confirm: '' })}>
                <Text style={s.ghostBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:  { marginTop: 10, color: C.saddle, fontSize: 15 },
  header:       { paddingHorizontal: 18, paddingBottom: 16 },
  backBtn:      { padding: 6 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: C.white },
  avatarSection:{ alignItems: 'center', paddingVertical: 24, backgroundColor: C.white, marginBottom: 12 },
  avatarWrap:   { position: 'relative', marginBottom: 10 },
  avatarImg:    { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: C.gold },
  avatarInitials: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: C.gold },
  avatarInitialsText: { color: C.white, fontSize: 32, fontWeight: '800' },
  avatarEditIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: C.saddle, borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.white },
  avatarName:   { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 2 },
  avatarEmail:  { fontSize: 13, color: '#666', marginBottom: 6 },
  roleBadge:    { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: C.gold },
  roleBadgeText:{ fontSize: 12, color: C.saddle, fontWeight: '600' },
  avatarActions:{ alignItems: 'center', marginTop: 10 },
  uploadBtn:    { backgroundColor: C.saddle, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  uploadBtnText:{ color: C.white, fontWeight: '700' },
  cancelBtn:    { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  cancelBtnText:{ color: '#666', fontWeight: '600' },
  tabs:         { flexDirection: 'row', backgroundColor: C.white, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: C.saddle },
  tabText:      { fontSize: 13, color: '#999', fontWeight: '500' },
  tabTextActive:{ color: C.saddle, fontWeight: '700' },
  formSection:  { backgroundColor: C.white, marginHorizontal: 14, borderRadius: 14, padding: 18, elevation: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 4 },
  sectionDesc:  { fontSize: 13, color: '#888', marginBottom: 16 },
  label:        { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 },
  required:     { color: C.red },
  hint:         { fontSize: 11, color: '#999', marginTop: 4 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD', borderRadius: 10, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  inputPrefix:  { paddingHorizontal: 12, fontSize: 15, color: '#888', borderRightWidth: 1, borderRightColor: '#DDD', paddingVertical: 12 },
  input:        { borderWidth: 1.5, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, backgroundColor: '#FAFAFA' },
  inputWithPrefix: { flex: 1, borderWidth: 0, borderRadius: 0 },
  inputReadonly:{ backgroundColor: '#F5F5F5', color: '#999' },
  pwInputWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD', borderRadius: 10, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  eyeBtn:       { paddingHorizontal: 12 },
  divider:      { height: 1, backgroundColor: '#EEE', marginVertical: 16 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  strengthBar:  { flex: 1, height: 6, backgroundColor: '#EEE', borderRadius: 3, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 3 },
  strengthLabel:{ fontSize: 12, fontWeight: '700', width: 50 },
  pwChecklist:  { marginTop: 8, gap: 4 },
  pwRule:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwRuleText:   { fontSize: 12, color: '#999' },
  fieldError:   { fontSize: 12, color: C.red, marginTop: 4 },
  fieldOk:      { fontSize: 12, color: C.green, marginTop: 4, fontWeight: '600' },
  primaryBtn:   { backgroundColor: C.saddle, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },
  ghostBtn:     { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { color: '#666', fontWeight: '600' },
  msgBox:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 12 },
  msgSuccess:   { backgroundColor: '#E8F5E9' },
  msgError:     { backgroundColor: '#FFEBEE' },
  msgText:      { fontSize: 13, fontWeight: '500', flex: 1 },
});
