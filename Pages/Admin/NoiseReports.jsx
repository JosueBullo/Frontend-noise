// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
//   StatusBar, Dimensions, Platform, ScrollView,
//   RefreshControl, Alert, ActivityIndicator,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import CustomDrawer from '../CustomDrawer';
// import API_BASE_URL from '../../utils/api';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// export default function AdminNoiseReportsScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [reports, setReports] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [expandedReport, setExpandedReport] = useState(null);
//   const [selectedFilter, setSelectedFilter] = useState('All');
//   const [playingAudio, setPlayingAudio] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [statusModalVisible, setStatusModalVisible] = useState(false);
//   const [selectedReport, setSelectedReport] = useState(null);
//   const [selectedStatus, setSelectedStatus] = useState(null);
//   const [updatingStatus, setUpdatingStatus] = useState(false);

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     fetchReports();
//     return () => { if (sound) sound.unloadAsync(); };
//   }, []);

//   const fetchReports = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`${API_BASE_URL}/reports/get-report`);
//       const data = await response.json();
//       if (response.ok) {
//         const transformed = data.map(r => ({
//           ...r,
//           audioUri: r.mediaType === 'audio' ? r.mediaUrl : null,
//           videoUri: r.mediaType === 'video' ? r.mediaUrl : null,
//         }));
//         setReports(transformed);
//       } else {
//         Alert.alert('Error', 'Failed to fetch reports');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Could not connect to server');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await fetchReports();
//     setRefreshing(false);
//   };

//   const updateReportStatus = async () => {
//     if (!selectedReport || !selectedStatus) {
//       Alert.alert('Error', 'Please select a response');
//       return;
//     }
//     try {
//       setUpdatingStatus(true);
//       const response = await fetch(`${API_BASE_URL}/reports/update-status/${selectedReport._id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: selectedStatus }),
//       });
//       if (response.ok) {
//         Alert.alert('Success', 'Report status updated successfully');
//         setStatusModalVisible(false);
//         setSelectedReport(null);
//         setSelectedStatus(null);
//         await fetchReports();
//       } else {
//         const error = await response.json();
//         Alert.alert('Error', error.message || 'Failed to update status');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Could not update status');
//     } finally {
//       setUpdatingStatus(false);
//     }
//   };

//   const getAvailableResponses = (report) => {
//     const { noiseLevel, consecutiveDays } = report;
//     const responses = [];

