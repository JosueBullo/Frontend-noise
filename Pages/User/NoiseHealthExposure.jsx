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
  dark:   '#3E2C23',
  saddle: '#8B4513',
  gold:   '#DAA520',
  cream:  '#FDF5E6',
  bg:     '#F5F0E8',
  white:  '#FFFFFF',
  text:   '#333333',
  muted:  '#A89070',
  green:  '#4CAF50',
  yellow: '#FFC107',
  red:    '#F44336',
  purple: '#9C27B0',
};

const LEVEL_COLOR = { green: C.green, yellow: '#F57F17', red: C.red, critical: C.purple };
const LEVEL_LABEL = { green: 'Low', yellow: 'Medium', red: 'High', critical: 'Critical' };

// ── Animated circular progress ────────────────────────────────────────────────
function CircularProgress({ percent, color, size = 160 }) {
  const anim = useRef(new Animated.Value(0)).current;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const capped = Math.min(percent, 100);

  useEffect(() => {
    Animated.timing(anim, { toValue: capped, duration: 1200, useNativeDriver: false }).start();
  }, [capped, anim]);

  const strokeDash = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, circumference],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background track */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 10, borderColor: '#E8DDD0',
      }} />
      {/* Foreground arc — simulated with a View rotation trick */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 10, borderColor: 'transparent',
        borderTopColor: color,
        transform: [{ rotate: `${(capped / 100) * 360 - 90}deg` }],
      }} />
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color }}>{Math.min(percent, 999)}%</Text>
        <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }}>of safe limit</Text>
      </View>
    </View>
  );
}

// ── Bar chart for daily breakdown ─────────────────────────────────────────────
function DailyBar({ day, maxDose }) {
  const anim = useRef(new Animated.Value(0)).current;
  const barH = 100;
  const pct  = maxDose > 0 ? Math.min(day.dose / Math.max(maxDose, 100), 1) : 0;
  const color = day.dose >= 100 ? C.purple : day.dose >= 75 ? C.red : day.dose >= 50 ? '#FF9800' : day.dose >= 25 ? C.yellow : C.green;

  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct, anim]);

  const h = anim.interpolate({ inputRange: [0, 1], outputRange: [0, barH] });

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 9, color: C.muted, marginBottom: 4, fontWeight: '600' }}>
        {day.dose > 0 ? `${day.dose}%` : ''}
      </Text>
      <View style={{ height: barH, justifyContent: 'flex-end', width: 22 }}>
        <Animated.View style={{ height: h, backgroundColor: color, borderRadius: 4, width: '100%' }} />
      </View>
      <Text style={{ fontSize: 10, color: C.muted, marginTop: 6, fontWeight: '700' }}>{day.label}</Text>
      {day.reports > 0 && (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.saddle, marginTop: 3 }} />
      )}
    </View>
  );
}

