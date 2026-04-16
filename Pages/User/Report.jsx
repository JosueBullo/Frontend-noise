
 

// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//   Dimensions, Platform, ScrollView, Alert, TextInput, ActivityIndicator,
//   Share, SafeAreaView, FlatList
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio } from 'expo-av';
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
// import * as Location from 'expo-location';
// import axios from 'axios';
// import API_BASE_URL from '../../utils/api';
// import CustomDrawer from '../CustomDrawer';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';
// import MapView, { Marker } from 'react-native-maps';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// export default function AudioRecordingScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [recordingDuration, setRecordingDuration] = useState(0);
//   const [recording, setRecording] = useState(null);
//   const [mediaFiles, setMediaFiles] = useState([]);
//   const [comment, setComment] = useState('');
//   const [location, setLocation] = useState(null);
//   const [locationLoading, setLocationLoading] = useState(false);
//   const [locationError, setLocationError] = useState(null);
//   const [showManualLocationModal, setShowManualLocationModal] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [activeTab, setActiveTab] = useState('analysis');
//   const [disturbanceAlerts, setDisturbanceAlerts] = useState([]);
//   const [analyzingFileId, setAnalyzingFileId] = useState(null);
//   const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
//   const [selectedMapLocation, setSelectedMapLocation] = useState(null);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchResults, setSearchResults] = useState([]);
//   const [isSearching, setIsSearching] = useState(false);
//   const [playingFileId, setPlayingFileId] = useState(null);
//   const [playbackPositionMap, setPlaybackPositionMap] = useState({});
//   const [durationMap, setDurationMap] = useState({});

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const recordingInterval = useRef(null);
//   const mapRef = useRef(null);
//   const soundRef = useRef(null);

//   const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';

//   useEffect(() => {
//     (async () => {
//       try {
//         await Audio.requestPermissionsAsync();
//         await ImagePicker.requestCameraPermissionsAsync();
//         await Audio.setAudioModeAsync({
//           allowsRecordingIOS: true,
//           playsInSilentModeIOS: true,
//           staysActiveInBackground: false,
//           shouldDuckAndroid: true,
//           playThroughEarpieceAndroid: false,
//         });
//       } catch (error) {
//         console.error('Error setting up audio:', error);
//       }
//     })();
    
