import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
  StatusBar, Dimensions, Platform, ScrollView, TextInput,
  RefreshControl, Alert, ActivityIndicator, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');
const SB_HEIGHT = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

const C = {
  dark: '#3E2C23', mid: '#5D4A36', saddle: '#8B4513', gold: '#DAA520',
  cream: '#FDF5E6', bg: '#F5F0E8', white: '#FFFFFF',
  green: '#4CAF50', yellow: '#FFC107', red: '#F44336',
  purple: '#9C27B0', blue: '#2196F3', text: '#333333', sub: '#8B7355',
};

const getNoiseLevelColor = (l) => ({ critical: C.purple, red: C.red, yellow: C.yellow, green: C.green }[l] || C.sub);
const getNoiseLevelBg    = (l) => ({ critical: '#F3E5F5', red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' }[l] || '#F5F5F5');
const getNoiseLevelLabel = (l) => ({ critical: 'Critical', red: 'High', yellow: 'Medium', green: 'Low' }[l] || 'Unknown');
const getStatusColor     = (s) => ({ pending: '#999', action_required: C.red, monitoring: C.yellow, resolved: C.green }[s] || '#999');
const getStatusLabel     = (s) => ({ pending: 'Pending', action_required: 'Action Required', monitoring: 'Monitoring', resolved: 'Resolved' }[s] || 'Pending');
const getReasonIcon      = (r) => {
  if (!r) return '📢';
  if (r.includes('Music')) return '🔊';
  if (r.includes('Vehicle')) return '🚗';
  if (r.includes('Construction')) return '🔨';
  if (r.includes('Party')) return '🎉';
  if (r.includes('Animal')) return '🐕';
  if (r.includes('Industrial')) return '🏭';
  if (r.includes('Shouting')) return '🗣️';
  return '📢';
};

const formatDate = (ds) => {
  const d = new Date(ds), now = new Date();
  const dm = Math.floor((now - d) / 60000), dh = Math.floor(dm / 60), dd = Math.floor(dh / 24);
  if (dm < 1) return 'Just now';
  if (dm < 60) return `${dm}m ago`;
  if (dh < 24) return `${dh}h ago`;
  if (dd < 7) return `${dd}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getLocationString = (loc) => {
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  return loc.formattedAddress || loc.address?.formattedAddress || loc.address?.street
    || `${loc.address?.city || loc.city || ''}`.trim() || `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}` || null;
};

export default function AdminNoiseReportsScreen({ navigation }) {
  const [drawerVisible, setDrawerVisible]     = useState(false);
  const slideAnim   = useRef(new Animated.Value(-width * 0.82)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const [reports, setReports]                 = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [fetchError, setFetchError]           = useState(null);
  const [expandedReport, setExpandedReport]   = useState(null);
  const [selectedFilter, setSelectedFilter]   = useState('All');
  const [searchQuery, setSearchQuery]         = useState('');
  const [showSearch, setShowSearch]           = useState(false);
  const [selectedMonth, setSelectedMonth]     = useState('all');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [sound, setSound]                     = useState(null);
  const [playingAudio, setPlayingAudio]       = useState(null);
  const [audioProgress, setAudioProgress]     = useState({});
  const [audioDuration, setAudioDuration]     = useState({});

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedReport, setSelectedReport]   = useState(null);
  const [selectedStatus, setSelectedStatus]   = useState(null);
  const [updatingStatus, setUpdatingStatus]   = useState(false);

  // AI Forensic Analysis modal
  const [aiModalVisible, setAiModalVisible]   = useState(false);
  const [aiModalData, setAiModalData]         = useState(null); // single aiResult object

  const openAiModal = (aiResult) => { setAiModalData(aiResult); setAiModalVisible(true); };

  // ── Drawer ──────────────────────────────────────────────────
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0,            duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1,            duration: 320, useNativeDriver: true }),
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

  useEffect(() => {
    // Set audio mode — play through speaker, allow background
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
    fetchReports();
    return () => { if (sound) sound.unloadAsync(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch ────────────────────────────────────────────────────
  const fetchReports = async () => {
    try {
      setLoading(true); setFetchError(null);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/reports/get-report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { navigation.replace('Login'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const transformed = data.map(r => ({
        ...r,
        audioUri: r.mediaType === 'audio' ? r.mediaUrl : null,
        videoUri: r.mediaType === 'video' ? r.mediaUrl : null,
        noiseLevel: r.noiseLevel || 'green',
        consecutiveDays: r.consecutiveDays || 1,
        status: r.status || 'pending',
        id: r._id || r.id,
        topDetection: r.topDetection || r.aiSummary?.topDetection || r.reason,
        averageDecibel: r.averageDecibel ?? r.aiSummary?.averageDecibel ?? r.ai_decibel ?? null,
        estimatedDistance: r.estimatedDistance ?? r.aiSummary?.estimatedDistance ?? r.ai_distance_meters ?? null,
        distanceCategory: r.distanceCategory || r.aiSummary?.distanceCategory || r.ai_distance_category || null,
        isReportable: r.isReportable ?? ((r.aiSummary?.reportableCount || 0) > 0),
        city: r.city || r.location?.address?.city || r.location_address_city || null,
      }));
      setReports(transformed);
      extractMonths(transformed);
    } catch (e) { setFetchError(e.message); }
    finally { setLoading(false); }
  };

  const extractMonths = (data) => {
    const map = new Map();
    data.forEach(r => {
      if (!r.createdAt) return;
      const d = new Date(r.createdAt);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!map.has(key)) map.set(key, { key, label: d.toLocaleDateString('en-US',{year:'numeric',month:'long'}), ts: d.getTime() });
    });
    setAvailableMonths([...map.values()].sort((a,b) => b.ts - a.ts));
  };

  // ── Filters ──────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    let f = [...reports];
    if (selectedFilter !== 'All') f = f.filter(r => r.reason?.includes(selectedFilter));
    if (selectedMonth !== 'all') f = f.filter(r => {
      if (!r.createdAt) return false;
      const d = new Date(r.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === selectedMonth;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(r =>
        r.reason?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q) ||
        r._id?.toLowerCase().includes(q) ||
        getLocationString(r.location)?.toLowerCase().includes(q)
      );
    }
    setFilteredReports(f);
  }, [reports, selectedFilter, selectedMonth, searchQuery]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  const onRefresh = async () => { setRefreshing(true); await fetchReports(); setRefreshing(false); };

  // ── Audio ────────────────────────────────────────────────────
  const playAudio = async (uri, playerKey) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        if (playingAudio === playerKey) { setPlayingAudio(null); return; }
      }
      const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(s);
      setPlayingAudio(playerKey);
      s.setOnPlaybackStatusUpdate(st => {
        if (st.isLoaded) {
          setAudioProgress(p => ({ ...p, [playerKey]: st.positionMillis / 1000 }));
          setAudioDuration(p => ({ ...p, [playerKey]: st.durationMillis ? st.durationMillis / 1000 : 0 }));
        }
        if (st.didJustFinish) { setPlayingAudio(null); s.unloadAsync(); }
      });
    } catch { Alert.alert('Error', 'Could not play audio'); }
  };

  const formatAudioTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60), s2 = Math.floor(secs % 60);
    return `${m}:${String(s2).padStart(2, '0')}`;
  };

  // ── Render single audio player ───────────────────────────────
  const renderAudioPlayer = (url, playerKey, label, aiData) => (
    <View key={playerKey} style={s.mediaPlayer}>
      <View style={s.mediaPlayerHeader}>
        <View style={s.mediaTypeBadge}>
          <Ionicons name="musical-notes-outline" size={14} color={C.saddle} />
          <Text style={s.mediaTypeText}>{label || 'AUDIO'}</Text>
        </View>
        {aiData?.decibel != null && <View style={s.aiChip}><Text style={s.aiChipText}>🔊 {aiData.decibel} dB</Text></View>}
        {aiData?.distance?.category && <View style={s.aiChip}><Text style={s.aiChipText}>📏 {aiData.distance.category}</Text></View>}
        {aiData?.is_reportable && <View style={[s.aiChip, { backgroundColor: '#FFF3E0' }]}><Text style={[s.aiChipText, { color: '#E65100' }]}>⚡ Reportable</Text></View>}
      </View>
      <TouchableOpacity style={s.audioBtn} onPress={() => playAudio(url, playerKey)} activeOpacity={0.8}>
        <Ionicons name={playingAudio === playerKey ? 'pause-circle' : 'play-circle'} size={40} color={C.saddle} />
        <View style={{ flex: 1 }}>
          <View style={s.audioProgressBar}>
            <View style={[s.audioProgressFill, {
              width: audioDuration[playerKey] > 0
                ? `${Math.min((audioProgress[playerKey] || 0) / audioDuration[playerKey] * 100, 100)}%`
                : '0%'
            }]} />
          </View>
          <View style={s.audioTimeRow}>
            <Text style={s.audioTime}>{formatAudioTime(audioProgress[playerKey])}</Text>
            <Text style={s.audioTime}>{formatAudioTime(audioDuration[playerKey])}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  // ── Render inline video player ───────────────────────────────
  const renderVideoPlayer = (url, playerKey, label, aiData) => (
    <View key={playerKey} style={s.mediaPlayer}>
      <View style={s.mediaPlayerHeader}>
        <View style={s.mediaTypeBadge}>
          <Ionicons name="videocam-outline" size={14} color={C.saddle} />
          <Text style={s.mediaTypeText}>{label || 'VIDEO'}</Text>
        </View>
        {aiData?.decibel != null && <View style={s.aiChip}><Text style={s.aiChipText}>🔊 {aiData.decibel} dB</Text></View>}
        {aiData?.is_reportable && <View style={[s.aiChip, { backgroundColor: '#FFF3E0' }]}><Text style={[s.aiChipText, { color: '#E65100' }]}>⚡ Reportable</Text></View>}
      </View>
      <Video
        source={{ uri: url }}
        style={s.videoPlayer}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        onError={() => Alert.alert('Error', 'Could not load video. The file may be unavailable.')}
      />
    </View>
  );

  // ── Render media section (multi-file + single fallback) ──────
  const renderMediaSection = (report) => {
    // Multi-file attachments
    if (report.attachments && report.attachments.length > 0) {
      return (
        <View style={s.mediaSectionWrap}>
          <View style={s.mediaSectionHeader}>
            <Ionicons name="albums-outline" size={16} color={C.saddle} />
            <Text style={s.mediaSectionTitle}>Media Files</Text>
            <View style={s.fileCountBadge}>
              <Text style={s.fileCountText}>{report.attachments.length} file{report.attachments.length > 1 ? 's' : ''}</Text>
            </View>
          </View>
          {report.attachments.map((att, idx) => {
            const playerKey = `${report._id}_${idx}`;
            const label = att.fileName ? `${idx + 1}. ${att.fileName}` : `File ${idx + 1}`;
            const aiData = report.aiResults && (report.aiResults.find(r => r.fileIndex === idx) || report.aiResults[idx]);
            if (att.type === 'audio') return renderAudioPlayer(att.url, playerKey, label, aiData);
            if (att.type === 'video') return renderVideoPlayer(att.url, playerKey, label, aiData);
            return null;
          })}
        </View>
      );
    }
    // Single mediaUrl fallback
    if (!report.mediaUrl || !report.mediaType) return null;
    if (report.mediaType === 'audio') return (
      <View style={s.mediaSectionWrap}>
        <View style={s.mediaSectionHeader}>
          <Ionicons name="musical-notes-outline" size={16} color={C.saddle} />
          <Text style={s.mediaSectionTitle}>Audio Recording</Text>
        </View>
        {renderAudioPlayer(report.mediaUrl, report._id, 'AUDIO', null)}
      </View>
    );
    if (report.mediaType === 'video') return (
      <View style={s.mediaSectionWrap}>
        <View style={s.mediaSectionHeader}>
          <Ionicons name="videocam-outline" size={16} color={C.saddle} />
          <Text style={s.mediaSectionTitle}>Video Recording</Text>
        </View>
        {renderVideoPlayer(report.mediaUrl, report._id, 'VIDEO', null)}
      </View>
    );
    return null;
  };

  // ── Status ───────────────────────────────────────────────────
  const getAvailableResponses = (r) => {
    const { noiseLevel, consecutiveDays } = r;
    const res = [];
    if (noiseLevel === 'critical') {
      res.push({ status: 'action_required', label: 'Action Required', icon: 'alert-circle', text: 'CRITICAL noise level detected. A barangay officer has been immediately dispatched.' });
      res.push({ status: 'monitoring',      label: 'Monitoring',      icon: 'eye',          text: 'Critical noise report received. Barangay is actively monitoring.' });
      res.push({ status: 'resolved',        label: 'Resolved',        icon: 'checkmark-circle', text: 'Critical noise complaint has been resolved.' });
    } else if (noiseLevel === 'red') {
      res.push({ status: 'monitoring', label: 'Monitoring', icon: 'eye', text: `Barangay is monitoring. Progress: Day ${consecutiveDays} of 3 for RED noise.` });
      if (consecutiveDays >= 3) res.push({ status: 'action_required', label: 'Action Required', icon: 'alert-circle', text: 'Reported 3 consecutive days. A barangay officer has been assigned.' });
      res.push({ status: 'resolved', label: 'Resolved', icon: 'checkmark-circle', text: 'Noise complaint resolved. Appropriate action taken.' });
    } else if (noiseLevel === 'yellow') {
      res.push({ status: 'monitoring', label: 'Monitoring', icon: 'eye', text: `Report recorded. Monitoring. Progress: Day ${consecutiveDays} of 5 for YELLOW noise.` });
      if (consecutiveDays >= 5) res.push({ status: 'action_required', label: 'Action Required', icon: 'alert-circle', text: 'Reported 5 consecutive days. Barangay officer will take action.' });
      res.push({ status: 'resolved', label: 'Resolved', icon: 'checkmark-circle', text: 'Noise complaint resolved. Issue addressed.' });
    } else {
      res.push({ status: 'monitoring', label: 'Monitoring', icon: 'eye', text: 'Minor noise under observation. Advise communicating with neighbors.' });
      res.push({ status: 'resolved',   label: 'Resolved',  icon: 'checkmark-circle', text: 'Advice provided. Matter is now closed.' });
    }
    return res;
  };

  const getCurrentResponse = (r) => {
    if (!r.status || r.status === 'pending') return 'No response sent yet. Tap to select a response.';
    const cur = getAvailableResponses(r).find(x => x.status === r.status);
    return cur ? cur.text : 'Response sent.';
  };

  const openStatusModal = (r) => { setSelectedReport(r); setSelectedStatus(r.status || null); setStatusModalVisible(true); };

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
        Alert.alert('Success', 'Report status updated');
        setStatusModalVisible(false); setSelectedReport(null); setSelectedStatus(null);
        await fetchReports();
      } else {
        const e = await res.json();
        Alert.alert('Error', e.message || 'Failed to update status');
      }
    } catch { Alert.alert('Error', 'Could not update status'); }
    finally { setUpdatingStatus(false); }
  };

  const filters = ['All', 'Music', 'Vehicle', 'Construction', 'Party', 'Animal', 'Industrial', 'Shouting'];

  // ── Render report card ───────────────────────────────────────
  const renderReport = (report) => {
    const expanded = expandedReport === report._id;
    const loc = getLocationString(report.location);
    return (
      <TouchableOpacity key={report._id} style={s.card} onPress={() => setExpandedReport(expanded ? null : report._id)} activeOpacity={0.8}>
        <View style={s.cardHeader}>
          <View style={s.cardLeft}>
            <View>
              <Text style={s.cardIcon}>{getReasonIcon(report.reason)}</Text>
              {(report.attachments?.length > 1 || report.fileCount > 1) && (
                <View style={s.fileCountBadgeSmall}>
                  <Text style={s.fileCountBadgeSmallText}>{report.attachments?.length || report.fileCount}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardReason} numberOfLines={1}>{report.topDetection || report.reason || 'Noise Report'}</Text>
              <Text style={s.cardDate}>{formatDate(report.createdAt)}</Text>
            </View>
          </View>
          <View style={s.cardRight}>
            <View style={[s.levelBadge, { backgroundColor: getNoiseLevelBg(report.noiseLevel) }]}>
              <View style={[s.levelDot, { backgroundColor: getNoiseLevelColor(report.noiseLevel) }]} />
              <Text style={[s.levelText, { color: getNoiseLevelColor(report.noiseLevel) }]}>{getNoiseLevelLabel(report.noiseLevel)}</Text>
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={C.saddle} />
          </View>
        </View>

        {expanded && (
          <View style={s.details}>
            {/* Status row */}
            <View style={s.statusRow}>
              <View style={[s.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                <Ionicons name="flag" size={14} color="#FFF" />
                <Text style={s.statusText}>{getStatusLabel(report.status)}</Text>
              </View>
              {report.consecutiveDays > 1 && (
                <View style={s.daysBadge}>
                  <Ionicons name="calendar" size={14} color={C.red} />
                  <Text style={s.daysText}>{report.consecutiveDays} consecutive days</Text>
                </View>
              )}
            </View>

            {/* Response section */}
            <TouchableOpacity style={[s.responseBox, (!report.status || report.status === 'pending') && s.responseBoxPending]} onPress={() => openStatusModal(report)} activeOpacity={0.7}>
              <View style={s.responseHeader}>
                <Ionicons name={(!report.status || report.status === 'pending') ? 'alert-circle' : 'information-circle'} size={18} color={(!report.status || report.status === 'pending') ? '#F57C00' : C.blue} />
                <Text style={[s.responseTitle, (!report.status || report.status === 'pending') && { color: '#F57C00' }]}>
                  {(!report.status || report.status === 'pending') ? 'No Response Sent' : 'System Response'}
                </Text>
                <Ionicons name="create-outline" size={16} color={(!report.status || report.status === 'pending') ? '#F57C00' : C.blue} style={{ marginLeft: 'auto' }} />
              </View>
              <Text style={s.responseText} numberOfLines={3}>{getCurrentResponse(report)}</Text>
              <Text style={[s.tapHint, (!report.status || report.status === 'pending') && { color: '#F57C00' }]}>
                {(!report.status || report.status === 'pending') ? 'Tap to select and send response' : 'Tap to change response'}
              </Text>
            </TouchableOpacity>

            {/* AI data chips */}
            {(report.averageDecibel != null || report.distanceCategory || report.isReportable) && (
              <View style={s.aiRow}>
                {report.averageDecibel != null && <View style={s.aiChip}><Text style={s.aiChipText}>🔊 {report.averageDecibel} dB</Text></View>}
                {report.distanceCategory && <View style={s.aiChip}><Text style={s.aiChipText}>📍 {report.distanceCategory}</Text></View>}
                {report.isReportable && <View style={[s.aiChip, { backgroundColor: '#FFF3E0' }]}><Text style={[s.aiChipText, { color: '#E65100' }]}>⚡ Reportable</Text></View>}
              </View>
            )}

            {/* AI Analysis detail */}
            {(report.aiSummary || report.averageDecibel != null || report.estimatedDistance != null) && (
              <View style={s.aiSection}>
                <View style={s.aiSectionHeader}>
                  <Ionicons name="analytics-outline" size={15} color={C.saddle} />
                  <Text style={s.aiSectionTitle}>AI Analysis</Text>
                  {report.aiSummary?.filesAnalyzed > 0 && (
                    <View style={s.fileCountBadge}><Text style={s.fileCountText}>{report.aiSummary.filesAnalyzed} file{report.aiSummary.filesAnalyzed > 1 ? 's' : ''} analyzed</Text></View>
                  )}
                </View>
                {report.aiSummary?.topDetection && (
                  <View style={s.aiDetailRow}>
                    <Text style={s.aiDetailLabel}>Top Detection</Text>
                    <Text style={s.aiDetailValue}>{report.aiSummary.topDetection}{report.aiSummary.topConfidence ? ` (${Math.round(report.aiSummary.topConfidence * 100)}%)` : ''}</Text>
                  </View>
                )}
                {report.averageDecibel != null && (
                  <View style={s.aiDetailRow}>
                    <Text style={s.aiDetailLabel}>Avg Decibel</Text>
                    <Text style={s.aiDetailValue}>🔊 {report.averageDecibel} dB{report.aiSummary?.maxDecibel ? ` (max: ${report.aiSummary.maxDecibel} dB)` : ''}</Text>
                  </View>
                )}
                {report.estimatedDistance != null && (
                  <View style={s.aiDetailRow}>
                    <Text style={s.aiDetailLabel}>Est. Distance</Text>
                    <Text style={s.aiDetailValue}>📏 {report.estimatedDistance}m{report.distanceCategory ? ` — ${report.distanceCategory}` : ''}</Text>
                  </View>
                )}
                {report.isReportable && (
                  <View style={s.aiDetailRow}>
                    <Text style={s.aiDetailLabel}>Reportable</Text>
                    <Text style={[s.aiDetailValue, { color: '#E65100', fontWeight: '700' }]}>⚡ Yes — actionable noise</Text>
                  </View>
                )}
                {report.aiSummary?.severeCount > 0 && (
                  <View style={s.aiDetailRow}>
                    <Text style={s.aiDetailLabel}>Severe</Text>
                    <Text style={[s.aiDetailValue, { color: C.red }]}>🔴 {report.aiSummary.severeCount} severe/critical</Text>
                  </View>
                )}

                {/* Per-file forensic buttons */}
                {report.aiResults && report.aiResults.length > 0 && (
                  <View style={{ marginTop: 10, gap: 6 }}>
                    {report.aiResults.map((aiResult, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[s.forensicBtn, aiResult.is_reportable && s.forensicBtnReportable]}
                        onPress={() => openAiModal(aiResult)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="flask-outline" size={16} color={aiResult.is_reportable ? C.red : C.saddle} />
                        <Text style={[s.forensicBtnText, aiResult.is_reportable && { color: C.red }]}>
                          🔬 AI Forensic Analysis — File {idx + 1}
                          {aiResult.fileName ? ` (${aiResult.fileName.substring(0, 20)}...)` : ''}
                        </Text>
                        {aiResult.is_reportable && (
                          <View style={s.reportableDot}><Text style={s.reportableDotText}>!</Text></View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={aiResult.is_reportable ? C.red : C.saddle} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Location */}
            {loc && (
              <View style={s.detailRow}>
                <Ionicons name="location-outline" size={16} color={C.saddle} />
                <Text style={s.detailText} numberOfLines={2}>{loc}</Text>
              </View>
            )}

            {/* Comment */}
            {report.comment && (
              <View style={s.detailRow}>
                <Ionicons name="chatbox-outline" size={16} color={C.saddle} />
                <Text style={s.detailText}>{report.comment}</Text>
              </View>
            )}

            {/* Media — multi-file attachments + single fallback */}
            {renderMediaSection(report)}

            <Text style={s.timestamp}>{new Date(report.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.saddle} />
      <Text style={s.loadingText}>Loading reports...</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.saddle} />

      {/* Header */}
      <LinearGradient colors={[C.saddle, '#654321']} style={s.header}>
        <View style={{ paddingTop: SB_HEIGHT + 8 }}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={s.headerBtn}><Ionicons name="menu" size={26} color={C.gold} /></TouchableOpacity>
            <Text style={s.headerTitle}>Noise Reports</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={s.headerBtn}><Ionicons name="search" size={22} color={C.gold} /></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMonthPicker(!showMonthPicker)} style={s.headerBtn}><Ionicons name="calendar-outline" size={22} color={C.gold} /></TouchableOpacity>
              <TouchableOpacity onPress={onRefresh} style={s.headerBtn}><Ionicons name="refresh" size={22} color={C.gold} /></TouchableOpacity>
            </View>
          </View>
          <Text style={s.headerSub}>{filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}{selectedMonth !== 'all' ? ` · ${availableMonths.find(m=>m.key===selectedMonth)?.label}` : ''}</Text>
        </View>
      </LinearGradient>

      {/* Search bar */}
      {showSearch && (
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput style={s.searchInput} placeholder="Search reports..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#999" autoFocus />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#999" /></TouchableOpacity> : null}
        </View>
      )}

      {/* Month picker */}
      {showMonthPicker && (
        <View style={s.monthPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={[s.monthChip, selectedMonth === 'all' && s.monthChipActive]} onPress={() => { setSelectedMonth('all'); setShowMonthPicker(false); }}>
              <Text style={[s.monthChipText, selectedMonth === 'all' && s.monthChipTextActive]}>All</Text>
            </TouchableOpacity>
            {availableMonths.map(m => (
              <TouchableOpacity key={m.key} style={[s.monthChip, selectedMonth === m.key && s.monthChipActive]} onPress={() => { setSelectedMonth(m.key); setShowMonthPicker(false); }}>
                <Text style={[s.monthChipText, selectedMonth === m.key && s.monthChipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {filters.map(f => (
          <TouchableOpacity key={f} style={[s.filterPill, selectedFilter === f && s.filterPillActive]} onPress={() => setSelectedFilter(f)}>
            <Text style={[s.filterPillText, selectedFilter === f && s.filterPillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Error */}
      {fetchError && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle" size={20} color={C.red} />
          <Text style={s.errorText}>{fetchError}</Text>
          <TouchableOpacity onPress={fetchReports}><Text style={s.retryText}>Retry</Text></TouchableOpacity>
        </View>
      )}

      {/* List */}
      {filteredReports.length === 0 && !fetchError ? (
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={64} color="#CCC" />
          <Text style={s.emptyText}>No reports found</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.saddle]} tintColor={C.saddle} />}>
          {filteredReports.map(renderReport)}
        </ScrollView>
      )}

      {/* AI Forensic Analysis Modal */}
      <Modal visible={aiModalVisible} transparent animationType="slide" onRequestClose={() => setAiModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxHeight: '92%' }]}>
            {/* Header */}
            <LinearGradient colors={[C.saddle, '#654321']} style={s.aiModalHeader}>
              <Text style={s.aiModalTitle}>🔬 AI Forensic Analysis</Text>
              <TouchableOpacity onPress={() => setAiModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={26} color={C.gold} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {aiModalData && (() => {
                const d = aiModalData;
                return (
                  <>
                    {/* File info */}
                    <View style={s.aiMFileRow}>
                      <Ionicons name={d.type === 'video' ? 'videocam-outline' : 'musical-notes-outline'} size={22} color={C.saddle} />
                      <Text style={s.aiMFileName} numberOfLines={2}>{d.fileName || 'Recording'}</Text>
                      {d.source && (
                        <View style={[s.sourcePill, d.source === 'live' ? s.sourcePillLive : s.sourcePillDl]}>
                          <Ionicons name={d.source === 'live' ? 'mic' : 'download'} size={11} color="#fff" />
                          <Text style={s.sourcePillText}>{d.source === 'live' ? 'Live' : 'Downloaded'}</Text>
                        </View>
                      )}
                    </View>

                    {/* Reportable alert */}
                    {d.is_reportable && (
                      <LinearGradient
                        colors={d.severity_name === 'CRITICAL' ? ['#8B0000','#5D0000'] : ['#F44336','#D32F2F']}
                        style={s.aiMAlert}
                      >
                        <Ionicons name="alert-circle" size={24} color="#fff" />
                        <View style={{ flex: 1 }}>
                          <Text style={s.aiMAlertTitle}>
                            {d.severity_name === 'CRITICAL' ? '🚨 CRITICAL VIOLATION' : '⚠️ REPORTABLE NOISE'}
                          </Text>
                          {d.recommendation && <Text style={s.aiMAlertSub}>{d.recommendation}</Text>}
                        </View>
                      </LinearGradient>
                    )}

                    {/* Metric cards */}
                    <View style={s.aiMMetrics}>
                      <LinearGradient colors={[C.saddle, '#654321']} style={s.aiMMetricCard}>
                        <Ionicons name="volume-high" size={22} color={C.gold} />
                        <Text style={s.aiMMetricVal}>{d.decibel ?? 0} dB</Text>
                        <Text style={s.aiMMetricLbl}>DECIBEL</Text>
                      </LinearGradient>
                      <LinearGradient colors={[C.saddle, '#5D3A1A']} style={s.aiMMetricCard}>
                        <Ionicons name="speedometer" size={22} color={C.gold} />
                        <Text style={s.aiMMetricVal}>{d.noise_level?.level || 'N/A'}</Text>
                        <Text style={s.aiMMetricLbl}>NOISE LEVEL</Text>
                      </LinearGradient>
                      <LinearGradient colors={['#654321', C.saddle]} style={s.aiMMetricCard}>
                        <Ionicons name="navigate" size={22} color={C.gold} />
                        <Text style={s.aiMMetricVal}>~{d.distance?.meters ?? 0}m</Text>
                        <Text style={s.aiMMetricLbl}>DISTANCE</Text>
                      </LinearGradient>
                    </View>

                    {/* Distance details */}
                    {d.distance && (
                      <View style={s.aiMSection}>
                        <View style={s.aiMSectionHeader}>
                          <Ionicons name="compass" size={18} color={C.saddle} />
                          <Text style={s.aiMSectionTitle}>Distance Estimation</Text>
                        </View>
                        <Text style={s.aiMDistCat}>{d.distance.category || 'Unknown'}</Text>
                        <Text style={s.aiMDistMeters}>{d.distance.meters} meters from source</Text>
                        {d.distance.reference_sound && (
                          <Text style={s.aiMDistRef}>Based on {d.distance.reference_sound} ({d.distance.reference_db}dB at 1m)</Text>
                        )}
                        {d.distance.description && (
                          <Text style={s.aiMDistDesc}>{d.distance.description}</Text>
                        )}
                      </View>
                    )}

                    {/* Violation reasons */}
                    {d.reasons && d.reasons.length > 0 && (
                      <View style={[s.aiMSection, { backgroundColor: '#FFEBEE' }]}>
                        <View style={s.aiMSectionHeader}>
                          <Ionicons name="alert" size={18} color={C.red} />
                          <Text style={[s.aiMSectionTitle, { color: C.red }]}>Violation Reasons</Text>
                        </View>
                        {d.reasons.map((r, i) => (
                          <View key={i} style={s.aiMReasonRow}>
                            <Ionicons name="alert-circle" size={14} color={C.red} />
                            <Text style={s.aiMReasonText}>{r}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Sound classifications */}
                    {d.detections && d.detections.length > 0 && (
                      <View style={s.aiMSection}>
                        <View style={s.aiMSectionHeader}>
                          <Ionicons name="list" size={18} color={C.saddle} />
                          <Text style={s.aiMSectionTitle}>Sound Classifications</Text>
                        </View>
                        {d.detections.map((det, i) => (
                          <View key={i} style={s.aiMDetRow}>
                            <LinearGradient
                              colors={i === 0 ? [C.gold, C.saddle] : ['#5D3A1A','#3D2B10']}
                              style={s.aiMDetRank}
                            >
                              <Text style={s.aiMDetRankText}>#{i+1}</Text>
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                              <Text style={s.aiMDetClass}>{det.class}</Text>
                              <View style={s.aiMConfRow}>
                                <View style={s.aiMConfBg}>
                                  <LinearGradient
                                    colors={[C.gold, C.saddle]}
                                    style={[s.aiMConfFill, { width: `${(det.confidence * 100).toFixed(1)}%` }]}
                                  />
                                </View>
                                <Text style={s.aiMConfPct}>{(det.confidence * 100).toFixed(1)}%</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Processing time */}
                    {d.processing_time != null && (
                      <View style={s.aiMFooter}>
                        <Ionicons name="time-outline" size={14} color={C.gold} />
                        <Text style={s.aiMFooterText}>Processed in {d.processing_time}s</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Update Report Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}><Ionicons name="close" size={26} color="#333" /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {selectedReport && getAvailableResponses(selectedReport).map(opt => (
                <TouchableOpacity key={opt.status} style={[s.statusOpt, selectedStatus === opt.status && s.statusOptSelected]} onPress={() => setSelectedStatus(opt.status)} activeOpacity={0.7}>
                  <View style={s.statusOptHeader}>
                    <View style={[s.radio, selectedStatus === opt.status && s.radioSelected]}>
                      {selectedStatus === opt.status && <View style={s.radioInner} />}
                    </View>
                    <Ionicons name={opt.icon} size={22} color={getStatusColor(opt.status)} />
                    <Text style={[s.statusOptLabel, { color: getStatusColor(opt.status) }]}>{opt.label}</Text>
                  </View>
                  <Text style={s.statusOptText}>{opt.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setStatusModalVisible(false)}><Text style={s.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, updatingStatus && { opacity: 0.6 }]} onPress={updateReportStatus} disabled={updatingStatus}>
                {updatingStatus ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="checkmark" size={18} color="#FFF" /><Text style={s.saveBtnText}>Save</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText:  { marginTop: 10, color: C.saddle, fontSize: 15 },
  emptyText:    { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 12 },
  header:       { paddingHorizontal: 18, paddingBottom: 14 },
  headerTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerBtn:    { padding: 6 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: C.white, flex: 1, textAlign: 'center' },
  headerSub:    { color: C.gold, fontSize: 12, textAlign: 'center' },
  searchBar:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 14, marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8, elevation: 2 },
  searchInput:  { flex: 1, fontSize: 14, color: C.text },
  monthPicker:  { backgroundColor: C.white, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  monthChip:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F0F0F0', marginRight: 8 },
  monthChipActive: { backgroundColor: C.saddle },
  monthChipText:   { fontSize: 12, color: '#555', fontWeight: '500' },
  monthChipTextActive: { color: C.white, fontWeight: '700' },
  filterBar:    { backgroundColor: C.white, paddingVertical: 8, maxHeight: 46 },
  filterPill:   { paddingVertical: 5, paddingHorizontal: 14, backgroundColor: '#F0F0F0', borderRadius: 16 },
  filterPillActive: { backgroundColor: C.saddle },
  filterPillText:   { fontSize: 12, color: '#333', fontWeight: '500' },
  filterPillTextActive: { color: C.white, fontWeight: '700' },
  errorBox:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', margin: 14, borderRadius: 10, padding: 12, gap: 8 },
  errorText:    { flex: 1, color: C.red, fontSize: 13 },
  retryText:    { color: C.blue, fontWeight: '700', fontSize: 13 },
  card:         { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2, shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft:     { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  cardRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardIcon:     { fontSize: 28 },
  cardReason:   { fontSize: 15, fontWeight: '700', color: C.text },
  cardDate:     { fontSize: 11, color: '#999', marginTop: 2 },
  levelBadge:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, gap: 4 },
  levelDot:     { width: 7, height: 7, borderRadius: 4 },
  levelText:    { fontSize: 10, fontWeight: '700' },
  details:      { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  statusRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, gap: 5 },
  statusText:   { fontSize: 12, fontWeight: '700', color: C.white },
  daysBadge:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#FFEBEE', gap: 5 },
  daysText:     { fontSize: 11, fontWeight: '700', color: C.red },
  responseBox:  { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: C.blue },
  responseBoxPending: { backgroundColor: '#FFF3E0', borderLeftColor: '#F57C00' },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  responseTitle:  { fontSize: 14, fontWeight: '700', color: C.blue, flex: 1 },
  responseText:   { fontSize: 13, color: '#333', lineHeight: 19, backgroundColor: C.white, borderRadius: 8, padding: 10, marginBottom: 6 },
  tapHint:        { fontSize: 11, color: C.blue, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
  aiRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  aiChip:         { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  aiChipText:     { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  detailRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  detailText:     { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox:       { backgroundColor: C.white, borderRadius: 16, width: '100%', maxHeight: '80%', elevation: 5 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: '#333' },
  statusOpt:      { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, marginHorizontal: 16, marginTop: 12, borderWidth: 2, borderColor: '#E0E0E0' },
  statusOptSelected: { backgroundColor: '#E8F5E9', borderColor: C.green },
  statusOptHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  radio:          { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  radioSelected:  { borderColor: C.green },
  radioInner:     { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green },
  statusOptLabel: { fontSize: 14, fontWeight: '700' },
  statusOptText:  { fontSize: 13, color: '#555', lineHeight: 18 },
  modalFooter:    { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  cancelBtn:      { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  cancelBtnText:  { color: '#666', fontWeight: '600' },
  saveBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: C.green },
  saveBtnText:    { color: C.white, fontWeight: '700' },
  drawerWrap:     { width: width * 0.82, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: C.white, elevation: 5 },
  // file count badge on card icon
  fileCountBadgeSmall: { position: 'absolute', top: -4, right: -6, backgroundColor: C.saddle, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  fileCountBadgeSmallText: { color: C.white, fontSize: 9, fontWeight: '800' },
  // AI analysis section
  aiSection:      { backgroundColor: '#F9F5F0', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.gold },
  aiSectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiSectionTitle: { fontSize: 13, fontWeight: '700', color: C.saddle, flex: 1 },
  aiDetailRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  aiDetailLabel:  { fontSize: 12, color: '#888', fontWeight: '600', width: 100 },
  aiDetailValue:  { fontSize: 12, color: C.text, flex: 1, textAlign: 'right' },
  // media section
  mediaSectionWrap:   { marginBottom: 10 },
  mediaSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  mediaSectionTitle:  { fontSize: 13, fontWeight: '700', color: C.saddle, flex: 1 },
  fileCountBadge:     { backgroundColor: C.saddle, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  fileCountText:      { color: C.white, fontSize: 10, fontWeight: '700' },
  // media player
  mediaPlayer:        { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  mediaPlayerHeader:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  mediaTypeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  mediaTypeText:      { fontSize: 11, color: C.saddle, fontWeight: '700' },
  // audio player inside media player
  audioBtn:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  audioBtnText:       { fontSize: 14, fontWeight: '600', color: C.saddle },
  audioProgressBar:   { height: 4, backgroundColor: '#DDD', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  audioProgressFill:  { height: '100%', backgroundColor: C.saddle, borderRadius: 2 },
  audioTimeRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  audioTime:          { fontSize: 10, color: '#999' },
  // video player
  videoPlayer:        { width: '100%', height: 220, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden' },
  timestamp:          { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 6 },

  // Forensic button
  forensicBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF9F0', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.gold },
  forensicBtnReportable: { backgroundColor: '#FFF5F5', borderColor: C.red },
  forensicBtnText:    { flex: 1, fontSize: 12, fontWeight: '700', color: C.saddle },
  reportableDot:      { width: 18, height: 18, borderRadius: 9, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center' },
  reportableDotText:  { color: '#fff', fontSize: 10, fontWeight: '900' },

  // AI Forensic Modal
  aiModalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  aiModalTitle:       { fontSize: 17, fontWeight: '800', color: C.gold },
  aiMFileRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  aiMFileName:        { flex: 1, fontSize: 13, fontWeight: '600', color: C.text },
  sourcePill:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sourcePillLive:     { backgroundColor: C.green },
  sourcePillDl:       { backgroundColor: C.blue },
  sourcePillText:     { fontSize: 10, color: '#fff', fontWeight: '700' },
  aiMAlert:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, padding: 14, marginBottom: 14 },
  aiMAlertTitle:      { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  aiMAlertSub:        { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  aiMMetrics:         { flexDirection: 'row', gap: 8, marginBottom: 14 },
  aiMMetricCard:      { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6 },
  aiMMetricVal:       { color: C.gold, fontSize: 15, fontWeight: '800' },
  aiMMetricLbl:       { color: '#fff', fontSize: 9, opacity: 0.8 },
  aiMSection:         { backgroundColor: '#FAF5EB', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E8DDD0' },
  aiMSectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiMSectionTitle:    { fontSize: 14, fontWeight: '700', color: C.saddle },
  aiMDistCat:         { fontSize: 16, fontWeight: '800', color: C.saddle, marginBottom: 2 },
  aiMDistMeters:      { fontSize: 13, color: C.text, marginBottom: 4 },
  aiMDistRef:         { fontSize: 11, color: '#888', fontStyle: 'italic', marginBottom: 2 },
  aiMDistDesc:        { fontSize: 12, color: '#666' },
  aiMReasonRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  aiMReasonText:      { flex: 1, fontSize: 13, color: '#555' },
  aiMDetRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  aiMDetRank:         { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  aiMDetRankText:     { color: '#fff', fontSize: 11, fontWeight: '800' },
  aiMDetClass:        { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
  aiMConfRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiMConfBg:          { flex: 1, height: 6, backgroundColor: '#EEE', borderRadius: 3, overflow: 'hidden' },
  aiMConfFill:        { height: '100%', borderRadius: 3 },
  aiMConfPct:         { fontSize: 11, fontWeight: '700', color: C.saddle, width: 42 },
  aiMFooter:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEE', marginTop: 4 },
  aiMFooterText:      { fontSize: 12, color: '#888' },
});
