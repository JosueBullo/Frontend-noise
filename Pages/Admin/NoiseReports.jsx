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
import { Video, Audio } from 'expo-av';

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

function formatDuration(millis) {
  if (!millis) return '0:00';
  const seconds = Math.floor(millis / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const VideoPlayerComponent = React.memo(({ reportId, videoUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Video
      source={{ uri: videoUrl }}
      style={s.videoPlayer}
      useNativeControls
      resizeMode="contain"
      shouldPlay={isPlaying}
      onPlaybackStatusUpdate={(status) => {
        if (status.isLoaded) {
          if (status.isPlaying !== isPlaying) {
            setIsPlaying(status.isPlaying);
          }
        }
      }}
    />
  );
});

const AudioPlayerComponent = React.memo(({ reportId, audioUrl, currentlyPlayingId, setCurrentlyPlayingId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (currentlyPlayingId !== reportId && isPlaying) {
      pauseAudio();
    }
  }, [currentlyPlayingId]);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const playAudio = async () => {
    try {
      setCurrentlyPlayingId(reportId);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true, progressUpdateIntervalMillis: 250 },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
      } else {
        await soundRef.current.playAsync();
      }
      setIsPlaying(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const pauseAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {}
  };

  const stopAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
        setIsPlaying(false);
        setPosition(0);
      }
    } catch (error) {}
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={s.audioPlayer}>
      <View style={s.audioControls}>
        <TouchableOpacity
          style={s.playButton}
          onPress={() => {
            if (isPlaying) pauseAudio();
            else playAudio();
          }}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
        </TouchableOpacity>
        {soundRef.current && (
          <TouchableOpacity style={s.stopButton} onPress={stopAudio}>
            <Ionicons name="stop" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <View style={s.progressContainer}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={s.timeContainer}>
          <Text style={s.timeText}>{formatDuration(position)}</Text>
          <Text style={s.timeText}>{formatDuration(duration)}</Text>
        </View>
      </View>
      <View style={s.waveformContainer}>
        <Ionicons name="musical-notes" size={16} color="#D4AC0D" />
        <Text style={s.audioLabel}>Audio Evidence</Text>
      </View>
    </View>
  );
});
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

  // Media Playback states
  const [currentlyPlayingAudioId, setCurrentlyPlayingAudioId] = useState(null);

  // AI Modal states
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);

  const openAiModal = (aiResult) => {
    setAiModalData(aiResult);
    setAiModalVisible(true);
  };

  const renderMediaPlayer = (report) => {
    const reportId = report._id || report.id;
    const mediaUrl = report.mediaUrl;
    if (!mediaUrl) return null;

    return (
      <View style={s.mediaContainer}>
        {report.mediaType === 'video' ? (
          <VideoPlayerComponent reportId={reportId} videoUrl={mediaUrl} />
        ) : (
          <AudioPlayerComponent
            reportId={reportId}
            audioUrl={mediaUrl}
            currentlyPlayingId={currentlyPlayingAudioId}
            setCurrentlyPlayingId={setCurrentlyPlayingAudioId}
          />
        )}
      </View>
    );
  };

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

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, s.overlay, { opacity: overlayAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>

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
                  
                  {/* AI Analysis Section */}
                  {(report.aiSummary || report.averageDecibel || report.distanceCategory || report.estimatedDistance || report.ai_distance_meters) && (
                    <View style={s.aiSection}>
                      <View style={s.aiSectionHeader}>
                        <Ionicons name="psychology" size={16} color={C.gold} />
                        <Text style={s.aiSectionTitle}>AI Analysis</Text>
                        {report.aiSummary && report.aiSummary.filesAnalyzed > 0 && (
                          <View style={s.filesAnalyzedBadge}>
                            <Text style={s.filesAnalyzedText}>{report.aiSummary.filesAnalyzed} file{report.aiSummary.filesAnalyzed > 1 ? 's' : ''} analyzed</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.aiGrid}>
                        {report.aiSummary && report.aiSummary.topDetection && (
                          <View style={s.aiGridItem}>
                            <Text style={s.aiItemLabel}>Top Detection</Text>
                            <Text style={s.aiItemValue}>{report.aiSummary.topDetection}{report.aiSummary.topConfidence && <Text style={s.confidenceText}> ({Math.round(report.aiSummary.topConfidence * 100)}%)</Text>}</Text>
                          </View>
                        )}
                        {(report.averageDecibel != null || (report.aiSummary && report.aiSummary.averageDecibel != null) || report.ai_decibel != null) && (
                          <View style={s.aiGridItem}>
                            <Text style={s.aiItemLabel}>Avg Decibel</Text>
                            <Text style={s.aiItemValue}>🔊 {report.averageDecibel || (report.aiSummary && report.aiSummary.averageDecibel) || report.ai_decibel} dB</Text>
                          </View>
                        )}
                        {(report.estimatedDistance != null || (report.aiSummary && report.aiSummary.estimatedDistance != null) || report.ai_distance_meters != null) && (
                          <View style={s.aiGridItem}>
                            <Text style={s.aiItemLabel}>Est. Distance</Text>
                            <Text style={s.aiItemValue}>📏 {report.estimatedDistance || (report.aiSummary && report.aiSummary.estimatedDistance) || report.ai_distance_meters}m</Text>
                          </View>
                        )}
                        {report.isReportable && (
                          <View style={s.aiGridItem}>
                            <Text style={s.aiItemLabel}>Reportable</Text>
                            <Text style={[s.aiItemValue, { color: C.red }]}>⚡ Yes (Actionable)</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* AI Forensic Analysis Buttons per file */}
                  {report.aiResults && report.aiResults.length > 0 && (
                    <View style={s.forensicSection}>
                      {report.aiResults.map((aiResult, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[s.forensicBtn, aiResult.is_reportable && s.forensicBtnReportable]}
                          onPress={() => openAiModal(aiResult)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="flask-outline" size={16} color={aiResult.is_reportable ? C.red : C.saddle} />
                          <Text style={[s.forensicBtnText, aiResult.is_reportable && { color: C.red }]} numberOfLines={1}>
                            🔬 AI Forensic File {idx + 1}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={C.sub} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Media Playback Evidence */}
                  {renderMediaPlayer(report)}

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

      {/* ── AI Forensic Analysis Modal ── */}
      <Modal visible={aiModalVisible} transparent animationType="slide" onRequestClose={() => setAiModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { maxHeight: height * 0.85 }]}>
            <LinearGradient colors={[C.dark, C.mid]} style={s.modalHeader}>
              <Text style={s.modalTitle}>🔬 AI Forensic Analysis</Text>
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <Ionicons name="close" size={26} color={C.cream} />
              </TouchableOpacity>
            </LinearGradient>
            
            {aiModalData && (
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* File info row */}
                <View style={s.aiFileInfoRow}>
                  <Ionicons name={aiModalData.type === 'video' ? 'videocam-outline' : 'musical-notes-outline'} size={20} color={C.saddle} />
                  <Text style={s.aiFileNameText} numberOfLines={1}>{aiModalData.fileName || 'Recording File'}</Text>
                  {aiModalData.source && (
                    <View style={[s.sourceBadge, { backgroundColor: aiModalData.source === 'live' ? 'rgba(76,175,80,0.1)' : 'rgba(33,150,243,0.1)' }]}>
                      <Text style={[s.sourceBadgeText, { color: aiModalData.source === 'live' ? C.green : C.blue }]}>
                        {aiModalData.source === 'live' ? 'Live' : 'Uploaded'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Severity Banner */}
                {aiModalData.is_reportable && (
                  <View style={[s.aiAlertBanner, { backgroundColor: aiModalData.severity_name === 'CRITICAL' ? 'rgba(244,67,54,0.1)' : 'rgba(255,193,7,0.1)', borderColor: aiModalData.severity_name === 'CRITICAL' ? C.red : C.yellow }]}>
                    <Ionicons name="warning-outline" size={20} color={aiModalData.severity_name === 'CRITICAL' ? C.red : '#F57F17'} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[s.aiAlertTitle, { color: aiModalData.severity_name === 'CRITICAL' ? C.red : '#F57F17' }]}>
                        {aiModalData.severity_name === 'CRITICAL' ? '🚨 CRITICAL NOISE VIOLATION' : '⚠️ REPORTABLE NOISE DETECTED'}
                      </Text>
                      {aiModalData.recommendation ? (
                        <Text style={s.aiAlertDesc}>{aiModalData.recommendation}</Text>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* Metrics Grid */}
                <View style={s.aiMetricsRow}>
                  <View style={s.aiMetricCard}>
                    <Ionicons name="volume-high-outline" size={18} color={C.saddle} />
                    <Text style={s.aiMetricValue}>{aiModalData.decibel ?? 0} dB</Text>
                    <Text style={s.aiMetricLabel}>DECIBEL</Text>
                  </View>
                  <View style={s.aiMetricCard}>
                    <Ionicons name="speedometer-outline" size={18} color={C.saddle} />
                    <Text style={s.aiMetricValue}>{aiModalData.noise_level?.level || 'N/A'}</Text>
                    <Text style={s.aiMetricLabel}>LEVEL</Text>
                  </View>
                  <View style={s.aiMetricCard}>
                    <Ionicons name="navigate-outline" size={18} color={C.saddle} />
                    <Text style={s.aiMetricValue}>~{aiModalData.distance?.meters ?? 0}m</Text>
                    <Text style={s.aiMetricLabel}>EST. DISTANCE</Text>
                  </View>
                </View>

                {/* Distance Category */}
                {aiModalData.distance && (
                  <View style={s.aiModalSection}>
                    <Text style={s.aiSectionSubHeader}>Distance Estimation</Text>
                    <Text style={s.aiSectionValue}>Category: {aiModalData.distance.category || 'Unknown'}</Text>
                    <Text style={s.aiSectionValue}>Estimated: {aiModalData.distance.meters} meters from sensor</Text>
                    {aiModalData.distance.reference_sound ? (
                      <Text style={s.aiSectionValueSub}>Based on reference: {aiModalData.distance.reference_sound} ({aiModalData.distance.reference_db}dB at 1m)</Text>
                    ) : null}
                    {aiModalData.distance.description ? (
                      <Text style={s.aiSectionDesc}>{aiModalData.distance.description}</Text>
                    ) : null}
                  </View>
                )}

                {/* Reasons List */}
                {aiModalData.reasons && aiModalData.reasons.length > 0 && (
                  <View style={[s.aiModalSection, { borderLeftColor: C.red }]}>
                    <Text style={[s.aiSectionSubHeader, { color: C.red }]}>Reasons & Diagnostics</Text>
                    {aiModalData.reasons.map((r, i) => (
                      <View key={i} style={s.reasonRow}>
                        <Ionicons name="close-circle-outline" size={14} color={C.red} />
                        <Text style={s.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Classification Detections */}
                {aiModalData.detections && aiModalData.detections.length > 0 && (
                  <View style={s.aiModalSection}>
                    <Text style={s.aiSectionSubHeader}>Sound Classifications</Text>
                    {aiModalData.detections.map((det, i) => (
                      <View key={i} style={s.detectionBarRow}>
                        <View style={[s.rankBadge, { backgroundColor: i === 0 ? C.gold : C.mid }]}>
                          <Text style={s.rankBadgeText}>#{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={s.detClassText}>{det.class}</Text>
                            <Text style={s.detConfText}>{Math.round(det.confidence * 100)}%</Text>
                          </View>
                          <View style={s.confBarBg}>
                            <View style={[s.confBarFill, { width: `${det.confidence * 100}%`, backgroundColor: i === 0 ? C.gold : C.saddle }]} />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Processing time */}
                {aiModalData.processing_time != null ? (
                  <Text style={s.processingTimeText}>AI analysis computed in {aiModalData.processing_time} seconds</Text>
                ) : null}
              </ScrollView>
            )}

            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.btnPrimary, { width: '100%' }]} onPress={() => setAiModalVisible(false)}>
                <Text style={s.btnPrimaryText}>Done</Text>
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
  
  // Media Player Styles
  mediaContainer: { marginTop: 8, marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#F0E8DC' },
  videoPlayer: { width: '100%', height: 180, backgroundColor: '#000' },
  audioPlayer: { padding: 12, backgroundColor: '#fff', borderRadius: 12 },
  audioControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 10 },
  playButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B4513', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  stopButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#5D4A36', justifyContent: 'center', alignItems: 'center' },
  progressContainer: { marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#DAA520', borderRadius: 2 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 11, color: '#8B7355', fontWeight: '600' },
  waveformContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0E8DC' },
  audioLabel: { fontSize: 12, color: '#8B4513', fontWeight: '700' },

  // AI forensic styles
  aiSection: { marginTop: 12, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#F0E8DC', borderRadius: 12, padding: 12, marginBottom: 10 },
  aiSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  aiSectionTitle: { fontSize: 13, fontWeight: '700', color: C.dark },
  filesAnalyzedBadge: { marginLeft: 'auto', backgroundColor: '#E0F2F1', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  filesAnalyzedText: { fontSize: 10, color: '#004D40', fontWeight: '600' },
  aiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aiGridItem: { backgroundColor: C.white, borderWidth: 1, borderColor: '#F0E8DC', borderRadius: 8, padding: 8, flex: 1, minWidth: '45%' },
  aiItemLabel: { fontSize: 10, color: C.sub, marginBottom: 2 },
  aiItemValue: { fontSize: 12, fontWeight: '700', color: C.text },
  confidenceText: { fontSize: 10, fontWeight: '500', color: C.sub },
  
  forensicSection: { marginBottom: 10, gap: 8 },
  forensicBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: '#F0E8DC', borderRadius: 10, padding: 10 },
  forensicBtnReportable: { borderColor: C.red, backgroundColor: '#FFEBEE' },
  forensicBtnText: { fontSize: 12, fontWeight: '600', color: C.saddle, flex: 1 },
  
  aiFileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: '#F9F5EF', padding: 8, borderRadius: 8 },
  aiFileNameText: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1 },
  sourceBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  sourceBadgeText: { fontSize: 10, fontWeight: '700' },
  
  aiAlertBanner: { flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 4, borderRadius: 8, padding: 10, marginBottom: 14 },
  aiAlertTitle: { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  aiAlertDesc: { fontSize: 11, color: C.text, lineHeight: 15 },
  
  aiMetricsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  aiMetricCard: { flex: 1, backgroundColor: '#FAF8F5', borderWidth: 1, borderColor: '#F0E8DC', borderRadius: 10, padding: 10, alignItems: 'center' },
  aiMetricValue: { fontSize: 14, fontWeight: '800', color: C.dark, marginVertical: 3 },
  aiMetricLabel: { fontSize: 9, fontWeight: '600', color: C.sub },
  
  aiModalSection: { borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: 10, marginBottom: 14 },
  aiSectionSubHeader: { fontSize: 12, fontWeight: '800', color: C.dark, marginBottom: 6 },
  aiSectionValue: { fontSize: 12, color: C.text, marginBottom: 2 },
  aiSectionValueSub: { fontSize: 10, color: C.sub, fontStyle: 'italic', marginBottom: 2 },
  aiSectionDesc: { fontSize: 11, color: C.text, fontStyle: 'italic', marginTop: 4, lineHeight: 15 },
  
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  reasonText: { fontSize: 12, color: C.text },
  
  detectionBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rankBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  rankBadgeText: { fontSize: 9, fontWeight: '800', color: C.cream },
  detClassText: { fontSize: 12, color: C.text, fontWeight: '600' },
  detConfText: { fontSize: 11, color: C.sub, fontWeight: '700' },
  confBarBg: { height: 6, backgroundColor: '#ECEFF1', borderRadius: 3, overflow: 'hidden' },
  confBarFill: { height: '100%', borderRadius: 3 },
  processingTimeText: { fontSize: 11, color: C.sub, textAlign: 'center', fontStyle: 'italic', marginTop: 10 },
});