//     return () => {
//       if (recording) {
//         recording.stopAndUnloadAsync();
//       }
//       if (soundRef.current) {
//         soundRef.current.unloadAsync();
//       }
//       if (recordingInterval.current) {
//         clearInterval(recordingInterval.current);
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (isRecording) {
//       Animated.loop(
//         Animated.sequence([
//           Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
//           Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
//         ])
//       ).start();
//     } else {
//       pulseAnim.setValue(1);
//     }
//   }, [isRecording]);

//   const formatTime = (seconds) => {
//     if (!seconds || isNaN(seconds)) return '0:00';
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   // ==================== MEDIA MANAGEMENT FUNCTIONS ====================
//   const startRecording = async () => {
//     try {
//       if (recording) {
//         await recording.stopAndUnloadAsync();
//         setRecording(null);
//       }
      
//       const { recording: newRecording } = await Audio.Recording.createAsync({
//         android: { 
//           extension: '.m4a', 
//           outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4, 
//           audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC, 
//           sampleRate: 16000, 
//           numberOfChannels: 1, 
//           bitRate: 128000 
//         },
//         ios: { 
//           extension: '.m4a', 
//           outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC, 
//           audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM, 
//           sampleRate: 16000, 
//           numberOfChannels: 1, 
//           bitRate: 128000, 
//           linearPCMBitDepth: 16, 
//           linearPCMIsBigEndian: false, 
//           linearPCMIsFloat: false 
//         },
//       });
      
//       const fileId = Date.now().toString();
//       const newFile = {
//         id: fileId,
//         uri: null,
//         fileName: 'New Recording',
//         type: 'audio',
//         isRecording: true,
//         recording: newRecording,
//         duration: 0,
//         aiResults: null,
//         isAnalyzing: false,
//         mediaSource: 'live',
//         totalDuration: 0
//       };
      
//       setMediaFiles(prev => [...prev, newFile]);
//       setRecording(newRecording);
//       setIsRecording(true);
//       setRecordingDuration(0);
//       setAnalyzingFileId(fileId);
//       setIsMediaModalVisible(false);
      
//       if (recordingInterval.current) {
//         clearInterval(recordingInterval.current);
//       }
      
//       recordingInterval.current = setInterval(() => {
//         setRecordingDuration(prev => prev + 1);
//         setMediaFiles(prev => prev.map(f => 
//           f.id === fileId ? { ...f, duration: f.duration + 1 } : f
//         ));
//       }, 1000);
      
//     } catch (err) {
//       console.error('Start recording error:', err);
//       Alert.alert('Error', 'Failed to start recording.');
//     }
//   };

//   const stopRecording = async () => {
//     if (!recording) return;
    
//     try {
//       await recording.stopAndUnloadAsync();
//       const uri = recording.getURI();
      
//       setMediaFiles(prev => prev.map(f => 
//         f.id === analyzingFileId ? { 
//           ...f, 
//           uri: uri,
//           isRecording: false,
//           recording: null,
//           totalDuration: recordingDuration
//         } : f
//       ));
      
//       setIsRecording(false);
//       setRecording(null);
//       clearInterval(recordingInterval.current);
//       recordingInterval.current = null;
      
//       if (uri) {
//         setTimeout(() => {
//           analyzeMediaFile(analyzingFileId, uri, 'audio');
//         }, 500);
//       }
//     } catch (err) {
//       console.error('Stop recording error:', err);
//       Alert.alert('Error', 'Failed to stop recording.');
//     }
//   };

//   const pickAudioFiles = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['audio/*'],
//         copyToCacheDirectory: true,
//         multiple: true,
//       });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const newFiles = [];
        
//         for (const asset of result.assets) {
//           const fileUri = asset.uri;
//           const fileName = asset.name;
//           const fileId = Date.now().toString() + Math.random();
          
//           let duration = 0;
//           try {
//             const { sound: tempSound } = await Audio.Sound.createAsync({ uri: fileUri });
//             const status = await tempSound.getStatusAsync();
//             duration = Math.floor(status.durationMillis / 1000);
//             await tempSound.unloadAsync();
//           } catch (e) {
//             console.error('Error getting duration:', e);
//           }
          
//           newFiles.push({
//             id: fileId,
//             uri: fileUri,
//             fileName: fileName,
//             type: 'audio',
//             isRecording: false,
//             duration: 0,
//             totalDuration: duration,
//             aiResults: null,
//             isAnalyzing: true,
//             mediaSource: 'downloaded'
//           });
//         }
        
//         setMediaFiles(prev => [...prev, ...newFiles]);
        
//         for (const file of newFiles) {
//           setAnalyzingFileId(file.id);
//           await analyzeMediaFile(file.id, file.uri, 'audio');
//         }
//       }
//     } catch (error) {
//       console.error('Error picking audio files:', error);
//       Alert.alert('Error', 'Failed to pick audio files');
//     }
//   };

//   const recordVideo = async () => {
//     try {
//       const result = await ImagePicker.launchCameraAsync({
//         mediaTypes: ImagePicker.MediaType.VIDEO,
//         allowsEditing: true,
//         aspect: [16, 9],
//         quality: 1,
//         videoMaxDuration: 60
//       });
      
//       if (!result.canceled && result.assets && result.assets[0]) {
//         const videoUri = result.assets[0].uri;
//         const fileId = Date.now().toString();
        
//         const newFile = {
//           id: fileId,
//           uri: videoUri,
//           fileName: `Video_${new Date().toISOString().slice(0, 19)}`,
//           type: 'video',
//           isRecording: false,
//           duration: 0,
//           aiResults: null,
//           isAnalyzing: true,
//           mediaSource: 'live'
//         };
        
//         setMediaFiles(prev => [...prev, newFile]);
//         setAnalyzingFileId(fileId);
//         setIsMediaModalVisible(false);
//         await analyzeMediaFile(fileId, videoUri, 'video');
//       }
//     } catch (error) {
//       console.error('Error recording video:', error);
//       Alert.alert('Error', 'Failed to record video');
//     }
//   };

//   const pickVideoFromGallery = async () => {
//     try {
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaType.VIDEO,
//         allowsEditing: true,
//         quality: 1,
//         allowsMultipleSelection: false,
//       });
      
//       if (!result.canceled && result.assets && result.assets[0]) {
//         const videoUri = result.assets[0].uri;
//         const fileName = result.assets[0].fileName || `video_${Date.now()}.mp4`;
//         const fileId = Date.now().toString() + Math.random();
        
//         const newFile = {
//           id: fileId,
//           uri: videoUri,
//           fileName: fileName,
//           type: 'video',
//           isRecording: false,
//           duration: 0,
//           aiResults: null,
//           isAnalyzing: true,
//           mediaSource: 'downloaded'
//         };
        
//         setMediaFiles(prev => [...prev, newFile]);
//         setAnalyzingFileId(fileId);
//         await analyzeMediaFile(fileId, videoUri, 'video');
//       }
//     } catch (error) {
//       console.error('Error picking videos from gallery:', error);
//       Alert.alert('Error', 'Failed to pick videos from gallery');
//     }
//   };

//   const pickVideoFiles = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['video/*'],
//         copyToCacheDirectory: true,
//         multiple: true,
//       });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const newFiles = [];
        
//         for (const asset of result.assets) {
//           const fileUri = asset.uri;
//           const fileName = asset.name;
//           const fileId = Date.now().toString() + Math.random();
          
//           newFiles.push({
//             id: fileId,
//             uri: fileUri,
//             fileName: fileName,
//             type: 'video',
//             isRecording: false,
//             duration: 0,
//             aiResults: null,
//             isAnalyzing: true,
//             mediaSource: 'downloaded'
//           });
//         }
        
//         setMediaFiles(prev => [...prev, ...newFiles]);
        
//         for (const file of newFiles) {
//           setAnalyzingFileId(file.id);
//           await analyzeMediaFile(file.id, file.uri, 'video');
//         }
//       }
//     } catch (error) {
//       console.error('Error picking video files:', error);
//       Alert.alert('Error', 'Failed to pick video files');
//     }
//   };

//   const analyzeMediaFile = async (fileId, mediaUri, mediaType) => {
//     try {
//       const formData = new FormData();
//       const fileName = mediaUri.split('/').pop() || 'recording';
//       const fileExt = fileName.split('.').pop().toLowerCase();
//       const fileType = mediaType === 'video' ? `video/${fileExt}` : `audio/${fileExt}`;
      
//       formData.append('audio', {
//         uri: mediaUri,
//         type: fileType,
//         name: fileName,
//       });
      
//       formData.append('mime_type', fileType);
//       formData.append('filename', fileName);
      
//       const controller = new AbortController();
//       const timeoutId = setTimeout(() => controller.abort(), 120000);
      
//       const response = await fetch(`${AI_SERVICE_URL}/api/ai/analyze`, {
//         method: 'POST',
//         headers: {
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//         body: formData,
//         signal: controller.signal,
//       });
      
//       clearTimeout(timeoutId);
      
//       if (!response.ok) {
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.success) {
//         setMediaFiles(prev => prev.map(f => 
//           f.id === fileId ? { ...f, aiResults: data, isAnalyzing: false } : f
//         ));
        
//         if (data.is_reportable) {
//           setDisturbanceAlerts(prev => [...prev, {
//             fileId: fileId,
//             fileName: fileName,
//             disturbance: {
//               is_reportable: data.is_reportable,
//               severity_name: data.severity_name,
//               recommendation: data.recommendation,
//               reasons: data.reasons,
//               normalized_spl_db: data.normalized_spl_db
//             }
//           }]);
          
//           if (data.severity_name === 'SEVERE' || data.severity_name === 'CRITICAL') {
//             Alert.alert(
//               '🚨 URGENT: Noise Violation Detected!',
//               `${data.recommendation}\n\nReasons:\n${data.reasons?.map(r => `• ${r}`).join('\n')}\n\nVolume: ${data.decibel} dB`,
//               [
//                 { text: 'View Details', onPress: () => setActiveTab('analysis') },
//                 { text: 'Dismiss', style: 'cancel' }
//               ]
//             );
//           }
//         }
//       } else {
//         Alert.alert('Analysis Failed', data.error || 'Unknown error');
//         setMediaFiles(prev => prev.map(f => 
//           f.id === fileId ? { ...f, isAnalyzing: false, analysisError: data.error } : f
//         ));
//       }

//     } catch (error) {
//       console.error('❌ AI Analysis Error:', error);
      
//       let errorMessage = 'Failed to analyze media. ';
//       if (error.name === 'AbortError') {
//         errorMessage += 'Request timed out. Try a shorter file.';
//       } else {
//         errorMessage += error.message;
//       }
      
//       Alert.alert('AI Error', errorMessage);
//       setMediaFiles(prev => prev.map(f => 
//         f.id === fileId ? { ...f, isAnalyzing: false, analysisError: errorMessage } : f
//       ));
//     } finally {
//       if (analyzingFileId === fileId) {
//         setAnalyzingFileId(null);
//       }
//     }
//   };

//   const playMedia = async (fileId, uri) => {
//     try {
//       if (soundRef.current) {
//         await soundRef.current.unloadAsync();
//         setIsPlaying(false);
//         setPlayingFileId(null);
//       }
      
//       const { sound: newSound } = await Audio.Sound.createAsync(
//         { uri },
//         { shouldPlay: true }
//       );
      
//       soundRef.current = newSound;
      
//       const status = await newSound.getStatusAsync();
//       setDurationMap(prev => ({ ...prev, [fileId]: Math.floor(status.durationMillis / 1000) }));
//       setPlayingFileId(fileId);
//       setIsPlaying(true);
      
//       newSound.setOnPlaybackStatusUpdate((status) => {
//         if (status.isLoaded) {
//           setPlaybackPositionMap(prev => ({ 
//             ...prev, 
//             [fileId]: Math.floor(status.positionMillis / 1000) 
//           }));
          
//           if (status.didJustFinish) {
//             setIsPlaying(false);
//             setPlayingFileId(null);
//             newSound.unloadAsync();
//             soundRef.current = null;
//           }
//         }
//       });
      
//     } catch (error) {
//       console.error('Error playing media:', error);
//       Alert.alert('Playback Error', 'Failed to play this file. The format may not be supported.');
//     }
//   };

//   const removeMediaFile = (fileId) => {
//     Alert.alert('Remove File', 'Remove this file from the report?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Remove', 
//         style: 'destructive', 
//         onPress: () => {
//           if (playingFileId === fileId) {
//             if (soundRef.current) {
//               soundRef.current.unloadAsync();
//               soundRef.current = null;
//             }
//             setIsPlaying(false);
//             setPlayingFileId(null);
//           }
          
//           setMediaFiles(prev => prev.filter(f => f.id !== fileId));
//           setDisturbanceAlerts(prev => prev.filter(a => a.fileId !== fileId));
          
//           setPlaybackPositionMap(prev => {
//             const newMap = { ...prev };
//             delete newMap[fileId];
//             return newMap;
//           });
//           setDurationMap(prev => {
//             const newMap = { ...prev };
//             delete newMap[fileId];
//             return newMap;
//           });
//         }
//       },
//     ]);
//   };

//   const shareAnalysisReport = async (file) => {
//     if (!file.aiResults) return;
    
//     const reportText = `
// 🎤 Noise Analysis Report - ${file.fileName}
// ========================
// ${file.aiResults.is_reportable ? '⚠️ REPORTABLE NOISE DETECTED' : '✅ No Reportable Noise'}

// 📊 Sound: ${file.aiResults.classification?.class || 'Unknown'}
// 🔊 Volume: ${file.aiResults.decibel} dB
// 📍 Distance: ${file.aiResults.distance?.meters || '?'}m (${file.aiResults.distance?.category || 'Unknown'})
// ⏱️ Duration: ${file.aiResults.duration_seconds || 0}s

// ${file.aiResults.is_reportable ? `
// 🚨 VIOLATION DETAILS:
// Severity: ${file.aiResults.severity_name}
// Reasons: ${file.aiResults.reasons?.join(', ') || 'N/A'}
// Action: ${file.aiResults.recommendation}
// ` : ''}

// 🎧 Top Detections:
// ${file.aiResults.detections?.slice(0, 3).map((d, i) => `${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`).join('\n')}

// Generated by Barangay North Signal Noise Monitor
// ${new Date().toLocaleString()}
//     `;
    
//     try {
//       await Share.share({
//         message: reportText,
//         title: `Noise Analysis - ${file.fileName}`
//       });
//     } catch (error) {
//       console.error('Share failed:', error);
//     }
//   };

//   // ==================== LOCATION FUNCTIONS ====================
//   const getUserLocation = async () => {
//     setLocationLoading(true);
//     setLocationError(null);
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         setLocationError('Location permission denied');
//         Alert.alert('Permission Required', 'Please grant location access.');
//         setLocationLoading(false);
//         return;
//       }
//       const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
//       const address = await Location.reverseGeocodeAsync({ 
//         latitude: currentLocation.coords.latitude, 
//         longitude: currentLocation.coords.longitude 
//       });
      
//       const addressData = address[0] || {};
//       const cleanAddress = {
//         street: addressData.street || addressData.name || '',
//         city: addressData.city || addressData.subregion || '',
//         region: addressData.region || '',
//         country: addressData.country || '',
//         postalCode: addressData.postalCode || '',
//         name: addressData.name || ''
//       };
      
//       setLocation({ 
//         latitude: currentLocation.coords.latitude, 
//         longitude: currentLocation.coords.longitude, 
//         address: cleanAddress,
//         timestamp: new Date().toISOString(),
//         isManual: false
//       });
//       setLocationLoading(false);
      
//       const displayAddress = cleanAddress.street || 
//                             `${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`;
      
//       Alert.alert('✅ Location Added', `${displayAddress}`);
//     } catch (error) {
//       setLocationError('Failed to get location');
//       setLocationLoading(false);
//       Alert.alert('Error', 'Failed to get location.');
//     }
//   };

//   const searchLocation = async () => {
//     if (!searchQuery.trim()) {
//       Alert.alert('Search', 'Please enter a location to search');
//       return;
//     }
    
//     setIsSearching(true);
//     try {
//       const response = await fetch(
//         `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`,
//         {
//           method: 'GET',
//           headers: {
//             'Accept': 'application/json',
//           },
//         }
//       );
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const data = await response.json();
      
//       if (data.features && data.features.length > 0) {
//         const results = data.features.map(feature => ({
//           lat: feature.geometry.coordinates[1],
//           lon: feature.geometry.coordinates[0],
//           display_name: feature.properties.name || feature.properties.street || 
//                         `${feature.properties.city || ''} ${feature.properties.country || ''}`,
//           full_address: feature.properties.street ? 
//                         `${feature.properties.street}, ${feature.properties.city || ''}, ${feature.properties.country || ''}` :
//                         feature.properties.name || 'Selected location'
//         }));
//         setSearchResults(results);
//       } else {
//         setSearchResults([]);
//         Alert.alert('No Results', 'No locations found. Try a different search term.');
//       }
//     } catch (error) {
//       console.error('Search error:', error);
//       Alert.alert('Search Error', 'Failed to search location. Please try again or tap on the map directly.');
//       setSearchResults([]);
//     } finally {
//       setIsSearching(false);
//     }
//   };

//   const selectSearchResult = (result) => {
//     const lat = parseFloat(result.lat);
//     const lng = parseFloat(result.lon);
//     const locationName = result.display_name;
    
//     setSelectedMapLocation({ latitude: lat, longitude: lng });
//     setSearchQuery(locationName);
//     setSearchResults([]);
    
//     mapRef.current?.animateToRegion({
//       latitude: lat,
//       longitude: lng,
//       latitudeDelta: 0.01,
//       longitudeDelta: 0.01,
//     });
//   };

//   const openManualLocationPicker = () => {
//     setSelectedMapLocation(null);
//     setSearchQuery('');
//     setSearchResults([]);
//     setShowManualLocationModal(true);
//   };

//   const confirmManualLocation = async () => {
//     if (!selectedMapLocation) {
//       Alert.alert('No Location Selected', 'Please search or tap on the map to select a location');
//       return;
//     }
    
//     try {
//       const address = await Location.reverseGeocodeAsync({
//         latitude: selectedMapLocation.latitude,
//         longitude: selectedMapLocation.longitude
//       });
      
//       const addressData = address[0] || {};
//       const cleanAddress = {
//         street: addressData.street || addressData.name || 'Selected location',
//         city: addressData.city || addressData.subregion || addressData.district || '',
//         region: addressData.region || '',
//         country: addressData.country || '',
//         postalCode: addressData.postalCode || '',
//         name: addressData.name || ''
//       };
      
//       setLocation({
//         latitude: selectedMapLocation.latitude,
//         longitude: selectedMapLocation.longitude,
//         address: cleanAddress,
//         timestamp: new Date().toISOString(),
//         isManual: true
//       });
      
//       setShowManualLocationModal(false);
      
//       const displayAddress = cleanAddress.street || 
//                             `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`;
      
//       Alert.alert('✅ Location Added', displayAddress);
      
//     } catch (error) {
//       console.error('Error getting address:', error);
//       setLocation({
//         latitude: selectedMapLocation.latitude,
//         longitude: selectedMapLocation.longitude,
//         address: { street: 'Selected location', city: '', region: '', country: '' },
//         timestamp: new Date().toISOString(),
//         isManual: true
//       });
//       setShowManualLocationModal(false);
//       Alert.alert('✅ Location Added', `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`);
//     }
//   };

//   // ==================== SUBMIT FUNCTIONS ====================
//   const saveRecording = async () => {
//     if (mediaFiles.length === 0) {
//       Alert.alert('No Content', 'Please add audio or video files first.');
//       return;
//     }
    
//     const hasAnalysis = mediaFiles.some(f => f.aiResults);
//     if (!hasAnalysis) {
//       Alert.alert('Analysis Required', 'Please wait for AI analysis to complete on all files.');
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const userId = await AsyncStorage.getItem('userId');
      
//       if (!userId) {
//         Alert.alert('Authentication Error', 'Please log in again.');
//         setIsSubmitting(false);
//         return;
//       }

//       const analyzedFiles = mediaFiles.filter(f => f.aiResults);
//       let overallNoiseLevel = 'yellow';
      
//       if (analyzedFiles.length > 0) {
//         const hasCritical = analyzedFiles.some(f => 
//           f.aiResults?.severity_name === 'CRITICAL' || 
//           f.aiResults?.severity_name === 'SEVERE' ||
//           f.aiResults?.decibel > 85
//         );
//         const hasRed = analyzedFiles.some(f => 
//           f.aiResults?.is_reportable === true || 
//           f.aiResults?.decibel > 70
//         );
//         const hasYellow = analyzedFiles.some(f => f.aiResults?.decibel > 50);
        
//         if (hasCritical) {
//           overallNoiseLevel = 'critical';
//         } else if (hasRed) {
//           overallNoiseLevel = 'red';
//         } else if (hasYellow) {
//           overallNoiseLevel = 'yellow';
//         } else {
//           overallNoiseLevel = 'green';
//         }
//       }

//       const formData = new FormData();
//       formData.append('userId', userId);
//       formData.append('noiseLevel', overallNoiseLevel);
//       formData.append('comment', comment || '');
      
//       for (let i = 0; i < mediaFiles.length; i++) {
//         const file = mediaFiles[i];
//         const fileExtension = file.uri.split('.').pop();
//         const fileName = file.fileName || `file_${i + 1}.${fileExtension}`;
        
//         formData.append('media', {
//           uri: file.uri,
//           type: file.type === 'video' ? `video/${fileExtension}` : `audio/${fileExtension}`,
//           name: fileName,
//         });
        
//         formData.append(`media_${i}_type`, file.type);
//         formData.append(`media_${i}_fileName`, fileName);
//         formData.append(`media_${i}_source`, file.mediaSource || 'downloaded');
        
//         if (file.aiResults) {
//           let fileNoiseValue = 'yellow';
//           if (file.aiResults.is_destructive && file.aiResults.decibel > 70) {
//             fileNoiseValue = 'critical';
//           } else if (file.aiResults.is_reportable || file.aiResults.decibel > 70) {
//             fileNoiseValue = 'red';
//           } else if (file.aiResults.decibel > 50) {
//             fileNoiseValue = 'yellow';
//           } else {
//             fileNoiseValue = 'green';
//           }
          
//           formData.append(`media_${i}_ai_analysis`, JSON.stringify(file.aiResults));
//           formData.append(`media_${i}_ai_decibel`, file.aiResults.decibel?.toString() || '0');
//           formData.append(`media_${i}_ai_noise_level`, file.aiResults.noise_level?.level || 'Medium');
//           formData.append(`media_${i}_ai_noise_value`, fileNoiseValue);
//           formData.append(`media_${i}_ai_noise_description`, file.aiResults.noise_level?.description || '');
          
//           formData.append(`media_${i}_ai_is_reportable`, (file.aiResults.is_reportable || false).toString());
//           formData.append(`media_${i}_ai_severity`, file.aiResults.severity_name || 'NONE');
//           formData.append(`media_${i}_ai_recommendation`, file.aiResults.recommendation || '');
//           formData.append(`media_${i}_ai_reasons`, JSON.stringify(file.aiResults.reasons || []));
          
//           if (file.aiResults.detections && file.aiResults.detections.length > 0) {
//             formData.append(`media_${i}_ai_detections`, JSON.stringify(file.aiResults.detections));
//           }
          
//           if (file.aiResults.distance) {
//             formData.append(`media_${i}_ai_distance_meters`, file.aiResults.distance.meters?.toString() || '0');
//             formData.append(`media_${i}_ai_distance_category`, file.aiResults.distance.category || '');
//           }
//         }
        
//         formData.append(`media_${i}_duration`, file.totalDuration?.toString() || '0');
//       }
      
//       formData.append('total_files', mediaFiles.length.toString());
      
//       if (location) {
//         let locationAddress = '';
//         if (typeof location.address === 'object') {
//           const addr = location.address;
//           locationAddress = addr.street || addr.name || '';
//           if (addr.city) locationAddress += `, ${addr.city}`;
//           if (addr.region) locationAddress += `, ${addr.region}`;
//           if (addr.country) locationAddress += `, ${addr.country}`;
//         } else {
//           locationAddress = location.address || '';
//         }
        
//         formData.append('location', JSON.stringify({
//           latitude: location.latitude,
//           longitude: location.longitude,
//           address: locationAddress,
//           timestamp: location.timestamp,
//           isManual: location.isManual || false
//         }));
        
//         formData.append('location_latitude', location.latitude?.toString() || '');
//         formData.append('location_longitude', location.longitude?.toString() || '');
//         formData.append('location_address_street', locationAddress);
//         formData.append('location_address_city', location.address?.city || '');
//         formData.append('location_address_region', location.address?.region || '');
//         formData.append('location_address_country', location.address?.country || '');
//         formData.append('location_timestamp', location.timestamp || '');
//         formData.append('location_is_manual', (location.isManual || false).toString());
//       }
      
//       formData.append('app_version', Constants.expoConfig?.version || '1.0.0');
//       formData.append('platform', Platform.OS);
//       formData.append('platform_version', Platform.Version?.toString() || '');
//       formData.append('timestamp', new Date().toISOString());

//       const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 120000,
//       });

//       setIsSubmitting(false);

//       const reportableCount = mediaFiles.filter(f => f.aiResults?.is_reportable).length;
//       const severeCount = mediaFiles.filter(f => f.aiResults?.severity_name === 'CRITICAL' || f.aiResults?.severity_name === 'SEVERE').length;
      
//       const reportDetails = `✅ Report Submitted!\n\n` +
//         `📁 Files: ${mediaFiles.length}\n` +
//         `⚠️ Reportable: ${reportableCount}\n` +
//         `${severeCount > 0 ? `🚨 Severe: ${severeCount}\n` : ''}` +
//         `🔊 Noise Level: ${overallNoiseLevel.toUpperCase()}\n` +
//         `${location ? `📍 Location Added\n` : ''}`;

//       Alert.alert('✅ Report Submitted', reportDetails, [
//         { 
//           text: 'OK', 
//           onPress: () => {
//             setComment('');
//             setMediaFiles([]);
//             setLocation(null);
//             setLocationError(null);
//             setDisturbanceAlerts([]);
//             setActiveTab('analysis');
//           }
//         }
//       ]);

//     } catch (error) {
//       setIsSubmitting(false);
//       console.error('Error submitting report:', error);
      
//       let errorMessage = 'Failed to submit noise report. Please try again.';
//       if (error.response) {
//         console.error('Server response:', error.response.data);
//         errorMessage = error.response.data?.message || errorMessage;
//       } else if (error.request) {
//         errorMessage = 'Network error. Please check your internet connection.';
//       }
      
//       Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
//     }
//   };

//   const testAIService = async () => {
//     try {
//       setIsAnalyzing(true);
//       const response = await fetch(`${AI_SERVICE_URL}/api/ai/health`, {
//         headers: {
//           'ngrok-skip-browser-warning': 'true',
//           'User-Agent': 'ReactNativeApp/1.0',
//         },
//       });
      
//       const responseData = await response.json();
      
//       let message = `Main Backend: ✅ Online\n`;
      
//       if (responseData.flask_ai) {
//         if (responseData.flask_ai.status === 'healthy') {
//           message += `Flask AI: ✅ Healthy\n`;
//           message += `Model: ${responseData.flask_ai.model}\n`;
//           message += `YAMNet-Trans: ${responseData.flask_ai.yamnet_trans_loaded ? '✅' : '❌'}`;
//         } else {
//           message += `Flask AI: ❌ ${responseData.flask_ai.error || 'Unavailable'}`;
//         }
//       } else {
//         message += `Flask AI: ❌ Not connected`;
//       }
      
//       Alert.alert('Service Status', message, [{ text: 'OK' }]);
      
//     } catch (error) {
//       Alert.alert(
//         'Connection Failed', 
//         `Cannot connect to ${AI_SERVICE_URL}\n\nError: ${error.message}`,
//         [{ text: 'OK' }]
//       );
//     } finally {
//       setIsAnalyzing(false);
//     }
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

//   // ==================== RENDER FUNCTIONS ====================
//   const renderNoiseLevelCard = () => {
//     const analyzedFiles = mediaFiles.filter(f => f.aiResults);
//     if (analyzedFiles.length === 0) return null;
    
//     const hasCritical = analyzedFiles.some(f => 
//       f.aiResults?.severity_name === 'CRITICAL' || 
//       f.aiResults?.severity_name === 'SEVERE' ||
//       f.aiResults?.decibel > 85
//     );
//     const hasReportable = analyzedFiles.some(f => f.aiResults?.is_reportable);
//     const maxDecibel = Math.max(...analyzedFiles.map(f => f.aiResults?.decibel || 0));
    
//     let overallLevel = 'green';
//     let overallLabel = 'Low';
//     let overallDescription = 'Mild disturbance';
//     let overallEmoji = '😌';
//     let overallColor = '#4CAF50';
//     let overallBgColor = '#E8F5E9';
    
//     if (hasCritical || maxDecibel > 85) {
//       overallLevel = 'critical';
//       overallLabel = 'Critical';
//       overallDescription = 'Harmful noise level - Immediate action required';
//       overallEmoji = '🚨';
//       overallColor = '#E74C3C';
//       overallBgColor = '#FFEBEE';
//     } else if (hasReportable || maxDecibel > 70) {
//       overallLevel = 'red';
//       overallLabel = 'High';
//       overallDescription = 'Severe disturbance - Reportable';
//       overallEmoji = '😠';
//       overallColor = '#F44336';
//       overallBgColor = '#FFEBEE';
//     } else if (maxDecibel > 50) {
//       overallLevel = 'yellow';
//       overallLabel = 'Medium';
//       overallDescription = 'Moderate noise';
//       overallEmoji = '😐';
//       overallColor = '#FFC107';
//       overallBgColor = '#FFF9C4';
//     }
    
//     return (
//       <LinearGradient
//         colors={[overallBgColor, '#fff']}
//         style={s.noiseLevelCard}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//       >
//         <View style={s.noiseLevelHeader}>
//           <View style={[s.noiseLevelIconContainer, { backgroundColor: overallColor }]}>
//             <Ionicons name={overallLevel === 'critical' ? "alert" : overallLevel === 'red' ? "alert-circle" : overallLevel === 'yellow' ? "warning" : "checkmark-circle"} size={32} color="#fff" />
//           </View>
//           <View style={s.noiseLevelInfo}>
//             <Text style={s.noiseLevelLabel}>{overallLabel} Noise Level</Text>
//             <Text style={s.noiseLevelDesc}>{overallDescription}</Text>
//           </View>
//           <Text style={s.noiseLevelEmoji}>{overallEmoji}</Text>
//         </View>
        
//         <View style={s.noiseLevelMetrics}>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{maxDecibel} dB</Text>
//             <Text style={s.metricLabel}>Highest Volume</Text>
//           </View>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{analyzedFiles.length}</Text>
//             <Text style={s.metricLabel}>Files Analyzed</Text>
//           </View>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{hasReportable ? 'Yes' : 'No'}</Text>
//             <Text style={s.metricLabel}>Reportable</Text>
//           </View>
//         </View>
//       </LinearGradient>
//     );
//   };

//   const renderDetailedAnalysis = (item) => {
//     const isReportable = item.aiResults?.is_reportable;
//     const severity = item.aiResults?.severity_name;
//     const isPlayingThis = playingFileId === item.id;
//     const currentPos = playbackPositionMap[item.id] || 0;
//     const duration = durationMap[item.id] || item.totalDuration || 0;
    
//     if (!item.aiResults && !item.isAnalyzing) {
//       return (
//         <View style={s.analysisCard}>
//           <View style={s.analysisCardHeader}>
//             <View style={s.analysisFileIcon}>
//               <Ionicons name={item.type === 'video' ? 'videocam' : 'musical-notes'} size={24} color="#8B4513" />
//             </View>
//             <View style={s.analysisFileInfo}>
//               <Text style={s.analysisFileName}>{item.fileName || 'Unknown File'}</Text>
//               <View style={s.analysisFileMeta}>
//                 <View style={[s.sourceBadgeSmall, item.mediaSource === 'live' ? s.liveBadgeSmall : s.downloadedBadgeSmall]}>
//                   <Ionicons name={item.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                   <Text style={s.sourceBadgeTextSmall}>{item.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//                 </View>
//               </View>
//             </View>
//             <TouchableOpacity style={s.deleteButton} onPress={() => removeMediaFile(item.id)}>
//               <Ionicons name="close-circle" size={28} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
          
//           {item.isAnalyzing && (
//             <View style={s.analyzingContainer}>
//               <ActivityIndicator size="large" color="#D4AC0D" />
//               <Text style={s.analyzingText}>AI is analyzing this file...</Text>
//             </View>
//           )}
          
//           {item.analysisError && (
//             <View style={s.errorContainer}>
//               <Ionicons name="alert-circle" size={20} color="#E74C3C" />
//               <Text style={s.errorText}>{item.analysisError}</Text>
//             </View>
//           )}
//         </View>
//       );
//     }
    
//     return (
//       <View style={[s.analysisCard, isReportable && (severity === 'CRITICAL' || severity === 'SEVERE') && s.criticalCard]}>
//         <View style={s.analysisCardHeader}>
//           <View style={s.analysisFileIcon}>
//             <Ionicons name={item.type === 'video' ? 'videocam' : 'musical-notes'} size={24} color={isReportable ? '#E74C3C' : '#8B4513'} />
//           </View>
//           <View style={s.analysisFileInfo}>
//             <Text style={s.analysisFileName} numberOfLines={1}>{item.fileName || 'Recording'}</Text>
//             <View style={s.analysisFileMeta}>
//               <View style={[s.sourceBadgeSmall, item.mediaSource === 'live' ? s.liveBadgeSmall : s.downloadedBadgeSmall]}>
//                 <Ionicons name={item.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                 <Text style={s.sourceBadgeTextSmall}>{item.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//               </View>
//               {duration > 0 && (
//                 <View style={s.durationBadge}>
//                   <Ionicons name="time-outline" size={10} color="#666" />
//                   <Text style={s.durationText}>{formatTime(duration)}</Text>
//                 </View>
//               )}
//               {isReportable && (
//                 <View style={s.reportableBadgeSmall}>
//                   <Ionicons name="alert" size={12} color="#E74C3C" />
//                   <Text style={s.reportableTextSmall}>{severity || 'Reportable'}</Text>
//                 </View>
//               )}
//             </View>
//           </View>
//           <TouchableOpacity style={s.deleteButton} onPress={() => removeMediaFile(item.id)}>
//             <Ionicons name="close-circle" size={28} color="#E74C3C" />
//           </TouchableOpacity>
//         </View>
        
//         {isReportable && (
//           <View style={s.disturbanceInline}>
//             <LinearGradient colors={severity === 'CRITICAL' || severity === 'SEVERE' ? ['#E74C3C', '#C0392B'] : ['#E67E22', '#D35400']} style={s.disturbanceInlineGradient}>
//               <Ionicons name={severity === 'CRITICAL' || severity === 'SEVERE' ? "alert-circle" : "warning"} size={20} color="#fff" />
//               <View style={s.disturbanceInlineContent}>
//                 <Text style={s.disturbanceInlineTitle}>{severity === 'CRITICAL' || severity === 'SEVERE' ? 'URGENT' : 'Reportable'}</Text>
//                 <Text style={s.disturbanceInlineText}>{item.aiResults.recommendation?.substring(0, 60)}...</Text>
//               </View>
//             </LinearGradient>
//           </View>
//         )}
        
//         <View style={s.analysisMetrics}>
//           <View style={s.metricLarge}>
//             <Text style={s.metricLargeValue}>{item.aiResults?.decibel || 0} dB</Text>
//             <Text style={s.metricLargeLabel}>Measured</Text>
//           </View>
//           {item.aiResults?.distance && (
//             <View style={s.metricLarge}>
//               <Text style={s.metricLargeValue}>{item.aiResults.distance.meters || '?'}m</Text>
//               <Text style={s.metricLargeLabel}>Distance</Text>
//             </View>
//           )}
//           <View style={s.metricLarge}>
//             <Text style={s.metricLargeValue}>{item.aiResults?.noise_level?.level || 'N/A'}</Text>
//             <Text style={s.metricLargeLabel}>Noise Level</Text>
//           </View>
//         </View>
        
//         {/* Playback Controls */}
//         {(item.type === 'audio' || item.type === 'video') && (
//           <View style={s.playbackSection}>
//             <TouchableOpacity 
//               style={s.playButton}
//               onPress={() => {
//                 if (isPlayingThis) {
//                   if (soundRef.current) {
//                     soundRef.current.pauseAsync();
//                     setIsPlaying(false);
//                     setPlayingFileId(null);
//                   }
//                 } else {
//                   playMedia(item.id, item.uri);
//                 }
//               }}
//             >
//               <LinearGradient 
//                 colors={isPlayingThis ? ['#E74C3C', '#C0392B'] : ['#D4AC0D', '#8B4513']} 
//                 style={s.playButtonGradient}
//               >
//                 <Ionicons name={isPlayingThis ? "pause" : "play"} size={24} color="#fff" />
//               </LinearGradient>
//             </TouchableOpacity>
            
//             <View style={s.progressSection}>
//               <View style={s.progressBar}>
//                 <View style={[s.progressFill, { width: `${duration > 0 ? (currentPos / duration) * 100 : 0}%` }]} />
//               </View>
//               <View style={s.timeLabels}>
//                 <Text style={s.timeText}>{formatTime(currentPos)}</Text>
//                 <Text style={s.timeText}>{formatTime(duration)}</Text>
//               </View>
//             </View>
//           </View>
//         )}
        
//         {/* Top Detections */}
//         {item.aiResults?.detections && item.aiResults.detections.length > 0 && (
//           <View style={s.detectionsSection}>
//             <Text style={s.detectionsTitle}>Top Detected Sounds</Text>
//             {item.aiResults.detections.slice(0, 3).map((detection, idx) => {
//               const confidencePercent = (detection.confidence * 100).toFixed(1);
//               return (
//                 <View key={idx} style={s.detectionRow}>
//                   <View style={s.detectionRankContainer}>
//                     <LinearGradient
//                       colors={idx === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
//                       style={s.detectionRankBadge}
//                     >
//                       <Text style={s.detectionRankText}>{idx + 1}</Text>
//                     </LinearGradient>
//                   </View>
//                   <View style={s.detectionInfo}>
//                     <Text style={s.detectionName}>{detection.class}</Text>
//                     <View style={s.detectionConfidenceBar}>
//                       <View style={s.detectionConfidenceBg}>
//                         <LinearGradient
//                           colors={idx === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
//                           style={[s.detectionConfidenceFill, { width: `${confidencePercent}%` }]}
//                         />
//                       </View>
//                       <Text style={s.detectionConfidenceText}>{confidencePercent}%</Text>
//                     </View>
//                   </View>
//                 </View>
//               );
//             })}
//           </View>
//         )}
        
//         {/* Reasons if Reportable */}
//         {isReportable && item.aiResults?.reasons && item.aiResults.reasons.length > 0 && (
//           <View style={s.reasonsSection}>
//             <Text style={s.reasonsTitle}>Reasons:</Text>
//             {item.aiResults.reasons.slice(0, 2).map((reason, idx) => (
//               <View key={idx} style={s.reasonRow}>
//                 <Ionicons name="alert-circle" size={14} color="#E74C3C" />
//                 <Text style={s.reasonText}>{reason}</Text>
//               </View>
//             ))}
//           </View>
//         )}
        
//         {/* Action Buttons */}
//         <View style={s.analysisActions}>
//           <TouchableOpacity style={s.actionBtn} onPress={() => shareAnalysisReport(item)}>
//             <Ionicons name="share-outline" size={18} color="#8B4513" />
//             <Text style={s.actionBtnText}>Share</Text>
//           </TouchableOpacity>
//           <TouchableOpacity 
//             style={[s.actionBtn, s.deleteActionBtn]} 
//             onPress={() => removeMediaFile(item.id)}
//           >
//             <Ionicons name="trash-outline" size={18} color="#E74C3C" />
//             <Text style={[s.actionBtnText, s.deleteActionText]}>Delete</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   };

//   const renderMediaModal = () => {
//     return (
//       <Modal
//         visible={isMediaModalVisible}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => setIsMediaModalVisible(false)}
//       >
//         <View style={s.modalOverlay}>
//           <View style={s.modalContent}>
//             <View style={s.modalHeader}>
//               <Text style={s.modalTitle}>Add Media</Text>
//               <TouchableOpacity onPress={() => setIsMediaModalVisible(false)}>
//                 <Ionicons name="close" size={24} color="#666" />
//               </TouchableOpacity>
//             </View>
            
//             <ScrollView showsVerticalScrollIndicator={false}>
//               <View style={s.modalSection}>
//                 <Text style={s.modalSectionTitle}>
//                   <Ionicons name="mic" size={18} color="#8B4513" /> Audio
//                 </Text>
//                 <View style={s.modalOptionsRow}>
//                   <TouchableOpacity style={s.modalOption} onPress={startRecording}>
//                     <LinearGradient colors={['#2196F3', '#1976D2']} style={s.modalOptionGradient}>
//                       <Ionicons name="mic" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Record Audio</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                   <TouchableOpacity style={s.modalOption} onPress={pickAudioFiles}>
//                     <LinearGradient colors={['#4CAF50', '#388E3C']} style={s.modalOptionGradient}>
//                       <Ionicons name="folder-open" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Choose Audio</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </View>
//               </View>
              
//               <View style={s.modalSection}>
//                 <Text style={s.modalSectionTitle}>
//                   <Ionicons name="videocam" size={18} color="#8B4513" /> Video
//                 </Text>
//                 <View style={s.modalOptionsRow}>
//                   <TouchableOpacity style={s.modalOption} onPress={recordVideo}>
//                     <LinearGradient colors={['#E91E63', '#C2185B']} style={s.modalOptionGradient}>
//                       <Ionicons name="videocam" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Record Video</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                   <TouchableOpacity style={s.modalOption} onPress={pickVideoFromGallery}>
//                     <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={s.modalOptionGradient}>
//                       <Ionicons name="images" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>From Gallery</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                   <TouchableOpacity style={s.modalOption} onPress={pickVideoFiles}>
//                     <LinearGradient colors={['#FF9800', '#F57C00']} style={s.modalOptionGradient}>
//                       <Ionicons name="folder-open" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Choose Video</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </ScrollView>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderManualLocationModal = () => {
//     return (
//       <Modal
//         visible={showManualLocationModal}
//         transparent={true}
//         animationType="slide"
//         onRequestClose={() => setShowManualLocationModal(false)}
//       >
//         <View style={s.modalOverlay}>
//           <View style={s.mapModalContent}>
//             <View style={s.modalHeader}>
//               <Text style={s.modalTitle}>Select Location on Map</Text>
//               <TouchableOpacity onPress={() => setShowManualLocationModal(false)}>
//                 <Ionicons name="close" size={24} color="#666" />
//               </TouchableOpacity>
//             </View>
            
//             <View style={s.searchContainer}>
//               <View style={s.searchInputContainer}>
//                 <Ionicons name="search" size={20} color="#999" style={s.searchIcon} />
//                 <TextInput
//                   style={s.searchInput}
//                   placeholder="Search for a location..."
//                   placeholderTextColor="#999"
//                   value={searchQuery}
//                   onChangeText={setSearchQuery}
//                   onSubmitEditing={searchLocation}
//                   returnKeyType="search"
//                 />
//                 {searchQuery.length > 0 && (
//                   <TouchableOpacity onPress={() => setSearchQuery('')}>
//                     <Ionicons name="close-circle" size={20} color="#999" />
//                   </TouchableOpacity>
//                 )}
//               </View>
//               <TouchableOpacity style={s.searchButton} onPress={searchLocation} disabled={isSearching}>
//                 <LinearGradient colors={['#8B4513', '#654321']} style={s.searchButtonGradient}>
//                   <Text style={s.searchButtonText}>{isSearching ? 'Searching...' : 'Search'}</Text>
//                 </LinearGradient>
//               </TouchableOpacity>
//             </View>
            
//             {searchResults.length > 0 && (
//               <View style={s.searchResultsContainer}>
//                 <ScrollView style={s.searchResultsScroll} nestedScrollEnabled>
//                   {searchResults.map((result, index) => (
//                     <TouchableOpacity
//                       key={index}
//                       style={s.searchResultItem}
//                       onPress={() => selectSearchResult(result)}
//                     >
//                       <Ionicons name="location-outline" size={18} color="#8B4513" />
//                       <Text style={s.searchResultText} numberOfLines={2}>{result.display_name}</Text>
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </View>
//             )}
            
//             <View style={s.mapContainer}>
//               <MapView
//                 ref={mapRef}
//                 style={s.map}
//                 initialRegion={{
//                   latitude: 14.5995,
//                   longitude: 120.9842,
//                   latitudeDelta: 0.0922,
//                   longitudeDelta: 0.0421,
//                 }}
//                 onPress={(e) => {
//                   const { latitude, longitude } = e.nativeEvent.coordinate;
//                   setSelectedMapLocation({ latitude, longitude });
//                 }}
//               >
//                 {selectedMapLocation && (
//                   <Marker
//                     coordinate={selectedMapLocation}
//                     draggable
//                     onDragEnd={(e) => {
//                       setSelectedMapLocation(e.nativeEvent.coordinate);
//                     }}
//                   />
//                 )}
//               </MapView>
//             </View>
            
//             <View style={s.mapInstructions}>
//               <Ionicons name="finger-print" size={20} color="#8B4513" />
//               <Text style={s.mapInstructionsText}>Tap on map to place marker, drag to adjust</Text>
//             </View>
            
//             <TouchableOpacity style={s.confirmLocationBtn} onPress={confirmManualLocation}>
//               <LinearGradient colors={['#8B4513', '#654321']} style={s.confirmLocationGradient}>
//                 <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                 <Text style={s.confirmLocationText}>Confirm Location</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'analysis':
//         return (
//           <View style={s.tabContent}>
//             {renderNoiseLevelCard()}
            
//             {disturbanceAlerts.length > 0 && (
//               <View style={s.alertSummary}>
//                 <LinearGradient colors={['#FFEBEE', '#FFCDD2']} style={s.alertSummaryGradient}>
//                   <Ionicons name="warning" size={24} color="#E74C3C" />
//                   <View style={s.alertSummaryContent}>
//                     <Text style={s.alertSummaryTitle}>
//                       {disturbanceAlerts.length} Reportable Noise(s) Detected
//                     </Text>
//                     <Text style={s.alertSummaryText}>
//                       {disturbanceAlerts.filter(a => a.disturbance.severity_name === 'CRITICAL' || a.disturbance.severity_name === 'SEVERE').length} severe violations
//                     </Text>
//                   </View>
//                 </LinearGradient>
//               </View>
//             )}
            
//             {mediaFiles.length > 0 ? (
//               <FlatList
//                 data={mediaFiles}
//                 renderItem={({ item }) => renderDetailedAnalysis(item)}
//                 keyExtractor={item => item.id}
//                 scrollEnabled={false}
//                 contentContainerStyle={s.detailedAnalysisContainer}
//               />
//             ) : (
//               <View style={s.emptyAnalysis}>
//                 <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
//                   <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
//                 </Animated.View>
//                 <Text style={s.emptyTitle}>No Media Added</Text>
//                 <Text style={s.emptyText}>Tap the + button to add audio or video files</Text>
//                 <Text style={s.emptySubtext}>AI will analyze each file separately</Text>
//               </View>
//             )}
//           </View>
//         );

//       case 'details':
//         return (
//           <View style={s.tabContent}>
//             <View style={s.detailsCard}>
//               <View style={s.sectionHeader}>
//                 <Ionicons name="chatbubble-outline" size={20} color="#8B4513" />
//                 <Text style={s.sectionHeaderTitle}>Additional Details</Text>
//               </View>
//               <TextInput 
//                 style={s.detailsInput} 
//                 placeholder="Describe the noise issue (optional)" 
//                 placeholderTextColor="#999" 
//                 multiline 
//                 numberOfLines={4} 
//                 value={comment} 
//                 onChangeText={setComment} 
//                 maxLength={500} 
//                 textAlignVertical="top" 
//               />
//               <Text style={s.charCount}>{comment.length}/500</Text>
//             </View>
//           </View>
//         );

//       case 'location':
//         return (
//           <View style={s.tabContent}>
//             <View style={s.locationCard}>
//               <View style={s.sectionHeader}>
//                 <Ionicons name="location-outline" size={20} color="#8B4513" />
//                 <Text style={s.sectionHeaderTitle}>Location</Text>
//               </View>
              
//               {!location ? (
//                 <>
//                   <TouchableOpacity 
//                     style={s.addLocationBtn} 
//                     onPress={getUserLocation} 
//                     disabled={locationLoading}
//                   >
//                     <LinearGradient
//                       colors={['#8B4513', '#654321']}
//                       style={s.addLocationGradient}
//                     >
//                       <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#D4AC0D" />
//                       <Text style={s.addLocationText}>
//                         {locationLoading ? 'Getting Location...' : 'Use Current Location'}
//                       </Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
                  
//                   <View style={s.orDivider}>
//                     <View style={s.dividerLine} />
//                     <Text style={s.dividerText}>OR</Text>
//                     <View style={s.dividerLine} />
//                   </View>
                  
//                   <TouchableOpacity 
//                     style={s.addLocationBtn} 
//                     onPress={openManualLocationPicker}
//                   >
//                     <LinearGradient
//                       colors={['#D4AC0D', '#8B4513']}
//                       style={s.addLocationGradient}
//                     >
//                       <Ionicons name="map" size={24} color="#fff" />
//                       <Text style={s.addLocationText}>Select on Map</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </>
//               ) : (
//                 <View style={s.locationInfoCard}>
//                   <View style={s.locationHeader}>
//                     <View style={s.locationBadge}>
//                       <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
//                       <Text style={s.locationBadgeText}>
//                         Location Added {location.isManual ? '(Manual)' : '(GPS)'}
//                       </Text>
//                     </View>
//                     <TouchableOpacity onPress={() => setLocation(null)} style={s.removeLocationBtn}>
//                       <Ionicons name="close" size={20} color="#E74C3C" />
//                     </TouchableOpacity>
//                   </View>
                  
//                   <View style={s.locationDetails}>
//                     <Text style={s.locationAddress}>
//                       {location.address?.street || location.address?.name || 'Selected Location'}
//                     </Text>
//                     {location.address?.city && (
//                       <Text style={s.locationCity}>
//                         {location.address.city}, {location.address.region || ''}
//                       </Text>
//                     )}
//                   </View>
                  
//                   <TouchableOpacity style={s.refreshLocationBtn} onPress={getUserLocation}>
//                     <Ionicons name="refresh" size={18} color="#8B4513" />
//                     <Text style={s.refreshLocationText}>Refresh GPS Location</Text>
//                   </TouchableOpacity>
//                 </View>
//               )}
              
//               {locationError && (
//                 <View style={s.locationError}>
//                   <Ionicons name="alert-circle" size={20} color="#E74C3C" />
//                   <Text style={s.locationErrorText}>{locationError}</Text>
//                 </View>
//               )}
//             </View>
//           </View>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <SafeAreaView style={s.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       <LinearGradient colors={['#8B4513', '#654321']} style={s.header}>
//         <View style={s.headerContent}>
//           <View style={s.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={s.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}>
//               <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={testAIService} style={s.headerButton}>
//               <Ionicons name="wifi" size={24} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={s.headerTitle}>Noise Report</Text>
//           <Text style={s.headerSubtitle}>
//             {isRecording ? 'Recording in progress...' : 
//              mediaFiles.length > 0 ? `${mediaFiles.length} file(s) ready` : 
//              'Add media files for analysis'}
//           </Text>
//         </View>
//       </LinearGradient>

//       {isRecording && (
//         <View style={s.recordingControlContainer}>
//           <LinearGradient colors={['#E74C3C', '#C0392B']} style={s.recordingControlGradient}>
//             <View style={s.recordingInfo}>
//               <View style={s.recordingDot} />
//               <Text style={s.recordingTimer}>{formatTime(recordingDuration)}</Text>
//             </View>
//             <TouchableOpacity style={s.stopRecordingButton} onPress={stopRecording}>
//               <Ionicons name="stop-circle" size={32} color="#fff" />
//               <Text style={s.stopRecordingText}>Stop Recording</Text>
//             </TouchableOpacity>
//           </LinearGradient>
//         </View>
//       )}

//       {!isRecording && (
//         <TouchableOpacity style={s.addMediaButton} onPress={() => setIsMediaModalVisible(true)}>
//           <LinearGradient colors={['#D4AC0D', '#8B4513']} style={s.addMediaGradient}>
//             <Ionicons name="add-circle" size={28} color="#fff" />
//             <Text style={s.addMediaText}>Add Media Files</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       )}

//       {mediaFiles.length > 0 && !isRecording && (
//         <View style={s.tabsContainer}>
//           <TouchableOpacity
//             style={[s.tab, activeTab === 'analysis' && s.activeTab]}
//             onPress={() => setActiveTab('analysis')}
//           >
//             <Ionicons name="analytics" size={20} color={activeTab === 'analysis' ? '#8B4513' : '#999'} />
//             <Text style={[s.tabText, activeTab === 'analysis' && s.activeTabText]}>Analysis</Text>
//             {disturbanceAlerts.length > 0 && activeTab !== 'analysis' && <View style={s.notificationDot} />}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'details' && s.activeTab]}
//             onPress={() => setActiveTab('details')}
//           >
//             <Ionicons name="document-text" size={20} color={activeTab === 'details' ? '#8B4513' : '#999'} />
//             <Text style={[s.tabText, activeTab === 'details' && s.activeTabText]}>Details</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'location' && s.activeTab]}
//             onPress={() => setActiveTab('location')}
//           >
//             <Ionicons name="location" size={20} color={activeTab === 'location' ? '#8B4513' : '#999'} />
//             <Text style={[s.tabText, activeTab === 'location' && s.activeTabText]}>Location</Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       <ScrollView 
//         style={s.tabContentContainer} 
//         contentContainerStyle={s.tabContentContainerContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {renderTabContent()}

//         {mediaFiles.length > 0 && !isRecording && (
//           <TouchableOpacity
//             onPress={saveRecording}
//             style={[s.submitBtn, (mediaFiles.some(f => f.isAnalyzing) || isSubmitting) && s.submitBtnDisabled]}
//             disabled={mediaFiles.some(f => f.isAnalyzing) || isSubmitting}
//           >
//             <LinearGradient colors={['#8B4513', '#654321']} style={s.submitGradient}>
//               {isSubmitting ? (
//                 <>
//                   <ActivityIndicator size="small" color="#D4AC0D" />
//                   <Text style={s.submitText}>Submitting...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                   <Text style={s.submitText}>Submit Report ({mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''})</Text>
//                   {disturbanceAlerts.length > 0 && (
//                     <View style={s.reportableIndicator}>
//                       <Ionicons name="alert" size={16} color="#E74C3C" />
//                     </View>
//                   )}
//                 </>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>
//         )}
//       </ScrollView>

//       {renderMediaModal()}
//       {renderManualLocationModal()}

//       <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
//         <View style={s.modalContainer}>
//           <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
//             <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
//           </Animated.View>
//           <Animated.View style={[s.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
//             <CustomDrawer navigation={navigation} onClose={closeDrawer} />
//           </Animated.View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const s = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f5f5f5' },
  
//   header: { 
//     paddingTop: getStatusBarHeight(), 
//     paddingBottom: 15, 
//     paddingHorizontal: 20,
//     borderBottomLeftRadius: 25,
//     borderBottomRightRadius: 25,
//   },
//   headerContent: { marginTop: 5 },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
//   headerButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
//   headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
//   headerSubtitle: { fontSize: 14, color: '#D4AC0D', opacity: 0.9 },

//   recordingControlContainer: {
//     marginHorizontal: 15,
//     marginTop: 15,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 5,
//   },
//   recordingControlGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//   },
//   recordingInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
//   recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
//   recordingTimer: { fontSize: 24, fontWeight: 'bold', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
//   stopRecordingButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25 },
//   stopRecordingText: { color: '#fff', fontSize: 14, fontWeight: '600' },

//   addMediaButton: { marginHorizontal: 15, marginTop: 15, borderRadius: 15, overflow: 'hidden', elevation: 3 },
//   addMediaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
//   addMediaText: { color: '#fff', fontSize: 16, fontWeight: '600' },

//   tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, borderRadius: 15, padding: 5, elevation: 2 },
//   tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, position: 'relative' },
//   activeTab: { backgroundColor: '#f5f5f5' },
//   tabText: { fontSize: 14, color: '#999', fontWeight: '500' },
//   activeTabText: { color: '#8B4513', fontWeight: '600' },
//   notificationDot: { position: 'absolute', top: 8, right: '30%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' },

//   tabContentContainer: { flex: 1 },
//   tabContentContainerContent: { paddingHorizontal: 15, paddingBottom: 30 },
//   tabContent: { gap: 15 },

//   noiseLevelCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f0f0f0', elevation: 3, marginBottom: 15 },
//   noiseLevelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
//   noiseLevelIconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
//   noiseLevelInfo: { flex: 1 },
//   noiseLevelLabel: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
//   noiseLevelDesc: { fontSize: 13, color: '#666' },
//   noiseLevelEmoji: { fontSize: 32 },
//   noiseLevelMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
//   metricItem: { alignItems: 'center' },
//   metricValue: { fontSize: 24, fontWeight: 'bold', color: '#8B4513', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
//   metricLabel: { fontSize: 12, color: '#999', marginTop: 4 },

//   alertSummary: { borderRadius: 16, overflow: 'hidden', marginBottom: 5 },
//   alertSummaryGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
//   alertSummaryContent: { flex: 1 },
//   alertSummaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#E74C3C' },
//   alertSummaryText: { fontSize: 12, color: '#E74C3C', opacity: 0.8, marginTop: 2 },

//   emptyAnalysis: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center' },
//   emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginTop: 15, marginBottom: 8 },
//   emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
//   emptySubtext: { fontSize: 12, color: '#ccc', marginTop: 8, textAlign: 'center' },

//   detailedAnalysisContainer: { gap: 16, paddingBottom: 20 },
//   analysisCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0' },
//   criticalCard: { backgroundColor: '#FFF5F5', borderColor: '#FFCDD2' },
//   analysisCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
//   analysisFileIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
//   analysisFileInfo: { flex: 1 },
//   analysisFileName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
//   analysisFileMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
//   sourceBadgeSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
//   liveBadgeSmall: { backgroundColor: '#4CAF50' },
//   downloadedBadgeSmall: { backgroundColor: '#2196F3' },
//   sourceBadgeTextSmall: { fontSize: 10, color: '#fff', fontWeight: '600' },
//   durationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 3 },
//   durationText: { fontSize: 10, color: '#666' },
//   reportableBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
//   reportableTextSmall: { fontSize: 10, color: '#E74C3C', fontWeight: '600' },
//   deleteButton: { padding: 4, marginLeft: 4 },

//   disturbanceInline: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
//   disturbanceInlineGradient: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
//   disturbanceInlineContent: { flex: 1 },
//   disturbanceInlineTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
//   disturbanceInlineText: { color: '#fff', fontSize: 10, opacity: 0.9, marginTop: 2 },

//   analysisMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
//   metricLarge: { alignItems: 'center' },
//   metricLargeValue: { fontSize: 28, fontWeight: 'bold', color: '#8B4513' },
//   metricLargeLabel: { fontSize: 12, color: '#999', marginTop: 4 },

//   playbackSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
//   playButton: { borderRadius: 30, overflow: 'hidden', elevation: 3 },
//   playButtonGradient: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
//   progressSection: { flex: 1 },
//   progressBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
//   progressFill: { height: '100%', backgroundColor: '#D4AC0D', borderRadius: 3 },
//   timeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
//   timeText: { fontSize: 12, color: '#666' },

//   detectionsSection: { marginBottom: 16 },
//   detectionsTitle: { fontSize: 14, fontWeight: '600', color: '#8B4513', marginBottom: 12 },
//   detectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
//   detectionRankContainer: { width: 32 },
//   detectionRankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
//   detectionRankText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
//   detectionInfo: { flex: 1 },
//   detectionName: { fontSize: 13, fontWeight: '500', color: '#333', marginBottom: 4 },
//   detectionConfidenceBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   detectionConfidenceBg: { flex: 1, height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, overflow: 'hidden' },
//   detectionConfidenceFill: { height: '100%', borderRadius: 2 },
//   detectionConfidenceText: { fontSize: 11, color: '#666', width: 40 },

//   reasonsSection: { backgroundColor: '#FFF9C4', borderRadius: 12, padding: 12, marginBottom: 16 },
//   reasonsTitle: { fontSize: 11, fontWeight: 'bold', color: '#E67E22', marginBottom: 6 },
//   reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
//   reasonText: { fontSize: 11, color: '#666', flex: 1 },

//   analysisActions: { flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
//   actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f5f5f5', borderRadius: 20 },
//   actionBtnText: { fontSize: 12, color: '#8B4513' },
//   deleteActionBtn: { backgroundColor: '#FFEBEE' },
//   deleteActionText: { color: '#E74C3C' },

//   analyzingContainer: { alignItems: 'center', paddingVertical: 20, gap: 12 },
//   analyzingText: { fontSize: 14, color: '#8B4513' },
//   errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 10, marginTop: 10, gap: 8 },
//   errorText: { fontSize: 12, color: '#E74C3C', flex: 1 },

//   detailsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 },
//   sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   sectionHeaderTitle: { fontSize: 16, fontWeight: '600', color: '#8B4513' },
//   detailsInput: { borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: '#f8f9fa', minHeight: 100 },
//   charCount: { textAlign: 'right', fontSize: 12, color: '#999', marginTop: 8 },

//   locationCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 },
//   addLocationBtn: { borderRadius: 15, overflow: 'hidden', marginTop: 5 },
//   addLocationGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
//   addLocationText: { color: '#D4AC0D', fontSize: 16, fontWeight: '600' },
//   orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
//   dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
//   dividerText: { marginHorizontal: 10, color: '#999', fontSize: 12 },
//   locationInfoCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 15, marginTop: 5 },
//   locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//   locationBadgeText: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
//   removeLocationBtn: { padding: 4 },
//   locationDetails: { marginBottom: 12 },
//   locationAddress: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
//   locationCity: { fontSize: 14, color: '#666', marginBottom: 12 },
//   refreshLocationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
//   refreshLocationText: { fontSize: 13, color: '#8B4513', fontWeight: '500' },
//   locationError: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 10, marginTop: 10, gap: 8 },
//   locationErrorText: { fontSize: 13, color: '#E74C3C', flex: 1 },

//   submitBtn: { marginTop: 10, marginBottom: 20, borderRadius: 15, overflow: 'hidden', elevation: 3 },
//   submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
//   submitText: { color: '#D4AC0D', fontSize: 18, fontWeight: 'bold' },
//   submitBtnDisabled: { opacity: 0.5 },
//   reportableIndicator: { backgroundColor: '#FFEBEE', padding: 4, borderRadius: 12, marginLeft: 8 },

//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
//   modalContent: { backgroundColor: '#fff', borderRadius: 25, width: width - 40, maxHeight: height * 0.8, padding: 20 },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
//   modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B4513' },
//   modalSection: { marginBottom: 24 },
//   modalSectionTitle: { fontSize: 16, fontWeight: '600', color: '#8B4513', marginBottom: 12 },
//   modalOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
//   modalOption: { flex: 1, minWidth: (width - 80) / 2 - 12, borderRadius: 15, overflow: 'hidden', elevation: 2 },
//   modalOptionGradient: { alignItems: 'center', paddingVertical: 16, gap: 8 },
//   modalOptionText: { color: '#fff', fontSize: 12, fontWeight: '600' },

//   mapModalContent: { backgroundColor: '#fff', borderRadius: 25, width: width - 20, height: height * 0.7, padding: 20 },
//   searchContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
//   searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e0e0e0' },
//   searchIcon: { marginRight: 8 },
//   searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#333' },
//   searchButton: { borderRadius: 12, overflow: 'hidden' },
//   searchButtonGradient: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
//   searchButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
//   searchResultsContainer: { maxHeight: 200, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
//   searchResultsScroll: { maxHeight: 200 },
//   searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 10 },
//   searchResultText: { flex: 1, fontSize: 13, color: '#333' },
//   mapContainer: { flex: 1, borderRadius: 15, overflow: 'hidden', marginVertical: 12 },
//   map: { width: '100%', height: '100%' },
//   mapInstructions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 10 },
//   mapInstructionsText: { fontSize: 12, color: '#666' },
//   confirmLocationBtn: { borderRadius: 15, overflow: 'hidden', marginTop: 10 },
//   confirmLocationGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
//   confirmLocationText: { color: '#D4AC0D', fontSize: 16, fontWeight: 'bold' },
// });


// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//   Dimensions, Platform, ScrollView, Alert, TextInput, ActivityIndicator,
//   Share, SafeAreaView, FlatList
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio } from 'expo-av';
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
// import * as Location from 'expo-location';
// import axios from 'axios';
// import API_BASE_URL from '../../utils/api';
// import CustomDrawer from '../CustomDrawer';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';
// import MapView, { Marker } from 'react-native-maps';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// export default function AudioRecordingScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [recordingDuration, setRecordingDuration] = useState(0);
//   const [recording, setRecording] = useState(null);
//   const [mediaFiles, setMediaFiles] = useState([]);
//   const [comment, setComment] = useState('');
//   const [location, setLocation] = useState(null);
//   const [locationLoading, setLocationLoading] = useState(false);
//   const [locationError, setLocationError] = useState(null);
//   const [showManualLocationModal, setShowManualLocationModal] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [activeTab, setActiveTab] = useState('analysis');
//   const [disturbanceAlerts, setDisturbanceAlerts] = useState([]);
//   const [analyzingFileId, setAnalyzingFileId] = useState(null);
//   const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
//   const [selectedMapLocation, setSelectedMapLocation] = useState(null);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchResults, setSearchResults] = useState([]);
//   const [isSearching, setIsSearching] = useState(false);
//   const [playingFileId, setPlayingFileId] = useState(null);
//   const [playbackPositionMap, setPlaybackPositionMap] = useState({});
//   const [durationMap, setDurationMap] = useState({});

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const recordingInterval = useRef(null);
//   const mapRef = useRef(null);
//   const soundRef = useRef(null);