export default function NoiseHealthExposure({ navigation }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      const res = await fetch(`${API_BASE_URL}/health-exposure/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.warn('Health exposure fetch error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <View style={s.root}>
      <LinearGradient colors={[C.dark, C.saddle]} style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={openDrawer} style={s.headerBtn}>
            <Ionicons name="menu" size={26} color={C.gold} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Noise Health Exposure</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.saddle} />
        <Text style={{ marginTop: 12, color: C.saddle }}>Calculating your exposure...</Text>
      </View>
    </View>
  );

  const { summary, dailyBreakdown, noiseBreakdown, whoReference } = data || {};
  const maxDose = dailyBreakdown ? Math.max(...dailyBreakdown.map(d => d.dose), 100) : 100;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <LinearGradient colors={[C.dark, C.saddle]} style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={openDrawer} style={s.headerBtn}>
            <Ionicons name="menu" size={26} color={C.gold} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Noise Health Exposure</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={C.gold} />
          </TouchableOpacity>
        </View>
        <Text style={s.headerSub}>Weekly exposure based on your reports</Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[C.saddle]} tintColor={C.saddle} />}
      >
        {/* ── Main exposure card ── */}
        <View style={s.section}>
          <View style={[s.card, { alignItems: 'center', paddingVertical: 28 }]}>
            <CircularProgress
              percent={summary?.totalDose || 0}
              color={summary?.riskColor || C.green}
              size={170}
            />
            <View style={[s.riskBadge, { backgroundColor: summary?.riskBg || '#E8F5E9', marginTop: 20 }]}>
              <Ionicons name={summary?.riskIcon || 'checkmark-circle-outline'} size={18} color={summary?.riskColor || C.green} />
              <Text style={[s.riskLabel, { color: summary?.riskColor || C.green }]}>{summary?.riskLevel || 'Safe'}</Text>
            </View>
            <Text style={s.exposureNote}>
              {summary?.totalDose || 0}% of your weekly safe noise dose consumed
            </Text>
          </View>
        </View>

        {/* ── Health tip ── */}
        <View style={s.section}>
          <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: summary?.riskColor || C.green }]}>
            <Text style={s.cardTitle}>Health Advisory</Text>
            <Text style={s.tipText}>{summary?.healthTip}</Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={[s.section, { flexDirection: 'row', gap: 12 }]}>
          {[
            { label: 'Reports',   value: summary?.totalReports || 0,  icon: 'document-text-outline', unit: 'this week' },
            { label: 'Avg Level', value: summary?.avgDb ? `${summary.avgDb}` : '—', icon: 'volume-medium-outline', unit: 'dB avg' },
            { label: 'Peak',      value: summary?.maxDb ? `${summary.maxDb}` : '—', icon: 'trending-up-outline',   unit: 'dB max' },
          ].map((stat, i) => (
            <View key={i} style={[s.card, s.statCard]}>
              <Ionicons name={stat.icon} size={22} color={C.saddle} />
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
              <Text style={s.statUnit}>{stat.unit}</Text>
            </View>
          ))}
        </View>

        {/* ── Daily bar chart ── */}
        <View style={s.section}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Daily Exposure This Week</Text>
            <Text style={s.cardSub}>Percentage of safe daily limit consumed</Text>
            <View style={s.chartRow}>
              {dailyBreakdown?.map((day, i) => (
                <DailyBar key={i} day={day} maxDose={maxDose} />
              ))}
            </View>
            {/* Legend */}
            <View style={s.chartLegend}>
              {[
                { color: C.green,  label: 'Safe (<25%)' },
                { color: C.yellow, label: 'Low (25-50%)' },
                { color: '#FF9800',label: 'Moderate (50-75%)' },
                { color: C.red,    label: 'High (75-100%)' },
              ].map((l, i) => (
                <View key={i} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: l.color }]} />
                  <Text style={s.legendText}>{l.label}</Text>
                </View>
              ))}
            </View>
            {/* Safe limit line note */}
            <View style={s.limitNote}>
              <View style={s.limitLine} />
              <Text style={s.limitText}>100% = WHO safe limit</Text>
            </View>
          </View>
        </View>

        {/* ── Noise level breakdown ── */}
        {noiseBreakdown && Object.values(noiseBreakdown).some(v => v > 0) && (
          <View style={s.section}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Reports by Noise Level</Text>
              {Object.entries(noiseBreakdown).map(([level, count]) => {
                if (!count) return null;
                const total = Object.values(noiseBreakdown).reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? (count / total) * 100 : 0;
                return (
                  <View key={level} style={s.breakdownRow}>
                    <View style={[s.levelDot, { backgroundColor: LEVEL_COLOR[level] }]} />
                    <Text style={s.breakdownLabel}>{LEVEL_LABEL[level]}</Text>
                    <View style={s.breakdownBarWrap}>
                      <View style={[s.breakdownBar, { width: `${pct}%`, backgroundColor: LEVEL_COLOR[level] }]} />
                    </View>
                    <Text style={s.breakdownCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── WHO Reference ── */}
        <View style={s.section}>
          <View style={[s.card, { backgroundColor: '#EEF7FF', borderWidth: 1, borderColor: '#BBDEFB' }]}>
            <View style={s.whoHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#1976D2" />
              <Text style={[s.cardTitle, { color: '#1976D2', marginBottom: 0 }]}>WHO Noise Standards</Text>
            </View>
            <Text style={s.whoText}>
              • Max 85 dB for 8 hours/day (occupational){'\n'}
              • 53 dB daytime limit for residential areas{'\n'}
              • 45 dB nighttime limit for residential areas{'\n'}
              • Every 3 dB increase halves safe exposure time
            </Text>
            <Text style={s.whoSource}>Source: WHO Environmental Noise Guidelines, NIOSH</Text>
          </View>
        </View>

        {/* ── No data state ── */}
        {summary?.totalReports === 0 && (
          <View style={s.section}>
            <View style={[s.card, { alignItems: 'center', paddingVertical: 28 }]}>
              <Ionicons name="mic-off-outline" size={48} color="#CCC" />
              <Text style={s.emptyTitle}>No reports this week</Text>
              <Text style={s.emptySub}>Submit noise reports to track your exposure</Text>
              <TouchableOpacity style={s.recordBtn} onPress={() => navigation.navigate('Record')}>
                <Ionicons name="mic" size={16} color={C.white} />
                <Text style={s.recordBtnText}>Record Noise</Text>
              </TouchableOpacity>
            </View>
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
  root:           { flex: 1, backgroundColor: C.bg },

  // Header
  header:         { paddingTop: SB + 8, paddingHorizontal: 20, paddingBottom: 16 },
  headerInner:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerBtn:      { padding: 6 },
  headerTitle:    { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub:      { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  // Cards
  section:        { paddingHorizontal: 16, paddingTop: 16 },
  card:           { backgroundColor: C.white, borderRadius: 16, padding: 18, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  cardTitle:      { fontSize: 15, fontWeight: '800', color: C.dark, marginBottom: 6 },
  cardSub:        { fontSize: 12, color: C.muted, marginBottom: 16 },

  // Risk badge
  riskBadge:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  riskLabel:      { fontSize: 15, fontWeight: '800' },
  exposureNote:   { fontSize: 12, color: C.muted, marginTop: 10, textAlign: 'center' },

  // Health tip
  tipText:        { fontSize: 14, color: C.text, lineHeight: 22 },

  // Stat cards
  statCard:       { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statValue:      { fontSize: 22, fontWeight: '900', color: C.dark, marginTop: 6 },
  statLabel:      { fontSize: 12, fontWeight: '700', color: C.saddle },
  statUnit:       { fontSize: 10, color: C.muted },

  // Chart
  chartRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 8, marginBottom: 16 },
  chartLegend:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendText:     { fontSize: 10, color: C.muted },
  limitNote:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitLine:      { flex: 1, height: 1, backgroundColor: C.red, borderStyle: 'dashed' },
  limitText:      { fontSize: 10, color: C.red, fontWeight: '600' },

  // Breakdown
  breakdownRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  levelDot:       { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  breakdownLabel: { fontSize: 12, color: C.text, width: 55, fontWeight: '600' },
  breakdownBarWrap: { flex: 1, height: 10, backgroundColor: '#F0EBE3', borderRadius: 5, overflow: 'hidden' },
  breakdownBar:   { height: '100%', borderRadius: 5 },
  breakdownCount: { fontSize: 12, color: C.muted, width: 20, textAlign: 'right', fontWeight: '700' },

  // WHO
  whoHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  whoText:        { fontSize: 13, color: '#1565C0', lineHeight: 22 },
  whoSource:      { fontSize: 10, color: '#90CAF9', marginTop: 8, fontStyle: 'italic' },

  // Empty
  emptyTitle:     { fontSize: 16, fontWeight: '700', color: '#999', marginTop: 12 },
  emptySub:       { fontSize: 13, color: '#BBB', marginTop: 4, textAlign: 'center' },
  recordBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.saddle, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 16 },
  recordBtnText:  { color: C.white, fontWeight: '700', fontSize: 14 },

  // Drawer
  drawerWrap:     { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },
});
