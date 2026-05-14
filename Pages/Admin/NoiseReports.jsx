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

const C = {
  dark: '#3E2C23', mid: '#5D4A36', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', bg: '#F5F0E8', white: '#FFFFFF',
  green: '#4CAF50', yellow: '#FFC107', red: '#F44336', purple: '#9C27B0',
  blue: '#2196F3', sub: '#8B7355', text: '#333333',
};

const noiseLevelColor = (l) => ({ green: C.green, yellow: C.yellow, red: C.red, critical: C.purple }[l] || C.sub);
const noiseLevelBg    = (l) => ({ green: '#E8F5E9', yellow: '#FFFDE7', red: '#FFEBEE', critical: '#F3E5F5' }[l] || '#F5F5F5');
const noiseLevelLabel = (l) => ({ green: 'Low', yellow: 'Medium', red: 'High', critical: 'Critical' }[l] || l || '—');
const statusColor = (s) => ({ pending: '#FF9800', monitoring: '#2196F3', action_required: '#F44336', resolved: '#4CAF50' }[s] || '#9E9E9E');
const statusLabel = (s) => ({ pending: 'Pending', monitoring: 'Monitoring', action_required: 'Action Required', resolved: 'Resolved' }[s] || s || 'Unknown');

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function reasonIcon(reason) {
  const r = (reason || '').toLowerCase();
  if (r.includes('construct') || r.includes('drill'))  return 'construct-outline';
  if (r.includes('traffic') || r.includes('horn'))     return 'car-outline';
  if (r.includes('music') || r.includes('party'))      return 'musical-notes-outline';
  if (r.includes('animal') || r.includes('dog'))       return 'paw-outline';
  if (r.includes('industrial') || r.includes('mach'))  return 'cog-outline';
  if (r.includes('crowd') || r.includes('speech'))     return 'people-outline';
  return 'volume-high-outline';
}
function getAvailableResponses(report) {
  const { noiseLevel, consecutiveDays = 1 } = report;
  const responses = [];
  if (noiseLevel === 'red' || noiseLevel === 'critical') {
    responses.push({ status: 'monitoring', label: 'Monitoring', icon: 'eye-outline', color: C.blue,
      text: `Barangay is monitoring. Day ${consecutiveDays} of 3.` });
    if (consecutiveDays >= 3)
      responses.push({ status: 'action_required', label: 'Action Required', icon: 'alert-circle-outline', color: C.red,
        text: '3 consecutive days. A barangay officer has been assigned.' });
    responses.push({ status: 'resolved', label: 'Resolved', icon: 'checkmark-circle-outline', color: C.green,
      text: 'Noise complaint resolved. Appropriate action has been taken.' });
  } else if (noiseLevel === 'yellow') {
    responses.push({ status: 'monitoring', label: 'Monitoring', icon: 'eye-outline', color: C.blue,
      text: `Under observation. Day ${consecutiveDays} of 5.` });
    if (consecutiveDays >= 5)
      responses.push({ status: 'action_required', label: 'Action Required', icon: 'alert-circle-outline', color: C.red,
        text: '5 consecutive days. A barangay officer will take action.' });
    responses.push({ status: 'resolved', label: 'Resolved', icon: 'checkmark-circle-outline', color: C.green,
      text: 'Noise complaint resolved.' });
  } else {
    responses.push({ status: 'monitoring', label: 'Monitoring', icon: 'eye-outline', color: C.blue,
      text: 'This minor noise is under observation.' });
    responses.push({ status: 'resolved', label: 'Resolved', icon: 'checkmark-circle-outline', color: C.green,
      text: 'Advice provided. Matter is now closed.' });
  }
  return responses;
}