//   const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';

//   useEffect(() => {
//     (async () => {
//       try {
//         await Audio.requestPermissionsAsync();
//         await ImagePicker.requestCameraPermissionsAsync();
//         await Audio.setAudioModeAsync({
//           allowsRecordingIOS: true,
//           playsInSilentModeIOS: true,
//           staysActiveInBackground: false,
//           shouldDuckAndroid: true,
//           playThroughEarpieceAndroid: false,
//         });
//       } catch (error) {
//         console.error('Error setting up audio:', error);
//       }
//     })();
    
//     return () => {
//       if (recording) {
//         recording.stopAndUnloadAsync();
//       }
//       if (soundRef.current) {
//         soundRef.current.unloadAsync();
//       }
//       if (recordingInterval.current) {
//         clearInterval(recordingInterval.current);
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (isRecording) {
//       Animated.loop(
//         Animated.sequence([
//           Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
//           Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
//         ])
//       ).start();
//     } else {
//       pulseAnim.setValue(1);
//     }
//   }, [isRecording]);

//   const formatTime = (seconds) => {
//     if (!seconds || isNaN(seconds)) return '0:00';
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   // ==================== MEDIA MANAGEMENT FUNCTIONS ====================
//   const startRecording = async () => {
//     try {
//       if (recording) {
//         await recording.stopAndUnloadAsync();
//         setRecording(null);
//       }
      
//       const { recording: newRecording } = await Audio.Recording.createAsync({
//         android: { 
//           extension: '.m4a', 
//           outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4, 
//           audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC, 
//           sampleRate: 16000, 
//           numberOfChannels: 1, 
//           bitRate: 128000 
//         },
//         ios: { 
//           extension: '.m4a', 
//           outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC, 
//           audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM, 
//           sampleRate: 16000, 
//           numberOfChannels: 1, 
//           bitRate: 128000, 
//           linearPCMBitDepth: 16, 
//           linearPCMIsBigEndian: false, 
//           linearPCMIsFloat: false 
//         },
//       });
      
//       const fileId = Date.now().toString();
//       const newFile = {
//         id: fileId,
//         uri: null,
//         fileName: 'New Recording',
//         type: 'audio',
//         isRecording: true,
//         recording: newRecording,
//         duration: 0,
//         aiResults: null,
//         isAnalyzing: false,
//         mediaSource: 'live',
//         totalDuration: 0
//       };
      
//       setMediaFiles(prev => [...prev, newFile]);
//       setRecording(newRecording);
//       setIsRecording(true);
//       setRecordingDuration(0);
//       setAnalyzingFileId(fileId);
//       setIsMediaModalVisible(false);
      
//       if (recordingInterval.current) {
//         clearInterval(recordingInterval.current);
//       }
      
//       recordingInterval.current = setInterval(() => {
//         setRecordingDuration(prev => prev + 1);
//         setMediaFiles(prev => prev.map(f => 
//           f.id === fileId ? { ...f, duration: f.duration + 1 } : f
//         ));
//       }, 1000);
      
//     } catch (err) {
//       console.error('Start recording error:', err);
//       Alert.alert('Error', 'Failed to start recording.');
//     }
//   };

//   const stopRecording = async () => {
//     if (!recording) return;
    
//     try {
//       await recording.stopAndUnloadAsync();
//       const uri = recording.getURI();
      
//       setMediaFiles(prev => prev.map(f => 
//         f.id === analyzingFileId ? { 
//           ...f, 
//           uri: uri,
//           isRecording: false,
//           recording: null,
//           totalDuration: recordingDuration
//         } : f
//       ));
      
//       setIsRecording(false);
//       setRecording(null);
//       clearInterval(recordingInterval.current);
//       recordingInterval.current = null;
      
//       if (uri) {
//         setTimeout(() => {
//           analyzeMediaFile(analyzingFileId, uri, 'audio');
//         }, 500);
//       }
//     } catch (err) {
//       console.error('Stop recording error:', err);
//       Alert.alert('Error', 'Failed to stop recording.');
//     }
//   };

//   const pickAudioFiles = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['audio/*'],
//         copyToCacheDirectory: true,
//         multiple: true,
//       });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const newFiles = [];
        
//         for (const asset of result.assets) {
//           const fileUri = asset.uri;
//           const fileName = asset.name;
//           const fileId = Date.now().toString() + Math.random();
          
//           let duration = 0;
//           try {
//             const { sound: tempSound } = await Audio.Sound.createAsync({ uri: fileUri });
//             const status = await tempSound.getStatusAsync();
//             duration = Math.floor(status.durationMillis / 1000);
//             await tempSound.unloadAsync();
//           } catch (e) {
//             console.error('Error getting duration:', e);
//           }
          
//           newFiles.push({
//             id: fileId,
//             uri: fileUri,
//             fileName: fileName,
//             type: 'audio',
//             isRecording: false,
//             duration: 0,
//             totalDuration: duration,
//             aiResults: null,
//             isAnalyzing: true,
//             mediaSource: 'downloaded'
//           });
//         }
        
//         setMediaFiles(prev => [...prev, ...newFiles]);
        
//         for (const file of newFiles) {
//           setAnalyzingFileId(file.id);
//           await analyzeMediaFile(file.id, file.uri, 'audio');
//         }
//       }
//     } catch (error) {
//       console.error('Error picking audio files:', error);
//       Alert.alert('Error', 'Failed to pick audio files');
//     }
//   };

//   // FIXED: Video Recording - Using ImagePicker.MediaTypeOptions.Videos
//   const recordVideo = async () => {
//     try {
//       const result = await ImagePicker.launchCameraAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//         allowsEditing: true,
//         aspect: [16, 9],
//         quality: 1,
//         videoMaxDuration: 60
//       });
      
//       if (!result.canceled && result.assets && result.assets[0]) {
//         const videoUri = result.assets[0].uri;
//         const fileId = Date.now().toString();
        
//         const newFile = {
//           id: fileId,
//           uri: videoUri,
//           fileName: `Video_${new Date().toISOString().slice(0, 19)}`,
//           type: 'video',
//           isRecording: false,
//           duration: 0,
//           aiResults: null,
//           isAnalyzing: true,
//           mediaSource: 'live'
//         };
        
//         setMediaFiles(prev => [...prev, newFile]);
//         setAnalyzingFileId(fileId);
//         setIsMediaModalVisible(false);
//         await analyzeMediaFile(fileId, videoUri, 'video');
//       }
//     } catch (error) {
//       console.error('Error recording video:', error);
//       Alert.alert('Error', 'Failed to record video');
//     }
//   };

//   // FIXED: Video Picking from Gallery - Using ImagePicker.MediaTypeOptions.Videos
//   const pickVideoFromGallery = async () => {
//     try {
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//         allowsEditing: true,
//         quality: 1,
//         allowsMultipleSelection: false,
//       });
      
//       if (!result.canceled && result.assets && result.assets[0]) {
//         const videoUri = result.assets[0].uri;
//         const fileName = result.assets[0].fileName || `video_${Date.now()}.mp4`;
//         const fileId = Date.now().toString() + Math.random();
        
//         const newFile = {
//           id: fileId,
//           uri: videoUri,
//           fileName: fileName,
//           type: 'video',
//           isRecording: false,
//           duration: 0,
//           aiResults: null,
//           isAnalyzing: true,
//           mediaSource: 'downloaded'
//         };
        
//         setMediaFiles(prev => [...prev, newFile]);
//         setAnalyzingFileId(fileId);
//         await analyzeMediaFile(fileId, videoUri, 'video');
//       }
//     } catch (error) {
//       console.error('Error picking videos from gallery:', error);
//       Alert.alert('Error', 'Failed to pick videos from gallery');
//     }
//   };

//   const pickVideoFiles = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['video/*'],
//         copyToCacheDirectory: true,
//         multiple: true,
//       });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const newFiles = [];
        
//         for (const asset of result.assets) {
//           const fileUri = asset.uri;
//           const fileName = asset.name;
//           const fileId = Date.now().toString() + Math.random();
          
//           newFiles.push({
//             id: fileId,
//             uri: fileUri,
//             fileName: fileName,
//             type: 'video',
//             isRecording: false,
//             duration: 0,
//             aiResults: null,
//             isAnalyzing: true,
//             mediaSource: 'downloaded'
//           });
//         }
        
//         setMediaFiles(prev => [...prev, ...newFiles]);
        
//         for (const file of newFiles) {
//           setAnalyzingFileId(file.id);
//           await analyzeMediaFile(file.id, file.uri, 'video');
//         }
//       }
//     } catch (error) {
//       console.error('Error picking video files:', error);
//       Alert.alert('Error', 'Failed to pick video files');
//     }
//   };

//   const analyzeMediaFile = async (fileId, mediaUri, mediaType) => {
//     try {
//       const formData = new FormData();
//       const fileName = mediaUri.split('/').pop() || 'recording';
//       const fileExt = fileName.split('.').pop().toLowerCase();
//       const fileType = mediaType === 'video' ? `video/${fileExt}` : `audio/${fileExt}`;
      
//       formData.append('audio', {
//         uri: mediaUri,
//         type: fileType,
//         name: fileName,
//       });
      
//       formData.append('mime_type', fileType);
//       formData.append('filename', fileName);
      
//       const controller = new AbortController();
//       const timeoutId = setTimeout(() => controller.abort(), 120000);
      
//       const response = await fetch(`${AI_SERVICE_URL}/api/ai/analyze`, {
//         method: 'POST',
//         headers: {
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//         body: formData,
//         signal: controller.signal,
//       });
      
//       clearTimeout(timeoutId);
      
//       if (!response.ok) {
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.success) {
//         setMediaFiles(prev => prev.map(f => 
//           f.id === fileId ? { ...f, aiResults: data, isAnalyzing: false } : f
//         ));
        
//         if (data.is_reportable) {
//           setDisturbanceAlerts(prev => [...prev, {
//             fileId: fileId,
//             fileName: fileName,
//             disturbance: {
//               is_reportable: data.is_reportable,
//               severity_name: data.severity_name,
//               recommendation: data.recommendation,
//               reasons: data.reasons,
//               normalized_spl_db: data.normalized_spl_db
//             }
//           }]);
          
//           if (data.severity_name === 'CRITICAL' || data.severity_name === 'HIGH') {
//             Alert.alert(
//               '🚨 URGENT: Noise Violation Detected!',
//               `${data.recommendation}\n\nReasons:\n${data.reasons?.map(r => `• ${r}`).join('\n')}\n\nVolume: ${data.decibel} dB`,
//               [
//                 { text: 'View Details', onPress: () => setActiveTab('analysis') },
//                 { text: 'Dismiss', style: 'cancel' }
//               ]
//             );
//           }
//         }
//       } else {
//         Alert.alert('Analysis Failed', data.error || 'Unknown error');
//         setMediaFiles(prev => prev.map(f => 
//           f.id === fileId ? { ...f, isAnalyzing: false, analysisError: data.error } : f
//         ));
//       }

//     } catch (error) {
//       console.error('❌ AI Analysis Error:', error);
      
//       let errorMessage = 'Failed to analyze media. ';
//       if (error.name === 'AbortError') {
//         errorMessage += 'Request timed out. Try a shorter file.';
//       } else {
//         errorMessage += error.message;
//       }
      
//       Alert.alert('AI Error', errorMessage);
//       setMediaFiles(prev => prev.map(f => 
//         f.id === fileId ? { ...f, isAnalyzing: false, analysisError: errorMessage } : f
//       ));
//     } finally {
//       if (analyzingFileId === fileId) {
//         setAnalyzingFileId(null);
//       }
//     }
//   };

//   const playMedia = async (fileId, uri) => {
//     try {
//       if (soundRef.current) {
//         await soundRef.current.unloadAsync();
//         setIsPlaying(false);
//         setPlayingFileId(null);
//       }
      
//       const { sound: newSound } = await Audio.Sound.createAsync(
//         { uri },
//         { shouldPlay: true }
//       );
      
//       soundRef.current = newSound;
      
//       const status = await newSound.getStatusAsync();
//       setDurationMap(prev => ({ ...prev, [fileId]: Math.floor(status.durationMillis / 1000) }));
//       setPlayingFileId(fileId);
//       setIsPlaying(true);
      
//       newSound.setOnPlaybackStatusUpdate((status) => {
//         if (status.isLoaded) {
//           setPlaybackPositionMap(prev => ({ 
//             ...prev, 
//             [fileId]: Math.floor(status.positionMillis / 1000) 
//           }));
          
//           if (status.didJustFinish) {
//             setIsPlaying(false);
//             setPlayingFileId(null);
//             newSound.unloadAsync();
//             soundRef.current = null;
//           }
//         }
//       });
      
//     } catch (error) {
//       console.error('Error playing media:', error);
//       Alert.alert('Playback Error', 'Failed to play this file. The format may not be supported.');
//     }
//   };

//   const removeMediaFile = (fileId) => {
//     Alert.alert('Remove File', 'Remove this file from the report?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Remove', 
//         style: 'destructive', 
//         onPress: () => {
//           if (playingFileId === fileId) {
//             if (soundRef.current) {
//               soundRef.current.unloadAsync();
//               soundRef.current = null;
//             }
//             setIsPlaying(false);
//             setPlayingFileId(null);
//           }
          
//           setMediaFiles(prev => prev.filter(f => f.id !== fileId));
//           setDisturbanceAlerts(prev => prev.filter(a => a.fileId !== fileId));
          
//           setPlaybackPositionMap(prev => {
//             const newMap = { ...prev };
//             delete newMap[fileId];
//             return newMap;
//           });
//           setDurationMap(prev => {
//             const newMap = { ...prev };
//             delete newMap[fileId];
//             return newMap;
//           });
//         }
//       },
//     ]);
//   };

//   const shareAnalysisReport = async (file) => {
//     if (!file.aiResults) return;
    
//     const reportText = `
// 🎤 Noise Analysis Report - ${file.fileName}
// ========================
// ${file.aiResults.is_reportable ? '⚠️ REPORTABLE NOISE DETECTED' : '✅ No Reportable Noise'}

// 📊 Sound: ${file.aiResults.classification?.class || 'Unknown'}
// 🔊 Volume: ${file.aiResults.decibel} dB
// 📍 Distance: ${file.aiResults.distance?.meters || '?'}m (${file.aiResults.distance?.category || 'Unknown'})
// ⏱️ Duration: ${file.aiResults.duration_seconds || 0}s

// ${file.aiResults.is_reportable ? `
// 🚨 VIOLATION DETAILS:
// Severity: ${file.aiResults.severity_name}
// Reasons: ${file.aiResults.reasons?.join(', ') || 'N/A'}
// Action: ${file.aiResults.recommendation}
// ` : ''}

// 🎧 Top Detections:
// ${file.aiResults.detections?.slice(0, 3).map((d, i) => `${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`).join('\n')}

// Generated by Barangay North Signal Noise Monitor
// ${new Date().toLocaleString()}
//     `;
    
//     try {
//       await Share.share({
//         message: reportText,
//         title: `Noise Analysis - ${file.fileName}`
//       });
//     } catch (error) {
//       console.error('Share failed:', error);
//     }
//   };

//   // ==================== LOCATION FUNCTIONS ====================
//   const getUserLocation = async () => {
//     setLocationLoading(true);
//     setLocationError(null);
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         setLocationError('Location permission denied');
//         Alert.alert('Permission Required', 'Please grant location access.');
//         setLocationLoading(false);
//         return;
//       }
//       const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
//       const address = await Location.reverseGeocodeAsync({ 
//         latitude: currentLocation.coords.latitude, 
//         longitude: currentLocation.coords.longitude 
//       });
      
//       const addressData = address[0] || {};
//       const cleanAddress = {
//         street: addressData.street || addressData.name || '',
//         city: addressData.city || addressData.subregion || '',
//         region: addressData.region || '',
//         country: addressData.country || '',
//         postalCode: addressData.postalCode || '',
//         name: addressData.name || ''
//       };
      
//       setLocation({ 
//         latitude: currentLocation.coords.latitude, 
//         longitude: currentLocation.coords.longitude, 
//         address: cleanAddress,
//         timestamp: new Date().toISOString(),
//         isManual: false
//       });
//       setLocationLoading(false);
      
//       const displayAddress = cleanAddress.street || 
//                             `${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`;
      
//       Alert.alert('✅ Location Added', `${displayAddress}`);
//     } catch (error) {
//       setLocationError('Failed to get location');
//       setLocationLoading(false);
//       Alert.alert('Error', 'Failed to get location.');
//     }
//   };

//   const searchLocation = async () => {
//     if (!searchQuery.trim()) {
//       Alert.alert('Search', 'Please enter a location to search');
//       return;
//     }
    
//     setIsSearching(true);
//     try {
//       const response = await fetch(
//         `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`,
//         {
//           method: 'GET',
//           headers: {
//             'Accept': 'application/json',
//           },
//         }
//       );
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const data = await response.json();
      
//       if (data.features && data.features.length > 0) {
//         const results = data.features.map(feature => ({
//           lat: feature.geometry.coordinates[1],
//           lon: feature.geometry.coordinates[0],
//           display_name: feature.properties.name || feature.properties.street || 
//                         `${feature.properties.city || ''} ${feature.properties.country || ''}`,
//           full_address: feature.properties.street ? 
//                         `${feature.properties.street}, ${feature.properties.city || ''}, ${feature.properties.country || ''}` :
//                         feature.properties.name || 'Selected location'
//         }));
//         setSearchResults(results);
//       } else {
//         setSearchResults([]);
//         Alert.alert('No Results', 'No locations found. Try a different search term.');
//       }
//     } catch (error) {
//       console.error('Search error:', error);
//       Alert.alert('Search Error', 'Failed to search location. Please try again or tap on the map directly.');
//       setSearchResults([]);
//     } finally {
//       setIsSearching(false);
//     }
//   };

//   const selectSearchResult = (result) => {
//     const lat = parseFloat(result.lat);
//     const lng = parseFloat(result.lon);
//     const locationName = result.display_name;
    
//     setSelectedMapLocation({ latitude: lat, longitude: lng });
//     setSearchQuery(locationName);
//     setSearchResults([]);
    
//     mapRef.current?.animateToRegion({
//       latitude: lat,
//       longitude: lng,
//       latitudeDelta: 0.01,
//       longitudeDelta: 0.01,
//     });
//   };

//   const openManualLocationPicker = () => {
//     setSelectedMapLocation(null);
//     setSearchQuery('');
//     setSearchResults([]);
//     setShowManualLocationModal(true);
//   };

//   const confirmManualLocation = async () => {
//     if (!selectedMapLocation) {
//       Alert.alert('No Location Selected', 'Please search or tap on the map to select a location');
//       return;
//     }
    
//     try {
//       const address = await Location.reverseGeocodeAsync({
//         latitude: selectedMapLocation.latitude,
//         longitude: selectedMapLocation.longitude
//       });
      
//       const addressData = address[0] || {};
//       const cleanAddress = {
//         street: addressData.street || addressData.name || 'Selected location',
//         city: addressData.city || addressData.subregion || addressData.district || '',
//         region: addressData.region || '',
//         country: addressData.country || '',
//         postalCode: addressData.postalCode || '',
//         name: addressData.name || ''
//       };
      
//       setLocation({
//         latitude: selectedMapLocation.latitude,
//         longitude: selectedMapLocation.longitude,
//         address: cleanAddress,
//         timestamp: new Date().toISOString(),
//         isManual: true
//       });
      
//       setShowManualLocationModal(false);
      
//       const displayAddress = cleanAddress.street || 
//                             `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`;
      
//       Alert.alert('✅ Location Added', displayAddress);
      
//     } catch (error) {
//       console.error('Error getting address:', error);
//       setLocation({
//         latitude: selectedMapLocation.latitude,
//         longitude: selectedMapLocation.longitude,
//         address: { street: 'Selected location', city: '', region: '', country: '' },
//         timestamp: new Date().toISOString(),
//         isManual: true
//       });
//       setShowManualLocationModal(false);
//       Alert.alert('✅ Location Added', `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`);
//     }
//   };

//   // ==================== SUBMIT FUNCTIONS ====================
//   const saveRecording = async () => {
//     if (mediaFiles.length === 0) {
//       Alert.alert('No Content', 'Please add audio or video files first.');
//       return;
//     }
    
//     const hasAnalysis = mediaFiles.some(f => f.aiResults);
//     if (!hasAnalysis) {
//       Alert.alert('Analysis Required', 'Please wait for AI analysis to complete on all files.');
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const userId = await AsyncStorage.getItem('userId');
      
//       if (!userId) {
//         Alert.alert('Authentication Error', 'Please log in again.');
//         setIsSubmitting(false);
//         return;
//       }

//       const analyzedFiles = mediaFiles.filter(f => f.aiResults);
//       let overallNoiseLevel = 'yellow';
      
//       if (analyzedFiles.length > 0) {
//         const hasCritical = analyzedFiles.some(f => 
//           f.aiResults?.severity_name === 'CRITICAL' || 
//           f.aiResults?.severity_name === 'HIGH' ||
//           f.aiResults?.decibel > 85
//         );
//         const hasRed = analyzedFiles.some(f => 
//           f.aiResults?.is_reportable === true || 
//           f.aiResults?.decibel > 70
//         );
//         const hasYellow = analyzedFiles.some(f => f.aiResults?.decibel > 50);
        
//         if (hasCritical) {
//           overallNoiseLevel = 'critical';
//         } else if (hasRed) {
//           overallNoiseLevel = 'red';
//         } else if (hasYellow) {
//           overallNoiseLevel = 'yellow';
//         } else {
//           overallNoiseLevel = 'green';
//         }
//       }

//       const formData = new FormData();
//       formData.append('userId', userId);
//       formData.append('noiseLevel', overallNoiseLevel);
//       formData.append('comment', comment || '');
      
//       for (let i = 0; i < mediaFiles.length; i++) {
//         const file = mediaFiles[i];
//         const fileExtension = file.uri.split('.').pop();
//         const fileName = file.fileName || `file_${i + 1}.${fileExtension}`;
        
//         formData.append('media', {
//           uri: file.uri,
//           type: file.type === 'video' ? `video/${fileExtension}` : `audio/${fileExtension}`,
//           name: fileName,
//         });
        
//         formData.append(`media_${i}_type`, file.type);
//         formData.append(`media_${i}_fileName`, fileName);
//         formData.append(`media_${i}_source`, file.mediaSource || 'downloaded');
        
//         if (file.aiResults) {
//           let fileNoiseValue = 'yellow';
//           if (file.aiResults.is_destructive && file.aiResults.decibel > 70) {
//             fileNoiseValue = 'critical';
//           } else if (file.aiResults.is_reportable || file.aiResults.decibel > 70) {
//             fileNoiseValue = 'red';
//           } else if (file.aiResults.decibel > 50) {
//             fileNoiseValue = 'yellow';
//           } else {
//             fileNoiseValue = 'green';
//           }
          
//           formData.append(`media_${i}_ai_analysis`, JSON.stringify(file.aiResults));
//           formData.append(`media_${i}_ai_decibel`, file.aiResults.decibel?.toString() || '0');
//           formData.append(`media_${i}_ai_noise_level`, file.aiResults.noise_level?.level || 'Medium');
//           formData.append(`media_${i}_ai_noise_value`, fileNoiseValue);
//           formData.append(`media_${i}_ai_noise_description`, file.aiResults.noise_level?.description || '');
          
//           formData.append(`media_${i}_ai_is_reportable`, (file.aiResults.is_reportable || false).toString());
//           formData.append(`media_${i}_ai_severity`, file.aiResults.severity_name || 'NONE');
//           formData.append(`media_${i}_ai_recommendation`, file.aiResults.recommendation || '');
//           formData.append(`media_${i}_ai_reasons`, JSON.stringify(file.aiResults.reasons || []));
          
//           if (file.aiResults.detections && file.aiResults.detections.length > 0) {
//             formData.append(`media_${i}_ai_detections`, JSON.stringify(file.aiResults.detections));
//           }
          
//           if (file.aiResults.distance) {
//             formData.append(`media_${i}_ai_distance_meters`, file.aiResults.distance.meters?.toString() || '0');
//             formData.append(`media_${i}_ai_distance_category`, file.aiResults.distance.category || '');
//           }
//         }
        
//         formData.append(`media_${i}_duration`, file.totalDuration?.toString() || '0');
//       }
      
//       formData.append('total_files', mediaFiles.length.toString());
      
//       if (location) {
//         let locationAddress = '';
//         if (typeof location.address === 'object') {
//           const addr = location.address;
//           locationAddress = addr.street || addr.name || '';
//           if (addr.city) locationAddress += `, ${addr.city}`;
//           if (addr.region) locationAddress += `, ${addr.region}`;
//           if (addr.country) locationAddress += `, ${addr.country}`;
//         } else {
//           locationAddress = location.address || '';
//         }
        
//         formData.append('location', JSON.stringify({
//           latitude: location.latitude,
//           longitude: location.longitude,
//           address: locationAddress,
//           timestamp: location.timestamp,
//           isManual: location.isManual || false
//         }));
        
//         formData.append('location_latitude', location.latitude?.toString() || '');
//         formData.append('location_longitude', location.longitude?.toString() || '');
//         formData.append('location_address_street', locationAddress);
//         formData.append('location_address_city', location.address?.city || '');
//         formData.append('location_address_region', location.address?.region || '');
//         formData.append('location_address_country', location.address?.country || '');
//         formData.append('location_timestamp', location.timestamp || '');
//         formData.append('location_is_manual', (location.isManual || false).toString());
//       }
      
//       formData.append('app_version', Constants.expoConfig?.version || '1.0.0');
//       formData.append('platform', Platform.OS);
//       formData.append('platform_version', Platform.Version?.toString() || '');
//       formData.append('timestamp', new Date().toISOString());

//       const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 120000,
//       });

//       setIsSubmitting(false);

//       const reportableCount = mediaFiles.filter(f => f.aiResults?.is_reportable).length;
//       const severeCount = mediaFiles.filter(f => f.aiResults?.severity_name === 'CRITICAL' || f.aiResults?.severity_name === 'HIGH').length;
      
//       const reportDetails = `✅ Report Submitted!\n\n` +
//         `📁 Files: ${mediaFiles.length}\n` +
//         `⚠️ Reportable: ${reportableCount}\n` +
//         `${severeCount > 0 ? `🚨 Severe: ${severeCount}\n` : ''}` +
//         `🔊 Noise Level: ${overallNoiseLevel.toUpperCase()}\n` +
//         `${location ? `📍 Location Added\n` : ''}`;

//       Alert.alert('✅ Report Submitted', reportDetails, [
//         { 
//           text: 'OK', 
//           onPress: () => {
//             setComment('');
//             setMediaFiles([]);
//             setLocation(null);
//             setLocationError(null);
//             setDisturbanceAlerts([]);
//             setActiveTab('analysis');
//           }
//         }
//       ]);

//     } catch (error) {
//       setIsSubmitting(false);
//       console.error('Error submitting report:', error);
      
//       let errorMessage = 'Failed to submit noise report. Please try again.';
//       if (error.response) {
//         console.error('Server response:', error.response.data);
//         errorMessage = error.response.data?.message || errorMessage;
//       } else if (error.request) {
//         errorMessage = 'Network error. Please check your internet connection.';
//       }
      
//       Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
//     }
//   };

//   const testAIService = async () => {
//     try {
//       setIsAnalyzing(true);
//       const response = await fetch(`${AI_SERVICE_URL}/api/ai/health`, {
//         headers: {
//           'ngrok-skip-browser-warning': 'true',
//           'User-Agent': 'ReactNativeApp/1.0',
//         },
//       });
      
//       const responseData = await response.json();
      
//       let message = `Main Backend: ✅ Online\n`;
      
//       if (responseData.flask_ai) {
//         if (responseData.flask_ai.status === 'healthy') {
//           message += `Flask AI: ✅ Healthy\n`;
//           message += `Model: ${responseData.flask_ai.model}\n`;
//           message += `YAMNet-Trans: ${responseData.flask_ai.yamnet_trans_loaded ? '✅' : '❌'}`;
//         } else {
//           message += `Flask AI: ❌ ${responseData.flask_ai.error || 'Unavailable'}`;
//         }
//       } else {
//         message += `Flask AI: ❌ Not connected`;
//       }
      
//       Alert.alert('Service Status', message, [{ text: 'OK' }]);
      
//     } catch (error) {
//       Alert.alert(
//         'Connection Failed', 
//         `Cannot connect to ${AI_SERVICE_URL}\n\nError: ${error.message}`,
//         [{ text: 'OK' }]
//       );
//     } finally {
//       setIsAnalyzing(false);
//     }
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

//   // ==================== RENDER FUNCTIONS ====================
//   const renderNoiseLevelCard = () => {
//     const analyzedFiles = mediaFiles.filter(f => f.aiResults);
//     if (analyzedFiles.length === 0) return null;
    
//     const hasCritical = analyzedFiles.some(f => 
//       f.aiResults?.severity_name === 'CRITICAL' || 
//       f.aiResults?.severity_name === 'HIGH' ||
//       f.aiResults?.decibel > 85
//     );
//     const hasReportable = analyzedFiles.some(f => f.aiResults?.is_reportable);
//     const maxDecibel = Math.max(...analyzedFiles.map(f => f.aiResults?.decibel || 0));
    
//     let overallLevel = 'green';
//     let overallLabel = 'Low';
//     let overallDescription = 'Mild disturbance';
//     let overallEmoji = '😌';
//     let overallColor = '#4CAF50';
//     let overallBgColor = '#E8F5E9';
    
//     if (hasCritical || maxDecibel > 85) {
//       overallLevel = 'critical';
//       overallLabel = 'Critical';
//       overallDescription = 'Harmful noise level - Immediate action required';
//       overallEmoji = '🚨';
//       overallColor = '#E74C3C';
//       overallBgColor = '#FFEBEE';
//     } else if (hasReportable || maxDecibel > 70) {
//       overallLevel = 'red';
//       overallLabel = 'High';
//       overallDescription = 'Severe disturbance - Reportable';
//       overallEmoji = '😠';
//       overallColor = '#F44336';
//       overallBgColor = '#FFEBEE';
//     } else if (maxDecibel > 50) {
//       overallLevel = 'yellow';
//       overallLabel = 'Medium';
//       overallDescription = 'Moderate noise';
//       overallEmoji = '😐';
//       overallColor = '#FFC107';
//       overallBgColor = '#FFF9C4';
//     }
    
//     return (
//       <LinearGradient
//         colors={[overallBgColor, '#fff']}
//         style={s.noiseLevelCard}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//       >
//         <View style={s.noiseLevelHeader}>
//           <View style={[s.noiseLevelIconContainer, { backgroundColor: overallColor }]}>
//             <Ionicons name={overallLevel === 'critical' ? "alert" : overallLevel === 'red' ? "alert-circle" : overallLevel === 'yellow' ? "warning" : "checkmark-circle"} size={32} color="#fff" />
//           </View>
//           <View style={s.noiseLevelInfo}>
//             <Text style={s.noiseLevelLabel}>{overallLabel} Noise Level</Text>
//             <Text style={s.noiseLevelDesc}>{overallDescription}</Text>
//           </View>
//           <Text style={s.noiseLevelEmoji}>{overallEmoji}</Text>
//         </View>
        
//         <View style={s.noiseLevelMetrics}>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{maxDecibel} dB</Text>
//             <Text style={s.metricLabel}>Highest Volume</Text>
//           </View>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{analyzedFiles.length}</Text>
//             <Text style={s.metricLabel}>Files Analyzed</Text>
//           </View>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{hasReportable ? 'Yes' : 'No'}</Text>
//             <Text style={s.metricLabel}>Reportable</Text>
//           </View>
//         </View>
//       </LinearGradient>
//     );
//   };

//   const renderDetailedAnalysis = (item) => {
//     const isReportable = item.aiResults?.is_reportable;
//     const severity = item.aiResults?.severity_name;
//     const isPlayingThis = playingFileId === item.id;
//     const currentPos = playbackPositionMap[item.id] || 0;
//     const duration = durationMap[item.id] || item.totalDuration || 0;
    
//     if (!item.aiResults && !item.isAnalyzing) {
//       return (
//         <View style={s.analysisCard}>
//           <View style={s.analysisCardHeader}>
//             <View style={s.analysisFileIcon}>
//               <Ionicons name={item.type === 'video' ? 'videocam' : 'musical-notes'} size={24} color="#8B4513" />
//             </View>
//             <View style={s.analysisFileInfo}>
//               <Text style={s.analysisFileName}>{item.fileName || 'Unknown File'}</Text>
//               <View style={s.analysisFileMeta}>
//                 <View style={[s.sourceBadgeSmall, item.mediaSource === 'live' ? s.liveBadgeSmall : s.downloadedBadgeSmall]}>
//                   <Ionicons name={item.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                   <Text style={s.sourceBadgeTextSmall}>{item.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//                 </View>
//               </View>
//             </View>
//             <TouchableOpacity style={s.deleteButton} onPress={() => removeMediaFile(item.id)}>
//               <Ionicons name="close-circle" size={28} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
          
//           {item.isAnalyzing && (
//             <View style={s.analyzingContainer}>
//               <ActivityIndicator size="large" color="#D4AC0D" />
//               <Text style={s.analyzingText}>AI is analyzing this file...</Text>
//             </View>
//           )}
          
//           {item.analysisError && (
//             <View style={s.errorContainer}>
//               <Ionicons name="alert-circle" size={20} color="#E74C3C" />
//               <Text style={s.errorText}>{item.analysisError}</Text>
//             </View>
//           )}
//         </View>
//       );
//     }
    
//     return (
//       <View style={[s.analysisCard, isReportable && (severity === 'CRITICAL' || severity === 'HIGH') && s.criticalCard]}>
//         <View style={s.analysisCardHeader}>
//           <View style={s.analysisFileIcon}>
//             <Ionicons name={item.type === 'video' ? 'videocam' : 'musical-notes'} size={24} color={isReportable ? '#E74C3C' : '#8B4513'} />
//           </View>
//           <View style={s.analysisFileInfo}>
//             <Text style={s.analysisFileName} numberOfLines={1}>{item.fileName || 'Recording'}</Text>
//             <View style={s.analysisFileMeta}>
//               <View style={[s.sourceBadgeSmall, item.mediaSource === 'live' ? s.liveBadgeSmall : s.downloadedBadgeSmall]}>
//                 <Ionicons name={item.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
//                 <Text style={s.sourceBadgeTextSmall}>{item.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//               </View>
//               {duration > 0 && (
//                 <View style={s.durationBadge}>
//                   <Ionicons name="time-outline" size={10} color="#666" />
//                   <Text style={s.durationText}>{formatTime(duration)}</Text>
//                 </View>
//               )}
//               {isReportable && (
//                 <View style={s.reportableBadgeSmall}>
//                   <Ionicons name="alert" size={12} color="#E74C3C" />
//                   <Text style={s.reportableTextSmall}>{severity || 'Reportable'}</Text>
//                 </View>
//               )}
//             </View>
//           </View>
//           <TouchableOpacity style={s.deleteButton} onPress={() => removeMediaFile(item.id)}>
//             <Ionicons name="close-circle" size={28} color="#E74C3C" />
//           </TouchableOpacity>
//         </View>
        
//         {isReportable && (
//           <View style={s.disturbanceInline}>
//             <LinearGradient colors={severity === 'CRITICAL' || severity === 'HIGH' ? ['#E74C3C', '#C0392B'] : ['#E67E22', '#D35400']} style={s.disturbanceInlineGradient}>
//               <Ionicons name={severity === 'CRITICAL' || severity === 'HIGH' ? "alert-circle" : "warning"} size={20} color="#fff" />
//               <View style={s.disturbanceInlineContent}>
//                 <Text style={s.disturbanceInlineTitle}>{severity === 'CRITICAL' || severity === 'HIGH' ? 'URGENT' : 'Reportable'}</Text>
//                 <Text style={s.disturbanceInlineText}>{item.aiResults.recommendation?.substring(0, 60)}...</Text>
//               </View>
//             </LinearGradient>
//           </View>
//         )}
        
//         <View style={s.analysisMetrics}>
//           <View style={s.metricLarge}>
//             <Text style={s.metricLargeValue}>{item.aiResults?.decibel || 0} dB</Text>
//             <Text style={s.metricLargeLabel}>Measured</Text>
//           </View>
//           {item.aiResults?.distance && (
//             <View style={s.metricLarge}>
//               <Text style={s.metricLargeValue}>{item.aiResults.distance.meters || '?'}m</Text>
//               <Text style={s.metricLargeLabel}>Distance</Text>
//             </View>
//           )}
//           <View style={s.metricLarge}>
//             <Text style={s.metricLargeValue}>{item.aiResults?.noise_level?.level || 'N/A'}</Text>
//             <Text style={s.metricLargeLabel}>Noise Level</Text>
//           </View>
//         </View>
        
//         {/* Playback Controls */}
//         {(item.type === 'audio' || item.type === 'video') && (
//           <View style={s.playbackSection}>
//             <TouchableOpacity 
//               style={s.playButton}
//               onPress={() => {
//                 if (isPlayingThis) {
//                   if (soundRef.current) {
//                     soundRef.current.pauseAsync();
//                     setIsPlaying(false);
//                     setPlayingFileId(null);
//                   }
//                 } else {
//                   playMedia(item.id, item.uri);
//                 }
//               }}
//             >
//               <LinearGradient 
//                 colors={isPlayingThis ? ['#E74C3C', '#C0392B'] : ['#D4AC0D', '#8B4513']} 
//                 style={s.playButtonGradient}
//               >
//                 <Ionicons name={isPlayingThis ? "pause" : "play"} size={24} color="#fff" />
//               </LinearGradient>
//             </TouchableOpacity>
            
//             <View style={s.progressSection}>
//               <View style={s.progressBar}>
//                 <View style={[s.progressFill, { width: `${duration > 0 ? (currentPos / duration) * 100 : 0}%` }]} />
//               </View>
//               <View style={s.timeLabels}>
//                 <Text style={s.timeText}>{formatTime(currentPos)}</Text>
//                 <Text style={s.timeText}>{formatTime(duration)}</Text>
//               </View>
//             </View>
//           </View>
//         )}
        
//         {/* Top Detections */}
//         {item.aiResults?.detections && item.aiResults.detections.length > 0 && (
//           <View style={s.detectionsSection}>
//             <Text style={s.detectionsTitle}>Top Detected Sounds</Text>
//             {item.aiResults.detections.slice(0, 3).map((detection, idx) => {
//               const confidencePercent = (detection.confidence * 100).toFixed(1);
//               return (
//                 <View key={idx} style={s.detectionRow}>
//                   <View style={s.detectionRankContainer}>
//                     <LinearGradient
//                       colors={idx === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
//                       style={s.detectionRankBadge}
//                     >
//                       <Text style={s.detectionRankText}>{idx + 1}</Text>
//                     </LinearGradient>
//                   </View>
//                   <View style={s.detectionInfo}>
//                     <Text style={s.detectionName}>{detection.class}</Text>
//                     <View style={s.detectionConfidenceBar}>
//                       <View style={s.detectionConfidenceBg}>
//                         <LinearGradient
//                           colors={idx === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
//                           style={[s.detectionConfidenceFill, { width: `${confidencePercent}%` }]}
//                         />
//                       </View>
//                       <Text style={s.detectionConfidenceText}>{confidencePercent}%</Text>
//                     </View>
//                   </View>
//                 </View>
//               );
//             })}
//           </View>
//         )}
        
//         {/* Reasons if Reportable */}
//         {isReportable && item.aiResults?.reasons && item.aiResults.reasons.length > 0 && (
//           <View style={s.reasonsSection}>
//             <Text style={s.reasonsTitle}>Reasons:</Text>
//             {item.aiResults.reasons.slice(0, 2).map((reason, idx) => (
//               <View key={idx} style={s.reasonRow}>
//                 <Ionicons name="alert-circle" size={14} color="#E74C3C" />
//                 <Text style={s.reasonText}>{reason}</Text>
//               </View>
//             ))}
//           </View>
//         )}
        
//         {/* Action Buttons */}
//         <View style={s.analysisActions}>
//           <TouchableOpacity style={s.actionBtn} onPress={() => shareAnalysisReport(item)}>
//             <Ionicons name="share-outline" size={18} color="#8B4513" />
//             <Text style={s.actionBtnText}>Share</Text>
//           </TouchableOpacity>
//           <TouchableOpacity 
//             style={[s.actionBtn, s.deleteActionBtn]} 
//             onPress={() => removeMediaFile(item.id)}
//           >
//             <Ionicons name="trash-outline" size={18} color="#E74C3C" />
//             <Text style={[s.actionBtnText, s.deleteActionText]}>Delete</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   };

//   const renderMediaModal = () => {
//     return (
//       <Modal
//         visible={isMediaModalVisible}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => setIsMediaModalVisible(false)}
//       >
//         <View style={s.modalOverlay}>
//           <View style={s.modalContent}>
//             <View style={s.modalHeader}>
//               <Text style={s.modalTitle}>Add Media</Text>
//               <TouchableOpacity onPress={() => setIsMediaModalVisible(false)}>
//                 <Ionicons name="close" size={24} color="#666" />
//               </TouchableOpacity>
//             </View>
            
//             <ScrollView showsVerticalScrollIndicator={false}>
//               <View style={s.modalSection}>
//                 <Text style={s.modalSectionTitle}>
//                   <Ionicons name="mic" size={18} color="#8B4513" /> Audio
//                 </Text>
//                 <View style={s.modalOptionsRow}>
//                   <TouchableOpacity style={s.modalOption} onPress={startRecording}>
//                     <LinearGradient colors={['#2196F3', '#1976D2']} style={s.modalOptionGradient}>
//                       <Ionicons name="mic" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Record Audio</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                   <TouchableOpacity style={s.modalOption} onPress={pickAudioFiles}>
//                     <LinearGradient colors={['#4CAF50', '#388E3C']} style={s.modalOptionGradient}>
//                       <Ionicons name="folder-open" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Choose Audio</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </View>
//               </View>
              
//               <View style={s.modalSection}>
//                 <Text style={s.modalSectionTitle}>
//                   <Ionicons name="videocam" size={18} color="#8B4513" /> Video
//                 </Text>
//                 <View style={s.modalOptionsRow}>
//                   <TouchableOpacity style={s.modalOption} onPress={recordVideo}>
//                     <LinearGradient colors={['#E91E63', '#C2185B']} style={s.modalOptionGradient}>
//                       <Ionicons name="videocam" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Record Video</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                   <TouchableOpacity style={s.modalOption} onPress={pickVideoFromGallery}>
//                     <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={s.modalOptionGradient}>
//                       <Ionicons name="images" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>From Gallery</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                   <TouchableOpacity style={s.modalOption} onPress={pickVideoFiles}>
//                     <LinearGradient colors={['#FF9800', '#F57C00']} style={s.modalOptionGradient}>
//                       <Ionicons name="folder-open" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Choose Video</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </ScrollView>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderManualLocationModal = () => {
//     return (
//       <Modal
//         visible={showManualLocationModal}
//         transparent={true}
//         animationType="slide"
//         onRequestClose={() => setShowManualLocationModal(false)}
//       >
//         <View style={s.modalOverlay}>
//           <View style={s.mapModalContent}>
//             <View style={s.modalHeader}>
//               <Text style={s.modalTitle}>Select Location on Map</Text>
//               <TouchableOpacity onPress={() => setShowManualLocationModal(false)}>
//                 <Ionicons name="close" size={24} color="#666" />
//               </TouchableOpacity>
//             </View>
            
//             <View style={s.searchContainer}>
//               <View style={s.searchInputContainer}>
//                 <Ionicons name="search" size={20} color="#999" style={s.searchIcon} />
//                 <TextInput
//                   style={s.searchInput}
//                   placeholder="Search for a location..."
//                   placeholderTextColor="#999"
//                   value={searchQuery}
//                   onChangeText={setSearchQuery}
//                   onSubmitEditing={searchLocation}
//                   returnKeyType="search"
//                 />
//                 {searchQuery.length > 0 && (
//                   <TouchableOpacity onPress={() => setSearchQuery('')}>
//                     <Ionicons name="close-circle" size={20} color="#999" />
//                   </TouchableOpacity>
//                 )}
//               </View>
//               <TouchableOpacity style={s.searchButton} onPress={searchLocation} disabled={isSearching}>
//                 <LinearGradient colors={['#8B4513', '#654321']} style={s.searchButtonGradient}>
//                   <Text style={s.searchButtonText}>{isSearching ? 'Searching...' : 'Search'}</Text>
//                 </LinearGradient>
//               </TouchableOpacity>
//             </View>
            
//             {searchResults.length > 0 && (
//               <View style={s.searchResultsContainer}>
//                 <ScrollView style={s.searchResultsScroll} nestedScrollEnabled>
//                   {searchResults.map((result, index) => (
//                     <TouchableOpacity
//                       key={index}
//                       style={s.searchResultItem}
//                       onPress={() => selectSearchResult(result)}
//                     >
//                       <Ionicons name="location-outline" size={18} color="#8B4513" />
//                       <Text style={s.searchResultText} numberOfLines={2}>{result.display_name}</Text>
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </View>
//             )}
            
//             <View style={s.mapContainer}>
//               <MapView
//                 ref={mapRef}
//                 style={s.map}
//                 initialRegion={{
//                   latitude: 14.5995,
//                   longitude: 120.9842,
//                   latitudeDelta: 0.0922,
//                   longitudeDelta: 0.0421,
//                 }}
//                 onPress={(e) => {
//                   const { latitude, longitude } = e.nativeEvent.coordinate;
//                   setSelectedMapLocation({ latitude, longitude });
//                 }}
//               >
//                 {selectedMapLocation && (
//                   <Marker
//                     coordinate={selectedMapLocation}
//                     draggable
//                     onDragEnd={(e) => {
//                       setSelectedMapLocation(e.nativeEvent.coordinate);
//                     }}
//                   />
//                 )}
//               </MapView>
//             </View>
            
//             <View style={s.mapInstructions}>
//               <Ionicons name="finger-print" size={20} color="#8B4513" />
//               <Text style={s.mapInstructionsText}>Tap on map to place marker, drag to adjust</Text>
//             </View>
            
//             <TouchableOpacity style={s.confirmLocationBtn} onPress={confirmManualLocation}>
//               <LinearGradient colors={['#8B4513', '#654321']} style={s.confirmLocationGradient}>
//                 <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                 <Text style={s.confirmLocationText}>Confirm Location</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     );
//   };

//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'analysis':
//         return (
//           <View style={s.tabContent}>
//             {renderNoiseLevelCard()}
            
//             {disturbanceAlerts.length > 0 && (
//               <View style={s.alertSummary}>
//                 <LinearGradient colors={['#FFEBEE', '#FFCDD2']} style={s.alertSummaryGradient}>
//                   <Ionicons name="warning" size={24} color="#E74C3C" />
//                   <View style={s.alertSummaryContent}>
//                     <Text style={s.alertSummaryTitle}>
//                       {disturbanceAlerts.length} Reportable Noise(s) Detected
//                     </Text>
//                     <Text style={s.alertSummaryText}>
//                       {disturbanceAlerts.filter(a => a.disturbance.severity_name === 'CRITICAL' || a.disturbance.severity_name === 'HIGH').length} severe violations
//                     </Text>
//                   </View>
//                 </LinearGradient>
//               </View>
//             )}
            
//             {mediaFiles.length > 0 ? (
//               <FlatList
//                 data={mediaFiles}
//                 renderItem={({ item }) => renderDetailedAnalysis(item)}
//                 keyExtractor={item => item.id}
//                 scrollEnabled={false}
//                 contentContainerStyle={s.detailedAnalysisContainer}
//               />
//             ) : (
//               <View style={s.emptyAnalysis}>
//                 <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
//                   <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
//                 </Animated.View>
//                 <Text style={s.emptyTitle}>No Media Added</Text>
//                 <Text style={s.emptyText}>Tap the + button to add audio or video files</Text>
//                 <Text style={s.emptySubtext}>AI will analyze each file separately</Text>
//               </View>
//             )}
//           </View>
//         );

//       case 'details':
//         return (
//           <View style={s.tabContent}>
//             <View style={s.detailsCard}>
//               <View style={s.sectionHeader}>
//                 <Ionicons name="chatbubble-outline" size={20} color="#8B4513" />
//                 <Text style={s.sectionHeaderTitle}>Additional Details</Text>
//               </View>
//               <TextInput 
//                 style={s.detailsInput} 
//                 placeholder="Describe the noise issue (optional)" 
//                 placeholderTextColor="#999" 
//                 multiline 
//                 numberOfLines={4} 
//                 value={comment} 
//                 onChangeText={setComment} 
//                 maxLength={500} 
//                 textAlignVertical="top" 
//               />
//               <Text style={s.charCount}>{comment.length}/500</Text>
//             </View>
//           </View>
//         );

//       case 'location':
//         return (
//           <View style={s.tabContent}>
//             <View style={s.locationCard}>
//               <View style={s.sectionHeader}>
//                 <Ionicons name="location-outline" size={20} color="#8B4513" />
//                 <Text style={s.sectionHeaderTitle}>Location</Text>
//               </View>
              
//               {!location ? (
//                 <>
//                   <TouchableOpacity 
//                     style={s.addLocationBtn} 
//                     onPress={getUserLocation} 
//                     disabled={locationLoading}
//                   >
//                     <LinearGradient
//                       colors={['#8B4513', '#654321']}
//                       style={s.addLocationGradient}
//                     >
//                       <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#D4AC0D" />
//                       <Text style={s.addLocationText}>
//                         {locationLoading ? 'Getting Location...' : 'Use Current Location'}
//                       </Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
                  
//                   <View style={s.orDivider}>
//                     <View style={s.dividerLine} />
//                     <Text style={s.dividerText}>OR</Text>
//                     <View style={s.dividerLine} />
//                   </View>
                  
//                   <TouchableOpacity 
//                     style={s.addLocationBtn} 
//                     onPress={openManualLocationPicker}
//                   >
//                     <LinearGradient
//                       colors={['#D4AC0D', '#8B4513']}
//                       style={s.addLocationGradient}
//                     >
//                       <Ionicons name="map" size={24} color="#fff" />
//                       <Text style={s.addLocationText}>Select on Map</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </>
//               ) : (
//                 <View style={s.locationInfoCard}>
//                   <View style={s.locationHeader}>
//                     <View style={s.locationBadge}>
//                       <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
//                       <Text style={s.locationBadgeText}>
//                         Location Added {location.isManual ? '(Manual)' : '(GPS)'}
//                       </Text>
//                     </View>
//                     <TouchableOpacity onPress={() => setLocation(null)} style={s.removeLocationBtn}>
//                       <Ionicons name="close" size={20} color="#E74C3C" />
//                     </TouchableOpacity>
//                   </View>
                  
//                   <View style={s.locationDetails}>
//                     <Text style={s.locationAddress}>
//                       {location.address?.street || location.address?.name || 'Selected Location'}
//                     </Text>
//                     {location.address?.city && (
//                       <Text style={s.locationCity}>
//                         {location.address.city}, {location.address.region || ''}
//                       </Text>
//                     )}
//                   </View>
                  
//                   <TouchableOpacity style={s.refreshLocationBtn} onPress={getUserLocation}>
//                     <Ionicons name="refresh" size={18} color="#8B4513" />
//                     <Text style={s.refreshLocationText}>Refresh GPS Location</Text>
//                   </TouchableOpacity>
//                 </View>
//               )}
              
//               {locationError && (
//                 <View style={s.locationError}>
//                   <Ionicons name="alert-circle" size={20} color="#E74C3C" />
//                   <Text style={s.locationErrorText}>{locationError}</Text>
//                 </View>
//               )}
//             </View>
//           </View>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <SafeAreaView style={s.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       <LinearGradient colors={['#8B4513', '#654321']} style={s.header}>
//         <View style={s.headerContent}>
//           <View style={s.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={s.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}>
//               <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={testAIService} style={s.headerButton}>
//               <Ionicons name="wifi" size={24} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={s.headerTitle}>Noise Report</Text>
//           <Text style={s.headerSubtitle}>
//             {isRecording ? 'Recording in progress...' : 
//              mediaFiles.length > 0 ? `${mediaFiles.length} file(s) ready` : 
//              'Add media files for analysis'}
//           </Text>
//         </View>
//       </LinearGradient>

//       {isRecording && (
//         <View style={s.recordingControlContainer}>
//           <LinearGradient colors={['#E74C3C', '#C0392B']} style={s.recordingControlGradient}>
//             <View style={s.recordingInfo}>
//               <View style={s.recordingDot} />
//               <Text style={s.recordingTimer}>{formatTime(recordingDuration)}</Text>
//             </View>
//             <TouchableOpacity style={s.stopRecordingButton} onPress={stopRecording}>
//               <Ionicons name="stop-circle" size={32} color="#fff" />
//               <Text style={s.stopRecordingText}>Stop Recording</Text>
//             </TouchableOpacity>
//           </LinearGradient>
//         </View>
//       )}

//       {!isRecording && (
//         <TouchableOpacity style={s.addMediaButton} onPress={() => setIsMediaModalVisible(true)}>
//           <LinearGradient colors={['#D4AC0D', '#8B4513']} style={s.addMediaGradient}>
//             <Ionicons name="add-circle" size={28} color="#fff" />
//             <Text style={s.addMediaText}>Add Media Files</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       )}

//       {mediaFiles.length > 0 && !isRecording && (
//         <View style={s.tabsContainer}>
//           <TouchableOpacity
//             style={[s.tab, activeTab === 'analysis' && s.activeTab]}
//             onPress={() => setActiveTab('analysis')}
//           >
//             <Ionicons name="analytics" size={20} color={activeTab === 'analysis' ? '#8B4513' : '#999'} />
//             <Text style={[s.tabText, activeTab === 'analysis' && s.activeTabText]}>Analysis</Text>
//             {disturbanceAlerts.length > 0 && activeTab !== 'analysis' && <View style={s.notificationDot} />}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'details' && s.activeTab]}
//             onPress={() => setActiveTab('details')}
//           >
//             <Ionicons name="document-text" size={20} color={activeTab === 'details' ? '#8B4513' : '#999'} />
//             <Text style={[s.tabText, activeTab === 'details' && s.activeTabText]}>Details</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'location' && s.activeTab]}
//             onPress={() => setActiveTab('location')}
//           >
//             <Ionicons name="location" size={20} color={activeTab === 'location' ? '#8B4513' : '#999'} />
//             <Text style={[s.tabText, activeTab === 'location' && s.activeTabText]}>Location</Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       <ScrollView 
//         style={s.tabContentContainer} 
//         contentContainerStyle={s.tabContentContainerContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {renderTabContent()}

//         {mediaFiles.length > 0 && !isRecording && (
//           <TouchableOpacity
//             onPress={saveRecording}
//             style={[s.submitBtn, (mediaFiles.some(f => f.isAnalyzing) || isSubmitting) && s.submitBtnDisabled]}
//             disabled={mediaFiles.some(f => f.isAnalyzing) || isSubmitting}
//           >
//             <LinearGradient colors={['#8B4513', '#654321']} style={s.submitGradient}>
//               {isSubmitting ? (
//                 <>
//                   <ActivityIndicator size="small" color="#D4AC0D" />
//                   <Text style={s.submitText}>Submitting...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                   <Text style={s.submitText}>Submit Report ({mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''})</Text>
//                   {disturbanceAlerts.length > 0 && (
//                     <View style={s.reportableIndicator}>
//                       <Ionicons name="alert" size={16} color="#E74C3C" />
//                     </View>
//                   )}
//                 </>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>
//         )}
//       </ScrollView>

//       {renderMediaModal()}
//       {renderManualLocationModal()}

//       <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
//         <View style={s.modalContainer}>
//           <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
//             <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
//           </Animated.View>
//           <Animated.View style={[s.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
//             <CustomDrawer navigation={navigation} onClose={closeDrawer} />
//           </Animated.View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const s = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f5f5f5' },
  
//   header: { 
//     paddingTop: getStatusBarHeight(), 
//     paddingBottom: 15, 
//     paddingHorizontal: 20,
//     borderBottomLeftRadius: 25,
//     borderBottomRightRadius: 25,
//   },
//   headerContent: { marginTop: 5 },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
//   headerButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
//   headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
//   headerSubtitle: { fontSize: 14, color: '#D4AC0D', opacity: 0.9 },

//   recordingControlContainer: {
//     marginHorizontal: 15,
//     marginTop: 15,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 5,
//   },
//   recordingControlGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//   },
//   recordingInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
//   recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
//   recordingTimer: { fontSize: 24, fontWeight: 'bold', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
//   stopRecordingButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25 },
//   stopRecordingText: { color: '#fff', fontSize: 14, fontWeight: '600' },

//   addMediaButton: { marginHorizontal: 15, marginTop: 15, borderRadius: 15, overflow: 'hidden', elevation: 3 },
//   addMediaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
//   addMediaText: { color: '#fff', fontSize: 16, fontWeight: '600' },

//   tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, borderRadius: 15, padding: 5, elevation: 2 },
//   tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, position: 'relative' },
//   activeTab: { backgroundColor: '#f5f5f5' },
//   tabText: { fontSize: 14, color: '#999', fontWeight: '500' },
//   activeTabText: { color: '#8B4513', fontWeight: '600' },
//   notificationDot: { position: 'absolute', top: 8, right: '30%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' },

//   tabContentContainer: { flex: 1 },
//   tabContentContainerContent: { paddingHorizontal: 15, paddingBottom: 30 },
//   tabContent: { gap: 15 },

//   noiseLevelCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f0f0f0', elevation: 3, marginBottom: 15 },
//   noiseLevelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
//   noiseLevelIconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
//   noiseLevelInfo: { flex: 1 },
//   noiseLevelLabel: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
//   noiseLevelDesc: { fontSize: 13, color: '#666' },
//   noiseLevelEmoji: { fontSize: 32 },
//   noiseLevelMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
//   metricItem: { alignItems: 'center' },
//   metricValue: { fontSize: 24, fontWeight: 'bold', color: '#8B4513', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
//   metricLabel: { fontSize: 12, color: '#999', marginTop: 4 },

//   alertSummary: { borderRadius: 16, overflow: 'hidden', marginBottom: 5 },
//   alertSummaryGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
//   alertSummaryContent: { flex: 1 },
//   alertSummaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#E74C3C' },
//   alertSummaryText: { fontSize: 12, color: '#E74C3C', opacity: 0.8, marginTop: 2 },

//   emptyAnalysis: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center' },
//   emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginTop: 15, marginBottom: 8 },
//   emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
//   emptySubtext: { fontSize: 12, color: '#ccc', marginTop: 8, textAlign: 'center' },

//   detailedAnalysisContainer: { gap: 16, paddingBottom: 20 },
//   analysisCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0' },
//   criticalCard: { backgroundColor: '#FFF5F5', borderColor: '#FFCDD2' },
//   analysisCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
//   analysisFileIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
//   analysisFileInfo: { flex: 1 },
//   analysisFileName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
//   analysisFileMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
//   sourceBadgeSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
//   liveBadgeSmall: { backgroundColor: '#4CAF50' },
//   downloadedBadgeSmall: { backgroundColor: '#2196F3' },
//   sourceBadgeTextSmall: { fontSize: 10, color: '#fff', fontWeight: '600' },
//   durationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 3 },
//   durationText: { fontSize: 10, color: '#666' },
//   reportableBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
//   reportableTextSmall: { fontSize: 10, color: '#E74C3C', fontWeight: '600' },
//   deleteButton: { padding: 4, marginLeft: 4 },

//   disturbanceInline: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
//   disturbanceInlineGradient: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
//   disturbanceInlineContent: { flex: 1 },
//   disturbanceInlineTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
//   disturbanceInlineText: { color: '#fff', fontSize: 10, opacity: 0.9, marginTop: 2 },

//   analysisMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
//   metricLarge: { alignItems: 'center' },
//   metricLargeValue: { fontSize: 28, fontWeight: 'bold', color: '#8B4513' },
//   metricLargeLabel: { fontSize: 12, color: '#999', marginTop: 4 },

//   playbackSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
//   playButton: { borderRadius: 30, overflow: 'hidden', elevation: 3 },
//   playButtonGradient: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
//   progressSection: { flex: 1 },
//   progressBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
//   progressFill: { height: '100%', backgroundColor: '#D4AC0D', borderRadius: 3 },
//   timeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
//   timeText: { fontSize: 12, color: '#666' },

//   detectionsSection: { marginBottom: 16 },
//   detectionsTitle: { fontSize: 14, fontWeight: '600', color: '#8B4513', marginBottom: 12 },
//   detectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
//   detectionRankContainer: { width: 32 },
//   detectionRankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
//   detectionRankText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
//   detectionInfo: { flex: 1 },
//   detectionName: { fontSize: 13, fontWeight: '500', color: '#333', marginBottom: 4 },
//   detectionConfidenceBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   detectionConfidenceBg: { flex: 1, height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, overflow: 'hidden' },
//   detectionConfidenceFill: { height: '100%', borderRadius: 2 },
//   detectionConfidenceText: { fontSize: 11, color: '#666', width: 40 },

//   reasonsSection: { backgroundColor: '#FFF9C4', borderRadius: 12, padding: 12, marginBottom: 16 },
//   reasonsTitle: { fontSize: 11, fontWeight: 'bold', color: '#E67E22', marginBottom: 6 },
//   reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
//   reasonText: { fontSize: 11, color: '#666', flex: 1 },

//   analysisActions: { flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
//   actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f5f5f5', borderRadius: 20 },
//   actionBtnText: { fontSize: 12, color: '#8B4513' },
//   deleteActionBtn: { backgroundColor: '#FFEBEE' },
//   deleteActionText: { color: '#E74C3C' },

//   analyzingContainer: { alignItems: 'center', paddingVertical: 20, gap: 12 },
//   analyzingText: { fontSize: 14, color: '#8B4513' },
//   errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 10, marginTop: 10, gap: 8 },
//   errorText: { fontSize: 12, color: '#E74C3C', flex: 1 },

//   detailsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 },
//   sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
//   sectionHeaderTitle: { fontSize: 16, fontWeight: '600', color: '#8B4513' },
//   detailsInput: { borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: '#f8f9fa', minHeight: 100 },
//   charCount: { textAlign: 'right', fontSize: 12, color: '#999', marginTop: 8 },

//   locationCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 },
//   addLocationBtn: { borderRadius: 15, overflow: 'hidden', marginTop: 5 },
//   addLocationGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
//   addLocationText: { color: '#D4AC0D', fontSize: 16, fontWeight: '600' },
//   orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
//   dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
//   dividerText: { marginHorizontal: 10, color: '#999', fontSize: 12 },
//   locationInfoCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 15, marginTop: 5 },
//   locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//   locationBadgeText: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
//   removeLocationBtn: { padding: 4 },
//   locationDetails: { marginBottom: 12 },
//   locationAddress: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
//   locationCity: { fontSize: 14, color: '#666', marginBottom: 12 },
//   refreshLocationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
//   refreshLocationText: { fontSize: 13, color: '#8B4513', fontWeight: '500' },
//   locationError: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 10, marginTop: 10, gap: 8 },
//   locationErrorText: { fontSize: 13, color: '#E74C3C', flex: 1 },

//   submitBtn: { marginTop: 10, marginBottom: 20, borderRadius: 15, overflow: 'hidden', elevation: 3 },
//   submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
//   submitText: { color: '#D4AC0D', fontSize: 18, fontWeight: 'bold' },
//   submitBtnDisabled: { opacity: 0.5 },
//   reportableIndicator: { backgroundColor: '#FFEBEE', padding: 4, borderRadius: 12, marginLeft: 8 },

//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
//   modalContent: { backgroundColor: '#fff', borderRadius: 25, width: width - 40, maxHeight: height * 0.8, padding: 20 },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
//   modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B4513' },
//   modalSection: { marginBottom: 24 },
//   modalSectionTitle: { fontSize: 16, fontWeight: '600', color: '#8B4513', marginBottom: 12 },
//   modalOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
//   modalOption: { flex: 1, minWidth: (width - 80) / 2 - 12, borderRadius: 15, overflow: 'hidden', elevation: 2 },
//   modalOptionGradient: { alignItems: 'center', paddingVertical: 16, gap: 8 },
//   modalOptionText: { color: '#fff', fontSize: 12, fontWeight: '600' },

//   mapModalContent: { backgroundColor: '#fff', borderRadius: 25, width: width - 20, height: height * 0.7, padding: 20 },
//   searchContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
//   searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e0e0e0' },
//   searchIcon: { marginRight: 8 },
//   searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#333' },
//   searchButton: { borderRadius: 12, overflow: 'hidden' },
//   searchButtonGradient: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
//   searchButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
//   searchResultsContainer: { maxHeight: 200, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
//   searchResultsScroll: { maxHeight: 200 },
//   searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 10 },
//   searchResultText: { flex: 1, fontSize: 13, color: '#333' },
//   mapContainer: { flex: 1, borderRadius: 15, overflow: 'hidden', marginVertical: 12 },
//   map: { width: '100%', height: '100%' },
//   mapInstructions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 10 },
//   mapInstructionsText: { fontSize: 12, color: '#666' },
//   confirmLocationBtn: { borderRadius: 15, overflow: 'hidden', marginTop: 10 },
//   confirmLocationGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
//   confirmLocationText: { color: '#D4AC0D', fontSize: 16, fontWeight: 'bold' },
// });





import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
  Dimensions, Platform, ScrollView, Alert, TextInput, ActivityIndicator,
  Share, SafeAreaView, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import axios from 'axios';
import API_BASE_URL from '../../utils/api';
import CustomDrawer from '../CustomDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

export default function AudioRecordingScreen({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [comment, setComment] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [disturbanceAlerts, setDisturbanceAlerts] = useState([]);
  const [analyzingFileId, setAnalyzingFileId] = useState(null);
  const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
  const [playingFileId, setPlayingFileId] = useState(null);
  const [playbackPositionMap, setPlaybackPositionMap] = useState({});
  const [durationMap, setDurationMap] = useState({});
  const [analyzingProgress, setAnalyzingProgress] = useState(0);

  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingInterval = useRef(null);
  const soundRef = useRef(null);
  const analyzingInterval = useRef(null);

  const AI_SERVICE_URL = 'https://ma1chan-noisewatch-ml.hf.space';

  // Auto-get location when component mounts
  useEffect(() => {
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await ImagePicker.requestCameraPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        // Auto-get location on mount
        await getCurrentLocation();
      } catch (error) {
        console.error('Error setting up:', error);
      }
    })();
    
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (analyzingInterval.current) {
        clearInterval(analyzingInterval.current);
      }
    };
  }, []);

  // Auto-get location function
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setLocationLoading(false);
        return;
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High 
      });
      
      const address = await Location.reverseGeocodeAsync({ 
        latitude: currentLocation.coords.latitude, 
        longitude: currentLocation.coords.longitude 
      });
      
      const addressData = address[0] || {};
      const cleanAddress = {
        street: addressData.street || addressData.name || '',
        city: addressData.city || addressData.subregion || '',
        region: addressData.region || '',
        country: addressData.country || '',
        postalCode: addressData.postalCode || '',
        name: addressData.name || ''
      };
      
      setLocation({ 
        latitude: currentLocation.coords.latitude, 
        longitude: currentLocation.coords.longitude, 
        address: cleanAddress,
        timestamp: new Date().toISOString(),
        isManual: false
      });
      
    } catch (error) {
      console.error('Auto location error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Start analyzing progress animation
  const startAnalyzingProgress = () => {
    setAnalyzingProgress(0);
    if (analyzingInterval.current) {
      clearInterval(analyzingInterval.current);
    }
    analyzingInterval.current = setInterval(() => {
      setAnalyzingProgress(prev => {
        if (prev >= 90) {
          return prev;
        }
        return prev + 10;
      });
    }, 1000);
  };

  // Stop analyzing progress and complete
  const stopAnalyzingProgress = () => {
    if (analyzingInterval.current) {
      clearInterval(analyzingInterval.current);
      analyzingInterval.current = null;
    }
    setAnalyzingProgress(100);
    setTimeout(() => {
      setAnalyzingProgress(0);
    }, 500);
  };

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== MEDIA MANAGEMENT FUNCTIONS ====================
  const startRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: { 
          extension: '.m4a', 
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4, 
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC, 
          sampleRate: 16000, 
          numberOfChannels: 1, 
          bitRate: 128000 
        },
        ios: { 
          extension: '.m4a', 
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC, 
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM, 
          sampleRate: 16000, 
          numberOfChannels: 1, 
          bitRate: 128000, 
          linearPCMBitDepth: 16, 
          linearPCMIsBigEndian: false, 
          linearPCMIsFloat: false 
        },
      });
      
      const fileId = Date.now().toString();
      const newFile = {
        id: fileId,
        uri: null,
        fileName: 'New Recording',
        type: 'audio',
        isRecording: true,
        recording: newRecording,
        duration: 0,
        aiResults: null,
        isAnalyzing: false,
        mediaSource: 'live',
        totalDuration: 0
      };
      
      setMediaFiles(prev => [...prev, newFile]);
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setAnalyzingFileId(fileId);
      setIsMediaModalVisible(false);
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
        setMediaFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, duration: f.duration + 1 } : f
        ));
      }, 1000);
      
    } catch (err) {
      console.error('Start recording error:', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setMediaFiles(prev => prev.map(f => 
        f.id === analyzingFileId ? { 
          ...f, 
          uri: uri,
          isRecording: false,
          recording: null,
          totalDuration: recordingDuration
        } : f
      ));
      
      setIsRecording(false);
      setRecording(null);
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
      
      if (uri) {
        startAnalyzingProgress();
        setTimeout(() => {
          analyzeMediaFile(analyzingFileId, uri, 'audio');
        }, 500);
      }
    } catch (err) {
      console.error('Stop recording error:', err);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const pickAudioFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = [];
        
        for (const asset of result.assets) {
          const fileUri = asset.uri;
          const fileName = asset.name;
          const fileId = Date.now().toString() + Math.random();
          
          let duration = 0;
          try {
            const { sound: tempSound } = await Audio.Sound.createAsync({ uri: fileUri });
            const status = await tempSound.getStatusAsync();
            duration = Math.floor(status.durationMillis / 1000);
            await tempSound.unloadAsync();
          } catch (e) {
            console.error('Error getting duration:', e);
          }
          
          newFiles.push({
            id: fileId,
            uri: fileUri,
            fileName: fileName,
            type: 'audio',
            isRecording: false,
            duration: 0,
            totalDuration: duration,
            aiResults: null,
            isAnalyzing: true,
            mediaSource: 'downloaded'
          });
        }
        
        setMediaFiles(prev => [...prev, ...newFiles]);
        startAnalyzingProgress();
        
        for (const file of newFiles) {
          setAnalyzingFileId(file.id);
          await analyzeMediaFile(file.id, file.uri, 'audio');
        }
      }
    } catch (error) {
      console.error('Error picking audio files:', error);
      Alert.alert('Error', 'Failed to pick audio files');
    }
  };

  const recordVideo = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
        videoMaxDuration: 60
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        const fileId = Date.now().toString();
        
        const newFile = {
          id: fileId,
          uri: videoUri,
          fileName: `Video_${new Date().toISOString().slice(0, 19)}`,
          type: 'video',
          isRecording: false,
          duration: 0,
          aiResults: null,
          isAnalyzing: true,
          mediaSource: 'live'
        };
        
        setMediaFiles(prev => [...prev, newFile]);
        setAnalyzingFileId(fileId);
        setIsMediaModalVisible(false);
        startAnalyzingProgress();
        await analyzeMediaFile(fileId, videoUri, 'video');
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const pickVideoFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        allowsMultipleSelection: false,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        const fileName = result.assets[0].fileName || `video_${Date.now()}.mp4`;
        const fileId = Date.now().toString() + Math.random();
        
        const newFile = {
          id: fileId,
          uri: videoUri,
          fileName: fileName,
          type: 'video',
          isRecording: false,
          duration: 0,
          aiResults: null,
          isAnalyzing: true,
          mediaSource: 'downloaded'
        };
        
        setMediaFiles(prev => [...prev, newFile]);
        setAnalyzingFileId(fileId);
        startAnalyzingProgress();
        await analyzeMediaFile(fileId, videoUri, 'video');
      }
    } catch (error) {
      console.error('Error picking videos from gallery:', error);
      Alert.alert('Error', 'Failed to pick videos from gallery');
    }
  };

  const pickVideoFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = [];
        
        for (const asset of result.assets) {
          const fileUri = asset.uri;
          const fileName = asset.name;
          const fileId = Date.now().toString() + Math.random();
          
          newFiles.push({
            id: fileId,
            uri: fileUri,
            fileName: fileName,
            type: 'video',
            isRecording: false,
            duration: 0,
            aiResults: null,
            isAnalyzing: true,
            mediaSource: 'downloaded'
          });
        }
        
        setMediaFiles(prev => [...prev, ...newFiles]);
        startAnalyzingProgress();
        
        for (const file of newFiles) {
          setAnalyzingFileId(file.id);
          await analyzeMediaFile(file.id, file.uri, 'video');
        }
      }
    } catch (error) {
      console.error('Error picking video files:', error);
      Alert.alert('Error', 'Failed to pick video files');
    }
  };

  const analyzeMediaFile = async (fileId, mediaUri, mediaType) => {
    try {
      const formData = new FormData();
      const fileName = mediaUri.split('/').pop() || 'recording';
      const fileExt = fileName.split('.').pop().toLowerCase();
      const fileType = mediaType === 'video' ? `video/${fileExt}` : `audio/${fileExt}`;
      
      formData.append('audio', {
        uri: mediaUri,
        type: fileType,
        name: fileName,
      });
      
      formData.append('mime_type', fileType);
      formData.append('filename', fileName);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setMediaFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, aiResults: data, isAnalyzing: false } : f
        ));
        
        if (data.is_reportable) {
          setDisturbanceAlerts(prev => [...prev, {
            fileId: fileId,
            fileName: fileName,
            disturbance: {
              is_reportable: data.is_reportable,
              severity_name: data.severity_name,
              recommendation: data.recommendation,
              reasons: data.reasons,
              normalized_spl_db: data.normalized_spl_db
            }
          }]);
          
          if (data.severity_name === 'CRITICAL' || data.severity_name === 'HIGH') {
            Alert.alert(
              '🚨 URGENT: Noise Violation Detected!',
              `${data.recommendation}\n\nReasons:\n${data.reasons?.map(r => `• ${r}`).join('\n')}\n\nVolume: ${data.decibel} dB`,
              [
                { text: 'View Details', onPress: () => setActiveTab('analysis') },
                { text: 'Dismiss', style: 'cancel' }
              ]
            );
          }
        }
      } else {
        Alert.alert('Analysis Failed', data.error || 'Unknown error');
        setMediaFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, isAnalyzing: false, analysisError: data.error } : f
        ));
      }

      // Check if all files are analyzed
      const stillAnalyzing = mediaFiles.some(f => f.isAnalyzing && f.id !== fileId);
      if (!stillAnalyzing) {
        stopAnalyzingProgress();
      }

    } catch (error) {
      console.error('❌ AI Analysis Error:', error);
      
      let errorMessage = 'Failed to analyze media. ';
      if (error.name === 'AbortError') {
        errorMessage += 'Request timed out. Try a shorter file.';
      } else {
        errorMessage += error.message;
      }
      
      Alert.alert('AI Error', errorMessage);
      setMediaFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, isAnalyzing: false, analysisError: errorMessage } : f
      ));
      
      const stillAnalyzing = mediaFiles.some(f => f.isAnalyzing && f.id !== fileId);
      if (!stillAnalyzing) {
        stopAnalyzingProgress();
      }
    } finally {
      if (analyzingFileId === fileId) {
        setAnalyzingFileId(null);
      }
    }
  };

  const playMedia = async (fileId, uri) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        setIsPlaying(false);
        setPlayingFileId(null);
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      
      soundRef.current = newSound;
      
      const status = await newSound.getStatusAsync();
      setDurationMap(prev => ({ ...prev, [fileId]: Math.floor(status.durationMillis / 1000) }));
      setPlayingFileId(fileId);
      setIsPlaying(true);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPositionMap(prev => ({ 
            ...prev, 
            [fileId]: Math.floor(status.positionMillis / 1000) 
          }));
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlayingFileId(null);
            newSound.unloadAsync();
            soundRef.current = null;
          }
        }
      });
      
    } catch (error) {
      console.error('Error playing media:', error);
      Alert.alert('Playback Error', 'Failed to play this file. The format may not be supported.');
    }
  };

  const removeMediaFile = (fileId) => {
    Alert.alert('Remove File', 'Remove this file from the report?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive', 
        onPress: () => {
          if (playingFileId === fileId) {
            if (soundRef.current) {
              soundRef.current.unloadAsync();
              soundRef.current = null;
            }
            setIsPlaying(false);
            setPlayingFileId(null);
          }
          
          setMediaFiles(prev => prev.filter(f => f.id !== fileId));
          setDisturbanceAlerts(prev => prev.filter(a => a.fileId !== fileId));
          
          setPlaybackPositionMap(prev => {
            const newMap = { ...prev };
            delete newMap[fileId];
            return newMap;
          });
          setDurationMap(prev => {
            const newMap = { ...prev };
            delete newMap[fileId];
            return newMap;
          });
          
          // Stop analyzing progress if no files are analyzing
          const stillAnalyzing = mediaFiles.some(f => f.isAnalyzing && f.id !== fileId);
          if (!stillAnalyzing) {
            stopAnalyzingProgress();
          }
        }
      },
    ]);
  };

  // ==================== SUBMIT FUNCTIONS ====================
  const saveRecording = async () => {
    if (mediaFiles.length === 0) {
      Alert.alert('No Content', 'Please add audio or video files first.');
      return;
    }
    
    const hasAnalysis = mediaFiles.some(f => f.aiResults);
    if (!hasAnalysis) {
      Alert.alert('Analysis Required', 'Please wait for AI analysis to complete on all files.');
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = await AsyncStorage.getItem('userId');
      
      if (!userId) {
        Alert.alert('Authentication Error', 'Please log in again.');
        setIsSubmitting(false);
        return;
      }

      const analyzedFiles = mediaFiles.filter(f => f.aiResults);
      let overallNoiseLevel = 'yellow';
      
      if (analyzedFiles.length > 0) {
        const hasCritical = analyzedFiles.some(f => 
          f.aiResults?.severity_name === 'CRITICAL' || 
          f.aiResults?.severity_name === 'HIGH' ||
          f.aiResults?.decibel > 85
        );
        const hasRed = analyzedFiles.some(f => 
          f.aiResults?.is_reportable === true || 
          f.aiResults?.decibel > 70
        );
        const hasYellow = analyzedFiles.some(f => f.aiResults?.decibel > 50);
        
        if (hasCritical) {
          overallNoiseLevel = 'critical';
        } else if (hasRed) {
          overallNoiseLevel = 'red';
        } else if (hasYellow) {
          overallNoiseLevel = 'yellow';
        } else {
          overallNoiseLevel = 'green';
        }
      }

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('noiseLevel', overallNoiseLevel);
      formData.append('comment', comment || '');
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const fileExtension = file.uri.split('.').pop();
        const fileName = file.fileName || `file_${i + 1}.${fileExtension}`;
        
        formData.append('media', {
          uri: file.uri,
          type: file.type === 'video' ? `video/${fileExtension}` : `audio/${fileExtension}`,
          name: fileName,
        });
        
        formData.append(`media_${i}_type`, file.type);
        formData.append(`media_${i}_fileName`, fileName);
        formData.append(`media_${i}_source`, file.mediaSource || 'downloaded');
        
        if (file.aiResults) {
          let fileNoiseValue = 'yellow';
          if (file.aiResults.is_destructive && file.aiResults.decibel > 70) {
            fileNoiseValue = 'critical';
          } else if (file.aiResults.is_reportable || file.aiResults.decibel > 70) {
            fileNoiseValue = 'red';
          } else if (file.aiResults.decibel > 50) {
            fileNoiseValue = 'yellow';
          } else {
            fileNoiseValue = 'green';
          }
          
          formData.append(`media_${i}_ai_analysis`, JSON.stringify(file.aiResults));
          formData.append(`media_${i}_ai_decibel`, file.aiResults.decibel?.toString() || '0');
          formData.append(`media_${i}_ai_noise_level`, file.aiResults.noise_level?.level || 'Medium');
          formData.append(`media_${i}_ai_noise_value`, fileNoiseValue);
          formData.append(`media_${i}_ai_noise_description`, file.aiResults.noise_level?.description || '');
          
          formData.append(`media_${i}_ai_is_reportable`, (file.aiResults.is_reportable || false).toString());
          formData.append(`media_${i}_ai_severity`, file.aiResults.severity_name || 'NONE');
          formData.append(`media_${i}_ai_recommendation`, file.aiResults.recommendation || '');
          formData.append(`media_${i}_ai_reasons`, JSON.stringify(file.aiResults.reasons || []));
          
          if (file.aiResults.detections && file.aiResults.detections.length > 0) {
            formData.append(`media_${i}_ai_detections`, JSON.stringify(file.aiResults.detections));
          }
          
          if (file.aiResults.distance) {
            formData.append(`media_${i}_ai_distance_meters`, file.aiResults.distance.meters?.toString() || '0');
            formData.append(`media_${i}_ai_distance_category`, file.aiResults.distance.category || '');
          }
        }
        
        formData.append(`media_${i}_duration`, file.totalDuration?.toString() || '0');
      }
      
      formData.append('total_files', mediaFiles.length.toString());
      
      // Auto location data - always included
      if (location) {
        let locationAddress = '';
        if (typeof location.address === 'object') {
          const addr = location.address;
          locationAddress = addr.street || addr.name || '';
          if (addr.city) locationAddress += `, ${addr.city}`;
          if (addr.region) locationAddress += `, ${addr.region}`;
          if (addr.country) locationAddress += `, ${addr.country}`;
        } else {
          locationAddress = location.address || '';
        }
        
        formData.append('location', JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          address: locationAddress,
          timestamp: location.timestamp,
          isManual: false
        }));
        
        formData.append('location_latitude', location.latitude?.toString() || '');
        formData.append('location_longitude', location.longitude?.toString() || '');
        formData.append('location_address_street', locationAddress);
        formData.append('location_address_city', location.address?.city || '');
        formData.append('location_address_region', location.address?.region || '');
        formData.append('location_address_country', location.address?.country || '');
        formData.append('location_timestamp', location.timestamp || '');
        formData.append('location_is_manual', 'false');
      }
      
      formData.append('app_version', Constants.expoConfig?.version || '1.0.0');
      formData.append('platform', Platform.OS);
      formData.append('platform_version', Platform.Version?.toString() || '');
      formData.append('timestamp', new Date().toISOString());

      const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      });

      setIsSubmitting(false);

      const reportableCount = mediaFiles.filter(f => f.aiResults?.is_reportable).length;
      const severeCount = mediaFiles.filter(f => f.aiResults?.severity_name === 'CRITICAL' || f.aiResults?.severity_name === 'HIGH').length;
      
      const reportDetails = `✅ Report Submitted!\n\n` +
        `📁 Files: ${mediaFiles.length}\n` +
        `⚠️ Reportable: ${reportableCount}\n` +
        `${severeCount > 0 ? `🚨 Severe: ${severeCount}\n` : ''}` +
        `🔊 Noise Level: ${overallNoiseLevel.toUpperCase()}\n` +
        `${location ? `📍 Location: ${location.address?.street || 'Auto-detected'}\n` : '📍 Location: Auto-detected\n'}`;

      Alert.alert('✅ Report Submitted', reportDetails, [
        { 
          text: 'OK', 
          onPress: () => {
            setComment('');
            setMediaFiles([]);
            setLocation(null);
            setDisturbanceAlerts([]);
            setActiveTab('analysis');
            // Re-get location for next report
            getCurrentLocation();
          }
        }
      ]);

    } catch (error) {
      setIsSubmitting(false);
      console.error('Error submitting report:', error);
      
      let errorMessage = 'Failed to submit noise report. Please try again.';
      if (error.response) {
        console.error('Server response:', error.response.data);
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
    }
  };

  const testAIService = async () => {
    try {
      setIsAnalyzing(true);
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/health`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'ReactNativeApp/1.0',
        },
      });
      
      const responseData = await response.json();
      
      let message = `Main Backend: ✅ Online\n`;
      
      if (responseData.flask_ai) {
        if (responseData.flask_ai.status === 'healthy') {
          message += `Flask AI: ✅ Healthy\n`;
          message += `Model: ${responseData.flask_ai.model}\n`;
          message += `YAMNet-Trans: ${responseData.flask_ai.yamnet_trans_loaded ? '✅' : '❌'}`;
        } else {
          message += `Flask AI: ❌ ${responseData.flask_ai.error || 'Unavailable'}`;
        }
      } else {
        message += `Flask AI: ❌ Not connected`;
      }
      
      Alert.alert('Service Status', message, [{ text: 'OK' }]);
      
    } catch (error) {
      Alert.alert(
        'Connection Failed', 
        `Cannot connect to ${AI_SERVICE_URL}\n\nError: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsAnalyzing(false);
    }
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

  // ==================== RENDER FUNCTIONS ====================
  
  // Global Loading Overlay for AI Analysis
  const renderGlobalLoadingOverlay = () => {
    if (analyzingProgress === 0 || !mediaFiles.some(f => f.isAnalyzing)) return null;
    
    return (
      <Modal transparent visible={mediaFiles.some(f => f.isAnalyzing)} animationType="fade">
        <View style={styles.globalLoadingOverlay}>
          <View style={styles.globalLoadingContainer}>
            <LinearGradient colors={['#8B4513', '#654321']} style={styles.globalLoadingGradient}>
              <View style={styles.globalLoadingContent}>
                <View style={styles.globalLoadingIcon}>
                  <Ionicons name="analytics" size={50} color="#D4AC0D" />
                </View>
                
                <Text style={styles.globalLoadingTitle}>AI is Analyzing Your Files</Text>
                <Text style={styles.globalLoadingSubtitle}>
                  Processing {mediaFiles.filter(f => f.isAnalyzing).length} file(s)
                </Text>
                
                {/* Animated Sound Waves */}
                <View style={styles.waveContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: 20 + Math.sin(Date.now() / 200 + i) * 15,
                          animationDelay: `${i * 0.2}s`,
                        }
                      ]}
                    >
                      <LinearGradient
                        colors={['#D4AC0D', '#8B4513']}
                        style={styles.waveBarGradient}
                      />
                    </Animated.View>
                  ))}
                </View>
                
                {/* Progress Bar */}
                <View style={styles.globalProgressContainer}>
                  <View style={styles.globalProgressBar}>
                    <Animated.View 
                      style={[
                        styles.globalProgressFill,
                        { width: `${analyzingProgress}%` }
                      ]}
                    >
                      <LinearGradient
                        colors={['#D4AC0D', '#8B4513']}
                        style={styles.globalProgressFillGradient}
                      />
                    </Animated.View>
                  </View>
                  <Text style={styles.globalProgressText}>{analyzingProgress}%</Text>
                </View>
                
                {/* Spinning Loader */}
                <ActivityIndicator size="large" color="#D4AC0D" style={styles.globalSpinner} />
                
                <Text style={styles.globalLoadingMessage}>
                  Our AI is listening to your audio and identifying noise patterns...
                </Text>
                
                <View style={styles.globalFileList}>
                  {mediaFiles.filter(f => f.isAnalyzing).map((file, idx) => (
                    <View key={idx} style={styles.globalFileItem}>
                      <Ionicons name="sync-outline" size={16} color="#D4AC0D" spinning />
                      <Text style={styles.globalFileName} numberOfLines={1}>
                        {file.fileName || `File ${idx + 1}`}
                      </Text>
                      <Text style={styles.globalFileStatus}>Analyzing...</Text>
                    </View>
                  ))}
                  {mediaFiles.filter(f => !f.isAnalyzing && f.aiResults).map((file, idx) => (
                    <View key={idx} style={[styles.globalFileItem, styles.globalFileCompleted]}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.globalFileName, styles.globalFileCompletedText]} numberOfLines={1}>
                        {file.fileName || `File ${idx + 1}`}
                      </Text>
                      <Text style={styles.globalFileCompletedStatus}>Completed</Text>
                    </View>
                  ))}
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    );
  };

  const renderNoiseLevelCard = () => {
    const analyzedFiles = mediaFiles.filter(f => f.aiResults);
    if (analyzedFiles.length === 0) return null;
    
    const hasCritical = analyzedFiles.some(f => 
      f.aiResults?.severity_name === 'CRITICAL' || 
      f.aiResults?.severity_name === 'HIGH' ||
      f.aiResults?.decibel > 85
    );
    const hasReportable = analyzedFiles.some(f => f.aiResults?.is_reportable);
    const maxDecibel = Math.max(...analyzedFiles.map(f => f.aiResults?.decibel || 0));
    
    let overallLevel = 'green';
    let overallLabel = 'Low';
    let overallDescription = 'Mild disturbance';
    let overallEmoji = '😌';
    let overallColor = '#4CAF50';
    let overallBgColor = '#E8F5E9';
    
    if (hasCritical || maxDecibel > 85) {
      overallLevel = 'critical';
      overallLabel = 'Critical';
      overallDescription = 'Harmful noise level - Immediate action required';
      overallEmoji = '🚨';
      overallColor = '#E74C3C';
      overallBgColor = '#FFEBEE';
    } else if (hasReportable || maxDecibel > 70) {
      overallLevel = 'red';
      overallLabel = 'High';
      overallDescription = 'Severe disturbance - Reportable';
      overallEmoji = '😠';
      overallColor = '#F44336';
      overallBgColor = '#FFEBEE';
    } else if (maxDecibel > 50) {
      overallLevel = 'yellow';
      overallLabel = 'Medium';
      overallDescription = 'Moderate noise';
      overallEmoji = '😐';
      overallColor = '#FFC107';
      overallBgColor = '#FFF9C4';
    }
    
    return (
      <LinearGradient
        colors={[overallBgColor, '#fff']}
        style={styles.noiseLevelCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.noiseLevelHeader}>
          <View style={[styles.noiseLevelIconContainer, { backgroundColor: overallColor }]}>
            <Ionicons name={overallLevel === 'critical' ? "alert" : overallLevel === 'red' ? "alert-circle" : overallLevel === 'yellow' ? "warning" : "checkmark-circle"} size={32} color="#fff" />
          </View>
          <View style={styles.noiseLevelInfo}>
            <Text style={styles.noiseLevelLabel}>{overallLabel} Noise Level</Text>
            <Text style={styles.noiseLevelDesc}>{overallDescription}</Text>
          </View>
          <Text style={styles.noiseLevelEmoji}>{overallEmoji}</Text>
        </View>
        
        <View style={styles.noiseLevelMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{maxDecibel} dB</Text>
            <Text style={styles.metricLabel}>Highest Volume</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analyzedFiles.length}</Text>
            <Text style={styles.metricLabel}>Files Analyzed</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{hasReportable ? 'Yes' : 'No'}</Text>
            <Text style={styles.metricLabel}>Reportable</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderDetailedAnalysis = (item) => {
    const isReportable = item.aiResults?.is_reportable;
    const severity = item.aiResults?.severity_name;
    const isPlayingThis = playingFileId === item.id;
    const currentPos = playbackPositionMap[item.id] || 0;
    const duration = durationMap[item.id] || item.totalDuration || 0;
    
    if (!item.aiResults && !item.isAnalyzing) {
      return (
        <View style={styles.analysisCard}>
          <View style={styles.analysisCardHeader}>
            <View style={styles.analysisFileIcon}>
              <Ionicons name={item.type === 'video' ? 'videocam' : 'musical-notes'} size={24} color="#8B4513" />
            </View>
            <View style={styles.analysisFileInfo}>
              <Text style={styles.analysisFileName}>{item.fileName || 'Unknown File'}</Text>
              <View style={styles.analysisFileMeta}>
                <View style={[styles.sourceBadgeSmall, item.mediaSource === 'live' ? styles.liveBadgeSmall : styles.downloadedBadgeSmall]}>
                  <Ionicons name={item.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
                  <Text style={styles.sourceBadgeTextSmall}>{item.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => removeMediaFile(item.id)}>
              <Ionicons name="close-circle" size={28} color="#E74C3C" />
            </TouchableOpacity>
          </View>
          
          {item.isAnalyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#D4AC0D" />
              <Text style={styles.analyzingText}>AI is analyzing this file...</Text>
            </View>
          )}
          
          {item.analysisError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#E74C3C" />
              <Text style={styles.errorText}>{item.analysisError}</Text>
            </View>
          )}
        </View>
      );
    }
    
    return (
      <View style={[styles.analysisCard, isReportable && (severity === 'CRITICAL' || severity === 'HIGH') && styles.criticalCard]}>
        <View style={styles.analysisCardHeader}>
          <View style={styles.analysisFileIcon}>
            <Ionicons name={item.type === 'video' ? 'videocam' : 'musical-notes'} size={24} color={isReportable ? '#E74C3C' : '#8B4513'} />
          </View>
          <View style={styles.analysisFileInfo}>
            <Text style={styles.analysisFileName} numberOfLines={1}>{item.fileName || 'Recording'}</Text>
            <View style={styles.analysisFileMeta}>
              <View style={[styles.sourceBadgeSmall, item.mediaSource === 'live' ? styles.liveBadgeSmall : styles.downloadedBadgeSmall]}>
                <Ionicons name={item.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
                <Text style={styles.sourceBadgeTextSmall}>{item.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
              </View>
              {duration > 0 && (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={10} color="#666" />
                  <Text style={styles.durationText}>{formatTime(duration)}</Text>
                </View>
              )}
              {isReportable && (
                <View style={styles.reportableBadgeSmall}>
                  <Ionicons name="alert" size={12} color="#E74C3C" />
                  <Text style={styles.reportableTextSmall}>{severity || 'Reportable'}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => removeMediaFile(item.id)}>
            <Ionicons name="close-circle" size={28} color="#E74C3C" />
          </TouchableOpacity>
        </View>
        
        {isReportable && (
          <View style={styles.disturbanceInline}>
            <LinearGradient colors={severity === 'CRITICAL' || severity === 'HIGH' ? ['#E74C3C', '#C0392B'] : ['#E67E22', '#D35400']} style={styles.disturbanceInlineGradient}>
              <Ionicons name={severity === 'CRITICAL' || severity === 'HIGH' ? "alert-circle" : "warning"} size={20} color="#fff" />
              <View style={styles.disturbanceInlineContent}>
                <Text style={styles.disturbanceInlineTitle}>{severity === 'CRITICAL' || severity === 'HIGH' ? 'URGENT' : 'Reportable'}</Text>
                <Text style={styles.disturbanceInlineText}>{item.aiResults.recommendation?.substring(0, 60)}...</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        
        <View style={styles.analysisMetrics}>
          <View style={styles.metricLarge}>
            <Text style={styles.metricLargeValue}>{item.aiResults?.decibel || 0} dB</Text>
            <Text style={styles.metricLargeLabel}>Measured</Text>
          </View>
          {item.aiResults?.distance && (
            <View style={styles.metricLarge}>
              <Text style={styles.metricLargeValue}>{item.aiResults.distance.meters || '?'}m</Text>
              <Text style={styles.metricLargeLabel}>Distance</Text>
            </View>
          )}
          <View style={styles.metricLarge}>
            <Text style={styles.metricLargeValue}>{item.aiResults?.noise_level?.level || 'N/A'}</Text>
            <Text style={styles.metricLargeLabel}>Noise Level</Text>
          </View>
        </View>
        
        {/* Playback Controls */}
        {(item.type === 'audio' || item.type === 'video') && (
          <View style={styles.playbackSection}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={() => {
                if (isPlayingThis) {
                  if (soundRef.current) {
                    soundRef.current.pauseAsync();
                    setIsPlaying(false);
                    setPlayingFileId(null);
                  }
                } else {
                  playMedia(item.id, item.uri);
                }
              }}
            >
              <LinearGradient 
                colors={isPlayingThis ? ['#E74C3C', '#C0392B'] : ['#D4AC0D', '#8B4513']} 
                style={styles.playButtonGradient}
              >
                <Ionicons name={isPlayingThis ? "pause" : "play"} size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${duration > 0 ? (currentPos / duration) * 100 : 0}%` }]} />
              </View>
              <View style={styles.timeLabels}>
                <Text style={styles.timeText}>{formatTime(currentPos)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Top Detections */}
        {item.aiResults?.detections && item.aiResults.detections.length > 0 && (
          <View style={styles.detectionsSection}>
            <Text style={styles.detectionsTitle}>Top Detected Sounds</Text>
            {item.aiResults.detections.slice(0, 3).map((detection, idx) => {
              const confidencePercent = (detection.confidence * 100).toFixed(1);
              return (
                <View key={idx} style={styles.detectionRow}>
                  <View style={styles.detectionRankContainer}>
                    <LinearGradient
                      colors={idx === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
                      style={styles.detectionRankBadge}
                    >
                      <Text style={styles.detectionRankText}>{idx + 1}</Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.detectionInfo}>
                    <Text style={styles.detectionName}>{detection.class}</Text>
                    <View style={styles.detectionConfidenceBar}>
                      <View style={styles.detectionConfidenceBg}>
                        <LinearGradient
                          colors={idx === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
                          style={[styles.detectionConfidenceFill, { width: `${confidencePercent}%` }]}
                        />
                      </View>
                      <Text style={styles.detectionConfidenceText}>{confidencePercent}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {/* Reasons if Reportable */}
        {isReportable && item.aiResults?.reasons && item.aiResults.reasons.length > 0 && (
          <View style={styles.reasonsSection}>
            <Text style={styles.reasonsTitle}>Reasons:</Text>
            {item.aiResults.reasons.slice(0, 2).map((reason, idx) => (
              <View key={idx} style={styles.reasonRow}>
                <Ionicons name="alert-circle" size={14} color="#E74C3C" />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Delete Button Only - No Share */}
        <View style={styles.analysisActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteActionBtn]} 
            onPress={() => removeMediaFile(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#E74C3C" />
            <Text style={[styles.actionBtnText, styles.deleteActionText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMediaModal = () => {
    return (
      <Modal
        visible={isMediaModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMediaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Media</Text>
              <TouchableOpacity onPress={() => setIsMediaModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  <Ionicons name="mic" size={18} color="#8B4513" /> Audio
                </Text>
                <View style={styles.modalOptionsRow}>
                  <TouchableOpacity style={styles.modalOption} onPress={startRecording}>
                    <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.modalOptionGradient}>
                      <Ionicons name="mic" size={28} color="#fff" />
                      <Text style={styles.modalOptionText}>Record Audio</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalOption} onPress={pickAudioFiles}>
                    <LinearGradient colors={['#4CAF50', '#388E3C']} style={styles.modalOptionGradient}>
                      <Ionicons name="folder-open" size={28} color="#fff" />
                      <Text style={styles.modalOptionText}>Choose Audio</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  <Ionicons name="videocam" size={18} color="#8B4513" /> Video
                </Text>
                <View style={styles.modalOptionsRow}>
                  <TouchableOpacity style={styles.modalOption} onPress={recordVideo}>
                    <LinearGradient colors={['#E91E63', '#C2185B']} style={styles.modalOptionGradient}>
                      <Ionicons name="videocam" size={28} color="#fff" />
                      <Text style={styles.modalOptionText}>Record Video</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalOption} onPress={pickVideoFromGallery}>
                    <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={styles.modalOptionGradient}>
                      <Ionicons name="images" size={28} color="#fff" />
                      <Text style={styles.modalOptionText}>From Gallery</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalOption} onPress={pickVideoFiles}>
                    <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.modalOptionGradient}>
                      <Ionicons name="folder-open" size={28} color="#fff" />
                      <Text style={styles.modalOptionText}>Choose Video</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analysis':
        return (
          <View style={styles.tabContent}>
            {renderNoiseLevelCard()}
            
            {disturbanceAlerts.length > 0 && (
              <View style={styles.alertSummary}>
                <LinearGradient colors={['#FFEBEE', '#FFCDD2']} style={styles.alertSummaryGradient}>
                  <Ionicons name="warning" size={24} color="#E74C3C" />
                  <View style={styles.alertSummaryContent}>
                    <Text style={styles.alertSummaryTitle}>
                      {disturbanceAlerts.length} Reportable Noise(s) Detected
                    </Text>
                    <Text style={styles.alertSummaryText}>
                      {disturbanceAlerts.filter(a => a.disturbance.severity_name === 'CRITICAL' || a.disturbance.severity_name === 'HIGH').length} severe violations
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            )}
            
            {mediaFiles.length > 0 ? (
              <FlatList
                data={mediaFiles}
                renderItem={({ item }) => renderDetailedAnalysis(item)}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.detailedAnalysisContainer}
              />
            ) : (
              <View style={styles.emptyAnalysis}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
                </Animated.View>
                <Text style={styles.emptyTitle}>No Media Added</Text>
                <Text style={styles.emptyText}>Tap the + button to add audio or video files</Text>
                <Text style={styles.emptySubtext}>AI will analyze each file separately</Text>
              </View>
            )}
          </View>
        );

      case 'details':
        return (
          <View style={styles.tabContent}>
            <View style={styles.detailsCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubble-outline" size={20} color="#8B4513" />
                <Text style={styles.sectionHeaderTitle}>Additional Details</Text>
              </View>
              <TextInput 
                style={styles.detailsInput} 
                placeholder="Describe the noise issue (optional)" 
                placeholderTextColor="#999" 
                multiline 
                numberOfLines={4} 
                value={comment} 
                onChangeText={setComment} 
                maxLength={500} 
                textAlignVertical="top" 
              />
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </View>
          </View>
        );

      case 'location':
        return (
          <View style={styles.tabContent}>
            <View style={styles.locationCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location-outline" size={20} color="#8B4513" />
                <Text style={styles.sectionHeaderTitle}>Location</Text>
              </View>
              
              {locationLoading ? (
                <View style={styles.locationLoadingContainer}>
                  <ActivityIndicator size="large" color="#8B4513" />
                  <Text style={styles.locationLoadingText}>Detecting your location...</Text>
                </View>
              ) : location ? (
                <View style={styles.locationInfoCard}>
                  <View style={styles.locationHeader}>
                    <View style={styles.locationBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={styles.locationBadgeText}>Auto-detected Location</Text>
                    </View>
                    <TouchableOpacity onPress={getCurrentLocation} style={styles.refreshLocationBtn}>
                      <Ionicons name="refresh" size={20} color="#8B4513" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationAddress}>
                      {location.address?.street || 'Auto-detected location'}
                    </Text>
                    {location.address?.city && (
                      <Text style={styles.locationCity}>
                        {location.address.city}, {location.address.region || ''}
                      </Text>
                    )}
                    <Text style={styles.locationCoords}>
                      {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.locationError}>
                  <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                  <Text style={styles.locationErrorText}>Unable to detect location. Please enable GPS.</Text>
                  <TouchableOpacity onPress={getCurrentLocation} style={styles.retryLocationBtn}>
                    <Text style={styles.retryLocationText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
              <Ionicons name="menu" size={28} color="#D4AC0D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={testAIService} style={styles.headerButton}>
              <Ionicons name="wifi" size={24} color="#D4AC0D" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Noise Report</Text>
          <Text style={styles.headerSubtitle}>
            {isRecording ? 'Recording in progress...' : 
             mediaFiles.length > 0 ? `${mediaFiles.length} file(s) ready` : 
             'Add media files for analysis'}
          </Text>
        </View>
      </LinearGradient>

      {isRecording && (
        <View style={styles.recordingControlContainer}>
          <LinearGradient colors={['#E74C3C', '#C0392B']} style={styles.recordingControlGradient}>
            <View style={styles.recordingInfo}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTimer}>{formatTime(recordingDuration)}</Text>
            </View>
            <TouchableOpacity style={styles.stopRecordingButton} onPress={stopRecording}>
              <Ionicons name="stop-circle" size={32} color="#fff" />
              <Text style={styles.stopRecordingText}>Stop Recording</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {!isRecording && (
        <TouchableOpacity style={styles.addMediaButton} onPress={() => setIsMediaModalVisible(true)}>
          <LinearGradient colors={['#D4AC0D', '#8B4513']} style={styles.addMediaGradient}>
            <Ionicons name="add-circle" size={28} color="#fff" />
            <Text style={styles.addMediaText}>Add Media Files</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {mediaFiles.length > 0 && !isRecording && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
            onPress={() => setActiveTab('analysis')}
          >
            <Ionicons name="analytics" size={20} color={activeTab === 'analysis' ? '#8B4513' : '#999'} />
            <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>Analysis</Text>
            {disturbanceAlerts.length > 0 && activeTab !== 'analysis' && <View style={styles.notificationDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Ionicons name="document-text" size={20} color={activeTab === 'details' ? '#8B4513' : '#999'} />
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'location' && styles.activeTab]}
            onPress={() => setActiveTab('location')}
          >
            <Ionicons name="location" size={20} color={activeTab === 'location' ? '#8B4513' : '#999'} />
            <Text style={[styles.tabText, activeTab === 'location' && styles.activeTabText]}>Location</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.tabContentContainer} 
        contentContainerStyle={styles.tabContentContainerContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}

        {mediaFiles.length > 0 && !isRecording && (
          <TouchableOpacity
            onPress={saveRecording}
            style={[styles.submitBtn, (mediaFiles.some(f => f.isAnalyzing) || isSubmitting) && styles.submitBtnDisabled]}
            disabled={mediaFiles.some(f => f.isAnalyzing) || isSubmitting}
          >
            <LinearGradient colors={['#8B4513', '#654321']} style={styles.submitGradient}>
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#D4AC0D" />
                  <Text style={styles.submitText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
                  <Text style={styles.submitText}>Submit Report ({mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''})</Text>
                  {disturbanceAlerts.length > 0 && (
                    <View style={styles.reportableIndicator}>
                      <Ionicons name="alert" size={16} color="#E74C3C" />
                    </View>
                  )}
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      {renderMediaModal()}
      
      {/* Global Loading Overlay for AI Analysis */}
      {renderGlobalLoadingOverlay()}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  
  header: { 
    paddingTop: getStatusBarHeight(), 
    paddingBottom: 15, 
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: { marginTop: 5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  headerButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#D4AC0D', opacity: 0.9 },

  recordingControlContainer: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
  },
  recordingControlGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  recordingInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  recordingTimer: { fontSize: 24, fontWeight: 'bold', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  stopRecordingButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25 },
  stopRecordingText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  addMediaButton: { marginHorizontal: 15, marginTop: 15, borderRadius: 15, overflow: 'hidden', elevation: 3 },
  addMediaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  addMediaText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, borderRadius: 15, padding: 5, elevation: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, position: 'relative' },
  activeTab: { backgroundColor: '#f5f5f5' },
  tabText: { fontSize: 14, color: '#999', fontWeight: '500' },
  activeTabText: { color: '#8B4513', fontWeight: '600' },
  notificationDot: { position: 'absolute', top: 8, right: '30%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' },

  tabContentContainer: { flex: 1 },
  tabContentContainerContent: { paddingHorizontal: 15, paddingBottom: 30 },
  tabContent: { gap: 15 },

  noiseLevelCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f0f0f0', elevation: 3, marginBottom: 15 },
  noiseLevelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  noiseLevelIconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  noiseLevelInfo: { flex: 1 },
  noiseLevelLabel: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  noiseLevelDesc: { fontSize: 13, color: '#666' },
  noiseLevelEmoji: { fontSize: 32 },
  noiseLevelMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
  metricItem: { alignItems: 'center' },
  metricValue: { fontSize: 24, fontWeight: 'bold', color: '#8B4513', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  metricLabel: { fontSize: 12, color: '#999', marginTop: 4 },

  alertSummary: { borderRadius: 16, overflow: 'hidden', marginBottom: 5 },
  alertSummaryGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  alertSummaryContent: { flex: 1 },
  alertSummaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#E74C3C' },
  alertSummaryText: { fontSize: 12, color: '#E74C3C', opacity: 0.8, marginTop: 2 },

  emptyAnalysis: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginTop: 15, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  emptySubtext: { fontSize: 12, color: '#ccc', marginTop: 8, textAlign: 'center' },

  detailedAnalysisContainer: { gap: 16, paddingBottom: 20 },
  analysisCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0' },
  criticalCard: { backgroundColor: '#FFF5F5', borderColor: '#FFCDD2' },
  analysisCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  analysisFileIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  analysisFileInfo: { flex: 1 },
  analysisFileName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  analysisFileMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sourceBadgeSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
  liveBadgeSmall: { backgroundColor: '#4CAF50' },
  downloadedBadgeSmall: { backgroundColor: '#2196F3' },
  sourceBadgeTextSmall: { fontSize: 10, color: '#fff', fontWeight: '600' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 3 },
  durationText: { fontSize: 10, color: '#666' },
  reportableBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
  reportableTextSmall: { fontSize: 10, color: '#E74C3C', fontWeight: '600' },
  deleteButton: { padding: 4, marginLeft: 4 },

  disturbanceInline: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  disturbanceInlineGradient: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  disturbanceInlineContent: { flex: 1 },
  disturbanceInlineTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  disturbanceInlineText: { color: '#fff', fontSize: 10, opacity: 0.9, marginTop: 2 },

  analysisMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  metricLarge: { alignItems: 'center' },
  metricLargeValue: { fontSize: 28, fontWeight: 'bold', color: '#8B4513' },
  metricLargeLabel: { fontSize: 12, color: '#999', marginTop: 4 },

  playbackSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  playButton: { borderRadius: 30, overflow: 'hidden', elevation: 3 },
  playButtonGradient: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  progressSection: { flex: 1 },
  progressBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#D4AC0D', borderRadius: 3 },
  timeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 12, color: '#666' },

  detectionsSection: { marginBottom: 16 },
  detectionsTitle: { fontSize: 14, fontWeight: '600', color: '#8B4513', marginBottom: 12 },
  detectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  detectionRankContainer: { width: 32 },
  detectionRankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  detectionRankText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  detectionInfo: { flex: 1 },
  detectionName: { fontSize: 13, fontWeight: '500', color: '#333', marginBottom: 4 },
  detectionConfidenceBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detectionConfidenceBg: { flex: 1, height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, overflow: 'hidden' },
  detectionConfidenceFill: { height: '100%', borderRadius: 2 },
  detectionConfidenceText: { fontSize: 11, color: '#666', width: 40 },

  reasonsSection: { backgroundColor: '#FFF9C4', borderRadius: 12, padding: 12, marginBottom: 16 },
  reasonsTitle: { fontSize: 11, fontWeight: 'bold', color: '#E67E22', marginBottom: 6 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  reasonText: { fontSize: 11, color: '#666', flex: 1 },

  analysisActions: { flexDirection: 'row', justifyContent: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#f5f5f5', borderRadius: 20 },
  actionBtnText: { fontSize: 14, color: '#8B4513' },
  deleteActionBtn: { backgroundColor: '#FFEBEE' },
  deleteActionText: { color: '#E74C3C' },

  analyzingContainer: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  analyzingText: { fontSize: 14, color: '#8B4513' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 10, marginTop: 10, gap: 8 },
  errorText: { fontSize: 12, color: '#E74C3C', flex: 1 },

  detailsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '600', color: '#8B4513' },
  detailsInput: { borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: '#f8f9fa', minHeight: 100 },
  charCount: { textAlign: 'right', fontSize: 12, color: '#999', marginTop: 8 },

  locationCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 2 },
  locationLoadingContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  locationLoadingText: { fontSize: 14, color: '#8B4513' },
  locationInfoCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 15 },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationBadgeText: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
  refreshLocationBtn: { padding: 8 },
  locationDetails: { gap: 4 },
  locationAddress: { fontSize: 16, fontWeight: '600', color: '#333' },
  locationCity: { fontSize: 14, color: '#666' },
  locationCoords: { fontSize: 12, color: '#999', marginTop: 4 },
  locationError: { alignItems: 'center', backgroundColor: '#FFEBEE', padding: 20, borderRadius: 12, gap: 12 },
  locationErrorText: { fontSize: 14, color: '#E74C3C', textAlign: 'center' },
  retryLocationBtn: { backgroundColor: '#8B4513', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  retryLocationText: { color: '#fff', fontWeight: '600' },

  submitBtn: { marginTop: 10, marginBottom: 20, borderRadius: 15, overflow: 'hidden', elevation: 3 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  submitText: { color: '#D4AC0D', fontSize: 18, fontWeight: 'bold' },
  submitBtnDisabled: { opacity: 0.5 },
  reportableIndicator: { backgroundColor: '#FFEBEE', padding: 4, borderRadius: 12, marginLeft: 8 },

  modalContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 25, width: width - 40, maxHeight: height * 0.8, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B4513' },
  modalSection: { marginBottom: 24 },
  modalSectionTitle: { fontSize: 16, fontWeight: '600', color: '#8B4513', marginBottom: 12 },
  modalOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modalOption: { flex: 1, minWidth: (width - 80) / 2 - 12, borderRadius: 15, overflow: 'hidden', elevation: 2 },
  modalOptionGradient: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  modalOptionText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Global Loading Overlay Styles
  globalLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  globalLoadingContainer: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
  },
  globalLoadingGradient: {
    padding: 25,
  },
  globalLoadingContent: {
    alignItems: 'center',
  },
  globalLoadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212,172,13,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  globalLoadingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D4AC0D',
    marginBottom: 8,
    textAlign: 'center',
  },
  globalLoadingSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
    marginBottom: 25,
    textAlign: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 25,
    height: 50,
  },
  waveBar: {
    width: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  waveBarGradient: {
    flex: 1,
  },
  globalProgressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  globalProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  globalProgressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  globalProgressFillGradient: {
    flex: 1,
  },
  globalProgressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D4AC0D',
    textAlign: 'center',
  },
  globalSpinner: {
    marginBottom: 20,
  },
  globalLoadingMessage: {
    fontSize: 13,
    color: '#FFF',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  globalFileList: {
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  globalFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  globalFileCompleted: {
    backgroundColor: 'rgba(76,175,80,0.2)',
  },
  globalFileName: {
    flex: 1,
    fontSize: 12,
    color: '#FFF',
  },
  globalFileCompletedText: {
    color: '#4CAF50',
  },
  globalFileStatus: {
    fontSize: 11,
    color: '#D4AC0D',
  },
  globalFileCompletedStatus: {
    fontSize: 11,
    color: '#4CAF50',
  },
});