//     if (noiseLevel === "red") {
//       responses.push({
//         status: 'monitoring',
//         text: `We have received your report. The barangay is monitoring this location. Progress: Day ${consecutiveDays} of 3 consecutive reports for RED noise.`,
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       if (consecutiveDays >= 3) {
//         responses.push({
//           status: 'action_required',
//           text: "The noise at this location has been reported for 3 consecutive days. A barangay officer has been assigned to take action. You will be updated once resolved.",
//           label: 'Action Required',
//           icon: 'alert-circle'
//         });
//       }
//       responses.push({
//         status: 'resolved',
//         text: "Your noise complaint has been resolved. Appropriate action has been taken by the barangay.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "yellow") {
//       responses.push({
//         status: 'monitoring',
//         text: `Your report has been recorded. The barangay will continue monitoring. Progress: Day ${consecutiveDays} of 5 consecutive reports for YELLOW noise.`,
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       if (consecutiveDays >= 5) {
//         responses.push({
//           status: 'action_required',
//           text: "The noise has been reported for 5 consecutive days. A barangay officer will take action. You will be updated once resolved.",
//           label: 'Action Required',
//           icon: 'alert-circle'
//         });
//       }
//       responses.push({
//         status: 'resolved',
//         text: "Your noise complaint has been resolved. The barangay has addressed the issue.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "green") {
//       responses.push({
//         status: 'monitoring',
//         text: "Your report has been received. This minor noise is under observation. The barangay advises communicating with neighbors to resolve minor disturbances.",
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       responses.push({
//         status: 'resolved',
//         text: "Advice has been provided regarding your noise report. The matter is now closed.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     }

//     return responses;
//   };

//   const openStatusModal = (report) => {
//     setSelectedReport(report);
//     setSelectedStatus(report.status || null);
//     setStatusModalVisible(true);
//   };

//   const getCurrentResponse = (report) => {
//     if (!report.status || report.status === 'pending') {
//       return "No response sent yet. Click to select a response.";
//     }
//     const responses = getAvailableResponses(report);
//     const current = responses.find(r => r.status === report.status);
//     return current ? current.text : "Response sent.";
//   };

//   const playAudio = async (audioUri, reportId) => {
//     try {
//       if (sound) {
//         await sound.unloadAsync();
//         setSound(null);
//         if (playingAudio === reportId) {
//           setPlayingAudio(null);
//           return;
//         }
//       }
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
//       setSound(newSound);
//       setPlayingAudio(reportId);
//       newSound.setOnPlaybackStatusUpdate((status) => {
//         if (status.didJustFinish) {
//           setPlayingAudio(null);
//           newSound.unloadAsync();
//         }
//       });
//     } catch (error) {
//       Alert.alert('Error', 'Could not play audio');
//     }
//   };

//   const getFilteredReports = () => {
//     if (selectedFilter === 'All') return reports;
//     return reports.filter(r => r.reason?.includes(selectedFilter) || r.reason === selectedFilter);
//   };

//   const getReasonIcon = (reason) => {
//     if (!reason) return '📢';
//     if (reason.includes('Music')) return '🔊';
//     if (reason.includes('Vehicle')) return '🚗';
//     if (reason.includes('Construction')) return '🔨';
//     if (reason.includes('Party')) return '🎉';
//     if (reason.includes('Animal')) return '🐕';
//     if (reason.includes('Industrial')) return '🏭';
//     if (reason.includes('Shouting')) return '🗣️';
//     return '📢';
//   };

//   const getNoiseLevelColor = (level) => ({ red: '#F44336', yellow: '#FFC107', green: '#4CAF50' }[level] || '#999');
//   const getNoiseLevelBg = (level) => ({ red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' }[level] || '#F5F5F5');
//   const getNoiseLevelLabel = (level) => ({ red: 'High', yellow: 'Medium', green: 'Low' }[level] || 'Unknown');
//   const getStatusColor = (status) => ({ pending: '#999', action_required: '#F44336', monitoring: '#FFC107', resolved: '#4CAF50' }[status] || '#999');
//   const getStatusLabel = (status) => ({ pending: 'Pending', action_required: 'Action Required', monitoring: 'Monitoring', resolved: 'Resolved' }[status] || 'Pending');

//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffMins = Math.floor((now - date) / 60000);
//     const diffHours = Math.floor(diffMins / 60);
//     const diffDays = Math.floor(diffHours / 24);
//     if (diffMins < 1) return 'Just now';
//     if (diffMins < 60) return `${diffMins}m ago`;
//     if (diffHours < 24) return `${diffHours}h ago`;
//     if (diffDays < 7) return `${diffDays}d ago`;
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//   };

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
//     ]).start();
//   };

//   const closeDrawer = () => {
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
//     ]).start(() => setDrawerVisible(false));
//   };

//   const filters = ['All', 'Music', 'Vehicle', 'Construction', 'Party', 'Animal'];
//   const filteredReports = getFilteredReports();

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
//         <View style={styles.headerContent}>
//           <View style={styles.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
//               <Ionicons name="refresh" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={styles.headerTitle}>📊 Noise Reports</Text>
//           <Text style={styles.headerSubtitle}>
//             {filteredReports.length} {selectedFilter !== 'All' ? selectedFilter : ''} report{filteredReports.length !== 1 ? 's' : ''}
//           </Text>
//         </View>
//       </LinearGradient>

//       <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={styles.filterContent}>
//         {filters.map((filter) => (
//           <TouchableOpacity
//             key={filter}
//             style={[styles.filterPill, selectedFilter === filter && styles.filterPillActive]}
//             onPress={() => setSelectedFilter(filter)}
//           >
//             <Text style={[styles.filterPillText, selectedFilter === filter && styles.filterPillTextActive]}>{filter}</Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#8B4513" />
//           <Text style={styles.loadingText}>Loading reports...</Text>
//         </View>
//       ) : filteredReports.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <Ionicons name="document-text-outline" size={80} color="#CCC" />
//           <Text style={styles.emptyText}>No reports found</Text>
//           <Text style={styles.emptySubtext}>
//             {selectedFilter !== 'All' ? `No ${selectedFilter} reports available` : 'Reports will appear here when submitted'}
//           </Text>
//         </View>
//       ) : (
//         <ScrollView
//           style={styles.reportsList}
//           contentContainerStyle={{ paddingBottom: 20 }}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} tintColor="#8B4513" />}
//         >
//           {filteredReports.map((report) => (
//             <TouchableOpacity
//               key={report._id}
//               style={styles.reportCard}
//               onPress={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
//               activeOpacity={0.7}
//             >
//               <View style={styles.reportHeader}>
//                 <View style={styles.reportHeaderLeft}>
//                   <Text style={styles.reportIcon}>{getReasonIcon(report.reason)}</Text>
//                   <View style={styles.reportHeaderText}>
//                     <Text style={styles.reportReason}>{report.reason || 'Noise Report'}</Text>
//                     <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
//                   </View>
//                 </View>
//                 <View style={styles.reportHeaderRight}>
//                   {report.noiseLevel && (
//                     <View style={[styles.noiseLevelBadge, { backgroundColor: getNoiseLevelBg(report.noiseLevel) }]}>
//                       <View style={[styles.noiseLevelDot, { backgroundColor: getNoiseLevelColor(report.noiseLevel) }]} />
//                       <Text style={[styles.noiseLevelText, { color: getNoiseLevelColor(report.noiseLevel) }]}>
//                         {getNoiseLevelLabel(report.noiseLevel)}
//                       </Text>
//                     </View>
//                   )}
//                   <Ionicons name={expandedReport === report._id ? "chevron-up" : "chevron-down"} size={24} color="#8B4513" />
//                 </View>
//               </View>

//               {expandedReport === report._id && (
//                 <View style={styles.reportDetails}>
//                   <View style={styles.statusSection}>
//                     <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status || 'pending') }]}>
//                       <Ionicons name="flag" size={16} color="#FFF" />
//                       <Text style={styles.statusText}>{getStatusLabel(report.status || 'pending')}</Text>
//                     </View>
//                     {report.consecutiveDays > 1 && (
//                       <View style={styles.consecutiveDaysBadge}>
//                         <Ionicons name="calendar" size={16} color="#F44336" />
//                         <Text style={styles.consecutiveDaysText}>{report.consecutiveDays} consecutive days</Text>
//                       </View>
//                     )}
//                   </View>

//                   <TouchableOpacity 
//                     style={[
//                       styles.autoResponseSection,
//                       (!report.status || report.status === 'pending') && styles.autoResponsePending
//                     ]}
//                     onPress={() => openStatusModal(report)}
//                     activeOpacity={0.7}
//                   >
//                     <View style={styles.autoResponseHeader}>
//                       <Ionicons 
//                         name={(!report.status || report.status === 'pending') ? "alert-circle" : "information-circle"} 
//                         size={20} 
//                         color={(!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} 
//                       />
//                       <Text style={[
//                         styles.autoResponseTitle,
//                         (!report.status || report.status === 'pending') && styles.autoResponseTitlePending
//                       ]}>
//                         {(!report.status || report.status === 'pending') ? 'No Response Sent' : 'System Response'}
//                       </Text>
//                       <Ionicons name="create-outline" size={20} color={(!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} style={{ marginLeft: 'auto' }} />
//                     </View>
//                     <View style={styles.autoResponseContent}>
//                       <Text style={[
//                         styles.autoResponseText,
//                         (!report.status || report.status === 'pending') && styles.autoResponseTextPending
//                       ]}>
//                         {getCurrentResponse(report)}
//                       </Text>
//                     </View>
//                     <View style={styles.tapHint}>
//                       <Text style={[
//                         styles.tapHintText,
//                         (!report.status || report.status === 'pending') && styles.tapHintTextPending
//                       ]}>
//                         {(!report.status || report.status === 'pending') ? 'Tap to select and send response' : 'Tap to change response & status'}
//                       </Text>
//                     </View>
//                   </TouchableOpacity>

//                   {report.comment && (
//                     <View style={styles.detailSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="chatbox-outline" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Details</Text>
//                       </View>
//                       <Text style={styles.detailText}>{report.comment}</Text>
//                     </View>
//                   )}

//                   {report.location && (
//                     <View style={styles.detailSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="location" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Location</Text>
//                       </View>
//                       <Text style={styles.detailText}>
//                         Lat: {report.location.latitude?.toFixed(6)}, Lon: {report.location.longitude?.toFixed(6)}
//                       </Text>
//                     </View>
//                   )}

//                   {report.audioUri && (
//                     <View style={styles.detailSection}>
//                       <TouchableOpacity style={styles.audioButton} onPress={() => playAudio(report.audioUri, report._id)}>
//                         <Ionicons name={playingAudio === report._id ? "pause-circle" : "play-circle"} size={40} color="#8B4513" />
//                         <Text style={styles.audioButtonText}>{playingAudio === report._id ? 'Pause' : 'Play'} Audio</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )}

//                   {report.videoUri && (
//                     <View style={styles.videoContainer}>
//                       <Video source={{ uri: report.videoUri }} style={styles.video} useNativeControls resizeMode="contain" />
//                     </View>
//                   )}

//                   <View style={styles.detailSection}>
//                     <Text style={styles.timestampText}>
//                       {new Date(report.createdAt).toLocaleString('en-US', {
//                         month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
//                       })}
//                     </Text>
//                   </View>
//                 </View>
//               )}
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       )}

//       <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
//         <View style={styles.statusModalOverlay}>
//           <View style={styles.statusModalContainer}>
//             <View style={styles.statusModalHeader}>
//               <Text style={styles.statusModalTitle}>Update Report Status</Text>
//               <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
//                 <Ionicons name="close" size={28} color="#333" />
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.statusModalContent} showsVerticalScrollIndicator={false}>
//               {selectedReport && getAvailableResponses(selectedReport).map((response) => (
//                 <TouchableOpacity
//                   key={response.status}
//                   style={[styles.statusOption, selectedStatus === response.status && styles.statusOptionSelected]}
//                   onPress={() => setSelectedStatus(response.status)}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.statusOptionHeader}>
//                     <View style={styles.statusOptionLeft}>
//                       <View style={[styles.statusOptionRadio, selectedStatus === response.status && styles.statusOptionRadioSelected]}>
//                         {selectedStatus === response.status && <View style={styles.statusOptionRadioInner} />}
//                       </View>
//                       <Ionicons name={response.icon} size={24} color={getStatusColor(response.status)} />
//                       <Text style={[styles.statusOptionLabel, { color: getStatusColor(response.status) }]}>
//                         {response.label}
//                       </Text>
//                     </View>
//                   </View>
//                   <View style={styles.statusOptionTextContainer}>
//                     <Text style={styles.statusOptionText}>{response.text}</Text>
//                   </View>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>

//             <View style={styles.statusModalFooter}>
//               <TouchableOpacity style={styles.cancelButton} onPress={() => setStatusModalVisible(false)}>
//                 <Text style={styles.cancelButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.saveButton, updatingStatus && styles.saveButtonDisabled]}
//                 onPress={updateReportStatus}
//                 disabled={updatingStatus}
//               >
//                 {updatingStatus ? (
//                   <ActivityIndicator size="small" color="#FFF" />
//                 ) : (
//                   <>
//                     <Ionicons name="checkmark" size={20} color="#FFF" />
//                     <Text style={styles.saveButtonText}>Save Status</Text>
//                   </>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
//         <View style={styles.modalContainer}>
//           <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
//             <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
//           </Animated.View>
//           <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
//             <CustomDrawer navigation={navigation} onClose={closeDrawer} />
//           </Animated.View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F5F5F5' },
//   header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
//   headerContent: { marginTop: 10 },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
//   headerButton: { padding: 8 },
//   headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
//   headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
//   filterContainer: { backgroundColor: '#FFF', paddingVertical: 8, maxHeight: 48 },
//   filterContent: { paddingHorizontal: 15, gap: 8 },
//   filterPill: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#F0F0F0', borderRadius: 16 },
//   filterPillActive: { backgroundColor: '#8B4513' },
//   filterPillText: { fontSize: 13, color: '#333', fontWeight: '500' },
//   filterPillTextActive: { color: '#FFF', fontWeight: 'bold' },
//   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   loadingText: { marginTop: 10, fontSize: 16, color: '#8B4513' },
//   emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
//   emptyText: { fontSize: 20, fontWeight: 'bold', color: '#999', marginTop: 15 },
//   emptySubtext: { fontSize: 14, color: '#BBB', textAlign: 'center', marginTop: 8 },
//   reportsList: { flex: 1 },
//   reportCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 16, elevation: 2 },
//   reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   reportHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
//   reportHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   reportIcon: { fontSize: 32, marginRight: 12 },
//   reportHeaderText: { flex: 1 },
//   reportReason: { fontSize: 16, fontWeight: 'bold', color: '#333' },
//   reportDate: { fontSize: 12, color: '#999', marginTop: 2 },
//   noiseLevelBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
//   noiseLevelDot: { width: 8, height: 8, borderRadius: 4 },
//   noiseLevelText: { fontSize: 11, fontWeight: 'bold' },
//   reportDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
//   statusSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
//   statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
//   statusText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
//   consecutiveDaysBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFEBEE', gap: 6 },
//   consecutiveDaysText: { fontSize: 12, fontWeight: 'bold', color: '#F44336' },
//   autoResponseSection: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2196F3', borderWidth: 2, borderColor: '#2196F3' },
//   autoResponsePending: { backgroundColor: '#FFF3E0', borderLeftColor: '#F57C00', borderColor: '#F57C00' },
//   autoResponseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
//   autoResponseTitle: { fontSize: 16, fontWeight: '700', color: '#1976D2', marginLeft: 8 },
//   autoResponseTitlePending: { color: '#F57C00' },
//   autoResponseContent: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8 },
//   autoResponseText: { fontSize: 14, color: '#333', lineHeight: 20 },
//   autoResponseTextPending: { fontStyle: 'italic', color: '#666' },
//   tapHint: { alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BBDEFB' },
//   tapHintText: { fontSize: 12, color: '#1976D2', fontWeight: '600', fontStyle: 'italic' },
//   tapHintTextPending: { color: '#F57C00' },
//   detailSection: { marginBottom: 12 },
//   detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
//   detailLabel: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },
//   detailText: { fontSize: 14, color: '#555', lineHeight: 20 },
//   audioButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F9F9F9', paddingVertical: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
//   audioButtonText: { fontSize: 16, fontWeight: '600', color: '#8B4513' },
//   videoContainer: { borderRadius: 8, overflow: 'hidden', marginTop: 8 },
//   video: { width: '100%', height: 200, backgroundColor: '#000' },
//   timestampText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },
//   statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   statusModalContainer: { backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80%', elevation: 5 },
//   statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
//   statusModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
//   statusModalContent: { padding: 20, maxHeight: 400 },
//   statusOption: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E0E0E0' },
//   statusOptionSelected: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
//   statusOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   statusOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
//   statusOptionRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
//   statusOptionRadioSelected: { borderColor: '#4CAF50' },
//   statusOptionRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
//   statusOptionLabel: { fontSize: 16, fontWeight: 'bold' },
//   statusOptionTextContainer: { backgroundColor: '#FFF', borderRadius: 8, padding: 12 },
//   statusOptionText: { fontSize: 14, color: '#555', lineHeight: 20 },
//   statusModalFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 12 },
//   cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
//   cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
//   saveButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
//   saveButtonDisabled: { backgroundColor: '#CCC' },
//   saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
// });


// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
//   StatusBar, Dimensions, Platform, ScrollView,
//   RefreshControl, Alert, ActivityIndicator, FlatList
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import CustomDrawer from '../CustomDrawer';
// import API_BASE_URL from '../../utils/api';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// export default function AdminNoiseReportsScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [reports, setReports] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [expandedReport, setExpandedReport] = useState(null);
//   const [selectedFilter, setSelectedFilter] = useState('All');
//   const [playingAudio, setPlayingAudio] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [statusModalVisible, setStatusModalVisible] = useState(false);
//   const [selectedReport, setSelectedReport] = useState(null);
//   const [selectedStatus, setSelectedStatus] = useState(null);
//   const [updatingStatus, setUpdatingStatus] = useState(false);
//   const [selectedAiFile, setSelectedAiFile] = useState(null);
//   const [aiModalVisible, setAiModalVisible] = useState(false);

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     fetchReports();
//     return () => { if (sound) sound.unloadAsync(); };
//   }, []);

//   const fetchReports = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`${API_BASE_URL}/reports/get-report`);
//       const data = await response.json();
//       if (response.ok) {
//         const transformed = data.map(r => ({
//           ...r,
//           audioUri: r.mediaType === 'audio' ? r.mediaUrl : null,
//           videoUri: r.mediaType === 'video' ? r.mediaUrl : null,
//           attachments: r.attachments || [],
//           aiResults: r.aiResults || [],
//           aiSummary: r.aiSummary || {}
//         }));
//         setReports(transformed);
//       } else {
//         Alert.alert('Error', 'Failed to fetch reports');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Could not connect to server');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await fetchReports();
//     setRefreshing(false);
//   };

//   const updateReportStatus = async () => {
//     if (!selectedReport || !selectedStatus) {
//       Alert.alert('Error', 'Please select a response');
//       return;
//     }
//     try {
//       setUpdatingStatus(true);
//       const response = await fetch(`${API_BASE_URL}/reports/update-status/${selectedReport._id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: selectedStatus }),
//       });
//       if (response.ok) {
//         Alert.alert('Success', 'Report status updated successfully');
//         setStatusModalVisible(false);
//         setSelectedReport(null);
//         setSelectedStatus(null);
//         await fetchReports();
//       } else {
//         const error = await response.json();
//         Alert.alert('Error', error.message || 'Failed to update status');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Could not update status');
//     } finally {
//       setUpdatingStatus(false);
//     }
//   };

//   const getAvailableResponses = (report) => {
//     const { noiseLevel, consecutiveDays } = report;
//     const responses = [];

//     if (noiseLevel === "red") {
//       responses.push({
//         status: 'monitoring',
//         text: `We have received your report. The barangay is monitoring this location. Progress: Day ${consecutiveDays} of 3 consecutive reports for RED noise.`,
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       if (consecutiveDays >= 3) {
//         responses.push({
//           status: 'action_required',
//           text: "The noise at this location has been reported for 3 consecutive days. A barangay officer has been assigned to take action. You will be updated once resolved.",
//           label: 'Action Required',
//           icon: 'alert-circle'
//         });
//       }
//       responses.push({
//         status: 'resolved',
//         text: "Your noise complaint has been resolved. Appropriate action has been taken by the barangay.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "yellow") {
//       responses.push({
//         status: 'monitoring',
//         text: `Your report has been recorded. The barangay will continue monitoring. Progress: Day ${consecutiveDays} of 5 consecutive reports for YELLOW noise.`,
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       if (consecutiveDays >= 5) {
//         responses.push({
//           status: 'action_required',
//           text: "The noise has been reported for 5 consecutive days. A barangay officer will take action. You will be updated once resolved.",
//           label: 'Action Required',
//           icon: 'alert-circle'
//         });
//       }
//       responses.push({
//         status: 'resolved',
//         text: "Your noise complaint has been resolved. The barangay has addressed the issue.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "green") {
//       responses.push({
//         status: 'monitoring',
//         text: "Your report has been received. This minor noise is under observation. The barangay advises communicating with neighbors to resolve minor disturbances.",
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       responses.push({
//         status: 'resolved',
//         text: "Advice has been provided regarding your noise report. The matter is now closed.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     }

//     return responses;
//   };

//   const openStatusModal = (report) => {
//     setSelectedReport(report);
//     setSelectedStatus(report.status || null);
//     setStatusModalVisible(true);
//   };

//   const openAiModal = (aiResults, fileIndex = 0) => {
//     setSelectedAiFile(aiResults[fileIndex] || aiResults);
//     setAiModalVisible(true);
//   };

//   const getCurrentResponse = (report) => {
//     if (!report.status || report.status === 'pending') {
//       return "No response sent yet. Click to select a response.";
//     }
//     const responses = getAvailableResponses(report);
//     const current = responses.find(r => r.status === report.status);
//     return current ? current.text : "Response sent.";
//   };

//   const playAudio = async (audioUri, reportId) => {
//     try {
//       if (sound) {
//         await sound.unloadAsync();
//         setSound(null);
//         if (playingAudio === reportId) {
//           setPlayingAudio(null);
//           return;
//         }
//       }
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
//       setSound(newSound);
//       setPlayingAudio(reportId);
//       newSound.setOnPlaybackStatusUpdate((status) => {
//         if (status.didJustFinish) {
//           setPlayingAudio(null);
//           newSound.unloadAsync();
//         }
//       });
//     } catch (error) {
//       Alert.alert('Error', 'Could not play audio');
//     }
//   };

//   const getFilteredReports = () => {
//     if (selectedFilter === 'All') return reports;
//     if (selectedFilter === 'AI Analyzed') return reports.filter(r => r.aiResults && r.aiResults.length > 0);
//     if (selectedFilter === 'Multi-File') return reports.filter(r => r.attachments && r.attachments.length > 1);
//     return reports.filter(r => r.reason?.includes(selectedFilter) || r.reason === selectedFilter);
//   };

//   const getReasonIcon = (reason) => {
//     if (!reason) return '📢';
//     if (reason.includes('Music')) return '🔊';
//     if (reason.includes('Vehicle')) return '🚗';
//     if (reason.includes('Construction')) return '🔨';
//     if (reason.includes('Party')) return '🎉';
//     if (reason.includes('Animal')) return '🐕';
//     if (reason.includes('Industrial')) return '🏭';
//     if (reason.includes('Shouting')) return '🗣️';
//     return '📢';
//   };

//   const getNoiseLevelColor = (level) => ({ red: '#F44336', yellow: '#FFC107', green: '#4CAF50' }[level] || '#999');
//   const getNoiseLevelBg = (level) => ({ red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' }[level] || '#F5F5F5');
//   const getNoiseLevelLabel = (level) => ({ red: 'High', yellow: 'Medium', green: 'Low' }[level] || 'Unknown');
//   const getStatusColor = (status) => ({ pending: '#999', action_required: '#F44336', monitoring: '#FFC107', resolved: '#4CAF50' }[status] || '#999');
//   const getStatusLabel = (status) => ({ pending: 'Pending', action_required: 'Action Required', monitoring: 'Monitoring', resolved: 'Resolved' }[status] || 'Pending');

//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffMins = Math.floor((now - date) / 60000);
//     const diffHours = Math.floor(diffMins / 60);
//     const diffDays = Math.floor(diffHours / 24);
//     if (diffMins < 1) return 'Just now';
//     if (diffMins < 60) return `${diffMins}m ago`;
//     if (diffHours < 24) return `${diffHours}h ago`;
//     if (diffDays < 7) return `${diffDays}d ago`;
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//   };

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
//     ]).start();
//   };

//   const closeDrawer = () => {
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
//     ]).start(() => setDrawerVisible(false));
//   };

//   // Render AI Results Modal
//   const renderAiModal = () => (
//     <Modal visible={aiModalVisible} transparent animationType="fade" onRequestClose={() => setAiModalVisible(false)}>
//       <View style={styles.aiModalOverlay}>
//         <View style={styles.aiModalContainer}>
//           <LinearGradient colors={['#8B4513', '#654321']} style={styles.aiModalHeader}>
//             <Text style={styles.aiModalTitle}>AI Forensic Analysis</Text>
//             <TouchableOpacity onPress={() => setAiModalVisible(false)} style={styles.aiModalClose}>
//               <Ionicons name="close" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </LinearGradient>

//           <ScrollView style={styles.aiModalContent}>
//             {selectedAiFile && (
//               <>
//                 {/* File Info */}
//                 <View style={styles.aiFileInfo}>
//                   <Ionicons name={selectedAiFile.fileType === 'video' ? 'videocam' : 'musical-notes'} size={24} color="#8B4513" />
//                   <Text style={styles.aiFileName}>{selectedAiFile.fileName || 'Recording'}</Text>
//                 </View>

//                 {/* Metrics Cards */}
//                 <View style={styles.aiMetricsGrid}>
//                   <LinearGradient colors={['#8B4513', '#654321']} style={styles.aiMetricCard}>
//                     <Ionicons name="volume-high" size={24} color="#D4AC0D" />
//                     <Text style={styles.aiMetricValue}>{selectedAiFile.decibel || 0} dB</Text>
//                     <Text style={styles.aiMetricLabel}>DECIBEL</Text>
//                   </LinearGradient>

//                   <LinearGradient colors={['#8B4513', '#5D3A1A']} style={styles.aiMetricCard}>
//                     <Ionicons name="speedometer" size={24} color="#D4AC0D" />
//                     <Text style={styles.aiMetricValue}>{selectedAiFile.noise_level?.level || 'N/A'}</Text>
//                     <Text style={styles.aiMetricLabel}>NOISE LEVEL</Text>
//                   </LinearGradient>

//                   <LinearGradient colors={['#654321', '#8B4513']} style={styles.aiMetricCard}>
//                     <Ionicons name="navigate" size={24} color="#D4AC0D" />
//                     <Text style={styles.aiMetricValue}>~{selectedAiFile.distance?.meters || 0}m</Text>
//                     <Text style={styles.aiMetricLabel}>DISTANCE</Text>
//                   </LinearGradient>
//                 </View>

//                 {/* Distance Details */}
//                 {selectedAiFile.distance && (
//                   <View style={styles.aiDistanceSection}>
//                     <View style={styles.aiDistanceHeader}>
//                       <Ionicons name="compass" size={20} color="#8B4513" />
//                       <Text style={styles.aiDistanceTitle}>Distance Estimation</Text>
//                     </View>
//                     <View style={styles.aiDistanceContent}>
//                       <Text style={styles.aiDistanceCategory}>{selectedAiFile.distance.category}</Text>
//                       <Text style={styles.aiDistanceMeters}>{selectedAiFile.distance.meters} meters from source</Text>
//                       <Text style={styles.aiDistanceReference}>
//                         Based on {selectedAiFile.distance.reference_sound} ({selectedAiFile.distance.reference_db}dB at 1m)
//                       </Text>
//                     </View>
//                   </View>
//                 )}

//                 {/* Detections List */}
//                 <View style={styles.aiDetectionsSection}>
//                   <View style={styles.aiDetectionsHeader}>
//                     <Ionicons name="list" size={20} color="#8B4513" />
//                     <Text style={styles.aiDetectionsTitle}>Sound Classifications</Text>
//                   </View>
                  
//                   {selectedAiFile.detections?.map((detection, index) => (
//                     <View key={index} style={styles.aiDetectionItem}>
//                       <LinearGradient 
//                         colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#5D3A1A', '#3D2B10']}
//                         style={styles.aiDetectionRank}
//                       >
//                         <Text style={styles.aiDetectionRankText}>#{index + 1}</Text>
//                       </LinearGradient>
//                       <View style={styles.aiDetectionContent}>
//                         <Text style={styles.aiDetectionClass}>{detection.class}</Text>
//                         <View style={styles.aiDetectionConfidenceBar}>
//                           <View style={styles.aiConfidenceBarBg}>
//                             <LinearGradient
//                               colors={['#D4AC0D', '#8B4513']}
//                               style={[styles.aiConfidenceBarFill, { width: `${(detection.confidence * 100).toFixed(1)}%` }]}
//                             />
//                           </View>
//                           <Text style={styles.aiConfidenceText}>
//                             {(detection.confidence * 100).toFixed(1)}%
//                           </Text>
//                         </View>
//                       </View>
//                     </View>
//                   ))}
//                 </View>

//                 {/* Processing Time */}
//                 {selectedAiFile.processing_time && (
//                   <View style={styles.aiFooter}>
//                     <Ionicons name="time" size={16} color="#D4AC0D" />
//                     <Text style={styles.aiFooterText}>Processed in {selectedAiFile.processing_time}s</Text>
//                   </View>
//                 )}
//               </>
//             )}
//           </ScrollView>
//         </View>
//       </View>
//     </Modal>
//   );

//   const filters = ['All', 'AI Analyzed', 'Multi-File', 'Music', 'Vehicle', 'Construction', 'Party', 'Animal'];
//   const filteredReports = getFilteredReports();

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
//         <View style={styles.headerContent}>
//           <View style={styles.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
//               <Ionicons name="refresh" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={styles.headerTitle}>📊 Noise Reports</Text>
//           <Text style={styles.headerSubtitle}>
//             {filteredReports.length} {selectedFilter !== 'All' ? selectedFilter : ''} report{filteredReports.length !== 1 ? 's' : ''}
//           </Text>
//         </View>
//       </LinearGradient>

//       <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={styles.filterContent}>
//         {filters.map((filter) => (
//           <TouchableOpacity
//             key={filter}
//             style={[styles.filterPill, selectedFilter === filter && styles.filterPillActive]}
//             onPress={() => setSelectedFilter(filter)}
//           >
//             <Text style={[styles.filterPillText, selectedFilter === filter && styles.filterPillTextActive]}>{filter}</Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#8B4513" />
//           <Text style={styles.loadingText}>Loading reports...</Text>
//         </View>
//       ) : filteredReports.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <Ionicons name="document-text-outline" size={80} color="#CCC" />
//           <Text style={styles.emptyText}>No reports found</Text>
//           <Text style={styles.emptySubtext}>
//             {selectedFilter !== 'All' ? `No ${selectedFilter} reports available` : 'Reports will appear here when submitted'}
//           </Text>
//         </View>
//       ) : (
//         <ScrollView
//           style={styles.reportsList}
//           contentContainerStyle={{ paddingBottom: 20 }}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} tintColor="#8B4513" />}
//         >
//           {filteredReports.map((report) => (
//             <TouchableOpacity
//               key={report._id}
//               style={styles.reportCard}
//               onPress={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
//               activeOpacity={0.7}
//             >
//               <View style={styles.reportHeader}>
//                 <View style={styles.reportHeaderLeft}>
//                   <Text style={styles.reportIcon}>{getReasonIcon(report.reason)}</Text>
//                   <View style={styles.reportHeaderText}>
//                     <Text style={styles.reportReason}>{report.reason || 'Noise Report'}</Text>
//                     <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
//                   </View>
//                 </View>
//                 <View style={styles.reportHeaderRight}>
//                   {report.aiResults && report.aiResults.length > 0 && (
//                     <View style={styles.aiIndicator}>
//                       <Ionicons name="sparkles" size={16} color="#D4AC0D" />
//                     </View>
//                   )}
//                   {report.attachments && report.attachments.length > 1 && (
//                     <View style={styles.multiFileIndicator}>
//                       <Text style={styles.multiFileText}>{report.attachments.length}</Text>
//                     </View>
//                   )}
//                   {report.noiseLevel && (
//                     <View style={[styles.noiseLevelBadge, { backgroundColor: getNoiseLevelBg(report.noiseLevel) }]}>
//                       <View style={[styles.noiseLevelDot, { backgroundColor: getNoiseLevelColor(report.noiseLevel) }]} />
//                       <Text style={[styles.noiseLevelText, { color: getNoiseLevelColor(report.noiseLevel) }]}>
//                         {getNoiseLevelLabel(report.noiseLevel)}
//                       </Text>
//                     </View>
//                   )}
//                   <Ionicons name={expandedReport === report._id ? "chevron-up" : "chevron-down"} size={24} color="#8B4513" />
//                 </View>
//               </View>

//               {/* AI Summary Preview */}
//               {report.aiSummary && report.aiSummary.topDetection && (
//                 <TouchableOpacity 
//                   style={styles.aiSummaryPreview}
//                   onPress={() => openAiModal(report.aiResults, 0)}
//                 >
//                   <LinearGradient colors={['rgba(212,172,13,0.1)', 'rgba(139,69,19,0.05)']} style={styles.aiSummaryGradient}>
//                     <Ionicons name="analytics" size={16} color="#D4AC0D" />
//                     <Text style={styles.aiSummaryText} numberOfLines={1}>
//                       AI: {report.aiSummary.topDetection} • {report.aiSummary.averageDecibel || '?'}dB • {report.aiSummary.filesAnalyzed || 1} file(s)
//                     </Text>
//                     <Ionicons name="chevron-forward" size={16} color="#D4AC0D" />
//                   </LinearGradient>
//                 </TouchableOpacity>
//               )}

//               {expandedReport === report._id && (
//                 <View style={styles.reportDetails}>
//                   <View style={styles.statusSection}>
//                     <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status || 'pending') }]}>
//                       <Ionicons name="flag" size={16} color="#FFF" />
//                       <Text style={styles.statusText}>{getStatusLabel(report.status || 'pending')}</Text>
//                     </View>
//                     {report.consecutiveDays > 1 && (
//                       <View style={styles.consecutiveDaysBadge}>
//                         <Ionicons name="calendar" size={16} color="#F44336" />
//                         <Text style={styles.consecutiveDaysText}>{report.consecutiveDays} consecutive days</Text>
//                       </View>
//                     )}
//                   </View>

//                   {/* Full AI Results for Multiple Files */}
//                   {report.aiResults && report.aiResults.length > 0 && (
//                     <View style={styles.aiFullResults}>
//                       <View style={styles.aiFullHeader}>
//                         <Ionicons name="sparkles" size={20} color="#8B4513" />
//                         <Text style={styles.aiFullTitle}>AI Analysis Results</Text>
//                       </View>
                      
//                       {report.aiResults.map((aiResult, index) => (
//                         <TouchableOpacity
//                           key={index}
//                           style={styles.aiFileResult}
//                           onPress={() => openAiModal(report.aiResults, index)}
//                         >
//                           <View style={styles.aiFileHeader}>
//                             <Ionicons 
//                               name={aiResult.fileType === 'video' ? 'videocam' : 'musical-notes'} 
//                               size={16} 
//                               color="#8B4513" 
//                             />
//                             <Text style={styles.aiFileName}>File {index + 1}</Text>
//                             <View style={styles.aiFileBadge}>
//                               <Text style={styles.aiFileBadgeText}>{aiResult.detections?.length || 0} sounds</Text>
//                             </View>
//                           </View>
                          
//                           <View style={styles.aiFileMetrics}>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>dB</Text>
//                               <Text style={styles.aiFileMetricValue}>{aiResult.decibel || 0}</Text>
//                             </View>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>Distance</Text>
//                               <Text style={styles.aiFileMetricValue}>~{aiResult.distance?.meters || 0}m</Text>
//                             </View>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>Top</Text>
//                               <Text style={styles.aiFileMetricValue} numberOfLines={1}>
//                                 {aiResult.detections?.[0]?.class?.substring(0, 10) || 'N/A'}
//                               </Text>
//                             </View>
//                           </View>
//                         </TouchableOpacity>
//                       ))}
//                     </View>
//                   )}

//                   <TouchableOpacity 
//                     style={[
//                       styles.autoResponseSection,
//                       (!report.status || report.status === 'pending') && styles.autoResponsePending
//                     ]}
//                     onPress={() => openStatusModal(report)}
//                     activeOpacity={0.7}
//                   >
//                     <View style={styles.autoResponseHeader}>
//                       <Ionicons 
//                         name={(!report.status || report.status === 'pending') ? "alert-circle" : "information-circle"} 
//                         size={20} 
//                         color={(!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} 
//                       />
//                       <Text style={[
//                         styles.autoResponseTitle,
//                         (!report.status || report.status === 'pending') && styles.autoResponseTitlePending
//                       ]}>
//                         {(!report.status || report.status === 'pending') ? 'No Response Sent' : 'System Response'}
//                       </Text>
//                       <Ionicons name="create-outline" size={20} color={(!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} style={{ marginLeft: 'auto' }} />
//                     </View>
//                     <View style={styles.autoResponseContent}>
//                       <Text style={[
//                         styles.autoResponseText,
//                         (!report.status || report.status === 'pending') && styles.autoResponseTextPending
//                       ]}>
//                         {getCurrentResponse(report)}
//                       </Text>
//                     </View>
//                     <View style={styles.tapHint}>
//                       <Text style={[
//                         styles.tapHintText,
//                         (!report.status || report.status === 'pending') && styles.tapHintTextPending
//                       ]}>
//                         {(!report.status || report.status === 'pending') ? 'Tap to select and send response' : 'Tap to change response & status'}
//                       </Text>
//                     </View>
//                   </TouchableOpacity>

//                   {report.comment && (
//                     <View style={styles.detailSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="chatbox-outline" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Details</Text>
//                       </View>
//                       <Text style={styles.detailText}>{report.comment}</Text>
//                     </View>
//                   )}

//                   {report.location && (
//                     <View style={styles.detailSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="location" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Location</Text>
//                       </View>
//                       <Text style={styles.detailText}>
//                         Lat: {report.location.latitude?.toFixed(6)}, Lon: {report.location.longitude?.toFixed(6)}
//                       </Text>
//                     </View>
//                   )}

//                   {/* Multiple Attachments */}
//                   {report.attachments && report.attachments.length > 0 && (
//                     <View style={styles.attachmentsSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="attach" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Attachments ({report.attachments.length})</Text>
//                       </View>
                      
//                       {report.attachments.map((att, idx) => (
//                         <View key={idx} style={styles.attachmentItem}>
//                           <Ionicons 
//                             name={att.type === 'video' ? 'videocam' : 'musical-notes'} 
//                             size={20} 
//                             color="#8B4513" 
//                           />
//                           <Text style={styles.attachmentName} numberOfLines={1}>
//                             {att.fileName || `${att.type} ${idx + 1}`}
//                           </Text>
//                           {att.type === 'audio' && (
//                             <TouchableOpacity 
//                               style={styles.attachmentPlayBtn}
//                               onPress={() => playAudio(att.url, `${report._id}-${idx}`)}
//                             >
//                               <Ionicons 
//                                 name={playingAudio === `${report._id}-${idx}` ? "pause" : "play"} 
//                                 size={16} 
//                                 color="#8B4513" 
//                               />
//                             </TouchableOpacity>
//                           )}
//                         </View>
//                       ))}
//                     </View>
//                   )}

//                   {report.audioUri && (
//                     <View style={styles.detailSection}>
//                       <TouchableOpacity style={styles.audioButton} onPress={() => playAudio(report.audioUri, report._id)}>
//                         <Ionicons name={playingAudio === report._id ? "pause-circle" : "play-circle"} size={40} color="#8B4513" />
//                         <Text style={styles.audioButtonText}>{playingAudio === report._id ? 'Pause' : 'Play'} Audio</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )}

//                   {report.videoUri && (
//                     <View style={styles.videoContainer}>
//                       <Video source={{ uri: report.videoUri }} style={styles.video} useNativeControls resizeMode="contain" />
//                     </View>
//                   )}

//                   <View style={styles.detailSection}>
//                     <Text style={styles.timestampText}>
//                       {new Date(report.createdAt).toLocaleString('en-US', {
//                         month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
//                       })}
//                     </Text>
//                   </View>
//                 </View>
//               )}
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       )}

//       {/* Status Modal */}
//       <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
//         <View style={styles.statusModalOverlay}>
//           <View style={styles.statusModalContainer}>
//             <View style={styles.statusModalHeader}>
//               <Text style={styles.statusModalTitle}>Update Report Status</Text>
//               <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
//                 <Ionicons name="close" size={28} color="#333" />
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.statusModalContent} showsVerticalScrollIndicator={false}>
//               {selectedReport && getAvailableResponses(selectedReport).map((response) => (
//                 <TouchableOpacity
//                   key={response.status}
//                   style={[styles.statusOption, selectedStatus === response.status && styles.statusOptionSelected]}
//                   onPress={() => setSelectedStatus(response.status)}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.statusOptionHeader}>
//                     <View style={styles.statusOptionLeft}>
//                       <View style={[styles.statusOptionRadio, selectedStatus === response.status && styles.statusOptionRadioSelected]}>
//                         {selectedStatus === response.status && <View style={styles.statusOptionRadioInner} />}
//                       </View>
//                       <Ionicons name={response.icon} size={24} color={getStatusColor(response.status)} />
//                       <Text style={[styles.statusOptionLabel, { color: getStatusColor(response.status) }]}>
//                         {response.label}
//                       </Text>
//                     </View>
//                   </View>
//                   <View style={styles.statusOptionTextContainer}>
//                     <Text style={styles.statusOptionText}>{response.text}</Text>
//                   </View>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>

//             <View style={styles.statusModalFooter}>
//               <TouchableOpacity style={styles.cancelButton} onPress={() => setStatusModalVisible(false)}>
//                 <Text style={styles.cancelButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.saveButton, updatingStatus && styles.saveButtonDisabled]}
//                 onPress={updateReportStatus}
//                 disabled={updatingStatus}
//               >
//                 {updatingStatus ? (
//                   <ActivityIndicator size="small" color="#FFF" />
//                 ) : (
//                   <>
//                     <Ionicons name="checkmark" size={20} color="#FFF" />
//                     <Text style={styles.saveButtonText}>Save Status</Text>
//                   </>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* AI Results Modal */}
//       {renderAiModal()}

//       {/* Drawer Modal */}
//       <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
//         <View style={styles.modalContainer}>
//           <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
//             <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
//           </Animated.View>
//           <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
//             <CustomDrawer navigation={navigation} onClose={closeDrawer} />
//           </Animated.View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F5F5F5' },
//   header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
//   headerContent: { marginTop: 10 },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
//   headerButton: { padding: 8 },
//   headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
//   headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
//   filterContainer: { backgroundColor: '#FFF', paddingVertical: 8, maxHeight: 48 },
//   filterContent: { paddingHorizontal: 15, gap: 8 },
//   filterPill: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#F0F0F0', borderRadius: 16 },
//   filterPillActive: { backgroundColor: '#8B4513' },
//   filterPillText: { fontSize: 13, color: '#333', fontWeight: '500' },
//   filterPillTextActive: { color: '#FFF', fontWeight: 'bold' },
//   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   loadingText: { marginTop: 10, fontSize: 16, color: '#8B4513' },
//   emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
//   emptyText: { fontSize: 20, fontWeight: 'bold', color: '#999', marginTop: 15 },
//   emptySubtext: { fontSize: 14, color: '#BBB', textAlign: 'center', marginTop: 8 },
//   reportsList: { flex: 1 },
//   reportCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 16, elevation: 2 },
//   reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   reportHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
//   reportHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   reportIcon: { fontSize: 32, marginRight: 12 },
//   reportHeaderText: { flex: 1 },
//   reportReason: { fontSize: 16, fontWeight: 'bold', color: '#333' },
//   reportDate: { fontSize: 12, color: '#999', marginTop: 2 },
//   noiseLevelBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
//   noiseLevelDot: { width: 8, height: 8, borderRadius: 4 },
//   noiseLevelText: { fontSize: 11, fontWeight: 'bold' },
//   aiIndicator: { backgroundColor: 'rgba(212,172,13,0.1)', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D4AC0D' },
//   multiFileIndicator: { backgroundColor: '#8B4513', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
//   multiFileText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  
//   // AI Summary Preview
//   aiSummaryPreview: { marginTop: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D4AC0D' },
//   aiSummaryGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
//   aiSummaryText: { flex: 1, color: '#8B4513', fontSize: 13, fontWeight: '500' },

//   reportDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
//   statusSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
//   statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
//   statusText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
//   consecutiveDaysBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFEBEE', gap: 6 },
//   consecutiveDaysText: { fontSize: 12, fontWeight: 'bold', color: '#F44336' },

//   // AI Full Results Section
//   aiFullResults: { marginBottom: 16, backgroundColor: '#FAF5EB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D4AC0D' },
//   aiFullHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiFullTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiFileResult: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
//   aiFileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
//   aiFileName: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },
//   aiFileBadge: { backgroundColor: 'rgba(212,172,13,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#D4AC0D' },
//   aiFileBadgeText: { fontSize: 10, color: '#8B4513', fontWeight: '500' },
//   aiFileMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
//   aiFileMetric: { alignItems: 'center' },
//   aiFileMetricLabel: { fontSize: 10, color: '#999' },
//   aiFileMetricValue: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },

//   // Auto Response Section
//   autoResponseSection: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2196F3', borderWidth: 2, borderColor: '#2196F3' },
//   autoResponsePending: { backgroundColor: '#FFF3E0', borderLeftColor: '#F57C00', borderColor: '#F57C00' },
//   autoResponseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
//   autoResponseTitle: { fontSize: 16, fontWeight: '700', color: '#1976D2', marginLeft: 8 },
//   autoResponseTitlePending: { color: '#F57C00' },
//   autoResponseContent: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8 },
//   autoResponseText: { fontSize: 14, color: '#333', lineHeight: 20 },
//   autoResponseTextPending: { fontStyle: 'italic', color: '#666' },
//   tapHint: { alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BBDEFB' },
//   tapHintText: { fontSize: 12, color: '#1976D2', fontWeight: '600', fontStyle: 'italic' },
//   tapHintTextPending: { color: '#F57C00' },

//   detailSection: { marginBottom: 12 },
//   detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
//   detailLabel: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },
//   detailText: { fontSize: 14, color: '#555', lineHeight: 20 },

//   // Attachments Section
//   attachmentsSection: { marginBottom: 12 },
//   attachmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 8, borderRadius: 8, marginBottom: 4, gap: 8 },
//   attachmentName: { flex: 1, fontSize: 13, color: '#555' },
//   attachmentPlayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,172,13,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AC0D' },

//   audioButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F9F9F9', paddingVertical: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
//   audioButtonText: { fontSize: 16, fontWeight: '600', color: '#8B4513' },
//   videoContainer: { borderRadius: 8, overflow: 'hidden', marginTop: 8 },
//   video: { width: '100%', height: 200, backgroundColor: '#000' },
//   timestampText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },

//   // Status Modal
//   statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   statusModalContainer: { backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80%', elevation: 5 },
//   statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
//   statusModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
//   statusModalContent: { padding: 20, maxHeight: 400 },
//   statusOption: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E0E0E0' },
//   statusOptionSelected: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
//   statusOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   statusOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
//   statusOptionRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
//   statusOptionRadioSelected: { borderColor: '#4CAF50' },
//   statusOptionRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
//   statusOptionLabel: { fontSize: 16, fontWeight: 'bold' },
//   statusOptionTextContainer: { backgroundColor: '#FFF', borderRadius: 8, padding: 12 },
//   statusOptionText: { fontSize: 14, color: '#555', lineHeight: 20 },
//   statusModalFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 12 },
//   cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
//   cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
//   saveButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
//   saveButtonDisabled: { backgroundColor: '#CCC' },
//   saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },

//   // AI Modal
//   aiModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   aiModalContainer: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', overflow: 'hidden' },
//   aiModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
//   aiModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4AC0D' },
//   aiModalClose: { padding: 4 },
//   aiModalContent: { padding: 20 },
//   aiFileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
//   aiMetricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
//   aiMetricCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
//   aiMetricValue: { color: '#D4AC0D', fontSize: 18, fontWeight: 'bold' },
//   aiMetricLabel: { color: '#FFF', fontSize: 10, opacity: 0.8 },
//   aiDistanceSection: { backgroundColor: '#FAF5EB', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#D4AC0D' },
//   aiDistanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiDistanceTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiDistanceContent: { gap: 4 },
//   aiDistanceCategory: { fontSize: 18, fontWeight: 'bold', color: '#8B4513' },
//   aiDistanceMeters: { fontSize: 14, color: '#333' },
//   aiDistanceReference: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },
//   aiDetectionsSection: { marginBottom: 20 },
//   aiDetectionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiDetectionsTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiDetectionItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
//   aiDetectionRank: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
//   aiDetectionRankText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
//   aiDetectionContent: { flex: 1 },
//   aiDetectionClass: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 4 },
//   aiDetectionConfidenceBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   aiConfidenceBarBg: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
//   aiConfidenceBarFill: { height: '100%', borderRadius: 3 },
//   aiConfidenceText: { fontSize: 12, fontWeight: '600', color: '#8B4513', width: 45 },
//   aiFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
//   aiFooterText: { fontSize: 12, color: '#666' },

//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
// });


// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
//   StatusBar, Dimensions, Platform, ScrollView,
//   RefreshControl, Alert, ActivityIndicator, FlatList
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import CustomDrawer from '../CustomDrawer';
// import API_BASE_URL from '../../utils/api';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// export default function AdminNoiseReportsScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [reports, setReports] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [expandedReport, setExpandedReport] = useState(null);
//   const [selectedFilter, setSelectedFilter] = useState('All');
//   const [playingAudio, setPlayingAudio] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [statusModalVisible, setStatusModalVisible] = useState(false);
//   const [selectedReport, setSelectedReport] = useState(null);
//   const [selectedStatus, setSelectedStatus] = useState(null);
//   const [updatingStatus, setUpdatingStatus] = useState(false);
//   const [selectedAiFile, setSelectedAiFile] = useState(null);
//   const [aiModalVisible, setAiModalVisible] = useState(false);
//   const [selectedAttachment, setSelectedAttachment] = useState(null);
//   const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
//   const [playingAttachmentId, setPlayingAttachmentId] = useState(null);

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     fetchReports();
//     return () => { if (sound) sound.unloadAsync(); };
//   }, []);

//   const fetchReports = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`${API_BASE_URL}/reports/get-report`);
//       const data = await response.json();
//       if (response.ok) {
//         const transformed = data.map(r => ({
//           ...r,
//           attachments: r.attachments || [],
//           aiResults: r.aiResults || [],
//           aiSummary: r.aiSummary || {},
//           fileCount: r.attachments?.length || 1,
//           hasAiResults: !!(r.aiResults && r.aiResults.length > 0)
//         }));
//         setReports(transformed);
//       } else {
//         Alert.alert('Error', 'Failed to fetch reports');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Could not connect to server');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await fetchReports();
//     setRefreshing(false);
//   };

//   const updateReportStatus = async () => {
//     if (!selectedReport || !selectedStatus) {
//       Alert.alert('Error', 'Please select a response');
//       return;
//     }
//     try {
//       setUpdatingStatus(true);
//       const response = await fetch(`${API_BASE_URL}/reports/update-status/${selectedReport._id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: selectedStatus }),
//       });
//       if (response.ok) {
//         Alert.alert('Success', 'Report status updated successfully');
//         setStatusModalVisible(false);
//         setSelectedReport(null);
//         setSelectedStatus(null);
//         await fetchReports();
//       } else {
//         const error = await response.json();
//         Alert.alert('Error', error.message || 'Failed to update status');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Could not update status');
//     } finally {
//       setUpdatingStatus(false);
//     }
//   };

//   const getAvailableResponses = (report) => {
//     const { noiseLevel, consecutiveDays } = report;
//     const responses = [];

//     if (noiseLevel === "critical") {
//       responses.push({
//         status: 'action_required',
//         text: `⚠️ CRITICAL: Severe noise violation detected. Barangay officer has been dispatched. Day ${consecutiveDays} of 3 for CRITICAL noise.`,
//         label: 'Emergency Response',
//         icon: 'alert-circle'
//       });
//       responses.push({
//         status: 'resolved',
//         text: "Critical noise complaint has been resolved. Emergency response has been completed.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "red") {
//       responses.push({
//         status: 'monitoring',
//         text: `We have received your report. The barangay is monitoring this location. Progress: Day ${consecutiveDays} of 3 consecutive reports for HIGH noise.`,
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       if (consecutiveDays >= 3) {
//         responses.push({
//           status: 'action_required',
//           text: "The noise at this location has been reported for 3 consecutive days. A barangay officer has been assigned to take action. You will be updated once resolved.",
//           label: 'Action Required',
//           icon: 'alert-circle'
//         });
//       }
//       responses.push({
//         status: 'resolved',
//         text: "Your noise complaint has been resolved. Appropriate action has been taken by the barangay.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "yellow") {
//       responses.push({
//         status: 'monitoring',
//         text: `Your report has been recorded. The barangay will continue monitoring. Progress: Day ${consecutiveDays} of 5 consecutive reports for MEDIUM noise.`,
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       if (consecutiveDays >= 5) {
//         responses.push({
//           status: 'action_required',
//           text: "The noise has been reported for 5 consecutive days. A barangay officer will take action. You will be updated once resolved.",
//           label: 'Action Required',
//           icon: 'alert-circle'
//         });
//       }
//       responses.push({
//         status: 'resolved',
//         text: "Your noise complaint has been resolved. The barangay has addressed the issue.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "green") {
//       responses.push({
//         status: 'monitoring',
//         text: "Your report has been received. This minor noise is under observation. The barangay advises communicating with neighbors to resolve minor disturbances.",
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       responses.push({
//         status: 'resolved',
//         text: "Advice has been provided regarding your noise report. The matter is now closed.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     }

//     return responses;
//   };

//   const openStatusModal = (report) => {
//     setSelectedReport(report);
//     setSelectedStatus(report.status || null);
//     setStatusModalVisible(true);
//   };

//   const openAiModal = (aiResults, fileIndex = 0) => {
//     const aiData = aiResults[fileIndex] || aiResults;
//     setSelectedAiFile(aiData);
//     setAiModalVisible(true);
//   };

//   const playAttachmentAudio = async (audioUri, attachmentId) => {
//     try {
//       if (sound) {
//         await sound.unloadAsync();
//         setSound(null);
//         if (playingAttachmentId === attachmentId) {
//           setPlayingAttachmentId(null);
//           return;
//         }
//       }
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
//       setSound(newSound);
//       setPlayingAttachmentId(attachmentId);
//       newSound.setOnPlaybackStatusUpdate((status) => {
//         if (status.didJustFinish) {
//           setPlayingAttachmentId(null);
//           newSound.unloadAsync();
//           setSound(null);
//         }
//       });
//     } catch (error) {
//       Alert.alert('Error', 'Could not play audio');
//     }
//   };

//   const getCurrentResponse = (report) => {
//     if (!report.status || report.status === 'pending') {
//       return "No response sent yet. Click to select a response.";
//     }
//     const responses = getAvailableResponses(report);
//     const current = responses.find(r => r.status === report.status);
//     return current ? current.text : "Response sent.";
//   };

//   const getFilteredReports = () => {
//     if (selectedFilter === 'All') return reports;
//     if (selectedFilter === 'AI Analyzed') return reports.filter(r => r.hasAiResults);
//     if (selectedFilter === 'Multi-File') return reports.filter(r => r.attachments && r.attachments.length > 1);
//     if (selectedFilter === 'Critical') return reports.filter(r => r.noiseLevel === 'critical');
//     if (selectedFilter === 'High') return reports.filter(r => r.noiseLevel === 'red');
//     if (selectedFilter === 'Medium') return reports.filter(r => r.noiseLevel === 'yellow');
//     if (selectedFilter === 'Low') return reports.filter(r => r.noiseLevel === 'green');
//     return reports.filter(r => r.aiSummary?.topDetection?.includes(selectedFilter) || r.reason === selectedFilter);
//   };

//   const getReasonIcon = (reason) => {
//     if (!reason) return '📢';
//     if (reason.includes('Music') || reason.includes('karaoke') || reason.includes('party')) return '🔊';
//     if (reason.includes('Vehicle') || reason.includes('car') || reason.includes('horn')) return '🚗';
//     if (reason.includes('Construction') || reason.includes('drilling') || reason.includes('jackhammer')) return '🔨';
//     if (reason.includes('Party')) return '🎉';
//     if (reason.includes('Animal') || reason.includes('dog')) return '🐕';
//     if (reason.includes('Gun') || reason.includes('shot') || reason.includes('explosion')) return '💥';
//     if (reason.includes('Siren')) return '🚨';
//     if (reason.includes('Shouting') || reason.includes('scream')) return '🗣️';
//     return '📢';
//   };

//   const getNoiseLevelColor = (level) => {
//     const colors = { 
//       critical: '#8B0000', 
//       red: '#F44336', 
//       yellow: '#FFC107', 
//       green: '#4CAF50' 
//     };
//     return colors[level] || '#999';
//   };
  
//   const getNoiseLevelBg = (level) => {
//     const colors = { 
//       critical: '#FFEBEE', 
//       red: '#FFEBEE', 
//       yellow: '#FFF9C4', 
//       green: '#E8F5E9' 
//     };
//     return colors[level] || '#F5F5F5';
//   };
  
//   const getNoiseLevelLabel = (level) => {
//     const labels = { 
//       critical: 'Critical', 
//       red: 'High', 
//       yellow: 'Medium', 
//       green: 'Low' 
//     };
//     return labels[level] || 'Unknown';
//   };
  
//   const getStatusColor = (status) => {
//     const colors = { 
//       pending: '#999', 
//       action_required: '#F44336', 
//       monitoring: '#FFC107', 
//       resolved: '#4CAF50' 
//     };
//     return colors[status] || '#999';
//   };
  
//   const getStatusLabel = (status) => {
//     const labels = { 
//       pending: 'Pending', 
//       action_required: 'Action Required', 
//       monitoring: 'Monitoring', 
//       resolved: 'Resolved' 
//     };
//     return labels[status] || 'Pending';
//   };

//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffMins = Math.floor((now - date) / 60000);
//     const diffHours = Math.floor(diffMins / 60);
//     const diffDays = Math.floor(diffHours / 24);
//     if (diffMins < 1) return 'Just now';
//     if (diffMins < 60) return `${diffMins}m ago`;
//     if (diffHours < 24) return `${diffHours}h ago`;
//     if (diffDays < 7) return `${diffDays}d ago`;
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//   };

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
//     ]).start();
//   };

//   const closeDrawer = () => {
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
//     ]).start(() => setDrawerVisible(false));
//   };

//   // Render Attachment Modal
//   const renderAttachmentModal = () => (
//     <Modal visible={attachmentModalVisible} transparent animationType="fade" onRequestClose={() => setAttachmentModalVisible(false)}>
//       <View style={styles.attachmentModalOverlay}>
//         <View style={styles.attachmentModalContainer}>
//           <LinearGradient colors={['#8B4513', '#654321']} style={styles.attachmentModalHeader}>
//             <Text style={styles.attachmentModalTitle}>
//               {selectedAttachment?.type === 'video' ? 'Video Preview' : 'Audio Preview'}
//             </Text>
//             <TouchableOpacity onPress={() => setAttachmentModalVisible(false)} style={styles.attachmentModalClose}>
//               <Ionicons name="close" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </LinearGradient>

//           <View style={styles.attachmentModalContent}>
//             {selectedAttachment?.type === 'video' ? (
//               <Video 
//                 source={{ uri: selectedAttachment.url }} 
//                 style={styles.attachmentVideo} 
//                 useNativeControls 
//                 resizeMode="contain" 
//               />
//             ) : (
//               <View style={styles.attachmentAudioContainer}>
//                 <Ionicons name="musical-notes" size={80} color="#8B4513" />
//                 <Text style={styles.attachmentAudioName}>{selectedAttachment?.fileName || 'Audio Recording'}</Text>
//                 <TouchableOpacity 
//                   style={styles.attachmentAudioPlayBtn}
//                   onPress={() => playAttachmentAudio(selectedAttachment?.url, 'modal')}
//                 >
//                   <LinearGradient colors={['#8B4513', '#654321']} style={styles.attachmentAudioPlayGradient}>
//                     <Ionicons name={playingAttachmentId === 'modal' ? "pause" : "play"} size={32} color="#D4AC0D" />
//                     <Text style={styles.attachmentAudioPlayText}>
//                       {playingAttachmentId === 'modal' ? 'Pause' : 'Play Audio'}
//                     </Text>
//                   </LinearGradient>
//                 </TouchableOpacity>
//               </View>
//             )}
            
//             <View style={styles.attachmentInfo}>
//               <Text style={styles.attachmentInfoLabel}>File Name:</Text>
//               <Text style={styles.attachmentInfoValue}>{selectedAttachment?.fileName || 'N/A'}</Text>
//               <Text style={styles.attachmentInfoLabel}>File Size:</Text>
//               <Text style={styles.attachmentInfoValue}>{(selectedAttachment?.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
//               {selectedAttachment?.duration && (
//                 <>
//                   <Text style={styles.attachmentInfoLabel}>Duration:</Text>
//                   <Text style={styles.attachmentInfoValue}>{Math.floor(selectedAttachment.duration / 60)}:{(selectedAttachment.duration % 60).toString().padStart(2, '0')}</Text>
//                 </>
//               )}
//               <Text style={styles.attachmentInfoLabel}>Source:</Text>
//               <View style={[styles.sourceBadgeLarge, selectedAttachment?.source === 'live' ? styles.liveBadgeLarge : styles.downloadedBadgeLarge]}>
//                 <Ionicons name={selectedAttachment?.source === 'live' ? "mic" : "download"} size={14} color="#fff" />
//                 <Text style={styles.sourceBadgeTextLarge}>{selectedAttachment?.source === 'live' ? 'Live Recording' : 'Downloaded File'}</Text>
//               </View>
//             </View>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );

//   // Render AI Results Modal
//   const renderAiModal = () => (
//     <Modal visible={aiModalVisible} transparent animationType="fade" onRequestClose={() => setAiModalVisible(false)}>
//       <View style={styles.aiModalOverlay}>
//         <View style={styles.aiModalContainer}>
//           <LinearGradient colors={['#8B4513', '#654321']} style={styles.aiModalHeader}>
//             <Text style={styles.aiModalTitle}>AI Forensic Analysis</Text>
//             <TouchableOpacity onPress={() => setAiModalVisible(false)} style={styles.aiModalClose}>
//               <Ionicons name="close" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </LinearGradient>

//           <ScrollView style={styles.aiModalContent}>
//             {selectedAiFile && (
//               <>
//                 {/* File Info */}
//                 <View style={styles.aiFileInfo}>
//                   <Ionicons name={selectedAiFile.fileType === 'video' ? 'videocam' : 'musical-notes'} size={24} color="#8B4513" />
//                   <Text style={styles.aiFileName}>{selectedAiFile.fileName || 'Recording'}</Text>
//                   <View style={[styles.sourceBadgeSmall, selectedAiFile.mediaSource === 'live' ? styles.liveBadgeSmall : styles.downloadedBadgeSmall]}>
//                     <Ionicons name={selectedAiFile.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                     <Text style={styles.sourceBadgeTextSmall}>{selectedAiFile.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//                   </View>
//                 </View>

//                 {/* Metrics Cards */}
//                 <View style={styles.aiMetricsGrid}>
//                   <LinearGradient colors={['#8B4513', '#654321']} style={styles.aiMetricCard}>
//                     <Ionicons name="volume-high" size={24} color="#D4AC0D" />
//                     <Text style={styles.aiMetricValue}>{selectedAiFile.decibel || 0} dB</Text>
//                     <Text style={styles.aiMetricLabel}>DECIBEL</Text>
//                   </LinearGradient>

//                   <LinearGradient colors={['#8B4513', '#5D3A1A']} style={styles.aiMetricCard}>
//                     <Ionicons name="speedometer" size={24} color="#D4AC0D" />
//                     <Text style={styles.aiMetricValue}>{selectedAiFile.noise_level?.level || 'N/A'}</Text>
//                     <Text style={styles.aiMetricLabel}>NOISE LEVEL</Text>
//                   </LinearGradient>

//                   <LinearGradient colors={['#654321', '#8B4513']} style={styles.aiMetricCard}>
//                     <Ionicons name="navigate" size={24} color="#D4AC0D" />
//                     <Text style={styles.aiMetricValue}>~{selectedAiFile.distance?.meters || 0}m</Text>
//                     <Text style={styles.aiMetricLabel}>DISTANCE</Text>
//                   </LinearGradient>
//                 </View>

//                 {/* Distance Details */}
//                 {selectedAiFile.distance && (
//                   <View style={styles.aiDistanceSection}>
//                     <View style={styles.aiDistanceHeader}>
//                       <Ionicons name="compass" size={20} color="#8B4513" />
//                       <Text style={styles.aiDistanceTitle}>Distance Estimation</Text>
//                     </View>
//                     <View style={styles.aiDistanceContent}>
//                       <Text style={styles.aiDistanceCategory}>{selectedAiFile.distance.category}</Text>
//                       <Text style={styles.aiDistanceMeters}>{selectedAiFile.distance.meters} meters from source</Text>
//                       <Text style={styles.aiDistanceReference}>
//                         Based on {selectedAiFile.distance.reference_sound} ({selectedAiFile.distance.reference_db}dB at 1m)
//                       </Text>
//                     </View>
//                   </View>
//                 )}

//                 {/* Detections List */}
//                 <View style={styles.aiDetectionsSection}>
//                   <View style={styles.aiDetectionsHeader}>
//                     <Ionicons name="list" size={20} color="#8B4513" />
//                     <Text style={styles.aiDetectionsTitle}>Sound Classifications</Text>
//                   </View>
                  
//                   {selectedAiFile.detections?.map((detection, index) => (
//                     <View key={index} style={styles.aiDetectionItem}>
//                       <LinearGradient 
//                         colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#5D3A1A', '#3D2B10']}
//                         style={styles.aiDetectionRank}
//                       >
//                         <Text style={styles.aiDetectionRankText}>#{index + 1}</Text>
//                       </LinearGradient>
//                       <View style={styles.aiDetectionContent}>
//                         <Text style={styles.aiDetectionClass}>{detection.class}</Text>
//                         <View style={styles.aiDetectionConfidenceBar}>
//                           <View style={styles.aiConfidenceBarBg}>
//                             <LinearGradient
//                               colors={['#D4AC0D', '#8B4513']}
//                               style={[styles.aiConfidenceBarFill, { width: `${(detection.confidence * 100).toFixed(1)}%` }]}
//                             />
//                           </View>
//                           <Text style={styles.aiConfidenceText}>
//                             {(detection.confidence * 100).toFixed(1)}%
//                           </Text>
//                         </View>
//                       </View>
//                     </View>
//                   ))}
//                 </View>

//                 {/* Processing Time */}
//                 {selectedAiFile.processing_time && (
//                   <View style={styles.aiFooter}>
//                     <Ionicons name="time" size={16} color="#D4AC0D" />
//                     <Text style={styles.aiFooterText}>Processed in {selectedAiFile.processing_time}s</Text>
//                   </View>
//                 )}
//               </>
//             )}
//           </ScrollView>
//         </View>
//       </View>
//     </Modal>
//   );

//   const filters = ['All', 'AI Analyzed', 'Multi-File', 'Critical', 'High', 'Medium', 'Low'];
//   const filteredReports = getFilteredReports();

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
//         <View style={styles.headerContent}>
//           <View style={styles.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
//               <Ionicons name="refresh" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={styles.headerTitle}>📊 Noise Reports</Text>
//           <Text style={styles.headerSubtitle}>
//             {filteredReports.length} {selectedFilter !== 'All' ? selectedFilter : ''} report{filteredReports.length !== 1 ? 's' : ''}
//           </Text>
//         </View>
//       </LinearGradient>

//       <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={styles.filterContent}>
//         {filters.map((filter) => (
//           <TouchableOpacity
//             key={filter}
//             style={[styles.filterPill, selectedFilter === filter && styles.filterPillActive]}
//             onPress={() => setSelectedFilter(filter)}
//           >
//             <Text style={[styles.filterPillText, selectedFilter === filter && styles.filterPillTextActive]}>{filter}</Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#8B4513" />
//           <Text style={styles.loadingText}>Loading reports...</Text>
//         </View>
//       ) : filteredReports.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <Ionicons name="document-text-outline" size={80} color="#CCC" />
//           <Text style={styles.emptyText}>No reports found</Text>
//           <Text style={styles.emptySubtext}>
//             {selectedFilter !== 'All' ? `No ${selectedFilter} reports available` : 'Reports will appear here when submitted'}
//           </Text>
//         </View>
//       ) : (
//         <ScrollView
//           style={styles.reportsList}
//           contentContainerStyle={{ paddingBottom: 20 }}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} tintColor="#8B4513" />}
//         >
//           {filteredReports.map((report) => (
//             <TouchableOpacity
//               key={report._id}
//               style={styles.reportCard}
//               onPress={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
//               activeOpacity={0.7}
//             >
//               <View style={styles.reportHeader}>
//                 <View style={styles.reportHeaderLeft}>
//                   <Text style={styles.reportIcon}>{getReasonIcon(report.aiSummary?.topDetection || report.reason)}</Text>
//                   <View style={styles.reportHeaderText}>
//                     <Text style={styles.reportReason}>{report.aiSummary?.topDetection || report.reason || 'Noise Report'}</Text>
//                     <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
//                   </View>
//                 </View>
//                 <View style={styles.reportHeaderRight}>
//                   {report.hasAiResults && (
//                     <View style={styles.aiIndicator}>
//                       <Ionicons name="sparkles" size={16} color="#D4AC0D" />
//                     </View>
//                   )}
//                   {report.attachments && report.attachments.length > 1 && (
//                     <View style={styles.multiFileIndicator}>
//                       <Text style={styles.multiFileText}>{report.attachments.length}</Text>
//                     </View>
//                   )}
//                   {report.noiseLevel && (
//                     <View style={[styles.noiseLevelBadge, { backgroundColor: getNoiseLevelBg(report.noiseLevel) }]}>
//                       <View style={[styles.noiseLevelDot, { backgroundColor: getNoiseLevelColor(report.noiseLevel) }]} />
//                       <Text style={[styles.noiseLevelText, { color: getNoiseLevelColor(report.noiseLevel) }]}>
//                         {getNoiseLevelLabel(report.noiseLevel)}
//                       </Text>
//                     </View>
//                   )}
//                   <Ionicons name={expandedReport === report._id ? "chevron-up" : "chevron-down"} size={24} color="#8B4513" />
//                 </View>
//               </View>

//               {/* AI Summary Preview */}
//               {report.aiSummary && report.aiSummary.topDetection && (
//                 <TouchableOpacity 
//                   style={styles.aiSummaryPreview}
//                   onPress={() => openAiModal(report.aiResults, 0)}
//                 >
//                   <LinearGradient colors={['rgba(212,172,13,0.1)', 'rgba(139,69,19,0.05)']} style={styles.aiSummaryGradient}>
//                     <Ionicons name="analytics" size={16} color="#D4AC0D" />
//                     <Text style={styles.aiSummaryText} numberOfLines={1}>
//                       AI: {report.aiSummary.topDetection} • {report.aiSummary.averageDecibel || '?'}dB • {report.fileCount} file(s)
//                     </Text>
//                     <Ionicons name="chevron-forward" size={16} color="#D4AC0D" />
//                   </LinearGradient>
//                 </TouchableOpacity>
//               )}

//               {expandedReport === report._id && (
//                 <View style={styles.reportDetails}>
//                   <View style={styles.statusSection}>
//                     <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status || 'pending') }]}>
//                       <Ionicons name="flag" size={16} color="#FFF" />
//                       <Text style={styles.statusText}>{getStatusLabel(report.status || 'pending')}</Text>
//                     </View>
//                     {report.consecutiveDays > 1 && (
//                       <View style={styles.consecutiveDaysBadge}>
//                         <Ionicons name="calendar" size={16} color={report.noiseLevel === 'critical' ? '#8B0000' : '#F44336'} />
//                         <Text style={[styles.consecutiveDaysText, report.noiseLevel === 'critical' && { color: '#8B0000' }]}>
//                           {report.consecutiveDays} consecutive days
//                         </Text>
//                       </View>
//                     )}
//                     {report.noiseLevel === 'critical' && (
//                       <View style={styles.criticalBadge}>
//                         <Ionicons name="alert" size={16} color="#FFF" />
//                         <Text style={styles.criticalBadgeText}>CRITICAL</Text>
//                       </View>
//                     )}
//                   </View>

//                   {/* Full AI Results for Multiple Files */}
//                   {report.aiResults && report.aiResults.length > 0 && (
//                     <View style={styles.aiFullResults}>
//                       <View style={styles.aiFullHeader}>
//                         <Ionicons name="sparkles" size={20} color="#8B4513" />
//                         <Text style={styles.aiFullTitle}>AI Analysis Results ({report.aiResults.length} file{report.aiResults.length !== 1 ? 's' : ''})</Text>
//                       </View>
                      
//                       {report.aiResults.map((aiResult, index) => (
//                         <TouchableOpacity
//                           key={index}
//                           style={styles.aiFileResult}
//                           onPress={() => openAiModal(report.aiResults, index)}
//                         >
//                           <View style={styles.aiFileHeader}>
//                             <Ionicons 
//                               name={aiResult.fileType === 'video' ? 'videocam' : 'musical-notes'} 
//                               size={16} 
//                               color="#8B4513" 
//                             />
//                             <Text style={styles.aiFileName}>File {index + 1}</Text>
//                             <View style={[styles.sourceBadgeSmall, aiResult.mediaSource === 'live' ? styles.liveBadgeSmall : styles.downloadedBadgeSmall]}>
//                               <Ionicons name={aiResult.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                               <Text style={styles.sourceBadgeTextSmall}>{aiResult.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//                             </View>
//                           </View>
                          
//                           <View style={styles.aiFileMetrics}>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>dB</Text>
//                               <Text style={styles.aiFileMetricValue}>{aiResult.decibel || 0}</Text>
//                             </View>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>Distance</Text>
//                               <Text style={styles.aiFileMetricValue}>~{aiResult.distance?.meters || 0}m</Text>
//                             </View>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>Top Sound</Text>
//                               <Text style={styles.aiFileMetricValue} numberOfLines={1}>
//                                 {aiResult.detections?.[0]?.class?.substring(0, 12) || 'N/A'}
//                               </Text>
//                             </View>
//                           </View>
//                         </TouchableOpacity>
//                       ))}
//                     </View>
//                   )}

//                   <TouchableOpacity 
//                     style={[
//                       styles.autoResponseSection,
//                       (!report.status || report.status === 'pending') && styles.autoResponsePending,
//                       report.noiseLevel === 'critical' && styles.autoResponseCritical
//                     ]}
//                     onPress={() => openStatusModal(report)}
//                     activeOpacity={0.7}
//                   >
//                     <View style={styles.autoResponseHeader}>
//                       <Ionicons 
//                         name={(!report.status || report.status === 'pending') ? "alert-circle" : "information-circle"} 
//                         size={20} 
//                         color={report.noiseLevel === 'critical' ? "#8B0000" : (!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} 
//                       />
//                       <Text style={[
//                         styles.autoResponseTitle,
//                         (!report.status || report.status === 'pending') && styles.autoResponseTitlePending,
//                         report.noiseLevel === 'critical' && styles.autoResponseTitleCritical
//                       ]}>
//                         {(!report.status || report.status === 'pending') ? 'No Response Sent' : 'System Response'}
//                       </Text>
//                       <Ionicons name="create-outline" size={20} color={report.noiseLevel === 'critical' ? "#8B0000" : (!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} style={{ marginLeft: 'auto' }} />
//                     </View>
//                     <View style={styles.autoResponseContent}>
//                       <Text style={[
//                         styles.autoResponseText,
//                         (!report.status || report.status === 'pending') && styles.autoResponseTextPending
//                       ]}>
//                         {getCurrentResponse(report)}
//                       </Text>
//                     </View>
//                     <View style={styles.tapHint}>
//                       <Text style={[
//                         styles.tapHintText,
//                         (!report.status || report.status === 'pending') && styles.tapHintTextPending
//                       ]}>
//                         {(!report.status || report.status === 'pending') ? 'Tap to select and send response' : 'Tap to change response & status'}
//                       </Text>
//                     </View>
//                   </TouchableOpacity>

//                   {report.comment && (
//                     <View style={styles.detailSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="chatbox-outline" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Details</Text>
//                       </View>
//                       <Text style={styles.detailText}>{report.comment}</Text>
//                     </View>
//                   )}

//                   {report.location && (
//                     <View style={styles.detailSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="location" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Location</Text>
//                       </View>
//                       <Text style={styles.detailText}>
//                         Lat: {report.location.latitude?.toFixed(6)}, Lon: {report.location.longitude?.toFixed(6)}
//                       </Text>
//                     </View>
//                   )}

//                   {/* Multiple Attachments */}
//                   {report.attachments && report.attachments.length > 0 && (
//                     <View style={styles.attachmentsSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="attach" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Attachments ({report.attachments.length})</Text>
//                       </View>
                      
//                       {report.attachments.map((att, idx) => (
//                         <TouchableOpacity 
//                           key={idx} 
//                           style={styles.attachmentItem}
//                           onPress={() => {
//                             setSelectedAttachment(att);
//                             setAttachmentModalVisible(true);
//                           }}
//                           activeOpacity={0.7}
//                         >
//                           <Ionicons 
//                             name={att.type === 'video' ? 'videocam' : 'musical-notes'} 
//                             size={20} 
//                             color="#8B4513" 
//                           />
//                           <Text style={styles.attachmentName} numberOfLines={1}>
//                             {att.fileName || `${att.type} ${idx + 1}`}
//                           </Text>
//                           <View style={styles.attachmentSource}>
//                             <View style={[styles.sourceBadge, att.source === 'live' ? styles.liveBadge : styles.downloadedBadge]}>
//                               <Ionicons name={att.source === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                               <Text style={styles.sourceBadgeText}>{att.source === 'live' ? 'Live' : 'Downloaded'}</Text>
//                             </View>
//                           </View>
//                           {att.type === 'audio' && (
//                             <TouchableOpacity 
//                               style={styles.playSmallBtn}
//                               onPress={(e) => {
//                                 e.stopPropagation();
//                                 playAttachmentAudio(att.url, `${report._id}-${idx}`);
//                               }}
//                             >
//                               <Ionicons 
//                                 name={playingAttachmentId === `${report._id}-${idx}` ? "pause" : "play"} 
//                                 size={18} 
//                                 color="#8B4513" 
//                               />
//                             </TouchableOpacity>
//                           )}
//                           <Ionicons name="eye-outline" size={18} color="#8B4513" />
//                         </TouchableOpacity>
//                       ))}
//                     </View>
//                   )}

//                   <View style={styles.detailSection}>
//                     <Text style={styles.timestampText}>
//                       {new Date(report.createdAt).toLocaleString('en-US', {
//                         month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
//                       })}
//                     </Text>
//                   </View>
//                 </View>
//               )}
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       )}

//       {/* Status Modal */}
//       <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
//         <View style={styles.statusModalOverlay}>
//           <View style={styles.statusModalContainer}>
//             <View style={styles.statusModalHeader}>
//               <Text style={styles.statusModalTitle}>Update Report Status</Text>
//               <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
//                 <Ionicons name="close" size={28} color="#333" />
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.statusModalContent} showsVerticalScrollIndicator={false}>
//               {selectedReport && getAvailableResponses(selectedReport).map((response) => (
//                 <TouchableOpacity
//                   key={response.status}
//                   style={[styles.statusOption, selectedStatus === response.status && styles.statusOptionSelected]}
//                   onPress={() => setSelectedStatus(response.status)}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.statusOptionHeader}>
//                     <View style={styles.statusOptionLeft}>
//                       <View style={[styles.statusOptionRadio, selectedStatus === response.status && styles.statusOptionRadioSelected]}>
//                         {selectedStatus === response.status && <View style={styles.statusOptionRadioInner} />}
//                       </View>
//                       <Ionicons name={response.icon} size={24} color={response.status === 'action_required' ? '#F44336' : getStatusColor(response.status)} />
//                       <Text style={[styles.statusOptionLabel, { color: response.status === 'action_required' ? '#F44336' : getStatusColor(response.status) }]}>
//                         {response.label}
//                       </Text>
//                     </View>
//                   </View>
//                   <View style={styles.statusOptionTextContainer}>
//                     <Text style={styles.statusOptionText}>{response.text}</Text>
//                   </View>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>

//             <View style={styles.statusModalFooter}>
//               <TouchableOpacity style={styles.cancelButton} onPress={() => setStatusModalVisible(false)}>
//                 <Text style={styles.cancelButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.saveButton, updatingStatus && styles.saveButtonDisabled]}
//                 onPress={updateReportStatus}
//                 disabled={updatingStatus}
//               >
//                 {updatingStatus ? (
//                   <ActivityIndicator size="small" color="#FFF" />
//                 ) : (
//                   <>
//                     <Ionicons name="checkmark" size={20} color="#FFF" />
//                     <Text style={styles.saveButtonText}>Save Status</Text>
//                   </>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* AI Results Modal */}
//       {renderAiModal()}
      
//       {/* Attachment Modal */}
//       {renderAttachmentModal()}

//       {/* Drawer Modal */}
//       <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
//         <View style={styles.modalContainer}>
//           <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
//             <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
//           </Animated.View>
//           <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
//             <CustomDrawer navigation={navigation} onClose={closeDrawer} />
//           </Animated.View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F5F5F5' },
//   header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
//   headerContent: { marginTop: 10 },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
//   headerButton: { padding: 8 },
//   headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
//   headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
//   filterContainer: { backgroundColor: '#FFF', paddingVertical: 8, maxHeight: 48 },
//   filterContent: { paddingHorizontal: 15, gap: 8 },
//   filterPill: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#F0F0F0', borderRadius: 16 },
//   filterPillActive: { backgroundColor: '#8B4513' },
//   filterPillText: { fontSize: 13, color: '#333', fontWeight: '500' },
//   filterPillTextActive: { color: '#FFF', fontWeight: 'bold' },
//   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   loadingText: { marginTop: 10, fontSize: 16, color: '#8B4513' },
//   emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
//   emptyText: { fontSize: 20, fontWeight: 'bold', color: '#999', marginTop: 15 },
//   emptySubtext: { fontSize: 14, color: '#BBB', textAlign: 'center', marginTop: 8 },
//   reportsList: { flex: 1 },
//   reportCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 16, elevation: 2 },
//   reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   reportHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
//   reportHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   reportIcon: { fontSize: 32, marginRight: 12 },
//   reportHeaderText: { flex: 1 },
//   reportReason: { fontSize: 16, fontWeight: 'bold', color: '#333' },
//   reportDate: { fontSize: 12, color: '#999', marginTop: 2 },
//   noiseLevelBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
//   noiseLevelDot: { width: 8, height: 8, borderRadius: 4 },
//   noiseLevelText: { fontSize: 11, fontWeight: 'bold' },
//   aiIndicator: { backgroundColor: 'rgba(212,172,13,0.1)', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D4AC0D' },
//   multiFileIndicator: { backgroundColor: '#8B4513', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
//   multiFileText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
//   criticalBadge: { backgroundColor: '#8B0000', flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
//   criticalBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  
//   aiSummaryPreview: { marginTop: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D4AC0D' },
//   aiSummaryGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
//   aiSummaryText: { flex: 1, color: '#8B4513', fontSize: 13, fontWeight: '500' },

//   reportDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
//   statusSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
//   statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
//   statusText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
//   consecutiveDaysBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFEBEE', gap: 6 },
//   consecutiveDaysText: { fontSize: 12, fontWeight: 'bold', color: '#F44336' },

//   aiFullResults: { marginBottom: 16, backgroundColor: '#FAF5EB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D4AC0D' },
//   aiFullHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiFullTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiFileResult: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
//   aiFileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
//   aiFileName: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },
//   aiFileMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
//   aiFileMetric: { alignItems: 'center' },
//   aiFileMetricLabel: { fontSize: 10, color: '#999' },
//   aiFileMetricValue: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },

//   autoResponseSection: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2196F3', borderWidth: 2, borderColor: '#2196F3' },
//   autoResponsePending: { backgroundColor: '#FFF3E0', borderLeftColor: '#F57C00', borderColor: '#F57C00' },
//   autoResponseCritical: { backgroundColor: '#FFEBEE', borderLeftColor: '#8B0000', borderColor: '#8B0000' },
//   autoResponseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
//   autoResponseTitle: { fontSize: 16, fontWeight: '700', color: '#1976D2', marginLeft: 8 },
//   autoResponseTitlePending: { color: '#F57C00' },
//   autoResponseTitleCritical: { color: '#8B0000' },
//   autoResponseContent: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8 },
//   autoResponseText: { fontSize: 14, color: '#333', lineHeight: 20 },
//   autoResponseTextPending: { fontStyle: 'italic', color: '#666' },
//   tapHint: { alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BBDEFB' },
//   tapHintText: { fontSize: 12, color: '#1976D2', fontWeight: '600', fontStyle: 'italic' },
//   tapHintTextPending: { color: '#F57C00' },

//   detailSection: { marginBottom: 12 },
//   detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
//   detailLabel: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },
//   detailText: { fontSize: 14, color: '#555', lineHeight: 20 },

//   attachmentsSection: { marginBottom: 12 },
//   attachmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 10, borderRadius: 8, marginBottom: 6, gap: 10 },
//   attachmentName: { flex: 1, fontSize: 13, color: '#555' },
//   attachmentSource: { marginRight: 4 },
//   sourceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 },
//   liveBadge: { backgroundColor: '#4CAF50' },
//   downloadedBadge: { backgroundColor: '#2196F3' },
//   sourceBadgeText: { fontSize: 9, color: '#fff', fontWeight: '600' },
//   playSmallBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,172,13,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AC0D' },
//   sourceBadgeSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 },
//   liveBadgeSmall: { backgroundColor: '#4CAF50' },
//   downloadedBadgeSmall: { backgroundColor: '#2196F3' },
//   sourceBadgeTextSmall: { fontSize: 9, color: '#fff', fontWeight: '600' },
//   sourceBadgeLarge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 8, alignSelf: 'flex-start', marginTop: 8 },
//   liveBadgeLarge: { backgroundColor: '#4CAF50' },
//   downloadedBadgeLarge: { backgroundColor: '#2196F3' },
//   sourceBadgeTextLarge: { fontSize: 12, color: '#fff', fontWeight: '600' },

//   timestampText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },

//   statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   statusModalContainer: { backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80%', elevation: 5 },
//   statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
//   statusModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
//   statusModalContent: { padding: 20, maxHeight: 400 },
//   statusOption: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E0E0E0' },
//   statusOptionSelected: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
//   statusOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   statusOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
//   statusOptionRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
//   statusOptionRadioSelected: { borderColor: '#4CAF50' },
//   statusOptionRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
//   statusOptionLabel: { fontSize: 16, fontWeight: 'bold' },
//   statusOptionTextContainer: { backgroundColor: '#FFF', borderRadius: 8, padding: 12 },
//   statusOptionText: { fontSize: 14, color: '#555', lineHeight: 20 },
//   statusModalFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 12 },
//   cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
//   cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
//   saveButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
//   saveButtonDisabled: { backgroundColor: '#CCC' },
//   saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },

//   aiModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   aiModalContainer: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', overflow: 'hidden' },
//   aiModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
//   aiModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4AC0D' },
//   aiModalClose: { padding: 4 },
//   aiModalContent: { padding: 20 },
//   aiFileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
//   aiMetricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
//   aiMetricCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
//   aiMetricValue: { color: '#D4AC0D', fontSize: 18, fontWeight: 'bold' },
//   aiMetricLabel: { color: '#FFF', fontSize: 10, opacity: 0.8 },
//   aiDistanceSection: { backgroundColor: '#FAF5EB', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#D4AC0D' },
//   aiDistanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiDistanceTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiDistanceContent: { gap: 4 },
//   aiDistanceCategory: { fontSize: 18, fontWeight: 'bold', color: '#8B4513' },
//   aiDistanceMeters: { fontSize: 14, color: '#333' },
//   aiDistanceReference: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },
//   aiDetectionsSection: { marginBottom: 20 },
//   aiDetectionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiDetectionsTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiDetectionItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
//   aiDetectionRank: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
//   aiDetectionRankText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
//   aiDetectionContent: { flex: 1 },
//   aiDetectionClass: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 4 },
//   aiDetectionConfidenceBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   aiConfidenceBarBg: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
//   aiConfidenceBarFill: { height: '100%', borderRadius: 3 },
//   aiConfidenceText: { fontSize: 12, fontWeight: '600', color: '#8B4513', width: 45 },
//   aiFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
//   aiFooterText: { fontSize: 12, color: '#666' },

//   attachmentModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   attachmentModalContainer: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', overflow: 'hidden' },
//   attachmentModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
//   attachmentModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4AC0D' },
//   attachmentModalClose: { padding: 4 },
//   attachmentModalContent: { padding: 20 },
//   attachmentVideo: { width: '100%', height: 300, backgroundColor: '#000', borderRadius: 12 },
//   attachmentAudioContainer: { alignItems: 'center', padding: 30 },
//   attachmentAudioName: { fontSize: 16, fontWeight: '500', color: '#333', marginTop: 16, marginBottom: 20 },
//   attachmentAudioPlayBtn: { marginTop: 10 },
//   attachmentAudioPlayGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, gap: 12 },
//   attachmentAudioPlayText: { color: '#D4AC0D', fontSize: 16, fontWeight: 'bold' },
//   attachmentInfo: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
//   attachmentInfoLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
//   attachmentInfoValue: { fontSize: 14, color: '#333', marginBottom: 8 },

//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
// });
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
//   StatusBar, Dimensions, Platform, ScrollView,
//   RefreshControl, Alert, ActivityIndicator, FlatList
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import CustomDrawer from '../CustomDrawer';
// import API_BASE_URL from '../../utils/api';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// export default function AdminNoiseReportsScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [reports, setReports] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [expandedReport, setExpandedReport] = useState(null);
//   const [selectedFilter, setSelectedFilter] = useState('All');
//   const [playingAudio, setPlayingAudio] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [statusModalVisible, setStatusModalVisible] = useState(false);
//   const [selectedReport, setSelectedReport] = useState(null);
//   const [selectedStatus, setSelectedStatus] = useState(null);
//   const [updatingStatus, setUpdatingStatus] = useState(false);
//   const [selectedAiFile, setSelectedAiFile] = useState(null);
//   const [aiModalVisible, setAiModalVisible] = useState(false);
//   const [selectedAttachment, setSelectedAttachment] = useState(null);
//   const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
//   const [playingAttachmentId, setPlayingAttachmentId] = useState(null);

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     fetchReports();
//     return () => { 
//       if (sound) sound.unloadAsync(); 
//     };
//   }, []);

//   const fetchReports = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`${API_BASE_URL}/reports/get-report`);
//       const data = await response.json();
//       if (response.ok) {
//         const transformed = data.map(r => ({
//           ...r,
//           attachments: r.attachments || [],
//           aiResults: r.aiResults || [],
//           aiSummary: r.aiSummary || {},
//           fileCount: r.attachments?.length || 1,
//           hasAiResults: !!(r.aiResults && r.aiResults.length > 0)
//         }));
//         setReports(transformed);
//       } else {
//         Alert.alert('Error', 'Failed to fetch reports');
//       }
//     } catch (error) {
//       console.error('Fetch error:', error);
//       Alert.alert('Error', 'Could not connect to server');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await fetchReports();
//     setRefreshing(false);
//   };

//   const updateReportStatus = async () => {
//     if (!selectedReport || !selectedStatus) {
//       Alert.alert('Error', 'Please select a response');
//       return;
//     }
//     try {
//       setUpdatingStatus(true);
//       const response = await fetch(`${API_BASE_URL}/reports/update-status/${selectedReport._id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: selectedStatus }),
//       });
//       if (response.ok) {
//         Alert.alert('Success', 'Report status updated successfully');
//         setStatusModalVisible(false);
//         setSelectedReport(null);
//         setSelectedStatus(null);
//         await fetchReports();
//       } else {
//         const error = await response.json();
//         Alert.alert('Error', error.message || 'Failed to update status');
//       }
//     } catch (error) {
//       console.error('Update error:', error);
//       Alert.alert('Error', 'Could not update status');
//     } finally {
//       setUpdatingStatus(false);
//     }
//   };

//   const getAvailableResponses = (report) => {
//     const { noiseLevel, consecutiveDays } = report;
//     const responses = [];

//     if (noiseLevel === "critical") {
//       responses.push({
//         status: 'action_required',
//         text: `⚠️ CRITICAL: Severe noise violation detected. Barangay officer has been dispatched. Day ${consecutiveDays} of 3 for CRITICAL noise.`,
//         label: 'Emergency Response',
//         icon: 'alert-circle'
//       });
//       responses.push({
//         status: 'resolved',
//         text: "Critical noise complaint has been resolved. Emergency response has been completed.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "red") {
//       responses.push({
//         status: 'monitoring',
//         text: `We have received your report. The barangay is monitoring this location. Progress: Day ${consecutiveDays} of 3 consecutive reports for HIGH noise.`,
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       if (consecutiveDays >= 3) {
//         responses.push({
//           status: 'action_required',
//           text: "The noise at this location has been reported for 3 consecutive days. A barangay officer has been assigned to take action.",
//           label: 'Action Required',
//           icon: 'alert-circle'
//         });
//       }
//       responses.push({
//         status: 'resolved',
//         text: "Your noise complaint has been resolved. Appropriate action has been taken by the barangay.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "yellow") {
//       responses.push({
//         status: 'monitoring',
//         text: `Your report has been recorded. The barangay will continue monitoring. Progress: Day ${consecutiveDays} of 5 consecutive reports for MEDIUM noise.`,
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       if (consecutiveDays >= 5) {
//         responses.push({
//           status: 'action_required',
//           text: "The noise has been reported for 5 consecutive days. A barangay officer will take action.",
//           label: 'Action Required',
//           icon: 'alert-circle'
//         });
//       }
//       responses.push({
//         status: 'resolved',
//         text: "Your noise complaint has been resolved. The barangay has addressed the issue.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     } else if (noiseLevel === "green") {
//       responses.push({
//         status: 'monitoring',
//         text: "Your report has been received. This minor noise is under observation.",
//         label: 'Monitoring',
//         icon: 'eye'
//       });
//       responses.push({
//         status: 'resolved',
//         text: "Advice has been provided regarding your noise report. The matter is now closed.",
//         label: 'Resolved',
//         icon: 'checkmark-circle'
//       });
//     }

//     return responses;
//   };

//   const openStatusModal = (report) => {
//     setSelectedReport(report);
//     setSelectedStatus(report.status || null);
//     setStatusModalVisible(true);
//   };

//   const openAiModal = (aiResults, fileIndex = 0) => {
//     const aiData = aiResults[fileIndex] || aiResults;
//     setSelectedAiFile(aiData);
//     setAiModalVisible(true);
//   };

//   const playAttachmentAudio = async (audioUri, attachmentId) => {
//     try {
//       if (sound) {
//         await sound.unloadAsync();
//         setSound(null);
//         if (playingAttachmentId === attachmentId) {
//           setPlayingAttachmentId(null);
//           return;
//         }
//       }
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
//       setSound(newSound);
//       setPlayingAttachmentId(attachmentId);
//       newSound.setOnPlaybackStatusUpdate((status) => {
//         if (status.didJustFinish) {
//           setPlayingAttachmentId(null);
//           newSound.unloadAsync();
//           setSound(null);
//         }
//       });
//     } catch (error) {
//       console.error('Play error:', error);
//       Alert.alert('Error', 'Could not play audio');
//     }
//   };

//   const getCurrentResponse = (report) => {
//     if (!report.status || report.status === 'pending') {
//       return "No response sent yet. Click to select a response.";
//     }
//     const responses = getAvailableResponses(report);
//     const current = responses.find(r => r.status === report.status);
//     return current ? current.text : "Response sent.";
//   };

//   const getFilteredReports = () => {
//     if (selectedFilter === 'All') return reports;
//     if (selectedFilter === 'AI Analyzed') return reports.filter(r => r.hasAiResults);
//     if (selectedFilter === 'Multi-File') return reports.filter(r => r.attachments && r.attachments.length > 1);
//     if (selectedFilter === 'Critical') return reports.filter(r => r.noiseLevel === 'critical');
//     if (selectedFilter === 'High') return reports.filter(r => r.noiseLevel === 'red');
//     if (selectedFilter === 'Medium') return reports.filter(r => r.noiseLevel === 'yellow');
//     if (selectedFilter === 'Low') return reports.filter(r => r.noiseLevel === 'green');
//     return reports;
//   };

//   const getReasonIcon = (reason) => {
//     if (!reason) return '📢';
//     const lowerReason = reason.toLowerCase();
//     if (lowerReason.includes('music') || lowerReason.includes('karaoke')) return '🔊';
//     if (lowerReason.includes('vehicle') || lowerReason.includes('car') || lowerReason.includes('horn')) return '🚗';
//     if (lowerReason.includes('construction') || lowerReason.includes('drilling')) return '🔨';
//     if (lowerReason.includes('party')) return '🎉';
//     if (lowerReason.includes('dog') || lowerReason.includes('bark')) return '🐕';
//     if (lowerReason.includes('gun') || lowerReason.includes('shot')) return '💥';
//     if (lowerReason.includes('siren')) return '🚨';
//     if (lowerReason.includes('shouting') || lowerReason.includes('scream')) return '🗣️';
//     return '📢';
//   };

//   const getNoiseLevelColor = (level) => {
//     const colors = { critical: '#8B0000', red: '#F44336', yellow: '#FFC107', green: '#4CAF50' };
//     return colors[level] || '#999';
//   };
  
//   const getNoiseLevelBg = (level) => {
//     const colors = { critical: '#FFEBEE', red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' };
//     return colors[level] || '#F5F5F5';
//   };
  
//   const getNoiseLevelLabel = (level) => {
//     const labels = { critical: 'Critical', red: 'High', yellow: 'Medium', green: 'Low' };
//     return labels[level] || 'Unknown';
//   };
  
//   const getStatusColor = (status) => {
//     const colors = { pending: '#999', action_required: '#F44336', monitoring: '#FFC107', resolved: '#4CAF50' };
//     return colors[status] || '#999';
//   };
  
//   const getStatusLabel = (status) => {
//     const labels = { pending: 'Pending', action_required: 'Action Required', monitoring: 'Monitoring', resolved: 'Resolved' };
//     return labels[status] || 'Pending';
//   };

//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffMins = Math.floor((now - date) / 60000);
//     const diffHours = Math.floor(diffMins / 60);
//     const diffDays = Math.floor(diffHours / 24);
//     if (diffMins < 1) return 'Just now';
//     if (diffMins < 60) return `${diffMins}m ago`;
//     if (diffHours < 24) return `${diffHours}h ago`;
//     if (diffDays < 7) return `${diffDays}d ago`;
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//   };

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
//     ]).start();
//   };

//   const closeDrawer = () => {
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
//     ]).start(() => setDrawerVisible(false));
//   };

//   const filters = ['All', 'AI Analyzed', 'Multi-File', 'Critical', 'High', 'Medium', 'Low'];
//   const filteredReports = getFilteredReports();

//   // Render Attachment Modal
//   const renderAttachmentModal = () => {
//     if (!selectedAttachment) return null;
//     return (
//       <Modal visible={attachmentModalVisible} transparent animationType="fade" onRequestClose={() => setAttachmentModalVisible(false)}>
//         <View style={styles.attachmentModalOverlay}>
//           <View style={styles.attachmentModalContainer}>
//             <LinearGradient colors={['#8B4513', '#654321']} style={styles.attachmentModalHeader}>
//               <Text style={styles.attachmentModalTitle}>
//                 {selectedAttachment?.type === 'video' ? 'Video Preview' : 'Audio Preview'}
//               </Text>
//               <TouchableOpacity onPress={() => setAttachmentModalVisible(false)} style={styles.attachmentModalClose}>
//                 <Ionicons name="close" size={28} color="#D4AC0D" />
//               </TouchableOpacity>
//             </LinearGradient>

//             <View style={styles.attachmentModalContent}>
//               {selectedAttachment?.type === 'video' ? (
//                 <Video 
//                   source={{ uri: selectedAttachment.url }} 
//                   style={styles.attachmentVideo} 
//                   useNativeControls 
//                   resizeMode="contain" 
//                 />
//               ) : (
//                 <View style={styles.attachmentAudioContainer}>
//                   <Ionicons name="musical-notes" size={80} color="#8B4513" />
//                   <Text style={styles.attachmentAudioName}>{selectedAttachment?.fileName || 'Audio Recording'}</Text>
//                   <TouchableOpacity 
//                     style={styles.attachmentAudioPlayBtn}
//                     onPress={() => playAttachmentAudio(selectedAttachment?.url, 'modal')}
//                   >
//                     <LinearGradient colors={['#8B4513', '#654321']} style={styles.attachmentAudioPlayGradient}>
//                       <Ionicons name={playingAttachmentId === 'modal' ? "pause" : "play"} size={32} color="#D4AC0D" />
//                       <Text style={styles.attachmentAudioPlayText}>
//                         {playingAttachmentId === 'modal' ? 'Pause' : 'Play Audio'}
//                       </Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </View>
//               )}
              
//               <View style={styles.attachmentInfo}>
//                 <Text style={styles.attachmentInfoLabel}>File Name:</Text>
//                 <Text style={styles.attachmentInfoValue}>{selectedAttachment?.fileName || 'N/A'}</Text>
//                 <Text style={styles.attachmentInfoLabel}>File Size:</Text>
//                 <Text style={styles.attachmentInfoValue}>{(selectedAttachment?.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
//                 {selectedAttachment?.duration ? (
//                   <>
//                     <Text style={styles.attachmentInfoLabel}>Duration:</Text>
//                     <Text style={styles.attachmentInfoValue}>
//                       {Math.floor(selectedAttachment.duration / 60)}:{(selectedAttachment.duration % 60).toString().padStart(2, '0')}
//                     </Text>
//                   </>
//                 ) : null}
//                 <Text style={styles.attachmentInfoLabel}>Source:</Text>
//                 <View style={[styles.sourceBadgeLarge, selectedAttachment?.source === 'live' ? styles.liveBadgeLarge : styles.downloadedBadgeLarge]}>
//                   <Ionicons name={selectedAttachment?.source === 'live' ? "mic" : "download"} size={14} color="#fff" />
//                   <Text style={styles.sourceBadgeTextLarge}>{selectedAttachment?.source === 'live' ? 'Live Recording' : 'Downloaded File'}</Text>
//                 </View>
//               </View>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   // Render AI Results Modal
//   const renderAiModal = () => {
//     if (!selectedAiFile) return null;
//     return (
//       <Modal visible={aiModalVisible} transparent animationType="fade" onRequestClose={() => setAiModalVisible(false)}>
//         <View style={styles.aiModalOverlay}>
//           <View style={styles.aiModalContainer}>
//             <LinearGradient colors={['#8B4513', '#654321']} style={styles.aiModalHeader}>
//               <Text style={styles.aiModalTitle}>AI Forensic Analysis</Text>
//               <TouchableOpacity onPress={() => setAiModalVisible(false)} style={styles.aiModalClose}>
//                 <Ionicons name="close" size={28} color="#D4AC0D" />
//               </TouchableOpacity>
//             </LinearGradient>

//             <ScrollView style={styles.aiModalContent}>
//               {/* File Info */}
//               <View style={styles.aiFileInfo}>
//                 <Ionicons name={selectedAiFile.fileType === 'video' ? 'videocam' : 'musical-notes'} size={24} color="#8B4513" />
//                 <Text style={styles.aiFileName}>{selectedAiFile.fileName || 'Recording'}</Text>
//                 <View style={[styles.sourceBadgeSmall, selectedAiFile.mediaSource === 'live' ? styles.liveBadgeSmall : styles.downloadedBadgeSmall]}>
//                   <Ionicons name={selectedAiFile.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                   <Text style={styles.sourceBadgeTextSmall}>{selectedAiFile.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//                 </View>
//               </View>

//               {/* Metrics Cards */}
//               <View style={styles.aiMetricsGrid}>
//                 <LinearGradient colors={['#8B4513', '#654321']} style={styles.aiMetricCard}>
//                   <Ionicons name="volume-high" size={24} color="#D4AC0D" />
//                   <Text style={styles.aiMetricValue}>{selectedAiFile.decibel || 0} dB</Text>
//                   <Text style={styles.aiMetricLabel}>DECIBEL</Text>
//                 </LinearGradient>

//                 <LinearGradient colors={['#8B4513', '#5D3A1A']} style={styles.aiMetricCard}>
//                   <Ionicons name="speedometer" size={24} color="#D4AC0D" />
//                   <Text style={styles.aiMetricValue}>{selectedAiFile.noise_level?.level || 'N/A'}</Text>
//                   <Text style={styles.aiMetricLabel}>NOISE LEVEL</Text>
//                 </LinearGradient>

//                 <LinearGradient colors={['#654321', '#8B4513']} style={styles.aiMetricCard}>
//                   <Ionicons name="navigate" size={24} color="#D4AC0D" />
//                   <Text style={styles.aiMetricValue}>~{selectedAiFile.distance?.meters || 0}m</Text>
//                   <Text style={styles.aiMetricLabel}>DISTANCE</Text>
//                 </LinearGradient>
//               </View>

//               {/* Distance Details */}
//               {selectedAiFile.distance ? (
//                 <View style={styles.aiDistanceSection}>
//                   <View style={styles.aiDistanceHeader}>
//                     <Ionicons name="compass" size={20} color="#8B4513" />
//                     <Text style={styles.aiDistanceTitle}>Distance Estimation</Text>
//                   </View>
//                   <View style={styles.aiDistanceContent}>
//                     <Text style={styles.aiDistanceCategory}>{selectedAiFile.distance.category}</Text>
//                     <Text style={styles.aiDistanceMeters}>{selectedAiFile.distance.meters} meters from source</Text>
//                     <Text style={styles.aiDistanceReference}>
//                       Based on {selectedAiFile.distance.reference_sound} ({selectedAiFile.distance.reference_db}dB at 1m)
//                     </Text>
//                   </View>
//                 </View>
//               ) : null}

//               {/* Detections List */}
//               <View style={styles.aiDetectionsSection}>
//                 <View style={styles.aiDetectionsHeader}>
//                   <Ionicons name="list" size={20} color="#8B4513" />
//                   <Text style={styles.aiDetectionsTitle}>Sound Classifications</Text>
//                 </View>
                
//                 {selectedAiFile.detections?.map((detection, index) => (
//                   <View key={index} style={styles.aiDetectionItem}>
//                     <LinearGradient 
//                       colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#5D3A1A', '#3D2B10']}
//                       style={styles.aiDetectionRank}
//                     >
//                       <Text style={styles.aiDetectionRankText}>#{index + 1}</Text>
//                     </LinearGradient>
//                     <View style={styles.aiDetectionContent}>
//                       <Text style={styles.aiDetectionClass}>{detection.class}</Text>
//                       <View style={styles.aiDetectionConfidenceBar}>
//                         <View style={styles.aiConfidenceBarBg}>
//                           <LinearGradient
//                             colors={['#D4AC0D', '#8B4513']}
//                             style={[styles.aiConfidenceBarFill, { width: `${(detection.confidence * 100).toFixed(1)}%` }]}
//                           />
//                         </View>
//                         <Text style={styles.aiConfidenceText}>
//                           {(detection.confidence * 100).toFixed(1)}%
//                         </Text>
//                       </View>
//                     </View>
//                   </View>
//                 ))}
//               </View>

//               {/* Processing Time */}
//               {selectedAiFile.processing_time ? (
//                 <View style={styles.aiFooter}>
//                   <Ionicons name="time" size={16} color="#D4AC0D" />
//                   <Text style={styles.aiFooterText}>Processed in {selectedAiFile.processing_time}s</Text>
//                 </View>
//               ) : null}
//             </ScrollView>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
//         <View style={styles.headerContent}>
//           <View style={styles.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
//               <Ionicons name="refresh" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={styles.headerTitle}>📊 Noise Reports</Text>
//           <Text style={styles.headerSubtitle}>
//             {filteredReports.length} {selectedFilter !== 'All' ? selectedFilter : ''} report{filteredReports.length !== 1 ? 's' : ''}
//           </Text>
//         </View>
//       </LinearGradient>

//       <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={styles.filterContent}>
//         {filters.map((filter) => (
//           <TouchableOpacity
//             key={filter}
//             style={[styles.filterPill, selectedFilter === filter && styles.filterPillActive]}
//             onPress={() => setSelectedFilter(filter)}
//           >
//             <Text style={[styles.filterPillText, selectedFilter === filter && styles.filterPillTextActive]}>{filter}</Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#8B4513" />
//           <Text style={styles.loadingText}>Loading reports...</Text>
//         </View>
//       ) : filteredReports.length === 0 ? (
//         <View style={styles.emptyContainer}>
//           <Ionicons name="document-text-outline" size={80} color="#CCC" />
//           <Text style={styles.emptyText}>No reports found</Text>
//           <Text style={styles.emptySubtext}>
//             {selectedFilter !== 'All' ? `No ${selectedFilter} reports available` : 'Reports will appear here when submitted'}
//           </Text>
//         </View>
//       ) : (
//         <ScrollView
//           style={styles.reportsList}
//           contentContainerStyle={{ paddingBottom: 20 }}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} tintColor="#8B4513" />}
//         >
//           {filteredReports.map((report) => (
//             <TouchableOpacity
//               key={report._id}
//               style={styles.reportCard}
//               onPress={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
//               activeOpacity={0.7}
//             >
//               <View style={styles.reportHeader}>
//                 <View style={styles.reportHeaderLeft}>
//                   <Text style={styles.reportIcon}>{getReasonIcon(report.aiSummary?.topDetection || report.reason)}</Text>
//                   <View style={styles.reportHeaderText}>
//                     <Text style={styles.reportReason}>{report.aiSummary?.topDetection || report.reason || 'Noise Report'}</Text>
//                     <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
//                   </View>
//                 </View>
//                 <View style={styles.reportHeaderRight}>
//                   {report.hasAiResults ? (
//                     <View style={styles.aiIndicator}>
//                       <Ionicons name="sparkles" size={16} color="#D4AC0D" />
//                     </View>
//                   ) : null}
//                   {report.attachments && report.attachments.length > 1 ? (
//                     <View style={styles.multiFileIndicator}>
//                       <Text style={styles.multiFileText}>{report.attachments.length}</Text>
//                     </View>
//                   ) : null}
//                   {report.noiseLevel ? (
//                     <View style={[styles.noiseLevelBadge, { backgroundColor: getNoiseLevelBg(report.noiseLevel) }]}>
//                       <View style={[styles.noiseLevelDot, { backgroundColor: getNoiseLevelColor(report.noiseLevel) }]} />
//                       <Text style={[styles.noiseLevelText, { color: getNoiseLevelColor(report.noiseLevel) }]}>
//                         {getNoiseLevelLabel(report.noiseLevel)}
//                       </Text>
//                     </View>
//                   ) : null}
//                   <Ionicons name={expandedReport === report._id ? "chevron-up" : "chevron-down"} size={24} color="#8B4513" />
//                 </View>
//               </View>

//               {/* AI Summary Preview */}
//               {report.aiSummary && report.aiSummary.topDetection ? (
//                 <TouchableOpacity 
//                   style={styles.aiSummaryPreview}
//                   onPress={() => openAiModal(report.aiResults, 0)}
//                 >
//                   <LinearGradient colors={['rgba(212,172,13,0.1)', 'rgba(139,69,19,0.05)']} style={styles.aiSummaryGradient}>
//                     <Ionicons name="analytics" size={16} color="#D4AC0D" />
//                     <Text style={styles.aiSummaryText} numberOfLines={1}>
//                       AI: {report.aiSummary.topDetection} • {report.aiSummary.averageDecibel || '?'}dB • {report.fileCount} file(s)
//                     </Text>
//                     <Ionicons name="chevron-forward" size={16} color="#D4AC0D" />
//                   </LinearGradient>
//                 </TouchableOpacity>
//               ) : null}

//               {expandedReport === report._id ? (
//                 <View style={styles.reportDetails}>
//                   <View style={styles.statusSection}>
//                     <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status || 'pending') }]}>
//                       <Ionicons name="flag" size={16} color="#FFF" />
//                       <Text style={styles.statusText}>{getStatusLabel(report.status || 'pending')}</Text>
//                     </View>
//                     {report.consecutiveDays > 1 ? (
//                       <View style={styles.consecutiveDaysBadge}>
//                         <Ionicons name="calendar" size={16} color={report.noiseLevel === 'critical' ? '#8B0000' : '#F44336'} />
//                         <Text style={[styles.consecutiveDaysText, report.noiseLevel === 'critical' ? { color: '#8B0000' } : null]}>
//                           {report.consecutiveDays} consecutive days
//                         </Text>
//                       </View>
//                     ) : null}
//                     {report.noiseLevel === 'critical' ? (
//                       <View style={styles.criticalBadge}>
//                         <Ionicons name="alert" size={16} color="#FFF" />
//                         <Text style={styles.criticalBadgeText}>CRITICAL</Text>
//                       </View>
//                     ) : null}
//                   </View>

//                   {/* Full AI Results */}
//                   {report.aiResults && report.aiResults.length > 0 ? (
//                     <View style={styles.aiFullResults}>
//                       <View style={styles.aiFullHeader}>
//                         <Ionicons name="sparkles" size={20} color="#8B4513" />
//                         <Text style={styles.aiFullTitle}>AI Analysis Results ({report.aiResults.length} file{report.aiResults.length !== 1 ? 's' : ''})</Text>
//                       </View>
                      
//                       {report.aiResults.map((aiResult, index) => (
//                         <TouchableOpacity
//                           key={index}
//                           style={styles.aiFileResult}
//                           onPress={() => openAiModal(report.aiResults, index)}
//                         >
//                           <View style={styles.aiFileHeader}>
//                             <Ionicons 
//                               name={aiResult.fileType === 'video' ? 'videocam' : 'musical-notes'} 
//                               size={16} 
//                               color="#8B4513" 
//                             />
//                             <Text style={styles.aiFileName}>File {index + 1}</Text>
//                             <View style={[styles.sourceBadgeSmall, aiResult.mediaSource === 'live' ? styles.liveBadgeSmall : styles.downloadedBadgeSmall]}>
//                               <Ionicons name={aiResult.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                               <Text style={styles.sourceBadgeTextSmall}>{aiResult.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//                             </View>
//                           </View>
                          
//                           <View style={styles.aiFileMetrics}>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>dB</Text>
//                               <Text style={styles.aiFileMetricValue}>{aiResult.decibel || 0}</Text>
//                             </View>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>Distance</Text>
//                               <Text style={styles.aiFileMetricValue}>~{aiResult.distance?.meters || 0}m</Text>
//                             </View>
//                             <View style={styles.aiFileMetric}>
//                               <Text style={styles.aiFileMetricLabel}>Top Sound</Text>
//                               <Text style={styles.aiFileMetricValue} numberOfLines={1}>
//                                 {aiResult.detections?.[0]?.class?.substring(0, 12) || 'N/A'}
//                               </Text>
//                             </View>
//                           </View>
//                         </TouchableOpacity>
//                       ))}
//                     </View>
//                   ) : null}

//                   <TouchableOpacity 
//                     style={[
//                       styles.autoResponseSection,
//                       (!report.status || report.status === 'pending') ? styles.autoResponsePending : null,
//                       report.noiseLevel === 'critical' ? styles.autoResponseCritical : null
//                     ]}
//                     onPress={() => openStatusModal(report)}
//                     activeOpacity={0.7}
//                   >
//                     <View style={styles.autoResponseHeader}>
//                       <Ionicons 
//                         name={(!report.status || report.status === 'pending') ? "alert-circle" : "information-circle"} 
//                         size={20} 
//                         color={report.noiseLevel === 'critical' ? "#8B0000" : (!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} 
//                       />
//                       <Text style={[
//                         styles.autoResponseTitle,
//                         (!report.status || report.status === 'pending') ? styles.autoResponseTitlePending : null,
//                         report.noiseLevel === 'critical' ? styles.autoResponseTitleCritical : null
//                       ]}>
//                         {(!report.status || report.status === 'pending') ? 'No Response Sent' : 'System Response'}
//                       </Text>
//                       <Ionicons name="create-outline" size={20} color={report.noiseLevel === 'critical' ? "#8B0000" : (!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} style={{ marginLeft: 'auto' }} />
//                     </View>
//                     <View style={styles.autoResponseContent}>
//                       <Text style={[
//                         styles.autoResponseText,
//                         (!report.status || report.status === 'pending') ? styles.autoResponseTextPending : null
//                       ]}>
//                         {getCurrentResponse(report)}
//                       </Text>
//                     </View>
//                     <View style={styles.tapHint}>
//                       <Text style={[
//                         styles.tapHintText,
//                         (!report.status || report.status === 'pending') ? styles.tapHintTextPending : null
//                       ]}>
//                         {(!report.status || report.status === 'pending') ? 'Tap to select and send response' : 'Tap to change response & status'}
//                       </Text>
//                     </View>
//                   </TouchableOpacity>

//                   {report.comment ? (
//                     <View style={styles.detailSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="chatbox-outline" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Details</Text>
//                       </View>
//                       <Text style={styles.detailText}>{report.comment}</Text>
//                     </View>
//                   ) : null}

//                   {report.location ? (
//                     <View style={styles.detailSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="location" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Location</Text>
//                       </View>
//                       <Text style={styles.detailText}>
//                         Lat: {report.location.latitude?.toFixed(6)}, Lon: {report.location.longitude?.toFixed(6)}
//                       </Text>
//                     </View>
//                   ) : null}

//                   {/* Multiple Attachments */}
//                   {report.attachments && report.attachments.length > 0 ? (
//                     <View style={styles.attachmentsSection}>
//                       <View style={styles.detailHeader}>
//                         <Ionicons name="attach" size={18} color="#8B4513" />
//                         <Text style={styles.detailLabel}>Attachments ({report.attachments.length})</Text>
//                       </View>
                      
//                       {report.attachments.map((att, idx) => (
//                         <TouchableOpacity 
//                           key={idx} 
//                           style={styles.attachmentItem}
//                           onPress={() => {
//                             setSelectedAttachment(att);
//                             setAttachmentModalVisible(true);
//                           }}
//                           activeOpacity={0.7}
//                         >
//                           <Ionicons 
//                             name={att.type === 'video' ? 'videocam' : 'musical-notes'} 
//                             size={20} 
//                             color="#8B4513" 
//                           />
//                           <Text style={styles.attachmentName} numberOfLines={1}>
//                             {att.fileName || `${att.type} ${idx + 1}`}
//                           </Text>
//                           <View style={styles.attachmentSource}>
//                             <View style={[styles.sourceBadge, att.source === 'live' ? styles.liveBadge : styles.downloadedBadge]}>
//                               <Ionicons name={att.source === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                               <Text style={styles.sourceBadgeText}>{att.source === 'live' ? 'Live' : 'Downloaded'}</Text>
//                             </View>
//                           </View>
//                           {att.type === 'audio' ? (
//                             <TouchableOpacity 
//                               style={styles.playSmallBtn}
//                               onPress={(e) => {
//                                 e.stopPropagation();
//                                 playAttachmentAudio(att.url, `${report._id}-${idx}`);
//                               }}
//                             >
//                               <Ionicons 
//                                 name={playingAttachmentId === `${report._id}-${idx}` ? "pause" : "play"} 
//                                 size={18} 
//                                 color="#8B4513" 
//                               />
//                             </TouchableOpacity>
//                           ) : null}
//                           <Ionicons name="eye-outline" size={18} color="#8B4513" />
//                         </TouchableOpacity>
//                       ))}
//                     </View>
//                   ) : null}

//                   <View style={styles.detailSection}>
//                     <Text style={styles.timestampText}>
//                       {new Date(report.createdAt).toLocaleString('en-US', {
//                         month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
//                       })}
//                     </Text>
//                   </View>
//                 </View>
//               ) : null}
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       )}

//       {/* Status Modal */}
//       <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
//         <View style={styles.statusModalOverlay}>
//           <View style={styles.statusModalContainer}>
//             <View style={styles.statusModalHeader}>
//               <Text style={styles.statusModalTitle}>Update Report Status</Text>
//               <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
//                 <Ionicons name="close" size={28} color="#333" />
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.statusModalContent} showsVerticalScrollIndicator={false}>
//               {selectedReport ? getAvailableResponses(selectedReport).map((response) => (
//                 <TouchableOpacity
//                   key={response.status}
//                   style={[styles.statusOption, selectedStatus === response.status ? styles.statusOptionSelected : null]}
//                   onPress={() => setSelectedStatus(response.status)}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.statusOptionHeader}>
//                     <View style={styles.statusOptionLeft}>
//                       <View style={[styles.statusOptionRadio, selectedStatus === response.status ? styles.statusOptionRadioSelected : null]}>
//                         {selectedStatus === response.status ? <View style={styles.statusOptionRadioInner} /> : null}
//                       </View>
//                       <Ionicons name={response.icon} size={24} color={response.status === 'action_required' ? '#F44336' : getStatusColor(response.status)} />
//                       <Text style={[styles.statusOptionLabel, { color: response.status === 'action_required' ? '#F44336' : getStatusColor(response.status) }]}>
//                         {response.label}
//                       </Text>
//                     </View>
//                   </View>
//                   <View style={styles.statusOptionTextContainer}>
//                     <Text style={styles.statusOptionText}>{response.text}</Text>
//                   </View>
//                 </TouchableOpacity>
//               )) : null}
//             </ScrollView>

//             <View style={styles.statusModalFooter}>
//               <TouchableOpacity style={styles.cancelButton} onPress={() => setStatusModalVisible(false)}>
//                 <Text style={styles.cancelButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.saveButton, updatingStatus ? styles.saveButtonDisabled : null]}
//                 onPress={updateReportStatus}
//                 disabled={updatingStatus}
//               >
//                 {updatingStatus ? (
//                   <ActivityIndicator size="small" color="#FFF" />
//                 ) : (
//                   <>
//                     <Ionicons name="checkmark" size={20} color="#FFF" />
//                     <Text style={styles.saveButtonText}>Save Status</Text>
//                   </>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* AI Results Modal */}
//       {renderAiModal()}
      
//       {/* Attachment Modal */}
//       {renderAttachmentModal()}

//       {/* Drawer Modal */}
//       <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
//         <View style={styles.modalContainer}>
//           <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
//             <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
//           </Animated.View>
//           <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
//             <CustomDrawer navigation={navigation} onClose={closeDrawer} />
//           </Animated.View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F5F5F5' },
//   header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
//   headerContent: { marginTop: 10 },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
//   headerButton: { padding: 8 },
//   headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
//   headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
//   filterContainer: { backgroundColor: '#FFF', paddingVertical: 8, maxHeight: 48 },
//   filterContent: { paddingHorizontal: 15, gap: 8 },
//   filterPill: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#F0F0F0', borderRadius: 16 },
//   filterPillActive: { backgroundColor: '#8B4513' },
//   filterPillText: { fontSize: 13, color: '#333', fontWeight: '500' },
//   filterPillTextActive: { color: '#FFF', fontWeight: 'bold' },
//   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   loadingText: { marginTop: 10, fontSize: 16, color: '#8B4513' },
//   emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
//   emptyText: { fontSize: 20, fontWeight: 'bold', color: '#999', marginTop: 15 },
//   emptySubtext: { fontSize: 14, color: '#BBB', textAlign: 'center', marginTop: 8 },
//   reportsList: { flex: 1 },
//   reportCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 16, elevation: 2 },
//   reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   reportHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
//   reportHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   reportIcon: { fontSize: 32, marginRight: 12 },
//   reportHeaderText: { flex: 1 },
//   reportReason: { fontSize: 16, fontWeight: 'bold', color: '#333' },
//   reportDate: { fontSize: 12, color: '#999', marginTop: 2 },
//   noiseLevelBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
//   noiseLevelDot: { width: 8, height: 8, borderRadius: 4 },
//   noiseLevelText: { fontSize: 11, fontWeight: 'bold' },
//   aiIndicator: { backgroundColor: 'rgba(212,172,13,0.1)', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D4AC0D' },
//   multiFileIndicator: { backgroundColor: '#8B4513', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
//   multiFileText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
//   criticalBadge: { backgroundColor: '#8B0000', flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
//   criticalBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  
//   aiSummaryPreview: { marginTop: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D4AC0D' },
//   aiSummaryGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
//   aiSummaryText: { flex: 1, color: '#8B4513', fontSize: 13, fontWeight: '500' },

//   reportDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
//   statusSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
//   statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
//   statusText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
//   consecutiveDaysBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFEBEE', gap: 6 },
//   consecutiveDaysText: { fontSize: 12, fontWeight: 'bold', color: '#F44336' },

//   aiFullResults: { marginBottom: 16, backgroundColor: '#FAF5EB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D4AC0D' },
//   aiFullHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiFullTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiFileResult: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
//   aiFileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
//   aiFileName: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },
//   aiFileMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
//   aiFileMetric: { alignItems: 'center' },
//   aiFileMetricLabel: { fontSize: 10, color: '#999' },
//   aiFileMetricValue: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },

//   autoResponseSection: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2196F3', borderWidth: 2, borderColor: '#2196F3' },
//   autoResponsePending: { backgroundColor: '#FFF3E0', borderLeftColor: '#F57C00', borderColor: '#F57C00' },
//   autoResponseCritical: { backgroundColor: '#FFEBEE', borderLeftColor: '#8B0000', borderColor: '#8B0000' },
//   autoResponseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
//   autoResponseTitle: { fontSize: 16, fontWeight: '700', color: '#1976D2', marginLeft: 8 },
//   autoResponseTitlePending: { color: '#F57C00' },
//   autoResponseTitleCritical: { color: '#8B0000' },
//   autoResponseContent: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8 },
//   autoResponseText: { fontSize: 14, color: '#333', lineHeight: 20 },
//   autoResponseTextPending: { fontStyle: 'italic', color: '#666' },
//   tapHint: { alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BBDEFB' },
//   tapHintText: { fontSize: 12, color: '#1976D2', fontWeight: '600', fontStyle: 'italic' },
//   tapHintTextPending: { color: '#F57C00' },

//   detailSection: { marginBottom: 12 },
//   detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
//   detailLabel: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },
//   detailText: { fontSize: 14, color: '#555', lineHeight: 20 },

//   attachmentsSection: { marginBottom: 12 },
//   attachmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 10, borderRadius: 8, marginBottom: 6, gap: 10 },
//   attachmentName: { flex: 1, fontSize: 13, color: '#555' },
//   attachmentSource: { marginRight: 4 },
//   sourceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 },
//   liveBadge: { backgroundColor: '#4CAF50' },
//   downloadedBadge: { backgroundColor: '#2196F3' },
//   sourceBadgeText: { fontSize: 9, color: '#fff', fontWeight: '600' },
//   playSmallBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,172,13,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AC0D' },
//   sourceBadgeSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 },
//   liveBadgeSmall: { backgroundColor: '#4CAF50' },
//   downloadedBadgeSmall: { backgroundColor: '#2196F3' },
//   sourceBadgeTextSmall: { fontSize: 9, color: '#fff', fontWeight: '600' },
//   sourceBadgeLarge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 8, alignSelf: 'flex-start', marginTop: 8 },
//   liveBadgeLarge: { backgroundColor: '#4CAF50' },
//   downloadedBadgeLarge: { backgroundColor: '#2196F3' },
//   sourceBadgeTextLarge: { fontSize: 12, color: '#fff', fontWeight: '600' },

//   timestampText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },

//   statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   statusModalContainer: { backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80%', elevation: 5 },
//   statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
//   statusModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
//   statusModalContent: { padding: 20, maxHeight: 400 },
//   statusOption: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E0E0E0' },
//   statusOptionSelected: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
//   statusOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   statusOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
//   statusOptionRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
//   statusOptionRadioSelected: { borderColor: '#4CAF50' },
//   statusOptionRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
//   statusOptionLabel: { fontSize: 16, fontWeight: 'bold' },
//   statusOptionTextContainer: { backgroundColor: '#FFF', borderRadius: 8, padding: 12 },
//   statusOptionText: { fontSize: 14, color: '#555', lineHeight: 20 },
//   statusModalFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 12 },
//   cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
//   cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
//   saveButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
//   saveButtonDisabled: { backgroundColor: '#CCC' },
//   saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },

//   aiModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   aiModalContainer: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', overflow: 'hidden' },
//   aiModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
//   aiModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4AC0D' },
//   aiModalClose: { padding: 4 },
//   aiModalContent: { padding: 20 },
//   aiFileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
//   aiMetricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
//   aiMetricCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
//   aiMetricValue: { color: '#D4AC0D', fontSize: 18, fontWeight: 'bold' },
//   aiMetricLabel: { color: '#FFF', fontSize: 10, opacity: 0.8 },
//   aiDistanceSection: { backgroundColor: '#FAF5EB', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#D4AC0D' },
//   aiDistanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiDistanceTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiDistanceContent: { gap: 4 },
//   aiDistanceCategory: { fontSize: 18, fontWeight: 'bold', color: '#8B4513' },
//   aiDistanceMeters: { fontSize: 14, color: '#333' },
//   aiDistanceReference: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },
//   aiDetectionsSection: { marginBottom: 20 },
//   aiDetectionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   aiDetectionsTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//   aiDetectionItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
//   aiDetectionRank: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
//   aiDetectionRankText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
//   aiDetectionContent: { flex: 1 },
//   aiDetectionClass: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 4 },
//   aiDetectionConfidenceBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   aiConfidenceBarBg: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
//   aiConfidenceBarFill: { height: '100%', borderRadius: 3 },
//   aiConfidenceText: { fontSize: 12, fontWeight: '600', color: '#8B4513', width: 45 },
//   aiFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
//   aiFooterText: { fontSize: 12, color: '#666' },

//   attachmentModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
//   attachmentModalContainer: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', overflow: 'hidden' },
//   attachmentModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
//   attachmentModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4AC0D' },
//   attachmentModalClose: { padding: 4 },
//   attachmentModalContent: { padding: 20 },
//   attachmentVideo: { width: '100%', height: 300, backgroundColor: '#000', borderRadius: 12 },
//   attachmentAudioContainer: { alignItems: 'center', padding: 30 },
//   attachmentAudioName: { fontSize: 16, fontWeight: '500', color: '#333', marginTop: 16, marginBottom: 20 },
//   attachmentAudioPlayBtn: { marginTop: 10 },
//   attachmentAudioPlayGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, gap: 12 },
//   attachmentAudioPlayText: { color: '#D4AC0D', fontSize: 16, fontWeight: 'bold' },
//   attachmentInfo: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
//   attachmentInfoLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
//   attachmentInfoValue: { fontSize: 14, color: '#333', marginBottom: 8 },

//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
// });
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
  StatusBar, Dimensions, Platform, ScrollView,
  RefreshControl, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');
const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

export default function AdminNoiseReportsScreen({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [sound, setSound] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedAiFile, setSelectedAiFile] = useState(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [playingAttachmentId, setPlayingAttachmentId] = useState(null);
  const [stats, setStats] = useState({ totalReports: 0, byNoiseLevel: {}, reportableReports: 0 });
  const [showStatsModal, setShowStatsModal] = useState(false);

  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchReports();
    fetchStats();
    return () => { 
      if (sound) sound.unloadAsync(); 
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/total-reports`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/reports/get-report`);
      const data = await response.json();
      if (response.ok) {
        const transformed = data.map(r => ({
          ...r,
          attachments: r.attachments || [],
          aiResults: r.aiResults || [],
          aiSummary: r.aiSummary || {
            topDetection: r.ai_detection_1_class,
            averageDecibel: r.ai_decibel,
            estimatedDistance: r.ai_distance_meters,
            filesAnalyzed: r.fileCount || 1,
            reportableCount: r.aiSummary?.reportableCount || 0,
            severeCount: r.aiSummary?.severeCount || 0
          },
          fileCount: r.attachments?.length || 1,
          hasAiResults: !!(r.aiResults && r.aiResults.length > 0) || !!(r.ai_detection_1_class),
          topDetection: r.aiSummary?.topDetection || r.ai_detection_1_class || r.reason,
          averageDecibel: r.aiSummary?.averageDecibel || r.ai_decibel,
          estimatedDistance: r.aiSummary?.estimatedDistance || r.ai_distance_meters,
          reportableCount: r.aiSummary?.reportableCount || (r.ai_is_reportable ? 1 : 0),
          severeCount: r.aiSummary?.severeCount || 0
        }));
        setReports(transformed);
      } else {
        Alert.alert('Error', 'Failed to fetch reports');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReports(), fetchStats()]);
    setRefreshing(false);
  };

  const updateReportStatus = async () => {
    if (!selectedReport || !selectedStatus) {
      Alert.alert('Error', 'Please select a response');
      return;
    }
    try {
      setUpdatingStatus(true);
      const response = await fetch(`${API_BASE_URL}/reports/update-status/${selectedReport._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (response.ok) {
        Alert.alert('Success', 'Report status updated successfully');
        setStatusModalVisible(false);
        setSelectedReport(null);
        setSelectedStatus(null);
        await fetchReports();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Could not update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getAvailableResponses = (report) => {
    const { noiseLevel, consecutiveDays, status } = report;
    const responses = [];

    if (noiseLevel === "critical") {
      if (status !== 'resolved') {
        responses.push({
          status: 'action_required',
          text: `⚠️ CRITICAL: Severe noise violation detected. Barangay officer has been dispatched immediately. Day ${consecutiveDays} of 3 for CRITICAL noise.`,
          label: 'Emergency Response',
          icon: 'alert-circle'
        });
      }
      responses.push({
        status: 'resolved',
        text: "Critical noise complaint has been resolved. Emergency response has been completed.",
        label: 'Resolved',
        icon: 'checkmark-circle'
      });
    } else if (noiseLevel === "red") {
      if (status !== 'resolved') {
        responses.push({
          status: 'monitoring',
          text: `We have received your report. The barangay is monitoring this location. Progress: Day ${consecutiveDays} of 3 consecutive reports for HIGH noise.`,
          label: 'Monitoring',
          icon: 'eye'
        });
        if (consecutiveDays >= 3) {
          responses.push({
            status: 'action_required',
            text: "The noise at this location has been reported for 3 consecutive days. A barangay officer has been assigned to take action.",
            label: 'Action Required',
            icon: 'alert-circle'
          });
        }
      }
      responses.push({
        status: 'resolved',
        text: "Your noise complaint has been resolved. Appropriate action has been taken by the barangay.",
        label: 'Resolved',
        icon: 'checkmark-circle'
      });
    } else if (noiseLevel === "yellow") {
      if (status !== 'resolved') {
        responses.push({
          status: 'monitoring',
          text: `Your report has been recorded. The barangay will continue monitoring. Progress: Day ${consecutiveDays} of 5 consecutive reports for MEDIUM noise.`,
          label: 'Monitoring',
          icon: 'eye'
        });
        if (consecutiveDays >= 5) {
          responses.push({
            status: 'action_required',
            text: "The noise has been reported for 5 consecutive days. A barangay officer will take action.",
            label: 'Action Required',
            icon: 'alert-circle'
          });
        }
      }
      responses.push({
        status: 'resolved',
        text: "Your noise complaint has been resolved. The barangay has addressed the issue.",
        label: 'Resolved',
        icon: 'checkmark-circle'
      });
    } else if (noiseLevel === "green") {
      if (status !== 'resolved') {
        responses.push({
          status: 'monitoring',
          text: "Your report has been received. This minor noise is under observation.",
          label: 'Monitoring',
          icon: 'eye'
        });
      }
      responses.push({
        status: 'resolved',
        text: "Advice has been provided regarding your noise report. The matter is now closed.",
        label: 'Resolved',
        icon: 'checkmark-circle'
      });
    }

    return responses;
  };

  const openStatusModal = (report) => {
    setSelectedReport(report);
    setSelectedStatus(report.status || null);
    setStatusModalVisible(true);
  };

  const openAiModal = (aiResults, fileIndex = 0, report = null) => {
    let aiData = null;
    
    // Handle different data structures
    if (aiResults && aiResults.length > 0 && aiResults[fileIndex]) {
      aiData = aiResults[fileIndex];
    } else if (aiResults && !Array.isArray(aiResults)) {
      aiData = aiResults;
    } else if (report) {
      // Create a combined AI result from report fields
      aiData = {
        fileName: `File ${fileIndex + 1}`,
        fileType: report.attachments?.[fileIndex]?.type || 'audio',
        mediaSource: report.attachments?.[fileIndex]?.source || 'downloaded',
        decibel: report.ai_decibel,
        noise_level: {
          level: report.ai_noise_level,
          value: report.noiseLevel,
          description: report.ai_noise_description
        },
        distance: {
          meters: report.ai_distance_meters,
          category: report.ai_distance_category,
          description: report.ai_distance_description,
          reference_sound: report.ai_distance_reference_sound,
          reference_db: report.ai_distance_reference_db
        },
        detections: [
          report.ai_detection_1_class ? { class: report.ai_detection_1_class, confidence: report.ai_detection_1_confidence || 0 } : null,
          report.ai_detection_2_class ? { class: report.ai_detection_2_class, confidence: report.ai_detection_2_confidence || 0 } : null,
          report.ai_detection_3_class ? { class: report.ai_detection_3_class, confidence: report.ai_detection_3_confidence || 0 } : null
        ].filter(Boolean),
        is_reportable: report.ai_is_reportable || false,
        severity_name: report.ai_severity,
        recommendation: report.ai_recommendation,
        reasons: report.ai_reasons || [],
        processing_time: report.ai_processing_time
      };
    }
    
    if (aiData) {
      setSelectedAiFile(aiData);
      setAiModalVisible(true);
    }
  };

  const playAttachmentAudio = async (audioUri, attachmentId) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        if (playingAttachmentId === attachmentId) {
          setPlayingAttachmentId(null);
          return;
        }
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
      setSound(newSound);
      setPlayingAttachmentId(attachmentId);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAttachmentId(null);
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Play error:', error);
      Alert.alert('Error', 'Could not play audio');
    }
  };

  const getCurrentResponse = (report) => {
    if (!report.status || report.status === 'pending') {
      return "No response sent yet. Click to select a response.";
    }
    const responses = getAvailableResponses(report);
    const current = responses.find(r => r.status === report.status);
    return current ? current.text : "Response sent.";
  };

  const getFilteredReports = () => {
    if (selectedFilter === 'All') return reports;
    if (selectedFilter === 'AI Analyzed') return reports.filter(r => r.hasAiResults);
    if (selectedFilter === 'Multi-File') return reports.filter(r => r.attachments && r.attachments.length > 1);
    if (selectedFilter === 'Reportable') return reports.filter(r => r.reportableCount > 0);
    if (selectedFilter === 'Critical') return reports.filter(r => r.noiseLevel === 'critical');
    if (selectedFilter === 'High') return reports.filter(r => r.noiseLevel === 'red');
    if (selectedFilter === 'Medium') return reports.filter(r => r.noiseLevel === 'yellow');
    if (selectedFilter === 'Low') return reports.filter(r => r.noiseLevel === 'green');
    return reports;
  };

  const getReasonIcon = (reason) => {
    if (!reason) return '📢';
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('music') || lowerReason.includes('karaoke')) return '🔊';
    if (lowerReason.includes('vehicle') || lowerReason.includes('car') || lowerReason.includes('horn')) return '🚗';
    if (lowerReason.includes('construction') || lowerReason.includes('drilling')) return '🔨';
    if (lowerReason.includes('party')) return '🎉';
    if (lowerReason.includes('dog') || lowerReason.includes('bark')) return '🐕';
    if (lowerReason.includes('gun') || lowerReason.includes('shot')) return '💥';
    if (lowerReason.includes('siren')) return '🚨';
    if (lowerReason.includes('shouting') || lowerReason.includes('scream')) return '🗣️';
    if (lowerReason.includes('aircon') || lowerReason.includes('ac')) return '❄️';
    if (lowerReason.includes('traffic')) return '🚦';
    return '📢';
  };

  const getNoiseLevelColor = (level) => {
    const colors = { critical: '#8B0000', red: '#F44336', yellow: '#FFC107', green: '#4CAF50' };
    return colors[level] || '#999';
  };
  
  const getNoiseLevelBg = (level) => {
    const colors = { critical: '#FFEBEE', red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' };
    return colors[level] || '#F5F5F5';
  };
  
  const getNoiseLevelLabel = (level) => {
    const labels = { critical: 'Critical', red: 'High', yellow: 'Medium', green: 'Low' };
    return labels[level] || 'Unknown';
  };
  
  const getStatusColor = (status) => {
    const colors = { pending: '#999', action_required: '#F44336', monitoring: '#FFC107', resolved: '#4CAF50' };
    return colors[status] || '#999';
  };
  
  const getStatusLabel = (status) => {
    const labels = { pending: 'Pending', action_required: 'Action Required', monitoring: 'Monitoring', resolved: 'Resolved' };
    return labels[status] || 'Pending';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  };

  const filters = ['All', 'AI Analyzed', 'Multi-File', 'Reportable', 'Critical', 'High', 'Medium', 'Low'];
  const filteredReports = getFilteredReports();

  // Stats Modal
  const renderStatsModal = () => (
    <Modal visible={showStatsModal} transparent animationType="fade" onRequestClose={() => setShowStatsModal(false)}>
      <View style={styles.statsModalOverlay}>
        <View style={styles.statsModalContainer}>
          <LinearGradient colors={['#8B4513', '#654321']} style={styles.statsModalHeader}>
            <Text style={styles.statsModalTitle}>📊 Report Statistics</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(false)} style={styles.statsModalClose}>
              <Ionicons name="close" size={28} color="#D4AC0D" />
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.statsModalContent}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalReports}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.reportableReports || 0}</Text>
              <Text style={styles.statLabel}>Reportable Reports</Text>
            </View>
            
            <View style={styles.statSection}>
              <Text style={styles.statSectionTitle}>By Noise Level</Text>
              <View style={styles.statRow}>
                <View style={[styles.statDot, { backgroundColor: '#8B0000' }]} />
                <Text style={styles.statRowLabel}>Critical:</Text>
                <Text style={styles.statRowValue}>{stats.byNoiseLevel?.critical || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <View style={[styles.statDot, { backgroundColor: '#F44336' }]} />
                <Text style={styles.statRowLabel}>High:</Text>
                <Text style={styles.statRowValue}>{stats.byNoiseLevel?.red || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <View style={[styles.statDot, { backgroundColor: '#FFC107' }]} />
                <Text style={styles.statRowLabel}>Medium:</Text>
                <Text style={styles.statRowValue}>{stats.byNoiseLevel?.yellow || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.statRowLabel}>Low:</Text>
                <Text style={styles.statRowValue}>{stats.byNoiseLevel?.green || 0}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render Attachment Modal
  const renderAttachmentModal = () => {
    if (!selectedAttachment) return null;
    return (
      <Modal visible={attachmentModalVisible} transparent animationType="fade" onRequestClose={() => setAttachmentModalVisible(false)}>
        <View style={styles.attachmentModalOverlay}>
          <View style={styles.attachmentModalContainer}>
            <LinearGradient colors={['#8B4513', '#654321']} style={styles.attachmentModalHeader}>
              <Text style={styles.attachmentModalTitle}>
                {selectedAttachment?.type === 'video' ? 'Video Preview' : 'Audio Preview'}
              </Text>
              <TouchableOpacity onPress={() => setAttachmentModalVisible(false)} style={styles.attachmentModalClose}>
                <Ionicons name="close" size={28} color="#D4AC0D" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.attachmentModalContent}>
              {selectedAttachment?.type === 'video' ? (
                <Video 
                  source={{ uri: selectedAttachment.url }} 
                  style={styles.attachmentVideo} 
                  useNativeControls 
                  resizeMode="contain" 
                />
              ) : (
                <View style={styles.attachmentAudioContainer}>
                  <Ionicons name="musical-notes" size={80} color="#8B4513" />
                  <Text style={styles.attachmentAudioName}>{selectedAttachment?.fileName || 'Audio Recording'}</Text>
                  <TouchableOpacity 
                    style={styles.attachmentAudioPlayBtn}
                    onPress={() => playAttachmentAudio(selectedAttachment?.url, 'modal')}
                  >
                    <LinearGradient colors={['#8B4513', '#654321']} style={styles.attachmentAudioPlayGradient}>
                      <Ionicons name={playingAttachmentId === 'modal' ? "pause" : "play"} size={32} color="#D4AC0D" />
                      <Text style={styles.attachmentAudioPlayText}>
                        {playingAttachmentId === 'modal' ? 'Pause' : 'Play Audio'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentInfoLabel}>File Name:</Text>
                <Text style={styles.attachmentInfoValue}>{selectedAttachment?.fileName || 'N/A'}</Text>
                <Text style={styles.attachmentInfoLabel}>File Size:</Text>
                <Text style={styles.attachmentInfoValue}>{(selectedAttachment?.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
                {selectedAttachment?.duration ? (
                  <>
                    <Text style={styles.attachmentInfoLabel}>Duration:</Text>
                    <Text style={styles.attachmentInfoValue}>
                      {Math.floor(selectedAttachment.duration / 60)}:{(selectedAttachment.duration % 60).toString().padStart(2, '0')}
                    </Text>
                  </>
                ) : null}
                <Text style={styles.attachmentInfoLabel}>Source:</Text>
                <View style={[styles.sourceBadgeLarge, selectedAttachment?.source === 'live' ? styles.liveBadgeLarge : styles.downloadedBadgeLarge]}>
                  <Ionicons name={selectedAttachment?.source === 'live' ? "mic" : "download"} size={14} color="#fff" />
                  <Text style={styles.sourceBadgeTextLarge}>{selectedAttachment?.source === 'live' ? 'Live Recording' : 'Downloaded File'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render AI Results Modal
  const renderAiModal = () => {
    if (!selectedAiFile) return null;
    return (
      <Modal visible={aiModalVisible} transparent animationType="fade" onRequestClose={() => setAiModalVisible(false)}>
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContainer}>
            <LinearGradient colors={['#8B4513', '#654321']} style={styles.aiModalHeader}>
              <Text style={styles.aiModalTitle}>🔬 AI Forensic Analysis</Text>
              <TouchableOpacity onPress={() => setAiModalVisible(false)} style={styles.aiModalClose}>
                <Ionicons name="close" size={28} color="#D4AC0D" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.aiModalContent}>
              {/* File Info */}
              <View style={styles.aiFileInfo}>
                <Ionicons name={selectedAiFile.fileType === 'video' ? 'videocam' : 'musical-notes'} size={24} color="#8B4513" />
                <Text style={styles.aiFileName}>{selectedAiFile.fileName || 'Recording'}</Text>
                <View style={[styles.sourceBadgeSmall, selectedAiFile.mediaSource === 'live' ? styles.liveBadgeSmall : styles.downloadedBadgeSmall]}>
                  <Ionicons name={selectedAiFile.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
                  <Text style={styles.sourceBadgeTextSmall}>{selectedAiFile.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
                </View>
              </View>

              {/* Reportable Badge */}
              {selectedAiFile.is_reportable && (
                <View style={styles.reportableAlert}>
                  <LinearGradient colors={selectedAiFile.severity_name === 'CRITICAL' ? ['#8B0000', '#5D0000'] : ['#F44336', '#D32F2F']} style={styles.reportableGradient}>
                    <Ionicons name="alert-circle" size={24} color="#fff" />
                    <View style={styles.reportableContent}>
                      <Text style={styles.reportableTitle}>
                        {selectedAiFile.severity_name === 'CRITICAL' ? '🚨 CRITICAL VIOLATION' : '⚠️ REPORTABLE NOISE'}
                      </Text>
                      <Text style={styles.reportableText}>{selectedAiFile.recommendation}</Text>
                    </View>
                  </LinearGradient>
                </View>
              )}

              {/* Metrics Cards */}
              <View style={styles.aiMetricsGrid}>
                <LinearGradient colors={['#8B4513', '#654321']} style={styles.aiMetricCard}>
                  <Ionicons name="volume-high" size={24} color="#D4AC0D" />
                  <Text style={styles.aiMetricValue}>{selectedAiFile.decibel || 0} dB</Text>
                  <Text style={styles.aiMetricLabel}>DECIBEL</Text>
                </LinearGradient>

                <LinearGradient colors={['#8B4513', '#5D3A1A']} style={styles.aiMetricCard}>
                  <Ionicons name="speedometer" size={24} color="#D4AC0D" />
                  <Text style={styles.aiMetricValue}>{selectedAiFile.noise_level?.level || 'N/A'}</Text>
                  <Text style={styles.aiMetricLabel}>NOISE LEVEL</Text>
                </LinearGradient>

                <LinearGradient colors={['#654321', '#8B4513']} style={styles.aiMetricCard}>
                  <Ionicons name="navigate" size={24} color="#D4AC0D" />
                  <Text style={styles.aiMetricValue}>~{selectedAiFile.distance?.meters || 0}m</Text>
                  <Text style={styles.aiMetricLabel}>DISTANCE</Text>
                </LinearGradient>
              </View>

              {/* Distance Details */}
              {selectedAiFile.distance ? (
                <View style={styles.aiDistanceSection}>
                  <View style={styles.aiDistanceHeader}>
                    <Ionicons name="compass" size={20} color="#8B4513" />
                    <Text style={styles.aiDistanceTitle}>Distance Estimation</Text>
                  </View>
                  <View style={styles.aiDistanceContent}>
                    <Text style={styles.aiDistanceCategory}>{selectedAiFile.distance.category || 'Unknown'}</Text>
                    <Text style={styles.aiDistanceMeters}>{selectedAiFile.distance.meters} meters from source</Text>
                    {selectedAiFile.distance.reference_sound && (
                      <Text style={styles.aiDistanceReference}>
                        Based on {selectedAiFile.distance.reference_sound} ({selectedAiFile.distance.reference_db}dB at 1m)
                      </Text>
                    )}
                    {selectedAiFile.distance.description && (
                      <Text style={styles.aiDistanceDescription}>{selectedAiFile.distance.description}</Text>
                    )}
                  </View>
                </View>
              ) : null}

              {/* Reasons if Reportable */}
              {selectedAiFile.reasons && selectedAiFile.reasons.length > 0 && (
                <View style={styles.aiReasonsSection}>
                  <View style={styles.aiReasonsHeader}>
                    <Ionicons name="alert" size={20} color="#F44336" />
                    <Text style={styles.aiReasonsTitle}>Violation Reasons</Text>
                  </View>
                  {selectedAiFile.reasons.map((reason, idx) => (
                    <View key={idx} style={styles.aiReasonItem}>
                      <Ionicons name="alert-circle" size={14} color="#F44336" />
                      <Text style={styles.aiReasonText}>{reason}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Detections List */}
              {selectedAiFile.detections && selectedAiFile.detections.length > 0 && (
                <View style={styles.aiDetectionsSection}>
                  <View style={styles.aiDetectionsHeader}>
                    <Ionicons name="list" size={20} color="#8B4513" />
                    <Text style={styles.aiDetectionsTitle}>Sound Classifications</Text>
                  </View>
                  
                  {selectedAiFile.detections.map((detection, index) => (
                    <View key={index} style={styles.aiDetectionItem}>
                      <LinearGradient 
                        colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#5D3A1A', '#3D2B10']}
                        style={styles.aiDetectionRank}
                      >
                        <Text style={styles.aiDetectionRankText}>#{index + 1}</Text>
                      </LinearGradient>
                      <View style={styles.aiDetectionContent}>
                        <Text style={styles.aiDetectionClass}>{detection.class}</Text>
                        <View style={styles.aiDetectionConfidenceBar}>
                          <View style={styles.aiConfidenceBarBg}>
                            <LinearGradient
                              colors={['#D4AC0D', '#8B4513']}
                              style={[styles.aiConfidenceBarFill, { width: `${(detection.confidence * 100).toFixed(1)}%` }]}
                            />
                          </View>
                          <Text style={styles.aiConfidenceText}>
                            {(detection.confidence * 100).toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Processing Time */}
              {selectedAiFile.processing_time ? (
                <View style={styles.aiFooter}>
                  <Ionicons name="time" size={16} color="#D4AC0D" />
                  <Text style={styles.aiFooterText}>Processed in {selectedAiFile.processing_time}s</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
              <Ionicons name="menu" size={28} color="#D4AC0D" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => setShowStatsModal(true)} style={styles.headerButton}>
                <Ionicons name="stats-chart" size={24} color="#D4AC0D" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
                <Ionicons name="refresh" size={28} color="#D4AC0D" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerTitle}>📊 Noise Reports</Text>
          <Text style={styles.headerSubtitle}>
            {filteredReports.length} {selectedFilter !== 'All' ? selectedFilter : ''} report{filteredReports.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={styles.filterContent}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterPill, selectedFilter === filter && styles.filterPillActive]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterPillText, selectedFilter === filter && styles.filterPillTextActive]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#CCC" />
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySubtext}>
            {selectedFilter !== 'All' ? `No ${selectedFilter} reports available` : 'Reports will appear here when submitted'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.reportsList}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} tintColor="#8B4513" />}
        >
          {filteredReports.map((report) => (
            <TouchableOpacity
              key={report._id}
              style={styles.reportCard}
              onPress={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
              activeOpacity={0.7}
            >
              <View style={styles.reportHeader}>
                <View style={styles.reportHeaderLeft}>
                  <Text style={styles.reportIcon}>{getReasonIcon(report.topDetection || report.reason)}</Text>
                  <View style={styles.reportHeaderText}>
                    <Text style={styles.reportReason}>{report.topDetection || report.reason || 'Noise Report'}</Text>
                    <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.reportHeaderRight}>
                  {report.hasAiResults && (
                    <View style={styles.aiIndicator}>
                      <Ionicons name="sparkles" size={16} color="#D4AC0D" />
                    </View>
                  )}
                  {report.attachments && report.attachments.length > 1 && (
                    <View style={styles.multiFileIndicator}>
                      <Text style={styles.multiFileText}>{report.attachments.length}</Text>
                    </View>
                  )}
                  {report.reportableCount > 0 && (
                    <View style={styles.reportableIndicator}>
                      <Ionicons name="alert" size={12} color="#FFF" />
                      <Text style={styles.reportableIndicatorText}>{report.reportableCount}</Text>
                    </View>
                  )}
                  {report.noiseLevel && (
                    <View style={[styles.noiseLevelBadge, { backgroundColor: getNoiseLevelBg(report.noiseLevel) }]}>
                      <View style={[styles.noiseLevelDot, { backgroundColor: getNoiseLevelColor(report.noiseLevel) }]} />
                      <Text style={[styles.noiseLevelText, { color: getNoiseLevelColor(report.noiseLevel) }]}>
                        {getNoiseLevelLabel(report.noiseLevel)}
                      </Text>
                    </View>
                  )}
                  <Ionicons name={expandedReport === report._id ? "chevron-up" : "chevron-down"} size={24} color="#8B4513" />
                </View>
              </View>

              {/* AI Summary Preview */}
              {report.aiSummary && (report.aiSummary.topDetection || report.topDetection) && (
                <TouchableOpacity 
                  style={styles.aiSummaryPreview}
                  onPress={() => openAiModal(report.aiResults, 0, report)}
                >
                  <LinearGradient colors={['rgba(212,172,13,0.1)', 'rgba(139,69,19,0.05)']} style={styles.aiSummaryGradient}>
                    <Ionicons name="analytics" size={16} color="#D4AC0D" />
                    <Text style={styles.aiSummaryText} numberOfLines={1}>
                      AI: {report.topDetection} • {report.averageDecibel || '?'}dB • {report.fileCount} file(s)
                      {report.reportableCount > 0 ? ` • ⚠️ ${report.reportableCount} reportable` : ''}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#D4AC0D" />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {expandedReport === report._id && (
                <View style={styles.reportDetails}>
                  <View style={styles.statusSection}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status || 'pending') }]}>
                      <Ionicons name="flag" size={16} color="#FFF" />
                      <Text style={styles.statusText}>{getStatusLabel(report.status || 'pending')}</Text>
                    </View>
                    {report.consecutiveDays > 1 && (
                      <View style={styles.consecutiveDaysBadge}>
                        <Ionicons name="calendar" size={16} color={report.noiseLevel === 'critical' ? '#8B0000' : '#F44336'} />
                        <Text style={[styles.consecutiveDaysText, report.noiseLevel === 'critical' ? { color: '#8B0000' } : null]}>
                          {report.consecutiveDays} consecutive days
                        </Text>
                      </View>
                    )}
                    {report.noiseLevel === 'critical' && (
                      <View style={styles.criticalBadge}>
                        <Ionicons name="alert" size={16} color="#FFF" />
                        <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                      </View>
                    )}
                  </View>

                  {/* Full AI Results */}
                  {report.aiResults && report.aiResults.length > 0 ? (
                    <View style={styles.aiFullResults}>
                      <View style={styles.aiFullHeader}>
                        <Ionicons name="sparkles" size={20} color="#8B4513" />
                        <Text style={styles.aiFullTitle}>AI Analysis Results ({report.aiResults.length} file{report.aiResults.length !== 1 ? 's' : ''})</Text>
                        {report.reportableCount > 0 && (
                          <View style={styles.reportableSummary}>
                            <Text style={styles.reportableSummaryText}>
                              {report.reportableCount} reportable • {report.severeCount} severe
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {report.aiResults.map((aiResult, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[styles.aiFileResult, aiResult.is_reportable && styles.aiFileResultReportable]}
                          onPress={() => openAiModal(report.aiResults, index, report)}
                        >
                          <View style={styles.aiFileHeader}>
                            <Ionicons 
                              name={aiResult.type === 'video' ? 'videocam' : 'musical-notes'} 
                              size={16} 
                              color={aiResult.is_reportable ? '#F44336' : '#8B4513'} 
                            />
                            <Text style={styles.aiFileName}>{aiResult.fileName || `File ${index + 1}`}</Text>
                            <View style={[styles.sourceBadgeSmall, aiResult.source === 'live' ? styles.liveBadgeSmall : styles.downloadedBadgeSmall]}>
                              <Ionicons name={aiResult.source === 'live' ? "mic" : "download"} size={10} color="#fff" />
                              <Text style={styles.sourceBadgeTextSmall}>{aiResult.source === 'live' ? 'Live' : 'Downloaded'}</Text>
                            </View>
                            {aiResult.is_reportable && (
                              <View style={styles.reportableFileBadge}>
                                <Ionicons name="alert" size={10} color="#F44336" />
                                <Text style={styles.reportableFileText}>
                                  {aiResult.severity_name === 'CRITICAL' ? 'CRITICAL' : 'Reportable'}
                                </Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.aiFileMetrics}>
                            <View style={styles.aiFileMetric}>
                              <Text style={styles.aiFileMetricLabel}>dB</Text>
                              <Text style={styles.aiFileMetricValue}>{aiResult.decibel || 0}</Text>
                            </View>
                            <View style={styles.aiFileMetric}>
                              <Text style={styles.aiFileMetricLabel}>Distance</Text>
                              <Text style={styles.aiFileMetricValue}>~{aiResult.distance?.meters || 0}m</Text>
                            </View>
                            <View style={styles.aiFileMetric}>
                              <Text style={styles.aiFileMetricLabel}>Top Sound</Text>
                              <Text style={styles.aiFileMetricValue} numberOfLines={1}>
                                {aiResult.detections?.[0]?.class?.substring(0, 12) || 'N/A'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  <TouchableOpacity 
                    style={[
                      styles.autoResponseSection,
                      (!report.status || report.status === 'pending') ? styles.autoResponsePending : null,
                      report.noiseLevel === 'critical' ? styles.autoResponseCritical : null
                    ]}
                    onPress={() => openStatusModal(report)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.autoResponseHeader}>
                      <Ionicons 
                        name={(!report.status || report.status === 'pending') ? "alert-circle" : "information-circle"} 
                        size={20} 
                        color={report.noiseLevel === 'critical' ? "#8B0000" : (!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} 
                      />
                      <Text style={[
                        styles.autoResponseTitle,
                        (!report.status || report.status === 'pending') ? styles.autoResponseTitlePending : null,
                        report.noiseLevel === 'critical' ? styles.autoResponseTitleCritical : null
                      ]}>
                        {(!report.status || report.status === 'pending') ? 'No Response Sent' : 'System Response'}
                      </Text>
                      <Ionicons name="create-outline" size={20} color={report.noiseLevel === 'critical' ? "#8B0000" : (!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} style={{ marginLeft: 'auto' }} />
                    </View>
                    <View style={styles.autoResponseContent}>
                      <Text style={[
                        styles.autoResponseText,
                        (!report.status || report.status === 'pending') ? styles.autoResponseTextPending : null
                      ]}>
                        {getCurrentResponse(report)}
                      </Text>
                    </View>
                    <View style={styles.tapHint}>
                      <Text style={[
                        styles.tapHintText,
                        (!report.status || report.status === 'pending') ? styles.tapHintTextPending : null
                      ]}>
                        {(!report.status || report.status === 'pending') ? 'Tap to select and send response' : 'Tap to change response & status'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {report.comment && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="chatbox-outline" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Details</Text>
                      </View>
                      <Text style={styles.detailText}>{report.comment}</Text>
                    </View>
                  )}

                  {report.location && (report.location.latitude || report.location_latitude) && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="location" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Location</Text>
                      </View>
                      <Text style={styles.detailText}>
                        Lat: {report.location.latitude?.toFixed(6) || report.location_latitude?.toFixed(6)}, 
                        Lon: {report.location.longitude?.toFixed(6) || report.location_longitude?.toFixed(6)}
                      </Text>
                      {report.location.address?.street && (
                        <Text style={styles.detailSubtext}>
                          {report.location.address.street}
                          {report.location.address.city ? `, ${report.location.address.city}` : ''}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Multiple Attachments */}
                  {report.attachments && report.attachments.length > 0 && (
                    <View style={styles.attachmentsSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="attach" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Attachments ({report.attachments.length})</Text>
                      </View>
                      
                      {report.attachments.map((att, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          style={styles.attachmentItem}
                          onPress={() => {
                            setSelectedAttachment(att);
                            setAttachmentModalVisible(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name={att.type === 'video' ? 'videocam' : 'musical-notes'} 
                            size={20} 
                            color="#8B4513" 
                          />
                          <Text style={styles.attachmentName} numberOfLines={1}>
                            {att.fileName || `${att.type} ${idx + 1}`}
                          </Text>
                          <View style={styles.attachmentSource}>
                            <View style={[styles.sourceBadge, att.source === 'live' ? styles.liveBadge : styles.downloadedBadge]}>
                              <Ionicons name={att.source === 'live' ? "mic" : "download"} size={10} color="#fff" />
                              <Text style={styles.sourceBadgeText}>{att.source === 'live' ? 'Live' : 'Downloaded'}</Text>
                            </View>
                          </View>
                          {att.type === 'audio' && (
                            <TouchableOpacity 
                              style={styles.playSmallBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                playAttachmentAudio(att.url, `${report._id}-${idx}`);
                              }}
                            >
                              <Ionicons 
                                name={playingAttachmentId === `${report._id}-${idx}` ? "pause" : "play"} 
                                size={18} 
                                color="#8B4513" 
                              />
                            </TouchableOpacity>
                          )}
                          <Ionicons name="eye-outline" size={18} color="#8B4513" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.timestampText}>
                      {new Date(report.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusModalContainer}>
            <View style={styles.statusModalHeader}>
              <Text style={styles.statusModalTitle}>Update Report Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.statusModalContent} showsVerticalScrollIndicator={false}>
              {selectedReport ? getAvailableResponses(selectedReport).map((response) => (
                <TouchableOpacity
                  key={response.status}
                  style={[styles.statusOption, selectedStatus === response.status ? styles.statusOptionSelected : null]}
                  onPress={() => setSelectedStatus(response.status)}
                  activeOpacity={0.7}
                >
                  <View style={styles.statusOptionHeader}>
                    <View style={styles.statusOptionLeft}>
                      <View style={[styles.statusOptionRadio, selectedStatus === response.status ? styles.statusOptionRadioSelected : null]}>
                        {selectedStatus === response.status ? <View style={styles.statusOptionRadioInner} /> : null}
                      </View>
                      <Ionicons name={response.icon} size={24} color={response.status === 'action_required' ? '#F44336' : getStatusColor(response.status)} />
                      <Text style={[styles.statusOptionLabel, { color: response.status === 'action_required' ? '#F44336' : getStatusColor(response.status) }]}>
                        {response.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusOptionTextContainer}>
                    <Text style={styles.statusOptionText}>{response.text}</Text>
                  </View>
                </TouchableOpacity>
              )) : null}
            </ScrollView>

            <View style={styles.statusModalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setStatusModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, updatingStatus ? styles.saveButtonDisabled : null]}
                onPress={updateReportStatus}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Results Modal */}
      {renderAiModal()}
      
      {/* Attachment Modal */}
      {renderAttachmentModal()}

      {/* Stats Modal */}
      {renderStatsModal()}

      {/* Drawer Modal */}
      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { marginTop: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
  filterContainer: { backgroundColor: '#FFF', paddingVertical: 8, maxHeight: 48 },
  filterContent: { paddingHorizontal: 15, gap: 8 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#F0F0F0', borderRadius: 16 },
  filterPillActive: { backgroundColor: '#8B4513' },
  filterPillText: { fontSize: 13, color: '#333', fontWeight: '500' },
  filterPillTextActive: { color: '#FFF', fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#8B4513' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#999', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: '#BBB', textAlign: 'center', marginTop: 8 },
  reportsList: { flex: 1 },
  reportCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 16, elevation: 2 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reportHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportIcon: { fontSize: 32, marginRight: 12 },
  reportHeaderText: { flex: 1 },
  reportReason: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  reportDate: { fontSize: 12, color: '#999', marginTop: 2 },
  noiseLevelBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
  noiseLevelDot: { width: 8, height: 8, borderRadius: 4 },
  noiseLevelText: { fontSize: 11, fontWeight: 'bold' },
  aiIndicator: { backgroundColor: 'rgba(212,172,13,0.1)', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D4AC0D' },
  multiFileIndicator: { backgroundColor: '#8B4513', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  multiFileText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  reportableIndicator: { backgroundColor: '#F44336', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, gap: 3 },
  reportableIndicatorText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  criticalBadge: { backgroundColor: '#8B0000', flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
  criticalBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  
  aiSummaryPreview: { marginTop: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D4AC0D' },
  aiSummaryGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
  aiSummaryText: { flex: 1, color: '#8B4513', fontSize: 13, fontWeight: '500' },

  reportDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  statusSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
  statusText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
  consecutiveDaysBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFEBEE', gap: 6 },
  consecutiveDaysText: { fontSize: 12, fontWeight: 'bold', color: '#F44336' },

  aiFullResults: { marginBottom: 16, backgroundColor: '#FAF5EB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D4AC0D' },
  aiFullHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  aiFullTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513', flex: 1 },
  reportableSummary: { backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  reportableSummaryText: { fontSize: 10, color: '#F44336', fontWeight: 'bold' },
  aiFileResult: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  aiFileResultReportable: { backgroundColor: '#FFF5F5', borderColor: '#FFCDD2' },
  aiFileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  aiFileName: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },
  reportableFileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 3 },
  reportableFileText: { fontSize: 9, color: '#F44336', fontWeight: 'bold' },
  aiFileMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
  aiFileMetric: { alignItems: 'center' },
  aiFileMetricLabel: { fontSize: 10, color: '#999' },
  aiFileMetricValue: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },

  autoResponseSection: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2196F3', borderWidth: 2, borderColor: '#2196F3' },
  autoResponsePending: { backgroundColor: '#FFF3E0', borderLeftColor: '#F57C00', borderColor: '#F57C00' },
  autoResponseCritical: { backgroundColor: '#FFEBEE', borderLeftColor: '#8B0000', borderColor: '#8B0000' },
  autoResponseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  autoResponseTitle: { fontSize: 16, fontWeight: '700', color: '#1976D2', marginLeft: 8 },
  autoResponseTitlePending: { color: '#F57C00' },
  autoResponseTitleCritical: { color: '#8B0000' },
  autoResponseContent: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8 },
  autoResponseText: { fontSize: 14, color: '#333', lineHeight: 20 },
  autoResponseTextPending: { fontStyle: 'italic', color: '#666' },
  tapHint: { alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BBDEFB' },
  tapHintText: { fontSize: 12, color: '#1976D2', fontWeight: '600', fontStyle: 'italic' },
  tapHintTextPending: { color: '#F57C00' },

  detailSection: { marginBottom: 12 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailLabel: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },
  detailText: { fontSize: 14, color: '#555', lineHeight: 20 },
  detailSubtext: { fontSize: 12, color: '#777', marginTop: 4 },

  attachmentsSection: { marginBottom: 12 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 10, borderRadius: 8, marginBottom: 6, gap: 10 },
  attachmentName: { flex: 1, fontSize: 13, color: '#555' },
  attachmentSource: { marginRight: 4 },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 },
  liveBadge: { backgroundColor: '#4CAF50' },
  downloadedBadge: { backgroundColor: '#2196F3' },
  sourceBadgeText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  playSmallBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,172,13,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AC0D' },
  sourceBadgeSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 },
  liveBadgeSmall: { backgroundColor: '#4CAF50' },
  downloadedBadgeSmall: { backgroundColor: '#2196F3' },
  sourceBadgeTextSmall: { fontSize: 9, color: '#fff', fontWeight: '600' },
  sourceBadgeLarge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 8, alignSelf: 'flex-start', marginTop: 8 },
  liveBadgeLarge: { backgroundColor: '#4CAF50' },
  downloadedBadgeLarge: { backgroundColor: '#2196F3' },
  sourceBadgeTextLarge: { fontSize: 12, color: '#fff', fontWeight: '600' },

  timestampText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },

  statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  statusModalContainer: { backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80%', elevation: 5 },
  statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  statusModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statusModalContent: { padding: 20, maxHeight: 400 },
  statusOption: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E0E0E0' },
  statusOptionSelected: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  statusOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusOptionRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  statusOptionRadioSelected: { borderColor: '#4CAF50' },
  statusOptionRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
  statusOptionLabel: { fontSize: 16, fontWeight: 'bold' },
  statusOptionTextContainer: { backgroundColor: '#FFF', borderRadius: 8, padding: 12 },
  statusOptionText: { fontSize: 14, color: '#555', lineHeight: 20 },
  statusModalFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveButtonDisabled: { backgroundColor: '#CCC' },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },

  aiModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  aiModalContainer: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', overflow: 'hidden' },
  aiModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  aiModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4AC0D' },
  aiModalClose: { padding: 4 },
  aiModalContent: { padding: 20 },
  aiFileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  
  reportableAlert: { marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
  reportableGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  reportableContent: { flex: 1 },
  reportableTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  reportableText: { color: '#FFF', fontSize: 12, opacity: 0.9 },
  
  aiMetricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  aiMetricCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
  aiMetricValue: { color: '#D4AC0D', fontSize: 18, fontWeight: 'bold' },
  aiMetricLabel: { color: '#FFF', fontSize: 10, opacity: 0.8 },
  
  aiDistanceSection: { backgroundColor: '#FAF5EB', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#D4AC0D' },
  aiDistanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiDistanceTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
  aiDistanceContent: { gap: 4 },
  aiDistanceCategory: { fontSize: 18, fontWeight: 'bold', color: '#8B4513' },
  aiDistanceMeters: { fontSize: 14, color: '#333' },
  aiDistanceReference: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },
  aiDistanceDescription: { fontSize: 12, color: '#666', marginTop: 4 },
  
  aiReasonsSection: { backgroundColor: '#FFEBEE', borderRadius: 12, padding: 16, marginBottom: 20 },
  aiReasonsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiReasonsTitle: { fontSize: 16, fontWeight: 'bold', color: '#F44336' },
  aiReasonItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiReasonText: { fontSize: 13, color: '#666', flex: 1 },
  
  aiDetectionsSection: { marginBottom: 20 },
  aiDetectionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiDetectionsTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
  aiDetectionItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  aiDetectionRank: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  aiDetectionRankText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  aiDetectionContent: { flex: 1 },
  aiDetectionClass: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 4 },
  aiDetectionConfidenceBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiConfidenceBarBg: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  aiConfidenceBarFill: { height: '100%', borderRadius: 3 },
  aiConfidenceText: { fontSize: 12, fontWeight: '600', color: '#8B4513', width: 45 },
  
  aiFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  aiFooterText: { fontSize: 12, color: '#666' },

  attachmentModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  attachmentModalContainer: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90%', overflow: 'hidden' },
  attachmentModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  attachmentModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4AC0D' },
  attachmentModalClose: { padding: 4 },
  attachmentModalContent: { padding: 20 },
  attachmentVideo: { width: '100%', height: 300, backgroundColor: '#000', borderRadius: 12 },
  attachmentAudioContainer: { alignItems: 'center', padding: 30 },
  attachmentAudioName: { fontSize: 16, fontWeight: '500', color: '#333', marginTop: 16, marginBottom: 20 },
  attachmentAudioPlayBtn: { marginTop: 10 },
  attachmentAudioPlayGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, gap: 12 },
  attachmentAudioPlayText: { color: '#D4AC0D', fontSize: 16, fontWeight: 'bold' },
  attachmentInfo: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  attachmentInfoLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  attachmentInfoValue: { fontSize: 14, color: '#333', marginBottom: 8 },
  
  statsModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  statsModalContainer: { backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden' },
  statsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  statsModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4AC0D' },
  statsModalClose: { padding: 4 },
  statsModalContent: { padding: 20 },
  statCard: { backgroundColor: '#FAF5EB', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  statNumber: { fontSize: 36, fontWeight: 'bold', color: '#8B4513' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 5 },
  statSection: { marginTop: 10 },
  statSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B4513', marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  statDot: { width: 12, height: 12, borderRadius: 6 },
  statRowLabel: { fontSize: 14, color: '#666', width: 70 },
  statRowValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  modalContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
});