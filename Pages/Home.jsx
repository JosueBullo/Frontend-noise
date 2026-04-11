import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
  StatusBar, Dimensions, Platform, Easing, ScrollView,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDrawer from './CustomDrawer';
import DecibelAI from './DecibelAI';
import API_BASE_URL from '../utils/api';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark:   '#3E2C23',
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
  muted:  '#A89070',
};

const LEVEL_COLOR = { green: C.green, yellow: '#F57F17', red: C.red, critical: C.purple };
const LEVEL_BG    = { green: '#E8F5E9', yellow: '#FFF9C4', red: '#FFEBEE', critical: '#F3E5F5' };
const LEVEL_LABEL = { green: 'Low', yellow: 'Medium', red: 'High', critical: 'Critical' };

const getReasonIcon = (reason) => {
  if (!reason) return 'megaphone-outline';
  const r = reason.toLowerCase();
  if (r.includes('music') || r.includes('party')) return 'musical-notes-outline';
  if (r.includes('vehicle') || r.includes('traffic') || r.includes('car')) return 'car-outline';
  if (r.includes('construction') || r.includes('machinery')) return 'construct-outline';
  if (r.includes('animal') || r.includes('dog')) return 'paw-outline';
  if (r.includes('industrial')) return 'business-outline';
  if (r.includes('shout') || r.includes('people')) return 'people-outline';
  return 'megaphone-outline';
};

