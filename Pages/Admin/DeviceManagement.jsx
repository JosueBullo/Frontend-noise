import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  StatusBar, ActivityIndicator, Dimensions, Animated, Easing,
  Modal, Platform, Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// ── Color palette ──────────────────────────────────────────────
const C = {
  dark:   '#3E2C23',
  mid:    '#5D4A36',
  saddle: '#8B4513',
  gold:   '#DAA520',
  cream:  '#FDF5E6',
  bg:     '#F5F0E8',
  white:  '#FFFFFF',
  green:  '#2E7D32',
  red:    '#C62828',
  orange: '#E65100',
  blue:   '#1565C0',
  sub:    '#8B7355',
  text:   '#3E2C23',
};

// ── Helpers ────────────────────────────────────────────────────
function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

function formatRelative(date) {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function thresholdColor(dB) {
  if (dB >= 85) return '#B71C1C';
  if (dB >= 70) return '#E65100';
  if (dB >= 55) return '#F9A825';
  return '#2E7D32';
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DeviceManagementAdmin() {
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [devices,    setDevices]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  // Register modal
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm]           = useState({ deviceId: '', name: '', description: '', threshold: '70' });
  const [registering, setRegistering]   = useState(false);
  const [newApiKey, setNewApiKey]       = useState(null);

  // Threshold edit modal
  const [editDevice, setEditDevice]     = useState(null);
  const [editThresh, setEditThresh]     = useState('');
  const [savingThresh, setSavingThresh] = useState(false);

  // ── Drawer ─────────────────────────────────────────────────
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  };
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -width * 0.82, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  };

  // ── Auth check ─────────────────────────────────────────────
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

  // ── Fetch devices ──────────────────────────────────────────
  const fetchDevices = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/devices/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch devices');
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const onRefresh = () => { setRefreshing(true); fetchDevices(); };

  // ── Register device ────────────────────────────────────────
  const handleRegister = async () => {
    if (!regForm.deviceId.trim() || !regForm.name.trim()) {
      Alert.alert('Error', 'Device ID and Name are required.');
      return;
    }
    try {
      setRegistering(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/devices/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deviceId:         regForm.deviceId.trim(),
          name:             regForm.name.trim(),
          description:      regForm.description.trim(),
          decibelThreshold: parseInt(regForm.threshold, 10) || 70,
        }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Error', data.message || 'Registration failed'); return; }
      setNewApiKey(data.rawApiKey);
      setRegForm({ deviceId: '', name: '', description: '', threshold: '70' });
      await fetchDevices();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRegistering(false);
    }
  };

  // ── Save threshold ─────────────────────────────────────────
  const handleSaveThreshold = async () => {
    const val = parseInt(editThresh, 10);
    if (isNaN(val) || val < 30 || val > 130) {
      Alert.alert('Error', 'Threshold must be 30–130 dB.');
      return;
    }
    try {
      setSavingThresh(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/devices/threshold/${editDevice.deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ threshold: val }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Error', data.message || 'Update failed'); return; }
      setEditDevice(null);
      await fetchDevices();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingThresh(false);
    }
  };

  // ── Deactivate ─────────────────────────────────────────────
  const handleDeactivate = (device) => {
    Alert.alert(
      'Deactivate Device',
      `Are you sure you want to deactivate "${device.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate', style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await fetch(`${API_BASE_URL}/devices/${device.deviceId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) { const d = await res.json(); Alert.alert('Error', d.message); return; }
              await fetchDevices();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // ── Stats ──────────────────────────────────────────────────
  const totalDevices = devices.length;
  const onlineCount  = devices.filter(d => isOnline(d.lastSeen)).length;
  const gpsCount     = devices.filter(d => d.location && d.location.latitude).length;
  const avgThresh    = totalDevices > 0
    ? Math.round(devices.reduce((s, d) => s + (d.decibelThreshold || 70), 0) / totalDevices)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* ── Drawer ── */}
      {drawerVisible && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      )}

      {/* ── Header ── */}
      <LinearGradient colors={[C.dark, C.mid]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.iconBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={24} color={C.gold} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Ionicons name="hardware-chip-outline" size={22} color={C.gold} />
            <View style={{ marginLeft: 8 }}>
              <Text style={s.headerTitle}>Device Management</Text>
              <Text style={s.headerSub}>Hardware noise monitoring nodes</Text>
            </View>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => { setShowRegister(true); setNewApiKey(null); }}>
            <Ionicons name="add" size={20} color={C.dark} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />}
      >
        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: C.gold }]}>{totalDevices}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: C.green }]}>{onlineCount}</Text>
            <Text style={s.statLabel}>Online</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: C.blue }]}>{gpsCount}</Text>
            <Text style={s.statLabel}>GPS Active</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: C.orange }]}>{totalDevices > 0 ? `${avgThresh} dB` : '—'}</Text>
            <Text style={s.statLabel}>Avg Thresh</Text>
          </View>
        </View>

        {/* ── Loading ── */}
        {loading && (
          <View style={s.center}>
            <ActivityIndicator color={C.gold} size="large" />
            <Text style={s.loadingText}>Loading devices…</Text>
          </View>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <View style={s.center}>
            <Ionicons name="warning-outline" size={40} color={C.red} />
            <Text style={[s.loadingText, { color: C.red }]}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={fetchDevices}>
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Empty ── */}
        {!loading && !error && devices.length === 0 && (
          <View style={s.center}>
            <Ionicons name="hardware-chip-outline" size={48} color={C.sub} />
            <Text style={s.emptyText}>No devices registered yet.</Text>
            <TouchableOpacity style={s.regBtnLg} onPress={() => setShowRegister(true)}>
              <Ionicons name="add-circle-outline" size={18} color={C.dark} />
              <Text style={s.regBtnLgText}>Register First Device</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Device list ── */}
        {!loading && devices.map(device => {
          const online = isOnline(device.lastSeen);
          const hasGPS = !!(device.location && device.location.latitude);

          return (
            <View key={device._id} style={[s.card, !device.isActive && s.cardInactive]}>
              {/* Card header */}
              <View style={s.cardHeader}>
                <View style={[s.statusDot, { backgroundColor: online ? C.green : '#9E9E9E' }]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.deviceName}>{device.name}</Text>
                  <Text style={s.deviceId}>ID: {device.deviceId}</Text>
                </View>
                <View style={s.cardBadgeWrap}>
                  <View style={[s.badge, online ? s.badgeOnline : s.badgeOffline]}>
                    <Text style={[s.badgeText, { color: online ? C.green : '#9E9E9E' }]}>
                      {online ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                  {!device.isActive && (
                    <View style={[s.badge, s.badgeInactive]}>
                      <Text style={[s.badgeText, { color: C.red }]}>Inactive</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Info rows */}
              <View style={s.infoRow}>
                <Ionicons name="time-outline" size={13} color={C.sub} />
                <Text style={s.infoText}>Last seen: {formatRelative(device.lastSeen)}</Text>
              </View>

              <View style={s.infoRow}>
                <Ionicons name={hasGPS ? 'location-outline' : 'location-outline'} size={13} color={hasGPS ? C.blue : C.sub} />
                <Text style={[s.infoText, { color: hasGPS ? C.blue : C.sub }]}>
                  {hasGPS
                    ? `${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`
                    : 'No GPS fix'}
                </Text>
              </View>

              <View style={s.infoRow}>
                <Ionicons name="volume-high-outline" size={13} color={thresholdColor(device.decibelThreshold)} />
                <Text style={[s.infoText, { color: thresholdColor(device.decibelThreshold) }]}>
                  Threshold: {device.decibelThreshold} dB
                </Text>
              </View>

              {device.firmwareVersion && (
                <View style={s.infoRow}>
                  <Ionicons name="code-outline" size={13} color={C.sub} />
                  <Text style={s.infoText}>v{device.firmwareVersion}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={s.cardActions}>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => { setEditDevice(device); setEditThresh(String(device.decibelThreshold)); }}
                >
                  <Ionicons name="create-outline" size={15} color={C.gold} />
                  <Text style={[s.actionText, { color: C.gold }]}>Set Threshold</Text>
                </TouchableOpacity>

                {device.isActive && (
                  <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => handleDeactivate(device)}>
                    <Ionicons name="ban-outline" size={15} color={C.red} />
                    <Text style={[s.actionText, { color: C.red }]}>Deactivate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Register Device Modal ── */}
      <Modal visible={showRegister} transparent animationType="slide" onRequestClose={() => setShowRegister(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <LinearGradient colors={[C.dark, C.mid]} style={s.modalHeader}>
              {newApiKey
                ? <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                : <Ionicons name="add-circle-outline" size={22} color={C.gold} />
              }
              <Text style={s.modalTitle}>
                {newApiKey ? 'Device Registered!' : 'Register New Device'}
              </Text>
            </LinearGradient>

            <ScrollView style={s.modalBody}>
              {newApiKey ? (
                /* API key reveal */
                <View>
                  <View style={s.warnBox}>
                    <Ionicons name="warning-outline" size={16} color={C.orange} />
                    <Text style={s.warnText}>
                      Save this API key now — it will <Text style={{ fontWeight: '700' }}>never be shown again</Text>.
                    </Text>
                  </View>
                  <View style={s.apiKeyBox}>
                    <Text style={s.apiKeyText} selectable>{newApiKey}</Text>
                  </View>
                  <Text style={s.apiKeyHint}>
                    Add to the Pi's .env file as DEVICE_API_KEY=…
                  </Text>
                </View>
              ) : (
                /* Form */
                <View>
                  <Text style={s.fieldLabel}>Device ID <Text style={{ color: C.red }}>*</Text></Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. nw-node-001"
                    placeholderTextColor={C.sub}
                    value={regForm.deviceId}
                    onChangeText={t => setRegForm(f => ({ ...f, deviceId: t }))}
                    autoCapitalize="none"
                  />
                  <Text style={s.fieldHint}>Must match DEVICE_ID in Pi's .env</Text>

                  <Text style={s.fieldLabel}>Display Name <Text style={{ color: C.red }}>*</Text></Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Brgy. Node #1"
                    placeholderTextColor={C.sub}
                    value={regForm.name}
                    onChangeText={t => setRegForm(f => ({ ...f, name: t }))}
                  />

                  <Text style={s.fieldLabel}>Description</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Location description (optional)"
                    placeholderTextColor={C.sub}
                    value={regForm.description}
                    onChangeText={t => setRegForm(f => ({ ...f, description: t }))}
                  />

                  <Text style={s.fieldLabel}>
                    dB Threshold:{' '}
                    <Text style={{ color: thresholdColor(parseInt(regForm.threshold) || 70), fontWeight: '700' }}>
                      {regForm.threshold} dB
                    </Text>
                  </Text>
                  <TextInput
                    style={s.input}
                    placeholder="70"
                    placeholderTextColor={C.sub}
                    keyboardType="numeric"
                    value={regForm.threshold}
                    onChangeText={t => setRegForm(f => ({ ...f, threshold: t }))}
                  />
                  <Text style={s.fieldHint}>30–130 dB. Recording triggered when noise exceeds this.</Text>
                </View>
              )}
            </ScrollView>

            <View style={s.modalFooter}>
              {newApiKey ? (
                <TouchableOpacity style={s.btnPrimary} onPress={() => { setShowRegister(false); setNewApiKey(null); }}>
                  <Text style={s.btnPrimaryText}>Done</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={s.btnCancel} onPress={() => setShowRegister(false)}>
                    <Text style={s.btnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btnPrimary, registering && { opacity: 0.6 }]} onPress={handleRegister} disabled={registering}>
                    {registering
                      ? <ActivityIndicator color={C.dark} size="small" />
                      : <Text style={s.btnPrimaryText}>Register Device</Text>
                    }
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Threshold Modal ── */}
      <Modal visible={!!editDevice} transparent animationType="fade" onRequestClose={() => setEditDevice(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: 300 }]}>
            <LinearGradient colors={[C.dark, C.mid]} style={s.modalHeader}>
              <Ionicons name="create-outline" size={20} color={C.gold} />
              <Text style={s.modalTitle}>Set Threshold</Text>
            </LinearGradient>
            <View style={s.modalBody}>
              <Text style={[s.fieldLabel, { marginBottom: 6 }]}>
                {editDevice?.name} — new dB threshold (30–130):
              </Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                value={editThresh}
                onChangeText={setEditThresh}
                autoFocus
              />
            </View>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setEditDevice(null)}>
                <Text style={s.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, savingThresh && { opacity: 0.6 }]} onPress={handleSaveThreshold} disabled={savingThresh}>
                {savingThresh
                  ? <ActivityIndicator color={C.dark} size="small" />
                  : <Text style={s.btnPrimaryText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  header:  { paddingTop: SB_HEIGHT + 8, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, padding: 8, marginRight: 10,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.cream },
  headerSub:   { fontSize: 11, color: 'rgba(253,245,230,0.7)', marginTop: 1 },
  addBtn: {
    backgroundColor: C.gold, borderRadius: 10, padding: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 12, padding: 12,
    alignItems: 'center', borderBottomWidth: 3, borderBottomColor: C.gold,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  statVal:   { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, color: C.sub, textAlign: 'center' },

  // Loading / empty
  center:      { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { color: C.sub, marginTop: 12, fontSize: 14 },
  emptyText:   { color: C.sub, fontSize: 14, marginTop: 12, marginBottom: 16 },
  retryBtn:    { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 10, paddingHorizontal: 20 },
  retryText:   { color: C.red, fontWeight: '600' },
  regBtnLg: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.gold, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
  },
  regBtnLgText: { color: C.dark, fontWeight: '700', fontSize: 14 },

  // Device card
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 14,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
  },
  cardInactive: { opacity: 0.55 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusDot:    { width: 10, height: 10, borderRadius: 5 },
  deviceName:   { fontSize: 15, fontWeight: '700', color: C.text },
  deviceId:     { fontSize: 11, color: C.sub, marginTop: 1 },
  cardBadgeWrap: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  badge:         { borderRadius: 20, paddingVertical: 2, paddingHorizontal: 9 },
  badgeOnline:   { backgroundColor: '#E8F5E9' },
  badgeOffline:  { backgroundColor: '#F5F5F5' },
  badgeInactive: { backgroundColor: '#FFEBEE' },
  badgeText:     { fontSize: 11, fontWeight: '600' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  infoText: { fontSize: 12, color: C.sub },

  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0E8DC', paddingTop: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF8E1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
  },
  actionBtnDanger: { backgroundColor: '#FFEBEE' },
  actionText: { fontSize: 12, fontWeight: '600' },

  // Drawer
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.82, backgroundColor: C.white, elevation: 10 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:        { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.85 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: C.cream },
  modalBody:    { padding: 20 },
  modalFooter:  { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#F0E8DC' },

  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.mid, marginBottom: 6, marginTop: 12 },
  fieldHint:  { fontSize: 11, color: C.sub, marginTop: 4, marginBottom: 2 },
  input: {
    borderWidth: 1, borderColor: '#E8DDD0', borderRadius: 10,
    padding: 11, fontSize: 14, color: C.text, backgroundColor: '#FFFBF5',
  },

  // Buttons
  btnPrimary: {
    backgroundColor: C.gold, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 22,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: C.dark, fontWeight: '700', fontSize: 14 },
  btnCancel: {
    backgroundColor: '#F5F0E8', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 22,
  },
  btnCancelText: { color: C.mid, fontWeight: '600', fontSize: 14 },

  // API key reveal
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF9800',
    borderRadius: 8, padding: 12, marginBottom: 14,
  },
  warnText:   { flex: 1, fontSize: 13, color: '#E65100' },
  apiKeyBox:  { backgroundColor: '#F5F0E8', borderRadius: 10, padding: 14, marginBottom: 8 },
  apiKeyText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', color: C.text },
  apiKeyHint: { fontSize: 12, color: C.sub },
});
