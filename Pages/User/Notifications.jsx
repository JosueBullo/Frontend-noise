import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions,
  Platform, Animated, Modal, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../utils/toast';
import API_BASE_URL from '../../utils/api';
import CustomDrawer from '../CustomDrawer';

const { width } = Dimensions.get('window');
const SB = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;
const POLL_INTERVAL = 30000; // 30 seconds

const C = {
  dark: '#3E2C23', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', bg: '#F5F0E8', white: '#FFFFFF',
  text: '#333', muted: '#A89070',
  green: '#4CAF50', yellow: '#FFC107', red: '#F44336', purple: '#9C27B0',
};

const STATUS_INFO = {
  monitoring:      { label: 'Being Monitored',   color: C.yellow, bg: '#FFF9C4', icon: 'eye-outline' },
  action_required: { label: 'Action Required',   color: C.red,    bg: '#FFEBEE', icon: 'alert-circle-outline' },
  resolved:        { label: 'Resolved',           color: C.green,  bg: '#E8F5E9', icon: 'checkmark-circle-outline' },
  pending:         { label: 'Pending Review',     color: '#999',   bg: '#F5F5F5', icon: 'time-outline' },
};

const LEVEL_COLOR = { green: C.green, yellow: '#F57F17', red: C.red, critical: C.purple };

