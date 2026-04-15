import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions,
  Platform, Animated, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../utils/api';
import CustomDrawer from '../CustomDrawer';

const { width } = Dimensions.get('window');
const SB = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const C = {
  dark: '#3E2C23', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', bg: '#F5F0E8', white: '#FFFFFF',
  text: '#333', muted: '#A89070',
  green: '#4CAF50', yellow: '#FFC107', red: '#F44336', purple: '#9C27B0', blue: '#2196F3',
};

const LEVEL_COLOR = { green: C.green, yellow: '#F57F17', red: C.red, critical: C.purple };
const STATUS_COLOR = { pending: '#999', monitoring: C.yellow, action_required: C.red, resolved: C.green };

const PERIODS = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'yearly', label: 'This Year' },
];

function StatCard({ title, value, icon, color }) {
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <View style={[s.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statLabel}>{title}</Text>
      <Text style={[s.statVal, { color }]}>{value ?? 0}</Text>
    </View>
  );
}

function BarRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
  }, [pct, anim]);
  const w = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={s.barRow}>
      <View style={[s.barDot, { backgroundColor: color }]} />
      <Text style={s.barLabel} numberOfLines={1}>{label}</Text>
      <View style={s.barTrack}>
        <Animated.View style={[s.barFill, { width: w, backgroundColor: color }]} />
      </View>
      <Text style={s.barCount}>{count}</Text>
      <Text style={[s.barPct, { color }]}>{pct}%</Text>
    </View>
  );
}