const formatTimeAgo = (ts) => {
  const d = new Date(ts), now = new Date();
  const dm = Math.floor((now - d) / 60000), dh = Math.floor(dm / 60), dd = Math.floor(dh / 24);
  if (dm < 1) return 'Just now';
  if (dm < 60) return `${dm}m ago`;
  if (dh < 24) return `${dh}h ago`;
  if (dd < 7) return `${dd}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getLocationStr = (loc) => {
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  const addr = loc.address || {};
  return addr.formattedAddress || addr.street
    ? `${addr.street || ''}${addr.city ? ', ' + addr.city : ''}`.trim()
    : addr.city || loc.formattedAddress || null;
};

// ── Fade-slide animation wrapper ─────────────────────────────────────────────
function FadeIn({ delay = 0, children }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function Home({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [chatVisible, setChatVisible]     = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [userName, setUserName]       = useState('');
  const [userType, setUserType]       = useState('user');
  const [totalUsers, setTotalUsers]   = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [recentReports, setRecentReports] = useState([]);
  const [hotspots, setHotspots]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [fetchError, setFetchError]   = useState(null);

  // ── Drawer ──────────────────────────────────────────────────
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

  // ── Fetch all data ───────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setFetchError(null);

      const token = await AsyncStorage.getItem('userToken');
      const stored = await AsyncStorage.getItem('userData');
      let userId = null;

      if (stored) {
        const u = JSON.parse(stored);
        setUserName(u.username || u.name || 'User');
        setUserType(u.userType || u.role || 'user');
        userId = u._id || u.id;
      }

      // fallback: get userId from separate key
      if (!userId) userId = await AsyncStorage.getItem('userId');

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [usersRes, reportsCountRes, myReportsRes, hotspotsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/user/countUsersOnly`, { headers }),
        fetch(`${API_BASE_URL}/reports/total-reports`, { headers }),
        // ← only fetch THIS user's reports
        userId
          ? fetch(`${API_BASE_URL}/reports/get-user-report/${userId}`, { headers })
          : Promise.resolve({ ok: false }),
        fetch(`${API_BASE_URL}/analytics/top-locations?period=weekly&limit=5`, { headers }),
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const d = await usersRes.value.json();
        setTotalUsers(d.totalUsers || 0);
      }
      if (reportsCountRes.status === 'fulfilled' && reportsCountRes.value.ok) {
        const d = await reportsCountRes.value.json();
        setTotalReports(d.totalReports || 0);
      }
      if (myReportsRes.status === 'fulfilled' && myReportsRes.value.ok) {
        const data = await myReportsRes.value.json();
        // get-user-report returns { reports: [...] }
        const list = data.reports || data || [];
        setRecentReports(list.slice(0, 5));
      }
      if (hotspotsRes.status === 'fulfilled' && hotspotsRes.value.ok) {
        const d = await hotspotsRes.value.json();
        setHotspots(d.topLocations || []);
      }
    } catch (e) {
      setFetchError('Could not load data. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => fetchData(true);

  // ── Quick actions ────────────────────────────────────────────
  const quickActions = [
    { icon: 'mic-outline',          label: 'Record',      color: C.red,    route: 'Record'        },
    { icon: 'map-outline',          label: 'Noise Map',   color: '#43A047', route: 'MapScreen'    },
    { icon: 'time-outline',         label: 'My History',  color: C.blue,   route: 'ReportHistory' },
    { icon: 'notifications-outline',label: 'Alerts',      color: C.gold,   route: 'Notifications' },
  ];

  // ── Dominant noise level for hotspot ────────────────────────
  const dominantLevel = (breakdown) => {
    if (!breakdown) return 'green';
    const order = ['critical', 'red', 'yellow', 'green'];
    for (const lvl of order) { if (breakdown[lvl] > 0) return lvl; }
    return 'green';
  };

  if (loading) return (
    <View style={s.loadingScreen}>
      <ActivityIndicator size="large" color={C.saddle} />
      <Text style={s.loadingText}>Loading...</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* ── Header ── */}
      <LinearGradient colors={[C.dark, C.saddle]} style={s.header}>
        <View style={{ paddingTop: SB_HEIGHT + 8, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={s.headerBtn}>
              <Ionicons name="menu" size={26} color={C.gold} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.headerGreeting}>Welcome back,</Text>
              <Text style={s.headerName} numberOfLines={1}>{userName || 'User'} 👋</Text>
            </View>
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('UserProfile')}>
              <Ionicons name="person-circle-outline" size={28} color={C.gold} />
            </TouchableOpacity>
          </View>

          {/* Stats row — admin only */}
          {['admin', 'administrator'].includes(userType?.toLowerCase()) && (
            <View style={s.headerStats}>
              <View style={s.headerStat}>
                <Text style={s.headerStatNum}>{totalUsers.toLocaleString()}</Text>
                <Text style={s.headerStatLabel}>Active Users</Text>
              </View>
              <View style={s.headerStatDivider} />
              <View style={s.headerStat}>
                <Text style={s.headerStatNum}>{totalReports.toLocaleString()}</Text>
                <Text style={s.headerStatLabel}>Total Reports</Text>
              </View>
              <View style={s.headerStatDivider} />
              <View style={s.headerStat}>
                <Text style={s.headerStatNum}>{recentReports.length}</Text>
                <Text style={s.headerStatLabel}>Recent</Text>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.saddle]} tintColor={C.saddle} />}
      >
        {fetchError && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={C.red} />
            <Text style={s.errorText}>{fetchError}</Text>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <FadeIn delay={0}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Quick Actions</Text>
            <View style={s.quickActionsGrid}>
              {quickActions.map((a, i) => (
                <TouchableOpacity key={i} style={s.quickActionCard} onPress={() => navigation.navigate(a.route)} activeOpacity={0.8}>
                  <View style={[s.quickActionIcon, { backgroundColor: a.color + '18' }]}>
                    <Ionicons name={a.icon} size={26} color={a.color} />
                  </View>
                  <Text style={s.quickActionLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* ── Recent Reports — user only ── */}
        {!['admin', 'administrator'].includes(userType?.toLowerCase()) && (
        <FadeIn delay={80}>
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>My Recent Reports</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ReportHistory')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {recentReports.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="document-text-outline" size={40} color="#CCC" />
                <Text style={s.emptyText}>No reports yet</Text>
                <Text style={s.emptySub}>Start recording to submit your first noise report</Text>
              </View>
            ) : (
              recentReports.map((r, i) => {
                const level = r.noiseLevel || 'green';
                const loc   = getLocationStr(r.location);
                const label = r.topDetection || r.aiSummary?.topDetection || r.reason || 'Noise Report';
                return (
                  <View key={r._id || i} style={s.reportCard}>
                    <View style={[s.reportIconWrap, { backgroundColor: LEVEL_BG[level] || '#F5F5F5' }]}>
                      <Ionicons name={getReasonIcon(label)} size={20} color={LEVEL_COLOR[level] || C.sub} />
                    </View>
                    <View style={s.reportInfo}>
                      <Text style={s.reportLabel} numberOfLines={1}>{label}</Text>
                      {loc && (
                        <Text style={s.reportLoc} numberOfLines={1}>
                          <Ionicons name="location-outline" size={11} color={C.muted} /> {loc}
                        </Text>
                      )}
                      {r.comment ? (
                        <Text style={s.reportComment} numberOfLines={1}>{r.comment}</Text>
                      ) : null}
                      <Text style={s.reportTime}>{formatTimeAgo(r.createdAt)}</Text>
                    </View>
                    <View style={s.reportRight}>
                      <View style={[s.levelBadge, { backgroundColor: LEVEL_BG[level] || '#F5F5F5' }]}>
                        <View style={[s.levelDot, { backgroundColor: LEVEL_COLOR[level] || C.sub }]} />
                        <Text style={[s.levelText, { color: LEVEL_COLOR[level] || C.sub }]}>{LEVEL_LABEL[level] || level}</Text>
                      </View>
                      {r.aiSummary?.averageDecibel != null && (
                        <Text style={s.dbText}>🔊 {r.aiSummary.averageDecibel} dB</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </FadeIn>
        )}

        {/* ── Noise Hotspots ── */}
        <FadeIn delay={160}>
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Noise Hotspots</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MapScreen')}>
                <Text style={s.seeAll}>View map</Text>
              </TouchableOpacity>
            </View>

            {hotspots.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="map-outline" size={40} color="#CCC" />
                <Text style={s.emptyText}>No hotspot data yet</Text>
                <Text style={s.emptySub}>Hotspots appear as reports accumulate</Text>
              </View>
            ) : (
              hotspots.map((h, i) => {
                const lvl = dominantLevel(h.noiseBreakdown);
                return (
                  <View key={i} style={s.hotspotCard}>
                    <View style={s.hotspotRank}>
                      <Text style={s.hotspotRankText}>#{h.rank || i + 1}</Text>
                    </View>
                    <View style={s.hotspotInfo}>
                      <Text style={s.hotspotLocation} numberOfLines={2}>{h.location}</Text>
                      <View style={s.hotspotMeta}>
                        <Ionicons name="document-text-outline" size={12} color={C.muted} />
                        <Text style={s.hotspotCount}>{h.count} report{h.count !== 1 ? 's' : ''}</Text>
                        {h.noiseBreakdown && Object.keys(h.noiseBreakdown).length > 0 && (
                          <View style={s.hotspotBreakdown}>
                            {Object.entries(h.noiseBreakdown).map(([lvl2, cnt]) => (
                              <View key={lvl2} style={[s.breakdownDot, { backgroundColor: LEVEL_COLOR[lvl2] || C.sub }]}>
                                <Text style={s.breakdownDotText}>{cnt}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={[s.hotspotBadge, { backgroundColor: LEVEL_BG[lvl] }]}>
                      <Text style={[s.hotspotBadgeText, { color: LEVEL_COLOR[lvl] }]}>{LEVEL_LABEL[lvl]}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </FadeIn>

        {/* ── How It Works ── */}
        <FadeIn delay={240}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>How It Works</Text>
            <View style={s.howCard}>
              {[
                { step: '1', icon: 'mic-outline',          color: C.red,    title: 'Record Noise',     desc: 'Capture audio evidence of noise disturbances with AI-powered analysis.' },
                { step: '2', icon: 'send-outline',         color: C.blue,   title: 'Submit Report',    desc: 'Report is tagged with your location and forwarded to barangay officials.' },
                { step: '3', icon: 'notifications-outline',color: C.gold,   title: 'Track Status',     desc: 'Receive real-time updates as officials respond to your complaint.' },
                { step: '4', icon: 'map-outline',          color: '#43A047',title: 'View Hotspots',    desc: 'Explore the community noise map and identify high-disturbance zones.' },
              ].map((item, i) => (
                <View key={i} style={s.howStep}>
                  <View style={[s.howStepCircle, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={18} color={C.white} />
                  </View>
                  {i < 3 && <View style={s.howConnector} />}
                  <View style={s.howStepContent}>
                    <Text style={s.howStepTitle}>{item.title}</Text>
                    <Text style={s.howStepDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* ── CTA ── */}
        <FadeIn delay={320}>
          <LinearGradient colors={[C.saddle, C.dark]} style={s.ctaCard}>
            <Ionicons name="mic-circle-outline" size={40} color={C.gold} />
            <Text style={s.ctaTitle}>Hear something disturbing?</Text>
            <Text style={s.ctaDesc}>Record and report it now. Help make your community quieter.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Record')} activeOpacity={0.85}>
              <Ionicons name="mic" size={18} color={C.saddle} />
              <Text style={s.ctaBtnText}>Start Recording</Text>
            </TouchableOpacity>
          </LinearGradient>
        </FadeIn>
      </ScrollView>

      {/* ── Drawer ── */}
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

      {/* ── Decibel AI Floating Button ── */}
      <TouchableOpacity style={s.fabChat} onPress={() => setChatVisible(true)} activeOpacity={0.85}>
        <LinearGradient colors={[C.gold, '#B8860B']} style={s.fabChatInner}>
          <Image
            source={require('../assets/AI.png')}
            style={s.fabChatImg}
            resizeMode="contain"
          />
        </LinearGradient>
        <View style={s.fabChatBadge}>
          <Text style={s.fabChatBadgeText}>AI</Text>
        </View>
      </TouchableOpacity>

      {/* ── Decibel AI Chat Modal ── */}
      <DecibelAI visible={chatVisible} onClose={() => setChatVisible(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  loadingScreen:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText:    { marginTop: 12, color: C.saddle, fontSize: 15 },

  // Header
  header:         {},
  headerTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerBtn:      { padding: 6 },
  headerGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerName:     { fontSize: 18, fontWeight: '800', color: C.white },
  headerStats:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8 },
  headerStat:     { flex: 1, alignItems: 'center' },
  headerStatNum:  { fontSize: 18, fontWeight: '800', color: C.white },
  headerStatLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  // Error
  errorBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', marginHorizontal: 16, marginTop: 12, borderRadius: 10, padding: 12 },
  errorText:      { flex: 1, fontSize: 13, color: C.red },

  // Section
  section:        { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { fontSize: 16, fontWeight: '800', color: C.dark, marginBottom: 12 },
  seeAll:         { fontSize: 13, color: C.saddle, fontWeight: '600' },

  // Quick actions
  quickActionsGrid: { flexDirection: 'row', gap: 10 },
  quickActionCard:  { flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 14, alignItems: 'center', elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  quickActionIcon:  { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 11, fontWeight: '700', color: C.dark, textAlign: 'center' },

  // Report cards
  reportCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, gap: 12 },
  reportIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  reportInfo:     { flex: 1 },
  reportLabel:    { fontSize: 14, fontWeight: '700', color: C.dark, marginBottom: 3 },
  reportLoc:      { fontSize: 11, color: C.muted, marginBottom: 2 },
  reportComment:  { fontSize: 11, color: C.sub, marginBottom: 2, fontStyle: 'italic' },
  reportTime:     { fontSize: 11, color: C.muted },
  reportRight:    { alignItems: 'flex-end', gap: 4 },
  levelBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  levelDot:       { width: 6, height: 6, borderRadius: 3 },
  levelText:      { fontSize: 10, fontWeight: '700' },
  dbText:         { fontSize: 10, color: C.muted },

  // Hotspot cards
  hotspotCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, gap: 12 },
  hotspotRank:    { width: 32, height: 32, borderRadius: 16, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  hotspotRankText:{ fontSize: 12, fontWeight: '800', color: C.white },
  hotspotInfo:    { flex: 1 },
  hotspotLocation:{ fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 4 },
  hotspotMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotspotCount:   { fontSize: 11, color: C.muted },
  hotspotBreakdown: { flexDirection: 'row', gap: 4 },
  breakdownDot:   { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  breakdownDotText: { fontSize: 9, color: C.white, fontWeight: '800' },
  hotspotBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  hotspotBadgeText: { fontSize: 10, fontWeight: '700' },

  // Empty state
  emptyCard:      { backgroundColor: C.white, borderRadius: 14, padding: 28, alignItems: 'center', elevation: 1 },
  emptyText:      { fontSize: 15, fontWeight: '600', color: '#999', marginTop: 10 },
  emptySub:       { fontSize: 12, color: '#BBB', marginTop: 4, textAlign: 'center' },

  // How it works
  howCard:        { backgroundColor: C.white, borderRadius: 16, padding: 18, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  howStep:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  howStepCircle:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  howConnector:   { position: 'absolute', left: 19, top: 40, width: 2, height: 28, backgroundColor: '#E8DDD0' },
  howStepContent: { flex: 1, paddingLeft: 14, paddingBottom: 28 },
  howStepTitle:   { fontSize: 14, fontWeight: '800', color: C.dark, marginBottom: 4 },
  howStepDesc:    { fontSize: 12, color: C.sub, lineHeight: 18 },

  // CTA
  ctaCard:        { marginHorizontal: 16, marginTop: 20, borderRadius: 20, padding: 28, alignItems: 'center', gap: 10 },
  ctaTitle:       { fontSize: 18, fontWeight: '800', color: C.white, textAlign: 'center' },
  ctaDesc:        { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 19 },
  ctaBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.gold, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30, marginTop: 6 },
  ctaBtnText:     { fontSize: 15, fontWeight: '800', color: C.saddle },

  // Drawer
  drawerWrap:     { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },

  // Decibel AI FAB
  fabChat:        { position: 'absolute', bottom: 28, right: 20, alignItems: 'center', justifyContent: 'center' },
  fabChatInner:   { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: C.dark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  fabChatImg:     { width: 38, height: 38, borderRadius: 19 },
  fabChatBadge:   { position: 'absolute', top: 0, right: 0, backgroundColor: C.saddle, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1.5, borderColor: C.white },
  fabChatBadgeText: { fontSize: 8, fontWeight: '900', color: C.white },
});