export default function AdminNoiseReportsScreen() {
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [reports, setReports]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const FILTERS = ['All', 'Construction', 'Traffic', 'Music', 'Industrial', 'Animal'];

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0,             duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1,             duration: 320, useNativeDriver: true }),
    ]).start();
  };
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -width * 0.82, duration: 280, easing: Easing.in(Easing.cubic),  useNativeDriver: true }),
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

  const fetchReports = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/reports/get-report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data.map(r => ({ ...r, source: r.source || 'mobile' })));
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  const onRefresh = () => { setRefreshing(true); fetchReports(); };

  const filteredReports = selectedFilter === 'All'
    ? reports
    : reports.filter(r => (r.reason || '').toLowerCase().includes(selectedFilter.toLowerCase()));

  const openStatusModal = (report) => {
    setSelectedReport(report);
    setSelectedStatus(report.status || null);
    setStatusModalVisible(true);
  };

  const updateReportStatus = async () => {
    if (!selectedReport || !selectedStatus) { Alert.alert('Error', 'Please select a response'); return; }
    try {
      setUpdatingStatus(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/reports/update-status/${selectedReport._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (res.ok) {
        Alert.alert('Success', 'Report status updated successfully');
        setStatusModalVisible(false); setSelectedReport(null); setSelectedStatus(null);
        await fetchReports();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to update status');
      }
    } catch (e) { Alert.alert('Error', 'Could not update status'); }
    finally { setUpdatingStatus(false); }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

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

      <LinearGradient colors={[C.dark, C.mid]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.iconBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={24} color={C.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.headerTitle}>Noise Reports</Text>
            <Text style={s.headerSub}>{reports.length} total reports</Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={22} color={C.gold} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[s.filterChip, selectedFilter === f && s.filterChipActive]} onPress={() => setSelectedFilter(f)}>
              <Text style={[s.filterChipText, selectedFilter === f && s.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.gold} size="large" /><Text style={s.subText}>Loading reports…</Text></View>
      ) : filteredReports.length === 0 ? (
        <View style={s.center}><Ionicons name="document-text-outline" size={48} color={C.sub} /><Text style={s.subText}>No reports found.</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />}>
          {filteredReports.map(report => (
            <TouchableOpacity key={report._id} style={s.card}
              onPress={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
              activeOpacity={0.85}>
              <View style={s.cardHeader}>
                <View style={s.cardHeaderLeft}>
                  <View style={[s.iconWrap, { backgroundColor: noiseLevelBg(report.noiseLevel) }]}>
                    <Ionicons name={reasonIcon(report.reason || report.topDetection)} size={20} color={noiseLevelColor(report.noiseLevel)} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.reportReason} numberOfLines={1}>{report.topDetection || report.reason || 'Noise Report'}</Text>
                    <Text style={s.reportDate}>{formatDate(report.createdAt)}</Text>
                    <View style={s.chipsRow}>
                      {report.averageDecibel != null && (
                        <View style={[s.chip, { backgroundColor: 'rgba(33,150,243,0.1)' }]}>
                          <Text style={[s.chipText, { color: '#1565C0' }]}>🔊 {report.averageDecibel} dB</Text>
                        </View>
                      )}
                      {report.source === 'hardware' ? (
                        <View style={[s.chip, { backgroundColor: 'rgba(191,54,12,0.1)' }]}>
                          <Text style={[s.chipText, { color: '#BF360C' }]}>🤖 Hardware</Text>
                        </View>
                      ) : (
                        <View style={[s.chip, { backgroundColor: 'rgba(13,71,161,0.1)' }]}>
                          <Text style={[s.chipText, { color: '#0D47A1' }]}>📱 Mobile</Text>
                        </View>
                      )}
                      {report.isReportable && (
                        <View style={[s.chip, { backgroundColor: 'rgba(198,40,40,0.1)' }]}>
                          <Text style={[s.chipText, { color: '#C62828' }]}>⚡ Reportable</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={s.cardHeaderRight}>
                  {report.noiseLevel && (
                    <View style={[s.noiseBadge, { backgroundColor: noiseLevelBg(report.noiseLevel) }]}>
                      <View style={[s.noiseDot, { backgroundColor: noiseLevelColor(report.noiseLevel) }]} />
                      <Text style={[s.noiseText, { color: noiseLevelColor(report.noiseLevel) }]}>{noiseLevelLabel(report.noiseLevel)}</Text>
                    </View>
                  )}
                  <Ionicons name={expandedReport === report._id ? 'chevron-up' : 'chevron-down'} size={20} color={C.saddle} style={{ marginTop: 6 }} />
                </View>
              </View>

              {expandedReport === report._id && (
                <View style={s.details}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor(report.status || 'pending') }]}>
                    <Ionicons name="flag" size={13} color={C.white} />
                    <Text style={s.statusBadgeText}>{statusLabel(report.status || 'pending')}</Text>
                  </View>
                  {report.comment ? (
                    <View style={s.detailBlock}>
                      <Text style={s.detailLabel}>Details</Text>
                      <Text style={s.detailText}>{report.comment}</Text>
                    </View>
                  ) : null}
                  {report.location && report.location.latitude ? (
                    <View style={s.detailBlock}>
                      <Text style={s.detailLabel}>Location</Text>
                      <Text style={s.detailText}>
                        {typeof report.location.address === 'string'
                          ? report.location.address
                          : report.location.address
                            ? [report.location.address.street, report.location.address.city].filter(Boolean).join(', ')
                            : `${report.location.latitude.toFixed(5)}, ${report.location.longitude.toFixed(5)}`}
                      </Text>
                    </View>
                  ) : null}
                  <TouchableOpacity style={s.setResponseBtn} onPress={() => openStatusModal(report)} activeOpacity={0.8}>
                    <Ionicons name="create-outline" size={16} color={C.gold} />
                    <Text style={s.setResponseText}>{!report.status || report.status === 'pending' ? 'Set Response' : 'Change Response'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={statusModalVisible} transparent animationType="slide" onRequestClose={() => setStatusModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <LinearGradient colors={[C.dark, C.mid]} style={s.modalHeader}>
              <Text style={s.modalTitle}>Update Report Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={26} color={C.cream} />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={{ maxHeight: height * 0.5 }} contentContainerStyle={{ padding: 16 }}>
              {selectedReport && getAvailableResponses(selectedReport).map(opt => (
                <TouchableOpacity key={opt.status}
                  style={[s.statusOption, selectedStatus === opt.status && s.statusOptionActive]}
                  onPress={() => setSelectedStatus(opt.status)}>
                  <View style={s.statusOptionHeader}>
                    <View style={[s.radio, selectedStatus === opt.status && s.radioActive]}>
                      {selectedStatus === opt.status && <View style={s.radioInner} />}
                    </View>
                    <Ionicons name={opt.icon} size={20} color={opt.color} />
                    <Text style={[s.statusOptionLabel, { color: opt.color }]}>{opt.label}</Text>
                  </View>
                  <Text style={s.statusOptionText}>{opt.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setStatusModalVisible(false)}>
                <Text style={s.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, updatingStatus && { opacity: 0.6 }]} onPress={updateReportStatus} disabled={updatingStatus}>
                {updatingStatus ? <ActivityIndicator color={C.dark} size="small" /> : <Text style={s.btnPrimaryText}>Save Status</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: SB_HEIGHT + 6, paddingBottom: 10, paddingHorizontal: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBtn:   { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.cream },
  headerSub:   { fontSize: 11, color: 'rgba(253,245,230,0.7)', marginTop: 1 },
  filterScroll: { marginBottom: 2 },
  filterRow:    { gap: 8, paddingBottom: 4 },
  filterChip:       { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 13 },
  filterChipActive: { backgroundColor: C.gold },
  filterChipText:       { fontSize: 12, color: C.cream, fontWeight: '500' },
  filterChipTextActive: { color: C.dark, fontWeight: '700' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subText: { color: C.sub, marginTop: 12, fontSize: 14 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6 },
  cardHeader:      { flexDirection: 'row', alignItems: 'flex-start' },
  cardHeaderLeft:  { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  cardHeaderRight: { alignItems: 'flex-end', marginLeft: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reportReason: { fontSize: 14, fontWeight: '700', color: C.text },
  reportDate:   { fontSize: 11, color: C.sub, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  chip:     { borderRadius: 12, paddingVertical: 2, paddingHorizontal: 7 },
  chipText: { fontSize: 10, fontWeight: '600' },
  noiseBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8, gap: 4 },
  noiseDot:   { width: 6, height: 6, borderRadius: 3 },
  noiseText:  { fontSize: 11, fontWeight: '700' },
  details: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0E8DC', paddingTop: 12 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 10 },
  statusBadgeText: { color: C.white, fontSize: 12, fontWeight: '700' },
  detailBlock: { marginBottom: 10 },
  detailLabel: { fontSize: 12, fontWeight: '700', color: C.mid, marginBottom: 3 },
  detailText:  { fontSize: 13, color: C.text },
  setResponseBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, marginTop: 6 },
  setResponseText: { fontSize: 13, fontWeight: '600', color: C.saddle },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.82, backgroundColor: C.white, elevation: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:        { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle:   { fontSize: 16, fontWeight: '700', color: C.cream },
  modalFooter:  { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#F0E8DC' },
  statusOption:       { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F0E8DC' },
  statusOptionActive: { borderColor: C.gold, backgroundColor: '#FFFDE7' },
  statusOptionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusOptionLabel:  { fontSize: 14, fontWeight: '700' },
  statusOptionText:   { fontSize: 12, color: C.sub, lineHeight: 18 },
  radio:      { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: C.gold },
  radioInner:  { width: 9, height: 9, borderRadius: 4.5, backgroundColor: C.gold },
  btnPrimary:     { backgroundColor: C.gold, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  btnPrimaryText: { color: C.dark, fontWeight: '700', fontSize: 14 },
  btnCancel:      { backgroundColor: '#F5F0E8', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  btnCancelText:  { color: C.mid, fontWeight: '600', fontSize: 14 },
});