export default function PersonalAnalytics({ navigation }) {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod]         = useState('weekly');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

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

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/analytics/user/personal?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) { console.warn('Personal analytics error:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const periodLabel = PERIODS.find(p => p.id === period)?.label || 'This Week';
  const summary = data?.summary || {};
  const totalForBars = summary.periodReports || 1;

  if (loading) return (
    <View style={s.root}>
      <LinearGradient colors={[C.dark, C.saddle]} style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={openDrawer} style={s.headerBtn}>
            <Ionicons name="menu" size={26} color={C.gold} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Analytics</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.saddle} />
        <Text style={{ marginTop: 10, color: C.saddle }}>Loading your analytics...</Text>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <LinearGradient colors={[C.dark, C.saddle]} style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={openDrawer} style={s.headerBtn}>
            <Ionicons name="menu" size={26} color={C.gold} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Analytics</Text>
          <TouchableOpacity onPress={() => fetchData(true)} style={s.headerBtn}>
            <Ionicons name="refresh-outline" size={22} color={C.gold} />
          </TouchableOpacity>
        </View>
        <Text style={s.headerSub}>Your personal noise reporting stats</Text>

        {/* Period selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[s.periodPill, period === p.id && s.periodPillActive]}
              onPress={() => setPeriod(p.id)}
            >
              <Text style={[s.periodPillText, period === p.id && s.periodPillTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[C.saddle]} tintColor={C.saddle} />}
      >
        {/* Stat cards */}
        <View style={s.statsGrid}>
          <StatCard title="Total Reports"  value={summary.totalReports}    icon="document-text-outline"    color={C.saddle} />
          <StatCard title={`${periodLabel} Reports`} value={summary.periodReports} icon="bar-chart-outline" color={C.gold} />
          <StatCard title="Resolved"       value={summary.resolvedCount}   icon="checkmark-circle-outline" color={C.green} />
          <StatCard title="Pending"        value={summary.pendingCount}    icon="time-outline"             color="#999" />
          {summary.avgDecibel != null && <StatCard title="Avg Decibel" value={`${summary.avgDecibel} dB`} icon="volume-high-outline" color={C.blue} />}
          {summary.reportableCount > 0 && <StatCard title="Reportable" value={summary.reportableCount} icon="alert-circle-outline" color={C.red} />}
        </View>

        {/* Resolution rate */}
        {summary.periodReports > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="analytics-outline" size={16} color={C.saddle} />
              <Text style={s.cardTitle}>Resolution Rate</Text>
              <Text style={[s.cardBadge, { color: summary.resolutionRate >= 80 ? C.green : summary.resolutionRate >= 50 ? C.yellow : C.red }]}>
                {summary.resolutionRate}%
              </Text>
            </View>
            <View style={s.rateBarTrack}>
              <View style={[s.rateBarFill, {
                width: `${summary.resolutionRate}%`,
                backgroundColor: summary.resolutionRate >= 80 ? C.green : summary.resolutionRate >= 50 ? C.yellow : C.red,
              }]} />
            </View>
            <Text style={s.rateNote}>
              {summary.resolvedCount} of {summary.periodReports} reports resolved {periodLabel.toLowerCase()}
            </Text>
          </View>
        )}

        {/* Report status breakdown */}
        {data?.reportStatus?.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="pie-chart-outline" size={16} color={C.saddle} />
              <Text style={s.cardTitle}>Report Status</Text>
            </View>
            {data.reportStatus.map((st, i) => (
              <BarRow
                key={i}
                label={st.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                count={st.count}
                total={totalForBars}
                color={STATUS_COLOR[st.status] || '#999'}
              />
            ))}
          </View>
        )}

        {/* Noise level breakdown */}
        {data?.noiseLevels?.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="volume-high-outline" size={16} color={C.saddle} />
              <Text style={s.cardTitle}>Noise Levels Reported</Text>
            </View>
            {data.noiseLevels.map((n, i) => (
              <BarRow
                key={i}
                label={n.level.charAt(0).toUpperCase() + n.level.slice(1)}
                count={n.count}
                total={totalForBars}
                color={LEVEL_COLOR[n.level] || C.muted}
              />
            ))}
          </View>
        )}

        {/* Top categories */}
        {data?.topCategories?.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="musical-notes-outline" size={16} color={C.saddle} />
              <Text style={s.cardTitle}>Top Noise Types You Reported</Text>
            </View>
            {data.topCategories.map((c, i) => (
              <BarRow
                key={i}
                label={c.name}
                count={c.count}
                total={data.topCategories[0]?.count || 1}
                color={C.saddle}
              />
            ))}
          </View>
        )}

        {/* Report trend */}
        {data?.trend && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="trending-up-outline" size={16} color={C.saddle} />
              <Text style={s.cardTitle}>Report Trend — {periodLabel}</Text>
            </View>
            <View style={s.trendChart}>
              {data.trend.data.map((val, i) => {
                const maxVal = Math.max(...data.trend.data, 1);
                const h = Math.max((val / maxVal) * 80, val > 0 ? 4 : 0);
                return (
                  <View key={i} style={s.trendCol}>
                    <View style={[s.trendBar, { height: h, backgroundColor: val > 0 ? C.saddle : '#EEE' }]} />
                    {data.trend.labels.length <= 12 && (
                      <Text style={s.trendLabel} numberOfLines={1}>{data.trend.labels[i]}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty state */}
        {summary.periodReports === 0 && (
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={52} color="#CCC" />
            <Text style={s.emptyTitle}>No reports {periodLabel.toLowerCase()}</Text>
            <Text style={s.emptySub}>Submit a noise report to see your analytics here</Text>
            <TouchableOpacity style={s.recordBtn} onPress={() => navigation.navigate('Record')}>
              <Ionicons name="mic" size={16} color={C.white} />
              <Text style={s.recordBtnText}>Record Noise</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
  header:       { paddingTop: SB + 8, paddingHorizontal: 16, paddingBottom: 16 },
  headerInner:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerBtn:    { padding: 6 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  periodPill:   { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
  periodPillActive: { backgroundColor: C.gold },
  periodPillText:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  periodPillTextActive: { color: C.dark, fontWeight: '800' },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard:     { width: (width - 38) / 2, backgroundColor: C.white, borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  statIcon:     { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel:    { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 4 },
  statVal:      { fontSize: 22, fontWeight: '900' },
  card:         { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: C.dark, flex: 1 },
  cardBadge:    { fontSize: 16, fontWeight: '900' },
  rateBarTrack: { height: 10, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  rateBarFill:  { height: '100%', borderRadius: 5 },
  rateNote:     { fontSize: 11, color: C.muted },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barDot:       { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  barLabel:     { fontSize: 12, color: C.text, width: 90, fontWeight: '600' },
  barTrack:     { flex: 1, height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4 },
  barCount:     { fontSize: 12, color: C.muted, width: 24, textAlign: 'right', fontWeight: '700' },
  barPct:       { fontSize: 11, fontWeight: '700', width: 34, textAlign: 'right' },
  trendChart:   { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
  trendCol:     { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  trendBar:     { width: '80%', borderRadius: 3, minHeight: 2 },
  trendLabel:   { fontSize: 8, color: C.muted, marginTop: 4 },
  empty:        { alignItems: 'center', paddingVertical: 40 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#999', marginTop: 12 },
  emptySub:     { fontSize: 13, color: '#BBB', textAlign: 'center', marginTop: 4 },
  recordBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.saddle, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 16 },
  recordBtnText:{ color: C.white, fontWeight: '700', fontSize: 14 },
  drawerWrap:   { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },
});
