import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
  StatusBar, Dimensions, Platform, FlatList, ScrollView,
  RefreshControl, ActivityIndicator, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;
const C = {
  dark: '#3E2C23', saddle: '#8B4513', gold: '#DAA520', cream: '#FDF5E6',
  bg: '#F5F0E8', white: '#FFFFFF', green: '#4CAF50', yellow: '#FFC107',
  red: '#F44336', purple: '#9C27B0', blue: '#2196F3', text: '#333333',
};
const getPriorityColor = (p) => ({ critical: C.purple, emergency: C.red, high: '#FF5722', medium: C.yellow, low: C.blue }[p] || C.blue);
const getPriorityLabel = (p) => ({ critical: '🔴 CRITICAL', emergency: '🚨 EMERGENCY', high: '⚠️ HIGH', medium: '📢 MEDIUM', low: 'ℹ️ LOW' }[p] || 'ℹ️ LOW');
const formatTimeAgo = (ts) => {
  const d = new Date(ts), now = new Date();
  const dm = Math.floor((now - d) / 60000), dh = Math.floor(dm / 60), dd = Math.floor(dh / 24);
  if (dm < 1) return 'Just now'; if (dm < 60) return `${dm}m ago`;
  if (dh < 24) return `${dh}h ago`; if (dd < 7) return `${dd}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const getLocStr = (loc) => {
  if (!loc) return null; if (typeof loc === 'string') return loc;
  return loc.formattedAddress || loc.address || loc.name || `${loc.city || ''} ${loc.street || ''}`.trim() || null;
};

export default function AdminNotifications({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [fetchError, setFetchError]   = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [filter, setFilter]           = useState('all');
  const [timeRange, setTimeRange]     = useState(24);
  const [stats, setStats]             = useState({ total: 0, unread: 0, reports: 0, registrations: 0, critical: 0 });
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0,             duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1,             duration: 320, useNativeDriver: true }),
    ]).start();
  };
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -width * 0.82, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,             duration: 250, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  };

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

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!apiConnected) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) { navigation.replace('Login'); return; }
      const res = await fetch(`${API_BASE_URL}/notification/all?hours=${timeRange}&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.status === 401) { navigation.replace('Login'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      const savedIds = JSON.parse(await AsyncStorage.getItem('readNotificationIds') || '[]');
      const marked = data.notifications.map(n => ({ ...n, read: savedIds.includes(n.id) ? true : (n.read || false) }));
      setNotifications(marked);
      setStats({
        total: marked.length, unread: marked.filter(n => !n.read).length,
        reports: marked.filter(n => n.type === 'report').length,
        registrations: marked.filter(n => n.type === 'registration').length,
        critical: marked.filter(n => n.priority === 'emergency' || n.priority === 'critical').length,
      });
      setFetchError(null);
    } catch (e) { setFetchError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [apiConnected, timeRange, navigation]);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) { navigation.replace('Login'); return; }
        const res = await fetch(`${API_BASE_URL}/notification/test`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) { navigation.replace('Login'); return; }
        if (res.ok) setApiConnected(true); else throw new Error('failed');
      } catch { setApiConnected(false); setFetchError('Cannot connect to notification server'); setLoading(false); }
    })();
  }, [navigation]);

  useEffect(() => { if (apiConnected) fetchNotifications(); }, [apiConnected, fetchNotifications]);

  useEffect(() => {
    if (!apiConnected) return;
    const t = setInterval(() => fetchNotifications(true), 15000);
    return () => clearInterval(t);
  }, [apiConnected, fetchNotifications]);

  useEffect(() => {
    let f = [...notifications];
    if (filter === 'unread')        f = f.filter(n => !n.read);
    else if (filter === 'reports')  f = f.filter(n => n.type === 'report');
    else if (filter === 'registrations') f = f.filter(n => n.type === 'registration');
    else if (filter === 'critical') f = f.filter(n => n.priority === 'emergency' || n.priority === 'critical');
    setFiltered(f);
  }, [notifications, filter]);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const saved = JSON.parse(await AsyncStorage.getItem('readNotificationIds') || '[]');
    if (!saved.includes(id)) { saved.push(id); await AsyncStorage.setItem('readNotificationIds', JSON.stringify(saved)); }
  };
  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await AsyncStorage.setItem('readNotificationIds', JSON.stringify(notifications.map(n => n.id)));
  };
  const handleNotifPress = (n) => { markAsRead(n.id); setSelectedNotif(n); setDetailVisible(true); };

  const filterTabs = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'unread', label: 'Unread', count: stats.unread },
    { key: 'reports', label: 'Reports', count: stats.reports },
    { key: 'registrations', label: 'Users', count: stats.registrations },
    { key: 'critical', label: 'Critical', count: stats.critical },
  ];
  const timeRanges = [{ label: '6h', value: 6 }, { label: '24h', value: 24 }, { label: '48h', value: 48 }, { label: '7d', value: 168 }];
  const noiseBgMap  = { critical: '#F3E5F5', red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' };
  const noiseClrMap = { critical: C.purple, red: C.red, yellow: '#F57F17', green: '#2E7D32' };
  const noiseLblMap = { critical: '🔴 Critical', red: '🚨 High', yellow: '⚠️ Medium', green: '🟢 Low' };

  const renderItem = ({ item: n }) => (
    <TouchableOpacity style={[s.notifCard, !n.read && s.notifCardUnread]} onPress={() => handleNotifPress(n)} activeOpacity={0.8}>
      <View style={s.notifLeft}>
        <Text style={s.notifIcon}>{n.icon || '📋'}</Text>
        {!n.read && <View style={s.unreadDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.notifHeaderRow}>
          <Text style={[s.notifTitle, !n.read && { fontWeight: '800' }]} numberOfLines={1}>{n.title}</Text>
          <Text style={s.notifTime}>{n.time || formatTimeAgo(n.timestamp)}</Text>
        </View>
        <Text style={s.notifMsg} numberOfLines={2}>{n.message}</Text>
        {getLocStr(n.location) && (
          <View style={s.notifMeta}>
            <Ionicons name="location-outline" size={12} color="#999" />
            <Text style={s.notifMetaText} numberOfLines={1}>{getLocStr(n.location)}</Text>
          </View>
        )}
        {n.noiseLevel && (
          <View style={s.notifBadgeRow}>
            <View style={[s.noiseBadge, { backgroundColor: noiseBgMap[n.noiseLevel] || '#F5F5F5' }]}>
              <Text style={[s.noiseBadgeText, { color: noiseClrMap[n.noiseLevel] || '#555' }]}>{noiseLblMap[n.noiseLevel] || n.noiseLevel}</Text>
            </View>
          </View>
        )}
        {n.ai && (n.ai.averageDecibel != null || n.ai.isReportable) && (
          <View style={s.aiRow}>
            {n.ai.averageDecibel != null && <View style={s.aiChip}><Text style={s.aiChipText}>🔊 {n.ai.averageDecibel} dB</Text></View>}
            {n.ai.isReportable && <View style={[s.aiChip, { backgroundColor: '#FFF3E0' }]}><Text style={[s.aiChipText, { color: '#E65100' }]}>⚡ Reportable</Text></View>}
          </View>
        )}
      </View>
      <TouchableOpacity onPress={() => markAsRead(n.id)} style={s.markReadBtn}>
        <Ionicons name="checkmark-circle-outline" size={20} color={n.read ? C.green : '#CCC'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.saddle} />
      <Text style={s.loadingText}>Loading notifications...</Text>
      {!apiConnected && <Text style={[s.loadingText, { color: C.red, marginTop: 6 }]}>Cannot connect to server</Text>}
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.saddle} />
      <LinearGradient colors={[C.saddle, '#654321']} style={s.header}>
        <View style={{ paddingTop: SB_HEIGHT + 8 }}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={s.headerBtn}><Ionicons name="menu" size={26} color={C.gold} /></TouchableOpacity>
            <Text style={s.headerTitle}>Notifications</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {stats.unread > 0 && <TouchableOpacity onPress={markAllAsRead} style={s.headerBtn}><Ionicons name="checkmark-done-outline" size={22} color={C.gold} /></TouchableOpacity>}
              <TouchableOpacity onPress={() => fetchNotifications(true)} style={s.headerBtn}><Ionicons name="refresh" size={22} color={C.gold} /></TouchableOpacity>
            </View>
          </View>
          <View style={s.statsRow}>
            {[{ label: 'Total', value: stats.total, color: C.white }, { label: 'Unread', value: stats.unread, color: C.yellow }, { label: 'Reports', value: stats.reports, color: '#90CAF9' }, { label: 'Critical', value: stats.critical, color: '#EF9A9A' }].map((st, i) => (
              <View key={i} style={s.statItem}><Text style={[s.statNum, { color: st.color }]}>{st.value}</Text><Text style={s.statLabel}>{st.label}</Text></View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <View style={s.timeRangeBar}>
        <Text style={s.timeRangeLabel}>Range:</Text>
        {timeRanges.map(tr => (
          <TouchableOpacity key={tr.value} style={[s.timeChip, timeRange === tr.value && s.timeChipActive]} onPress={() => setTimeRange(tr.value)}>
            <Text style={[s.timeChipText, timeRange === tr.value && s.timeChipTextActive]}>{tr.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {filterTabs.map(ft => (
          <TouchableOpacity key={ft.key} style={[s.filterPill, filter === ft.key && s.filterPillActive]} onPress={() => setFilter(ft.key)}>
            <Text style={[s.filterPillText, filter === ft.key && s.filterPillTextActive]}>{ft.label}</Text>
            {ft.count > 0 && <View style={[s.filterCount, filter === ft.key && s.filterCountActive]}><Text style={[s.filterCountText, filter === ft.key && { color: C.saddle }]}>{ft.count}</Text></View>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {fetchError && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle" size={18} color={C.red} />
          <Text style={s.errorText}>{fetchError}</Text>
          <TouchableOpacity onPress={() => fetchNotifications()}><Text style={s.retryText}>Retry</Text></TouchableOpacity>
        </View>
      )}

      {filtered.length === 0 && !fetchError ? (
        <View style={s.center}>
          <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
          <Text style={s.emptyText}>No notifications</Text>
          <Text style={s.emptySub}>Try changing the filter or time range</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => (item.id != null ? item.id.toString() : Math.random().toString())}
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} colors={[C.saddle]} tintColor={C.saddle} />}
        />
      )}

      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.detailModal}>
            <View style={s.detailHeader}>
              <Text style={s.detailHeaderTitle}>{selectedNotif?.icon || '📋'} Notification Details</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}><Ionicons name="close" size={26} color="#333" /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {selectedNotif && (
                <>
                  <View style={[s.priorityBadge, { backgroundColor: getPriorityColor(selectedNotif.priority) + '22', borderColor: getPriorityColor(selectedNotif.priority) }]}>
                    <Text style={[s.priorityText, { color: getPriorityColor(selectedNotif.priority) }]}>{getPriorityLabel(selectedNotif.priority)}</Text>
                  </View>
                  <Text style={s.detailTitle}>{selectedNotif.title}</Text>
                  <Text style={s.detailMsg}>{selectedNotif.message}</Text>
                  <Text style={s.detailTime}>{selectedNotif.time || formatTimeAgo(selectedNotif.timestamp)}</Text>
                  {selectedNotif.user && (
                    <View style={s.detailSection}>
                      <Text style={s.detailSectionTitle}>User</Text>
                      <Text style={s.detailSectionText}>{selectedNotif.user.username}</Text>
                      {selectedNotif.user.email && <Text style={s.detailSectionText}>{selectedNotif.user.email}</Text>}
                    </View>
                  )}
                  {getLocStr(selectedNotif.location) && (
                    <View style={s.detailSection}>
                      <Text style={s.detailSectionTitle}>Location</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="location-outline" size={16} color={C.saddle} />
                        <Text style={s.detailSectionText}>{getLocStr(selectedNotif.location)}</Text>
                      </View>
                    </View>
                  )}
                  {selectedNotif.type === 'report' && selectedNotif.ai && (
                    <View style={s.detailSection}>
                      <Text style={s.detailSectionTitle}>🤖 AI Analysis</Text>
                      {selectedNotif.ai.topDetection && <Text style={s.detailSectionText}>Detection: {selectedNotif.ai.topDetection}</Text>}
                      {selectedNotif.ai.averageDecibel != null && <Text style={s.detailSectionText}>Avg dB: {selectedNotif.ai.averageDecibel}</Text>}
                      {selectedNotif.ai.estimatedDistance != null && <Text style={s.detailSectionText}>Distance: {selectedNotif.ai.estimatedDistance}m</Text>}
                      {selectedNotif.ai.isReportable && <Text style={[s.detailSectionText, { color: '#E65100', fontWeight: '700' }]}>⚡ Actionable noise detected</Text>}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            <View style={s.detailFooter}>
              <TouchableOpacity style={s.detailCloseBtn} onPress={() => setDetailVisible(false)}><Text style={s.detailCloseBtnText}>Close</Text></TouchableOpacity>
              {selectedNotif?.type === 'report' && (
                <TouchableOpacity style={s.detailActionBtn} onPress={() => { setDetailVisible(false); navigation.navigate('NoiseReports'); }}>
                  <Ionicons name="document-text-outline" size={16} color={C.white} />
                  <Text style={s.detailActionBtnText}>Go to Reports</Text>
                </TouchableOpacity>
              )}
              {selectedNotif?.type === 'registration' && (
                <TouchableOpacity style={s.detailActionBtn} onPress={() => { setDetailVisible(false); navigation.navigate('UserManagement'); }}>
                  <Ionicons name="people-outline" size={16} color={C.white} />
                  <Text style={s.detailActionBtnText}>View Users</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayAnim }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[s.drawerWrap, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText:  { marginTop: 10, color: C.saddle, fontSize: 15 },
  emptyText:    { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 12 },
  emptySub:     { fontSize: 13, color: '#BBB', marginTop: 6, textAlign: 'center' },
  header:       { paddingHorizontal: 18, paddingBottom: 16 },
  headerTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerBtn:    { padding: 6 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: C.white, flex: 1, textAlign: 'center' },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 10 },
  statItem:     { alignItems: 'center' },
  statNum:      { fontSize: 18, fontWeight: '800' },
  statLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  timeRangeBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  timeRangeLabel: { fontSize: 12, color: '#666', fontWeight: '600' },
  timeChip:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#F0F0F0' },
  timeChipActive: { backgroundColor: C.saddle },
  timeChipText:   { fontSize: 12, color: '#555', fontWeight: '500' },
  timeChipTextActive: { color: C.white, fontWeight: '700' },
  filterBar:    { backgroundColor: C.white, paddingVertical: 8, maxHeight: 46, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filterPill:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 12, backgroundColor: '#F0F0F0', borderRadius: 16, gap: 5 },
  filterPillActive: { backgroundColor: C.saddle },
  filterPillText:   { fontSize: 12, color: '#333', fontWeight: '500' },
  filterPillTextActive: { color: C.white, fontWeight: '700' },
  filterCount:  { backgroundColor: '#DDD', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  filterCountActive: { backgroundColor: C.gold },
  filterCountText:   { fontSize: 10, color: '#555', fontWeight: '700' },
  errorBox:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', margin: 14, borderRadius: 10, padding: 12, gap: 8 },
  errorText:    { flex: 1, color: C.red, fontSize: 13 },
  retryText:    { color: C.blue, fontWeight: '700', fontSize: 13 },
  notifCard:    { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  notifCardUnread: { borderLeftWidth: 4, borderLeftColor: C.saddle, backgroundColor: '#FFFDF8' },
  notifLeft:    { alignItems: 'center', width: 36 },
  notifIcon:    { fontSize: 24 },
  unreadDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C.saddle, marginTop: 4 },
  notifHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  notifTitle:   { fontSize: 14, fontWeight: '600', color: C.text, flex: 1, marginRight: 8 },
  notifTime:    { fontSize: 11, color: '#999' },
  notifMsg:     { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 4 },
  notifMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  notifMetaText:{ fontSize: 11, color: '#999', flex: 1 },
  notifBadgeRow:{ flexDirection: 'row', gap: 6, marginTop: 4 },
  noiseBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  noiseBadgeText: { fontSize: 11, fontWeight: '700' },
  aiRow:        { flexDirection: 'row', gap: 6, marginTop: 4 },
  aiChip:       { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  aiChipText:   { fontSize: 10, color: '#2E7D32', fontWeight: '600' },
  markReadBtn:  { justifyContent: 'center', paddingLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailModal:  { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.85, minHeight: height * 0.5 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  detailHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  priorityBadge:{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 12 },
  priorityText: { fontSize: 13, fontWeight: '700' },
  detailTitle:  { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 },
  detailMsg:    { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 6 },
  detailTime:   { fontSize: 12, color: '#999', marginBottom: 14 },
  detailSection:{ backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, marginBottom: 10 },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: C.saddle, marginBottom: 6 },
  detailSectionText:  { fontSize: 13, color: '#555', lineHeight: 18 },
  detailFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#EEE' },
  detailCloseBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  detailCloseBtnText: { color: '#666', fontWeight: '600' },
  detailActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: C.saddle },
  detailActionBtnText: { color: C.white, fontWeight: '700', fontSize: 13 },
  drawerWrap:   { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },
});
