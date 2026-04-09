import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated,
  StatusBar, Dimensions, Platform, ActivityIndicator, Alert, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark: '#3E2C23', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', bg: '#F5F0E8', white: '#FFFFFF',
  green: '#4CAF50', red: '#F44336', blue: '#2196F3', text: '#333333',
};

const formatDate = (ds) => {
  if (!ds) return 'N/A';
  return new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getLocationString = (loc) => {
  if (!loc) return 'N/A';
  if (typeof loc === 'string') return loc;
  if (loc.address?.formattedAddress) return loc.address.formattedAddress;
  if (loc.address?.city) return loc.address.city;
  if (loc.formattedAddress) return loc.formattedAddress;
  if (loc.city) return loc.city;
  if (loc.latitude && loc.longitude) return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
  return 'Unknown';
};

export default function ExportReports({ navigation }) {
  const [drawerVisible, setDrawerVisible]   = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [exportType, setExportType]         = useState('reports');
  const [period, setPeriod]                 = useState('weekly');
  const [loading, setLoading]               = useState(false);
  const [exportLoading, setExportLoading]   = useState(false);
  const [fetchError, setFetchError]         = useState(null);
  const [data, setData]                     = useState(null);
  const [previewData, setPreviewData]       = useState([]);
  const [totalCount, setTotalCount]         = useState(0);
  const [users, setUsers]                   = useState([]);

  const periods = [
    { id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' }, { id: 'yearly', label: 'Yearly' },
  ];

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

  const filterByPeriod = (arr, p) => {
    const now = new Date();
    let start, end;
    switch (p) {
      case 'daily':   start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0); end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59); break;
      case 'weekly': { const day = now.getDay(); const diff = day === 0 ? -6 : 1 - day; start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff); end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59); break; }
      case 'monthly': start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59); break;
      case 'yearly':  start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31, 23,59,59); break;
      default: return arr;
    }
    return arr.filter(item => { const d = new Date(item.createdAt); return d >= start && d <= end; });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setFetchError(null);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) { navigation.replace('Login'); return; }
      const url = exportType === 'reports' ? `${API_BASE_URL}/reports/get-report` : `${API_BASE_URL}/user/getAll`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { navigation.replace('Login'); return; }
      if (!res.ok) throw new Error('Failed to fetch data');
      const result = await res.json();
      let arr = exportType === 'reports' ? (result || []) : (result.users || []);
      arr = filterByPeriod(arr, period);
      setPreviewData(arr.slice(0, 5));
      setTotalCount(arr.length);
      setData(arr);
    } catch (e) { setFetchError(e.message); }
    finally { setLoading(false); }
  }, [exportType, period, navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/user/getAll`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setUsers(d.users || []); }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchData(); fetchUsers(); }, [fetchData, fetchUsers]);

  const getUsernameFromId = (id) => {
    if (!id) return 'Unknown';
    const u = users.find(x => x._id === id);
    return u ? u.username : 'Unknown';
  };

  const getPeriodLabel = () => periods.find(p2 => p2.id === period)?.label || 'Weekly';

  // ── Generate PDF ─────────────────────────────────────────────
  const exportToPDF = async () => {
    if (!data || data.length === 0) { Alert.alert('No Data', 'No records available for the selected period.'); return; }
    try {
      setExportLoading(true);
      const adminName = (await AsyncStorage.getItem('userData') ? JSON.parse(await AsyncStorage.getItem('userData'))?.username : null) || 'Administrator';
      const now = new Date().toLocaleString();

      let tableRows = '';
      if (exportType === 'reports') {
        tableRows = data.slice(0, 100).map(r => `
          <tr>
            <td>${r._id?.slice(-6) || 'N/A'}</td>
            <td>${getUsernameFromId(r.userId)}</td>
            <td>${(r.aiSummary?.topDetection || r.reason || 'N/A').substring(0, 20)}</td>
            <td>${r.noiseLevel?.toUpperCase() || 'N/A'}</td>
            <td>${r.status || 'pending'}</td>
            <td>${getLocationString(r.location).substring(0, 20)}</td>
            <td>${r.aiSummary?.averageDecibel ?? r.ai_decibel ?? '-'}</td>
            <td>${formatDate(r.createdAt)}</td>
          </tr>`).join('');
      } else {
        tableRows = data.slice(0, 100).map(u => `
          <tr>
            <td>${u.username || 'N/A'}</td>
            <td>${u.email || 'N/A'}</td>
            <td>${u.userType || 'user'}</td>
            <td>${u.isVerified ? 'Yes' : 'No'}</td>
            <td>${formatDate(u.createdAt)}</td>
          </tr>`).join('');
      }

      const headers = exportType === 'reports'
        ? '<tr><th>ID</th><th>Reported By</th><th>Detection</th><th>Level</th><th>Status</th><th>Location</th><th>dB</th><th>Date</th></tr>'
        : '<tr><th>Username</th><th>Email</th><th>Type</th><th>Verified</th><th>Joined</th></tr>';

      const html = `
        <html><head><style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #3E2C23; }
          h1 { color: #8B4513; text-align: center; font-size: 22px; margin-bottom: 4px; }
          h2 { color: #D35400; text-align: center; font-size: 16px; margin-bottom: 16px; }
          .meta { font-size: 11px; color: #5D4A36; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #8B4513; color: white; padding: 8px 6px; text-align: left; }
          td { padding: 6px; border-bottom: 1px solid #EEE; }
          tr:nth-child(even) { background: #FDF5E6; }
          .footer { text-align: center; font-size: 10px; color: #8B7355; margin-top: 20px; }
        </style></head><body>
          <h1>NOISEWATCH</h1>
          <h2>${exportType === 'reports' ? 'Noise Reports Export' : 'Users Export'}</h2>
          <div class="meta">
            Generated by: ${adminName} &nbsp;|&nbsp; Date: ${now} &nbsp;|&nbsp;
            Period: ${getPeriodLabel()} &nbsp;|&nbsp; Total Records: ${totalCount}
          </div>
          <table><thead>${headers}</thead><tbody>${tableRows}</tbody></table>
          <div class="footer">Generated by NOISEWATCH Export System</div>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const fileName = `${exportType}_${period}_${Date.now()}.pdf`;
      const dest = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: dest });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Export PDF' });
      } else {
        Alert.alert('Saved', `PDF saved to: ${dest}`);
      }
    } catch (e) { Alert.alert('Export Failed', e.message); }
    finally { setExportLoading(false); }
  };

  // ── Generate CSV ─────────────────────────────────────────────
  const exportToCSV = async () => {
    if (!data || data.length === 0) { Alert.alert('No Data', 'No records available for the selected period.'); return; }
    try {
      setExportLoading(true);
      let csv = '';
      if (exportType === 'reports') {
        csv = 'ID,Reported By,Detection,Noise Level,Status,Location,dB,Date\n';
        csv += data.map(r => [
          r._id?.slice(-6) || '', getUsernameFromId(r.userId),
          `"${(r.aiSummary?.topDetection || r.reason || '').replace(/"/g, '""')}"`,
          r.noiseLevel?.toUpperCase() || '', r.status || 'pending',
          `"${getLocationString(r.location).replace(/"/g, '""')}"`,
          r.aiSummary?.averageDecibel ?? r.ai_decibel ?? '',
          formatDate(r.createdAt),
        ].join(',')).join('\n');
      } else {
        csv = 'Username,Email,Type,Verified,Joined\n';
        csv += data.map(u => [u.username || '', u.email || '', u.userType || 'user', u.isVerified ? 'Yes' : 'No', formatDate(u.createdAt)].join(',')).join('\n');
      }

      const fileName = `${exportType}_${period}_${Date.now()}.csv`;
      const dest = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(dest, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
      } else {
        Alert.alert('Saved', `CSV saved to: ${dest}`);
      }
    } catch (e) { Alert.alert('Export Failed', e.message); }
    finally { setExportLoading(false); }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.saddle} />

      {/* Header */}
      <LinearGradient colors={[C.saddle, '#654321']} style={s.header}>
        <View style={{ paddingTop: SB_HEIGHT + 8 }}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={s.headerBtn}><Ionicons name="menu" size={26} color={C.gold} /></TouchableOpacity>
            <Text style={s.headerTitle}>Export Reports</Text>
            <TouchableOpacity onPress={fetchData} style={s.headerBtn}><Ionicons name="refresh" size={22} color={C.gold} /></TouchableOpacity>
          </View>
          <Text style={s.headerSub}>Export noise reports and user data</Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Export type */}
        <View style={s.card}>
          <Text style={s.cardTitle}><Ionicons name="download-outline" size={16} color={C.saddle} /> Export Options</Text>

          <Text style={s.label}>Data Type</Text>
          <View style={s.typeRow}>
            {[{ id: 'reports', label: 'Noise Reports', icon: 'document-text-outline' }, { id: 'users', label: 'Users', icon: 'people-outline' }].map(t => (
              <TouchableOpacity key={t.id} style={[s.typeBtn, exportType === t.id && s.typeBtnActive]} onPress={() => setExportType(t.id)}>
                <Ionicons name={t.icon} size={20} color={exportType === t.id ? C.white : C.saddle} />
                <Text style={[s.typeBtnText, exportType === t.id && s.typeBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Time Period</Text>
          <View style={s.periodRow}>
            {periods.map(p => (
              <TouchableOpacity key={p.id} style={[s.periodBtn, period === p.id && s.periodBtnActive]} onPress={() => setPeriod(p.id)}>
                <Text style={[s.periodBtnText, period === p.id && s.periodBtnTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Export Format</Text>
          <View style={s.formatRow}>
            <TouchableOpacity style={s.exportBtn} onPress={exportToPDF} disabled={exportLoading || loading || !data?.length}>
              {exportLoading ? <ActivityIndicator size="small" color={C.white} /> : <><Ionicons name="document-outline" size={20} color={C.white} /><Text style={s.exportBtnText}>Export PDF</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.exportBtn, { backgroundColor: C.green }]} onPress={exportToCSV} disabled={exportLoading || loading || !data?.length}>
              {exportLoading ? <ActivityIndicator size="small" color={C.white} /> : <><Ionicons name="grid-outline" size={20} color={C.white} /><Text style={s.exportBtnText}>Export CSV</Text></>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview */}
        <View style={s.card}>
          <View style={s.previewHeader}>
            <Text style={s.cardTitle}><Ionicons name="eye-outline" size={16} color={C.saddle} /> Data Preview</Text>
            <Text style={s.previewMeta}>{totalCount} records · {getPeriodLabel()}</Text>
          </View>

          {loading ? (
            <View style={s.previewLoading}><ActivityIndicator size="small" color={C.saddle} /><Text style={s.previewLoadingText}>Loading...</Text></View>
          ) : fetchError ? (
            <View style={s.errorBox}><Ionicons name="alert-circle" size={18} color={C.red} /><Text style={s.errorText}>{fetchError}</Text></View>
          ) : previewData.length === 0 ? (
            <View style={s.emptyPreview}><Ionicons name="information-circle-outline" size={40} color="#CCC" /><Text style={s.emptyText}>No data for selected period</Text></View>
          ) : (
            <>
              {previewData.map((item, i) => (
                <View key={item._id || i} style={s.previewRow}>
                  {exportType === 'reports' ? (
                    <>
                      <View style={s.previewRowLeft}>
                        <Text style={s.previewRowTitle} numberOfLines={1}>{item.aiSummary?.topDetection || item.reason || 'Noise Report'}</Text>
                        <Text style={s.previewRowSub}>{getLocationString(item.location)}</Text>
                      </View>
                      <View style={s.previewRowRight}>
                        <View style={[s.levelBadge, { backgroundColor: { critical: '#F3E5F5', red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' }[item.noiseLevel] || '#F5F5F5' }]}>
                          <Text style={[s.levelBadgeText, { color: { critical: '#9C27B0', red: C.red, yellow: '#F57F17', green: '#2E7D32' }[item.noiseLevel] || '#555' }]}>{item.noiseLevel?.toUpperCase() || 'N/A'}</Text>
                        </View>
                        <Text style={s.previewDate}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={s.previewRowLeft}>
                        <Text style={s.previewRowTitle}>{item.username || 'N/A'}</Text>
                        <Text style={s.previewRowSub}>{item.email || 'N/A'}</Text>
                      </View>
                      <View style={s.previewRowRight}>
                        <Text style={s.previewDate}>{item.userType || 'user'}</Text>
                        <Text style={s.previewDate}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </>
                  )}
                </View>
              ))}
              {totalCount > 5 && <Text style={s.previewMore}>Showing 5 of {totalCount} records</Text>}
            </>
          )}
        </View>
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
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { paddingHorizontal: 18, paddingBottom: 14 },
  headerTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerBtn:    { padding: 6 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: C.white, flex: 1, textAlign: 'center' },
  headerSub:    { color: C.gold, fontSize: 12, textAlign: 'center' },
  card:         { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: C.saddle, marginBottom: 14 },
  label:        { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 },
  typeRow:      { flexDirection: 'row', gap: 10 },
  typeBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.saddle, backgroundColor: C.white },
  typeBtnActive:{ backgroundColor: C.saddle, borderColor: C.saddle },
  typeBtnText:  { fontSize: 13, color: C.saddle, fontWeight: '600' },
  typeBtnTextActive: { color: C.white },
  periodRow:    { flexDirection: 'row', gap: 8 },
  periodBtn:    { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F0F0F0', alignItems: 'center' },
  periodBtnActive: { backgroundColor: C.saddle },
  periodBtnText:   { fontSize: 12, color: '#555', fontWeight: '500' },
  periodBtnTextActive: { color: C.white, fontWeight: '700' },
  formatRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  exportBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.saddle },
  exportBtnText:{ color: C.white, fontWeight: '700', fontSize: 14 },
  previewHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewMeta:  { fontSize: 12, color: '#999' },
  previewLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20, justifyContent: 'center' },
  previewLoadingText: { color: '#999', fontSize: 13 },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', padding: 12, borderRadius: 10 },
  errorText:    { flex: 1, color: C.red, fontSize: 13 },
  emptyPreview: { alignItems: 'center', paddingVertical: 24 },
  emptyText:    { color: '#999', fontSize: 14, marginTop: 8 },
  previewRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  previewRowLeft: { flex: 1, marginRight: 10 },
  previewRowTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
  previewRowSub:   { fontSize: 12, color: '#888' },
  previewRowRight: { alignItems: 'flex-end', gap: 4 },
  levelBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  levelBadgeText: { fontSize: 10, fontWeight: '700' },
  previewDate:  { fontSize: 11, color: '#999' },
  previewMore:  { textAlign: 'center', fontSize: 12, color: '#999', marginTop: 10 },
  drawerWrap:   { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },
});
