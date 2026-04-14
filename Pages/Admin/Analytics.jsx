import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, ActivityIndicator, Dimensions, Animated, Easing,
  Modal, RefreshControl, Alert, TextInput, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark: '#3E2C23', mid: '#5D4A36', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', bg: '#F5F0E8', white: '#FFFFFF',
  green: '#4CAF50', yellow: '#FFC107', red: '#F44336', purple: '#9C27B0', blue: '#2196F3',
  text: '#333333', sub: '#8B7355',
};

const noiseLevelColor = (l) => ({ green: C.green, yellow: C.yellow, red: C.red, critical: C.purple }[l] || C.sub);

const Analytics = () => {
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [fetchError,    setFetchError]    = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [dashboardData, setDashboardData] = useState(null);
  const [aiSummary,     setAiSummary]     = useState(null);
  const [topLocations,  setTopLocations]  = useState([]);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [emailModal,    setEmailModal]    = useState(false);
  const [emailInput,    setEmailInput]    = useState('');
  const [emailStatus,   setEmailStatus]   = useState(null);

  const periods = [
    { id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' }, { id: 'yearly', label: 'Yearly' },
  ];

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

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setFetchError(null);
      const token = await AsyncStorage.getItem('userToken');
      const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [dashRes, aiRes, locRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/dashboard?period=${selectedPeriod}`, { headers: h }),
        fetch(`${API_BASE_URL}/analytics/ai-summary?period=${selectedPeriod}`, { headers: h }),
        fetch(`${API_BASE_URL}/analytics/top-locations?period=${selectedPeriod}&limit=5`, { headers: h }),
      ]);

      if (!dashRes.ok) throw new Error(`HTTP ${dashRes.status}`);
      const data = await dashRes.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      setDashboardData(data);

      if (aiRes.ok) { const ai = await aiRes.json(); if (ai.success) setAiSummary(ai); }
      if (locRes.ok) { const loc = await locRes.json(); if (loc.success) setTopLocations(loc.topLocations || []); }
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getPeriodTitle = () => selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);

  // ── Build summary text ─────────────────────────────────────
  const buildSummary = () => {
    const u  = dashboardData?.userStats   || {};
    const r  = dashboardData?.reportStats || {};
    const cats = dashboardData?.noiseCategories || [];
    const ai = aiSummary?.summary || {};
    const periodReports = r.periodReports  || 0;
    const resolved      = r.resolvedReports || 0;
    const resRate       = periodReports > 0 ? Math.round((resolved / periodReports) * 100) : 0;
    const dominant      = [...(r.noiseLevels || [])].sort((a, b) => b.count - a.count)[0];
    const topCat        = [...cats].sort((a, b) => b.count - a.count)[0];

    let s = `During the ${getPeriodTitle()} period, NoiseWatch recorded ${periodReports} report${periodReports !== 1 ? 's' : ''} out of ${r.totalReports || 0} total. `;
    s += `The platform has ${u.totalUsers || 0} users, with ${u.newUsers || 0} new and ${u.activeUsers || 0} active this period. `;
    if (periodReports > 0) {
      s += `${resolved} reports were resolved (${resRate}% resolution rate). `;
      if (dominant) s += `Most prevalent noise level: ${dominant.level} (${dominant.count} reports). `;
      if (topCat)   s += `Top category: ${topCat.name} (${topCat.count} reports). `;
    }
    if (ai.avgDecibel)  s += `Avg AI-detected noise: ${ai.avgDecibel} dB. `;
    if (aiSummary?.topDetections?.[0]) s += `Top detection: "${aiSummary.topDetections[0].detection}". `;
    return s;
  };

  // ── Build conclusion ───────────────────────────────────────
  const buildConclusion = () => {
    const r    = dashboardData?.reportStats || {};
    const cats = dashboardData?.noiseCategories || [];
    const ai   = aiSummary?.summary || {};
    const periodReports = r.periodReports  || 0;
    const resolved      = r.resolvedReports || 0;
    const resRate       = periodReports > 0 ? Math.round((resolved / periodReports) * 100) : 0;
    const critical      = (r.noiseLevels || []).find(n => n.level === 'critical')?.count || 0;
    const pending       = (r.reportStatus || []).find(s => s.status === 'pending')?.count || 0;
    const actionReq     = (r.reportStatus || []).find(s => s.status === 'action_required')?.count || 0;
    const topCat        = [...cats].sort((a, b) => b.count - a.count)[0];
    const actions = [], observations = [];

    if (critical > 0)   actions.push(`URGENT: ${critical} critical noise report${critical > 1 ? 's' : ''} require immediate investigation.`);
    if (actionReq > 0)  actions.push(`${actionReq} report${actionReq > 1 ? 's' : ''} marked "Action Required" must be addressed.`);
    if (periodReports > 0 && resRate < 50) actions.push(`Resolution rate is critically low at ${resRate}%. Prioritize the ${pending} pending report${pending !== 1 ? 's' : ''}.`);
    else if (periodReports > 0 && resRate < 80) actions.push(`Resolution rate is ${resRate}%. Consider clearing ${pending} pending report${pending !== 1 ? 's' : ''}.`);
    if ((ai.avgDecibel || 0) >= 80) actions.push(`Avg AI noise level is ${ai.avgDecibel} dB — exceeds safe thresholds. Enforcement recommended.`);
    if (topCat && topCat.count > 1) actions.push(`"${topCat.name}" is the top category (${topCat.count} reports). Consider targeted awareness.`);

    if (resRate >= 80 && periodReports > 0) observations.push(`Strong ${resRate}% resolution rate — effective noise management.`);
    if (periodReports === 0) observations.push(`No reports this period — community noise appears stable.`);
    if (critical === 0 && periodReports > 0) observations.push(`No critical-level reports — noise levels remain manageable.`);

    return { actions, observations };
  };

  // ── Generate & share PDF ───────────────────────────────────
  const generateHTML = () => {
    const u  = dashboardData?.userStats   || {};
    const r  = dashboardData?.reportStats || {};
    const cats = dashboardData?.noiseCategories || [];
    const ai = aiSummary?.summary || {};
    const { actions, observations } = buildConclusion();
    const periodReports = r.periodReports || 0;
    const resRate = periodReports > 0 ? Math.round(((r.resolvedReports || 0) / periodReports) * 100) : 0;
    const max = topLocations[0]?.count || 1;

    const statsHTML = [
      ['Total Users', u.totalUsers || 0], ['Active Users', u.activeUsers || 0],
      ['New Users', u.newUsers || 0], ['Period Reports', r.periodReports || 0],
      ['Total Reports', r.totalReports || 0], ['Resolved', r.resolvedReports || 0],
      ...(ai.totalAiReports ? [['AI Analyzed', ai.totalAiReports]] : []),
      ...(ai.avgDecibel ? [['Avg Decibel', `${ai.avgDecibel} dB`]] : []),
    ].map(([k, v]) => `<div class="stat"><div class="stat-label">${k}</div><div class="stat-val">${v}</div></div>`).join('');

    const noiseLevelsHTML = (r.noiseLevels || []).map(n =>
      `<tr><td style="color:${noiseLevelColor(n.level)};font-weight:700">${n.level?.charAt(0).toUpperCase() + n.level?.slice(1)}</td><td>${n.count}</td><td>${Math.round(n.percentage || 0)}%</td></tr>`
    ).join('');

    const statusHTML = (r.reportStatus || []).map(s =>
      `<tr><td>${s.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</td><td>${s.count}</td><td>${Math.round(s.percentage || 0)}%</td></tr>`
    ).join('');

    const catsHTML = cats.slice(0, 10).map((c, i) =>
      `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.count}</td></tr>`
    ).join('');

    const locHTML = topLocations.map((loc, i) =>
      `<tr><td style="font-weight:700;color:${i === 0 ? '#F44336' : i === 1 ? '#8B4513' : '#DAA520'}">#${i + 1}</td><td>${loc.location}</td><td>${loc.count}</td><td>${Math.round((loc.count / max) * 100)}%</td></tr>`
    ).join('');

    const aiDetHTML = (aiSummary?.topDetections || []).map(d => `<tr><td>${d.detection}</td><td>${d.count}</td></tr>`).join('');
    const aiDistHTML = (aiSummary?.distanceDistribution || []).map(d => `<tr><td>${d.category}</td><td>${d.count}</td></tr>`).join('');

    const actionsHTML = actions.map((a, i) => `<li>${i + 1}. ${a}</li>`).join('');
    const obsHTML = observations.map(o => `<li>${o}</li>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:0;padding:0;background:#F5F0E8;color:#333}
      .header{background:linear-gradient(135deg,#3E2C23,#5D4A36);color:#FDF5E6;padding:28px 24px;display:flex;align-items:center;gap:16px}
      .header h1{margin:0;font-size:20px;letter-spacing:1px}
      .header p{margin:4px 0 0;color:#DAA520;font-size:12px}
      .gold-bar{height:4px;background:#DAA520}
      .body{padding:20px}
      .section-head{background:#5D4A36;color:#FDF5E6;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:700;margin:18px 0 10px}
      .summary-box{background:#FDF5E6;border:1.5px solid #DAA520;border-left:4px solid #DAA520;border-radius:6px;padding:14px;font-size:12px;line-height:1.7;color:#333}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:4px}
      .stat{background:#fff;border-radius:8px;padding:12px;border-left:3px solid #8B4513}
      .stat-label{font-size:10px;color:#8B7355;margin-bottom:4px}
      .stat-val{font-size:20px;font-weight:800;color:#3E2C23}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#8B4513;color:#fff;padding:8px;text-align:left}
      td{padding:7px 8px;border-bottom:1px solid #EEE}
      tr:nth-child(even) td{background:#FDF5E6}
      .actions-box{background:#FFEBEE;border:1.5px solid #F44336;border-left:4px solid #F44336;border-radius:6px;padding:14px;margin-bottom:10px}
      .actions-box h4{color:#C62828;margin:0 0 8px;font-size:13px}
      .actions-box li{font-size:12px;color:#333;margin-bottom:4px}
      .obs-box{background:#E8F5E9;border:1.5px solid #4CAF50;border-left:4px solid #4CAF50;border-radius:6px;padding:14px}
      .obs-box h4{color:#2E7D32;margin:0 0 8px;font-size:13px}
      .obs-box li{font-size:12px;color:#333;margin-bottom:4px}
      .footer{background:#3E2C23;color:#DAA520;text-align:center;padding:12px;font-size:10px;margin-top:20px}
    </style></head><body>
    <div class="header">
      <div>
        <h1>NOISEWATCH ANALYTICS REPORT</h1>
        <p>Period: ${getPeriodTitle()} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
      </div>
    </div>
    <div class="gold-bar"></div>
    <div class="body">
      <div class="section-head">EXECUTIVE SUMMARY</div>
      <div class="summary-box">${buildSummary()}</div>

      <div class="section-head">KEY STATISTICS</div>
      <div class="stats">${statsHTML}</div>

      ${noiseLevelsHTML ? `<div class="section-head">NOISE LEVEL BREAKDOWN</div>
      <table><tr><th>Level</th><th>Count</th><th>Percentage</th></tr>${noiseLevelsHTML}</table>` : ''}

      ${statusHTML ? `<div class="section-head">REPORT STATUS</div>
      <table><tr><th>Status</th><th>Count</th><th>Percentage</th></tr>${statusHTML}</table>` : ''}

      ${catsHTML ? `<div class="section-head">TOP NOISE CATEGORIES</div>
      <table><tr><th>#</th><th>Category</th><th>Reports</th></tr>${catsHTML}</table>` : ''}

      ${locHTML ? `<div class="section-head">TOP 5 MOST REPORTED LOCATIONS</div>
      <table><tr><th>Rank</th><th>Location (Street, City)</th><th>Reports</th><th>Share</th></tr>${locHTML}</table>` : ''}

      ${aiDetHTML ? `<div class="section-head">AI ANALYSIS — TOP DETECTIONS</div>
      <table><tr><th>Detection</th><th>Count</th></tr>${aiDetHTML}</table>` : ''}

      ${aiDistHTML ? `<div class="section-head">AI ANALYSIS — DISTANCE DISTRIBUTION</div>
      <table><tr><th>Category</th><th>Count</th></tr>${aiDistHTML}</table>` : ''}

      <div class="section-head">CONCLUSION & RECOMMENDED ACTIONS</div>
      ${actions.length ? `<div class="actions-box"><h4>IMMEDIATE ACTIONS REQUIRED</h4><ul>${actionsHTML}</ul></div>` : ''}
      ${observations.length ? `<div class="obs-box"><h4>POSITIVE OBSERVATIONS</h4><ul>${obsHTML}</ul></div>` : ''}
    </div>
    <div class="footer">NoiseWatch Admin System — Confidential &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</div>
    </body></html>`;
  };

  const handleDownloadPDF = async () => {
    if (!dashboardData) return;
    setPdfLoading(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: generateHTML(), base64: false });
      const filename = `NoiseWatch_Analytics_${getPeriodTitle()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const dest = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Save / Share Analytics Report' });
      } else {
        Alert.alert('Saved', `Report saved to: ${dest}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF: ' + e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!dashboardData || !emailInput.trim()) return;
    setPdfLoading(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: generateHTML(), base64: false });
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/analytics/send-report-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          to: emailInput.trim(),
          pdfBase64: b64,
          periodTitle: getPeriodTitle(),
          summary: {
            Period: getPeriodTitle(),
            'Total Users': dashboardData?.userStats?.totalUsers || 0,
            'Period Reports': dashboardData?.reportStats?.periodReports || 0,
            'Total Reports': dashboardData?.reportStats?.totalReports || 0,
            Resolved: dashboardData?.reportStats?.resolvedReports || 0,
          },
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed');
      setEmailStatus({ type: 'success', msg: `Report sent to ${emailInput.trim()}` });
    } catch (e) {
      setEmailStatus({ type: 'error', msg: e.message || 'Failed to send email.' });
    } finally {
      setPdfLoading(false);
      setEmailModal(false);
      setEmailInput('');
      setTimeout(() => setEmailStatus(null), 5000);
    }
  };

  // ── Render helpers ─────────────────────────────────────────
  const SectionHead = ({ title, icon }) => (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={16} color={C.saddle} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={[styles.statVal, { color }]}>{value ?? 0}</Text>
    </View>
  );

  const renderStats = () => {
    const u = dashboardData?.userStats   || {};
    const r = dashboardData?.reportStats || {};
    const ai = aiSummary?.summary || {};
    return (
      <View style={styles.statsGrid}>
        <StatCard title="Total Users"    value={u.totalUsers}      icon="people-outline"           color={C.saddle} />
        <StatCard title="Active Users"   value={u.activeUsers}     icon="person-outline"           color={C.gold}   />
        <StatCard title="New Users"      value={u.newUsers}        icon="person-add-outline"       color={C.mid}    />
        <StatCard title="Period Reports" value={r.periodReports}   icon="document-text-outline"    color={C.saddle} />
        <StatCard title="Total Reports"  value={r.totalReports}    icon="bar-chart-outline"        color={C.mid}    />
        <StatCard title="Resolved"       value={r.resolvedReports} icon="checkmark-circle-outline" color={C.green}  />
        {ai.totalAiReports > 0 && <StatCard title="AI Analyzed" value={ai.totalAiReports} icon="hardware-chip-outline" color={C.purple} />}
        {ai.avgDecibel > 0     && <StatCard title="Avg Decibel" value={`${ai.avgDecibel} dB`} icon="volume-high-outline" color={C.blue} />}
      </View>
    );
  };

  const renderNoiseLevels = () => {
    const levels = dashboardData?.reportStats?.noiseLevels || [];
    if (!levels.length) return null;
    return (
      <View style={styles.card}>
        <SectionHead title="Noise Level Breakdown" icon="volume-high-outline" />
        {levels.map((n, i) => (
          <View key={i} style={styles.levelRow}>
            <View style={[styles.dot, { backgroundColor: noiseLevelColor(n.level) }]} />
            <Text style={styles.levelName}>{n.level?.charAt(0).toUpperCase() + n.level?.slice(1)}</Text>
            <View style={styles.barWrap}>
              <View style={[styles.bar, { width: `${n.percentage || 0}%`, backgroundColor: noiseLevelColor(n.level) }]} />
            </View>
            <Text style={styles.levelCount}>{n.count}</Text>
            <Text style={[styles.levelPct, { color: noiseLevelColor(n.level) }]}>{Math.round(n.percentage || 0)}%</Text>
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
        <SectionHead title="Report Status" icon="pie-chart-outline" />
        {statuses.map((s, i) => (
          <View key={i} style={styles.levelRow}>
            <View style={[styles.dot, { backgroundColor: s.color || C.sub }]} />
            <Text style={styles.levelName}>{s.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
            <View style={styles.barWrap}>
              <View style={[styles.bar, { width: `${s.percentage || 0}%`, backgroundColor: s.color || C.sub }]} />
            </View>
            <Text style={styles.levelCount}>{s.count}</Text>
            <Text style={[styles.levelPct, { color: s.color || C.sub }]}>{Math.round(s.percentage || 0)}%</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCategories = () => {
    const cats = dashboardData?.noiseCategories || [];
    if (!cats.length) return null;
    const max = cats[0]?.count || 1;
    return (
      <View style={styles.card}>
        <SectionHead title="Top Noise Categories" icon="musical-notes-outline" />
        {cats.slice(0, 8).map((c, i) => (
          <View key={i} style={styles.levelRow}>
            <View style={[styles.dot, { backgroundColor: c.color || C.saddle }]} />
            <Text style={[styles.levelName, { width: 110 }]} numberOfLines={1}>{c.name}</Text>
            <View style={styles.barWrap}>
              <View style={[styles.bar, { width: `${Math.round((c.count / max) * 100)}%`, backgroundColor: c.color || C.saddle }]} />
            </View>
            <Text style={styles.levelCount}>{c.count}</Text>
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
        <SectionHead title="Top 5 Reported Locations" icon="location-outline" />
        {topLocations.map((loc, i) => (
          <View key={i} style={styles.locRow}>
            <View style={[styles.locRank, { backgroundColor: rankColors[i] }]}>
              <Text style={styles.locRankText}>#{i + 1}</Text>
            </View>
            <View style={styles.locInfo}>
              <Text style={styles.locName} numberOfLines={2}>{loc.location}</Text>
              <View style={styles.barWrap}>
                <View style={[styles.bar, { width: `${Math.round((loc.count / max) * 100)}%`, backgroundColor: rankColors[i] }]} />
              </View>
            </View>
            <Text style={styles.locCount}>{loc.count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAI = () => {
    if (!aiSummary?.topDetections?.length && !aiSummary?.distanceDistribution?.length) return null;
    return (
      <View style={styles.card}>
        <SectionHead title="AI Analysis" icon="hardware-chip-outline" />
        {aiSummary?.topDetections?.length > 0 && (
          <>
            <Text style={styles.subHead}>Top Detections</Text>
            {aiSummary.topDetections.map((d, i) => (
              <View key={i} style={styles.levelRow}>
                <Text style={[styles.levelName, { width: 'auto', flex: 1 }]} numberOfLines={1}>{d.detection}</Text>
                <Text style={styles.levelCount}>{d.count}</Text>
              </View>
            ))}
          </>
        )}
        {aiSummary?.distanceDistribution?.length > 0 && (
          <>
            <Text style={[styles.subHead, { marginTop: 10 }]}>Distance Distribution</Text>
            {aiSummary.distanceDistribution.map((d, i) => (
              <View key={i} style={styles.levelRow}>
                <Text style={[styles.levelName, { width: 'auto', flex: 1 }]}>{d.category}</Text>
                <Text style={styles.levelCount}>{d.count}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  const renderSummaryBox = () => (
    <View style={styles.summaryBox}>
      <SectionHead title="Executive Summary" icon="document-text-outline" />
      <Text style={styles.summaryText}>{buildSummary()}</Text>
    </View>
  );

  const renderConclusion = () => {
    const { actions, observations } = buildConclusion();
    return (
      <>
        {actions.length > 0 && (
          <View style={styles.actionsBox}>
            <View style={styles.actionsHeader}>
              <Ionicons name="alert-circle-outline" size={16} color="#C62828" />
              <Text style={styles.actionsTitle}>IMMEDIATE ACTIONS REQUIRED</Text>
            </View>
            {actions.map((a, i) => (
              <Text key={i} style={styles.actionItem}>{i + 1}. {a}</Text>
            ))}
          </View>
        )}
        {observations.length > 0 && (
          <View style={styles.obsBox}>
            <View style={styles.actionsHeader}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#2E7D32" />
              <Text style={styles.obsTitle}>POSITIVE OBSERVATIONS</Text>
            </View>
            {observations.map((o, i) => (
              <Text key={i} style={styles.obsItem}>• {o}</Text>
            ))}
          </View>
        )}
      </>
    );
  };

  // ── Email modal ────────────────────────────────────────────
  const renderEmailModal = () => (
    <Modal visible={emailModal} transparent animationType="slide" onRequestClose={() => setEmailModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.emailModal}>
          <View style={styles.emailModalHeader}>
            <Ionicons name="mail-outline" size={22} color={C.saddle} />
            <Text style={styles.emailModalTitle}>Send Analytics Report</Text>
            <TouchableOpacity onPress={() => setEmailModal(false)}>
              <Ionicons name="close" size={22} color={C.dark} />
            </TouchableOpacity>
          </View>
          <Text style={styles.emailModalDesc}>The PDF will be generated and sent directly as an email attachment.</Text>
          <Text style={styles.emailLabel}>Recipient Email</Text>
          <View style={styles.emailInputWrap}>
            <Ionicons name="mail-outline" size={16} color={C.sub} />
            <TextInput
              style={styles.emailInput}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="recipient@example.com"
              placeholderTextColor={C.sub}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.emailModalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEmailModal(false); setEmailInput(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, (!emailInput.trim() || pdfLoading) && styles.sendBtnDisabled]}
              onPress={handleSendEmail}
              disabled={!emailInput.trim() || pdfLoading}
            >
              {pdfLoading ? <ActivityIndicator size="small" color={C.cream} /> : <Ionicons name="send-outline" size={16} color={C.cream} />}
              <Text style={styles.sendBtnText}>{pdfLoading ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.saddle} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
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
                <Ionicons name="refresh-outline" size={22} color={C.cream} style={refreshing ? { opacity: 0.5 } : {}} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDownloadPDF} style={styles.headerBtn} disabled={!dashboardData || pdfLoading}>
                <Ionicons name="download-outline" size={22} color={C.cream} style={(!dashboardData || pdfLoading) ? { opacity: 0.4 } : {}} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEmailModal(true)} style={styles.headerBtn} disabled={!dashboardData || pdfLoading}>
                <Ionicons name="mail-outline" size={22} color={C.cream} style={(!dashboardData || pdfLoading) ? { opacity: 0.4 } : {}} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerTitle}>ANALYTICS</Text>
          <Text style={styles.headerSub}>Real-time insights & reports</Text>
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

      {/* Export buttons */}
      {dashboardData && (
        <View style={styles.exportBar}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleDownloadPDF} disabled={pdfLoading}>
            <Ionicons name="document-outline" size={16} color={C.cream} />
            <Text style={styles.exportBtnText}>{pdfLoading ? 'Generating...' : 'Download PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, styles.exportBtnOutline]} onPress={() => setEmailModal(true)} disabled={pdfLoading}>
            <Ionicons name="mail-outline" size={16} color={C.saddle} />
            <Text style={[styles.exportBtnText, { color: C.saddle }]}>Send via Email</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {fetchError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={14} color={C.red} />
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity onPress={() => fetchData()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      )}

      {/* Email status toast */}
      {emailStatus && (
        <View style={[styles.toast, { backgroundColor: emailStatus.type === 'success' ? '#E8F5E9' : '#FFEBEE', borderColor: emailStatus.type === 'success' ? C.green : C.red }]}>
          <Ionicons name={emailStatus.type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={16} color={emailStatus.type === 'success' ? C.green : C.red} />
          <Text style={[styles.toastText, { color: emailStatus.type === 'success' ? '#2E7D32' : '#C62828' }]}>{emailStatus.msg}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[C.saddle]} tintColor={C.saddle} />}
      >
        <View style={styles.content}>
          {dashboardData ? (
            <>
              {renderSummaryBox()}
              {renderStats()}
              {renderNoiseLevels()}
              {renderReportStatus()}
              {renderTopLocations()}
              {renderCategories()}
              {renderAI()}
              {renderConclusion()}
            </>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="analytics-outline" size={48} color={C.sub} />
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          )}
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

      {renderEmailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, color: C.saddle, fontSize: 15, fontWeight: '600' },
  emptyText:   { color: C.sub, fontSize: 14, marginTop: 8 },

  header:      { paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerBtn:   { padding: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.cream, letterSpacing: 2 },
  headerSub:   { fontSize: 12, color: C.gold, marginTop: 2 },

  periodBar:    { backgroundColor: C.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  periodScroll: { paddingHorizontal: 16 },
  periodBtn:    { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0EBE3', marginRight: 8 },
  periodBtnActive: { backgroundColor: C.saddle },
  periodBtnText:   { fontSize: 13, fontWeight: '600', color: C.mid },
  periodBtnTextActive: { color: C.white },

  exportBar:    { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  exportBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.saddle, paddingVertical: 9, borderRadius: 8 },
  exportBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.saddle },
  exportBtnText:    { color: C.cream, fontWeight: '700', fontSize: 13 },

  errorBanner:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFEBEE', padding: 10, paddingHorizontal: 16 },
  errorText:    { flex: 1, color: C.red, fontSize: 12 },
  retryText:    { color: C.saddle, fontWeight: '700', fontSize: 12 },

  toast:        { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, padding: 12, borderRadius: 10, borderWidth: 1.5 },
  toastText:    { flex: 1, fontSize: 13, fontWeight: '600' },

  scroll:       { flex: 1 },
  content:      { padding: 14, gap: 12 },

  summaryBox:   { backgroundColor: '#FDF5E6', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: C.gold, borderWidth: 1, borderColor: C.gold + '66' },
  summaryText:  { fontSize: 13, color: C.text, lineHeight: 20, marginTop: 8 },

  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:     { backgroundColor: C.white, borderRadius: 12, padding: 12, borderLeftWidth: 4, flex: 1, minWidth: '45%', elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  statIcon:     { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statLabel:    { fontSize: 10, color: C.sub, fontWeight: '500', marginBottom: 3 },
  statVal:      { fontSize: 22, fontWeight: '800' },

  card:         { backgroundColor: C.white, borderRadius: 14, padding: 14, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.dark },
  subHead:      { fontSize: 12, fontWeight: '700', color: C.mid, marginBottom: 6 },

  levelRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  dot:          { width: 9, height: 9, borderRadius: 5 },
  levelName:    { width: 70, fontSize: 12, color: C.text, fontWeight: '500' },
  barWrap:      { flex: 1, height: 6, backgroundColor: '#F0EBE3', borderRadius: 3, overflow: 'hidden' },
  bar:          { height: 6, borderRadius: 3 },
  levelCount:   { width: 26, fontSize: 12, color: C.text, textAlign: 'right', fontWeight: '600' },
  levelPct:     { width: 34, fontSize: 11, textAlign: 'right', fontWeight: '700' },

  locRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  locRank:      { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  locRankText:  { color: C.white, fontSize: 10, fontWeight: '700' },
  locInfo:      { flex: 1 },
  locName:      { fontSize: 12, color: C.text, fontWeight: '600', marginBottom: 4 },
  locCount:     { fontSize: 13, fontWeight: '700', color: C.dark, minWidth: 22, textAlign: 'right' },

  actionsBox:   { backgroundColor: '#FFEBEE', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: C.red },
  actionsHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  actionsTitle: { fontSize: 12, fontWeight: '800', color: '#C62828' },
  actionItem:   { fontSize: 12, color: C.text, lineHeight: 18, marginBottom: 4 },
  obsBox:       { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: C.green },
  obsTitle:     { fontSize: 12, fontWeight: '800', color: '#2E7D32' },
  obsItem:      { fontSize: 12, color: C.text, lineHeight: 18, marginBottom: 4 },

  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer:       { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.82, backgroundColor: C.white },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  emailModal:   { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22 },
  emailModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  emailModalTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: C.dark },
  emailModalDesc:   { fontSize: 13, color: C.sub, marginBottom: 14, lineHeight: 19 },
  emailLabel:       { fontSize: 12, fontWeight: '600', color: C.saddle, marginBottom: 6 },
  emailInputWrap:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 18 },
  emailInput:       { flex: 1, fontSize: 14, color: C.dark },
  emailModalBtns:   { flexDirection: 'row', gap: 10 },
  cancelBtn:        { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.gold, alignItems: 'center' },
  cancelBtnText:    { color: C.saddle, fontWeight: '700', fontSize: 14 },
  sendBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: C.saddle },
  sendBtnDisabled:  { opacity: 0.5 },
  sendBtnText:      { color: C.cream, fontWeight: '700', fontSize: 14 },
});

export default Analytics;