function timeAgo(ts) {
  const d = new Date(ts), now = new Date();
  const dm = Math.floor((now - d) / 60000), dh = Math.floor(dm / 60), dd = Math.floor(dh / 24);
  if (dm < 1) return 'Just now';
  if (dm < 60) return `${dm}m ago`;
  if (dh < 24) return `${dh}h ago`;
  if (dd < 7) return `${dd}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Notifications({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const pollTimer   = useRef(null);
  const appState    = useRef(AppState.currentState);
  const prevCount   = useRef(0);

  // Mark all as read — save current time as lastSeenAt
  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    await AsyncStorage.setItem('notifLastSeen', now);
    setUnreadCount(0);
    await AsyncStorage.setItem('notifCount', '0');
  }, []);

  // Compute unread count based on lastSeenAt
  const computeUnread = useCallback(async (notifs) => {
    const lastSeen = await AsyncStorage.getItem('notifLastSeen');
    if (!lastSeen) return notifs.length; // never opened → all unread
    const lastSeenDate = new Date(lastSeen);
    return notifs.filter(n => new Date(n.updatedAt) > lastSeenDate).length;
  }, []);

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0,             duration: 320, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1,             duration: 320, useNativeDriver: true }),
    ]).start();
  };
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -width * 0.82, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,             duration: 250, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  };

  const fetchNotifications = useCallback(async (isRefresh = false, silent = false) => {
    try {
      if (!silent) isRefresh ? setRefreshing(true) : setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/analytics/user/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const newNotifs = json.notifications;
        const unread    = await computeUnread(newNotifs);

        // Show toast on silent poll if new unread appeared
        if (silent && unread > prevCount.current) {
          const diff = unread - prevCount.current;
          showToast('info', 'Report Updated', `${diff} report${diff > 1 ? 's' : ''} status updated by barangay`);
        }

        prevCount.current = unread;
        setNotifications(newNotifs);
        setUnreadCount(unread);
        await AsyncStorage.setItem('notifCount', String(unread));
      }
    } catch (e) { console.warn('Notifications error:', e.message); }
    finally { if (!silent) { setLoading(false); setRefreshing(false); } }
  }, [computeUnread]); // removed 'notifications' from deps — was causing infinite loop

  // Start polling
  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(() => {
      fetchNotifications(false, true); // silent poll
    }, POLL_INTERVAL);
  }, [fetchNotifications]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  useEffect(() => {
    fetchNotifications();
    startPolling();

    // Mark all as read when page opens
    markAllRead();

    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        fetchNotifications(false, true);
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, [fetchNotifications, startPolling, stopPolling, markAllRead]);

  const renderItem = ({ item }) => {
    const info = STATUS_INFO[item.status] || STATUS_INFO.pending;
    const levelColor = LEVEL_COLOR[item.noiseLevel] || '#999';
    const isUnread = unreadCount > 0 && new Date(item.updatedAt) > new Date(
      // compare against last seen — approximate via unread existence
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    return (
      <TouchableOpacity
        style={[s.notifCard, { borderLeftColor: info.color }]}
        onPress={async () => {
          await markAllRead();
          navigation.navigate('ReportHistory');
        }}
        activeOpacity={0.8}
      >
        <View style={[s.notifIcon, { backgroundColor: info.bg }]}>
          <Ionicons name={info.icon} size={22} color={info.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.notifTop}>
            <Text style={s.notifTitle}>{item.title}</Text>
            <Text style={s.notifTime}>{timeAgo(item.updatedAt)}</Text>
          </View>
          <Text style={s.notifMsg} numberOfLines={2}>{item.message}</Text>
          <View style={s.notifFooter}>
            <View style={[s.statusPill, { backgroundColor: info.bg }]}>
              <View style={[s.statusDot, { backgroundColor: info.color }]} />
              <Text style={[s.statusPillText, { color: info.color }]}>{info.label}</Text>
            </View>
            {item.noiseLevel && (
              <View style={[s.levelPill, { backgroundColor: levelColor + '22' }]}>
                <Text style={[s.levelPillText, { color: levelColor }]}>
                  {item.noiseLevel.charAt(0).toUpperCase() + item.noiseLevel.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <LinearGradient colors={[C.dark, C.saddle]} style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={openDrawer} style={s.headerBtn}>
            <Ionicons name="menu" size={26} color={C.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.headerTitle}>Notifications</Text>
            <Text style={s.headerSub}>Updates on your noise reports</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {unreadCount > 0 && (
              <>
                <View style={s.headerBadge}>
                  <Text style={s.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
                <TouchableOpacity onPress={markAllRead} style={s.headerBtn}>
                  <Ionicons name="checkmark-done-outline" size={22} color={C.gold} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => fetchNotifications(true)} style={s.headerBtn}>
              <Ionicons name="refresh-outline" size={22} color={C.gold} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.saddle} />
          <Text style={{ marginTop: 10, color: C.saddle }}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} colors={[C.saddle]} tintColor={C.saddle} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={56} color="#CCC" />
              <Text style={s.emptyTitle}>No notifications yet</Text>
              <Text style={s.emptySub}>You'll be notified here when the barangay updates the status of your reports</Text>
            </View>
          }
          ListHeaderComponent={
            notifications.length > 0 ? (
              <Text style={s.listHeader}>{notifications.length} update{notifications.length !== 1 ? 's' : ''} on your reports</Text>
            ) : null
          }
        />
      )}

      {/* Drawer */}
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
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { paddingTop: SB + 8, paddingHorizontal: 16, paddingBottom: 14 },
  headerInner:  { flexDirection: 'row', alignItems: 'center' },
  headerBtn:    { padding: 6 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  headerBadge:  { backgroundColor: C.red, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  headerBadgeText: { color: C.white, fontSize: 10, fontWeight: '900' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listHeader:   { fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: '600' },
  notifCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  notifIcon:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  notifTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle:   { fontSize: 13, fontWeight: '800', color: C.dark, flex: 1 },
  notifTime:    { fontSize: 10, color: C.muted, marginLeft: 8 },
  notifMsg:     { fontSize: 12, color: C.text, lineHeight: 17, marginBottom: 8 },
  notifFooter:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  levelPill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  levelPillText:{ fontSize: 10, fontWeight: '700' },
  empty:        { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#999', marginTop: 14 },
  emptySub:     { fontSize: 13, color: '#BBB', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  drawerWrap:   { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },
});
