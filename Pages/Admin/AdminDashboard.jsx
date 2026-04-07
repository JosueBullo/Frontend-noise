import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
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
  green:  '#4CAF50',
  yellow: '#FFC107',
  red:    '#F44336',
  purple: '#9C27B0',
  blue:   '#2196F3',
  text:   '#333333',
  sub:    '#8B7355',
};

const noiseLevelColor = (level) => {
  const m = { green: C.green, yellow: C.yellow, red: C.red, critical: C.purple };
  return m[level] || C.sub;
};

const AdminDashboard = () => {
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);

  const [dashboardData,   setDashboardData]   = useState(null);
  const [recentActivity,  setRecentActivity]  = useState([]);
  const [topLocations,    setTopLocations]    = useState([]);
  const [selectedPeriod,  setSelectedPeriod]  = useState('weekly');
  const [notifModal,      setNotifModal]      = useState(false);
  const [notifications,   setNotifications]   = useState([]);
  const [unread,          setUnread]          = useState(0);

  const periods = [
    { id: 'daily',   label: 'Daily'   },
    { id: 'weekly',  label: 'Weekly'  },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly',  label: 'Yearly'  },
  ];

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

  // ── API connection test ────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(r => { if (r.ok) setApiConnected(true); else throw new Error(); })
      .catch(() => { setFetchError('Cannot connect to server'); setLoading(false); });
  }, []);

  // ── Fetch data ─────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!apiConnected) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setFetchError(null);
      const token = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [analyticsRes, locRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/dashboard?period=${selectedPeriod}`, { headers }),
        fetch(`${API_BASE_URL}/analytics/top-locations?period=${selectedPeriod}&limit=5`, { headers }),
      ]);

      if (!analyticsRes.ok) throw new Error(`HTTP ${analyticsRes.status}`);
      const data = await analyticsRes.json();
      if (!data.success) throw new Error(data.error || 'Failed');

      setDashboardData(data);
      if (data.recentActivity) {
        setRecentActivity(data.recentActivity);
        buildNotifications(data.recentActivity);
      }
      if (locRes.ok) {
        const locData = await locRes.json();
        if (locData.success) setTopLocations(locData.topLocations || []);
      }
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiConnected, selectedPeriod]);

  useEffect(() => { if (apiConnected) fetchData(); }, [apiConnected, fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!apiConnected) return;
    const t = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(t);
  }, [apiConnected, fetchData]);

  // ── Notifications ──────────────────────────────────────────
  const buildNotifications = (activities) => {
    const now = new Date();
    const twoH = new Date(now - 2 * 3600000);
    const notifs = activities
      .filter(a => new Date(a.timestamp) > twoH)
      .map(a => ({
        id: `n-${a.id}`,
        title: a.type === 'report' ? 'New Noise Report' : 'New User Registered',
        message: `${a.user} ${a.action}`,
        time: a.time,
        read: false,
        priority: a.noiseLevel === 'critical' ? 'critical' : a.noiseLevel === 'red' ? 'high' : 'medium',
        type: a.type,
      }));
    setNotifications(notifs.slice(0, 20));
    setUnread(notifs.length);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  // ── Logout ─────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.clear();
        navigation.replace('Login');
      }},
    ]);
  };

  // ── Render helpers ─────────────────────────────────────────
  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value ?? 0}</Text>
    </View>
  );

  const SectionHeader = ({ title, icon }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Ionicons name={icon} size={18} color={C.saddle} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderStats = () => {
    const u = dashboardData?.userStats    || {};
    const r = dashboardData?.reportStats  || {};
    return (
      <View style={styles.statsGrid}>
        <StatCard title="Total Users"    value={u.totalUsers}      icon="people-outline"           color={C.saddle} />
        <StatCard title="Active Users"   value={u.activeUsers}     icon="person-outline"           color={C.gold}   />
        <StatCard title="New Users"      value={u.newUsers}        icon="person-add-outline"       color={C.mid}    />
        <StatCard title="Period Reports" value={r.periodReports}   icon="document-text-outline"    color={C.saddle} />
        <StatCard title="Total Reports"  value={r.totalReports}    icon="bar-chart-outline"        color={C.mid}    />
        <StatCard title="Resolved"       value={r.resolvedReports} icon="checkmark-circle-outline" color={C.green}  />
      </View>
    );
  };

  const renderNoiseLevels = () => {
    const levels = dashboardData?.reportStats?.noiseLevels || [];
    if (!levels.length) return null;
    return (
      <View style={styles.card}>
        <SectionHeader title="Noise Level Breakdown" icon="volume-high-outline" />
        {levels.map((n, i) => (
          <View key={i} style={styles.levelRow}>
            <View style={[styles.levelDot, { backgroundColor: noiseLevelColor(n.level) }]} />
            <Text style={styles.levelName}>{n.level?.charAt(0).toUpperCase() + n.level?.slice(1)}</Text>
            <View style={styles.levelBarWrap}>
              <View style={[styles.levelBar, { width: `${n.percentage || 0}%`, backgroundColor: noiseLevelColor(n.level) }]} />
            </View>
            <Text style={styles.levelCount}>{n.count}</Text>
            <Text style={[styles.levelPct, { color: noiseLevelColor(n.level) }]}>{Math.round(n.percentage || 0)}%</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTopLocations = () => {
    if (!topLocations.length) return null;
    const max = topLocations[0]?.count || 1;
    const rankColors = [C.red, C.saddle, C.gold, C.sub, C.sub];
    return (
      <View style={styles.card}>
        <SectionHeader title="Top 5 Reported Locations" icon="location-outline" />
        {topLocations.map((loc, i) => (
          <View key={i} style={styles.locRow}>
            <View style={[styles.locRank, { backgroundColor: rankColors[i] }]}>
              <Text style={styles.locRankText}>#{i + 1}</Text>
            </View>
            <View style={styles.locInfo}>
              <Text style={styles.locName} numberOfLines={2}>{loc.location}</Text>
              <View style={styles.locBarWrap}>
                <View style={[styles.locBar, { width: `${Math.round((loc.count / max) * 100)}%`, backgroundColor: rankColors[i] }]} />
              </View>
            </View>
            <Text style={styles.locCount}>{loc.count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRecentActivity = () => {
    if (!recentActivity.length) return (
      <View style={styles.card}>
        <SectionHeader title="Recent Activity" icon="time-outline" />
        <View style={styles.emptyBox}>
          <Ionicons name="information-circle-outline" size={36} color={C.sub} />
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      </View>
    );
    return (
      <View style={styles.card}>
        <SectionHeader title="Recent Activity" icon="time-outline" />
        {recentActivity.slice(0, 8).map((a, i) => (
          <View key={a.id || i} style={styles.actRow}>
            <View style={[styles.actIcon, { backgroundColor: a.type === 'report' ? C.saddle + '22' : C.blue + '22' }]}>
              <Ionicons name={a.type === 'report' ? 'volume-high-outline' : 'person-add-outline'} size={18} color={a.type === 'report' ? C.saddle : C.blue} />
            </View>
            <View style={styles.actInfo}>
              <View style={styles.actTop}>
                <Text style={styles.actUser} numberOfLines={1}>{a.user || 'Anonymous'}</Text>
                <Text style={styles.actTime}>{a.time}</Text>
              </View>
              <Text style={styles.actAction} numberOfLines={1}>{a.user} {a.action}</Text>
              {a.location ? (
                <Text style={styles.actLoc} numberOfLines={1}>
                  📍 {typeof a.location === 'object' ? a.location.address || 'Location available' : a.location}
                </Text>
              ) : null}
              {a.type === 'report' && a.noiseLevel ? (
                <View style={[styles.noiseBadge, { backgroundColor: noiseLevelColor(a.noiseLevel) + '22' }]}>
                  <Text style={[styles.noiseBadgeText, { color: noiseLevelColor(a.noiseLevel) }]}>
                    {a.noiseLevel.toUpperCase()}
                    {a.averageDecibel ? `  •  ${a.averageDecibel} dB` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderReportStatus = () => {
    const statuses = dashboardData?.reportStats?.reportStatus || [];
    if (!statuses.length) return null;
    return (
      <View style={styles.card}>
        <SectionHeader title="Report Status" icon="pie-chart-outline" />
        {statuses.map((s, i) => (
          <View key={i} style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: s.color || C.sub }]} />
            <Text style={styles.statusName}>{s.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
            <Text style={styles.statusCount}>{s.count}</Text>
            <Text style={[styles.statusPct, { color: s.color || C.sub }]}>{Math.round(s.percentage || 0)}%</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCategories = () => {
    const cats = dashboardData?.noiseCategories || [];
    if (!cats.length) return null;
    return (
      <View style={styles.card}>
        <SectionHeader title="Top Noise Categories" icon="musical-notes-outline" />
        {cats.slice(0, 6).map((c, i) => (
          <View key={i} style={styles.catRow}>
            <View style={[styles.catDot, { backgroundColor: c.color || C.saddle }]} />
            <Text style={styles.catName}>{c.name}</Text>
            <Text style={styles.catCount}>{c.count}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ── Notification modal ─────────────────────────────────────
  const renderNotifModal = () => (
    <Modal visible={notifModal} transparent animationType="slide" onRequestClose={() => setNotifModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.notifModal}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Notifications</Text>
            <View style={styles.notifActions}>
              {unread > 0 && (
                <TouchableOpacity onPress={markAllRead} style={styles.markReadBtn}>
                  <Text style={styles.markReadText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setNotifModal(false)}>
                <Ionicons name="close" size={24} color={C.dark} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView>
            {notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="notifications-off-outline" size={40} color={C.sub} />
                <Text style={styles.emptyText}>No notifications</Text>
              </View>
            ) : notifications.map(n => (
              <View key={n.id} style={[styles.notifItem, !n.read && styles.notifUnread]}>
                <View style={[styles.notifDot, { backgroundColor: n.priority === 'critical' ? C.red : n.priority === 'high' ? C.saddle : C.gold }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifItemTitle}>{n.title}</Text>
                  <Text style={styles.notifItemMsg}>{n.message}</Text>
                  <Text style={styles.notifItemTime}>{n.time}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ── Loading / Error ────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.saddle} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <LinearGradient colors={[C.dark, C.mid]} style={styles.header}>
        <View style={{ paddingTop: SB_HEIGHT, paddingHorizontal: 20 }}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
              <Ionicons name="menu" size={26} color={C.cream} />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => fetchData(true)} style={styles.headerBtn} disabled={refreshing}>
                <Ionicons name="refresh-outline" size={24} color={C.cream} style={refreshing ? { opacity: 0.5 } : {}} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setNotifModal(true)} style={styles.headerBtn}>
                <Ionicons name="notifications-outline" size={24} color={C.cream} />
                {unread > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text></View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
                <Ionicons name="log-out-outline" size={24} color={C.cream} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerTitle}>NOISEWATCH</Text>
          <Text style={styles.headerSub}>Admin Dashboard</Text>
        </View>
      </LinearGradient>

      {/* Period selector */}
      <View style={styles.periodBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScroll}>
          {periods.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.periodBtn, selectedPeriod === p.id && styles.periodBtnActive]}
              onPress={() => setSelectedPeriod(p.id)}
            >
              <Text style={[styles.periodBtnText, selectedPeriod === p.id && styles.periodBtnTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Error banner */}
      {fetchError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={C.red} />
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main scroll */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[C.saddle]} tintColor={C.saddle} />}
      >
        <View style={styles.content}>
          {/* Navigate to Analytics */}
          <TouchableOpacity style={styles.analyticsLink} onPress={() => navigation.navigate('Analytics')}>
            <Ionicons name="analytics-outline" size={20} color={C.saddle} />
            <Text style={styles.analyticsLinkText}>View Full Analytics</Text>
            <Ionicons name="chevron-forward" size={18} color={C.saddle} />
          </TouchableOpacity>

          {renderStats()}
          {renderNoiseLevels()}
          {renderReportStatus()}
          {renderTopLocations()}
          {renderCategories()}
          {renderRecentActivity()}
        </View>
      </ScrollView>

      {/* Drawer */}
      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>

      {renderNotifModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText:  { marginTop: 12, color: C.saddle, fontSize: 15, fontWeight: '600' },
  header:       { paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerBtn:    { padding: 8, position: 'relative' },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: C.cream, letterSpacing: 2 },
  headerSub:    { fontSize: 13, color: C.gold, marginTop: 2 },
  badge:        { position: 'absolute', top: 4, right: 4, backgroundColor: C.red, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  badgeText:    { color: C.white, fontSize: 9, fontWeight: '700' },

  periodBar:    { backgroundColor: C.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  periodScroll: { paddingHorizontal: 16, gap: 8 },
  periodBtn:    { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0EBE3', marginRight: 8 },
  periodBtnActive: { backgroundColor: C.saddle },
  periodBtnText:   { fontSize: 13, fontWeight: '600', color: C.mid },
  periodBtnTextActive: { color: C.white },

  errorBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', padding: 10, paddingHorizontal: 16 },
  errorText:    { flex: 1, color: C.red, fontSize: 12 },
  retryText:    { color: C.saddle, fontWeight: '700', fontSize: 12 },

  scroll:       { flex: 1 },
  content:      { padding: 16, gap: 14 },

  analyticsLink: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.saddle + '44' },
  analyticsLinkText: { flex: 1, color: C.saddle, fontWeight: '700', fontSize: 14 },

  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:     { backgroundColor: C.white, borderRadius: 12, padding: 14, borderLeftWidth: 4, flex: 1, minWidth: '45%', elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statTitle:    { fontSize: 11, color: C.sub, fontWeight: '500', marginBottom: 4 },
  statValue:    { fontSize: 24, fontWeight: '800' },

  card:         { backgroundColor: C.white, borderRadius: 14, padding: 16, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.dark },

  levelRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  levelDot:     { width: 10, height: 10, borderRadius: 5 },
  levelName:    { width: 60, fontSize: 12, color: C.text, fontWeight: '500' },
  levelBarWrap: { flex: 1, height: 6, backgroundColor: '#F0EBE3', borderRadius: 3, overflow: 'hidden' },
  levelBar:     { height: 6, borderRadius: 3 },
  levelCount:   { width: 28, fontSize: 12, color: C.text, textAlign: 'right', fontWeight: '600' },
  levelPct:     { width: 36, fontSize: 11, textAlign: 'right', fontWeight: '700' },

  locRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  locRank:      { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  locRankText:  { color: C.white, fontSize: 11, fontWeight: '700' },
  locInfo:      { flex: 1 },
  locName:      { fontSize: 12, color: C.text, fontWeight: '600', marginBottom: 4 },
  locBarWrap:   { height: 5, backgroundColor: '#F0EBE3', borderRadius: 3, overflow: 'hidden' },
  locBar:       { height: 5, borderRadius: 3 },
  locCount:     { fontSize: 13, fontWeight: '700', color: C.dark, minWidth: 24, textAlign: 'right' },

  actRow:       { flexDirection: 'row', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F5F0E8' },
  actIcon:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  actInfo:      { flex: 1 },
  actTop:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  actUser:      { fontSize: 13, fontWeight: '700', color: C.dark, flex: 1 },
  actTime:      { fontSize: 11, color: C.sub },
  actAction:    { fontSize: 12, color: C.sub, marginBottom: 2 },
  actLoc:       { fontSize: 11, color: C.saddle, marginBottom: 3 },
  noiseBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  noiseBadgeText: { fontSize: 10, fontWeight: '700' },

  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusDot:    { width: 10, height: 10, borderRadius: 5 },
  statusName:   { flex: 1, fontSize: 13, color: C.text, fontWeight: '500' },
  statusCount:  { fontSize: 13, fontWeight: '700', color: C.dark, marginRight: 8 },
  statusPct:    { fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },

  catRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catDot:       { width: 10, height: 10, borderRadius: 5 },
  catName:      { flex: 1, fontSize: 13, color: C.text, fontWeight: '500' },
  catCount:     { fontSize: 13, fontWeight: '700', color: C.dark },

  emptyBox:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText:    { color: C.sub, fontSize: 14 },

  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer:       { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.82, backgroundColor: C.white },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  notifModal:   { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', padding: 20 },
  notifHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  notifTitle:   { fontSize: 18, fontWeight: '700', color: C.dark },
  notifActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markReadBtn:  { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.saddle + '22', borderRadius: 8 },
  markReadText: { color: C.saddle, fontSize: 12, fontWeight: '600' },
  notifItem:    { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F0E8' },
  notifUnread:  { backgroundColor: C.cream },
  notifDot:     { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  notifItemTitle: { fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 2 },
  notifItemMsg:   { fontSize: 12, color: C.sub, marginBottom: 2 },
  notifItemTime:  { fontSize: 11, color: C.sub },
});

export default AdminDashboard;
