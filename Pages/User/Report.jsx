// import React, { useState, useEffect, useRef } from 'react';
//   import {
//     View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//     Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator,
//   } from 'react-native';
//   import { LinearGradient } from 'expo-linear-gradient';
//   import { Ionicons } from '@expo/vector-icons';
//   import { Audio, Video } from 'expo-av';
//   import * as ImagePicker from 'expo-image-picker';
//   import * as Location from 'expo-location';
//   import * as FileSystem from 'expo-file-system/legacy';
//   import { FFmpegKit } from 'ffmpeg-kit-react-native';
//   import axios from 'axios';
//   import API_BASE_URL from '../../utils/api';
//   import CustomDrawer from '../CustomDrawer';
//   import AsyncStorage from '@react-native-async-storage/async-storage';
//   import Constants from 'expo-constants';

//   const { width, height } = Dimensions.get('window');
//   const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

//   // =============================
//   // FFmpeg Conversion Helper
//   // =============================
//   const convertToWav = async (uri) => {
//     if (!uri) return null;
    
//     const isWav = uri.toLowerCase().endsWith('.wav');
//     if (isWav) {
//       console.log('✅ Already WAV format:', uri);
//       return uri;
//     }
    
//     try {
//       // Remove file:// prefix
//       const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
//       const filename = `converted_${Date.now()}.wav`;
//       const outputUri = `${FileSystem.cacheDirectory}${filename}`;
      
//       console.log('🔄 Converting audio to WAV format...');
//       console.log('📥 Clean input URI:', cleanUri);
//       console.log('📤 Output URI:', outputUri);
      
//       // Remove quotes and file:// from output
//       const command = `-i "${cleanUri}" -ar 16000 -ac 1 "${outputUri}"`;
//       console.log('⚙️ Command:', command);
      
//       // NO .init() needed - just execute
//       const session = await FFmpegKit.execute(command);
//       const returnCode = await session.getReturnCode();
      
//       if (returnCode.isValueSuccess()) {
//         const fileInfo = await FileSystem.getInfoAsync(outputUri);
//         if (fileInfo.exists && fileInfo.size > 0) {
//           console.log(`✅ Conversion successful: ${fileInfo.size} bytes`);
//           return outputUri;
//         }
//       }
      
//       console.error('❌ Conversion failed, using original');
//       return uri;
      
//     } catch (err) {
//       console.error('❌ FFmpeg conversion error:', err.message);
//       return uri;
//     }
//   };
//   export default function AudioRecordingScreen({ navigation }) {
//     const [drawerVisible, setDrawerVisible] = useState(false);
//     const [isRecording, setIsRecording] = useState(false);
//     const [isPlaying, setIsPlaying] = useState(false);
//     const [recordingDuration, setRecordingDuration] = useState(0);
//     const [playbackPosition, setPlaybackPosition] = useState(0);
//     const [totalDuration, setTotalDuration] = useState(0);
//     const [currentDb, setCurrentDb] = useState(35);
//     const [recording, setRecording] = useState(null);
//     const [sound, setSound] = useState(null);
//     const [audioUri, setAudioUri] = useState(null);
//     const [comment, setComment] = useState('');
//     const [selectedReason, setSelectedReason] = useState('');
//     const [videoUri, setVideoUri] = useState(null);
//     const [attachmentType, setAttachmentType] = useState(null);
//     const [location, setLocation] = useState(null);
//     const [locationLoading, setLocationLoading] = useState(false);
//     const [locationError, setLocationError] = useState(null);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [noiseLevel, setNoiseLevel] = useState('');
//     const [aiResults, setAiResults] = useState(null);
//     const [isAnalyzing, setIsAnalyzing] = useState(false);

//     const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//     const overlayOpacity = useRef(new Animated.Value(0)).current;
//     const pulseAnim = useRef(new Animated.Value(1)).current;
//     const waveAnim1 = useRef(new Animated.Value(0.5)).current;
//     const waveAnim2 = useRef(new Animated.Value(0.8)).current;
//     const waveAnim3 = useRef(new Animated.Value(0.3)).current;
//     const recordingInterval = useRef(null);
//     const videoRef = useRef(null);

//     const noiseReasons = ['🔊 Loud Music', '🚗 Vehicle Noise', '🔨 Construction', '🎉 Party/Event', '🐕 Animal Noise', '🏭 Industrial', '🗣️ Shouting/Arguments', '📢 Other'];
    
//     const noiseLevels = [
//       { value: 'green', label: 'Low', icon: 'checkmark-circle', color: '#4CAF50', bgColor: '#E8F5E9', description: 'Mild disturbance' },
//       { value: 'yellow', label: 'Medium', icon: 'warning', color: '#FFC107', bgColor: '#FFF9C4', description: 'Moderate noise' },
//       { value: 'red', label: 'High', icon: 'alert-circle', color: '#F44336', bgColor: '#FFEBEE', description: 'Severe disturbance' }
//     ];

//     // const AI_SERVICE_URL = 'http://192.168.100.91:5001';
//     const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';
//     const API_TIMEOUT = 45000;

//     useEffect(() => {
//       (async () => {
//         await Audio.requestPermissionsAsync();
//         await ImagePicker.requestCameraPermissionsAsync();
//         await Audio.setAudioModeAsync({
//           allowsRecordingIOS: true, 
//           playsInSilentModeIOS: true, 
//           staysActiveInBackground: false,
//           shouldDuckAndroid: true, 
//           playThroughEarpieceAndroid: false,
//           interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
//           interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
//         });
//       })();
//       return () => {
//         recording?.stopAndUnloadAsync();
//         sound?.unloadAsync();
//       };
//     }, []);

//     useEffect(() => {
//       if (isRecording) {
//         Animated.loop(Animated.sequence([
//           Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
//           Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
//         ])).start();
//         Animated.loop(Animated.stagger(200, [
//           Animated.timing(waveAnim1, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//           Animated.timing(waveAnim2, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//           Animated.timing(waveAnim3, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         ])).start();
//       } else {
//         pulseAnim.setValue(1);
//       }
//     }, [isRecording]);

//     const startRecording = async () => {
//       try {
//         const { recording: newRecording } = await Audio.Recording.createAsync({
//           android: { 
//             extension: '.m4a', 
//             outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4, 
//             audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC, 
//             sampleRate: 16000, 
//             numberOfChannels: 1, 
//             bitRate: 128000 
//           },
//           ios: { 
//             extension: '.m4a', 
//             outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC, 
//             audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM, 
//             sampleRate: 16000, 
//             numberOfChannels: 1, 
//             bitRate: 128000, 
//             linearPCMBitDepth: 16, 
//             linearPCMIsBigEndian: false, 
//             linearPCMIsFloat: false 
//           },
//           web: { 
//             mimeType: 'audio/webm;codecs=opus', 
//             bitsPerSecond: 128000 
//           },
//         });
//         setRecording(newRecording);
//         setIsRecording(true);
//         setRecordingDuration(0);
//         setAttachmentType('audio');
//         setAiResults(null);
//         recordingInterval.current = setInterval(() => {
//           setRecordingDuration(p => p + 1);
//           setCurrentDb(Math.floor(Math.random() * 45 + 40));
//         }, 1000);
//       } catch (err) {
//         Alert.alert('Error', 'Failed to start recording.');
//       }
//     };

//     const stopRecording = async () => {
//       try {
//         await recording.stopAndUnloadAsync();
//         const uri = recording.getURI();
//         setAudioUri(uri);
//         setIsRecording(false);
//         setRecording(null);
//         clearInterval(recordingInterval.current);
//         const { sound: newSound } = await Audio.Sound.createAsync({ uri });
//         const status = await newSound.getStatusAsync();
//         setTotalDuration(Math.floor(status.durationMillis / 1000));
//         setSound(newSound);
        
//         if (uri) {
//           setTimeout(() => {
//             analyzeWithYAMNet(uri);
//           }, 500);
//         }
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     // =============================
//     // PREPARE AUDIO FOR AI (WITH FFMPEG CONVERSION)
//     // =============================
//     const prepareAudioForAI = async (audioUri) => {
//     try {
//       console.log('🔄 Preparing audio for AI analysis...');
//       console.log('📁 Original URI:', audioUri);
      
//       // Decode the URI first (remove double encoding)
//       let decodedUri = decodeURIComponent(audioUri);
//       console.log('📁 Decoded URI:', decodedUri);
      
//       // Remove file:// prefix if present
//       let fileUri = decodedUri;
//       if (decodedUri.startsWith('file://')) {
//         fileUri = decodedUri.replace('file://', '');
//       }
      
//       console.log('📁 File URI to read:', fileUri);
      
//       // Check if file exists
//       const fileInfo = await FileSystem.getInfoAsync(fileUri);
//       console.log('📊 File info:', fileInfo);
      
//       if (!fileInfo.exists) {
//         // Try alternative: read with the original URI
//         console.log('⚠️ File not found, trying original URI...');
//         const altFileInfo = await FileSystem.getInfoAsync(audioUri);
//         if (altFileInfo.exists) {
//           fileUri = audioUri;
//         } else {
//           throw new Error('Audio file not found');
//         }
//       }
      
//       // Read file as base64
//       console.log('📖 Reading file as base64...');
//       const base64Audio = await FileSystem.readAsStringAsync(fileUri, {
//         encoding: FileSystem.EncodingType.Base64,
//       });
      
//       console.log(`✅ Audio prepared: ${base64Audio.length} chars`);
      
//       return {
//         base64: base64Audio,
//         mimeType: 'audio/m4a',
//         filename: 'recording.m4a',
//         size: base64Audio.length,
//       };
      
//     } catch (error) {
//       console.error('❌ Audio preparation error:', error);
//       console.error('Error details:', JSON.stringify(error, null, 2));
//       throw new Error(`Failed to prepare audio: ${error.message}`);
//     }
//   };
//     // =============================
//     // YAMNet AI Analysis Function
//     // =============================
//  // =============================
// // UPDATED: Handle both audio and video properly
// // =============================
// // =============================
// // UPDATED: Handle both audio and video with decibel & distance
// // =============================
// const analyzeWithYAMNet = async (mediaUri) => {
//   if (!mediaUri) {
//     Alert.alert('No Media', 'Please record audio or video first');
//     return;
//   }

//   // Determine media type if not set
//   let mediaType = attachmentType;
//   if (!mediaType) {
//     if (mediaUri.includes('.mp4') || mediaUri.includes('.mov')) {
//       mediaType = 'video';
//     } else {
//       mediaType = 'audio';
//     }
//     console.log(`🔍 Guessed media type: ${mediaType}`);
//   }

//   setIsAnalyzing(true);
//   setAiResults(null);

//   try {
//     console.log('🎯 Starting YAMNet analysis...');
//     console.log('📁 Media URI:', mediaUri);
//     console.log('📁 Media type:', mediaType);
    
//     // Check if file exists
//     const fileInfo = await FileSystem.getInfoAsync(mediaUri);
//     console.log('📊 File info:', fileInfo);
    
//     if (!fileInfo.exists) {
//       throw new Error('File not found');
//     }
    
//     console.log(`📊 File size: ${fileInfo.size} bytes`);
    
//     // Create FormData
//     const formData = new FormData();
    
//     // Get file name and type
//     const fileName = mediaUri.split('/').pop();
//     const fileType = mediaType === 'video' ? 'video/mp4' : 'audio/m4a';
    
//     // Append file directly - NO base64 conversion!
//     formData.append('audio', {
//       uri: mediaUri,
//       type: fileType,
//       name: fileName,
//     });
    
//     // Also append metadata
//     formData.append('mime_type', fileType);
//     formData.append('filename', fileName);
    
//     console.log(`📤 Sending ${mediaType} as multipart/form-data...`);
//     console.log(`📦 File: ${fileName}, Size: ${fileInfo.size} bytes`);
    
//     // Create controller for timeout
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout for video
    
//     const response = await fetch(`${AI_SERVICE_URL}/api/ai/analyze`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'multipart/form-data',
//         'Accept': 'application/json',
//         'ngrok-skip-browser-warning': 'true',
//       },
//       body: formData,
//       signal: controller.signal,
//     });
    
//     clearTimeout(timeoutId);
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('❌ Server error:', errorText);
//       throw new Error(`Server error: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log('✅ AI Response received:', data);

//     if (data.success) {
//       setAiResults(data);
      
//       // Auto-select the top detection as reason
//       if (data.detections && data.detections.length > 0) {
//         const topDetection = data.detections[0];
//         setSelectedReason(topDetection.class);
        
//         // Also auto-set noise level based on decibel measurement
//         if (data.noise_level) {
//           setNoiseLevel(data.noise_level.value);
//         }
        
//         // Show detailed alert
//         Alert.alert(
//           '🎯 Analysis Complete',
//           `Sound: ${topDetection.class} (${(topDetection.confidence * 100).toFixed(1)}%)\n` +
//           `Volume: ${data.decibel} dB (${data.noise_level?.level})\n` +
//           `Distance: ~${data.distance?.meters}m (${data.distance?.category})`,
//           [{ text: 'OK' }]
//         );
//       } else {
//         Alert.alert('Analysis Complete', 'No specific sounds detected');
//       }
//     } else {
//       Alert.alert('Analysis Failed', data.error || 'Unknown error');
//     }

//   } catch (error) {
//     console.error('❌ AI Analysis Error:', error);
    
//     let errorMessage = 'Failed to analyze media. ';
    
//     if (error.name === 'AbortError') {
//       errorMessage += 'Request timed out. Try a shorter video.';
//     } else if (error.message.includes('OutOfMemoryError')) {
//       errorMessage += 'File too large. Try a shorter recording.';
//     } else {
//       errorMessage += error.message;
//     }
    
//     Alert.alert('AI Error', errorMessage);
//   } finally {
//     setIsAnalyzing(false);
//   }
// };
//     // Update testAIService function:
//   const testAIService = async () => {
//     try {
//       setIsAnalyzing(true);
//       console.log('🔌 Testing AI service connection...');
      
//       const response = await fetch(`${AI_SERVICE_URL}/api/ai/health`, {
//         headers: {
//           'ngrok-skip-browser-warning': 'true',
//           'User-Agent': 'ReactNativeApp/1.0',
//         },
//       });
      
//       const responseData = await response.json(); // FIX: Changed from 'data' to 'responseData'
      
//       let message = `Main Backend: ✅ Online\n`;
      
//       if (responseData.flask_ai) {
//         if (responseData.flask_ai.status === 'healthy') {
//           message += `Flask AI: ✅ Healthy\n`;
//           message += `Model: ${responseData.flask_ai.model}\n`;
//           message += `Classes: ${responseData.flask_ai.classes}`;
//         } else {
//           message += `Flask AI: ❌ ${responseData.flask_ai.error || 'Unavailable'}`;
//         }
//       } else {
//         message += `Flask AI: ❌ Not connected`;
//       }
      
//       Alert.alert('Service Status', message, [{ text: 'OK' }]);
      
//     } catch (error) {
//       console.error('Service test failed:', error);
      
//       Alert.alert(
//         'Connection Failed', 
//         `Cannot connect to ${AI_SERVICE_URL}\n\nError: ${error.message}\n\nMake sure:\n1. Backend is running\n2. Ngrok is active\n3. Correct URL is set`,
//         [{ text: 'OK' }]
//       );
//     } finally {
//       setIsAnalyzing(false);
//     }
//   };

//     // Manual trigger for AI analysis
//     const triggerAIAnalysis = async () => {
//       if (!audioUri) {
//         Alert.alert('No Audio', 'Please record audio first');
//         return;
//       }
//       await analyzeWithYAMNet(audioUri);
//     };

// const pickVideo = () => {
//   Alert.alert('Add Video', 'Choose an option', [
//     { 
//       text: 'Record Video', 
//       onPress: async () => {
//         const result = await ImagePicker.launchCameraAsync({ 
//           mediaTypes: ImagePicker.MediaTypeOptions.Videos, 
//           allowsEditing: true, 
//           aspect: [16, 9], 
//           quality: 1, 
//           videoMaxDuration: 60 
//         });
//         if (!result.canceled && result.assets[0]) {
//           const videoUri = result.assets[0].uri;
          
//           // ✅ CRITICAL: Set attachmentType FIRST
//           setAttachmentType('video');
//           setVideoUri(videoUri);
//           sound?.unloadAsync();
//           setAudioUri(null);
//           setSound(null);
//           setAiResults(null);
          
//           // Small delay to ensure state is updated
//           setTimeout(() => {
//             // Now attachmentType will be 'video' when analyze runs
//             analyzeWithYAMNet(videoUri);
//           }, 100);
//         }
//       }
//     },
//     { 
//       text: 'Choose from Gallery', 
//       onPress: async () => {
//         const result = await ImagePicker.launchImageLibraryAsync({ 
//           mediaTypes: ImagePicker.MediaTypeOptions.Videos, 
//           allowsEditing: true, 
//           aspect: [16, 9], 
//           quality: 1 
//         });
//         if (!result.canceled && result.assets[0]) {
//           const videoUri = result.assets[0].uri;
          
//           // ✅ CRITICAL: Set attachmentType FIRST
//           setAttachmentType('video');
//           setVideoUri(videoUri);
//           sound?.unloadAsync();
//           setAudioUri(null);
//           setSound(null);
//           setAiResults(null);
          
//           // Small delay to ensure state is updated
//           setTimeout(() => {
//             analyzeWithYAMNet(videoUri);
//           }, 100);
//         }
//       }
//     },
//     { text: 'Cancel', style: 'cancel' },
//   ]);
// };

//     const deleteVideo = () => {
//       Alert.alert('Delete Video', 'Remove this video?', [
//         { text: 'Cancel', style: 'cancel' },
//         { 
//           text: 'Delete', 
//           style: 'destructive', 
//           onPress: () => { 
//             setVideoUri(null); 
//             setAttachmentType(null); 
//           }
//         },
//       ]);
//     };

//     const getUserLocation = async () => {
//       setLocationLoading(true);
//       setLocationError(null);
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== 'granted') {
//           setLocationError('Location permission denied');
//           Alert.alert('Permission Required', 'Please grant location access.');
//           setLocationLoading(false);
//           return;
//         }
//         const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
//         const address = await Location.reverseGeocodeAsync({ 
//           latitude: currentLocation.coords.latitude, 
//           longitude: currentLocation.coords.longitude 
//         });
//         setLocation({ 
//           latitude: currentLocation.coords.latitude, 
//           longitude: currentLocation.coords.longitude, 
//           address: address[0] || null, 
//           timestamp: new Date().toISOString() 
//         });
//         setLocationLoading(false);
//         Alert.alert('✅ Location Added', `${address[0]?.street || ''} ${address[0]?.city || ''}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
//       } catch (error) {
//         setLocationError('Failed to get location');
//         setLocationLoading(false);
//         Alert.alert('Error', 'Failed to get location.');
//       }
//     };

//     const playPauseRecording = async () => {
//       if (!sound) return;
//       try {
//         if (isPlaying) {
//           await sound.pauseAsync();
//           setIsPlaying(false);
//         } else {
//           if (playbackPosition >= totalDuration) {
//             await sound.setPositionAsync(0);
//             setPlaybackPosition(0);
//           }
//           await sound.playAsync();
//           setIsPlaying(true);
//           sound.setOnPlaybackStatusUpdate((status) => {
//             if (status.isLoaded) {
//               setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//               if (status.didJustFinish) { 
//                 setIsPlaying(false); 
//                 setPlaybackPosition(0); 
//               }
//             }
//           });
//         }
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     const restartRecording = async () => {
//       if (!sound) return;
//       try {
//         await sound.setPositionAsync(0);
//         setPlaybackPosition(0);
//         await sound.playAsync();
//         setIsPlaying(true);
//         sound.setOnPlaybackStatusUpdate((status) => {
//           if (status.isLoaded) {
//             setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//             if (status.didJustFinish) { 
//               setIsPlaying(false); 
//               setPlaybackPosition(0); 
//             }
//           }
//         });
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     const deleteRecording = () => {
//       Alert.alert('Delete Recording', 'Delete this recording?', [
//         { text: 'Cancel', style: 'cancel' },
//         { 
//           text: 'Delete', 
//           style: 'destructive', 
//           onPress: () => {
//             sound?.unloadAsync();
//             setSound(null);
//             setAudioUri(null);
//             setTotalDuration(0);
//             setPlaybackPosition(0);
//             setIsPlaying(false);
//             setAttachmentType(null);
//             setAiResults(null);
//           }
//         },
//       ]);
//     };

//     const saveRecording = async () => {
//       if (!audioUri && !videoUri) {
//         Alert.alert('No Content', 'Please record audio or attach a video first.');
//         return;
//       }
//       if (!selectedReason) {
//         Alert.alert('Reason Required', 'Please select a reason for this noise report.');
//         return;
//       }
//       if (!noiseLevel) {
//         Alert.alert('Noise Level Required', 'Please select the noise level (Low/Medium/High).');
//         return;
//       }

//       setIsSubmitting(true);

//       try {
//         const userId = await AsyncStorage.getItem('userId');
        
//         if (!userId) {
//           Alert.alert('Authentication Error', 'Please log in again.');
//           setIsSubmitting(false);
//           return;
//         }

//         const formData = new FormData();
        
//         formData.append('userId', userId);
        
//         const mediaUri = videoUri || audioUri;
//         const mediaType = videoUri ? 'video' : 'audio';
//         const fileExtension = mediaUri.split('.').pop();
//         const fileName = `noise_report_${Date.now()}.${fileExtension}`;
        
//         formData.append('media', {
//           uri: mediaUri,
//           type: videoUri ? `video/${fileExtension}` : `audio/${fileExtension}`,
//           name: fileName,
//         });

//         const finalReason = aiResults?.detections?.[0]?.class || selectedReason;
//         formData.append('reason', finalReason);
//         formData.append('mediaType', mediaType);
//         formData.append('noiseLevel', noiseLevel);
        
//         if (aiResults) {
//           formData.append('ai_analysis', JSON.stringify(aiResults));
//         }
        
//         if (comment) {
//           formData.append('comment', comment);
//         }
        
//         if (location) {
//           formData.append('location', JSON.stringify({
//             latitude: location.latitude,
//             longitude: location.longitude,
//             address: location.address,
//             timestamp: location.timestamp,
//           }));
//         }

//         const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//           headers: {
//             'Content-Type': 'multipart/form-data',
//           },
//           timeout: 60000,
//         });

//         setIsSubmitting(false);

//         const attachmentInfo = videoUri 
//           ? `Video: ${videoUri.split('/').pop()}`
//           : `Audio: ${formatTime(totalDuration)}`;

//         const locationInfo = location 
//           ? `\nLocation: ${location.address?.street || ''} ${location.address?.city || ''}\nCoordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
//           : '\nLocation: Not provided';

//         const noiseLevelInfo = noiseLevels.find(nl => nl.value === noiseLevel);
//         const noiseLevelText = `\nNoise Level: ${noiseLevelInfo?.label} (${noiseLevelInfo?.description})`;
        
//         const aiInfo = aiResults 
//           ? `\nAI Detection: ${aiResults.detections?.[0]?.class || 'None'} (${aiResults.detections?.[0]?.confidence ? (aiResults.detections[0].confidence * 100).toFixed(1) + '%' : 'N/A'})`
//           : '';

//         const reportDetails = `Noise Report Submitted Successfully!\n\nReason: ${finalReason}${comment ? `\nDetails: ${comment}` : ''}${noiseLevelText}${aiInfo}\n${attachmentInfo}${locationInfo}\nTimestamp: ${new Date().toLocaleString()}`;

//         Alert.alert('✅ Report Submitted', reportDetails, [
//           { 
//             text: 'OK', 
//             onPress: () => {
//               setComment('');
//               setSelectedReason('');
//               setNoiseLevel('');
//               sound?.unloadAsync();
//               setSound(null);
//               setAudioUri(null);
//               setVideoUri(null);
//               setAttachmentType(null);
//               setLocation(null);
//               setLocationError(null);
//               setTotalDuration(0);
//               setPlaybackPosition(0);
//               setAiResults(null);
//             }
//           }
//         ]);

//       } catch (error) {
//         setIsSubmitting(false);
//         console.error('Error submitting report:', error);
        
//         let errorMessage = 'Failed to submit noise report. Please try again.';
        
//         if (error.response) {
//           errorMessage = error.response.data?.message || errorMessage;
//         } else if (error.request) {
//           errorMessage = 'Network error. Please check your internet connection.';
//         }
        
//         Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
//       }
//     };

//     const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
//     const getDbColor = (db) => db < 50 ? '#8B7355' : db < 70 ? '#D4AC0D' : db < 85 ? '#E67E22' : '#E74C3C';

//     const openDrawer = () => {
//       setDrawerVisible(true);
//       Animated.parallel([
//         Animated.timing(slideAnim, { 
//           toValue: 0, 
//           duration: 350, 
//           easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), 
//           useNativeDriver: true 
//         }),
//         Animated.timing(overlayOpacity, { 
//           toValue: 1, 
//           duration: 350, 
//           easing: Easing.out(Easing.quad), 
//           useNativeDriver: true 
//         }),
//       ]).start();
//     };

//     const closeDrawer = () => {
//       Animated.parallel([
//         Animated.timing(slideAnim, { 
//           toValue: -width * 0.8, 
//           duration: 300, 
//           easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), 
//           useNativeDriver: true 
//         }),
//         Animated.timing(overlayOpacity, { 
//           toValue: 0, 
//           duration: 250, 
//           easing: Easing.in(Easing.quad), 
//           useNativeDriver: true 
//         }),
//       ]).start(() => setDrawerVisible(false));
//     };

//     const showConnectionInfo = () => {
//       const manifest = Constants.expoConfig;
//       const isTunnel = manifest?.extra?.useTunnel;
      
//       Alert.alert(
//         'Connection Info',
//         `AI Service URL: ${AI_SERVICE_URL}\nExpo Tunnel: ${isTunnel ? 'Yes' : 'No'}\nPlatform: ${Platform.OS}\nFor tunnel to work:\n1. Flask must run on 0.0.0.0\n2. Use computer IP:192.168.173.45\n3. Both on same WiFi`,
//         [{ text: 'OK' }]
//       );
//     };

//     return (
//       <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
//         <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
//         <LinearGradient colors={['#8B4513', '#654321']} style={s.header}>
//           <View style={s.headerContent}>
//             <View style={s.headerTop}>
//               <TouchableOpacity onPress={openDrawer} style={s.headerButton}>
//                 <Ionicons name="menu" size={28} color="#D4AC0D" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}>
//                 <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
//               </TouchableOpacity>
//             </View>
//             <Text style={s.headerTitle}>🎙️ Noise Report</Text>
//             <Text style={s.headerSubtitle}>
//               {isRecording ? 'Recording...' : videoUri ? 'Video attached' : audioUri ? 'Recording complete' : 'Record audio or attach video'}
//               {isAnalyzing && ' • AI analyzing...'}
//             </Text>
//           </View>
//         </LinearGradient>

//         <ScrollView style={s.scrollView} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
//           <View style={s.section}>
//             <Text style={s.sectionTitle}>🚨 Noise Level</Text>
//             <Text style={s.sectionSubtitle}>How severe is the noise disturbance?</Text>
//             <View style={s.noiseLevelContainer}>
//               {noiseLevels.map((level) => (
//                 <TouchableOpacity
//                   key={level.value}
//                   style={[
//                     s.noiseLevelCard,
//                     { backgroundColor: level.bgColor, borderColor: level.color },
//                     noiseLevel === level.value && s.noiseLevelCardSelected
//                   ]}
//                   onPress={() => setNoiseLevel(level.value)}
//                 >
//                   <Ionicons 
//                     name={level.icon} 
//                     size={32} 
//                     color={level.color} 
//                   />
//                   <Text style={[s.noiseLevelLabel, { color: level.color }]}>
//                     {level.label}
//                   </Text>
//                   <Text style={s.noiseLevelDesc}>
//                     {level.description}
//                   </Text>
//                   {noiseLevel === level.value && (
//                     <View style={[s.selectedBadge, { backgroundColor: level.color }]}>
//                       <Ionicons name="checkmark" size={16} color="#fff" />
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           <View style={s.section}>
//             <Text style={s.sectionTitle}>📋 Noise Type</Text>
//             <Text style={s.sectionSubtitle}>AI Detection or Manual Selection</Text>
            
//             {audioUri && !isRecording && (
//               <TouchableOpacity 
//                 style={[s.aiButton, isAnalyzing && s.aiButtonDisabled]}
//                 onPress={triggerAIAnalysis}
//                 disabled={isAnalyzing}
//               >
//                 {isAnalyzing ? (
//                   <>
//                     <ActivityIndicator size="small" color="#fff" />
//                     <Text style={s.aiButtonText}>Analyzing with AI...</Text>
//                   </>
//                 ) : (
//                   <>
//                     <Ionicons name="musical-notes" size={24} color="#fff" />
//                     <Text style={s.aiButtonText}>
//                       {aiResults ? 'Re-analyze with AI' : 'Analyze with AI (YAMNet)'}
//                     </Text>
//                   </>
//                 )}
//               </TouchableOpacity>
//             )}

//          {aiResults && (
//   <View style={s.aiResultsContainer}>
//     <View style={s.aiHeader}>
//       <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
//       <Text style={s.aiTitle}>AI Detection Results</Text>
//       <Text style={s.aiModelTag}>{aiResults.model || 'YAMNet'}</Text>
//     </View>
    
//     {/* Decibel & Noise Level Display */}
//     {aiResults.decibel && (
//       <View style={s.decibelContainer}>
//         <View style={s.decibelHeader}>
//           <Ionicons name="volume-high" size={24} color="#8B4513" />
//           <Text style={s.decibelTitle}>Noise Measurement</Text>
//         </View>
        
//         <View style={s.decibelMeter}>
//           <Text style={s.decibelValue}>{aiResults.decibel} dB</Text>
//           <View style={[
//             s.noiseLevelBadge, 
//             { 
//               backgroundColor: 
//                 aiResults.noise_level?.value === 'green' ? '#4CAF50' :
//                 aiResults.noise_level?.value === 'yellow' ? '#FFC107' : '#F44336' 
//             }
//           ]}>
//             <Text style={s.noiseLevelBadgeText}>
//               {aiResults.noise_level?.level} - {aiResults.noise_level?.description}
//             </Text>
//           </View>
//         </View>
        
//         {/* Visual decibel scale */}
//         <View style={s.decibelScale}>
//           <View style={[s.scaleSegment, { backgroundColor: '#4CAF50', flex: 5 }]}>
//             <Text style={s.scaleSegmentText}>Quiet</Text>
//           </View>
//           <View style={[s.scaleSegment, { backgroundColor: '#FFC107', flex: 2 }]}>
//             <Text style={s.scaleSegmentText}>Moderate</Text>
//           </View>
//           <View style={[s.scaleSegment, { backgroundColor: '#F44336', flex: 3 }]}>
//             <Text style={s.scaleSegmentText}>Loud</Text>
//           </View>
//         </View>
        
//         {/* Decibel indicator arrow */}
//         <View style={s.decibelIndicatorContainer}>
//           <View style={s.decibelIndicatorLine} />
//           <View 
//             style={[
//               s.decibelIndicator,
//               { 
//                 left: aiResults.decibel < 50 ? '10%' :
//                       aiResults.decibel < 70 ? '40%' : '75%'
//               }
//             ]}
//           >
//             <Ionicons name="arrow-drop-down" size={24} color="#8B4513" />
//             <Text style={s.decibelIndicatorText}>{aiResults.decibel} dB</Text>
//           </View>
//         </View>
//       </View>
//     )}
    
//     {/* Distance Estimation Display */}
//     {aiResults.distance && (
//       <View style={s.distanceContainer}>
//         <View style={s.distanceHeader}>
//           <Ionicons name="navigate" size={24} color="#8B4513" />
//           <Text style={s.distanceTitle}>Distance Estimation</Text>
//         </View>
        
//         <View style={s.distanceContent}>
//           <View style={s.distanceIconContainer}>
//             <Text style={s.distanceIcon}>{aiResults.distance.icon}</Text>
//           </View>
//           <View style={s.distanceInfo}>
//             <Text style={s.distanceCategory}>
//               {aiResults.distance.category}
//             </Text>
//             <Text style={s.distanceMeters}>
//               ~{aiResults.distance.meters} meters away
//             </Text>
//             <Text style={s.distanceDescription}>
//               {aiResults.distance.description}
//             </Text>
//             <Text style={s.distanceReference}>
//               Based on {aiResults.distance.reference_sound} ({aiResults.distance.reference_db} dB at 1m)
//             </Text>
//           </View>
//         </View>
        
//         {/* Visual distance scale */}
//         <View style={s.distanceScaleContainer}>
//           <Text style={s.scaleLabel}>Source Distance</Text>
//           <View style={s.distanceScale}>
//             <View style={[s.distanceMarker, { left: '0%' }]}>
//               <Text style={s.markerLabel}>0m</Text>
//             </View>
//             <View style={[s.distanceMarker, { left: '25%' }]}>
//               <Text style={s.markerLabel}>1m</Text>
//             </View>
//             <View style={[s.distanceMarker, { left: '50%' }]}>
//               <Text style={s.markerLabel}>3m</Text>
//             </View>
//             <View style={[s.distanceMarker, { left: '75%' }]}>
//               <Text style={s.markerLabel}>10m</Text>
//             </View>
//             <View style={[s.distanceMarker, { left: '100%' }]}>
//               <Text style={s.markerLabel}>30m+</Text>
//             </View>
//           </View>
//           <View 
//             style={[
//               s.distanceIndicator,
//               { 
//                 left: aiResults.distance.meters < 1 ? '0%' :
//                       aiResults.distance.meters < 3 ? '12.5%' :
//                       aiResults.distance.meters < 10 ? '37.5%' :
//                       aiResults.distance.meters < 30 ? '62.5%' : '87.5%'
//               }
//             ]}
//           >
//             <Ionicons name="location" size={24} color="#8B4513" />
//             <Text style={s.distanceIndicatorText}>
//               {aiResults.distance.meters}m
//             </Text>
//           </View>
//         </View>
//       </View>
//     )}
    
//     {/* Detections List */}
//     <Text style={s.detectionsTitle}>Detected Sounds:</Text>
//     {aiResults.detections?.slice(0, 5).map((detection, index) => (
//       <TouchableOpacity
//         key={index}
//         style={[
//           s.detectionItem,
//           selectedReason === detection.class && s.detectionItemSelected
//         ]}
//         onPress={() => setSelectedReason(detection.class)}
//       >
//         <View style={s.detectionInfo}>
//           <Text style={s.detectionRank}>#{index + 1}</Text>
//           <View style={s.detectionText}>
//             <Text style={s.detectionClass}>{detection.class}</Text>
//             <Text style={s.detectionConfidence}>
//               {(detection.confidence * 100).toFixed(1)}% confidence
//             </Text>
//           </View>
//         </View>
//         {selectedReason === detection.class && (
//           <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
//         )}
//       </TouchableOpacity>
//     ))}
    
//     {/* Processing time footer */}
//     {aiResults.processing_time && (
//       <View style={s.resultsFooter}>
//         <Text style={s.processingTime}>
//           ⏱️ Processed in {aiResults.processing_time}s
//         </Text>
//         <Text style={s.summaryText}>
//           {aiResults.decibel} dB • ~{aiResults.distance?.meters}m away
//         </Text>
//       </View>
//     )}
//   </View>
// )}
//             <Text style={s.manualSelectionLabel}>Or select manually:</Text>
//             <View style={s.reasonGrid}>
//               {noiseReasons.map((r, i) => (
//                 <TouchableOpacity key={i} style={[s.chip, selectedReason === r && s.chipSelected]} onPress={() => setSelectedReason(r)}>
//                   <Text style={[s.chipText, selectedReason === r && s.chipTextSelected]}>{r}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           <View style={s.section}>
//             <Text style={s.sectionTitle}>💬 Additional Details</Text>
//             <Text style={s.sectionSubtitle}>Describe the noise issue (optional)</Text>
//             <View>
//               <TextInput 
//                 style={s.input} 
//                 placeholder="e.g., Loud music from neighbor's apartment..." 
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

//           <View style={s.section}>
//             <Text style={s.sectionTitle}>📍 Location</Text>
//             <Text style={s.sectionSubtitle}>Add your current location</Text>
//             {!location ? (
//               <TouchableOpacity style={s.locationBtn} onPress={getUserLocation} disabled={locationLoading}>
//                 <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#fff" />
//                 <Text style={s.locationBtnText}>{locationLoading ? 'Getting...' : 'Add Current Location'}</Text>
//               </TouchableOpacity>
//             ) : (
//               <View style={s.locationDisplay}>
//                 <View style={s.locationInfo}>
//                   <Ionicons name="location-sharp" size={20} color="#8B4513" />
//                   <View style={{ flex: 1 }}>
//                     <Text style={s.locationAddress}>{location.address?.street || 'Unknown'}, {location.address?.city || 'Unknown'}</Text>
//                     <Text style={s.locationCoords}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
//                   </View>
//                 </View>
//                 <View style={s.locationActions}>
//                   <TouchableOpacity style={s.refreshBtn} onPress={getUserLocation}>
//                     <Ionicons name="refresh" size={20} color="#8B4513" />
//                   </TouchableOpacity>
//                   <TouchableOpacity style={s.removeBtn} onPress={() => setLocation(null)}>
//                     <Ionicons name="close-circle" size={20} color="#E74C3C" />
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             )}
//             {locationError && <Text style={s.error}>{locationError}</Text>}
//           </View>

//           <View style={s.attachmentSelector}>
//             <TouchableOpacity 
//               style={[s.attachBtn, attachmentType === 'audio' && s.attachBtnActive]} 
//               onPress={() => {
//                 if (attachmentType === 'video') {
//                   Alert.alert('Switch to Audio', 'Remove video?', [
//                     { text: 'Cancel', style: 'cancel' }, 
//                     { 
//                       text: 'OK', 
//                       onPress: () => { 
//                         setVideoUri(null); 
//                         setAttachmentType('audio'); 
//                       }
//                     }
//                   ]);
//                 }
//               }}
//             >
//               <Ionicons name="mic" size={24} color={attachmentType === 'audio' ? '#fff' : '#8B4513'} />
//               <Text style={[s.attachBtnText, attachmentType === 'audio' && s.attachBtnTextActive]}>Audio</Text>
//             </TouchableOpacity>
//             <TouchableOpacity 
//               style={[s.attachBtn, attachmentType === 'video' && s.attachBtnActive]} 
//               onPress={pickVideo}
//             >
//               <Ionicons name="videocam" size={24} color={attachmentType === 'video' ? '#fff' : '#8B4513'} />
//               <Text style={[s.attachBtnText, attachmentType === 'video' && s.attachBtnTextActive]}>Video</Text>
//             </TouchableOpacity>
//           </View>

//          {videoUri && (
//   <View style={s.section}>
//     <Text style={s.sectionTitle}>📹 Video Preview</Text>
//     <View style={s.videoContainer}>
//       <Video 
//         ref={videoRef} 
//         source={{ uri: videoUri }} 
//         style={s.video} 
//         useNativeControls 
//         resizeMode="contain" 
//         isLooping 
//       />
//       <TouchableOpacity style={s.deleteVideoBtn} onPress={deleteVideo}>
//         <Ionicons name="close-circle" size={32} color="#E74C3C" />
//       </TouchableOpacity>
//     </View>
    
//     {/* ✅ ADD AI ANALYSIS BUTTON FOR VIDEOS */}
//     <TouchableOpacity 
//       style={[s.aiButton, isAnalyzing && s.aiButtonDisabled]}
//       onPress={() => analyzeWithYAMNet(videoUri)}
//       disabled={isAnalyzing}
//     >
//       {isAnalyzing ? (
//         <>
//           <ActivityIndicator size="small" color="#fff" />
//           <Text style={s.aiButtonText}>Analyzing Video Audio...</Text>
//         </>
//       ) : (
//         <>
//           <Ionicons name="videocam" size={24} color="#fff" />
//           <Text style={s.aiButtonText}>Analyze Video with AI</Text>
//         </>
//       )}
//     </TouchableOpacity>
    
//     <Text style={s.videoInfo}>Video: {videoUri.split('/').pop()}</Text>
//   </View>
// )}

//           {!videoUri && (
//             <View style={s.section}>
//               <View style={s.recordingContainer}>
//                 {isRecording && (
//                   <View style={s.waveformContainer}>
//                     <Text style={[s.dbReading, { color: getDbColor(currentDb) }]}>{currentDb} dB</Text>
//                     <View style={s.waveform}>
//                       {[waveAnim1, waveAnim2, waveAnim3, waveAnim1, waveAnim2].map((anim, i) => (
//                         <Animated.View 
//                           key={i} 
//                           style={[
//                             s.waveBar, 
//                             { 
//                               height: anim.interpolate({ 
//                                 inputRange: [0, 1], 
//                                 outputRange: [10, [60, 80, 50, 70, 40][i]] 
//                               }), 
//                               backgroundColor: getDbColor(currentDb) 
//                             }
//                           ]} 
//                         />
//                       ))}
//                     </View>
//                   </View>
//                 )}
//                 <View style={s.timerContainer}>
//                   <Text style={s.timerText}>{formatTime(isRecording ? recordingDuration : totalDuration)}</Text>
//                   {isRecording && <View style={s.recordingDot}><View style={s.pulsingDot} /></View>}
//                 </View>
//                 <TouchableOpacity onPress={isRecording ? stopRecording : startRecording}>
//                   <Animated.View style={[
//                     s.recordButton, 
//                     { 
//                       backgroundColor: isRecording ? '#E74C3C' : '#D4AC0D', 
//                       transform: [{ scale: isRecording ? pulseAnim : 1 }] 
//                     }
//                   ]}>
//                     <Ionicons name={isRecording ? "stop" : "mic"} size={50} color="#fff" />
//                   </Animated.View>
//                 </TouchableOpacity>
//                 <Text style={s.recordStatus}>
//                   {isRecording ? 'Recording... Tap to stop' : audioUri ? 'Recording complete' : 'Tap to start'}
//                   {isAnalyzing && ' • AI analyzing...'}
//                 </Text>
//               </View>
//             </View>
//           )}

//           {audioUri && !videoUri && (
//             <View style={s.section}>
//               <Text style={s.sectionTitle}>🔊 Playback</Text>
//               <View style={s.progressContainer}>
//                 <View style={s.progressBar}>
//                   <View style={[
//                     s.progressFill, 
//                     { 
//                       width: `${totalDuration > 0 ? (playbackPosition / totalDuration) * 100 : 0}%` 
//                     }
//                   ]} 
//                   />
//                 </View>
//                 <View style={s.timeLabels}>
//                   <Text style={s.timeText}>{formatTime(playbackPosition)}</Text>
//                   <Text style={s.timeText}>{formatTime(totalDuration)}</Text>
//                 </View>
//               </View>
//               <View style={s.playbackControls}>
//                 <TouchableOpacity onPress={restartRecording} style={s.restartBtn}>
//                   <Ionicons name="play-skip-back" size={25} color="#8B4513" />
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={playPauseRecording} style={s.playBtn}>
//                   <Ionicons name={isPlaying ? "pause" : "play"} size={30} color="#8B4513" />
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={deleteRecording} style={s.deleteBtn}>
//                   <Ionicons name="trash" size={25} color="#E74C3C" />
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}

//           <View style={s.section}>
//             <Text style={s.sectionTitle}>🔧 Connection Debug</Text>
//             <TouchableOpacity 
//               style={s.testServiceButton}
//               onPress={testAIService}
//               disabled={isAnalyzing}
//             >
//               <Ionicons name="server" size={20} color="#fff" />
//               <Text style={s.testServiceButtonText}>
//                 {isAnalyzing ? 'Testing...' : 'Test AI Service Connection'}
//               </Text>
//             </TouchableOpacity>
            
//             <TouchableOpacity 
//               style={[s.testServiceButton, { backgroundColor: '#9C27B0', marginTop: 10 }]}
//               onPress={showConnectionInfo}
//             >
//               <Ionicons name="information-circle" size={20} color="#fff" />
//               <Text style={s.testServiceButtonText}>Show Connection Info</Text>
//             </TouchableOpacity>
            
//             <Text style={s.debugInfo}>
//               Using tunnel: {AI_SERVICE_URL}
//               {'\n'}For physical device: Use computer IP
//               {'\n'}Flask must run on: 0.0.0.0:5001
//             </Text>
//           </View>

//           {(audioUri || videoUri) && (
//             <TouchableOpacity 
//               onPress={saveRecording} 
//               style={[s.saveBtn, (!selectedReason || !noiseLevel || isSubmitting) && s.saveBtnDisabled]} 
//               disabled={!selectedReason || !noiseLevel || isSubmitting}
//             >
//               {isSubmitting ? (
//                 <>
//                   <ActivityIndicator size="small" color="#fff" />
//                   <Text style={s.saveBtnText}>Submitting...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={28} color="#fff" />
//                   <Text style={s.saveBtnText}>Submit Noise Report</Text>
//                   {aiResults && (
//                     <Ionicons name="sparkles" size={16} color="#FFD700" style={{ marginLeft: 8 }} />
//                   )}
//                 </>
//               )}
//             </TouchableOpacity>
//           )}
//         </ScrollView>

//         <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
//           <View style={s.modalContainer}>
//             <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
//               <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
//             </Animated.View>
//             <Animated.View style={[s.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
//               <CustomDrawer navigation={navigation} onClose={closeDrawer} />
//             </Animated.View>
//           </View>
//         </Modal>
//       </KeyboardAvoidingView>
//     );
//   }

//   const s = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#f5f5f5' },
//     header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
//     headerContent: { marginTop: 10 },
//     headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
//     headerButton: { padding: 8 },
//     headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
//     headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
//     scrollView: { flex: 1 },
//     section: { margin: 15, padding: 20, backgroundColor: '#fff', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
//     sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginBottom: 5 },
//     sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
    
//     noiseLevelContainer: { flexDirection: 'row', gap: 12 },
//     noiseLevelCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, alignItems: 'center', position: 'relative' },
//     noiseLevelCardSelected: { borderWidth: 3, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
//     noiseLevelLabel: { fontSize: 16, fontWeight: 'bold', marginTop: 8 },
//     noiseLevelDesc: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
//     selectedBadge: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    
//     reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
//     chip: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#f0f0f0', borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
//     chipSelected: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
//     chipText: { fontSize: 14, color: '#333' },
//     chipTextSelected: { color: '#fff', fontWeight: 'bold' },
//     input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff', minHeight: 100 },
//     charCount: { textAlign: 'right', fontSize: 12, color: '#999', marginTop: 5 },
//     locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#8B4513', padding: 15, borderRadius: 8, elevation: 2 },
//     locationBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
//     locationDisplay: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
//     locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
//     locationAddress: { fontSize: 14, fontWeight: 'bold', color: '#333' },
//     locationCoords: { fontSize: 12, color: '#666', marginTop: 2 },
//     locationActions: { flexDirection: 'row', gap: 10 },
//     refreshBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#8B4513' },
//     removeBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#E74C3C' },
//     error: { color: '#E74C3C', fontSize: 12, marginTop: 5 },
//     attachmentSelector: { flexDirection: 'row', marginHorizontal: 15, gap: 10, marginBottom: 15 },
//     attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, borderColor: '#8B4513' },
//     attachBtnActive: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
//     attachBtnText: { fontSize: 16, fontWeight: 'bold', color: '#8B4513' },
//     attachBtnTextActive: { color: '#fff' },
//     videoContainer: { position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 10 },
//     video: { width: '100%', height: 200, backgroundColor: '#000' },
//     deleteVideoBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },
//     videoInfo: { fontSize: 12, color: '#666', textAlign: 'center' },
//     recordingContainer: { alignItems: 'center', paddingVertical: 20 },
//     waveformContainer: { alignItems: 'center', marginBottom: 20 },
//     dbReading: { fontSize: 32, fontWeight: 'bold', marginBottom: 15 },
//     waveform: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 80 },
//     waveBar: { width: 8, borderRadius: 4, backgroundColor: '#D4AC0D' },
//     timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
//     timerText: { fontSize: 48, fontWeight: 'bold', color: '#8B4513' },
//     recordingDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#E74C3C', justifyContent: 'center', alignItems: 'center' },
//     pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
//     recordButton: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
//     recordStatus: { marginTop: 15, fontSize: 14, color: '#666', textAlign: 'center' },
//     progressContainer: { marginBottom: 15 },
//     progressBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
//     progressFill: { height: '100%', backgroundColor: '#D4AC0D', borderRadius: 3 },
//     timeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
//     timeText: { fontSize: 12, color: '#666' },
//     playbackControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
//     restartBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
//     playBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#D4AC0D', justifyContent: 'center', alignItems: 'center', elevation: 3 },
//     deleteBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
//     saveBtn: { margin: 15, padding: 18, backgroundColor: '#8B4513', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 3 },
//     saveBtnDisabled: { backgroundColor: '#ccc', opacity: 0.6 },
//     saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
//     modalContainer: { flex: 1 },
//     overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//     drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
    
//     aiButton: {
//       backgroundColor: '#2196F3',
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       gap: 12,
//       padding: 16,
//       borderRadius: 10,
//       marginBottom: 15,
//       elevation: 2,
//     },
//     aiButtonDisabled: {
//       backgroundColor: '#90CAF9',
//     },
//     aiButtonText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: 'bold',
//     },
//     aiResultsContainer: {
//       backgroundColor: '#f8f9fa',
//       borderRadius: 10,
//       padding: 15,
//       borderWidth: 1,
//       borderColor: '#e3f2fd',
//       marginBottom: 15,
//     },
//     aiHeader: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 8,
//       marginBottom: 12,
//       paddingBottom: 10,
//       borderBottomWidth: 1,
//       borderBottomColor: '#e0e0e0',
//     },
//     aiTitle: {
//       fontSize: 16,
//       fontWeight: 'bold',
//       color: '#333',
//       flex: 1,
//     },
//     aiModelTag: {
//       backgroundColor: '#e3f2fd',
//       color: '#1976d2',
//       fontSize: 10,
//       fontWeight: '600',
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 10,
//     },
//     detectionItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       padding: 10,
//       backgroundColor: '#fff',
//       borderRadius: 8,
//       marginBottom: 6,
//       borderWidth: 1,
//       borderColor: '#f0f0f0',
//     },
//     detectionItemSelected: {
//       backgroundColor: '#E8F5E9',
//       borderColor: '#4CAF50',
//     },
//     detectionInfo: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       flex: 1,
//       gap: 10,
//     },
//     detectionRank: {
//       fontSize: 13,
//       fontWeight: 'bold',
//       color: '#666',
//       width: 22,
//       textAlign: 'center',
//     },
//     detectionText: {
//       flex: 1,
//     },
//     detectionClass: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: '#333',
//       marginBottom: 2,
//     },
//     detectionConfidence: {
//       fontSize: 11,
//       color: '#666',
//     },
//     processingTime: {
//       fontSize: 11,
//       color: '#888',
//       textAlign: 'center',
//       marginTop: 8,
//       fontStyle: 'italic',
//     },
//     manualSelectionLabel: {
//       fontSize: 14,
//       color: '#666',
//       marginTop: 15,
//       marginBottom: 8,
//     },
    
//     testServiceButton: {
//       backgroundColor: '#4CAF50',
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       gap: 10,
//       padding: 15,
//       borderRadius: 10,
//       elevation: 2,
//     },
//     testServiceButtonText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: 'bold',
//     },
    
//     debugInfo: {
//       fontSize: 11,
//       color: '#666',
//       marginTop: 10,
//       fontStyle: 'italic',
//       lineHeight: 16,
//     },
//     // Add these to your existing StyleSheet

// decibelContainer: {
//   backgroundColor: '#f8f9fa',
//   borderRadius: 12,
//   padding: 15,
//   marginBottom: 15,
//   borderWidth: 1,
//   borderColor: '#e0e0e0',
// },
// decibelHeader: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   gap: 8,
//   marginBottom: 12,
// },
// decibelTitle: {
//   fontSize: 16,
//   fontWeight: 'bold',
//   color: '#333',
// },
// decibelMeter: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   justifyContent: 'space-between',
//   marginBottom: 15,
// },
// decibelValue: {
//   fontSize: 36,
//   fontWeight: 'bold',
//   color: '#8B4513',
// },
// noiseLevelBadge: {
//   paddingHorizontal: 12,
//   paddingVertical: 6,
//   borderRadius: 20,
// },
// noiseLevelBadgeText: {
//   color: '#fff',
//   fontWeight: 'bold',
//   fontSize: 14,
// },
// decibelScale: {
//   flexDirection: 'row',
//   height: 30,
//   borderRadius: 15,
//   overflow: 'hidden',
//   marginBottom: 10,
// },
// scaleSegment: {
//   justifyContent: 'center',
//   alignItems: 'center',
// },
// scaleSegmentText: {
//   color: '#fff',
//   fontSize: 10,
//   fontWeight: 'bold',
// },
// decibelIndicatorContainer: {
//   position: 'relative',
//   height: 30,
//   marginTop: 5,
// },
// decibelIndicatorLine: {
//   position: 'absolute',
//   top: 10,
//   left: 0,
//   right: 0,
//   height: 2,
//   backgroundColor: '#ddd',
// },
// decibelIndicator: {
//   position: 'absolute',
//   top: 0,
//   alignItems: 'center',
//   transform: [{ translateX: -12 }],
// },
// decibelIndicatorText: {
//   fontSize: 10,
//   color: '#8B4513',
//   fontWeight: 'bold',
//   marginTop: -5,
// },

// // Distance styles
// distanceContainer: {
//   backgroundColor: '#f8f9fa',
//   borderRadius: 12,
//   padding: 15,
//   marginBottom: 15,
//   borderWidth: 1,
//   borderColor: '#e0e0e0',
// },
// distanceHeader: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   gap: 8,
//   marginBottom: 12,
// },
// distanceTitle: {
//   fontSize: 16,
//   fontWeight: 'bold',
//   color: '#333',
// },
// distanceContent: {
//   flexDirection: 'row',
//   gap: 15,
//   marginBottom: 20,
// },
// distanceIconContainer: {
//   width: 50,
//   height: 50,
//   borderRadius: 25,
//   backgroundColor: '#8B4513',
//   justifyContent: 'center',
//   alignItems: 'center',
// },
// distanceIcon: {
//   fontSize: 24,
// },
// distanceInfo: {
//   flex: 1,
// },
// distanceCategory: {
//   fontSize: 18,
//   fontWeight: 'bold',
//   color: '#8B4513',
//   marginBottom: 2,
// },
// distanceMeters: {
//   fontSize: 14,
//   color: '#333',
//   fontWeight: '600',
//   marginBottom: 2,
// },
// distanceDescription: {
//   fontSize: 12,
//   color: '#666',
//   marginBottom: 4,
// },
// distanceReference: {
//   fontSize: 10,
//   color: '#999',
//   fontStyle: 'italic',
// },
// distanceScaleContainer: {
//   position: 'relative',
//   marginTop: 10,
// },
// distanceScale: {
//   position: 'relative',
//   height: 2,
//   backgroundColor: '#ddd',
//   marginVertical: 25,
//   marginHorizontal: 10,
// },
// distanceMarker: {
//   position: 'absolute',
//   bottom: -15,
//   transform: [{ translateX: -15 }],
// },
// markerLabel: {
//   fontSize: 9,
//   color: '#666',
//   width: 30,
//   textAlign: 'center',
// },
// distanceIndicator: {
//   position: 'absolute',
//   bottom: -5,
//   alignItems: 'center',
//   transform: [{ translateX: -12 }],
// },
// distanceIndicatorText: {
//   fontSize: 9,
//   color: '#8B4513',
//   fontWeight: 'bold',
//   marginTop: -2,
// },
// detectionsTitle: {
//   fontSize: 14,
//   fontWeight: 'bold',
//   color: '#333',
//   marginBottom: 8,
//   marginTop: 5,
// },
// resultsFooter: {
//   flexDirection: 'row',
//   justifyContent: 'space-between',
//   marginTop: 10,
//   paddingTop: 10,
//   borderTopWidth: 1,
//   borderTopColor: '#e0e0e0',
// },
// summaryText: {
//   fontSize: 11,
//   color: '#666',
//   fontStyle: 'italic',
// },
//   });
// ----------------------------------------------------------------------------------
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//   Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator, FlatList
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import * as ImagePicker from 'expo-image-picker';
// import * as Location from 'expo-location';
// import * as FileSystem from 'expo-file-system/legacy';
// import { FFmpegKit } from 'ffmpeg-kit-react-native';
// import axios from 'axios';
// import API_BASE_URL from '../../utils/api';
// import CustomDrawer from '../CustomDrawer';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// // =============================
// // FFmpeg Conversion Helper
// // =============================
// const convertToWav = async (uri) => {
//   if (!uri) return null;
//   const isWav = uri.toLowerCase().endsWith('.wav');
//   if (isWav) {
//     console.log('✅ Already WAV format:', uri);
//     return uri;
//   }
//   try {
//     const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
//     const filename = `converted_${Date.now()}.wav`;
//     const outputUri = `${FileSystem.cacheDirectory}${filename}`;
//     console.log('🔄 Converting audio to WAV format...');
//     const command = `-i "${cleanUri}" -ar 16000 -ac 1 "${outputUri}"`;
//     const session = await FFmpegKit.execute(command);
//     const returnCode = await session.getReturnCode();
//     if (returnCode.isValueSuccess()) {
//       const fileInfo = await FileSystem.getInfoAsync(outputUri);
//       if (fileInfo.exists && fileInfo.size > 0) {
//         console.log(`✅ Conversion successful: ${fileInfo.size} bytes`);
//         return outputUri;
//       }
//     }
//     console.error('❌ Conversion failed, using original');
//     return uri;
//   } catch (err) {
//     console.error('❌ FFmpeg conversion error:', err.message);
//     return uri;
//   }
// };

// export default function AudioRecordingScreen({ navigation }) {
//   // UI states
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordingDuration, setRecordingDuration] = useState(0);
//   const [currentDb, setCurrentDb] = useState(35);
//   const [recording, setRecording] = useState(null);
//   const [comment, setComment] = useState('');
//   const [selectedReason, setSelectedReason] = useState('');
//   const [location, setLocation] = useState(null);
//   const [locationLoading, setLocationLoading] = useState(false);
//   const [locationError, setLocationError] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [noiseLevel, setNoiseLevel] = useState('');
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [expandedAiResult, setExpandedAiResult] = useState(null);

//   // Multi-attachment state
//   const [attachments, setAttachments] = useState([]);

//   // Playback state (for currently playing audio)
//   const [currentPlayingId, setCurrentPlayingId] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [playbackPosition, setPlaybackPosition] = useState(0);
//   const [totalDuration, setTotalDuration] = useState(0);

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const waveAnim1 = useRef(new Animated.Value(0.5)).current;
//   const waveAnim2 = useRef(new Animated.Value(0.8)).current;
//   const waveAnim3 = useRef(new Animated.Value(0.3)).current;
//   const recordingInterval = useRef(null);
//   const videoRefs = useRef({});

//   const noiseReasons = ['🔊 Loud Music', '🚗 Vehicle Noise', '🔨 Construction', '🎉 Party/Event', '🐕 Animal Noise', '🏭 Industrial', '🗣️ Shouting/Arguments', '📢 Other'];
//   const noiseLevels = [
//     { value: 'green', label: 'Low', icon: 'checkmark-circle', color: '#4CAF50', bgColor: '#E8F5E9', description: 'Mild disturbance' },
//     { value: 'yellow', label: 'Medium', icon: 'warning', color: '#FFC107', bgColor: '#FFF9C4', description: 'Moderate noise' },
//     { value: 'red', label: 'High', icon: 'alert-circle', color: '#F44336', bgColor: '#FFEBEE', description: 'Severe disturbance' }
//   ];

//   const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';
//   const API_TIMEOUT = 45000;

//   // Helper to generate unique ID
//   const getUniqueId = () => Date.now() + '-' + Math.random().toString(36).substr(2, 9);

//   useEffect(() => {
//     (async () => {
//       await Audio.requestPermissionsAsync();
//       await ImagePicker.requestCameraPermissionsAsync();
//       await Audio.setAudioModeAsync({
//         allowsRecordingIOS: true,
//         playsInSilentModeIOS: true,
//         staysActiveInBackground: false,
//         shouldDuckAndroid: true,
//         playThroughEarpieceAndroid: false,
//         interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
//         interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
//       });
//     })();
//     return () => {
//       recording?.stopAndUnloadAsync();
//       sound?.unloadAsync();
//     };
//   }, []);

//   useEffect(() => {
//     if (isRecording) {
//       Animated.loop(Animated.sequence([
//         Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
//         Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
//       ])).start();
//       Animated.loop(Animated.stagger(200, [
//         Animated.timing(waveAnim1, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         Animated.timing(waveAnim2, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         Animated.timing(waveAnim3, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//       ])).start();
//     } else {
//       pulseAnim.setValue(1);
//     }
//   }, [isRecording]);

//   const startRecording = async () => {
//     try {
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
//         web: {
//           mimeType: 'audio/webm;codecs=opus',
//           bitsPerSecond: 128000
//         },
//       });
//       setRecording(newRecording);
//       setIsRecording(true);
//       setRecordingDuration(0);
//       recordingInterval.current = setInterval(() => {
//         setRecordingDuration(p => p + 1);
//         setCurrentDb(Math.floor(Math.random() * 45 + 40));
//       }, 1000);
//     } catch (err) {
//       Alert.alert('Error', 'Failed to start recording.');
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await recording.stopAndUnloadAsync();
//       const uri = recording.getURI();
//       const duration = recordingDuration;
//       setIsRecording(false);
//       setRecording(null);
//       clearInterval(recordingInterval.current);

//       const newAttachment = {
//         id: getUniqueId(),
//         uri,
//         type: 'audio',
//         duration,
//         aiResults: null,
//         fileName: `audio_${Date.now()}.m4a`,
//       };

//       setAttachments(prev => [...prev, newAttachment]);
//       analyzeWithYAMNet(newAttachment.id, uri, 'audio');
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const pickVideo = () => {
//     Alert.alert('Add Video', 'Choose an option', [
//       {
//         text: 'Record Video',
//         onPress: async () => {
//           const result = await ImagePicker.launchCameraAsync({
//             mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//             allowsEditing: true,
//             aspect: [16, 9],
//             quality: 1,
//             videoMaxDuration: 60
//           });
//           if (!result.canceled && result.assets[0]) {
//             const videoUri = result.assets[0].uri;
//             const newAttachment = {
//               id: getUniqueId(),
//               uri: videoUri,
//               type: 'video',
//               duration: null,
//               aiResults: null,
//               fileName: `video_${Date.now()}.mp4`,
//             };
//             setAttachments(prev => [...prev, newAttachment]);
//             analyzeWithYAMNet(newAttachment.id, videoUri, 'video');
//           }
//         }
//       },
//       {
//         text: 'Choose from Gallery',
//         onPress: async () => {
//           const result = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//             allowsEditing: true,
//             aspect: [16, 9],
//             quality: 1
//           });
//           if (!result.canceled && result.assets[0]) {
//             const videoUri = result.assets[0].uri;
//             const newAttachment = {
//               id: getUniqueId(),
//               uri: videoUri,
//               type: 'video',
//               duration: null,
//               aiResults: null,
//               fileName: `video_${Date.now()}.mp4`,
//             };
//             setAttachments(prev => [...prev, newAttachment]);
//             analyzeWithYAMNet(newAttachment.id, videoUri, 'video');
//           }
//         }
//       },
//       { text: 'Cancel', style: 'cancel' },
//     ]);
//   };

//   const removeAttachment = (id) => {
//     Alert.alert('Remove', 'Remove this item?', [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Remove',
//         style: 'destructive',
//         onPress: async () => {
//           if (currentPlayingId === id) {
//             await sound?.stopAsync();
//             await sound?.unloadAsync();
//             setSound(null);
//             setCurrentPlayingId(null);
//             setIsPlaying(false);
//             setPlaybackPosition(0);
//           }
//           setAttachments(prev => prev.filter(a => a.id !== id));
//         }
//       }
//     ]);
//   };

//   const analyzeWithYAMNet = async (attachmentId, mediaUri, mediaType) => {
//     setIsAnalyzing(true);
//     try {
//       console.log(`🎯 Analyzing ${mediaType}: ${mediaUri}`);
//       const fileInfo = await FileSystem.getInfoAsync(mediaUri);
//       if (!fileInfo.exists) throw new Error('File not found');

//       const formData = new FormData();
//       const fileName = mediaUri.split('/').pop();
//       const fileType = mediaType === 'video' ? 'video/mp4' : 'audio/m4a';
//       formData.append('audio', { uri: mediaUri, type: fileType, name: fileName });
//       formData.append('mime_type', fileType);
//       formData.append('filename', fileName);

//       const controller = new AbortController();
//       const timeoutId = setTimeout(() => controller.abort(), 120000);

//       const response = await fetch(`${AI_SERVICE_URL}/api/ai/analyze`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'multipart/form-data',
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//         body: formData,
//         signal: controller.signal,
//       });

//       clearTimeout(timeoutId);

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Server error: ${response.status} - ${errorText}`);
//       }

//       const data = await response.json();

//       if (data.success) {
//         setAttachments(prev => prev.map(att =>
//           att.id === attachmentId ? { ...att, aiResults: data } : att
//         ));

//         if (data.detections && data.detections.length > 0 && !selectedReason) {
//           setSelectedReason(data.detections[0].class);
//         }
//       } else {
//         Alert.alert('Analysis Failed', data.error || 'Unknown error');
//       }
//     } catch (error) {
//       console.error('❌ AI Analysis Error:', error);
//       let errorMessage = 'Failed to analyze media. ';
//       if (error.name === 'AbortError') errorMessage += 'Request timed out.';
//       else errorMessage += error.message;
//       Alert.alert('AI Error', errorMessage);
//     } finally {
//       setIsAnalyzing(false);
//     }
//   };

//   const testAIService = async () => {
//     try {
//       setIsAnalyzing(true);
//       const response = await fetch(`${AI_SERVICE_URL}/api/ai/health`, {
//         headers: { 'ngrok-skip-browser-warning': 'true', 'User-Agent': 'ReactNativeApp/1.0' },
//       });
//       const responseData = await response.json();
//       let message = `Main Backend: ✅ Online\n`;
//       if (responseData.flask_ai) {
//         if (responseData.flask_ai.status === 'healthy') {
//           message += `Flask AI: ✅ Healthy\nModel: ${responseData.flask_ai.model}\nClasses: ${responseData.flask_ai.classes}`;
//         } else {
//           message += `Flask AI: ❌ ${responseData.flask_ai.error || 'Unavailable'}`;
//         }
//       } else {
//         message += `Flask AI: ❌ Not connected`;
//       }
//       Alert.alert('Service Status', message);
//     } catch (error) {
//       Alert.alert('Connection Failed', `Cannot connect to ${AI_SERVICE_URL}\n\nError: ${error.message}`);
//     } finally {
//       setIsAnalyzing(false);
//     }
//   };

//   const getUserLocation = async () => {
//     setLocationLoading(true);
//     setLocationError(null);
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         setLocationError('Location permission denied');
//         Alert.alert('Permission Required', 'Please grant location access.');
//         return;
//       }
//       const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
//       const address = await Location.reverseGeocodeAsync({
//         latitude: currentLocation.coords.latitude,
//         longitude: currentLocation.coords.longitude
//       });
//       setLocation({
//         latitude: currentLocation.coords.latitude,
//         longitude: currentLocation.coords.longitude,
//         address: address[0] || null,
//         timestamp: new Date().toISOString()
//       });
//       Alert.alert('✅ Location Added', `${address[0]?.street || ''} ${address[0]?.city || ''}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
//     } catch (error) {
//       setLocationError('Failed to get location');
//       Alert.alert('Error', 'Failed to get location.');
//     } finally {
//       setLocationLoading(false);
//     }
//   };

//   // Playback functions for audio
//   const playAudio = async (attachment) => {
//     if (currentPlayingId === attachment.id) {
//       if (isPlaying) {
//         await sound.pauseAsync();
//         setIsPlaying(false);
//       } else {
//         await sound.playAsync();
//         setIsPlaying(true);
//       }
//       return;
//     }

//     if (sound) {
//       await sound.stopAsync();
//       await sound.unloadAsync();
//     }

//     try {
//       const { sound: newSound } = await Audio.Sound.createAsync(
//         { uri: attachment.uri },
//         { shouldPlay: true },
//         (status) => {
//           if (status.isLoaded) {
//             setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//             setTotalDuration(Math.floor(status.durationMillis / 1000));
//             if (status.didJustFinish) {
//               setIsPlaying(false);
//               setPlaybackPosition(0);
//               setCurrentPlayingId(null);
//               sound?.unloadAsync();
//               setSound(null);
//             }
//           }
//         }
//       );
//       setSound(newSound);
//       setCurrentPlayingId(attachment.id);
//       setIsPlaying(true);
//       setPlaybackPosition(0);
//       setTotalDuration(attachment.duration || 0);
//     } catch (err) {
//       console.error('Playback error:', err);
//     }
//   };

//   const restartAudio = async () => {
//     if (sound) {
//       await sound.setPositionAsync(0);
//       setPlaybackPosition(0);
//       await sound.playAsync();
//       setIsPlaying(true);
//     }
//   };

//  const saveRecording = async () => {
//   if (attachments.length === 0) {
//     Alert.alert('No Content', 'Please add at least one audio or video.');
//     return;
//   }
//   if (!selectedReason) {
//     Alert.alert('Reason Required', 'Please select a reason for this noise report.');
//     return;
//   }
//   if (!noiseLevel) {
//     Alert.alert('Noise Level Required', 'Please select the noise level (Low/Medium/High).');
//     return;
//   }

//   setIsSubmitting(true);

//   try {
//     const userId = await AsyncStorage.getItem('userId');
//     if (!userId) {
//       Alert.alert('Authentication Error', 'Please log in again.');
//       return;
//     }

//     const formData = new FormData();
//     formData.append('userId', userId);

//     // Append all media files
//     attachments.forEach((att, index) => {
//       const fileExtension = att.uri.split('.').pop();
//       const mimeType = att.type === 'video' ? `video/${fileExtension}` : `audio/${fileExtension}`;
//       const fileName = att.fileName || `attachment_${index}_${Date.now()}.${fileExtension}`;
//       formData.append('media', {
//         uri: att.uri,
//         type: mimeType,
//         name: fileName,
//       });
//     });

//     const finalReason = selectedReason;
//     formData.append('reason', finalReason);
//     formData.append('noiseLevel', noiseLevel);

//     // FIXED: Format AI results to match schema requirements
//     const aiResultsSummary = attachments
//       .filter(att => att.aiResults && att.aiResults.success)
//       .map((att, index) => ({
//         fileIndex: index,
//         fileName: att.fileName || `recording_${index}.${att.type === 'video' ? 'mp4' : 'm4a'}`,
//         fileType: att.type,
//         detections: att.aiResults.detections || [],
//         decibel: att.aiResults.decibel || 0,
//         noise_level: att.aiResults.noise_level || {
//           level: 'Unknown',
//           value: 'yellow',
//           description: 'Unknown',
//           range: '0-0 dB'
//         },
//         distance: att.aiResults.distance || null,
//         processing_time: att.aiResults.processing_time || 0
//       }));
    
//     if (aiResultsSummary.length > 0) {
//       formData.append('ai_analysis', JSON.stringify(aiResultsSummary));
//     }

//     if (comment) formData.append('comment', comment);

//     if (location) {
//       formData.append('location', JSON.stringify({
//         latitude: location.latitude,
//         longitude: location.longitude,
//         address: location.address,
//         timestamp: location.timestamp,
//       }));
//     }

//     const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//       headers: { 'Content-Type': 'multipart/form-data' },
//       timeout: 60000,
//     });

//     setIsSubmitting(false);

//     const attachmentCount = attachments.length;
//     const attachmentInfo = `${attachmentCount} file(s) attached`;
//     const locationInfo = location
//       ? `\nLocation: ${location.address?.street || ''} ${location.address?.city || ''}\nCoordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
//       : '\nLocation: Not provided';
//     const noiseLevelInfo = noiseLevels.find(nl => nl.value === noiseLevel);
//     const noiseLevelText = `\nNoise Level: ${noiseLevelInfo?.label} (${noiseLevelInfo?.description})`;
//     const aiInfo = aiResultsSummary.length > 0 ? `\nAI Analysis: ${aiResultsSummary.length} file(s) analyzed` : '';

//     Alert.alert('✅ Report Submitted', `Noise Report Submitted Successfully!\n\nReason: ${finalReason}${comment ? `\nDetails: ${comment}` : ''}${noiseLevelText}${aiInfo}\n${attachmentInfo}${locationInfo}\nTimestamp: ${new Date().toLocaleString()}`, [
//       { text: 'OK', onPress: () => {
//         setComment('');
//         setSelectedReason('');
//         setNoiseLevel('');
//         setAttachments([]);
//         setLocation(null);
//         setLocationError(null);
//         setSound?.unloadAsync();
//         setSound(null);
//         setCurrentPlayingId(null);
//         setIsPlaying(false);
//         setExpandedAiResult(null);
//       } }
//     ]);

//   } catch (error) {
//     setIsSubmitting(false);
//     console.error('Error submitting report:', error);
//     let errorMessage = 'Failed to submit noise report. Please try again.';
//     if (error.response) errorMessage = error.response.data?.message || errorMessage;
//     else if (error.request) errorMessage = 'Network error. Please check your internet connection.';
//     Alert.alert('❌ Submission Failed', errorMessage);
//   }
// };

//   const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
//   const getDbColor = (db) => db < 50 ? '#8B7355' : db < 70 ? '#D4AC0D' : db < 85 ? '#E67E22' : '#E74C3C';

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: 0, duration: 350, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
//     ]).start();
//   };

//   const closeDrawer = () => {
//     Animated.parallel([
//       Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), useNativeDriver: true }),
//       Animated.timing(overlayOpacity, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
//     ]).start(() => setDrawerVisible(false));
//   };

//   const showConnectionInfo = () => {
//     const manifest = Constants.expoConfig;
//     const isTunnel = manifest?.extra?.useTunnel;
//     Alert.alert('Connection Info', `AI Service URL: ${AI_SERVICE_URL}\nExpo Tunnel: ${isTunnel ? 'Yes' : 'No'}\nPlatform: ${Platform.OS}\nFor tunnel to work:\n1. Flask must run on 0.0.0.0\n2. Use computer IP:192.168.173.45\n3. Both on same WiFi`);
//   };

//   // THEME-COMPLEMENTARY RENDER ATTACHMENT FUNCTION
//   const renderAttachment = ({ item }) => (
//     <View style={s.themeAttachmentCard}>
//       {/* Leather-inspired header with gold accents */}
//       <LinearGradient
//         colors={item.type === 'audio' ? ['#8B4513', '#654321'] : ['#D4AC0D', '#8B4513']}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={s.themeAttachmentHeader}
//       >
//         <View style={s.themeHeaderContent}>
//           <View style={s.themeTypeBadge}>
//             <Ionicons 
//               name={item.type === 'audio' ? 'musical-notes' : 'videocam'} 
//               size={16} 
//               color="#D4AC0D" 
//             />
//             <Text style={s.themeTypeText}>
//               {item.type === 'audio' ? 'AUDIO EVIDENCE' : 'VIDEO EVIDENCE'}
//             </Text>
//           </View>
//           <TouchableOpacity onPress={() => removeAttachment(item.id)} style={s.themeRemoveBtn}>
//             <Ionicons name="close" size={20} color="#D4AC0D" />
//           </TouchableOpacity>
//         </View>
//       </LinearGradient>

//       {/* Media Player Section */}
//       <View style={s.themeMediaSection}>
//         {item.type === 'audio' ? (
//           <View style={s.themeAudioContainer}>
//             <View style={s.themeVisualizer}>
//               {[...Array(20)].map((_, i) => (
//                 <Animated.View
//                   key={i}
//                   style={[
//                     s.themeVisualizerBar,
//                     {
//                       height: currentPlayingId === item.id && isPlaying 
//                         ? Math.random() * 30 + 10 
//                         : 8,
//                       backgroundColor: currentPlayingId === item.id && isPlaying 
//                         ? '#D4AC0D' 
//                         : 'rgba(212, 172, 13, 0.2)',
//                     }
//                   ]}
//                 />
//               ))}
//             </View>
            
//             <View style={s.themeControls}>
//               <TouchableOpacity onPress={() => restartAudio()} style={s.themeControlBtn}>
//                 <Ionicons name="play-skip-back" size={20} color="#D4AC0D" />
//               </TouchableOpacity>
              
//               <TouchableOpacity 
//                 onPress={() => playAudio(item)} 
//                 style={s.themePlayBtn}
//               >
//                 <LinearGradient
//                   colors={['#D4AC0D', '#8B4513']}
//                   style={s.themePlayGradient}
//                 >
//                   <Ionicons 
//                     name={currentPlayingId === item.id && isPlaying ? "pause" : "play"} 
//                     size={24} 
//                     color="#fff" 
//                   />
//                 </LinearGradient>
//               </TouchableOpacity>
              
//               <TouchableOpacity style={s.themeControlBtn}>
//                 <Ionicons name="play-skip-forward" size={20} color="#D4AC0D" />
//               </TouchableOpacity>
//             </View>
            
//             <View style={s.themeTimeDisplay}>
//               <Text style={s.themeTimeText}>
//                 {currentPlayingId === item.id ? formatTime(playbackPosition) : '0:00'}
//               </Text>
//               <View style={s.themeProgressBar}>
//                 <View style={[s.themeProgressFill, { width: currentPlayingId === item.id ? `${(playbackPosition / (totalDuration || 1)) * 100}%` : '0%' }]} />
//               </View>
//               <Text style={s.themeTimeText}>{formatTime(item.duration || 0)}</Text>
//             </View>
//           </View>
//         ) : (
//           <View style={s.themeVideoContainer}>
//             <Video
//               ref={ref => { if (ref) videoRefs.current[item.id] = ref; }}
//               source={{ uri: item.uri }}
//               style={s.themeVideo}
//               useNativeControls
//               resizeMode="cover"
//               isLooping={false}
//             />
//           </View>
//         )}
//       </View>

//       {/* THEME-COMPLEMENTARY AI RESULTS */}
//       {item.aiResults && item.aiResults.detections && (
//         <View style={s.themeAiResults}>
//           {/* Gold Leaf Header */}
//           <LinearGradient
//             colors={['rgba(212, 172, 13, 0.1)', 'rgba(139, 69, 19, 0.05)']}
//             style={s.themeAiHeader}
//           >
//             <View style={s.themeAiHeaderLeft}>
//               <View style={s.themeAiIcon}>
//                 <Ionicons name="diamond" size={20} color="#D4AC0D" />
//               </View>
//               <View>
//                 <Text style={s.themeAiTitle}>AI FORENSIC ANALYSIS</Text>
//                 <Text style={s.themeAiSubtitle}>YAMNet Neural Network • v2.0</Text>
//               </View>
//             </View>
//             <View style={s.themeAiBadge}>
//               <Text style={s.themeAiBadgeText}>
//                 {item.aiResults.detections[0]?.confidence 
//                   ? `${(item.aiResults.detections[0].confidence * 100).toFixed(0)}%` 
//                   : 'N/A'}
//               </Text>
//             </View>
//           </LinearGradient>

//           {/* Marble-textured Metrics Cards */}
//           <View style={s.themeMetricsGrid}>
//             <LinearGradient
//               colors={['#8B4513', '#654321']}
//               style={s.themeMetricCard}
//             >
//               <View style={s.themeMetricIcon}>
//                 <Ionicons name="volume-high" size={24} color="#D4AC0D" />
//               </View>
//               <Text style={s.themeMetricValue}>{item.aiResults.decibel || 0}</Text>
//               <Text style={s.themeMetricLabel}>DECIBEL</Text>
//             </LinearGradient>

//             <LinearGradient
//               colors={['#8B4513', '#5D3A1A']}
//               style={s.themeMetricCard}
//             >
//               <View style={s.themeMetricIcon}>
//                 <Ionicons name="speedometer" size={24} color="#D4AC0D" />
//               </View>
//               <Text style={s.themeMetricValue}>
//                 {item.aiResults.noise_level?.level || 'N/A'}
//               </Text>
//               <Text style={s.themeMetricLabel}>NOISE LEVEL</Text>
//             </LinearGradient>

//             <LinearGradient
//               colors={['#654321', '#8B4513']}
//               style={s.themeMetricCard}
//             >
//               <View style={s.themeMetricIcon}>
//                 <Ionicons name="navigate" size={24} color="#D4AC0D" />
//               </View>
//               <Text style={s.themeMetricValue}>
//                 ~{item.aiResults.distance?.meters || 0}m
//               </Text>
//               <Text style={s.themeMetricLabel}>DISTANCE</Text>
//             </LinearGradient>
//           </View>

//           {/* Toggle button for detailed results */}
//           <TouchableOpacity 
//             style={s.themeToggleBtn}
//             onPress={() => setExpandedAiResult(expandedAiResult === item.id ? null : item.id)}
//           >
//             <Text style={s.themeToggleText}>
//               {expandedAiResult === item.id ? 'Hide Details' : 'View Detailed Analysis'}
//             </Text>
//             <Ionicons 
//               name={expandedAiResult === item.id ? 'chevron-up' : 'chevron-down'} 
//               size={20} 
//               color="#D4AC0D" 
//             />
//           </TouchableOpacity>

//           {/* Expanded Details */}
//           {expandedAiResult === item.id && (
//             <>
//               {/* Gold Spectrum Analyzer */}
//               <View style={s.themeSpectrum}>
//                 <View style={s.themeSpectrumHeader}>
//                   <Ionicons name="analytics" size={16} color="#D4AC0D" />
//                   <Text style={s.themeSpectrumTitle}>FREQUENCY SPECTRUM</Text>
//                 </View>
//                 <View style={s.themeSpectrumBars}>
//                   {[...Array(30)].map((_, i) => {
//                     const intensity = Math.sin(i * 0.3) * 0.5 + 0.5;
//                     return (
//                       <View key={i} style={s.themeSpectrumBarWrapper}>
//                         <LinearGradient
//                           colors={['#D4AC0D', '#8B4513']}
//                           style={[
//                             s.themeSpectrumBar,
//                             { 
//                               height: `${intensity * 100}%`,
//                               opacity: 0.5 + (item.aiResults.decibel / 200)
//                             }
//                           ]}
//                         />
//                       </View>
//                     );
//                   })}
//                 </View>
//               </View>

//               {/* Leather-bound Detection List */}
//               <View style={s.themeDetections}>
//                 <View style={s.themeDetectionsHeader}>
//                   <Ionicons name="list" size={18} color="#D4AC0D" />
//                   <Text style={s.themeDetectionsTitle}>SOUND CLASSIFICATIONS</Text>
//                 </View>
                
//                 {item.aiResults.detections?.slice(0, 5).map((detection, index) => {
//                   const confidencePercent = (detection.confidence * 100).toFixed(1);
//                   const isTop = index === 0;
                  
//                   return (
//                     <TouchableOpacity
//                       key={index}
//                       style={[
//                         s.themeDetectionItem,
//                         selectedReason === detection.class && s.themeDetectionSelected
//                       ]}
//                       onPress={() => setSelectedReason(detection.class)}
//                     >
//                       <View style={s.themeDetectionRank}>
//                         <LinearGradient
//                           colors={isTop ? ['#D4AC0D', '#8B4513'] : ['#5D3A1A', '#3D2B10']}
//                           style={s.themeRankBadge}
//                         >
//                           <Text style={s.themeRankText}>#{index + 1}</Text>
//                         </LinearGradient>
//                       </View>
                      
//                       <View style={s.themeDetectionContent}>
//                         <Text style={s.themeDetectionClass}>{detection.class}</Text>
//                         <View style={s.themeConfidenceBar}>
//                           <View style={s.themeBarBg}>
//                             <LinearGradient
//                               colors={['#D4AC0D', '#8B4513']}
//                               style={[
//                                 s.themeBarFill,
//                                 { width: `${confidencePercent}%` }
//                               ]}
//                             />
//                           </View>
//                           <Text style={s.themeConfidenceText}>{confidencePercent}%</Text>
//                         </View>
//                       </View>
                      
//                       {selectedReason === detection.class && (
//                         <View style={s.themeSelectedBadge}>
//                           <Ionicons name="checkmark-circle" size={22} color="#D4AC0D" />
//                         </View>
//                       )}
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>

//               {/* Vintage Compass Distance Visualization */}
//               {item.aiResults.distance && (
//                 <View style={s.themeCompass}>
//                   <Text style={s.themeCompassTitle}>SOURCE DISTANCE</Text>
//                   <View style={s.themeCompassVisual}>
//                     <View style={s.themeCompassRing}>
//                       <View style={s.themeCompassInner} />
//                       <View style={s.themeCompassNeedle}>
//                         <LinearGradient
//                           colors={['#D4AC0D', '#8B4513']}
//                           style={s.themeCompassNeedleInner}
//                         />
//                       </View>
//                     </View>
//                     <View style={s.themeCompassInfo}>
//                       <Text style={s.themeCompassCategory}>{item.aiResults.distance.category}</Text>
//                       <Text style={s.themeCompassDistance}>{item.aiResults.distance.meters}m away</Text>
//                       <Text style={s.themeCompassRef}>
//                         Based on {item.aiResults.distance.reference_sound}
//                       </Text>
//                     </View>
//                   </View>
//                 </View>
//               )}

//               {/* Processing Footer */}
//               {item.aiResults.processing_time && (
//                 <LinearGradient
//                   colors={['#8B4513', '#654321']}
//                   style={s.themeFooter}
//                 >
//                   <View style={s.themeFooterItem}>
//                     <Ionicons name="time" size={14} color="#D4AC0D" />
//                     <Text style={s.themeFooterText}>{item.aiResults.processing_time}s</Text>
//                   </View>
//                   <View style={s.themeFooterDivider} />
//                   <View style={s.themeFooterItem}>
//                     <Ionicons name="pulse" size={14} color="#D4AC0D" />
//                     <Text style={s.themeFooterText}>{item.aiResults.detections?.length || 0} sounds</Text>
//                   </View>
//                 </LinearGradient>
//               )}
//             </>
//           )}
//         </View>
//       )}
//     </View>
//   );

//   return (
//     <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
//           </View>
//           <Text style={s.headerTitle}>🎙️ Noise Report</Text>
//           <Text style={s.headerSubtitle}>
//             {attachments.length} item(s) added {isAnalyzing && ' • AI analyzing...'}
//           </Text>
//         </View>
//       </LinearGradient>

//       <ScrollView style={s.scrollView} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
//         {/* Noise Level Selection */}
//         <View style={s.section}>
//           <Text style={s.sectionTitle}>🚨 Noise Level</Text>
//           <Text style={s.sectionSubtitle}>How severe is the noise disturbance?</Text>
//           <View style={s.noiseLevelContainer}>
//             {noiseLevels.map((level) => (
//               <TouchableOpacity
//                 key={level.value}
//                 style={[
//                   s.noiseLevelCard,
//                   { backgroundColor: level.bgColor, borderColor: level.color },
//                   noiseLevel === level.value && s.noiseLevelCardSelected
//                 ]}
//                 onPress={() => setNoiseLevel(level.value)}
//               >
//                 <Ionicons name={level.icon} size={32} color={level.color} />
//                 <Text style={[s.noiseLevelLabel, { color: level.color }]}>{level.label}</Text>
//                 <Text style={s.noiseLevelDesc}>{level.description}</Text>
//                 {noiseLevel === level.value && (
//                   <View style={[s.selectedBadge, { backgroundColor: level.color }]}>
//                     <Ionicons name="checkmark" size={16} color="#fff" />
//                   </View>
//                 )}
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         {/* Noise Type Selection */}
//         <View style={s.section}>
//           <Text style={s.sectionTitle}>📋 Noise Type</Text>
//           <Text style={s.sectionSubtitle}>AI Detection or Manual Selection</Text>
//           <Text style={s.manualSelectionLabel}>Select manually:</Text>
//           <View style={s.reasonGrid}>
//             {noiseReasons.map((r, i) => (
//               <TouchableOpacity key={i} style={[s.chip, selectedReason === r && s.chipSelected]} onPress={() => setSelectedReason(r)}>
//                 <Text style={[s.chipText, selectedReason === r && s.chipTextSelected]}>{r}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         {/* Attachments List */}
//         {attachments.length > 0 && (
//           <View style={s.section}>
//             <Text style={s.sectionTitle}>📎 Attachments ({attachments.length})</Text>
//             <FlatList
//               data={attachments}
//               renderItem={renderAttachment}
//               keyExtractor={item => item.id}
//               scrollEnabled={false}
//               contentContainerStyle={{ gap: 15 }}
//             />
//           </View>
//         )}

//         {/* Add Media Buttons */}
//         <View style={s.attachmentSelector}>
//           <TouchableOpacity
//             style={[s.attachBtn, s.attachBtnAudio]}
//             onPress={isRecording ? stopRecording : startRecording}
//             disabled={isRecording}
//           >
//             <Ionicons name={isRecording ? "stop" : "mic"} size={24} color="#fff" />
//             <Text style={s.attachBtnText}>{isRecording ? 'Stop Recording' : 'Add Audio'}</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[s.attachBtn, s.attachBtnVideo]}
//             onPress={pickVideo}
//             disabled={isRecording}
//           >
//             <Ionicons name="videocam" size={24} color="#fff" />
//             <Text style={s.attachBtnText}>Add Video</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Recording Indicator */}
//         {isRecording && (
//           <View style={s.section}>
//             <View style={s.recordingContainer}>
//               <View style={s.waveformContainer}>
//                 <Text style={[s.dbReading, { color: getDbColor(currentDb) }]}>{currentDb} dB</Text>
//                 <View style={s.waveform}>
//                   {[waveAnim1, waveAnim2, waveAnim3, waveAnim1, waveAnim2].map((anim, i) => (
//                     <Animated.View
//                       key={i}
//                       style={[
//                         s.waveBar,
//                         {
//                           height: anim.interpolate({ inputRange: [0, 1], outputRange: [10, [60, 80, 50, 70, 40][i]] }),
//                           backgroundColor: getDbColor(currentDb)
//                         }
//                       ]}
//                     />
//                   ))}
//                 </View>
//               </View>
//               <View style={s.timerContainer}>
//                 <Text style={s.timerText}>{formatTime(recordingDuration)}</Text>
//                 <View style={s.recordingDot}><View style={s.pulsingDot} /></View>
//               </View>
//               <TouchableOpacity onPress={stopRecording}>
//                 <Animated.View style={[s.recordButton, { backgroundColor: '#E74C3C', transform: [{ scale: pulseAnim }] }]}>
//                   <Ionicons name="stop" size={50} color="#fff" />
//                 </Animated.View>
//               </TouchableOpacity>
//               <Text style={s.recordStatus}>Recording... Tap to stop</Text>
//             </View>
//           </View>
//         )}

//         {/* Comment Section */}
//         <View style={s.section}>
//           <Text style={s.sectionTitle}>💬 Additional Details</Text>
//           <Text style={s.sectionSubtitle}>Describe the noise issue (optional)</Text>
//           <View>
//             <TextInput
//               style={s.input}
//               placeholder="e.g., Loud music from neighbor's apartment..."
//               placeholderTextColor="#999"
//               multiline
//               numberOfLines={4}
//               value={comment}
//               onChangeText={setComment}
//               maxLength={500}
//               textAlignVertical="top"
//             />
//             <Text style={s.charCount}>{comment.length}/500</Text>
//           </View>
//         </View>

//         {/* Location */}
//         <View style={s.section}>
//           <Text style={s.sectionTitle}>📍 Location</Text>
//           <Text style={s.sectionSubtitle}>Add your current location</Text>
//           {!location ? (
//             <TouchableOpacity style={s.locationBtn} onPress={getUserLocation} disabled={locationLoading}>
//               <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#fff" />
//               <Text style={s.locationBtnText}>{locationLoading ? 'Getting...' : 'Add Current Location'}</Text>
//             </TouchableOpacity>
//           ) : (
//             <View style={s.locationDisplay}>
//               <View style={s.locationInfo}>
//                 <Ionicons name="location-sharp" size={20} color="#8B4513" />
//                 <View style={{ flex: 1 }}>
//                   <Text style={s.locationAddress}>{location.address?.street || 'Unknown'}, {location.address?.city || 'Unknown'}</Text>
//                   <Text style={s.locationCoords}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
//                 </View>
//               </View>
//               <View style={s.locationActions}>
//                 <TouchableOpacity style={s.refreshBtn} onPress={getUserLocation}>
//                   <Ionicons name="refresh" size={20} color="#8B4513" />
//                 </TouchableOpacity>
//                 <TouchableOpacity style={s.removeBtn} onPress={() => setLocation(null)}>
//                   <Ionicons name="close-circle" size={20} color="#E74C3C" />
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}
//           {locationError && <Text style={s.error}>{locationError}</Text>}
//         </View>

//         {/* Debug Section */}
//         <View style={s.section}>
//           <Text style={s.sectionTitle}>🔧 Connection Debug</Text>
//           <TouchableOpacity style={s.testServiceButton} onPress={testAIService} disabled={isAnalyzing}>
//             <Ionicons name="server" size={20} color="#fff" />
//             <Text style={s.testServiceButtonText}>{isAnalyzing ? 'Testing...' : 'Test AI Service Connection'}</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[s.testServiceButton, { backgroundColor: '#9C27B0', marginTop: 10 }]} onPress={showConnectionInfo}>
//             <Ionicons name="information-circle" size={20} color="#fff" />
//             <Text style={s.testServiceButtonText}>Show Connection Info</Text>
//           </TouchableOpacity>
//           <Text style={s.debugInfo}>
//             Using tunnel: {AI_SERVICE_URL}
//             {'\n'}For physical device: Use computer IP
//             {'\n'}Flask must run on: 0.0.0.0:5001
//           </Text>
//         </View>

//         {/* Submit Button */}
//         {attachments.length > 0 && (
//           <TouchableOpacity
//             onPress={saveRecording}
//             style={[s.saveBtn, (!selectedReason || !noiseLevel || isSubmitting) && s.saveBtnDisabled]}
//             disabled={!selectedReason || !noiseLevel || isSubmitting}
//           >
//             {isSubmitting ? (
//               <>
//                 <ActivityIndicator size="small" color="#fff" />
//                 <Text style={s.saveBtnText}>Submitting...</Text>
//               </>
//             ) : (
//               <>
//                 <Ionicons name="checkmark-circle" size={28} color="#fff" />
//                 <Text style={s.saveBtnText}>Submit Noise Report</Text>
//                 {attachments.some(a => a.aiResults) && (
//                   <Ionicons name="sparkles" size={16} color="#FFD700" style={{ marginLeft: 8 }} />
//                 )}
//               </>
//             )}
//           </TouchableOpacity>
//         )}
//       </ScrollView>

//       {/* Drawer Modal */}
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
//     </KeyboardAvoidingView>
//   );
// }

// const s = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f5f5f5' },
//   header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
//   headerContent: { marginTop: 10 },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
//   headerButton: { padding: 8 },
//   headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
//   headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
//   scrollView: { flex: 1 },
//   section: { margin: 15, padding: 20, backgroundColor: '#fff', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
//   sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginBottom: 5 },
//   sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },

//   noiseLevelContainer: { flexDirection: 'row', gap: 12 },
//   noiseLevelCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, alignItems: 'center', position: 'relative' },
//   noiseLevelCardSelected: { borderWidth: 3, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
//   noiseLevelLabel: { fontSize: 16, fontWeight: 'bold', marginTop: 8 },
//   noiseLevelDesc: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
//   selectedBadge: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

//   reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
//   chip: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#f0f0f0', borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
//   chipSelected: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
//   chipText: { fontSize: 14, color: '#333' },
//   chipTextSelected: { color: '#fff', fontWeight: 'bold' },
//   manualSelectionLabel: { fontSize: 14, color: '#666', marginTop: 15, marginBottom: 8 },

//   input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#fff', minHeight: 100 },
//   charCount: { textAlign: 'right', fontSize: 12, color: '#999', marginTop: 5 },

//   locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#8B4513', padding: 15, borderRadius: 8, elevation: 2 },
//   locationBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
//   locationDisplay: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
//   locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
//   locationAddress: { fontSize: 14, fontWeight: 'bold', color: '#333' },
//   locationCoords: { fontSize: 12, color: '#666', marginTop: 2 },
//   locationActions: { flexDirection: 'row', gap: 10 },
//   refreshBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#8B4513' },
//   removeBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#E74C3C' },
//   error: { color: '#E74C3C', fontSize: 12, marginTop: 5 },

//   attachmentSelector: { flexDirection: 'row', marginHorizontal: 15, gap: 10, marginBottom: 15 },
//   attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 10, elevation: 2 },
//   attachBtnAudio: { backgroundColor: '#2196F3' },
//   attachBtnVideo: { backgroundColor: '#E91E63' },
//   attachBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

//   recordingContainer: { alignItems: 'center', paddingVertical: 20 },
//   waveformContainer: { alignItems: 'center', marginBottom: 20 },
//   dbReading: { fontSize: 32, fontWeight: 'bold', marginBottom: 15 },
//   waveform: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 80 },
//   waveBar: { width: 8, borderRadius: 4, backgroundColor: '#D4AC0D' },
//   timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
//   timerText: { fontSize: 48, fontWeight: 'bold', color: '#8B4513' },
//   recordingDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#E74C3C', justifyContent: 'center', alignItems: 'center' },
//   pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
//   recordButton: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
//   recordStatus: { marginTop: 15, fontSize: 14, color: '#666', textAlign: 'center' },

//   saveBtn: { margin: 15, padding: 18, backgroundColor: '#8B4513', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 3 },
//   saveBtnDisabled: { backgroundColor: '#ccc', opacity: 0.6 },
//   saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },

//   testServiceButton: { backgroundColor: '#4CAF50', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, borderRadius: 10, elevation: 2 },
//   testServiceButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
//   debugInfo: { fontSize: 11, color: '#666', marginTop: 10, fontStyle: 'italic', lineHeight: 16 },

//   // THEME-COMPLEMENTARY STYLES (Brown & Gold)
//   themeAttachmentCard: {
//     backgroundColor: '#2C1E0F',
//     borderRadius: 16,
//     marginBottom: 20,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//     shadowColor: '#D4AC0D',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 12,
//     elevation: 8,
//   },

//   themeAttachmentHeader: {
//     padding: 16,
//     borderBottomWidth: 2,
//     borderBottomColor: '#D4AC0D',
//   },

//   themeHeaderContent: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },

//   themeTypeBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(212, 172, 13, 0.15)',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     gap: 8,
//     borderWidth: 1,
//     borderColor: 'rgba(212, 172, 13, 0.3)',
//   },

//   themeTypeText: {
//     color: '#D4AC0D',
//     fontSize: 12,
//     fontWeight: '600',
//     letterSpacing: 1,
//   },

//   themeRemoveBtn: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: 'rgba(212, 172, 13, 0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(212, 172, 13, 0.3)',
//   },

//   themeMediaSection: {
//     padding: 20,
//     backgroundColor: '#1A1208',
//   },

//   themeAudioContainer: {
//     gap: 20,
//   },

//   themeVisualizer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 4,
//     height: 60,
//   },

//   themeVisualizerBar: {
//     width: 4,
//     borderRadius: 2,
//   },

//   themeControls: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 30,
//   },

//   themeControlBtn: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: 'rgba(212, 172, 13, 0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(212, 172, 13, 0.3)',
//   },

//   themePlayBtn: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     overflow: 'hidden',
//     shadowColor: '#D4AC0D',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 12,
//     elevation: 8,
//   },

//   themePlayGradient: {
//     width: '100%',
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   themeTimeDisplay: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },

//   themeTimeText: {
//     color: '#D4AC0D',
//     fontSize: 14,
//     fontWeight: '500',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },

//   themeProgressBar: {
//     flex: 1,
//     height: 4,
//     backgroundColor: 'rgba(212, 172, 13, 0.1)',
//     borderRadius: 2,
//     overflow: 'hidden',
//   },

//   themeProgressFill: {
//     height: '100%',
//     backgroundColor: '#D4AC0D',
//     borderRadius: 2,
//   },

//   themeVideoContainer: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     borderWidth: 2,
//     borderColor: '#D4AC0D',
//   },

//   themeVideo: {
//     width: '100%',
//     height: 200,
//     backgroundColor: '#000',
//   },

//   // AI Results
//   themeAiResults: {
//     padding: 20,
//     backgroundColor: '#1A1208',
//     borderTopWidth: 2,
//     borderTopColor: '#D4AC0D',
//   },

//   themeAiHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//     padding: 16,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//   },

//   themeAiHeaderLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },

//   themeAiIcon: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: 'rgba(212, 172, 13, 0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#D4AC0D',
//   },

//   themeAiTitle: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: 'bold',
//     letterSpacing: 1,
//     marginBottom: 4,
//   },

//   themeAiSubtitle: {
//     color: '#B8860B',
//     fontSize: 10,
//     letterSpacing: 0.5,
//   },

//   themeAiBadge: {
//     backgroundColor: 'rgba(212, 172, 13, 0.15)',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//   },

//   themeAiBadgeText: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },

//   themeMetricsGrid: {
//     flexDirection: 'row',
//     gap: 12,
//     marginBottom: 20,
//   },

//   themeMetricCard: {
//     flex: 1,
//     padding: 16,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//     alignItems: 'center',
//   },

//   themeMetricIcon: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: 'rgba(212, 172, 13, 0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//   },

//   themeMetricValue: {
//     color: '#D4AC0D',
//     fontSize: 22,
//     fontWeight: 'bold',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//     marginBottom: 4,
//   },

//   themeMetricLabel: {
//     color: '#B8860B',
//     fontSize: 10,
//     letterSpacing: 1,
//     fontWeight: '600',
//   },

//   themeToggleBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     padding: 12,
//     backgroundColor: 'rgba(212, 172, 13, 0.1)',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//     marginBottom: 15,
//   },

//   themeToggleText: {
//     color: '#D4AC0D',
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   themeSpectrum: {
//     marginBottom: 20,
//     padding: 15,
//     backgroundColor: '#2C1E0F',
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//   },

//   themeSpectrumHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 16,
//   },

//   themeSpectrumTitle: {
//     color: '#D4AC0D',
//     fontSize: 12,
//     letterSpacing: 1,
//     fontWeight: '600',
//   },

//   themeSpectrumBars: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     gap: 2,
//     height: 80,
//   },

//   themeSpectrumBarWrapper: {
//     flex: 1,
//     height: '100%',
//     justifyContent: 'flex-end',
//   },

//   themeSpectrumBar: {
//     width: '100%',
//     borderRadius: 2,
//   },

//   themeDetections: {
//     marginBottom: 20,
//   },

//   themeDetectionsHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 16,
//     paddingBottom: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: '#D4AC0D',
//   },

//   themeDetectionsTitle: {
//     color: '#D4AC0D',
//     fontSize: 12,
//     letterSpacing: 1,
//     fontWeight: '600',
//   },

//   themeDetectionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 14,
//     backgroundColor: '#2C1E0F',
//     borderRadius: 10,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: 'rgba(212, 172, 13, 0.2)',
//   },

//   themeDetectionSelected: {
//     backgroundColor: 'rgba(212, 172, 13, 0.1)',
//     borderColor: '#D4AC0D',
//   },

//   themeDetectionRank: {
//     marginRight: 14,
//   },

//   themeRankBadge: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//   },

//   themeRankText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },

//   themeDetectionContent: {
//     flex: 1,
//     gap: 8,
//   },

//   themeDetectionClass: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '500',
//   },

//   themeConfidenceBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//   },

//   themeBarBg: {
//     flex: 1,
//     height: 6,
//     backgroundColor: 'rgba(212, 172, 13, 0.1)',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },

//   themeBarFill: {
//     height: '100%',
//     borderRadius: 3,
//   },

//   themeConfidenceText: {
//     color: '#D4AC0D',
//     fontSize: 12,
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//     width: 45,
//     fontWeight: '600',
//   },

//   themeSelectedBadge: {
//     marginLeft: 10,
//   },

//   themeCompass: {
//     marginBottom: 20,
//     padding: 16,
//     backgroundColor: '#2C1E0F',
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//   },

//   themeCompassTitle: {
//     color: '#D4AC0D',
//     fontSize: 12,
//     letterSpacing: 1,
//     fontWeight: '600',
//     marginBottom: 16,
//   },

//   themeCompassVisual: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 20,
//   },

//   themeCompassRing: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     borderWidth: 2,
//     borderColor: '#D4AC0D',
//     justifyContent: 'center',
//     alignItems: 'center',
//     position: 'relative',
//   },

//   themeCompassInner: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//     borderWidth: 1,
//     borderColor: 'rgba(212, 172, 13, 0.3)',
//   },

//   themeCompassNeedle: {
//     position: 'absolute',
//     width: 4,
//     height: 40,
//     borderRadius: 2,
//     transform: [{ rotate: '45deg' }],
//   },

//   themeCompassNeedleInner: {
//     width: '100%',
//     height: '100%',
//     borderRadius: 2,
//   },

//   themeCompassInfo: {
//     flex: 1,
//   },

//   themeCompassCategory: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },

//   themeCompassDistance: {
//     color: '#fff',
//     fontSize: 14,
//     marginBottom: 4,
//   },

//   themeCompassRef: {
//     color: '#B8860B',
//     fontSize: 10,
//     fontStyle: 'italic',
//   },

//   themeFooter: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 14,
//     borderRadius: 8,
//     marginTop: 5,
//     borderWidth: 1,
//     borderColor: '#D4AC0D',
//   },

//   themeFooterItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },

//   themeFooterDivider: {
//     width: 1,
//     height: 20,
//     backgroundColor: '#D4AC0D',
//     opacity: 0.3,
//   },

//   themeFooterText: {
//     color: '#D4AC0D',
//     fontSize: 11,
//     fontWeight: '500',
//   },
// });


// ---------------------------------------------------------------------------
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//   Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import * as ImagePicker from 'expo-image-picker';
// import * as Location from 'expo-location';
// import * as FileSystem from 'expo-file-system/legacy';
// import { FFmpegKit } from 'ffmpeg-kit-react-native';
// import axios from 'axios';
// import API_BASE_URL from '../../utils/api';
// import CustomDrawer from '../CustomDrawer';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// // =============================
// // FFmpeg Conversion Helper
// // =============================
// const convertToWav = async (uri) => {
//   if (!uri) return null;
  
//   const isWav = uri.toLowerCase().endsWith('.wav');
//   if (isWav) {
//     console.log('✅ Already WAV format:', uri);
//     return uri;
//   }
  
//   try {
//     const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
//     const filename = `converted_${Date.now()}.wav`;
//     const outputUri = `${FileSystem.cacheDirectory}${filename}`;
    
//     console.log('🔄 Converting audio to WAV format...');
//     const command = `-i "${cleanUri}" -ar 16000 -ac 1 "${outputUri}"`;
//     const session = await FFmpegKit.execute(command);
//     const returnCode = await session.getReturnCode();
    
//     if (returnCode.isValueSuccess()) {
//       const fileInfo = await FileSystem.getInfoAsync(outputUri);
//       if (fileInfo.exists && fileInfo.size > 0) {
//         console.log(`✅ Conversion successful: ${fileInfo.size} bytes`);
//         return outputUri;
//       }
//     }
    
//     console.error('❌ Conversion failed, using original');
//     return uri;
    
//   } catch (err) {
//     console.error('❌ FFmpeg conversion error:', err.message);
//     return uri;
//   }
// };

// export default function AudioRecordingScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [recordingDuration, setRecordingDuration] = useState(0);
//   const [playbackPosition, setPlaybackPosition] = useState(0);
//   const [totalDuration, setTotalDuration] = useState(0);
//   const [currentDb, setCurrentDb] = useState(35);
//   const [recording, setRecording] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [audioUri, setAudioUri] = useState(null);
//   const [comment, setComment] = useState('');
//   const [selectedReason, setSelectedReason] = useState('');
//   const [videoUri, setVideoUri] = useState(null);
//   const [attachmentType, setAttachmentType] = useState(null);
//   const [location, setLocation] = useState(null);
//   const [locationLoading, setLocationLoading] = useState(false);
//   const [locationError, setLocationError] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [noiseLevel, setNoiseLevel] = useState('');
//   const [aiResults, setAiResults] = useState(null);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [activeTab, setActiveTab] = useState('analysis'); // 'analysis', 'details', 'location'

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const waveAnim1 = useRef(new Animated.Value(0.5)).current;
//   const waveAnim2 = useRef(new Animated.Value(0.8)).current;
//   const waveAnim3 = useRef(new Animated.Value(0.3)).current;
//   const recordingInterval = useRef(null);
//   const videoRef = useRef(null);

//   const noiseReasons = [
//     { id: 'music', label: 'Loud Music', icon: '🎵', color: '#9C27B0' },
//     { id: 'vehicle', label: 'Vehicle Noise', icon: '🚗', color: '#FF9800' },
//     { id: 'construction', label: 'Construction', icon: '🏗️', color: '#F44336' },
//     { id: 'party', label: 'Party/Event', icon: '🎉', color: '#E91E63' },
//     { id: 'animal', label: 'Animal Noise', icon: '🐕', color: '#4CAF50' },
//     { id: 'industrial', label: 'Industrial', icon: '🏭', color: '#607D8B' },
//     { id: 'shouting', label: 'Shouting', icon: '🗣️', color: '#FF5722' },
//     { id: 'other', label: 'Other', icon: '📢', color: '#795548' }
//   ];
  
//   const noiseLevels = [
//     { value: 'green', label: 'Low', icon: 'checkmark-circle', color: '#4CAF50', bgColor: '#E8F5E9', description: 'Mild disturbance', emoji: '😌' },
//     { value: 'yellow', label: 'Medium', icon: 'warning', color: '#FFC107', bgColor: '#FFF9C4', description: 'Moderate noise', emoji: '😐' },
//     { value: 'red', label: 'High', icon: 'alert-circle', color: '#F44336', bgColor: '#FFEBEE', description: 'Severe disturbance', emoji: '😠' }
//   ];

//   const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';

//   useEffect(() => {
//     (async () => {
//       await Audio.requestPermissionsAsync();
//       await ImagePicker.requestCameraPermissionsAsync();
//       await Audio.setAudioModeAsync({
//         allowsRecordingIOS: true, 
//         playsInSilentModeIOS: true, 
//         staysActiveInBackground: false,
//         shouldDuckAndroid: true, 
//         playThroughEarpieceAndroid: false,
//       });
//     })();
//     return () => {
//       recording?.stopAndUnloadAsync();
//       if (sound) {
//         sound.unloadAsync();
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (isRecording) {
//       Animated.loop(Animated.sequence([
//         Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
//         Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
//       ])).start();
//       Animated.loop(Animated.stagger(200, [
//         Animated.timing(waveAnim1, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         Animated.timing(waveAnim2, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         Animated.timing(waveAnim3, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//       ])).start();
//     } else {
//       pulseAnim.setValue(1);
//     }
//   }, [isRecording]);

//   // =============================
//   // AUTO-ASSIGN NOISE LEVEL BASED ON DECIBEL AND DISTANCE
//   // =============================
//   const determineNoiseLevel = (decibel, distance) => {
//     if (!decibel) return null;
    
//     let adjustedDecibel = decibel;
    
//     if (distance && distance.meters) {
//       if (distance.meters > 10) {
//         adjustedDecibel = decibel * 0.7;
//       } else if (distance.meters > 5) {
//         adjustedDecibel = decibel * 0.85;
//       } else if (distance.meters < 1) {
//         adjustedDecibel = decibel * 1.2;
//       }
//     }
    
//     if (adjustedDecibel < 50) {
//       return 'green';
//     } else if (adjustedDecibel < 70) {
//       return 'yellow';
//     } else {
//       return 'red';
//     }
//   };

//   const getNoiseLevelFromAI = (aiData) => {
//     if (!aiData) return null;
    
//     if (aiData.noise_level && aiData.noise_level.value) {
//       return aiData.noise_level.value;
//     }
    
//     return determineNoiseLevel(aiData.decibel, aiData.distance);
//   };

//   useEffect(() => {
//     if (aiResults) {
//       const newNoiseLevel = getNoiseLevelFromAI(aiResults);
//       if (newNoiseLevel) {
//         setNoiseLevel(newNoiseLevel);
//         console.log(`🎯 Auto-assigned noise level: ${newNoiseLevel}`);
//       }
//     }
//   }, [aiResults]);

//   const startRecording = async () => {
//     try {
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
//       setRecording(newRecording);
//       setIsRecording(true);
//       setRecordingDuration(0);
//       setAttachmentType('audio');
//       setAiResults(null);
//       setNoiseLevel('');
//       recordingInterval.current = setInterval(() => {
//         setRecordingDuration(p => p + 1);
//         setCurrentDb(Math.floor(Math.random() * 45 + 40));
//       }, 1000);
//     } catch (err) {
//       Alert.alert('Error', 'Failed to start recording.');
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await recording.stopAndUnloadAsync();
//       const uri = recording.getURI();
//       setAudioUri(uri);
//       setIsRecording(false);
//       setRecording(null);
//       clearInterval(recordingInterval.current);
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri });
//       const status = await newSound.getStatusAsync();
//       setTotalDuration(Math.floor(status.durationMillis / 1000));
//       setSound(newSound);
      
//       if (uri) {
//         setTimeout(() => {
//           analyzeWithYAMNet(uri);
//         }, 500);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const analyzeWithYAMNet = async (mediaUri) => {
//     if (!mediaUri) {
//       Alert.alert('No Media', 'Please record audio or video first');
//       return;
//     }

//     let mediaType = attachmentType;
//     if (!mediaType) {
//       if (mediaUri.includes('.mp4') || mediaUri.includes('.mov')) {
//         mediaType = 'video';
//       } else {
//         mediaType = 'audio';
//       }
//     }

//     setIsAnalyzing(true);
//     setAiResults(null);

//     try {
//       const fileInfo = await FileSystem.getInfoAsync(mediaUri);
//       if (!fileInfo.exists) {
//         throw new Error('File not found');
//       }
      
//       const formData = new FormData();
//       const fileName = mediaUri.split('/').pop();
//       const fileType = mediaType === 'video' ? 'video/mp4' : 'audio/m4a';
      
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
//           'Content-Type': 'multipart/form-data',
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//         body: formData,
//         signal: controller.signal,
//       });
      
//       clearTimeout(timeoutId);
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.success) {
//         setAiResults(data);
        
//         if (data.detections && data.detections.length > 0) {
//           const topDetection = data.detections[0];
//           setSelectedReason(topDetection.class);
//         }
//       } else {
//         Alert.alert('Analysis Failed', data.error || 'Unknown error');
//       }

//     } catch (error) {
//       console.error('❌ AI Analysis Error:', error);
      
//       let errorMessage = 'Failed to analyze media. ';
      
//       if (error.name === 'AbortError') {
//         errorMessage += 'Request timed out. Try a shorter video.';
//       } else {
//         errorMessage += error.message;
//       }
      
//       Alert.alert('AI Error', errorMessage);
//     } finally {
//       setIsAnalyzing(false);
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
//           message += `Classes: ${responseData.flask_ai.classes}`;
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

//   const triggerAIAnalysis = async () => {
//     if (!audioUri) {
//       Alert.alert('No Audio', 'Please record audio first');
//       return;
//     }
//     await analyzeWithYAMNet(audioUri);
//   };

//   const pickVideo = () => {
//     Alert.alert('Add Video', 'Choose an option', [
//       { 
//         text: 'Record Video', 
//         onPress: async () => {
//           const result = await ImagePicker.launchCameraAsync({ 
//             mediaTypes: ImagePicker.MediaTypeOptions.Videos, 
//             allowsEditing: true, 
//             aspect: [16, 9], 
//             quality: 1, 
//             videoMaxDuration: 60 
//           });
//           if (!result.canceled && result.assets[0]) {
//             const videoUri = result.assets[0].uri;
            
//             setAttachmentType('video');
//             setVideoUri(videoUri);
//             if (sound) {
//               await sound.unloadAsync();
//               setSound(null);
//             }
//             setAudioUri(null);
//             setAiResults(null);
//             setNoiseLevel('');
            
//             setTimeout(() => {
//               analyzeWithYAMNet(videoUri);
//             }, 100);
//           }
//         }
//       },
//       { 
//         text: 'Choose from Gallery', 
//         onPress: async () => {
//           const result = await ImagePicker.launchImageLibraryAsync({ 
//             mediaTypes: ImagePicker.MediaTypeOptions.Videos, 
//             allowsEditing: true, 
//             aspect: [16, 9], 
//             quality: 1 
//           });
//           if (!result.canceled && result.assets[0]) {
//             const videoUri = result.assets[0].uri;
            
//             setAttachmentType('video');
//             setVideoUri(videoUri);
//             if (sound) {
//               await sound.unloadAsync();
//               setSound(null);
//             }
//             setAudioUri(null);
//             setSound(null);
//             setAiResults(null);
//             setNoiseLevel('');
            
//             setTimeout(() => {
//               analyzeWithYAMNet(videoUri);
//             }, 100);
//           }
//         }
//       },
//       { text: 'Cancel', style: 'cancel' },
//     ]);
//   };

//   const deleteVideo = () => {
//     Alert.alert('Delete Video', 'Remove this video?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => { 
//           setVideoUri(null); 
//           setAttachmentType(null); 
//           setAiResults(null);
//           setNoiseLevel('');
//         }
//       },
//     ]);
//   };

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
//       setLocation({ 
//         latitude: currentLocation.coords.latitude, 
//         longitude: currentLocation.coords.longitude, 
//         address: address[0] || null, 
//         timestamp: new Date().toISOString() 
//       });
//       setLocationLoading(false);
//       Alert.alert('✅ Location Added', `${address[0]?.street || ''} ${address[0]?.city || ''}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
//     } catch (error) {
//       setLocationError('Failed to get location');
//       setLocationLoading(false);
//       Alert.alert('Error', 'Failed to get location.');
//     }
//   };

//   const playPauseRecording = async () => {
//     if (!sound) return;
//     try {
//       if (isPlaying) {
//         await sound.pauseAsync();
//         setIsPlaying(false);
//       } else {
//         if (playbackPosition >= totalDuration) {
//           await sound.setPositionAsync(0);
//           setPlaybackPosition(0);
//         }
//         await sound.playAsync();
//         setIsPlaying(true);
//         sound.setOnPlaybackStatusUpdate((status) => {
//           if (status.isLoaded) {
//             setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//             if (status.didJustFinish) { 
//               setIsPlaying(false); 
//               setPlaybackPosition(0); 
//             }
//           }
//         });
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const restartRecording = async () => {
//     if (!sound) return;
//     try {
//       await sound.setPositionAsync(0);
//       setPlaybackPosition(0);
//       await sound.playAsync();
//       setIsPlaying(true);
//       sound.setOnPlaybackStatusUpdate((status) => {
//         if (status.isLoaded) {
//           setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//           if (status.didJustFinish) { 
//             setIsPlaying(false); 
//             setPlaybackPosition(0); 
//           }
//         }
//       });
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const deleteRecording = () => {
//     Alert.alert('Delete Recording', 'Delete this recording?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => {
//           if (sound) {
//             sound.unloadAsync();
//           }
//           setSound(null);
//           setAudioUri(null);
//           setTotalDuration(0);
//           setPlaybackPosition(0);
//           setIsPlaying(false);
//           setAttachmentType(null);
//           setAiResults(null);
//           setNoiseLevel('');
//         }
//       },
//     ]);
//   };

//   const saveRecording = async () => {
//     if (!audioUri && !videoUri) {
//       Alert.alert('No Content', 'Please record audio or attach a video first.');
//       return;
//     }
//     if (!selectedReason) {
//       Alert.alert('Reason Required', 'Please select a reason for this noise report.');
//       return;
//     }
//     if (!noiseLevel) {
//       Alert.alert('Noise Level Required', 'Please wait for AI analysis to complete.');
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

//       const formData = new FormData();
      
//       formData.append('userId', userId);
      
//       const mediaUri = videoUri || audioUri;
//       const mediaType = videoUri ? 'video' : 'audio';
//       const fileExtension = mediaUri.split('.').pop();
//       const fileName = `noise_report_${Date.now()}.${fileExtension}`;
      
//       formData.append('media', {
//         uri: mediaUri,
//         type: videoUri ? `video/${fileExtension}` : `audio/${fileExtension}`,
//         name: fileName,
//       });

//       const finalReason = aiResults?.detections?.[0]?.class || selectedReason;
//       formData.append('reason', finalReason);
//       formData.append('mediaType', mediaType);
//       formData.append('noiseLevel', noiseLevel);
      
//       if (aiResults) {
//         formData.append('ai_analysis', JSON.stringify(aiResults));
//       }
      
//       if (comment) {
//         formData.append('comment', comment);
//       }
      
//       if (location) {
//         formData.append('location', JSON.stringify({
//           latitude: location.latitude,
//           longitude: location.longitude,
//           address: location.address,
//           timestamp: location.timestamp,
//         }));
//       }

//       const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 60000,
//       });

//       setIsSubmitting(false);

//       const attachmentInfo = videoUri 
//         ? `Video: ${videoUri.split('/').pop()}`
//         : `Audio: ${formatTime(totalDuration)}`;

//       const locationInfo = location 
//         ? `\nLocation: ${location.address?.street || ''} ${location.address?.city || ''}\nCoordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
//         : '\nLocation: Not provided';

//       const noiseLevelInfo = noiseLevels.find(nl => nl.value === noiseLevel);
//       const noiseLevelText = `\nNoise Level: ${noiseLevelInfo?.label} (${noiseLevelInfo?.description})`;
      
//       const aiInfo = aiResults 
//         ? `\nAI Detection: ${aiResults.detections?.[0]?.class || 'None'} (${aiResults.detections?.[0]?.confidence ? (aiResults.detections[0].confidence * 100).toFixed(1) + '%' : 'N/A'})`
//         : '';

//       const reportDetails = `Noise Report Submitted Successfully!\n\nReason: ${finalReason}${comment ? `\nDetails: ${comment}` : ''}${noiseLevelText}${aiInfo}\n${attachmentInfo}${locationInfo}\nTimestamp: ${new Date().toLocaleString()}`;

//       Alert.alert('✅ Report Submitted', reportDetails, [
//         { 
//           text: 'OK', 
//           onPress: () => {
//             setComment('');
//             setSelectedReason('');
//             setNoiseLevel('');
//             if (sound) {
//               sound.unloadAsync();
//             }
//             setSound(null);
//             setAudioUri(null);
//             setVideoUri(null);
//             setAttachmentType(null);
//             setLocation(null);
//             setLocationError(null);
//             setTotalDuration(0);
//             setPlaybackPosition(0);
//             setAiResults(null);
//           }
//         }
//       ]);

//     } catch (error) {
//       setIsSubmitting(false);
//       console.error('Error submitting report:', error);
      
//       let errorMessage = 'Failed to submit noise report. Please try again.';
      
//       if (error.response) {
//         errorMessage = error.response.data?.message || errorMessage;
//       } else if (error.request) {
//         errorMessage = 'Network error. Please check your internet connection.';
//       }
      
//       Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
//     }
//   };

//   const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
//   const getDbColor = (db) => db < 50 ? '#8B7355' : db < 70 ? '#D4AC0D' : db < 85 ? '#E67E22' : '#E74C3C';

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.parallel([
//       Animated.timing(slideAnim, { 
//         toValue: 0, 
//         duration: 350, 
//         easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), 
//         useNativeDriver: true 
//       }),
//       Animated.timing(overlayOpacity, { 
//         toValue: 1, 
//         duration: 350, 
//         easing: Easing.out(Easing.quad), 
//         useNativeDriver: true 
//       }),
//     ]).start();
//   };

//   const closeDrawer = () => {
//     Animated.parallel([
//       Animated.timing(slideAnim, { 
//         toValue: -width * 0.8, 
//         duration: 300, 
//         easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), 
//         useNativeDriver: true 
//       }),
//       Animated.timing(overlayOpacity, { 
//         toValue: 0, 
//         duration: 250, 
//         easing: Easing.in(Easing.quad), 
//         useNativeDriver: true 
//       }),
//     ]).start(() => setDrawerVisible(false));
//   };

//   const showConnectionInfo = () => {
//     const manifest = Constants.expoConfig;
//     const isTunnel = manifest?.extra?.useTunnel;
    
//     Alert.alert(
//       'Connection Info',
//       `AI Service URL: ${AI_SERVICE_URL}\nExpo Tunnel: ${isTunnel ? 'Yes' : 'No'}\nPlatform: ${Platform.OS}`,
//       [{ text: 'OK' }]
//     );
//   };

//   // Render noise level card
//   const renderNoiseLevelCard = () => {
//     if (!noiseLevel || !aiResults) return null;
    
//     const level = noiseLevels.find(l => l.value === noiseLevel);
//     if (!level) return null;
    
//     return (
//       <LinearGradient
//         colors={[level.bgColor, '#fff']}
//         style={s.noiseLevelCard}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//       >
//         <View style={s.noiseLevelHeader}>
//           <View style={[s.noiseLevelIconContainer, { backgroundColor: level.color }]}>
//             <Ionicons name={level.icon} size={32} color="#fff" />
//           </View>
//           <View style={s.noiseLevelInfo}>
//             <Text style={s.noiseLevelLabel}>{level.label} Noise Level</Text>
//             <Text style={s.noiseLevelDesc}>{level.description}</Text>
//           </View>
//           <Text style={s.noiseLevelEmoji}>{level.emoji}</Text>
//         </View>
        
//         <View style={s.noiseLevelMetrics}>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{aiResults.decibel} dB</Text>
//             <Text style={s.metricLabel}>Volume</Text>
//           </View>
//           {aiResults.distance && (
//             <View style={s.metricItem}>
//               <Text style={s.metricValue}>~{aiResults.distance.meters}m</Text>
//               <Text style={s.metricLabel}>Distance</Text>
//             </View>
//           )}
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{aiResults.detections?.length || 0}</Text>
//             <Text style={s.metricLabel}>Sounds</Text>
//           </View>
//         </View>
        
//         <View style={s.noiseLevelBadge}>
//           <Text style={[s.noiseLevelBadgeText, { color: level.color }]}>
//             Automatically Detected
//           </Text>
//         </View>
//       </LinearGradient>
//     );
//   };

//   // Render media section
//   const renderMediaSection = () => {
//     if (videoUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.sectionHeader}>
//             <Ionicons name="videocam" size={24} color="#8B4513" />
//             <Text style={s.sectionHeaderTitle}>Video Attachment</Text>
//           </View>
//           <View style={s.videoContainer}>
//             <Video 
//               ref={videoRef} 
//               source={{ uri: videoUri }} 
//               style={s.video} 
//               useNativeControls 
//               resizeMode="contain" 
//               isLooping 
//             />
//             <TouchableOpacity style={s.deleteMediaBtn} onPress={deleteVideo}>
//               <Ionicons name="close-circle" size={32} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
//         </View>
//       );
//     }

//     if (audioUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.sectionHeader}>
//             <Ionicons name="musical-notes" size={24} color="#8B4513" />
//             <Text style={s.sectionHeaderTitle}>Audio Recording</Text>
//           </View>
//           <View style={s.audioPlayerContainer}>
//             <View style={s.progressContainer}>
//               <View style={s.progressBar}>
//                 <View style={[
//                   s.progressFill, 
//                   { width: `${totalDuration > 0 ? (playbackPosition / totalDuration) * 100 : 0}%` }
//                 ]} />
//               </View>
//               <View style={s.timeLabels}>
//                 <Text style={s.timeText}>{formatTime(playbackPosition)}</Text>
//                 <Text style={s.timeText}>{formatTime(totalDuration)}</Text>
//               </View>
//             </View>
//             <View style={s.audioControls}>
//               <TouchableOpacity onPress={restartRecording} style={s.controlBtn}>
//                 <Ionicons name="play-skip-back" size={24} color="#8B4513" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={playPauseRecording} style={s.playBtn}>
//                 <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={deleteRecording} style={s.controlBtn}>
//                 <Ionicons name="trash" size={24} color="#E74C3C" />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       );
//     }

//     return null;
//   };

//   // Render tab content
//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'analysis':
//         return (
//           <View style={s.tabContent}>
//             {aiResults ? (
//               <>
//                 {renderNoiseLevelCard()}
                
//                 <View style={s.detectionsContainer}>
//                   <View style={s.sectionHeader}>
//                     <Ionicons name="list" size={20} color="#8B4513" />
//                     <Text style={s.sectionHeaderTitleSmall}>Top Detected Sounds</Text>
//                   </View>
//                   {aiResults.detections?.slice(0, 5).map((detection, index) => {
//                     const confidencePercent = (detection.confidence * 100).toFixed(1);
//                     return (
//                       <TouchableOpacity
//                         key={index}
//                         style={[
//                           s.detectionItem,
//                           selectedReason === detection.class && s.detectionItemSelected
//                         ]}
//                         onPress={() => setSelectedReason(detection.class)}
//                       >
//                         <View style={s.detectionRank}>
//                           <LinearGradient
//                             colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
//                             style={s.rankBadge}
//                           >
//                             <Text style={s.rankText}>#{index + 1}</Text>
//                           </LinearGradient>
//                         </View>
//                         <View style={s.detectionContent}>
//                           <Text style={s.detectionClass}>{detection.class}</Text>
//                           <View style={s.confidenceBar}>
//                             <View style={s.confidenceBarBg}>
//                               <LinearGradient
//                                 colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
//                                 style={[s.confidenceBarFill, { width: `${confidencePercent}%` }]}
//                               />
//                             </View>
//                             <Text style={s.confidenceText}>{confidencePercent}%</Text>
//                           </View>
//                         </View>
//                         {selectedReason === detection.class && (
//                           <View style={s.selectedCheck}>
//                             <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
//                           </View>
//                         )}
//                       </TouchableOpacity>
//                     );
//                   })}
//                 </View>

//                 {aiResults.distance && (
//                   <View style={s.distanceCard}>
//                     <View style={s.sectionHeader}>
//                       <Ionicons name="navigate" size={20} color="#8B4513" />
//                       <Text style={s.sectionHeaderTitleSmall}>Distance Estimation</Text>
//                     </View>
//                     <View style={s.distanceContent}>
//                       <View style={s.distanceIconLarge}>
//                         <Text style={s.distanceIconEmoji}>{aiResults.distance.icon}</Text>
//                       </View>
//                       <View style={s.distanceDetails}>
//                         <Text style={s.distanceCategory}>{aiResults.distance.category}</Text>
//                         <Text style={s.distanceValue}>~{aiResults.distance.meters} meters away</Text>
//                         <Text style={s.distanceRef}>
//                           Based on {aiResults.distance.reference_sound}
//                         </Text>
//                       </View>
//                     </View>
//                   </View>
//                 )}
//               </>
//             ) : (
//               <View style={s.emptyAnalysis}>
//                 <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
//                 <Text style={s.emptyTitle}>No Analysis Yet</Text>
//                 <Text style={s.emptyText}>Record audio or attach a video to analyze</Text>
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
//                 <Text style={s.sectionHeaderTitleSmall}>Additional Details</Text>
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

//             <View style={s.reasonsCard}>
//               <View style={s.sectionHeader}>
//                 <Ionicons name="megaphone-outline" size={20} color="#8B4513" />
//                 <Text style={s.sectionHeaderTitleSmall}>Noise Type</Text>
//               </View>
//               <View style={s.reasonsGrid}>
//                 {noiseReasons.map((reason) => (
//                   <TouchableOpacity
//                     key={reason.id}
//                     style={[
//                       s.reasonChip,
//                       selectedReason === reason.label && s.reasonChipSelected,
//                       { borderColor: reason.color }
//                     ]}
//                     onPress={() => setSelectedReason(reason.label)}
//                   >
//                     <Text style={s.reasonIcon}>{reason.icon}</Text>
//                     <Text style={[
//                       s.reasonLabel,
//                       selectedReason === reason.label && s.reasonLabelSelected
//                     ]}>
//                       {reason.label}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>
//           </View>
//         );

//       case 'location':
//         return (
//           <View style={s.tabContent}>
//             <View style={s.locationCard}>
//               <View style={s.sectionHeader}>
//                 <Ionicons name="location-outline" size={20} color="#8B4513" />
//                 <Text style={s.sectionHeaderTitleSmall}>Location</Text>
//               </View>
              
//               {!location ? (
//                 <TouchableOpacity 
//                   style={s.addLocationBtn} 
//                   onPress={getUserLocation} 
//                   disabled={locationLoading}
//                 >
//                   <LinearGradient
//                     colors={['#8B4513', '#654321']}
//                     style={s.addLocationGradient}
//                   >
//                     <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#D4AC0D" />
//                     <Text style={s.addLocationText}>
//                       {locationLoading ? 'Getting Location...' : 'Add Current Location'}
//                     </Text>
//                   </LinearGradient>
//                 </TouchableOpacity>
//               ) : (
//                 <View style={s.locationInfoCard}>
//                   <View style={s.locationHeader}>
//                     <View style={s.locationBadge}>
//                       <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
//                       <Text style={s.locationBadgeText}>Location Added</Text>
//                     </View>
//                     <TouchableOpacity onPress={() => setLocation(null)} style={s.removeLocationBtn}>
//                       <Ionicons name="close" size={20} color="#E74C3C" />
//                     </TouchableOpacity>
//                   </View>
                  
//                   <View style={s.locationDetails}>
//                     <Text style={s.locationAddress}>
//                       {location.address?.street || 'Unknown Street'}
//                     </Text>
//                     <Text style={s.locationCity}>
//                       {location.address?.city || 'Unknown City'}, {location.address?.region || ''}
//                     </Text>
//                     <View style={s.coordinatesContainer}>
//                       <Text style={s.coordinatesLabel}>Latitude:</Text>
//                       <Text style={s.coordinatesValue}>{location.latitude.toFixed(6)}</Text>
//                     </View>
//                     <View style={s.coordinatesContainer}>
//                       <Text style={s.coordinatesLabel}>Longitude:</Text>
//                       <Text style={s.coordinatesValue}>{location.longitude.toFixed(6)}</Text>
//                     </View>
//                   </View>
                  
//                   <TouchableOpacity style={s.refreshLocationBtn} onPress={getUserLocation}>
//                     <Ionicons name="refresh" size={18} color="#8B4513" />
//                     <Text style={s.refreshLocationText}>Refresh Location</Text>
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
//     <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       {/* Header */}
//       <LinearGradient colors={['#8B4513', '#654321']} style={s.header}>
//         <View style={s.headerContent}>
//           <View style={s.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={s.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}>
//               <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={s.headerTitle}>Noise Report</Text>
//           <Text style={s.headerSubtitle}>
//             {isRecording ? 'Recording in progress...' : 
//              videoUri ? 'Video attached' : 
//              audioUri ? 'Recording complete' : 
//              'Record or attach media'}
//           </Text>
//           {isAnalyzing && (
//             <View style={s.analyzingBadge}>
//               <ActivityIndicator size="small" color="#D4AC0D" />
//               <Text style={s.analyzingText}>AI Analyzing...</Text>
//             </View>
//           )}
//         </View>
//       </LinearGradient>

//       {/* Media Action Buttons */}
//       <View style={s.actionButtonsContainer}>
//         <TouchableOpacity
//           style={[s.actionButton, s.audioButton, isRecording && s.recordingButton]}
//           onPress={isRecording ? stopRecording : startRecording}
//           activeOpacity={0.8}
//         >
//           <LinearGradient
//             colors={isRecording ? ['#E74C3C', '#C0392B'] : ['#2196F3', '#1976D2']}
//             style={s.actionGradient}
//           >
//             <Ionicons 
//               name={isRecording ? "stop" : "mic"} 
//               size={28} 
//               color="#fff" 
//             />
//             <Text style={s.actionButtonText}>
//               {isRecording ? 'Stop' : 'Record Audio'}
//             </Text>
//           </LinearGradient>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[s.actionButton, s.videoButton]}
//           onPress={pickVideo}
//           disabled={isRecording}
//         >
//           <LinearGradient
//             colors={['#E91E63', '#C2185B']}
//             style={s.actionGradient}
//           >
//             <Ionicons name="videocam" size={28} color="#fff" />
//             <Text style={s.actionButtonText}>Add Video</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       </View>

//       {/* Media Preview */}
//       {renderMediaSection()}

//       {/* Tabs */}
//       {(audioUri || videoUri) && (
//         <View style={s.tabsContainer}>
//           <TouchableOpacity
//             style={[s.tab, activeTab === 'analysis' && s.activeTab]}
//             onPress={() => setActiveTab('analysis')}
//           >
//             <Ionicons 
//               name="analytics" 
//               size={20} 
//               color={activeTab === 'analysis' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'analysis' && s.activeTabText]}>
//               Analysis
//             </Text>
//             {aiResults && activeTab !== 'analysis' && (
//               <View style={s.notificationDot} />
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'details' && s.activeTab]}
//             onPress={() => setActiveTab('details')}
//           >
//             <Ionicons 
//               name="document-text" 
//               size={20} 
//               color={activeTab === 'details' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'details' && s.activeTabText]}>
//               Details
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'location' && s.activeTab]}
//             onPress={() => setActiveTab('location')}
//           >
//             <Ionicons 
//               name="location" 
//               size={20} 
//               color={activeTab === 'location' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'location' && s.activeTabText]}>
//               Location
//             </Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Tab Content */}
//       <ScrollView 
//         style={s.tabContentContainer} 
//         contentContainerStyle={s.tabContentContainerContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {renderTabContent()}

//         {/* Submit Button */}
//         {(audioUri || videoUri) && (
//           <TouchableOpacity
//             onPress={saveRecording}
//             style={[s.submitBtn, (!selectedReason || !noiseLevel || isSubmitting) && s.submitBtnDisabled]}
//             disabled={!selectedReason || !noiseLevel || isSubmitting}
//           >
//             <LinearGradient
//               colors={['#8B4513', '#654321']}
//               style={s.submitGradient}
//             >
//               {isSubmitting ? (
//                 <>
//                   <ActivityIndicator size="small" color="#D4AC0D" />
//                   <Text style={s.submitText}>Submitting...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                   <Text style={s.submitText}>Submit Report</Text>
//                   {aiResults && (
//                     <View style={s.aiBadge}>
//                       <Ionicons name="sparkles" size={16} color="#D4AC0D" />
//                     </View>
//                   )}
//                 </>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>
//         )}
//       </ScrollView>

//       {/* Drawer Modal */}
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
//     </KeyboardAvoidingView>
//   );
// }

// const s = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f5f5f5' },
  
//   // Header
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
//   analyzingBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//     alignSelf: 'flex-start',
//     marginTop: 8,
//     gap: 8,
//   },
//   analyzingText: { color: '#D4AC0D', fontSize: 12, fontWeight: '600' },

//   // Action Buttons
//   actionButtonsContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 15,
//     paddingVertical: 15,
//     gap: 10,
//   },
//   actionButton: {
//     flex: 1,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   actionGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     paddingVertical: 15,
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   recordingButton: {
//     transform: [{ scale: 1.05 }],
//   },

//   // Media Section
//   mediaSection: {
//     marginHorizontal: 15,
//     marginBottom: 15,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 12,
//   },
//   sectionHeaderTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   sectionHeaderTitleSmall: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#8B4513',
//   },
//   videoContainer: {
//     position: 'relative',
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   video: {
//     width: '100%',
//     height: 200,
//     backgroundColor: '#000',
//   },
//   deleteMediaBtn: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//     backgroundColor: 'rgba(255,255,255,0.9)',
//     borderRadius: 20,
//     padding: 2,
//   },
//   audioPlayerContainer: {
//     gap: 15,
//   },
//   progressContainer: { marginBottom: 5 },
//   progressBar: { 
//     height: 6, 
//     backgroundColor: '#e0e0e0', 
//     borderRadius: 3, 
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   progressFill: { 
//     height: '100%', 
//     backgroundColor: '#D4AC0D', 
//     borderRadius: 3 
//   },
//   timeLabels: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between' 
//   },
//   timeText: { 
//     fontSize: 12, 
//     color: '#666',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   audioControls: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 25,
//   },
//   controlBtn: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   playBtn: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: '#D4AC0D',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 4,
//   },

//   // Tabs
//   tabsContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     marginHorizontal: 15,
//     marginBottom: 15,
//     borderRadius: 15,
//     padding: 5,
//     elevation: 2,
//   },
//   tab: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 12,
//     borderRadius: 12,
//     position: 'relative',
//   },
//   activeTab: {
//     backgroundColor: '#f5f5f5',
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#999',
//     fontWeight: '500',
//   },
//   activeTabText: {
//     color: '#8B4513',
//     fontWeight: '600',
//   },
//   notificationDot: {
//     position: 'absolute',
//     top: 8,
//     right: '30%',
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#D4AC0D',
//   },

//   // Tab Content
//   tabContentContainer: {
//     flex: 1,
//   },
//   tabContentContainerContent: {
//     paddingHorizontal: 15,
//     paddingBottom: 30,
//   },
//   tabContent: {
//     gap: 15,
//   },

//   // Noise Level Card
//   noiseLevelCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     elevation: 3,
//   },
//   noiseLevelHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   noiseLevelIconContainer: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   noiseLevelInfo: {
//     flex: 1,
//   },
//   noiseLevelLabel: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   noiseLevelDesc: {
//     fontSize: 13,
//     color: '#666',
//   },
//   noiseLevelEmoji: {
//     fontSize: 32,
//   },
//   noiseLevelMetrics: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 15,
//   },
//   metricItem: {
//     alignItems: 'center',
//   },
//   metricValue: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   metricLabel: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 4,
//   },
//   noiseLevelBadge: {
//     alignItems: 'center',
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   noiseLevelBadgeText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },

//   // Detections Container
//   detectionsContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   detectionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//   },
//   detectionItemSelected: {
//     backgroundColor: '#fff3e0',
//     borderColor: '#D4AC0D',
//   },
//   detectionRank: {
//     marginRight: 12,
//   },
//   rankBadge: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   rankText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   detectionContent: {
//     flex: 1,
//   },
//   detectionClass: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 6,
//   },
//   confidenceBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   confidenceBarBg: {
//     flex: 1,
//     height: 6,
//     backgroundColor: '#f0f0f0',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   confidenceBarFill: {
//     height: '100%',
//     borderRadius: 3,
//   },
//   confidenceText: {
//     fontSize: 12,
//     color: '#666',
//     fontWeight: '500',
//     width: 45,
//   },
//   selectedCheck: {
//     marginLeft: 8,
//   },

//   // Distance Card
//   distanceCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   distanceContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 15,
//   },
//   distanceIconLarge: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   distanceIconEmoji: {
//     fontSize: 30,
//   },
//   distanceDetails: {
//     flex: 1,
//   },
//   distanceCategory: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginBottom: 4,
//   },
//   distanceValue: {
//     fontSize: 14,
//     color: '#333',
//     marginBottom: 4,
//   },
//   distanceRef: {
//     fontSize: 12,
//     color: '#999',
//     fontStyle: 'italic',
//   },

//   // Empty Analysis
//   emptyAnalysis: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginTop: 15,
//     marginBottom: 8,
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#999',
//     textAlign: 'center',
//   },

//   // Details Card
//   detailsCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   detailsInput: {
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     borderRadius: 12,
//     padding: 12,
//     fontSize: 14,
//     backgroundColor: '#f8f9fa',
//     minHeight: 100,
//   },
//   charCount: {
//     textAlign: 'right',
//     fontSize: 12,
//     color: '#999',
//     marginTop: 8,
//   },

//   // Reasons Card
//   reasonsCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   reasonsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   reasonChip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f8f9fa',
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     borderRadius: 25,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     gap: 6,
//   },
//   reasonChipSelected: {
//     backgroundColor: '#fff3e0',
//     borderWidth: 2,
//   },
//   reasonIcon: {
//     fontSize: 16,
//   },
//   reasonLabel: {
//     fontSize: 13,
//     color: '#666',
//   },
//   reasonLabelSelected: {
//     color: '#8B4513',
//     fontWeight: '600',
//   },

//   // Location Card
//   locationCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   addLocationBtn: {
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginTop: 5,
//   },
//   addLocationGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   addLocationText: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   locationInfoCard: {
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     padding: 15,
//     marginTop: 5,
//   },
//   locationHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   locationBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
//   locationBadgeText: {
//     fontSize: 13,
//     color: '#4CAF50',
//     fontWeight: '600',
//   },
//   removeLocationBtn: {
//     padding: 4,
//   },
//   locationDetails: {
//     marginBottom: 12,
//   },
//   locationAddress: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 4,
//   },
//   locationCity: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 12,
//   },
//   coordinatesContainer: {
//     flexDirection: 'row',
//     marginBottom: 4,
//   },
//   coordinatesLabel: {
//     fontSize: 12,
//     color: '#999',
//     width: 70,
//   },
//   coordinatesValue: {
//     fontSize: 12,
//     color: '#333',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   refreshLocationBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   refreshLocationText: {
//     fontSize: 13,
//     color: '#8B4513',
//     fontWeight: '500',
//   },
//   locationError: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFEBEE',
//     padding: 12,
//     borderRadius: 10,
//     marginTop: 10,
//     gap: 8,
//   },
//   locationErrorText: {
//     fontSize: 13,
//     color: '#E74C3C',
//     flex: 1,
//   },

//   // Submit Button
//   submitBtn: {
//     marginTop: 10,
//     marginBottom: 20,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//   },
//   submitGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   submitText: {
//     color: '#D4AC0D',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   submitBtnDisabled: {
//     opacity: 0.5,
//   },
//   aiBadge: {
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     padding: 4,
//     borderRadius: 12,
//   },

//   // Recording Indicator
//   recordingContainer: { 
//     alignItems: 'center', 
//     paddingVertical: 20,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     marginHorizontal: 15,
//     marginBottom: 15,
//     elevation: 2,
//   },
//   waveformContainer: { 
//     alignItems: 'center', 
//     marginBottom: 20 
//   },
//   dbReading: { 
//     fontSize: 32, 
//     fontWeight: 'bold', 
//     marginBottom: 15 
//   },
//   waveform: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     gap: 8, 
//     height: 80 
//   },
//   waveBar: { 
//     width: 8, 
//     borderRadius: 4, 
//     backgroundColor: '#D4AC0D' 
//   },
//   timerContainer: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     gap: 10, 
//     marginBottom: 20 
//   },
//   timerText: { 
//     fontSize: 48, 
//     fontWeight: 'bold', 
//     color: '#8B4513' 
//   },
//   recordingDot: { 
//     width: 16, 
//     height: 16, 
//     borderRadius: 8, 
//     backgroundColor: '#E74C3C', 
//     justifyContent: 'center', 
//     alignItems: 'center' 
//   },
//   pulsingDot: { 
//     width: 8, 
//     height: 8, 
//     borderRadius: 4, 
//     backgroundColor: '#fff' 
//   },
//   recordButton: { 
//     width: 100, 
//     height: 100, 
//     borderRadius: 50, 
//     justifyContent: 'center', 
//     alignItems: 'center', 
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//   },
//   recordStatus: { 
//     marginTop: 15, 
//     fontSize: 14, 
//     color: '#666', 
//     textAlign: 'center' 
//   },

//   // Modal
//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
// });

// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//   Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import * as ImagePicker from 'expo-image-picker';
// import * as Location from 'expo-location';
// import * as FileSystem from 'expo-file-system/legacy';
// import { FFmpegKit } from 'ffmpeg-kit-react-native';
// import axios from 'axios';
// import API_BASE_URL from '../../utils/api';
// import CustomDrawer from '../CustomDrawer';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// // =============================
// // FFmpeg Conversion Helper
// // =============================
// const convertToWav = async (uri) => {
//   if (!uri) return null;
  
//   const isWav = uri.toLowerCase().endsWith('.wav');
//   if (isWav) {
//     console.log('✅ Already WAV format:', uri);
//     return uri;
//   }
  
//   try {
//     const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
//     const filename = `converted_${Date.now()}.wav`;
//     const outputUri = `${FileSystem.cacheDirectory}${filename}`;
    
//     console.log('🔄 Converting audio to WAV format...');
//     const command = `-i "${cleanUri}" -ar 16000 -ac 1 "${outputUri}"`;
//     const session = await FFmpegKit.execute(command);
//     const returnCode = await session.getReturnCode();
    
//     if (returnCode.isValueSuccess()) {
//       const fileInfo = await FileSystem.getInfoAsync(outputUri);
//       if (fileInfo.exists && fileInfo.size > 0) {
//         console.log(`✅ Conversion successful: ${fileInfo.size} bytes`);
//         return outputUri;
//       }
//     }
    
//     console.error('❌ Conversion failed, using original');
//     return uri;
    
//   } catch (err) {
//     console.error('❌ FFmpeg conversion error:', err.message);
//     return uri;
//   }
// };

// export default function AudioRecordingScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [recordingDuration, setRecordingDuration] = useState(0);
//   const [playbackPosition, setPlaybackPosition] = useState(0);
//   const [totalDuration, setTotalDuration] = useState(0);
//   const [currentDb, setCurrentDb] = useState(35);
//   const [recording, setRecording] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [audioUri, setAudioUri] = useState(null);
//   const [comment, setComment] = useState('');
//   const [videoUri, setVideoUri] = useState(null);
//   const [attachmentType, setAttachmentType] = useState(null);
//   const [location, setLocation] = useState(null);
//   const [locationLoading, setLocationLoading] = useState(false);
//   const [locationError, setLocationError] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [noiseLevel, setNoiseLevel] = useState('');
//   const [aiResults, setAiResults] = useState(null);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [activeTab, setActiveTab] = useState('analysis'); // 'analysis', 'details', 'location'

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const waveAnim1 = useRef(new Animated.Value(0.5)).current;
//   const waveAnim2 = useRef(new Animated.Value(0.8)).current;
//   const waveAnim3 = useRef(new Animated.Value(0.3)).current;
//   const recordingInterval = useRef(null);
//   const videoRef = useRef(null);

//   const noiseLevels = [
//     { value: 'green', label: 'Low', icon: 'checkmark-circle', color: '#4CAF50', bgColor: '#E8F5E9', description: 'Mild disturbance', emoji: '😌' },
//     { value: 'yellow', label: 'Medium', icon: 'warning', color: '#FFC107', bgColor: '#FFF9C4', description: 'Moderate noise', emoji: '😐' },
//     { value: 'red', label: 'High', icon: 'alert-circle', color: '#F44336', bgColor: '#FFEBEE', description: 'Severe disturbance', emoji: '😠' }
//   ];

//   const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';

//   useEffect(() => {
//     (async () => {
//       await Audio.requestPermissionsAsync();
//       await ImagePicker.requestCameraPermissionsAsync();
//       await Audio.setAudioModeAsync({
//         allowsRecordingIOS: true, 
//         playsInSilentModeIOS: true, 
//         staysActiveInBackground: false,
//         shouldDuckAndroid: true, 
//         playThroughEarpieceAndroid: false,
//       });
//     })();
//     return () => {
//       recording?.stopAndUnloadAsync();
//       if (sound) {
//         sound.unloadAsync();
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (isRecording) {
//       Animated.loop(Animated.sequence([
//         Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
//         Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
//       ])).start();
//       Animated.loop(Animated.stagger(200, [
//         Animated.timing(waveAnim1, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         Animated.timing(waveAnim2, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         Animated.timing(waveAnim3, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//       ])).start();
//     } else {
//       pulseAnim.setValue(1);
//     }
//   }, [isRecording]);

//   // =============================
//   // AUTO-ASSIGN NOISE LEVEL BASED ON DECIBEL AND DISTANCE
//   // =============================
//   const determineNoiseLevel = (decibel, distance) => {
//     if (!decibel) return null;
    
//     let adjustedDecibel = decibel;
    
//     if (distance && distance.meters) {
//       if (distance.meters > 10) {
//         adjustedDecibel = decibel * 0.7;
//       } else if (distance.meters > 5) {
//         adjustedDecibel = decibel * 0.85;
//       } else if (distance.meters < 1) {
//         adjustedDecibel = decibel * 1.2;
//       }
//     }
    
//     if (adjustedDecibel < 50) {
//       return 'green';
//     } else if (adjustedDecibel < 70) {
//       return 'yellow';
//     } else {
//       return 'red';
//     }
//   };

//   const getNoiseLevelFromAI = (aiData) => {
//     if (!aiData) return null;
    
//     if (aiData.noise_level && aiData.noise_level.value) {
//       return aiData.noise_level.value;
//     }
    
//     return determineNoiseLevel(aiData.decibel, aiData.distance);
//   };

//   useEffect(() => {
//     if (aiResults) {
//       const newNoiseLevel = getNoiseLevelFromAI(aiResults);
//       if (newNoiseLevel) {
//         setNoiseLevel(newNoiseLevel);
//         console.log(`🎯 Auto-assigned noise level: ${newNoiseLevel}`);
//       }
//     }
//   }, [aiResults]);

//   const startRecording = async () => {
//     try {
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
//       setRecording(newRecording);
//       setIsRecording(true);
//       setRecordingDuration(0);
//       setAttachmentType('audio');
//       setAiResults(null);
//       setNoiseLevel('');
//       recordingInterval.current = setInterval(() => {
//         setRecordingDuration(p => p + 1);
//         setCurrentDb(Math.floor(Math.random() * 45 + 40));
//       }, 1000);
//     } catch (err) {
//       Alert.alert('Error', 'Failed to start recording.');
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await recording.stopAndUnloadAsync();
//       const uri = recording.getURI();
//       setAudioUri(uri);
//       setIsRecording(false);
//       setRecording(null);
//       clearInterval(recordingInterval.current);
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri });
//       const status = await newSound.getStatusAsync();
//       setTotalDuration(Math.floor(status.durationMillis / 1000));
//       setSound(newSound);
      
//       if (uri) {
//         setTimeout(() => {
//           analyzeWithYAMNet(uri);
//         }, 500);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const analyzeWithYAMNet = async (mediaUri) => {
//     if (!mediaUri) {
//       Alert.alert('No Media', 'Please record audio or video first');
//       return;
//     }

//     let mediaType = attachmentType;
//     if (!mediaType) {
//       if (mediaUri.includes('.mp4') || mediaUri.includes('.mov')) {
//         mediaType = 'video';
//       } else {
//         mediaType = 'audio';
//       }
//     }

//     setIsAnalyzing(true);
//     setAiResults(null);

//     try {
//       const fileInfo = await FileSystem.getInfoAsync(mediaUri);
//       if (!fileInfo.exists) {
//         throw new Error('File not found');
//       }
      
//       const formData = new FormData();
//       const fileName = mediaUri.split('/').pop();
//       const fileType = mediaType === 'video' ? 'video/mp4' : 'audio/m4a';
      
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
//           'Content-Type': 'multipart/form-data',
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//         body: formData,
//         signal: controller.signal,
//       });
      
//       clearTimeout(timeoutId);
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.success) {
//         setAiResults(data);
//       } else {
//         Alert.alert('Analysis Failed', data.error || 'Unknown error');
//       }

//     } catch (error) {
//       console.error('❌ AI Analysis Error:', error);
      
//       let errorMessage = 'Failed to analyze media. ';
      
//       if (error.name === 'AbortError') {
//         errorMessage += 'Request timed out. Try a shorter video.';
//       } else {
//         errorMessage += error.message;
//       }
      
//       Alert.alert('AI Error', errorMessage);
//     } finally {
//       setIsAnalyzing(false);
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
//           message += `Classes: ${responseData.flask_ai.classes}`;
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

//   const pickVideo = () => {
//     Alert.alert('Add Video', 'Choose an option', [
//       { 
//         text: 'Record Video', 
//         onPress: async () => {
//           const result = await ImagePicker.launchCameraAsync({ 
//             mediaTypes: ImagePicker.MediaTypeOptions.Videos, 
//             allowsEditing: true, 
//             aspect: [16, 9], 
//             quality: 1, 
//             videoMaxDuration: 60 
//           });
//           if (!result.canceled && result.assets[0]) {
//             const videoUri = result.assets[0].uri;
            
//             setAttachmentType('video');
//             setVideoUri(videoUri);
//             if (sound) {
//               await sound.unloadAsync();
//               setSound(null);
//             }
//             setAudioUri(null);
//             setAiResults(null);
//             setNoiseLevel('');
            
//             setTimeout(() => {
//               analyzeWithYAMNet(videoUri);
//             }, 100);
//           }
//         }
//       },
//       { 
//         text: 'Choose from Gallery', 
//         onPress: async () => {
//           const result = await ImagePicker.launchImageLibraryAsync({ 
//             mediaTypes: ImagePicker.MediaTypeOptions.Videos, 
//             allowsEditing: true, 
//             aspect: [16, 9], 
//             quality: 1 
//           });
//           if (!result.canceled && result.assets[0]) {
//             const videoUri = result.assets[0].uri;
            
//             setAttachmentType('video');
//             setVideoUri(videoUri);
//             if (sound) {
//               await sound.unloadAsync();
//               setSound(null);
//             }
//             setAudioUri(null);
//             setSound(null);
//             setAiResults(null);
//             setNoiseLevel('');
            
//             setTimeout(() => {
//               analyzeWithYAMNet(videoUri);
//             }, 100);
//           }
//         }
//       },
//       { text: 'Cancel', style: 'cancel' },
//     ]);
//   };

//   const deleteVideo = () => {
//     Alert.alert('Delete Video', 'Remove this video?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => { 
//           setVideoUri(null); 
//           setAttachmentType(null); 
//           setAiResults(null);
//           setNoiseLevel('');
//         }
//       },
//     ]);
//   };

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
//       setLocation({ 
//         latitude: currentLocation.coords.latitude, 
//         longitude: currentLocation.coords.longitude, 
//         address: address[0] || null, 
//         timestamp: new Date().toISOString() 
//       });
//       setLocationLoading(false);
//       Alert.alert('✅ Location Added', `${address[0]?.street || ''} ${address[0]?.city || ''}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
//     } catch (error) {
//       setLocationError('Failed to get location');
//       setLocationLoading(false);
//       Alert.alert('Error', 'Failed to get location.');
//     }
//   };

//   const playPauseRecording = async () => {
//     if (!sound) return;
//     try {
//       if (isPlaying) {
//         await sound.pauseAsync();
//         setIsPlaying(false);
//       } else {
//         if (playbackPosition >= totalDuration) {
//           await sound.setPositionAsync(0);
//           setPlaybackPosition(0);
//         }
//         await sound.playAsync();
//         setIsPlaying(true);
//         sound.setOnPlaybackStatusUpdate((status) => {
//           if (status.isLoaded) {
//             setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//             if (status.didJustFinish) { 
//               setIsPlaying(false); 
//               setPlaybackPosition(0); 
//             }
//           }
//         });
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const restartRecording = async () => {
//     if (!sound) return;
//     try {
//       await sound.setPositionAsync(0);
//       setPlaybackPosition(0);
//       await sound.playAsync();
//       setIsPlaying(true);
//       sound.setOnPlaybackStatusUpdate((status) => {
//         if (status.isLoaded) {
//           setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//           if (status.didJustFinish) { 
//             setIsPlaying(false); 
//             setPlaybackPosition(0); 
//           }
//         }
//       });
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const deleteRecording = () => {
//     Alert.alert('Delete Recording', 'Delete this recording?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => {
//           if (sound) {
//             sound.unloadAsync();
//           }
//           setSound(null);
//           setAudioUri(null);
//           setTotalDuration(0);
//           setPlaybackPosition(0);
//           setIsPlaying(false);
//           setAttachmentType(null);
//           setAiResults(null);
//           setNoiseLevel('');
//         }
//       },
//     ]);
//   };

//   // =============================
//   // SAVE COMPLETE REPORT WITH ALL DATA
//   // =============================
//   const saveRecording = async () => {
//     if (!audioUri && !videoUri) {
//       Alert.alert('No Content', 'Please record audio or attach a video first.');
//       return;
//     }
//     if (!noiseLevel) {
//       Alert.alert('Noise Level Required', 'Please wait for AI analysis to complete.');
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

//       const formData = new FormData();
      
//       formData.append('userId', userId);
      
//       const mediaUri = videoUri || audioUri;
//       const mediaType = videoUri ? 'video' : 'audio';
//       const fileExtension = mediaUri.split('.').pop();
//       const fileName = `noise_report_${Date.now()}.${fileExtension}`;
      
//       formData.append('media', {
//         uri: mediaUri,
//         type: videoUri ? `video/${fileExtension}` : `audio/${fileExtension}`,
//         name: fileName,
//       });

//       formData.append('mediaType', mediaType);
//       formData.append('noiseLevel', noiseLevel);
      
//       // ===== SAVE COMPLETE AI ANALYSIS DATA =====
//       if (aiResults) {
//         // Save the complete AI analysis object
//         formData.append('ai_analysis', JSON.stringify(aiResults));
        
//         // Save individual AI analysis components for easy querying
//         formData.append('ai_decibel', aiResults.decibel?.toString() || '0');
//         formData.append('ai_noise_level', aiResults.noise_level?.level || '');
//         formData.append('ai_noise_value', aiResults.noise_level?.value || '');
//         formData.append('ai_noise_description', aiResults.noise_level?.description || '');
        
//         // Save all detections
//         if (aiResults.detections && aiResults.detections.length > 0) {
//           formData.append('ai_detections', JSON.stringify(aiResults.detections));
          
//           // Save top 3 detections as separate fields
//           aiResults.detections.slice(0, 3).forEach((detection, index) => {
//             formData.append(`ai_detection_${index + 1}_class`, detection.class);
//             formData.append(`ai_detection_${index + 1}_confidence`, detection.confidence?.toString() || '0');
//           });
//         }
        
//         // Save distance estimation data
//         if (aiResults.distance) {
//           formData.append('ai_distance_meters', aiResults.distance.meters?.toString() || '0');
//           formData.append('ai_distance_category', aiResults.distance.category || '');
//           formData.append('ai_distance_description', aiResults.distance.description || '');
//           formData.append('ai_distance_icon', aiResults.distance.icon || '');
//           formData.append('ai_distance_reference_sound', aiResults.distance.reference_sound || '');
//           formData.append('ai_distance_reference_db', aiResults.distance.reference_db?.toString() || '0');
//         }
        
//         // Save audio metadata
//         formData.append('ai_total_duration', totalDuration?.toString() || '0');
//         formData.append('ai_recording_duration', recordingDuration?.toString() || '0');
//       }
      
//       if (comment) {
//         formData.append('comment', comment);
//       }
      
//       if (location) {
//         formData.append('location', JSON.stringify({
//           latitude: location.latitude,
//           longitude: location.longitude,
//           address: location.address,
//           timestamp: location.timestamp,
//         }));
        
//         // Save individual location fields
//         formData.append('location_latitude', location.latitude?.toString() || '');
//         formData.append('location_longitude', location.longitude?.toString() || '');
//         formData.append('location_address_street', location.address?.street || '');
//         formData.append('location_address_city', location.address?.city || '');
//         formData.append('location_address_region', location.address?.region || '');
//         formData.append('location_address_country', location.address?.country || '');
//         formData.append('location_address_postalCode', location.address?.postalCode || '');
//         formData.append('location_timestamp', location.timestamp || '');
//       }
      
//       // Save metadata about the report
//       formData.append('app_version', Constants.expoConfig?.version || '1.0.0');
//       formData.append('platform', Platform.OS);
//       formData.append('platform_version', Platform.Version?.toString() || '');
//       formData.append('timestamp', new Date().toISOString());

//       console.log('📤 Submitting complete report with all data...');
      
//       const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 60000,
//       });

//       setIsSubmitting(false);

//       // Build comprehensive success message with all saved data
//       const attachmentInfo = videoUri 
//         ? `Video: ${videoUri.split('/').pop()}`
//         : `Audio: ${formatTime(totalDuration)}`;

//       const locationInfo = location 
//         ? `\n📍 Location: ${location.address?.street || ''} ${location.address?.city || ''}\n   Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
//         : '\n📍 Location: Not provided';

//       const noiseLevelInfo = noiseLevels.find(nl => nl.value === noiseLevel);
//       const noiseLevelText = `\n🔊 Noise Level: ${noiseLevelInfo?.label} (${noiseLevelInfo?.description})`;
      
//       let aiInfo = '';
//       if (aiResults) {
//         aiInfo = '\n🤖 AI Analysis:';
//         aiInfo += `\n   • Decibel: ${aiResults.decibel} dB`;
//         if (aiResults.distance) {
//           aiInfo += `\n   • Distance: ~${aiResults.distance.meters}m (${aiResults.distance.category})`;
//         }
//         if (aiResults.detections && aiResults.detections.length > 0) {
//           aiInfo += '\n   • Top Detections:';
//           aiResults.detections.slice(0, 3).forEach((d, i) => {
//             aiInfo += `\n     ${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`;
//           });
//         }
//       }

//       const reportDetails = `✅ Noise Report Submitted Successfully!\n\n` +
//         `📋 Report ID: ${response.data.reportId || 'N/A'}\n` +
//         `${comment ? `📄 Details: ${comment}\n` : ''}` +
//         `${noiseLevelText}` +
//         `${aiInfo}` +
//         `\n📎 ${attachmentInfo}` +
//         `${locationInfo}` +
//         `\n⏱️ Submitted: ${new Date().toLocaleString()}`;

//       Alert.alert('✅ Report Submitted', reportDetails, [
//         { 
//           text: 'OK', 
//           onPress: () => {
//             // Reset all state after successful submission
//             setComment('');
//             setNoiseLevel('');
//             if (sound) {
//               sound.unloadAsync();
//             }
//             setSound(null);
//             setAudioUri(null);
//             setVideoUri(null);
//             setAttachmentType(null);
//             setLocation(null);
//             setLocationError(null);
//             setTotalDuration(0);
//             setPlaybackPosition(0);
//             setAiResults(null);
//             setActiveTab('analysis');
//           }
//         }
//       ]);

//     } catch (error) {
//       setIsSubmitting(false);
//       console.error('Error submitting report:', error);
      
//       let errorMessage = 'Failed to submit noise report. Please try again.';
      
//       if (error.response) {
//         errorMessage = error.response.data?.message || errorMessage;
//         console.error('Server response:', error.response.data);
//       } else if (error.request) {
//         errorMessage = 'Network error. Please check your internet connection.';
//       }
      
//       Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
//     }
//   };

//   const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
//   const getDbColor = (db) => db < 50 ? '#8B7355' : db < 70 ? '#D4AC0D' : db < 85 ? '#E67E22' : '#E74C3C';

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.parallel([
//       Animated.timing(slideAnim, { 
//         toValue: 0, 
//         duration: 350, 
//         easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), 
//         useNativeDriver: true 
//       }),
//       Animated.timing(overlayOpacity, { 
//         toValue: 1, 
//         duration: 350, 
//         easing: Easing.out(Easing.quad), 
//         useNativeDriver: true 
//       }),
//     ]).start();
//   };

//   const closeDrawer = () => {
//     Animated.parallel([
//       Animated.timing(slideAnim, { 
//         toValue: -width * 0.8, 
//         duration: 300, 
//         easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), 
//         useNativeDriver: true 
//       }),
//       Animated.timing(overlayOpacity, { 
//         toValue: 0, 
//         duration: 250, 
//         easing: Easing.in(Easing.quad), 
//         useNativeDriver: true 
//       }),
//     ]).start(() => setDrawerVisible(false));
//   };

//   const showConnectionInfo = () => {
//     const manifest = Constants.expoConfig;
//     const isTunnel = manifest?.extra?.useTunnel;
    
//     Alert.alert(
//       'Connection Info',
//       `AI Service URL: ${AI_SERVICE_URL}\nExpo Tunnel: ${isTunnel ? 'Yes' : 'No'}\nPlatform: ${Platform.OS}`,
//       [{ text: 'OK' }]
//     );
//   };

//   // Render noise level card
//   const renderNoiseLevelCard = () => {
//     if (!noiseLevel || !aiResults) return null;
    
//     const level = noiseLevels.find(l => l.value === noiseLevel);
//     if (!level) return null;
    
//     return (
//       <LinearGradient
//         colors={[level.bgColor, '#fff']}
//         style={s.noiseLevelCard}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//       >
//         <View style={s.noiseLevelHeader}>
//           <View style={[s.noiseLevelIconContainer, { backgroundColor: level.color }]}>
//             <Ionicons name={level.icon} size={32} color="#fff" />
//           </View>
//           <View style={s.noiseLevelInfo}>
//             <Text style={s.noiseLevelLabel}>{level.label} Noise Level</Text>
//             <Text style={s.noiseLevelDesc}>{level.description}</Text>
//           </View>
//           <Text style={s.noiseLevelEmoji}>{level.emoji}</Text>
//         </View>
        
//         <View style={s.noiseLevelMetrics}>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{aiResults.decibel} dB</Text>
//             <Text style={s.metricLabel}>Volume</Text>
//           </View>
//           {aiResults.distance && (
//             <View style={s.metricItem}>
//               <Text style={s.metricValue}>~{aiResults.distance.meters}m</Text>
//               <Text style={s.metricLabel}>Distance</Text>
//             </View>
//           )}
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{aiResults.detections?.length || 0}</Text>
//             <Text style={s.metricLabel}>Sounds</Text>
//           </View>
//         </View>
        
//         <View style={s.noiseLevelBadge}>
//           <Text style={[s.noiseLevelBadgeText, { color: level.color }]}>
//             Automatically Detected
//           </Text>
//         </View>
//       </LinearGradient>
//     );
//   };

//   // Render media section
//   const renderMediaSection = () => {
//     if (videoUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.sectionHeader}>
//             <Ionicons name="videocam" size={24} color="#8B4513" />
//             <Text style={s.sectionHeaderTitle}>Video Attachment</Text>
//           </View>
//           <View style={s.videoContainer}>
//             <Video 
//               ref={videoRef} 
//               source={{ uri: videoUri }} 
//               style={s.video} 
//               useNativeControls 
//               resizeMode="contain" 
//               isLooping 
//             />
//             <TouchableOpacity style={s.deleteMediaBtn} onPress={deleteVideo}>
//               <Ionicons name="close-circle" size={32} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
//         </View>
//       );
//     }

//     if (audioUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.sectionHeader}>
//             <Ionicons name="musical-notes" size={24} color="#8B4513" />
//             <Text style={s.sectionHeaderTitle}>Audio Recording</Text>
//           </View>
//           <View style={s.audioPlayerContainer}>
//             <View style={s.progressContainer}>
//               <View style={s.progressBar}>
//                 <View style={[
//                   s.progressFill, 
//                   { width: `${totalDuration > 0 ? (playbackPosition / totalDuration) * 100 : 0}%` }
//                 ]} />
//               </View>
//               <View style={s.timeLabels}>
//                 <Text style={s.timeText}>{formatTime(playbackPosition)}</Text>
//                 <Text style={s.timeText}>{formatTime(totalDuration)}</Text>
//               </View>
//             </View>
//             <View style={s.audioControls}>
//               <TouchableOpacity onPress={restartRecording} style={s.controlBtn}>
//                 <Ionicons name="play-skip-back" size={24} color="#8B4513" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={playPauseRecording} style={s.playBtn}>
//                 <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={deleteRecording} style={s.controlBtn}>
//                 <Ionicons name="trash" size={24} color="#E74C3C" />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       );
//     }

//     return null;
//   };

//   // Render tab content
//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'analysis':
//         return (
//           <View style={s.tabContent}>
//             {aiResults ? (
//               <>
//                 {renderNoiseLevelCard()}
                
//                 <View style={s.detectionsContainer}>
//                   <View style={s.sectionHeader}>
//                     <Ionicons name="list" size={20} color="#8B4513" />
//                     <Text style={s.sectionHeaderTitleSmall}>Top Detected Sounds</Text>
//                   </View>
//                   {aiResults.detections?.slice(0, 5).map((detection, index) => {
//                     const confidencePercent = (detection.confidence * 100).toFixed(1);
//                     return (
//                       <View
//                         key={index}
//                         style={s.detectionItem}
//                       >
//                         <View style={s.detectionRank}>
//                           <LinearGradient
//                             colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
//                             style={s.rankBadge}
//                           >
//                             <Text style={s.rankText}>#{index + 1}</Text>
//                           </LinearGradient>
//                         </View>
//                         <View style={s.detectionContent}>
//                           <Text style={s.detectionClass}>{detection.class}</Text>
//                           <View style={s.confidenceBar}>
//                             <View style={s.confidenceBarBg}>
//                               <LinearGradient
//                                 colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
//                                 style={[s.confidenceBarFill, { width: `${confidencePercent}%` }]}
//                               />
//                             </View>
//                             <Text style={s.confidenceText}>{confidencePercent}%</Text>
//                           </View>
//                         </View>
//                       </View>
//                     );
//                   })}
//                 </View>

//                 {aiResults.distance && (
//                   <View style={s.distanceCard}>
//                     <View style={s.sectionHeader}>
//                       <Ionicons name="navigate" size={20} color="#8B4513" />
//                       <Text style={s.sectionHeaderTitleSmall}>Distance Estimation</Text>
//                     </View>
//                     <View style={s.distanceContent}>
//                       <View style={s.distanceIconLarge}>
//                         <Text style={s.distanceIconEmoji}>{aiResults.distance.icon}</Text>
//                       </View>
//                       <View style={s.distanceDetails}>
//                         <Text style={s.distanceCategory}>{aiResults.distance.category}</Text>
//                         <Text style={s.distanceValue}>~{aiResults.distance.meters} meters away</Text>
//                         <Text style={s.distanceRef}>
//                           Based on {aiResults.distance.reference_sound}
//                         </Text>
//                       </View>
//                     </View>
//                   </View>
//                 )}
//               </>
//             ) : (
//               <View style={s.emptyAnalysis}>
//                 <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
//                 <Text style={s.emptyTitle}>No Analysis Yet</Text>
//                 <Text style={s.emptyText}>Record audio or attach a video to analyze</Text>
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
//                 <Text style={s.sectionHeaderTitleSmall}>Additional Details</Text>
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
//                 <Text style={s.sectionHeaderTitleSmall}>Location</Text>
//               </View>
              
//               {!location ? (
//                 <TouchableOpacity 
//                   style={s.addLocationBtn} 
//                   onPress={getUserLocation} 
//                   disabled={locationLoading}
//                 >
//                   <LinearGradient
//                     colors={['#8B4513', '#654321']}
//                     style={s.addLocationGradient}
//                   >
//                     <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#D4AC0D" />
//                     <Text style={s.addLocationText}>
//                       {locationLoading ? 'Getting Location...' : 'Add Current Location'}
//                     </Text>
//                   </LinearGradient>
//                 </TouchableOpacity>
//               ) : (
//                 <View style={s.locationInfoCard}>
//                   <View style={s.locationHeader}>
//                     <View style={s.locationBadge}>
//                       <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
//                       <Text style={s.locationBadgeText}>Location Added</Text>
//                     </View>
//                     <TouchableOpacity onPress={() => setLocation(null)} style={s.removeLocationBtn}>
//                       <Ionicons name="close" size={20} color="#E74C3C" />
//                     </TouchableOpacity>
//                   </View>
                  
//                   <View style={s.locationDetails}>
//                     <Text style={s.locationAddress}>
//                       {location.address?.street || 'Unknown Street'}
//                     </Text>
//                     <Text style={s.locationCity}>
//                       {location.address?.city || 'Unknown City'}, {location.address?.region || ''}
//                     </Text>
//                     <View style={s.coordinatesContainer}>
//                       <Text style={s.coordinatesLabel}>Latitude:</Text>
//                       <Text style={s.coordinatesValue}>{location.latitude.toFixed(6)}</Text>
//                     </View>
//                     <View style={s.coordinatesContainer}>
//                       <Text style={s.coordinatesLabel}>Longitude:</Text>
//                       <Text style={s.coordinatesValue}>{location.longitude.toFixed(6)}</Text>
//                     </View>
//                   </View>
                  
//                   <TouchableOpacity style={s.refreshLocationBtn} onPress={getUserLocation}>
//                     <Ionicons name="refresh" size={18} color="#8B4513" />
//                     <Text style={s.refreshLocationText}>Refresh Location</Text>
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
//     <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       {/* Header */}
//       <LinearGradient colors={['#8B4513', '#654321']} style={s.header}>
//         <View style={s.headerContent}>
//           <View style={s.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={s.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}>
//               <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={s.headerTitle}>Noise Report</Text>
//           <Text style={s.headerSubtitle}>
//             {isRecording ? 'Recording in progress...' : 
//              videoUri ? 'Video attached' : 
//              audioUri ? 'Recording complete' : 
//              'Record or attach media'}
//           </Text>
//           {isAnalyzing && (
//             <View style={s.analyzingBadge}>
//               <ActivityIndicator size="small" color="#D4AC0D" />
//               <Text style={s.analyzingText}>AI Analyzing...</Text>
//             </View>
//           )}
//         </View>
//       </LinearGradient>

//       {/* Media Action Buttons */}
//       <View style={s.actionButtonsContainer}>
//         <TouchableOpacity
//           style={[s.actionButton, s.audioButton, isRecording && s.recordingButton]}
//           onPress={isRecording ? stopRecording : startRecording}
//           activeOpacity={0.8}
//         >
//           <LinearGradient
//             colors={isRecording ? ['#E74C3C', '#C0392B'] : ['#2196F3', '#1976D2']}
//             style={s.actionGradient}
//           >
//             <Ionicons 
//               name={isRecording ? "stop" : "mic"} 
//               size={28} 
//               color="#fff" 
//             />
//             <Text style={s.actionButtonText}>
//               {isRecording ? 'Stop' : 'Record Audio'}
//             </Text>
//           </LinearGradient>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[s.actionButton, s.videoButton]}
//           onPress={pickVideo}
//           disabled={isRecording}
//         >
//           <LinearGradient
//             colors={['#E91E63', '#C2185B']}
//             style={s.actionGradient}
//           >
//             <Ionicons name="videocam" size={28} color="#fff" />
//             <Text style={s.actionButtonText}>Add Video</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       </View>

//       {/* Media Preview */}
//       {renderMediaSection()}

//       {/* Tabs */}
//       {(audioUri || videoUri) && (
//         <View style={s.tabsContainer}>
//           <TouchableOpacity
//             style={[s.tab, activeTab === 'analysis' && s.activeTab]}
//             onPress={() => setActiveTab('analysis')}
//           >
//             <Ionicons 
//               name="analytics" 
//               size={20} 
//               color={activeTab === 'analysis' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'analysis' && s.activeTabText]}>
//               Analysis
//             </Text>
//             {aiResults && activeTab !== 'analysis' && (
//               <View style={s.notificationDot} />
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'details' && s.activeTab]}
//             onPress={() => setActiveTab('details')}
//           >
//             <Ionicons 
//               name="document-text" 
//               size={20} 
//               color={activeTab === 'details' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'details' && s.activeTabText]}>
//               Details
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'location' && s.activeTab]}
//             onPress={() => setActiveTab('location')}
//           >
//             <Ionicons 
//               name="location" 
//               size={20} 
//               color={activeTab === 'location' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'location' && s.activeTabText]}>
//               Location
//             </Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Tab Content */}
//       <ScrollView 
//         style={s.tabContentContainer} 
//         contentContainerStyle={s.tabContentContainerContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {renderTabContent()}

//         {/* Submit Button */}
//         {(audioUri || videoUri) && (
//           <TouchableOpacity
//             onPress={saveRecording}
//             style={[s.submitBtn, (!noiseLevel || isSubmitting) && s.submitBtnDisabled]}
//             disabled={!noiseLevel || isSubmitting}
//           >
//             <LinearGradient
//               colors={['#8B4513', '#654321']}
//               style={s.submitGradient}
//             >
//               {isSubmitting ? (
//                 <>
//                   <ActivityIndicator size="small" color="#D4AC0D" />
//                   <Text style={s.submitText}>Submitting...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                   <Text style={s.submitText}>Submit Report</Text>
//                   {aiResults && (
//                     <View style={s.aiBadge}>
//                       <Ionicons name="sparkles" size={16} color="#D4AC0D" />
//                     </View>
//                   )}
//                 </>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>
//         )}
//       </ScrollView>

//       {/* Drawer Modal */}
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
//     </KeyboardAvoidingView>
//   );
// }

// const s = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f5f5f5' },
  
//   // Header
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
//   analyzingBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//     alignSelf: 'flex-start',
//     marginTop: 8,
//     gap: 8,
//   },
//   analyzingText: { color: '#D4AC0D', fontSize: 12, fontWeight: '600' },

//   // Action Buttons
//   actionButtonsContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 15,
//     paddingVertical: 15,
//     gap: 10,
//   },
//   actionButton: {
//     flex: 1,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   actionGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     paddingVertical: 15,
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   recordingButton: {
//     transform: [{ scale: 1.05 }],
//   },

//   // Media Section
//   mediaSection: {
//     marginHorizontal: 15,
//     marginBottom: 15,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 12,
//   },
//   sectionHeaderTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   sectionHeaderTitleSmall: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#8B4513',
//   },
//   videoContainer: {
//     position: 'relative',
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   video: {
//     width: '100%',
//     height: 200,
//     backgroundColor: '#000',
//   },
//   deleteMediaBtn: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//     backgroundColor: 'rgba(255,255,255,0.9)',
//     borderRadius: 20,
//     padding: 2,
//   },
//   audioPlayerContainer: {
//     gap: 15,
//   },
//   progressContainer: { marginBottom: 5 },
//   progressBar: { 
//     height: 6, 
//     backgroundColor: '#e0e0e0', 
//     borderRadius: 3, 
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   progressFill: { 
//     height: '100%', 
//     backgroundColor: '#D4AC0D', 
//     borderRadius: 3 
//   },
//   timeLabels: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between' 
//   },
//   timeText: { 
//     fontSize: 12, 
//     color: '#666',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   audioControls: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 25,
//   },
//   controlBtn: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   playBtn: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: '#D4AC0D',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 4,
//   },

//   // Tabs
//   tabsContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     marginHorizontal: 15,
//     marginBottom: 15,
//     borderRadius: 15,
//     padding: 5,
//     elevation: 2,
//   },
//   tab: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 12,
//     borderRadius: 12,
//     position: 'relative',
//   },
//   activeTab: {
//     backgroundColor: '#f5f5f5',
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#999',
//     fontWeight: '500',
//   },
//   activeTabText: {
//     color: '#8B4513',
//     fontWeight: '600',
//   },
//   notificationDot: {
//     position: 'absolute',
//     top: 8,
//     right: '30%',
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#D4AC0D',
//   },

//   // Tab Content
//   tabContentContainer: {
//     flex: 1,
//   },
//   tabContentContainerContent: {
//     paddingHorizontal: 15,
//     paddingBottom: 30,
//   },
//   tabContent: {
//     gap: 15,
//   },

//   // Noise Level Card
//   noiseLevelCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     elevation: 3,
//   },
//   noiseLevelHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   noiseLevelIconContainer: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   noiseLevelInfo: {
//     flex: 1,
//   },
//   noiseLevelLabel: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   noiseLevelDesc: {
//     fontSize: 13,
//     color: '#666',
//   },
//   noiseLevelEmoji: {
//     fontSize: 32,
//   },
//   noiseLevelMetrics: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 15,
//   },
//   metricItem: {
//     alignItems: 'center',
//   },
//   metricValue: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   metricLabel: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 4,
//   },
//   noiseLevelBadge: {
//     alignItems: 'center',
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   noiseLevelBadgeText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },

//   // Detections Container
//   detectionsContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   detectionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//   },
//   detectionRank: {
//     marginRight: 12,
//   },
//   rankBadge: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   rankText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   detectionContent: {
//     flex: 1,
//   },
//   detectionClass: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 6,
//   },
//   confidenceBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   confidenceBarBg: {
//     flex: 1,
//     height: 6,
//     backgroundColor: '#f0f0f0',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   confidenceBarFill: {
//     height: '100%',
//     borderRadius: 3,
//   },
//   confidenceText: {
//     fontSize: 12,
//     color: '#666',
//     fontWeight: '500',
//     width: 45,
//   },

//   // Distance Card
//   distanceCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   distanceContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 15,
//   },
//   distanceIconLarge: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   distanceIconEmoji: {
//     fontSize: 30,
//   },
//   distanceDetails: {
//     flex: 1,
//   },
//   distanceCategory: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginBottom: 4,
//   },
//   distanceValue: {
//     fontSize: 14,
//     color: '#333',
//     marginBottom: 4,
//   },
//   distanceRef: {
//     fontSize: 12,
//     color: '#999',
//     fontStyle: 'italic',
//   },

//   // Empty Analysis
//   emptyAnalysis: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginTop: 15,
//     marginBottom: 8,
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#999',
//     textAlign: 'center',
//   },

//   // Details Card
//   detailsCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   detailsInput: {
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     borderRadius: 12,
//     padding: 12,
//     fontSize: 14,
//     backgroundColor: '#f8f9fa',
//     minHeight: 100,
//   },
//   charCount: {
//     textAlign: 'right',
//     fontSize: 12,
//     color: '#999',
//     marginTop: 8,
//   },

//   // Location Card
//   locationCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   addLocationBtn: {
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginTop: 5,
//   },
//   addLocationGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   addLocationText: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   locationInfoCard: {
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     padding: 15,
//     marginTop: 5,
//   },
//   locationHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   locationBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
//   locationBadgeText: {
//     fontSize: 13,
//     color: '#4CAF50',
//     fontWeight: '600',
//   },
//   removeLocationBtn: {
//     padding: 4,
//   },
//   locationDetails: {
//     marginBottom: 12,
//   },
//   locationAddress: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 4,
//   },
//   locationCity: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 12,
//   },
//   coordinatesContainer: {
//     flexDirection: 'row',
//     marginBottom: 4,
//   },
//   coordinatesLabel: {
//     fontSize: 12,
//     color: '#999',
//     width: 70,
//   },
//   coordinatesValue: {
//     fontSize: 12,
//     color: '#333',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   refreshLocationBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   refreshLocationText: {
//     fontSize: 13,
//     color: '#8B4513',
//     fontWeight: '500',
//   },
//   locationError: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFEBEE',
//     padding: 12,
//     borderRadius: 10,
//     marginTop: 10,
//     gap: 8,
//   },
//   locationErrorText: {
//     fontSize: 13,
//     color: '#E74C3C',
//     flex: 1,
//   },

//   // Submit Button
//   submitBtn: {
//     marginTop: 10,
//     marginBottom: 20,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//   },
//   submitGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   submitText: {
//     color: '#D4AC0D',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   submitBtnDisabled: {
//     opacity: 0.5,
//   },
//   aiBadge: {
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     padding: 4,
//     borderRadius: 12,
//   },

//   // Recording Indicator
//   recordingContainer: { 
//     alignItems: 'center', 
//     paddingVertical: 20,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     marginHorizontal: 15,
//     marginBottom: 15,
//     elevation: 2,
//   },
//   waveformContainer: { 
//     alignItems: 'center', 
//     marginBottom: 20 
//   },
//   dbReading: { 
//     fontSize: 32, 
//     fontWeight: 'bold', 
//     marginBottom: 15 
//   },
//   waveform: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     gap: 8, 
//     height: 80 
//   },
//   waveBar: { 
//     width: 8, 
//     borderRadius: 4, 
//     backgroundColor: '#D4AC0D' 
//   },
//   timerContainer: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     gap: 10, 
//     marginBottom: 20 
//   },
//   timerText: { 
//     fontSize: 48, 
//     fontWeight: 'bold', 
//     color: '#8B4513' 
//   },
//   recordingDot: { 
//     width: 16, 
//     height: 16, 
//     borderRadius: 8, 
//     backgroundColor: '#E74C3C', 
//     justifyContent: 'center', 
//     alignItems: 'center' 
//   },
//   pulsingDot: { 
//     width: 8, 
//     height: 8, 
//     borderRadius: 4, 
//     backgroundColor: '#fff' 
//   },
//   recordButton: { 
//     width: 100, 
//     height: 100, 
//     borderRadius: 50, 
//     justifyContent: 'center', 
//     alignItems: 'center', 
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//   },
//   recordStatus: { 
//     marginTop: 15, 
//     fontSize: 14, 
//     color: '#666', 
//     textAlign: 'center' 
//   },

//   // Modal
//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
// });




// ---------------------------------------------------------------latest working code -----------------------------------------------


// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//   Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
// import * as Location from 'expo-location';
// import * as FileSystem from 'expo-file-system/legacy';
// import { FFmpegKit } from 'ffmpeg-kit-react-native';
// import axios from 'axios';
// import API_BASE_URL from '../../utils/api';
// import CustomDrawer from '../CustomDrawer';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// // =============================
// // FFmpeg Conversion Helper
// // =============================
// const convertToWav = async (uri) => {
//   if (!uri) return null;
  
//   const isWav = uri.toLowerCase().endsWith('.wav');
//   if (isWav) {
//     console.log('✅ Already WAV format:', uri);
//     return uri;
//   }
  
//   try {
//     const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
//     const filename = `converted_${Date.now()}.wav`;
//     const outputUri = `${FileSystem.cacheDirectory}${filename}`;
    
//     console.log('🔄 Converting audio to WAV format...');
//     const command = `-i "${cleanUri}" -ar 16000 -ac 1 "${outputUri}"`;
//     const session = await FFmpegKit.execute(command);
//     const returnCode = await session.getReturnCode();
    
//     if (returnCode.isValueSuccess()) {
//       const fileInfo = await FileSystem.getInfoAsync(outputUri);
//       if (fileInfo.exists && fileInfo.size > 0) {
//         console.log(`✅ Conversion successful: ${fileInfo.size} bytes`);
//         return outputUri;
//       }
//     }
    
//     console.error('❌ Conversion failed, using original');
//     return uri;
    
//   } catch (err) {
//     console.error('❌ FFmpeg conversion error:', err.message);
//     return uri;
//   }
// };

// export default function AudioRecordingScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [recordingDuration, setRecordingDuration] = useState(0);
//   const [playbackPosition, setPlaybackPosition] = useState(0);
//   const [totalDuration, setTotalDuration] = useState(0);
//   const [currentDb, setCurrentDb] = useState(35);
//   const [recording, setRecording] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [audioUri, setAudioUri] = useState(null);
//   const [comment, setComment] = useState('');
//   const [videoUri, setVideoUri] = useState(null);
//   const [attachmentType, setAttachmentType] = useState(null);
//   const [location, setLocation] = useState(null);
//   const [locationLoading, setLocationLoading] = useState(false);
//   const [locationError, setLocationError] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [noiseLevel, setNoiseLevel] = useState('');
//   const [aiResults, setAiResults] = useState(null);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [activeTab, setActiveTab] = useState('analysis');
//   const [selectedFileName, setSelectedFileName] = useState(null);

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const waveAnim1 = useRef(new Animated.Value(0.5)).current;
//   const waveAnim2 = useRef(new Animated.Value(0.8)).current;
//   const waveAnim3 = useRef(new Animated.Value(0.3)).current;
//   const recordingInterval = useRef(null);
//   const videoRef = useRef(null);

//   const noiseLevels = [
//     { value: 'green', label: 'Low', icon: 'checkmark-circle', color: '#4CAF50', bgColor: '#E8F5E9', description: 'Mild disturbance', emoji: '😌' },
//     { value: 'yellow', label: 'Medium', icon: 'warning', color: '#FFC107', bgColor: '#FFF9C4', description: 'Moderate noise', emoji: '😐' },
//     { value: 'red', label: 'High', icon: 'alert-circle', color: '#F44336', bgColor: '#FFEBEE', description: 'Severe disturbance', emoji: '😠' }
//   ];

//   const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';

//   // Supported audio formats
//   const supportedAudioFormats = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.3gp'];
//   const supportedVideoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.3gp'];

//   useEffect(() => {
//     (async () => {
//       await Audio.requestPermissionsAsync();
//       await ImagePicker.requestCameraPermissionsAsync();
//       await DocumentPicker.getDocumentAsync(); // This will request document permissions
//       await Audio.setAudioModeAsync({
//         allowsRecordingIOS: true, 
//         playsInSilentModeIOS: true, 
//         staysActiveInBackground: false,
//         shouldDuckAndroid: true, 
//         playThroughEarpieceAndroid: false,
//       });
//     })();
//     return () => {
//       recording?.stopAndUnloadAsync();
//       if (sound) {
//         sound.unloadAsync();
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (isRecording) {
//       Animated.loop(Animated.sequence([
//         Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
//         Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
//       ])).start();
//       Animated.loop(Animated.stagger(200, [
//         Animated.timing(waveAnim1, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         Animated.timing(waveAnim2, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//         Animated.timing(waveAnim3, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
//       ])).start();
//     } else {
//       pulseAnim.setValue(1);
//     }
//   }, [isRecording]);

//   // =============================
//   // AUTO-ASSIGN NOISE LEVEL BASED ON DECIBEL AND DISTANCE
//   // =============================
//   const determineNoiseLevel = (decibel, distance) => {
//     if (!decibel) return null;
    
//     let adjustedDecibel = decibel;
    
//     if (distance && distance.meters) {
//       if (distance.meters > 10) {
//         adjustedDecibel = decibel * 0.7;
//       } else if (distance.meters > 5) {
//         adjustedDecibel = decibel * 0.85;
//       } else if (distance.meters < 1) {
//         adjustedDecibel = decibel * 1.2;
//       }
//     }
    
//     if (adjustedDecibel < 50) {
//       return 'green';
//     } else if (adjustedDecibel < 70) {
//       return 'yellow';
//     } else {
//       return 'red';
//     }
//   };

//   const getNoiseLevelFromAI = (aiData) => {
//     if (!aiData) return null;
    
//     if (aiData.noise_level && aiData.noise_level.value) {
//       return aiData.noise_level.value;
//     }
    
//     return determineNoiseLevel(aiData.decibel, aiData.distance);
//   };

//   useEffect(() => {
//     if (aiResults) {
//       const newNoiseLevel = getNoiseLevelFromAI(aiResults);
//       if (newNoiseLevel) {
//         setNoiseLevel(newNoiseLevel);
//         console.log(`🎯 Auto-assigned noise level: ${newNoiseLevel}`);
//       }
//     }
//   }, [aiResults]);

//   const startRecording = async () => {
//     try {
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
//       setRecording(newRecording);
//       setIsRecording(true);
//       setRecordingDuration(0);
//       setAttachmentType('audio');
//       setAiResults(null);
//       setNoiseLevel('');
//       setSelectedFileName(null);
//       recordingInterval.current = setInterval(() => {
//         setRecordingDuration(p => p + 1);
//         setCurrentDb(Math.floor(Math.random() * 45 + 40));
//       }, 1000);
//     } catch (err) {
//       Alert.alert('Error', 'Failed to start recording.');
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await recording.stopAndUnloadAsync();
//       const uri = recording.getURI();
//       setAudioUri(uri);
//       setIsRecording(false);
//       setRecording(null);
//       clearInterval(recordingInterval.current);
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri });
//       const status = await newSound.getStatusAsync();
//       setTotalDuration(Math.floor(status.durationMillis / 1000));
//       setSound(newSound);
//       setSelectedFileName('New Recording');
      
//       if (uri) {
//         setTimeout(() => {
//           analyzeWithYAMNet(uri);
//         }, 500);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // =============================
//   // NEW: Pick audio from device storage
//   // =============================
//   const pickAudioFile = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['audio/*'], // Accept all audio types
//         copyToCacheDirectory: true,
//         multiple: false,
//       });

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const asset = result.assets[0];
//         const fileUri = asset.uri;
//         const fileName = asset.name;
        
//         console.log('📁 Selected audio file:', fileName);
        
//         // Clear any existing video/audio
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setVideoUri(null);
        
//         // Load the audio
//         setAudioUri(fileUri);
//         setAttachmentType('audio');
//         setSelectedFileName(fileName);
//         setAiResults(null);
//         setNoiseLevel('');
        
//         // Get duration
//         try {
//           const { sound: newSound } = await Audio.Sound.createAsync({ uri: fileUri });
//           const status = await newSound.getStatusAsync();
//           setTotalDuration(Math.floor(status.durationMillis / 1000));
//           setSound(newSound);
//         } catch (error) {
//           console.error('Error loading audio:', error);
//         }
        
//         // Analyze
//         setTimeout(() => {
//           analyzeWithYAMNet(fileUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error picking audio file:', error);
//       Alert.alert('Error', 'Failed to pick audio file');
//     }
//   };

//   // =============================
//   // NEW: Pick video from device storage
//   // =============================
//   const pickVideoFile = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['video/*'], // Accept all video types
//         copyToCacheDirectory: true,
//         multiple: false,
//       });

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const asset = result.assets[0];
//         const fileUri = asset.uri;
//         const fileName = asset.name;
        
//         console.log('📁 Selected video file:', fileName);
        
//         // Clear any existing audio
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setAudioUri(null);
        
//         setVideoUri(fileUri);
//         setAttachmentType('video');
//         setSelectedFileName(fileName);
//         setAiResults(null);
//         setNoiseLevel('');
        
//         // Analyze
//         setTimeout(() => {
//           analyzeWithYAMNet(fileUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error picking video file:', error);
//       Alert.alert('Error', 'Failed to pick video file');
//     }
//   };

//   // =============================
//   // MODIFIED: Enhanced pickVideo to include file picker option
//   // =============================
//   const showMediaOptions = () => {
//     Alert.alert('Add Media', 'Choose source', [
//       {
//         text: 'Record Audio',
//         onPress: startRecording,
//       },
//       {
//         text: 'Choose Audio from Files',
//         onPress: pickAudioFile,
//       },
//       {
//         text: 'Record Video',
//         onPress: () => pickVideo('camera'),
//       },
//       {
//         text: 'Choose Video from Files',
//         onPress: () => pickVideo('library'),
//       },
//       {
//         text: 'Choose Video from Storage',
//         onPress: pickVideoFile,
//       },
//       { text: 'Cancel', style: 'cancel' },
//     ]);
//   };

//   const pickVideo = (source) => {
//     if (source === 'camera') {
//       Alert.alert('Record Video', 'Choose an option', [
//         {
//           text: 'Record Now',
//           onPress: async () => {
//             const result = await ImagePicker.launchCameraAsync({
//               mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//               allowsEditing: true,
//               aspect: [16, 9],
//               quality: 1,
//               videoMaxDuration: 60
//             });
//             if (!result.canceled && result.assets[0]) {
//               const videoUri = result.assets[0].uri;
              
//               setAttachmentType('video');
//               setVideoUri(videoUri);
//               setSelectedFileName('Recorded Video');
//               if (sound) {
//                 await sound.unloadAsync();
//                 setSound(null);
//               }
//               setAudioUri(null);
//               setAiResults(null);
//               setNoiseLevel('');
              
//               setTimeout(() => {
//                 analyzeWithYAMNet(videoUri);
//               }, 100);
//             }
//           }
//         },
//         { text: 'Cancel', style: 'cancel' },
//       ]);
//     } else {
//       Alert.alert('Choose Video', 'Select source', [
//         {
//           text: 'From Gallery',
//           onPress: async () => {
//             const result = await ImagePicker.launchImageLibraryAsync({
//               mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//               allowsEditing: true,
//               aspect: [16, 9],
//               quality: 1
//             });
//             if (!result.canceled && result.assets[0]) {
//               const videoUri = result.assets[0].uri;
              
//               setAttachmentType('video');
//               setVideoUri(videoUri);
//               setSelectedFileName('Gallery Video');
//               if (sound) {
//                 await sound.unloadAsync();
//                 setSound(null);
//               }
//               setAudioUri(null);
//               setAiResults(null);
//               setNoiseLevel('');
              
//               setTimeout(() => {
//                 analyzeWithYAMNet(videoUri);
//               }, 100);
//             }
//           }
//         },
//         {
//           text: 'From Files',
//           onPress: pickVideoFile,
//         },
//         { text: 'Cancel', style: 'cancel' },
//       ]);
//     }
//   };

//   const analyzeWithYAMNet = async (mediaUri) => {
//     if (!mediaUri) {
//       Alert.alert('No Media', 'Please select audio or video first');
//       return;
//     }

//     let mediaType = attachmentType;
//     if (!mediaType) {
//       const ext = mediaUri.split('.').pop().toLowerCase();
//       if (supportedVideoFormats.includes(`.${ext}`)) {
//         mediaType = 'video';
//       } else {
//         mediaType = 'audio';
//       }
//     }

//     setIsAnalyzing(true);
//     setAiResults(null);

//     try {
//       const fileInfo = await FileSystem.getInfoAsync(mediaUri);
//       if (!fileInfo.exists) {
//         throw new Error('File not found');
//       }
      
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
//           'Content-Type': 'multipart/form-data',
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//         body: formData,
//         signal: controller.signal,
//       });
      
//       clearTimeout(timeoutId);
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.success) {
//         setAiResults(data);
//       } else {
//         Alert.alert('Analysis Failed', data.error || 'Unknown error');
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
//     } finally {
//       setIsAnalyzing(false);
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
//           message += `Classes: ${responseData.flask_ai.classes}`;
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

//   const deleteVideo = () => {
//     Alert.alert('Delete Video', 'Remove this video?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => { 
//           setVideoUri(null); 
//           setAttachmentType(null); 
//           setAiResults(null);
//           setNoiseLevel('');
//           setSelectedFileName(null);
//         }
//       },
//     ]);
//   };

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
//       setLocation({ 
//         latitude: currentLocation.coords.latitude, 
//         longitude: currentLocation.coords.longitude, 
//         address: address[0] || null, 
//         timestamp: new Date().toISOString() 
//       });
//       setLocationLoading(false);
//       Alert.alert('✅ Location Added', `${address[0]?.street || ''} ${address[0]?.city || ''}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
//     } catch (error) {
//       setLocationError('Failed to get location');
//       setLocationLoading(false);
//       Alert.alert('Error', 'Failed to get location.');
//     }
//   };

//   const playPauseRecording = async () => {
//     if (!sound) return;
//     try {
//       if (isPlaying) {
//         await sound.pauseAsync();
//         setIsPlaying(false);
//       } else {
//         if (playbackPosition >= totalDuration) {
//           await sound.setPositionAsync(0);
//           setPlaybackPosition(0);
//         }
//         await sound.playAsync();
//         setIsPlaying(true);
//         sound.setOnPlaybackStatusUpdate((status) => {
//           if (status.isLoaded) {
//             setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//             if (status.didJustFinish) { 
//               setIsPlaying(false); 
//               setPlaybackPosition(0); 
//             }
//           }
//         });
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const restartRecording = async () => {
//     if (!sound) return;
//     try {
//       await sound.setPositionAsync(0);
//       setPlaybackPosition(0);
//       await sound.playAsync();
//       setIsPlaying(true);
//       sound.setOnPlaybackStatusUpdate((status) => {
//         if (status.isLoaded) {
//           setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//           if (status.didJustFinish) { 
//             setIsPlaying(false); 
//             setPlaybackPosition(0); 
//           }
//         }
//       });
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const deleteRecording = () => {
//     Alert.alert('Delete Recording', 'Delete this recording?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => {
//           if (sound) {
//             sound.unloadAsync();
//           }
//           setSound(null);
//           setAudioUri(null);
//           setTotalDuration(0);
//           setPlaybackPosition(0);
//           setIsPlaying(false);
//           setAttachmentType(null);
//           setAiResults(null);
//           setNoiseLevel('');
//           setSelectedFileName(null);
//         }
//       },
//     ]);
//   };

//   // =============================
//   // SAVE COMPLETE REPORT WITH ALL DATA
//   // =============================
//   const saveRecording = async () => {
//     if (!audioUri && !videoUri) {
//       Alert.alert('No Content', 'Please record audio or attach a video first.');
//       return;
//     }
//     if (!noiseLevel) {
//       Alert.alert('Noise Level Required', 'Please wait for AI analysis to complete.');
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

//       const formData = new FormData();
      
//       formData.append('userId', userId);
      
//       const mediaUri = videoUri || audioUri;
//       const mediaType = videoUri ? 'video' : 'audio';
//       const fileExtension = mediaUri.split('.').pop();
//       const fileName = selectedFileName || `noise_report_${Date.now()}.${fileExtension}`;
      
//       formData.append('media', {
//         uri: mediaUri,
//         type: videoUri ? `video/${fileExtension}` : `audio/${fileExtension}`,
//         name: fileName,
//       });

//       formData.append('mediaType', mediaType);
//       formData.append('noiseLevel', noiseLevel);
//       formData.append('originalFileName', selectedFileName || '');
      
//       // ===== SAVE COMPLETE AI ANALYSIS DATA =====
//       if (aiResults) {
//         // Save the complete AI analysis object
//         formData.append('ai_analysis', JSON.stringify(aiResults));
        
//         // Save individual AI analysis components for easy querying
//         formData.append('ai_decibel', aiResults.decibel?.toString() || '0');
//         formData.append('ai_noise_level', aiResults.noise_level?.level || '');
//         formData.append('ai_noise_value', aiResults.noise_level?.value || '');
//         formData.append('ai_noise_description', aiResults.noise_level?.description || '');
        
//         // Save all detections
//         if (aiResults.detections && aiResults.detections.length > 0) {
//           formData.append('ai_detections', JSON.stringify(aiResults.detections));
          
//           // Save top 3 detections as separate fields
//           aiResults.detections.slice(0, 3).forEach((detection, index) => {
//             formData.append(`ai_detection_${index + 1}_class`, detection.class);
//             formData.append(`ai_detection_${index + 1}_confidence`, detection.confidence?.toString() || '0');
//           });
//         }
        
//         // Save distance estimation data
//         if (aiResults.distance) {
//           formData.append('ai_distance_meters', aiResults.distance.meters?.toString() || '0');
//           formData.append('ai_distance_category', aiResults.distance.category || '');
//           formData.append('ai_distance_description', aiResults.distance.description || '');
//           formData.append('ai_distance_icon', aiResults.distance.icon || '');
//           formData.append('ai_distance_reference_sound', aiResults.distance.reference_sound || '');
//           formData.append('ai_distance_reference_db', aiResults.distance.reference_db?.toString() || '0');
//         }
        
//         // Save audio metadata
//         formData.append('ai_total_duration', totalDuration?.toString() || '0');
//         formData.append('ai_recording_duration', recordingDuration?.toString() || '0');
//       }
      
//       if (comment) {
//         formData.append('comment', comment);
//       }
      
//       if (location) {
//         formData.append('location', JSON.stringify({
//           latitude: location.latitude,
//           longitude: location.longitude,
//           address: location.address,
//           timestamp: location.timestamp,
//         }));
        
//         // Save individual location fields
//         formData.append('location_latitude', location.latitude?.toString() || '');
//         formData.append('location_longitude', location.longitude?.toString() || '');
//         formData.append('location_address_street', location.address?.street || '');
//         formData.append('location_address_city', location.address?.city || '');
//         formData.append('location_address_region', location.address?.region || '');
//         formData.append('location_address_country', location.address?.country || '');
//         formData.append('location_address_postalCode', location.address?.postalCode || '');
//         formData.append('location_timestamp', location.timestamp || '');
//       }
      
//       // Save metadata about the report
//       formData.append('app_version', Constants.expoConfig?.version || '1.0.0');
//       formData.append('platform', Platform.OS);
//       formData.append('platform_version', Platform.Version?.toString() || '');
//       formData.append('timestamp', new Date().toISOString());

//       console.log('📤 Submitting complete report with all data...');
      
//       const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 60000,
//       });

//       setIsSubmitting(false);

//       // Build comprehensive success message with all saved data
//       const attachmentInfo = videoUri 
//         ? `Video: ${selectedFileName || videoUri.split('/').pop()}`
//         : `Audio: ${selectedFileName || formatTime(totalDuration)}`;

//       const locationInfo = location 
//         ? `\n📍 Location: ${location.address?.street || ''} ${location.address?.city || ''}\n   Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
//         : '\n📍 Location: Not provided';

//       const noiseLevelInfo = noiseLevels.find(nl => nl.value === noiseLevel);
//       const noiseLevelText = `\n🔊 Noise Level: ${noiseLevelInfo?.label} (${noiseLevelInfo?.description})`;
      
//       let aiInfo = '';
//       if (aiResults) {
//         aiInfo = '\n🤖 AI Analysis:';
//         aiInfo += `\n   • Decibel: ${aiResults.decibel} dB`;
//         if (aiResults.distance) {
//           aiInfo += `\n   • Distance: ~${aiResults.distance.meters}m (${aiResults.distance.category})`;
//         }
//         if (aiResults.detections && aiResults.detections.length > 0) {
//           aiInfo += '\n   • Top Detections:';
//           aiResults.detections.slice(0, 3).forEach((d, i) => {
//             aiInfo += `\n     ${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`;
//           });
//         }
//       }

//       const reportDetails = `✅ Noise Report Submitted Successfully!\n\n` +
//         `📋 Report ID: ${response.data.reportId || 'N/A'}\n` +
//         `${comment ? `📄 Details: ${comment}\n` : ''}` +
//         `${noiseLevelText}` +
//         `${aiInfo}` +
//         `\n📎 ${attachmentInfo}` +
//         `${locationInfo}` +
//         `\n⏱️ Submitted: ${new Date().toLocaleString()}`;

//       Alert.alert('✅ Report Submitted', reportDetails, [
//         { 
//           text: 'OK', 
//           onPress: () => {
//             // Reset all state after successful submission
//             setComment('');
//             setNoiseLevel('');
//             setSelectedFileName(null);
//             if (sound) {
//               sound.unloadAsync();
//             }
//             setSound(null);
//             setAudioUri(null);
//             setVideoUri(null);
//             setAttachmentType(null);
//             setLocation(null);
//             setLocationError(null);
//             setTotalDuration(0);
//             setPlaybackPosition(0);
//             setAiResults(null);
//             setActiveTab('analysis');
//           }
//         }
//       ]);

//     } catch (error) {
//       setIsSubmitting(false);
//       console.error('Error submitting report:', error);
      
//       let errorMessage = 'Failed to submit noise report. Please try again.';
      
//       if (error.response) {
//         errorMessage = error.response.data?.message || errorMessage;
//         console.error('Server response:', error.response.data);
//       } else if (error.request) {
//         errorMessage = 'Network error. Please check your internet connection.';
//       }
      
//       Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
//     }
//   };

//   const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
//   const getDbColor = (db) => db < 50 ? '#8B7355' : db < 70 ? '#D4AC0D' : db < 85 ? '#E67E22' : '#E74C3C';

//   const openDrawer = () => {
//     setDrawerVisible(true);
//     Animated.parallel([
//       Animated.timing(slideAnim, { 
//         toValue: 0, 
//         duration: 350, 
//         easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), 
//         useNativeDriver: true 
//       }),
//       Animated.timing(overlayOpacity, { 
//         toValue: 1, 
//         duration: 350, 
//         easing: Easing.out(Easing.quad), 
//         useNativeDriver: true 
//       }),
//     ]).start();
//   };

//   const closeDrawer = () => {
//     Animated.parallel([
//       Animated.timing(slideAnim, { 
//         toValue: -width * 0.8, 
//         duration: 300, 
//         easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), 
//         useNativeDriver: true 
//       }),
//       Animated.timing(overlayOpacity, { 
//         toValue: 0, 
//         duration: 250, 
//         easing: Easing.in(Easing.quad), 
//         useNativeDriver: true 
//       }),
//     ]).start(() => setDrawerVisible(false));
//   };

//   const showConnectionInfo = () => {
//     const manifest = Constants.expoConfig;
//     const isTunnel = manifest?.extra?.useTunnel;
    
//     Alert.alert(
//       'Connection Info',
//       `AI Service URL: ${AI_SERVICE_URL}\nExpo Tunnel: ${isTunnel ? 'Yes' : 'No'}\nPlatform: ${Platform.OS}`,
//       [{ text: 'OK' }]
//     );
//   };

//   // Render noise level card
//   const renderNoiseLevelCard = () => {
//     if (!noiseLevel || !aiResults) return null;
    
//     const level = noiseLevels.find(l => l.value === noiseLevel);
//     if (!level) return null;
    
//     return (
//       <LinearGradient
//         colors={[level.bgColor, '#fff']}
//         style={s.noiseLevelCard}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//       >
//         <View style={s.noiseLevelHeader}>
//           <View style={[s.noiseLevelIconContainer, { backgroundColor: level.color }]}>
//             <Ionicons name={level.icon} size={32} color="#fff" />
//           </View>
//           <View style={s.noiseLevelInfo}>
//             <Text style={s.noiseLevelLabel}>{level.label} Noise Level</Text>
//             <Text style={s.noiseLevelDesc}>{level.description}</Text>
//           </View>
//           <Text style={s.noiseLevelEmoji}>{level.emoji}</Text>
//         </View>
        
//         <View style={s.noiseLevelMetrics}>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{aiResults.decibel} dB</Text>
//             <Text style={s.metricLabel}>Volume</Text>
//           </View>
//           {aiResults.distance && (
//             <View style={s.metricItem}>
//               <Text style={s.metricValue}>~{aiResults.distance.meters}m</Text>
//               <Text style={s.metricLabel}>Distance</Text>
//             </View>
//           )}
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{aiResults.detections?.length || 0}</Text>
//             <Text style={s.metricLabel}>Sounds</Text>
//           </View>
//         </View>
        
//         <View style={s.noiseLevelBadge}>
//           <Text style={[s.noiseLevelBadgeText, { color: level.color }]}>
//             Automatically Detected
//           </Text>
//         </View>
//       </LinearGradient>
//     );
//   };

//   // Render media section with filename display
//   const renderMediaSection = () => {
//     if (videoUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.sectionHeader}>
//             <Ionicons name="videocam" size={24} color="#8B4513" />
//             <Text style={s.sectionHeaderTitle}>Video Attachment</Text>
//           </View>
//           {selectedFileName && (
//             <Text style={s.fileNameText} numberOfLines={1}>📁 {selectedFileName}</Text>
//           )}
//           <View style={s.videoContainer}>
//             <Video 
//               ref={videoRef} 
//               source={{ uri: videoUri }} 
//               style={s.video} 
//               useNativeControls 
//               resizeMode="contain" 
//               isLooping 
//             />
//             <TouchableOpacity style={s.deleteMediaBtn} onPress={deleteVideo}>
//               <Ionicons name="close-circle" size={32} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
//         </View>
//       );
//     }

//     if (audioUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.sectionHeader}>
//             <Ionicons name="musical-notes" size={24} color="#8B4513" />
//             <Text style={s.sectionHeaderTitle}>Audio Recording</Text>
//           </View>
//           {selectedFileName && (
//             <Text style={s.fileNameText} numberOfLines={1}>📁 {selectedFileName}</Text>
//           )}
//           <View style={s.audioPlayerContainer}>
//             <View style={s.progressContainer}>
//               <View style={s.progressBar}>
//                 <View style={[
//                   s.progressFill, 
//                   { width: `${totalDuration > 0 ? (playbackPosition / totalDuration) * 100 : 0}%` }
//                 ]} />
//               </View>
//               <View style={s.timeLabels}>
//                 <Text style={s.timeText}>{formatTime(playbackPosition)}</Text>
//                 <Text style={s.timeText}>{formatTime(totalDuration)}</Text>
//               </View>
//             </View>
//             <View style={s.audioControls}>
//               <TouchableOpacity onPress={restartRecording} style={s.controlBtn}>
//                 <Ionicons name="play-skip-back" size={24} color="#8B4513" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={playPauseRecording} style={s.playBtn}>
//                 <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={deleteRecording} style={s.controlBtn}>
//                 <Ionicons name="trash" size={24} color="#E74C3C" />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       );
//     }

//     return null;
//   };

//   // Render tab content
//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'analysis':
//         return (
//           <View style={s.tabContent}>
//             {aiResults ? (
//               <>
//                 {renderNoiseLevelCard()}
                
//                 <View style={s.detectionsContainer}>
//                   <View style={s.sectionHeader}>
//                     <Ionicons name="list" size={20} color="#8B4513" />
//                     <Text style={s.sectionHeaderTitleSmall}>Top Detected Sounds</Text>
//                   </View>
//                   {aiResults.detections?.slice(0, 5).map((detection, index) => {
//                     const confidencePercent = (detection.confidence * 100).toFixed(1);
//                     return (
//                       <View
//                         key={index}
//                         style={s.detectionItem}
//                       >
//                         <View style={s.detectionRank}>
//                           <LinearGradient
//                             colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
//                             style={s.rankBadge}
//                           >
//                             <Text style={s.rankText}>#{index + 1}</Text>
//                           </LinearGradient>
//                         </View>
//                         <View style={s.detectionContent}>
//                           <Text style={s.detectionClass}>{detection.class}</Text>
//                           <View style={s.confidenceBar}>
//                             <View style={s.confidenceBarBg}>
//                               <LinearGradient
//                                 colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
//                                 style={[s.confidenceBarFill, { width: `${confidencePercent}%` }]}
//                               />
//                             </View>
//                             <Text style={s.confidenceText}>{confidencePercent}%</Text>
//                           </View>
//                         </View>
//                       </View>
//                     );
//                   })}
//                 </View>

//                 {aiResults.distance && (
//                   <View style={s.distanceCard}>
//                     <View style={s.sectionHeader}>
//                       <Ionicons name="navigate" size={20} color="#8B4513" />
//                       <Text style={s.sectionHeaderTitleSmall}>Distance Estimation</Text>
//                     </View>
//                     <View style={s.distanceContent}>
//                       <View style={s.distanceIconLarge}>
//                         <Text style={s.distanceIconEmoji}>{aiResults.distance.icon}</Text>
//                       </View>
//                       <View style={s.distanceDetails}>
//                         <Text style={s.distanceCategory}>{aiResults.distance.category}</Text>
//                         <Text style={s.distanceValue}>~{aiResults.distance.meters} meters away</Text>
//                         <Text style={s.distanceRef}>
//                           Based on {aiResults.distance.reference_sound}
//                         </Text>
//                       </View>
//                     </View>
//                   </View>
//                 )}
//               </>
//             ) : (
//               <View style={s.emptyAnalysis}>
//                 <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
//                 <Text style={s.emptyTitle}>No Analysis Yet</Text>
//                 <Text style={s.emptyText}>Record audio or attach media to analyze</Text>
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
//                 <Text style={s.sectionHeaderTitleSmall}>Additional Details</Text>
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
//                 <Text style={s.sectionHeaderTitleSmall}>Location</Text>
//               </View>
              
//               {!location ? (
//                 <TouchableOpacity 
//                   style={s.addLocationBtn} 
//                   onPress={getUserLocation} 
//                   disabled={locationLoading}
//                 >
//                   <LinearGradient
//                     colors={['#8B4513', '#654321']}
//                     style={s.addLocationGradient}
//                   >
//                     <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#D4AC0D" />
//                     <Text style={s.addLocationText}>
//                       {locationLoading ? 'Getting Location...' : 'Add Current Location'}
//                     </Text>
//                   </LinearGradient>
//                 </TouchableOpacity>
//               ) : (
//                 <View style={s.locationInfoCard}>
//                   <View style={s.locationHeader}>
//                     <View style={s.locationBadge}>
//                       <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
//                       <Text style={s.locationBadgeText}>Location Added</Text>
//                     </View>
//                     <TouchableOpacity onPress={() => setLocation(null)} style={s.removeLocationBtn}>
//                       <Ionicons name="close" size={20} color="#E74C3C" />
//                     </TouchableOpacity>
//                   </View>
                  
//                   <View style={s.locationDetails}>
//                     <Text style={s.locationAddress}>
//                       {location.address?.street || 'Unknown Street'}
//                     </Text>
//                     <Text style={s.locationCity}>
//                       {location.address?.city || 'Unknown City'}, {location.address?.region || ''}
//                     </Text>
//                     <View style={s.coordinatesContainer}>
//                       <Text style={s.coordinatesLabel}>Latitude:</Text>
//                       <Text style={s.coordinatesValue}>{location.latitude.toFixed(6)}</Text>
//                     </View>
//                     <View style={s.coordinatesContainer}>
//                       <Text style={s.coordinatesLabel}>Longitude:</Text>
//                       <Text style={s.coordinatesValue}>{location.longitude.toFixed(6)}</Text>
//                     </View>
//                   </View>
                  
//                   <TouchableOpacity style={s.refreshLocationBtn} onPress={getUserLocation}>
//                     <Ionicons name="refresh" size={18} color="#8B4513" />
//                     <Text style={s.refreshLocationText}>Refresh Location</Text>
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
//     <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       {/* Header */}
//       <LinearGradient colors={['#8B4513', '#654321']} style={s.header}>
//         <View style={s.headerContent}>
//           <View style={s.headerTop}>
//             <TouchableOpacity onPress={openDrawer} style={s.headerButton}>
//               <Ionicons name="menu" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}>
//               <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
//             </TouchableOpacity>
//           </View>
//           <Text style={s.headerTitle}>Noise Report</Text>
//           <Text style={s.headerSubtitle}>
//             {isRecording ? 'Recording in progress...' : 
//              videoUri ? 'Video attached' : 
//              audioUri ? 'Audio ready' : 
//              'Record or select media'}
//           </Text>
//           {isAnalyzing && (
//             <View style={s.analyzingBadge}>
//               <ActivityIndicator size="small" color="#D4AC0D" />
//               <Text style={s.analyzingText}>AI Analyzing...</Text>
//             </View>
//           )}
//         </View>
//       </LinearGradient>

//       {/* Media Action Buttons */}
//       <View style={s.actionButtonsContainer}>
//         <TouchableOpacity
//           style={[s.actionButton, s.audioButton, isRecording && s.recordingButton]}
//           onPress={isRecording ? stopRecording : showMediaOptions}
//           activeOpacity={0.8}
//         >
//           <LinearGradient
//             colors={isRecording ? ['#E74C3C', '#C0392B'] : ['#2196F3', '#1976D2']}
//             style={s.actionGradient}
//           >
//             <Ionicons 
//               name={isRecording ? "stop" : "mic"} 
//               size={28} 
//               color="#fff" 
//             />
//             <Text style={s.actionButtonText}>
//               {isRecording ? 'Stop' : 'Add Audio'}
//             </Text>
//           </LinearGradient>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[s.actionButton, s.videoButton]}
//           onPress={() => pickVideo('options')}
//           disabled={isRecording}
//         >
//           <LinearGradient
//             colors={['#E91E63', '#C2185B']}
//             style={s.actionGradient}
//           >
//             <Ionicons name="videocam" size={28} color="#fff" />
//             <Text style={s.actionButtonText}>Add Video</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       </View>

//       {/* Media Preview */}
//       {renderMediaSection()}

//       {/* Tabs */}
//       {(audioUri || videoUri) && (
//         <View style={s.tabsContainer}>
//           <TouchableOpacity
//             style={[s.tab, activeTab === 'analysis' && s.activeTab]}
//             onPress={() => setActiveTab('analysis')}
//           >
//             <Ionicons 
//               name="analytics" 
//               size={20} 
//               color={activeTab === 'analysis' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'analysis' && s.activeTabText]}>
//               Analysis
//             </Text>
//             {aiResults && activeTab !== 'analysis' && (
//               <View style={s.notificationDot} />
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'details' && s.activeTab]}
//             onPress={() => setActiveTab('details')}
//           >
//             <Ionicons 
//               name="document-text" 
//               size={20} 
//               color={activeTab === 'details' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'details' && s.activeTabText]}>
//               Details
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'location' && s.activeTab]}
//             onPress={() => setActiveTab('location')}
//           >
//             <Ionicons 
//               name="location" 
//               size={20} 
//               color={activeTab === 'location' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'location' && s.activeTabText]}>
//               Location
//             </Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Tab Content */}
//       <ScrollView 
//         style={s.tabContentContainer} 
//         contentContainerStyle={s.tabContentContainerContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {renderTabContent()}

//         {/* Submit Button */}
//         {(audioUri || videoUri) && (
//           <TouchableOpacity
//             onPress={saveRecording}
//             style={[s.submitBtn, (!noiseLevel || isSubmitting) && s.submitBtnDisabled]}
//             disabled={!noiseLevel || isSubmitting}
//           >
//             <LinearGradient
//               colors={['#8B4513', '#654321']}
//               style={s.submitGradient}
//             >
//               {isSubmitting ? (
//                 <>
//                   <ActivityIndicator size="small" color="#D4AC0D" />
//                   <Text style={s.submitText}>Submitting...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                   <Text style={s.submitText}>Submit Report</Text>
//                   {aiResults && (
//                     <View style={s.aiBadge}>
//                       <Ionicons name="sparkles" size={16} color="#D4AC0D" />
//                     </View>
//                   )}
//                 </>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>
//         )}
//       </ScrollView>

//       {/* Drawer Modal */}
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
//     </KeyboardAvoidingView>
//   );
// }

// const s = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f5f5f5' },
  
//   // Header
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
//   analyzingBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//     alignSelf: 'flex-start',
//     marginTop: 8,
//     gap: 8,
//   },
//   analyzingText: { color: '#D4AC0D', fontSize: 12, fontWeight: '600' },
//   fileNameText: {
//     fontSize: 12,
//     color: '#666',
//     marginBottom: 8,
//     paddingHorizontal: 4,
//     fontStyle: 'italic',
//   },

//   // Action Buttons
//   actionButtonsContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 15,
//     paddingVertical: 15,
//     gap: 10,
//   },
//   actionButton: {
//     flex: 1,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   actionGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     paddingVertical: 15,
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   recordingButton: {
//     transform: [{ scale: 1.05 }],
//   },

//   // Media Section
//   mediaSection: {
//     marginHorizontal: 15,
//     marginBottom: 15,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 12,
//   },
//   sectionHeaderTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   sectionHeaderTitleSmall: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#8B4513',
//   },
//   videoContainer: {
//     position: 'relative',
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   video: {
//     width: '100%',
//     height: 200,
//     backgroundColor: '#000',
//   },
//   deleteMediaBtn: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//     backgroundColor: 'rgba(255,255,255,0.9)',
//     borderRadius: 20,
//     padding: 2,
//   },
//   audioPlayerContainer: {
//     gap: 15,
//   },
//   progressContainer: { marginBottom: 5 },
//   progressBar: { 
//     height: 6, 
//     backgroundColor: '#e0e0e0', 
//     borderRadius: 3, 
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   progressFill: { 
//     height: '100%', 
//     backgroundColor: '#D4AC0D', 
//     borderRadius: 3 
//   },
//   timeLabels: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between' 
//   },
//   timeText: { 
//     fontSize: 12, 
//     color: '#666',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   audioControls: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 25,
//   },
//   controlBtn: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   playBtn: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: '#D4AC0D',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 4,
//   },

//   // Tabs
//   tabsContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     marginHorizontal: 15,
//     marginBottom: 15,
//     borderRadius: 15,
//     padding: 5,
//     elevation: 2,
//   },
//   tab: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 12,
//     borderRadius: 12,
//     position: 'relative',
//   },
//   activeTab: {
//     backgroundColor: '#f5f5f5',
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#999',
//     fontWeight: '500',
//   },
//   activeTabText: {
//     color: '#8B4513',
//     fontWeight: '600',
//   },
//   notificationDot: {
//     position: 'absolute',
//     top: 8,
//     right: '30%',
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#D4AC0D',
//   },

//   // Tab Content
//   tabContentContainer: {
//     flex: 1,
//   },
//   tabContentContainerContent: {
//     paddingHorizontal: 15,
//     paddingBottom: 30,
//   },
//   tabContent: {
//     gap: 15,
//   },

//   // Noise Level Card
//   noiseLevelCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     elevation: 3,
//   },
//   noiseLevelHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   noiseLevelIconContainer: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   noiseLevelInfo: {
//     flex: 1,
//   },
//   noiseLevelLabel: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   noiseLevelDesc: {
//     fontSize: 13,
//     color: '#666',
//   },
//   noiseLevelEmoji: {
//     fontSize: 32,
//   },
//   noiseLevelMetrics: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 15,
//   },
//   metricItem: {
//     alignItems: 'center',
//   },
//   metricValue: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   metricLabel: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 4,
//   },
//   noiseLevelBadge: {
//     alignItems: 'center',
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   noiseLevelBadgeText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },

//   // Detections Container
//   detectionsContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   detectionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//   },
//   detectionRank: {
//     marginRight: 12,
//   },
//   rankBadge: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   rankText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   detectionContent: {
//     flex: 1,
//   },
//   detectionClass: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 6,
//   },
//   confidenceBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   confidenceBarBg: {
//     flex: 1,
//     height: 6,
//     backgroundColor: '#f0f0f0',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   confidenceBarFill: {
//     height: '100%',
//     borderRadius: 3,
//   },
//   confidenceText: {
//     fontSize: 12,
//     color: '#666',
//     fontWeight: '500',
//     width: 45,
//   },

//   // Distance Card
//   distanceCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   distanceContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 15,
//   },
//   distanceIconLarge: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   distanceIconEmoji: {
//     fontSize: 30,
//   },
//   distanceDetails: {
//     flex: 1,
//   },
//   distanceCategory: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginBottom: 4,
//   },
//   distanceValue: {
//     fontSize: 14,
//     color: '#333',
//     marginBottom: 4,
//   },
//   distanceRef: {
//     fontSize: 12,
//     color: '#999',
//     fontStyle: 'italic',
//   },

//   // Empty Analysis
//   emptyAnalysis: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginTop: 15,
//     marginBottom: 8,
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#999',
//     textAlign: 'center',
//   },

//   // Details Card
//   detailsCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   detailsInput: {
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     borderRadius: 12,
//     padding: 12,
//     fontSize: 14,
//     backgroundColor: '#f8f9fa',
//     minHeight: 100,
//   },
//   charCount: {
//     textAlign: 'right',
//     fontSize: 12,
//     color: '#999',
//     marginTop: 8,
//   },

//   // Location Card
//   locationCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   addLocationBtn: {
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginTop: 5,
//   },
//   addLocationGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   addLocationText: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   locationInfoCard: {
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     padding: 15,
//     marginTop: 5,
//   },
//   locationHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   locationBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
//   locationBadgeText: {
//     fontSize: 13,
//     color: '#4CAF50',
//     fontWeight: '600',
//   },
//   removeLocationBtn: {
//     padding: 4,
//   },
//   locationDetails: {
//     marginBottom: 12,
//   },
//   locationAddress: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 4,
//   },
//   locationCity: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 12,
//   },
//   coordinatesContainer: {
//     flexDirection: 'row',
//     marginBottom: 4,
//   },
//   coordinatesLabel: {
//     fontSize: 12,
//     color: '#999',
//     width: 70,
//   },
//   coordinatesValue: {
//     fontSize: 12,
//     color: '#333',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   refreshLocationBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   refreshLocationText: {
//     fontSize: 13,
//     color: '#8B4513',
//     fontWeight: '500',
//   },
//   locationError: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFEBEE',
//     padding: 12,
//     borderRadius: 10,
//     marginTop: 10,
//     gap: 8,
//   },
//   locationErrorText: {
//     fontSize: 13,
//     color: '#E74C3C',
//     flex: 1,
//   },

//   // Submit Button
//   submitBtn: {
//     marginTop: 10,
//     marginBottom: 20,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//   },
//   submitGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   submitText: {
//     color: '#D4AC0D',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   submitBtnDisabled: {
//     opacity: 0.5,
//   },
//   aiBadge: {
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     padding: 4,
//     borderRadius: 12,
//   },

//   // Recording Indicator
//   recordingContainer: { 
//     alignItems: 'center', 
//     paddingVertical: 20,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     marginHorizontal: 15,
//     marginBottom: 15,
//     elevation: 2,
//   },
//   waveformContainer: { 
//     alignItems: 'center', 
//     marginBottom: 20 
//   },
//   dbReading: { 
//     fontSize: 32, 
//     fontWeight: 'bold', 
//     marginBottom: 15 
//   },
//   waveform: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     gap: 8, 
//     height: 80 
//   },
//   waveBar: { 
//     width: 8, 
//     borderRadius: 4, 
//     backgroundColor: '#D4AC0D' 
//   },
//   timerContainer: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     gap: 10, 
//     marginBottom: 20 
//   },
//   timerText: { 
//     fontSize: 48, 
//     fontWeight: 'bold', 
//     color: '#8B4513' 
//   },
//   recordingDot: { 
//     width: 16, 
//     height: 16, 
//     borderRadius: 8, 
//     backgroundColor: '#E74C3C', 
//     justifyContent: 'center', 
//     alignItems: 'center' 
//   },
//   pulsingDot: { 
//     width: 8, 
//     height: 8, 
//     borderRadius: 4, 
//     backgroundColor: '#fff' 
//   },
//   recordButton: { 
//     width: 100, 
//     height: 100, 
//     borderRadius: 50, 
//     justifyContent: 'center', 
//     alignItems: 'center', 
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.3,
//     shadowRadius: 5,
//   },
//   recordStatus: { 
//     marginTop: 15, 
//     fontSize: 14, 
//     color: '#666', 
//     textAlign: 'center' 
//   },

//   // Modal
//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
// });

// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//   Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator,
//   Share, SafeAreaView
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
// import * as Location from 'expo-location';
// import * as FileSystem from 'expo-file-system/legacy';
// import { FFmpegKit } from 'ffmpeg-kit-react-native';
// import axios from 'axios';
// import API_BASE_URL from '../../utils/api';
// import CustomDrawer from '../CustomDrawer';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';

// const { width, height } = Dimensions.get('window');
// const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

// // =============================
// // FFmpeg Conversion Helper
// // =============================
// const convertToWav = async (uri) => {
//   if (!uri) return null;
  
//   const isWav = uri.toLowerCase().endsWith('.wav');
//   if (isWav) {
//     console.log('✅ Already WAV format:', uri);
//     return uri;
//   }
  
//   try {
//     const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
//     const filename = `converted_${Date.now()}.wav`;
//     const outputUri = `${FileSystem.cacheDirectory}${filename}`;
    
//     console.log('🔄 Converting audio to WAV format...');
//     const command = `-i "${cleanUri}" -ar 16000 -ac 1 "${outputUri}"`;
//     const session = await FFmpegKit.execute(command);
//     const returnCode = await session.getReturnCode();
    
//     if (returnCode.isValueSuccess()) {
//       const fileInfo = await FileSystem.getInfoAsync(outputUri);
//       if (fileInfo.exists && fileInfo.size > 0) {
//         console.log(`✅ Conversion successful: ${fileInfo.size} bytes`);
//         return outputUri;
//       }
//     }
    
//     console.error('❌ Conversion failed, using original');
//     return uri;
    
//   } catch (err) {
//     console.error('❌ FFmpeg conversion error:', err.message);
//     return uri;
//   }
// };

// export default function AudioRecordingScreen({ navigation }) {
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [recordingDuration, setRecordingDuration] = useState(0);
//   const [playbackPosition, setPlaybackPosition] = useState(0);
//   const [totalDuration, setTotalDuration] = useState(0);
//   const [currentDb, setCurrentDb] = useState(35);
//   const [recording, setRecording] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [audioUri, setAudioUri] = useState(null);
//   const [comment, setComment] = useState('');
//   const [videoUri, setVideoUri] = useState(null);
//   const [attachmentType, setAttachmentType] = useState(null);
//   const [location, setLocation] = useState(null);
//   const [locationLoading, setLocationLoading] = useState(false);
//   const [locationError, setLocationError] = useState(null);
//   const [manualLocation, setManualLocation] = useState('');
//   const [useManualLocation, setUseManualLocation] = useState(false);
//   const [mediaSource, setMediaSource] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [noiseLevel, setNoiseLevel] = useState('');
//   const [aiResults, setAiResults] = useState(null);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [activeTab, setActiveTab] = useState('analysis');
//   const [selectedFileName, setSelectedFileName] = useState(null);
//   const [disturbanceAlert, setDisturbanceAlert] = useState(null);
//   const [isMediaModalVisible, setIsMediaModalVisible] = useState(false); // Renamed from showMediaModal

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const recordingInterval = useRef(null);
//   const videoRef = useRef(null);

//   const noiseLevels = [
//     { value: 'green', label: 'Low', icon: 'checkmark-circle', color: '#4CAF50', bgColor: '#E8F5E9', description: 'Mild disturbance', emoji: '😌' },
//     { value: 'yellow', label: 'Medium', icon: 'warning', color: '#FFC107', bgColor: '#FFF9C4', description: 'Moderate noise', emoji: '😐' },
//     { value: 'red', label: 'High', icon: 'alert-circle', color: '#F44336', bgColor: '#FFEBEE', description: 'Severe disturbance', emoji: '😠' }
//   ];

//   const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';

//   const supportedAudioFormats = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.3gp'];
//   const supportedVideoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.3gp'];

//   useEffect(() => {
//     (async () => {
//       await Audio.requestPermissionsAsync();
//       await ImagePicker.requestCameraPermissionsAsync();
//       await DocumentPicker.getDocumentAsync();
//       await Audio.setAudioModeAsync({
//         allowsRecordingIOS: true, 
//         playsInSilentModeIOS: true, 
//         staysActiveInBackground: false,
//         shouldDuckAndroid: true, 
//         playThroughEarpieceAndroid: false,
//       });
//     })();
//     return () => {
//       recording?.stopAndUnloadAsync();
//       if (sound) {
//         sound.unloadAsync();
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

//   const getNoiseLevelFromAI = (aiData) => {
//     if (!aiData) return null;
//     if (aiData.noise_level && aiData.noise_level.value) {
//       return aiData.noise_level.value;
//     }
//     return null;
//   };

//   useEffect(() => {
//     if (aiResults) {
//       const newNoiseLevel = getNoiseLevelFromAI(aiResults);
//       if (newNoiseLevel) {
//         setNoiseLevel(newNoiseLevel);
//         console.log(`🎯 Auto-assigned noise level: ${newNoiseLevel}`);
//       }
      
//       if (aiResults.disturbance_assessment?.is_reportable) {
//         setDisturbanceAlert(aiResults.disturbance_assessment);
        
//         if (aiResults.disturbance_assessment.severity_name === 'SEVERE') {
//           showDisturbanceAlert(aiResults.disturbance_assessment);
//         }
//       } else {
//         setDisturbanceAlert(null);
//       }
//     }
//   }, [aiResults]);

//   const showDisturbanceAlert = (disturbance) => {
//     Alert.alert(
//       disturbance.severity_name === 'SEVERE' ? '🚨 URGENT: Noise Violation Detected!' : '⚠️ Reportable Noise Detected',
//       `${disturbance.recommendation}\n\nReasons:\n${disturbance.reasons?.map(r => `• ${r}`).join('\n')}\n\nNormalized SPL: ${disturbance.normalized_spl_db} dB at 10m`,
//       [
//         { text: 'View Details', onPress: () => setActiveTab('analysis') },
//         { text: 'Dismiss', style: 'cancel' }
//       ]
//     );
//   };

//   const shareAnalysisReport = async () => {
//     if (!aiResults) return;
    
//     const disturbance = aiResults.disturbance_assessment;
//     const reportText = `
// 🎤 Noise Analysis Report
// ========================
// ${disturbance?.is_reportable ? '⚠️ REPORTABLE NOISE DETECTED' : '✅ No Reportable Noise'}

// 📊 Sound: ${aiResults.urban_classification?.primary_sound || 'Unknown'}
// 🔊 Volume: ${aiResults.decibel} dB
// 📏 Normalized SPL: ${disturbance?.normalized_spl_db || 'N/A'} dB at 10m
// 📍 Distance: ${aiResults.distance?.meters || '?'}m (${aiResults.distance?.category || 'Unknown'})
// ⏱️ Duration: ${aiResults.duration_seconds || 0}s
// 📹 Source: ${mediaSource === 'live' ? 'Live Recording' : 'Downloaded File'}

// ${disturbance?.is_reportable ? `
// 🚨 VIOLATION DETAILS:
// Severity: ${disturbance.severity_name}
// Reasons: ${disturbance.reasons?.join(', ') || 'N/A'}
// Action: ${disturbance.recommendation}
// ` : ''}

// 🎧 Top Detections:
// ${aiResults.detections?.slice(0, 3).map((d, i) => `${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`).join('\n')}

// Generated by NoiseWatch AI
// ${new Date().toLocaleString()}
//     `;
    
//     try {
//       await Share.share({
//         message: reportText,
//         title: 'Noise Analysis Report'
//       });
//     } catch (error) {
//       console.error('Share failed:', error);
//     }
//   };

//   // ==================== AUDIO FUNCTIONS ====================
//   const startRecording = async () => {
//     try {
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
//       setRecording(newRecording);
//       setIsRecording(true);
//       setRecordingDuration(0);
//       setAttachmentType('audio');
//       setMediaSource('live');
//       setAiResults(null);
//       setNoiseLevel('');
//       setDisturbanceAlert(null);
//       setSelectedFileName(null);
//       setIsMediaModalVisible(false);
//       recordingInterval.current = setInterval(() => {
//         setRecordingDuration(p => p + 1);
//         setCurrentDb(Math.floor(Math.random() * 45 + 40));
//       }, 1000);
//     } catch (err) {
//       Alert.alert('Error', 'Failed to start recording.');
//     }
//   };

//   const stopRecording = async () => {
//     try {
//       await recording.stopAndUnloadAsync();
//       const uri = recording.getURI();
//       setAudioUri(uri);
//       setIsRecording(false);
//       setRecording(null);
//       clearInterval(recordingInterval.current);
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri });
//       const status = await newSound.getStatusAsync();
//       setTotalDuration(Math.floor(status.durationMillis / 1000));
//       setSound(newSound);
//       setSelectedFileName('New Recording');
      
//       if (uri) {
//         setTimeout(() => {
//           analyzeWithYAMNet(uri);
//         }, 500);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const pickAudioFile = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['audio/*'],
//         copyToCacheDirectory: true,
//         multiple: false,
//       });

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const asset = result.assets[0];
//         const fileUri = asset.uri;
//         const fileName = asset.name;
        
//         console.log('📁 Selected audio file:', fileName);
        
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setVideoUri(null);
//         setAudioUri(fileUri);
//         setAttachmentType('audio');
//         setMediaSource('downloaded');
//         setSelectedFileName(fileName);
//         setAiResults(null);
//         setNoiseLevel('');
//         setDisturbanceAlert(null);
//         setIsMediaModalVisible(false);
        
//         try {
//           const { sound: newSound } = await Audio.Sound.createAsync({ uri: fileUri });
//           const status = await newSound.getStatusAsync();
//           setTotalDuration(Math.floor(status.durationMillis / 1000));
//           setSound(newSound);
//         } catch (error) {
//           console.error('Error loading audio:', error);
//         }
        
//         setTimeout(() => {
//           analyzeWithYAMNet(fileUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error picking audio file:', error);
//       Alert.alert('Error', 'Failed to pick audio file');
//     }
//   };

//   // ==================== VIDEO FUNCTIONS ====================
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
        
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setAudioUri(null);
//         setVideoUri(videoUri);
//         setAttachmentType('video');
//         setMediaSource('live');
//         setSelectedFileName('Recorded Video');
//         setAiResults(null);
//         setNoiseLevel('');
//         setDisturbanceAlert(null);
//         setIsMediaModalVisible(false);
        
//         setTimeout(() => {
//           analyzeWithYAMNet(videoUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error recording video:', error);
//       Alert.alert('Error', 'Failed to record video');
//     }
//   };

//   const pickVideoFromGallery = async () => {
//     try {
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//         allowsEditing: true,
//         aspect: [16, 9],
//         quality: 1,
//       });
      
//       if (!result.canceled && result.assets && result.assets[0]) {
//         const videoUri = result.assets[0].uri;
//         const fileName = result.assets[0].fileName || `video_${Date.now()}.mp4`;
        
//         console.log('📁 Selected video from gallery:', fileName);
        
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setAudioUri(null);
//         setVideoUri(videoUri);
//         setAttachmentType('video');
//         setMediaSource('downloaded');
//         setSelectedFileName(fileName);
//         setAiResults(null);
//         setNoiseLevel('');
//         setDisturbanceAlert(null);
//         setIsMediaModalVisible(false);
        
//         setTimeout(() => {
//           analyzeWithYAMNet(videoUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error picking video from gallery:', error);
//       Alert.alert('Error', 'Failed to pick video from gallery');
//     }
//   };

//   const pickVideoFile = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['video/*'],
//         copyToCacheDirectory: true,
//         multiple: false,
//       });

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const asset = result.assets[0];
//         const fileUri = asset.uri;
//         const fileName = asset.name;
        
//         console.log('📁 Selected video file:', fileName);
        
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setAudioUri(null);
//         setVideoUri(fileUri);
//         setAttachmentType('video');
//         setMediaSource('downloaded');
//         setSelectedFileName(fileName);
//         setAiResults(null);
//         setNoiseLevel('');
//         setDisturbanceAlert(null);
//         setIsMediaModalVisible(false);
        
//         setTimeout(() => {
//           analyzeWithYAMNet(fileUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error picking video file:', error);
//       Alert.alert('Error', 'Failed to pick video file');
//     }
//   };

//   const openMediaModal = () => {
//     setIsMediaModalVisible(true);
//   };

//   const closeMediaModal = () => {
//     setIsMediaModalVisible(false);
//   };

//   const analyzeWithYAMNet = async (mediaUri) => {
//     if (!mediaUri) {
//       Alert.alert('No Media', 'Please select audio or video first');
//       return;
//     }

//     let mediaType = attachmentType;
//     if (!mediaType) {
//       const ext = mediaUri.split('.').pop().toLowerCase();
//       if (supportedVideoFormats.includes(`.${ext}`)) {
//         mediaType = 'video';
//       } else {
//         mediaType = 'audio';
//       }
//     }

//     setIsAnalyzing(true);
//     setAiResults(null);

//     try {
//       const fileInfo = await FileSystem.getInfoAsync(mediaUri);
//       if (!fileInfo.exists) {
//         throw new Error('File not found');
//       }
      
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
//           'Content-Type': 'multipart/form-data',
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//         body: formData,
//         signal: controller.signal,
//       });
      
//       clearTimeout(timeoutId);
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.success) {
//         setAiResults(data);
//       } else {
//         Alert.alert('Analysis Failed', data.error || 'Unknown error');
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
//     } finally {
//       setIsAnalyzing(false);
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
//           message += `Classes: ${responseData.flask_ai.yamnet_classes}\n`;
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

//   const deleteMedia = () => {
//     Alert.alert('Delete Media', 'Remove this media?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => { 
//           if (videoUri) {
//             setVideoUri(null);
//           }
//           if (audioUri) {
//             setAudioUri(null);
//           }
//           if (sound) {
//             sound.unloadAsync();
//             setSound(null);
//           }
//           setAttachmentType(null); 
//           setAiResults(null);
//           setNoiseLevel('');
//           setDisturbanceAlert(null);
//           setSelectedFileName(null);
//           setMediaSource(null);
//         }
//       },
//     ]);
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
//       setLocation({ 
//         latitude: currentLocation.coords.latitude, 
//         longitude: currentLocation.coords.longitude, 
//         address: address[0] || null, 
//         timestamp: new Date().toISOString() 
//       });
//       setLocationLoading(false);
//       Alert.alert('✅ Location Added', `${address[0]?.street || ''} ${address[0]?.city || ''}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
//     } catch (error) {
//       setLocationError('Failed to get location');
//       setLocationLoading(false);
//       Alert.alert('Error', 'Failed to get location.');
//     }
//   };

//   const addManualLocation = () => {
//     Alert.alert(
//       'Add Location Manually',
//       'Enter the location address',
//       [
//         {
//           text: 'Cancel',
//           style: 'cancel',
//         },
//         {
//           text: 'Add',
//           onPress: () => {
//             if (manualLocation.trim()) {
//               setLocation({
//                 address: { street: manualLocation, city: '', region: '', country: '' },
//                 latitude: null,
//                 longitude: null,
//                 timestamp: new Date().toISOString(),
//                 isManual: true
//               });
//               setUseManualLocation(false);
//               setManualLocation('');
//               Alert.alert('✅ Location Added', manualLocation);
//             } else {
//               Alert.alert('Error', 'Please enter a location');
//             }
//           },
//         },
//       ],
//       'plain-text'
//     );
//   };

//   // ==================== AUDIO PLAYBACK FUNCTIONS ====================
//   const playPauseRecording = async () => {
//     if (!sound) return;
//     try {
//       if (isPlaying) {
//         await sound.pauseAsync();
//         setIsPlaying(false);
//       } else {
//         if (playbackPosition >= totalDuration) {
//           await sound.setPositionAsync(0);
//           setPlaybackPosition(0);
//         }
//         await sound.playAsync();
//         setIsPlaying(true);
//         sound.setOnPlaybackStatusUpdate((status) => {
//           if (status.isLoaded) {
//             setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//             if (status.didJustFinish) { 
//               setIsPlaying(false); 
//               setPlaybackPosition(0); 
//             }
//           }
//         });
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const restartRecording = async () => {
//     if (!sound) return;
//     try {
//       await sound.setPositionAsync(0);
//       setPlaybackPosition(0);
//       await sound.playAsync();
//       setIsPlaying(true);
//       sound.setOnPlaybackStatusUpdate((status) => {
//         if (status.isLoaded) {
//           setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//           if (status.didJustFinish) { 
//             setIsPlaying(false); 
//             setPlaybackPosition(0); 
//           }
//         }
//       });
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const deleteRecording = () => {
//     Alert.alert('Delete Recording', 'Delete this recording?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => {
//           if (sound) {
//             sound.unloadAsync();
//           }
//           setSound(null);
//           setAudioUri(null);
//           setTotalDuration(0);
//           setPlaybackPosition(0);
//           setIsPlaying(false);
//           setAttachmentType(null);
//           setAiResults(null);
//           setNoiseLevel('');
//           setDisturbanceAlert(null);
//           setSelectedFileName(null);
//           setMediaSource(null);
//         }
//       },
//     ]);
//   };

//   // ==================== SUBMIT FUNCTIONS ====================
//   const saveRecording = async () => {
//     if (!audioUri && !videoUri) {
//       Alert.alert('No Content', 'Please record audio or attach a video first.');
//       return;
//     }
//     if (!noiseLevel) {
//       Alert.alert('Noise Level Required', 'Please wait for AI analysis to complete.');
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

//       const formData = new FormData();
      
//       formData.append('userId', userId);
      
//       const mediaUri = videoUri || audioUri;
//       const mediaType = videoUri ? 'video' : 'audio';
//       const fileExtension = mediaUri.split('.').pop();
//       const fileName = selectedFileName || `noise_report_${Date.now()}.${fileExtension}`;
      
//       formData.append('media', {
//         uri: mediaUri,
//         type: videoUri ? `video/${fileExtension}` : `audio/${fileExtension}`,
//         name: fileName,
//       });

//       formData.append('mediaType', mediaType);
//       formData.append('noiseLevel', noiseLevel);
//       formData.append('originalFileName', selectedFileName || '');
//       formData.append('mediaSource', mediaSource || (videoUri || audioUri ? 'downloaded' : 'live'));
      
//       if (aiResults) {
//         formData.append('ai_analysis', JSON.stringify(aiResults));
//         formData.append('ai_decibel', aiResults.decibel?.toString() || '0');
//         formData.append('ai_noise_level', aiResults.noise_level?.level || '');
//         formData.append('ai_noise_value', aiResults.noise_level?.value || '');
//         formData.append('ai_noise_description', aiResults.noise_level?.description || '');
        
//         if (aiResults.disturbance_assessment) {
//           const da = aiResults.disturbance_assessment;
//           formData.append('ai_is_reportable', da.is_reportable?.toString() || 'false');
//           formData.append('ai_severity', da.severity_name || '');
//           formData.append('ai_disturbance_score', da.disturbance_score?.toString() || '0');
//           formData.append('ai_normalized_spl', da.normalized_spl_db?.toString() || '0');
//           formData.append('ai_recommendation', da.recommendation || '');
//           formData.append('ai_reasons', JSON.stringify(da.reasons || []));
//         }
        
//         if (aiResults.detections && aiResults.detections.length > 0) {
//           formData.append('ai_detections', JSON.stringify(aiResults.detections));
//           aiResults.detections.slice(0, 3).forEach((detection, index) => {
//             formData.append(`ai_detection_${index + 1}_class`, detection.class);
//             formData.append(`ai_detection_${index + 1}_confidence`, detection.confidence?.toString() || '0');
//           });
//         }
        
//         if (aiResults.distance) {
//           formData.append('ai_distance_meters', aiResults.distance.meters?.toString() || '0');
//           formData.append('ai_distance_category', aiResults.distance.category || '');
//           formData.append('ai_distance_description', aiResults.distance.description || '');
//           formData.append('ai_distance_icon', aiResults.distance.icon || '');
//           formData.append('ai_distance_reference_sound', aiResults.distance.reference_sound || '');
//           formData.append('ai_distance_reference_db', aiResults.distance.reference_db?.toString() || '0');
//         }
        
//         formData.append('ai_total_duration', totalDuration?.toString() || '0');
//         formData.append('ai_recording_duration', recordingDuration?.toString() || '0');
//       }
      
//       if (comment) {
//         formData.append('comment', comment);
//       }
      
//       if (location) {
//         formData.append('location', JSON.stringify({
//           latitude: location.latitude,
//           longitude: location.longitude,
//           address: location.address,
//           timestamp: location.timestamp,
//           isManual: location.isManual || false
//         }));
        
//         formData.append('location_latitude', location.latitude?.toString() || '');
//         formData.append('location_longitude', location.longitude?.toString() || '');
//         formData.append('location_address', location.address?.street || location.address || '');
//         formData.append('location_city', location.address?.city || '');
//         formData.append('location_is_manual', (location.isManual || false).toString());
//       }
      
//       formData.append('app_version', Constants.expoConfig?.version || '1.0.0');
//       formData.append('platform', Platform.OS);
//       formData.append('platform_version', Platform.Version?.toString() || '');
//       formData.append('timestamp', new Date().toISOString());

//       console.log('📤 Submitting complete report with all data...');
      
//       const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 60000,
//       });

//       setIsSubmitting(false);

//       const attachmentInfo = videoUri 
//         ? `Video: ${selectedFileName || videoUri.split('/').pop()}`
//         : `Audio: ${selectedFileName || formatTime(totalDuration)}`;

//       const sourceInfo = mediaSource === 'live' ? '\n📹 Source: Live Recording' : '\n📁 Source: Downloaded File';
      
//       const locationInfo = location 
//         ? `\n📍 Location: ${location.address?.street || location.address || 'Unknown'}${location.latitude ? `\n   Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : ''}${location.isManual ? '\n   (Manually entered)' : ''}`
//         : '\n📍 Location: Not provided';

//       const noiseLevelInfo = noiseLevels.find(nl => nl.value === noiseLevel);
//       const noiseLevelText = `\n🔊 Noise Level: ${noiseLevelInfo?.label} (${noiseLevelInfo?.description})`;
      
//       let disturbanceInfo = '';
//       if (aiResults?.disturbance_assessment?.is_reportable) {
//         const da = aiResults.disturbance_assessment;
//         disturbanceInfo = `\n\n🚨 REPORTABLE NOISE DETECTED!\nSeverity: ${da.severity_name}\nNormalized: ${da.normalized_spl_db} dB at 10m\n${da.recommendation}`;
//       }
      
//       let aiInfo = '';
//       if (aiResults) {
//         aiInfo = '\n🤖 AI Analysis:';
//         aiInfo += `\n   • Decibel: ${aiResults.decibel} dB`;
//         if (aiResults.distance) {
//           aiInfo += `\n   • Distance: ~${aiResults.distance.meters}m (${aiResults.distance.category})`;
//         }
//         if (aiResults.detections && aiResults.detections.length > 0) {
//           aiInfo += '\n   • Top Detections:';
//           aiResults.detections.slice(0, 3).forEach((d, i) => {
//             aiInfo += `\n     ${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`;
//           });
//         }
//       }

//       const reportDetails = `✅ Noise Report Submitted Successfully!\n\n` +
//         `📋 Report ID: ${response.data.reportId || 'N/A'}\n` +
//         `${comment ? `📄 Details: ${comment}\n` : ''}` +
//         `${noiseLevelText}` +
//         `${aiInfo}` +
//         `${disturbanceInfo}` +
//         `\n📎 ${attachmentInfo}` +
//         `${sourceInfo}` +
//         `${locationInfo}` +
//         `\n⏱️ Submitted: ${new Date().toLocaleString()}`;

//       Alert.alert('✅ Report Submitted', reportDetails, [
//         { 
//           text: 'OK', 
//           onPress: () => {
//             setComment('');
//             setNoiseLevel('');
//             setSelectedFileName(null);
//             if (sound) {
//               sound.unloadAsync();
//             }
//             setSound(null);
//             setAudioUri(null);
//             setVideoUri(null);
//             setAttachmentType(null);
//             setLocation(null);
//             setLocationError(null);
//             setManualLocation('');
//             setUseManualLocation(false);
//             setMediaSource(null);
//             setTotalDuration(0);
//             setPlaybackPosition(0);
//             setAiResults(null);
//             setDisturbanceAlert(null);
//             setActiveTab('analysis');
//           }
//         }
//       ]);

//     } catch (error) {
//       setIsSubmitting(false);
//       console.error('Error submitting report:', error);
      
//       let errorMessage = 'Failed to submit noise report. Please try again.';
      
//       if (error.response) {
//         errorMessage = error.response.data?.message || errorMessage;
//         console.error('Server response:', error.response.data);
//       } else if (error.request) {
//         errorMessage = 'Network error. Please check your internet connection.';
//       }
      
//       Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
//     }
//   };

//   const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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

//   // ==================== RENDER MEDIA SECTION ====================
//   const renderMediaSection = () => {
//     if (videoUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.mediaHeader}>
//             <View style={s.mediaIconContainer}>
//               <Ionicons name="videocam" size={24} color="#8B4513" />
//             </View>
//             <View style={s.mediaInfo}>
//               <Text style={s.mediaTitle}>Video Attachment</Text>
//               {selectedFileName && (
//                 <Text style={s.mediaFileName} numberOfLines={1}>{selectedFileName}</Text>
//               )}
//             </View>
//             <View style={[s.sourceBadge, mediaSource === 'live' ? s.liveBadge : s.downloadedBadge]}>
//               <Ionicons name={mediaSource === 'live' ? "mic" : "download"} size={12} color="#fff" />
//               <Text style={s.sourceBadgeText}>{mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//             </View>
//             <TouchableOpacity onPress={deleteMedia} style={s.deleteBtn}>
//               <Ionicons name="trash-outline" size={22} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
//           <View style={s.videoContainer}>
//             <Video 
//               ref={videoRef} 
//               source={{ uri: videoUri }} 
//               style={s.video} 
//               useNativeControls 
//               resizeMode="contain" 
//               isLooping 
//             />
//           </View>
//         </View>
//       );
//     }

//     if (audioUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.mediaHeader}>
//             <View style={s.mediaIconContainer}>
//               <Ionicons name="musical-notes" size={24} color="#8B4513" />
//             </View>
//             <View style={s.mediaInfo}>
//               <Text style={s.mediaTitle}>Audio Recording</Text>
//               {selectedFileName && (
//                 <Text style={s.mediaFileName} numberOfLines={1}>{selectedFileName}</Text>
//               )}
//             </View>
//             <View style={[s.sourceBadge, mediaSource === 'live' ? s.liveBadge : s.downloadedBadge]}>
//               <Ionicons name={mediaSource === 'live' ? "mic" : "download"} size={12} color="#fff" />
//               <Text style={s.sourceBadgeText}>{mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//             </View>
//             <TouchableOpacity onPress={deleteMedia} style={s.deleteBtn}>
//               <Ionicons name="trash-outline" size={22} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
//           <View style={s.audioPlayerContainer}>
//             <View style={s.progressContainer}>
//               <View style={s.progressBar}>
//                 <View style={[
//                   s.progressFill, 
//                   { width: `${totalDuration > 0 ? (playbackPosition / totalDuration) * 100 : 0}%` }
//                 ]} />
//               </View>
//               <View style={s.timeLabels}>
//                 <Text style={s.timeText}>{formatTime(playbackPosition)}</Text>
//                 <Text style={s.timeText}>{formatTime(totalDuration)}</Text>
//               </View>
//             </View>
//             <View style={s.audioControls}>
//               <TouchableOpacity onPress={restartRecording} style={s.controlBtn}>
//                 <Ionicons name="play-skip-back" size={24} color="#8B4513" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={playPauseRecording} style={s.playBtn}>
//                 <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={deleteRecording} style={s.controlBtn}>
//                 <Ionicons name="trash" size={24} color="#E74C3C" />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       );
//     }

//     return null;
//   };

//   // ==================== RENDER DISTURBANCE BANNER ====================
//   const renderDisturbanceBanner = () => {
//     if (!disturbanceAlert) return null;
    
//     const isSevere = disturbanceAlert.severity_name === 'SEVERE';
//     const colors = isSevere ? ['#E74C3C', '#C0392B'] : ['#E67E22', '#D35400'];
    
//     return (
//       <TouchableOpacity 
//         style={s.disturbanceBanner}
//         onPress={() => showDisturbanceAlert(disturbanceAlert)}
//         activeOpacity={0.9}
//       >
//         <LinearGradient
//           colors={colors}
//           style={s.disturbanceGradient}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 0 }}
//         >
//           <Ionicons name={isSevere ? "alert-circle" : "warning"} size={24} color="#fff" />
//           <View style={s.disturbanceContent}>
//             <Text style={s.disturbanceTitle}>
//               {isSevere ? 'URGENT: Noise Violation' : 'Reportable Noise Detected'}
//             </Text>
//             <Text style={s.disturbanceText} numberOfLines={1}>
//               {disturbanceAlert.recommendation}
//             </Text>
//           </View>
//           <Ionicons name="chevron-forward" size={20} color="#fff" />
//         </LinearGradient>
//       </TouchableOpacity>
//     );
//   };

//   // ==================== RENDER NOISE LEVEL CARD ====================
//   const renderNoiseLevelCard = () => {
//     if (!noiseLevel || !aiResults) return null;
    
//     const level = noiseLevels.find(l => l.value === noiseLevel);
//     if (!level) return null;
    
//     const disturbance = aiResults.disturbance_assessment;
//     const isReportable = disturbance?.is_reportable;
//     const severity = disturbance?.severity_name;
    
//     const cardColors = isReportable && severity === 'SEVERE' 
//       ? ['#FFEBEE', '#FFCDD2'] 
//       : [level.bgColor, '#fff'];
    
//     return (
//       <LinearGradient
//         colors={cardColors}
//         style={s.noiseLevelCard}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//       >
//         <View style={s.noiseLevelHeader}>
//           <View style={[s.noiseLevelIconContainer, { backgroundColor: isReportable && severity === 'SEVERE' ? '#E74C3C' : level.color }]}>
//             <Ionicons name={isReportable && severity === 'SEVERE' ? "alert" : level.icon} size={32} color="#fff" />
//           </View>
//           <View style={s.noiseLevelInfo}>
//             <Text style={s.noiseLevelLabel}>
//               {isReportable ? `${severity} Noise Violation` : `${level.label} Noise Level`}
//             </Text>
//             <Text style={s.noiseLevelDesc}>
//               {isReportable ? disturbance?.recommendation?.substring(0, 50) : level.description}
//             </Text>
//           </View>
//           <Text style={s.noiseLevelEmoji}>
//             {isReportable ? (severity === 'SEVERE' ? '🚨' : '⚠️') : level.emoji}
//           </Text>
//         </View>
        
//         <View style={s.noiseLevelMetrics}>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{aiResults.decibel} dB</Text>
//             <Text style={s.metricLabel}>Measured</Text>
//           </View>
//           {disturbance?.normalized_spl_db && (
//             <View style={s.metricItem}>
//               <Text style={[s.metricValue, { color: isReportable ? '#E74C3C' : '#8B4513' }]}>
//                 {disturbance.normalized_spl_db} dB
//               </Text>
//               <Text style={s.metricLabel}>At 10m</Text>
//             </View>
//           )}
//           {aiResults.distance && (
//             <View style={s.metricItem}>
//               <Text style={s.metricValue}>~{aiResults.distance.meters}m</Text>
//               <Text style={s.metricLabel}>Distance</Text>
//             </View>
//           )}
//         </View>
        
//         {disturbance?.is_reportable && disturbance.reasons?.length > 0 && (
//           <View style={s.reasonsContainer}>
//             <Text style={s.reasonsTitle}>Reasons for Report:</Text>
//             {disturbance.reasons.slice(0, 2).map((reason, idx) => (
//               <View key={idx} style={s.reasonItem}>
//                 <Ionicons name="alert-circle" size={14} color="#E74C3C" />
//                 <Text style={s.reasonText}>{reason}</Text>
//               </View>
//             ))}
//           </View>
//         )}
        
//         <View style={s.noiseLevelBadge}>
//           <Text style={[s.noiseLevelBadgeText, { color: isReportable ? '#E74C3C' : level.color }]}>
//             {isReportable ? '⚠️ Requires Action' : '✓ Automatically Detected'}
//           </Text>
//         </View>
//       </LinearGradient>
//     );
//   };

//   // ==================== RENDER DETECTIONS ====================
//   const renderDetections = () => {
//     if (!aiResults?.detections) return null;
    
//     const disturbance = aiResults.disturbance_assessment;
    
//     return (
//       <View style={s.detectionsContainer}>
//         <View style={s.sectionHeader}>
//           <Ionicons name="list" size={20} color="#8B4513" />
//           <Text style={s.sectionHeaderTitle}>Top Detected Sounds</Text>
//           {disturbance?.is_reportable && (
//             <View style={s.reportableBadge}>
//               <Text style={s.reportableBadgeText}>Reportable</Text>
//             </View>
//           )}
//         </View>
//         {aiResults.detections?.slice(0, 5).map((detection, index) => {
//           const confidencePercent = (detection.confidence * 100).toFixed(1);
//           const isPrimary = index === 0 && disturbance?.sound_type === detection.class;
          
//           return (
//             <View key={index} style={[s.detectionItem, isPrimary && s.primaryDetection]}>
//               <View style={s.detectionRank}>
//                 <LinearGradient
//                   colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
//                   style={s.rankBadge}
//                 >
//                   <Text style={s.rankText}>#{index + 1}</Text>
//                 </LinearGradient>
//               </View>
//               <View style={s.detectionContent}>
//                 <Text style={s.detectionClass}>
//                   {detection.class}
//                   {isPrimary && disturbance?.is_reportable && (
//                     <Text style={s.violationTag}> ⚠️</Text>
//                   )}
//                 </Text>
//                 <View style={s.confidenceBar}>
//                   <View style={s.confidenceBarBg}>
//                     <LinearGradient
//                       colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
//                       style={[s.confidenceBarFill, { width: `${confidencePercent}%` }]}
//                     />
//                   </View>
//                   <Text style={s.confidenceText}>{confidencePercent}%</Text>
//                 </View>
//               </View>
//             </View>
//           );
//         })}
//       </View>
//     );
//   };

//   // ==================== RENDER DISTANCE CARD ====================
//   const renderDistanceCard = () => {
//     if (!aiResults?.distance) return null;
    
//     const disturbance = aiResults.disturbance_assessment;
//     const isSignificant = disturbance?.normalized_spl_db > disturbance?.threshold_applied;
    
//     return (
//       <View style={s.distanceCard}>
//         <View style={s.sectionHeader}>
//           <Ionicons name="navigate" size={20} color="#8B4513" />
//           <Text style={s.sectionHeaderTitle}>Distance Analysis</Text>
//         </View>
//         <View style={s.distanceContent}>
//           <View style={[s.distanceIconLarge, isSignificant && s.distanceIconWarning]}>
//             <Text style={s.distanceIconEmoji}>{aiResults.distance.icon}</Text>
//           </View>
//           <View style={s.distanceDetails}>
//             <Text style={s.distanceCategory}>{aiResults.distance.category}</Text>
//             <Text style={s.distanceValue}>~{aiResults.distance.meters} meters away</Text>
//             {disturbance?.normalized_spl_db && (
//               <Text style={[s.distanceRef, isSignificant && s.warningText]}>
//                 {disturbance.normalized_spl_db} dB at 10m {isSignificant ? '(Exceeds threshold)' : '(Within limits)'}
//               </Text>
//             )}
//           </View>
//         </View>
//       </View>
//     );
//   };

//   // ==================== RENDER MEDIA MODAL ====================
//   const renderMediaModal = () => {
//     return (
//       <Modal
//         visible={isMediaModalVisible}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={closeMediaModal}
//       >
//         <View style={s.modalOverlay}>
//           <View style={s.modalContent}>
//             <View style={s.modalHeader}>
//               <Text style={s.modalTitle}>Add Media</Text>
//               <TouchableOpacity onPress={closeMediaModal}>
//                 <Ionicons name="close" size={24} color="#666" />
//               </TouchableOpacity>
//             </View>
            
//             <ScrollView showsVerticalScrollIndicator={false}>
//               {/* Audio Section */}
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
//                   <TouchableOpacity style={s.modalOption} onPress={pickAudioFile}>
//                     <LinearGradient colors={['#4CAF50', '#388E3C']} style={s.modalOptionGradient}>
//                       <Ionicons name="folder-open" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Choose Audio</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </View>
//               </View>
              
//               {/* Video Section */}
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
//                   <TouchableOpacity style={s.modalOption} onPress={pickVideoFile}>
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

//   // ==================== RENDER TAB CONTENT ====================
//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'analysis':
//         return (
//           <View style={s.tabContent}>
//             {renderDisturbanceBanner()}
//             {aiResults ? (
//               <>
//                 {renderNoiseLevelCard()}
//                 {renderDetections()}
//                 {renderDistanceCard()}
                
//                 <TouchableOpacity style={s.shareButton} onPress={shareAnalysisReport}>
//                   <LinearGradient colors={['#8B4513', '#654321']} style={s.shareGradient}>
//                     <Ionicons name="share-social" size={20} color="#D4AC0D" />
//                     <Text style={s.shareText}>Share Analysis Report</Text>
//                   </LinearGradient>
//                 </TouchableOpacity>
//               </>
//             ) : (
//               <View style={s.emptyAnalysis}>
//                 <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
//                   <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
//                 </Animated.View>
//                 <Text style={s.emptyTitle}>No Analysis Yet</Text>
//                 <Text style={s.emptyText}>Tap the + button to add audio or video</Text>
//                 <Text style={s.emptySubtext}>AI will detect reportable noise disturbances</Text>
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
//                     onPress={addManualLocation}
//                   >
//                     <LinearGradient
//                       colors={['#D4AC0D', '#8B4513']}
//                       style={s.addLocationGradient}
//                     >
//                       <Ionicons name="create-outline" size={24} color="#fff" />
//                       <Text style={s.addLocationText}>Enter Location Manually</Text>
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
//                       {location.address?.street || location.address || 'Unknown Location'}
//                     </Text>
//                     {location.address?.city && (
//                       <Text style={s.locationCity}>
//                         {location.address.city}, {location.address.region || ''}
//                       </Text>
//                     )}
//                     {location.latitude && (
//                       <>
//                         <View style={s.coordinatesContainer}>
//                           <Text style={s.coordinatesLabel}>Latitude:</Text>
//                           <Text style={s.coordinatesValue}>{location.latitude.toFixed(6)}</Text>
//                         </View>
//                         <View style={s.coordinatesContainer}>
//                           <Text style={s.coordinatesLabel}>Longitude:</Text>
//                           <Text style={s.coordinatesValue}>{location.longitude.toFixed(6)}</Text>
//                         </View>
//                       </>
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
      
//       {/* Header */}
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
//              videoUri ? 'Video attached' : 
//              audioUri ? 'Audio ready' : 
//              'Record or select media'}
//           </Text>
//           {isAnalyzing && (
//             <View style={s.analyzingBadge}>
//               <ActivityIndicator size="small" color="#D4AC0D" />
//               <Text style={s.analyzingText}>AI Analyzing...</Text>
//             </View>
//           )}
//         </View>
//       </LinearGradient>

//       {/* Add Media Button */}
//       <TouchableOpacity style={s.addMediaButton} onPress={openMediaModal}>
//         <LinearGradient
//           colors={['#D4AC0D', '#8B4513']}
//           style={s.addMediaGradient}
//         >
//           <Ionicons name="add-circle" size={28} color="#fff" />
//           <Text style={s.addMediaText}>Add Media</Text>
//         </LinearGradient>
//       </TouchableOpacity>

//       {/* Media Preview */}
//       {renderMediaSection()}

//       {/* Tabs */}
//       {(audioUri || videoUri) && (
//         <View style={s.tabsContainer}>
//           <TouchableOpacity
//             style={[s.tab, activeTab === 'analysis' && s.activeTab]}
//             onPress={() => setActiveTab('analysis')}
//           >
//             <Ionicons 
//               name="analytics" 
//               size={20} 
//               color={activeTab === 'analysis' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'analysis' && s.activeTabText]}>
//               Analysis
//             </Text>
//             {disturbanceAlert && activeTab !== 'analysis' && (
//               <View style={s.notificationDot} />
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'details' && s.activeTab]}
//             onPress={() => setActiveTab('details')}
//           >
//             <Ionicons 
//               name="document-text" 
//               size={20} 
//               color={activeTab === 'details' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'details' && s.activeTabText]}>
//               Details
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'location' && s.activeTab]}
//             onPress={() => setActiveTab('location')}
//           >
//             <Ionicons 
//               name="location" 
//               size={20} 
//               color={activeTab === 'location' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'location' && s.activeTabText]}>
//               Location
//             </Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Tab Content - Scrollable Analysis */}
//       <ScrollView 
//         style={s.tabContentContainer} 
//         contentContainerStyle={s.tabContentContainerContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {renderTabContent()}

//         {/* Submit Button */}
//         {(audioUri || videoUri) && (
//           <TouchableOpacity
//             onPress={saveRecording}
//             style={[s.submitBtn, (!noiseLevel || isSubmitting) && s.submitBtnDisabled]}
//             disabled={!noiseLevel || isSubmitting}
//           >
//             <LinearGradient
//               colors={['#8B4513', '#654321']}
//               style={s.submitGradient}
//             >
//               {isSubmitting ? (
//                 <>
//                   <ActivityIndicator size="small" color="#D4AC0D" />
//                   <Text style={s.submitText}>Submitting...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                   <Text style={s.submitText}>Submit Report</Text>
//                   {aiResults && (
//                     <View style={s.aiBadge}>
//                       <Ionicons name="sparkles" size={16} color="#D4AC0D" />
//                     </View>
//                   )}
//                 </>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>
//         )}
//       </ScrollView>

//       {/* Media Selection Modal */}
//       {renderMediaModal()}

//       {/* Drawer Modal */}
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
  
//   // Header
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
//   analyzingBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//     alignSelf: 'flex-start',
//     marginTop: 8,
//     gap: 8,
//   },
//   analyzingText: { color: '#D4AC0D', fontSize: 12, fontWeight: '600' },

//   // Add Media Button
//   addMediaButton: {
//     marginHorizontal: 15,
//     marginTop: 15,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//   },
//   addMediaGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 14,
//   },
//   addMediaText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   // Media Section
//   mediaSection: {
//     marginHorizontal: 15,
//     marginBottom: 15,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 3,
//   },
//   mediaHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   mediaIconContainer: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   mediaInfo: {
//     flex: 1,
//   },
//   mediaTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   mediaFileName: {
//     fontSize: 11,
//     color: '#999',
//     marginTop: 2,
//   },
//   sourceBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     gap: 4,
//     marginRight: 8,
//   },
//   liveBadge: {
//     backgroundColor: '#4CAF50',
//   },
//   downloadedBadge: {
//     backgroundColor: '#2196F3',
//   },
//   sourceBadgeText: {
//     fontSize: 10,
//     color: '#fff',
//     fontWeight: '600',
//   },
//   deleteBtn: {
//     padding: 4,
//   },
//   videoContainer: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     backgroundColor: '#000',
//   },
//   video: {
//     width: '100%',
//     height: 200,
//   },
//   audioPlayerContainer: {
//     gap: 15,
//   },
//   progressContainer: { marginBottom: 5 },
//   progressBar: { 
//     height: 6, 
//     backgroundColor: '#e0e0e0', 
//     borderRadius: 3, 
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   progressFill: { 
//     height: '100%', 
//     backgroundColor: '#D4AC0D', 
//     borderRadius: 3 
//   },
//   timeLabels: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between' 
//   },
//   timeText: { 
//     fontSize: 12, 
//     color: '#666',
//   },
//   audioControls: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 25,
//   },
//   controlBtn: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   playBtn: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: '#D4AC0D',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 4,
//   },

//   // Tabs
//   tabsContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     marginHorizontal: 15,
//     marginBottom: 15,
//     borderRadius: 15,
//     padding: 5,
//     elevation: 2,
//   },
//   tab: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 12,
//     borderRadius: 12,
//     position: 'relative',
//   },
//   activeTab: {
//     backgroundColor: '#f5f5f5',
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#999',
//     fontWeight: '500',
//   },
//   activeTabText: {
//     color: '#8B4513',
//     fontWeight: '600',
//   },
//   notificationDot: {
//     position: 'absolute',
//     top: 8,
//     right: '30%',
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#D4AC0D',
//   },

//   // Tab Content Container - Scrollable
//   tabContentContainer: {
//     flex: 1,
//   },
//   tabContentContainerContent: {
//     paddingHorizontal: 15,
//     paddingBottom: 30,
//   },
//   tabContent: {
//     gap: 15,
//   },

//   // Disturbance Banner
//   disturbanceBanner: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginBottom: 5,
//   },
//   disturbanceGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     gap: 12,
//   },
//   disturbanceContent: {
//     flex: 1,
//   },
//   disturbanceTitle: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
//   disturbanceText: {
//     color: '#fff',
//     fontSize: 12,
//     opacity: 0.9,
//   },

//   // Noise Level Card
//   noiseLevelCard: {
//     borderRadius: 20,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     elevation: 3,
//   },
//   noiseLevelHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   noiseLevelIconContainer: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   noiseLevelInfo: {
//     flex: 1,
//   },
//   noiseLevelLabel: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   noiseLevelDesc: {
//     fontSize: 12,
//     color: '#666',
//   },
//   noiseLevelEmoji: {
//     fontSize: 32,
//   },
//   noiseLevelMetrics: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 15,
//   },
//   metricItem: {
//     alignItems: 'center',
//   },
//   metricValue: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   metricLabel: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 4,
//   },
//   reasonsContainer: {
//     backgroundColor: '#FFF9C4',
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 12,
//   },
//   reasonsTitle: {
//     fontSize: 12,
//     fontWeight: 'bold',
//     color: '#E67E22',
//     marginBottom: 6,
//   },
//   reasonItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     marginBottom: 4,
//   },
//   reasonText: {
//     fontSize: 11,
//     color: '#666',
//     flex: 1,
//   },
//   noiseLevelBadge: {
//     alignItems: 'center',
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   noiseLevelBadgeText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },

//   // Detections Container
//   detectionsContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 12,
//   },
//   sectionHeaderTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#8B4513',
//     flex: 1,
//   },
//   reportableBadge: {
//     backgroundColor: '#FFEBEE',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   reportableBadgeText: {
//     fontSize: 10,
//     color: '#E74C3C',
//     fontWeight: 'bold',
//   },
//   detectionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//   },
//   primaryDetection: {
//     backgroundColor: '#FFF9C4',
//     borderColor: '#D4AC0D',
//   },
//   detectionRank: {
//     marginRight: 12,
//   },
//   rankBadge: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   rankText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   detectionContent: {
//     flex: 1,
//   },
//   detectionClass: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 6,
//   },
//   violationTag: {
//     color: '#E74C3C',
//     fontSize: 12,
//   },
//   confidenceBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   confidenceBarBg: {
//     flex: 1,
//     height: 6,
//     backgroundColor: '#f0f0f0',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   confidenceBarFill: {
//     height: '100%',
//     borderRadius: 3,
//   },
//   confidenceText: {
//     fontSize: 12,
//     color: '#666',
//     fontWeight: '500',
//     width: 45,
//   },

//   // Distance Card
//   distanceCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   distanceContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 15,
//   },
//   distanceIconLarge: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   distanceIconWarning: {
//     backgroundColor: '#FFEBEE',
//   },
//   distanceIconEmoji: {
//     fontSize: 30,
//   },
//   distanceDetails: {
//     flex: 1,
//   },
//   distanceCategory: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginBottom: 4,
//   },
//   distanceValue: {
//     fontSize: 14,
//     color: '#333',
//     marginBottom: 4,
//   },
//   distanceRef: {
//     fontSize: 12,
//     color: '#999',
//     fontStyle: 'italic',
//   },
//   warningText: {
//     color: '#E74C3C',
//     fontWeight: '500',
//   },

//   // Share Button
//   shareButton: {
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginTop: 5,
//   },
//   shareGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 12,
//   },
//   shareText: {
//     color: '#D4AC0D',
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   // Empty Analysis
//   emptyAnalysis: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginTop: 15,
//     marginBottom: 8,
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#999',
//     textAlign: 'center',
//   },
//   emptySubtext: {
//     fontSize: 12,
//     color: '#ccc',
//     marginTop: 8,
//     textAlign: 'center',
//   },

//   // Details Card
//   detailsCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   detailsInput: {
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     borderRadius: 12,
//     padding: 12,
//     fontSize: 14,
//     backgroundColor: '#f8f9fa',
//     minHeight: 100,
//   },
//   charCount: {
//     textAlign: 'right',
//     fontSize: 12,
//     color: '#999',
//     marginTop: 8,
//   },

//   // Location Card
//   locationCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   addLocationBtn: {
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginTop: 5,
//   },
//   addLocationGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   addLocationText: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   orDivider: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 15,
//   },
//   dividerLine: {
//     flex: 1,
//     height: 1,
//     backgroundColor: '#e0e0e0',
//   },
//   dividerText: {
//     marginHorizontal: 10,
//     color: '#999',
//     fontSize: 12,
//   },
//   locationInfoCard: {
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     padding: 15,
//     marginTop: 5,
//   },
//   locationHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   locationBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
//   locationBadgeText: {
//     fontSize: 13,
//     color: '#4CAF50',
//     fontWeight: '600',
//   },
//   removeLocationBtn: {
//     padding: 4,
//   },
//   locationDetails: {
//     marginBottom: 12,
//   },
//   locationAddress: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 4,
//   },
//   locationCity: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 12,
//   },
//   coordinatesContainer: {
//     flexDirection: 'row',
//     marginBottom: 4,
//   },
//   coordinatesLabel: {
//     fontSize: 12,
//     color: '#999',
//     width: 70,
//   },
//   coordinatesValue: {
//     fontSize: 12,
//     color: '#333',
//   },
//   refreshLocationBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   refreshLocationText: {
//     fontSize: 13,
//     color: '#8B4513',
//     fontWeight: '500',
//   },
//   locationError: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFEBEE',
//     padding: 12,
//     borderRadius: 10,
//     marginTop: 10,
//     gap: 8,
//   },
//   locationErrorText: {
//     fontSize: 13,
//     color: '#E74C3C',
//     flex: 1,
//   },

//   // Submit Button
//   submitBtn: {
//     marginTop: 10,
//     marginBottom: 20,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//   },
//   submitGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   submitText: {
//     color: '#D4AC0D',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   submitBtnDisabled: {
//     opacity: 0.5,
//   },
//   aiBadge: {
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     padding: 4,
//     borderRadius: 12,
//   },

//   // Modal
//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },

//   // Media Modal
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContent: {
//     backgroundColor: '#fff',
//     borderRadius: 25,
//     width: width - 40,
//     maxHeight: height * 0.8,
//     padding: 20,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//     paddingBottom: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   modalSection: {
//     marginBottom: 24,
//   },
//   modalSectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#8B4513',
//     marginBottom: 12,
//   },
//   modalOptionsRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   modalOption: {
//     flex: 1,
//     minWidth: (width - 80) / 2 - 12,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 2,
//   },
//   modalOptionGradient: {
//     alignItems: 'center',
//     paddingVertical: 16,
//     gap: 8,
//   },
//   modalOptionText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600',
//   },
// });
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
//   Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator,
//   Share, SafeAreaView
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { Audio, Video } from 'expo-av';
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
// import * as Location from 'expo-location';
// import * as FileSystem from 'expo-file-system/legacy';
// import { FFmpegKit } from 'ffmpeg-kit-react-native';
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
//   const [playbackPosition, setPlaybackPosition] = useState(0);
//   const [totalDuration, setTotalDuration] = useState(0);
//   const [recording, setRecording] = useState(null);
//   const [sound, setSound] = useState(null);
//   const [audioUri, setAudioUri] = useState(null);
//   const [comment, setComment] = useState('');
//   const [videoUri, setVideoUri] = useState(null);
//   const [attachmentType, setAttachmentType] = useState(null);
//   const [location, setLocation] = useState(null);
//   const [locationLoading, setLocationLoading] = useState(false);
//   const [locationError, setLocationError] = useState(null);
//   const [showManualLocationModal, setShowManualLocationModal] = useState(false);
//   const [mediaSource, setMediaSource] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [noiseLevel, setNoiseLevel] = useState('');
//   const [aiResults, setAiResults] = useState(null);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [activeTab, setActiveTab] = useState('analysis');
//   const [selectedFileName, setSelectedFileName] = useState(null);
//   const [disturbanceAlert, setDisturbanceAlert] = useState(null);
//   const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
//   const [selectedMapLocation, setSelectedMapLocation] = useState(null);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchResults, setSearchResults] = useState([]);
//   const [isSearching, setIsSearching] = useState(false);

//   const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
//   const overlayOpacity = useRef(new Animated.Value(0)).current;
//   const pulseAnim = useRef(new Animated.Value(1)).current;
//   const recordingInterval = useRef(null);
//   const videoRef = useRef(null);
//   const mapRef = useRef(null);

//   const noiseLevels = [
//     { value: 'green', label: 'Low', icon: 'checkmark-circle', color: '#4CAF50', bgColor: '#E8F5E9', description: 'Mild disturbance', emoji: '😌' },
//     { value: 'yellow', label: 'Medium', icon: 'warning', color: '#FFC107', bgColor: '#FFF9C4', description: 'Moderate noise', emoji: '😐' },
//     { value: 'red', label: 'High', icon: 'alert-circle', color: '#F44336', bgColor: '#FFEBEE', description: 'Severe disturbance', emoji: '😠' }
//   ];

//   const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';

//   const supportedAudioFormats = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.3gp'];
//   const supportedVideoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.3gp'];

//   // Audio mode setup
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
//       if (sound) {
//         sound.unloadAsync();
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

//   const getNoiseLevelFromAI = (aiData) => {
//     if (!aiData) return null;
//     if (aiData.noise_level && aiData.noise_level.value) {
//       return aiData.noise_level.value;
//     }
//     return null;
//   };

//   useEffect(() => {
//     if (aiResults) {
//       const newNoiseLevel = getNoiseLevelFromAI(aiResults);
//       if (newNoiseLevel) {
//         setNoiseLevel(newNoiseLevel);
//         console.log(`🎯 Auto-assigned noise level: ${newNoiseLevel}`);
//       }
      
//       if (aiResults.disturbance_assessment?.is_reportable) {
//         setDisturbanceAlert(aiResults.disturbance_assessment);
        
//         if (aiResults.disturbance_assessment.severity_name === 'SEVERE') {
//           showDisturbanceAlert(aiResults.disturbance_assessment);
//         }
//       } else {
//         setDisturbanceAlert(null);
//       }
//     }
//   }, [aiResults]);

//   const showDisturbanceAlert = (disturbance) => {
//     Alert.alert(
//       disturbance.severity_name === 'SEVERE' ? '🚨 URGENT: Noise Violation Detected!' : '⚠️ Reportable Noise Detected',
//       `${disturbance.recommendation}\n\nReasons:\n${disturbance.reasons?.map(r => `• ${r}`).join('\n')}\n\nNormalized SPL: ${disturbance.normalized_spl_db} dB at 10m`,
//       [
//         { text: 'View Details', onPress: () => setActiveTab('analysis') },
//         { text: 'Dismiss', style: 'cancel' }
//       ]
//     );
//   };

//   const shareAnalysisReport = async () => {
//     if (!aiResults) return;
    
//     const disturbance = aiResults.disturbance_assessment;
//     const reportText = `
// 🎤 Noise Analysis Report
// ========================
// ${disturbance?.is_reportable ? '⚠️ REPORTABLE NOISE DETECTED' : '✅ No Reportable Noise'}

// 📊 Sound: ${aiResults.urban_classification?.primary_sound || 'Unknown'}
// 🔊 Volume: ${aiResults.decibel} dB
// 📏 Normalized SPL: ${disturbance?.normalized_spl_db || 'N/A'} dB at 10m
// 📍 Distance: ${aiResults.distance?.meters || '?'}m (${aiResults.distance?.category || 'Unknown'})
// ⏱️ Duration: ${aiResults.duration_seconds || 0}s
// 📹 Source: ${mediaSource === 'live' ? 'Live Recording' : 'Downloaded File'}

// ${disturbance?.is_reportable ? `
// 🚨 VIOLATION DETAILS:
// Severity: ${disturbance.severity_name}
// Reasons: ${disturbance.reasons?.join(', ') || 'N/A'}
// Action: ${disturbance.recommendation}
// ` : ''}

// 🎧 Top Detections:
// ${aiResults.detections?.slice(0, 3).map((d, i) => `${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`).join('\n')}

// Generated by NoiseWatch AI
// ${new Date().toLocaleString()}
//     `;
    
//     try {
//       await Share.share({
//         message: reportText,
//         title: 'Noise Analysis Report'
//       });
//     } catch (error) {
//       console.error('Share failed:', error);
//     }
//   };

//   // ==================== AUDIO FUNCTIONS ====================
//   const startRecording = async () => {
//     try {
//       // Clean up any existing recording
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
      
//       setRecording(newRecording);
//       setIsRecording(true);
//       setRecordingDuration(0);
//       setAttachmentType('audio');
//       setMediaSource('live');
//       setAiResults(null);
//       setNoiseLevel('');
//       setDisturbanceAlert(null);
//       setSelectedFileName(null);
//       setIsMediaModalVisible(false);
      
//       // Clear any existing interval
//       if (recordingInterval.current) {
//         clearInterval(recordingInterval.current);
//       }
      
//       recordingInterval.current = setInterval(() => {
//         setRecordingDuration(prev => prev + 1);
//       }, 1000);
      
//     } catch (err) {
//       console.error('Start recording error:', err);
//       Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
//     }
//   };

//   const stopRecording = async () => {
//     if (!recording) {
//       console.log('No recording to stop');
//       return;
//     }
    
//     try {
//       await recording.stopAndUnloadAsync();
//       const uri = recording.getURI();
//       console.log('Recording saved to:', uri);
      
//       if (recordingInterval.current) {
//         clearInterval(recordingInterval.current);
//         recordingInterval.current = null;
//       }
      
//       setAudioUri(uri);
//       setIsRecording(false);
//       setRecording(null);
      
//       const { sound: newSound } = await Audio.Sound.createAsync({ uri });
//       const status = await newSound.getStatusAsync();
//       setTotalDuration(Math.floor(status.durationMillis / 1000));
//       setSound(newSound);
//       setSelectedFileName(`Recording_${new Date().toISOString().slice(0, 19)}`);
      
//       if (uri) {
//         setTimeout(() => {
//           analyzeWithYAMNet(uri);
//         }, 500);
//       }
//     } catch (err) {
//       console.error('Stop recording error:', err);
//       Alert.alert('Error', 'Failed to stop recording.');
//       setIsRecording(false);
//       setRecording(null);
//       if (recordingInterval.current) {
//         clearInterval(recordingInterval.current);
//         recordingInterval.current = null;
//       }
//     }
//   };

//   const pickAudioFile = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['audio/*'],
//         copyToCacheDirectory: true,
//         multiple: false,
//       });

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const asset = result.assets[0];
//         const fileUri = asset.uri;
//         const fileName = asset.name;
        
//         console.log('📁 Selected audio file:', fileName);
        
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setVideoUri(null);
//         setAudioUri(fileUri);
//         setAttachmentType('audio');
//         setMediaSource('downloaded');
//         setSelectedFileName(fileName);
//         setAiResults(null);
//         setNoiseLevel('');
//         setDisturbanceAlert(null);
//         setIsMediaModalVisible(false);
        
//         try {
//           const { sound: newSound } = await Audio.Sound.createAsync({ uri: fileUri });
//           const status = await newSound.getStatusAsync();
//           setTotalDuration(Math.floor(status.durationMillis / 1000));
//           setSound(newSound);
//         } catch (error) {
//           console.error('Error loading audio:', error);
//         }
        
//         setTimeout(() => {
//           analyzeWithYAMNet(fileUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error picking audio file:', error);
//       Alert.alert('Error', 'Failed to pick audio file');
//     }
//   };

//   // ==================== VIDEO FUNCTIONS ====================
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
        
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setAudioUri(null);
//         setVideoUri(videoUri);
//         setAttachmentType('video');
//         setMediaSource('live');
//         setSelectedFileName(`Video_${new Date().toISOString().slice(0, 19)}`);
//         setAiResults(null);
//         setNoiseLevel('');
//         setDisturbanceAlert(null);
//         setIsMediaModalVisible(false);
        
//         setTimeout(() => {
//           analyzeWithYAMNet(videoUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error recording video:', error);
//       Alert.alert('Error', 'Failed to record video');
//     }
//   };

//   const pickVideoFromGallery = async () => {
//     try {
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//         allowsEditing: true,
//         aspect: [16, 9],
//         quality: 1,
//       });
      
//       if (!result.canceled && result.assets && result.assets[0]) {
//         const videoUri = result.assets[0].uri;
//         const fileName = result.assets[0].fileName || `video_${Date.now()}.mp4`;
        
//         console.log('📁 Selected video from gallery:', fileName);
        
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setAudioUri(null);
//         setVideoUri(videoUri);
//         setAttachmentType('video');
//         setMediaSource('downloaded');
//         setSelectedFileName(fileName);
//         setAiResults(null);
//         setNoiseLevel('');
//         setDisturbanceAlert(null);
//         setIsMediaModalVisible(false);
        
//         setTimeout(() => {
//           analyzeWithYAMNet(videoUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error picking video from gallery:', error);
//       Alert.alert('Error', 'Failed to pick video from gallery');
//     }
//   };

//   const pickVideoFile = async () => {
//     try {
//       const result = await DocumentPicker.getDocumentAsync({
//         type: ['video/*'],
//         copyToCacheDirectory: true,
//         multiple: false,
//       });

//       if (!result.canceled && result.assets && result.assets[0]) {
//         const asset = result.assets[0];
//         const fileUri = asset.uri;
//         const fileName = asset.name;
        
//         console.log('📁 Selected video file:', fileName);
        
//         if (sound) {
//           await sound.unloadAsync();
//           setSound(null);
//         }
//         setAudioUri(null);
//         setVideoUri(fileUri);
//         setAttachmentType('video');
//         setMediaSource('downloaded');
//         setSelectedFileName(fileName);
//         setAiResults(null);
//         setNoiseLevel('');
//         setDisturbanceAlert(null);
//         setIsMediaModalVisible(false);
        
//         setTimeout(() => {
//           analyzeWithYAMNet(fileUri);
//         }, 500);
//       }
//     } catch (error) {
//       console.error('Error picking video file:', error);
//       Alert.alert('Error', 'Failed to pick video file');
//     }
//   };

//   const openMediaModal = () => {
//     setIsMediaModalVisible(true);
//   };

//   const closeMediaModal = () => {
//     setIsMediaModalVisible(false);
//   };

//   const analyzeWithYAMNet = async (mediaUri) => {
//     if (!mediaUri) {
//       Alert.alert('No Media', 'Please select audio or video first');
//       return;
//     }

//     let mediaType = attachmentType;
//     if (!mediaType) {
//       const ext = mediaUri.split('.').pop().toLowerCase();
//       if (supportedVideoFormats.includes(`.${ext}`)) {
//         mediaType = 'video';
//       } else {
//         mediaType = 'audio';
//       }
//     }

//     setIsAnalyzing(true);
//     setAiResults(null);

//     try {
//       const fileInfo = await FileSystem.getInfoAsync(mediaUri);
//       if (!fileInfo.exists) {
//         throw new Error('File not found');
//       }
      
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
//           'Content-Type': 'multipart/form-data',
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//         body: formData,
//         signal: controller.signal,
//       });
      
//       clearTimeout(timeoutId);
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.success) {
//         setAiResults(data);
//       } else {
//         Alert.alert('Analysis Failed', data.error || 'Unknown error');
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
//     } finally {
//       setIsAnalyzing(false);
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
//           message += `Classes: ${responseData.flask_ai.yamnet_classes}\n`;
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

//   const deleteMedia = () => {
//     Alert.alert('Delete Media', 'Remove this media?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => { 
//           if (videoUri) {
//             setVideoUri(null);
//           }
//           if (audioUri) {
//             setAudioUri(null);
//           }
//           if (sound) {
//             sound.unloadAsync();
//             setSound(null);
//           }
//           setAttachmentType(null); 
//           setAiResults(null);
//           setNoiseLevel('');
//           setDisturbanceAlert(null);
//           setSelectedFileName(null);
//           setMediaSource(null);
//         }
//       },
//     ]);
//   };

// // ==================== LOCATION FUNCTIONS ====================
// const getUserLocation = async () => {
//   setLocationLoading(true);
//   setLocationError(null);
//   try {
//     const { status } = await Location.requestForegroundPermissionsAsync();
//     if (status !== 'granted') {
//       setLocationError('Location permission denied');
//       Alert.alert('Permission Required', 'Please grant location access.');
//       setLocationLoading(false);
//       return;
//     }
//     const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
//     const address = await Location.reverseGeocodeAsync({ 
//       latitude: currentLocation.coords.latitude, 
//       longitude: currentLocation.coords.longitude 
//     });
    
//     const addressData = address[0] || {};
    
//     // Create clean address object
//     const cleanAddress = {
//       street: addressData.street || addressData.name || '',
//       city: addressData.city || addressData.subregion || '',
//       region: addressData.region || '',
//       country: addressData.country || '',
//       postalCode: addressData.postalCode || '',
//       name: addressData.name || ''
//     };
    
//     setLocation({ 
//       latitude: currentLocation.coords.latitude, 
//       longitude: currentLocation.coords.longitude, 
//       address: cleanAddress,
//       timestamp: new Date().toISOString(),
//       isManual: false
//     });
//     setLocationLoading(false);
    
//     const displayAddress = cleanAddress.street || 
//                           `${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`;
    
//     Alert.alert('✅ Location Added', `${displayAddress}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
//   } catch (error) {
//     setLocationError('Failed to get location');
//     setLocationLoading(false);
//     Alert.alert('Error', 'Failed to get location.');
//   }
// };
// // Search location function - FIXED
// const searchLocation = async () => {
//   if (!searchQuery.trim()) {
//     Alert.alert('Search', 'Please enter a location to search');
//     return;
//   }
  
//   setIsSearching(true);
//   try {
//     // Using Google Maps Geocoding API (requires API key)
//     // For now, using a more reliable free API
//     const response = await fetch(
//       `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`,
//       {
//         method: 'GET',
//         headers: {
//           'Accept': 'application/json',
//         },
//       }
//     );
    
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log('Search results:', data);
    
//     if (data.features && data.features.length > 0) {
//       const results = data.features.map(feature => ({
//         lat: feature.geometry.coordinates[1],
//         lon: feature.geometry.coordinates[0],
//         display_name: feature.properties.name || feature.properties.street || 
//                       `${feature.properties.city || ''} ${feature.properties.country || ''}`,
//         full_address: feature.properties.street ? 
//                       `${feature.properties.street}, ${feature.properties.city || ''}, ${feature.properties.country || ''}` :
//                       feature.properties.name || 'Selected location'
//       }));
//       setSearchResults(results);
//     } else {
//       setSearchResults([]);
//       Alert.alert('No Results', 'No locations found. Try a different search term.');
//     }
//   } catch (error) {
//     console.error('Search error:', error);
//     Alert.alert('Search Error', 'Failed to search location. Please try again or tap on the map directly.');
//     setSearchResults([]);
//   } finally {
//     setIsSearching(false);
//   }
// };

// const selectSearchResult = (result) => {
//   const lat = parseFloat(result.lat);
//   const lng = parseFloat(result.lon);
//   const locationName = result.display_name;
  
//   setSelectedMapLocation({ latitude: lat, longitude: lng });
//   setSearchQuery(locationName);
//   setSearchResults([]);
  
//   mapRef.current?.animateToRegion({
//     latitude: lat,
//     longitude: lng,
//     latitudeDelta: 0.01,
//     longitudeDelta: 0.01,
//   });
// };

// // Alternative search using Google Maps (if you have API key)
// // Uncomment this if you have Google Maps API key
// /*
// const searchLocationGoogle = async () => {
//   if (!searchQuery.trim()) return;
  
//   setIsSearching(true);
//   try {
//     const API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your key
//     const response = await fetch(
//       `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${API_KEY}`
//     );
//     const data = await response.json();
    
//     if (data.status === 'OK') {
//       const results = data.results.map(result => ({
//         lat: result.geometry.location.lat,
//         lon: result.geometry.location.lng,
//         display_name: result.formatted_address,
//         full_address: result.formatted_address
//       }));
//       setSearchResults(results);
//     } else {
//       setSearchResults([]);
//       Alert.alert('No Results', data.status);
//     }
//   } catch (error) {
//     console.error('Search error:', error);
//     Alert.alert('Search Error', 'Failed to search location.');
//   } finally {
//     setIsSearching(false);
//   }
// };
// */

// const openManualLocationPicker = () => {
//   setSelectedMapLocation(null);
//   setSearchQuery('');
//   setSearchResults([]);
//   setShowManualLocationModal(true);
// };  

// const confirmManualLocation = async () => {
//   if (!selectedMapLocation) {
//     Alert.alert('No Location Selected', 'Please search or tap on the map to select a location');
//     return;
//   }
  
//   try {
//     const address = await Location.reverseGeocodeAsync({
//       latitude: selectedMapLocation.latitude,
//       longitude: selectedMapLocation.longitude
//     });
    
//     // Properly extract address components with safe fallbacks
//     const addressData = address[0] || {};
    
//     // Create a clean address object with only the fields your backend expects
//     const cleanAddress = {
//       street: addressData.street || addressData.name || 'Selected location',
//       city: addressData.city || addressData.subregion || addressData.district || '',
//       region: addressData.region || '',
//       country: addressData.country || '',
//       postalCode: addressData.postalCode || '',
//       name: addressData.name || ''
//     };
    
//     setLocation({
//       latitude: selectedMapLocation.latitude,
//       longitude: selectedMapLocation.longitude,
//       address: cleanAddress,
//       timestamp: new Date().toISOString(),
//       isManual: true
//     });
    
//     setShowManualLocationModal(false);
    
//     // Display a readable address
//     const displayAddress = cleanAddress.street || 
//                           `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`;
    
//     Alert.alert('✅ Location Added', displayAddress);
    
//   } catch (error) {
//     console.error('Error getting address:', error);
//     // Fallback: create location without reverse geocoding
//     setLocation({
//       latitude: selectedMapLocation.latitude,
//       longitude: selectedMapLocation.longitude,
//       address: {
//         street: 'Selected location',
//         city: '',
//         region: '',
//         country: '',
//         postalCode: ''
//       },
//       timestamp: new Date().toISOString(),
//       isManual: true
//     });
//     setShowManualLocationModal(false);
//     Alert.alert('✅ Location Added', `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`);
//   }
// };
//   // ==================== AUDIO PLAYBACK FUNCTIONS ====================
//   const playPauseRecording = async () => {
//     if (!sound) return;
//     try {
//       if (isPlaying) {
//         await sound.pauseAsync();
//         setIsPlaying(false);
//       } else {
//         if (playbackPosition >= totalDuration) {
//           await sound.setPositionAsync(0);
//           setPlaybackPosition(0);
//         }
//         await sound.playAsync();
//         setIsPlaying(true);
//         sound.setOnPlaybackStatusUpdate((status) => {
//           if (status.isLoaded) {
//             setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//             if (status.didJustFinish) { 
//               setIsPlaying(false); 
//               setPlaybackPosition(0); 
//             }
//           }
//         });
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const restartRecording = async () => {
//     if (!sound) return;
//     try {
//       await sound.setPositionAsync(0);
//       setPlaybackPosition(0);
//       await sound.playAsync();
//       setIsPlaying(true);
//       sound.setOnPlaybackStatusUpdate((status) => {
//         if (status.isLoaded) {
//           setPlaybackPosition(Math.floor(status.positionMillis / 1000));
//           if (status.didJustFinish) { 
//             setIsPlaying(false); 
//             setPlaybackPosition(0); 
//           }
//         }
//       });
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const deleteRecording = () => {
//     Alert.alert('Delete Recording', 'Delete this recording?', [
//       { text: 'Cancel', style: 'cancel' },
//       { 
//         text: 'Delete', 
//         style: 'destructive', 
//         onPress: () => {
//           if (sound) {
//             sound.unloadAsync();
//           }
//           setSound(null);
//           setAudioUri(null);
//           setTotalDuration(0);
//           setPlaybackPosition(0);
//           setIsPlaying(false);
//           setAttachmentType(null);
//           setAiResults(null);
//           setNoiseLevel('');
//           setDisturbanceAlert(null);
//           setSelectedFileName(null);
//           setMediaSource(null);
//         }
//       },
//     ]);
//   };

//   // ==================== SUBMIT FUNCTIONS ====================
//   const saveRecording = async () => {
//     if (!audioUri && !videoUri) {
//       Alert.alert('No Content', 'Please record audio or attach a video first.');
//       return;
//     }
//     if (!noiseLevel) {
//       Alert.alert('Noise Level Required', 'Please wait for AI analysis to complete.');
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

//       const formData = new FormData();
      
//       formData.append('userId', userId);
      
//       const mediaUri = videoUri || audioUri;
//       const mediaType = videoUri ? 'video' : 'audio';
//       const fileExtension = mediaUri.split('.').pop();
//       const fileName = selectedFileName || `noise_report_${Date.now()}.${fileExtension}`;
      
//       formData.append('media', {
//         uri: mediaUri,
//         type: videoUri ? `video/${fileExtension}` : `audio/${fileExtension}`,
//         name: fileName,
//       });

//       formData.append('mediaType', mediaType);
//       formData.append('noiseLevel', noiseLevel);
//       formData.append('originalFileName', selectedFileName || '');
//       formData.append('mediaSource', mediaSource || (videoUri || audioUri ? 'downloaded' : 'live'));
      
//       if (aiResults) {
//         formData.append('ai_analysis', JSON.stringify(aiResults));
//         formData.append('ai_decibel', aiResults.decibel?.toString() || '0');
//         formData.append('ai_noise_level', aiResults.noise_level?.level || '');
//         formData.append('ai_noise_value', aiResults.noise_level?.value || '');
//         formData.append('ai_noise_description', aiResults.noise_level?.description || '');
        
//         if (aiResults.disturbance_assessment) {
//           const da = aiResults.disturbance_assessment;
//           formData.append('ai_is_reportable', da.is_reportable?.toString() || 'false');
//           formData.append('ai_severity', da.severity_name || '');
//           formData.append('ai_disturbance_score', da.disturbance_score?.toString() || '0');
//           formData.append('ai_normalized_spl', da.normalized_spl_db?.toString() || '0');
//           formData.append('ai_recommendation', da.recommendation || '');
//           formData.append('ai_reasons', JSON.stringify(da.reasons || []));
//         }
        
//         if (aiResults.detections && aiResults.detections.length > 0) {
//           formData.append('ai_detections', JSON.stringify(aiResults.detections));
//           aiResults.detections.slice(0, 3).forEach((detection, index) => {
//             formData.append(`ai_detection_${index + 1}_class`, detection.class);
//             formData.append(`ai_detection_${index + 1}_confidence`, detection.confidence?.toString() || '0');
//           });
//         }
        
//         if (aiResults.distance) {
//           formData.append('ai_distance_meters', aiResults.distance.meters?.toString() || '0');
//           formData.append('ai_distance_category', aiResults.distance.category || '');
//           formData.append('ai_distance_description', aiResults.distance.description || '');
//           formData.append('ai_distance_icon', aiResults.distance.icon || '');
//           formData.append('ai_distance_reference_sound', aiResults.distance.reference_sound || '');
//           formData.append('ai_distance_reference_db', aiResults.distance.reference_db?.toString() || '0');
//         }
        
//         formData.append('ai_total_duration', totalDuration?.toString() || '0');
//         formData.append('ai_recording_duration', recordingDuration?.toString() || '0');
//       }
      
//       if (comment) {
//         formData.append('comment', comment);
//       }
//    // In saveRecording function, when appending location data:
// if (location) {
//   // Ensure address is a string, not an object
//   let locationAddress = '';
  
//   if (typeof location.address === 'object') {
//     // Build address string from object
//     const addr = location.address;
//     locationAddress = addr.street || addr.name || '';
//     if (addr.city) locationAddress += `, ${addr.city}`;
//     if (addr.region) locationAddress += `, ${addr.region}`;
//     if (addr.country) locationAddress += `, ${addr.country}`;
//   } else if (typeof location.address === 'string') {
//     locationAddress = location.address;
//   } else {
//     locationAddress = `${location.latitude?.toFixed(6)}, ${location.longitude?.toFixed(6)}`;
//   }
  
//   formData.append('location', JSON.stringify({
//     latitude: location.latitude,
//     longitude: location.longitude,
//     address: locationAddress,
//     timestamp: location.timestamp,
//     isManual: location.isManual || false
//   }));
  
//   formData.append('location_latitude', location.latitude?.toString() || '');
//   formData.append('location_longitude', location.longitude?.toString() || '');
//   formData.append('location_address_street', locationAddress);
//   formData.append('location_address_city', location.address?.city || '');
//   formData.append('location_address_region', location.address?.region || '');
//   formData.append('location_address_country', location.address?.country || '');
//   formData.append('location_address_postalCode', location.address?.postalCode || '');
//   formData.append('location_timestamp', location.timestamp || '');
//   formData.append('location_is_manual', (location.isManual || false).toString());
// }
//       formData.append('app_version', Constants.expoConfig?.version || '1.0.0');
//       formData.append('platform', Platform.OS);
//       formData.append('platform_version', Platform.Version?.toString() || '');
//       formData.append('timestamp', new Date().toISOString());

//       console.log('📤 Submitting complete report with all data...');
      
//       const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 60000,
//       });

//       setIsSubmitting(false);

//       const attachmentInfo = videoUri 
//         ? `Video: ${selectedFileName || videoUri.split('/').pop()}`
//         : `Audio: ${selectedFileName || formatTime(totalDuration)}`;

//       const sourceInfo = mediaSource === 'live' ? '\n📹 Source: Live Recording' : '\n📁 Source: Downloaded File';
      
//       const locationInfo = location 
//         ? `\n📍 Location: ${location.address?.street || location.address || 'Unknown'}${location.latitude ? `\n   Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : ''}${location.isManual ? '\n   (Manually entered)' : ''}`
//         : '\n📍 Location: Not provided';

//       const noiseLevelInfo = noiseLevels.find(nl => nl.value === noiseLevel);
//       const noiseLevelText = `\n🔊 Noise Level: ${noiseLevelInfo?.label} (${noiseLevelInfo?.description})`;
      
//       let disturbanceInfo = '';
//       if (aiResults?.disturbance_assessment?.is_reportable) {
//         const da = aiResults.disturbance_assessment;
//         disturbanceInfo = `\n\n🚨 REPORTABLE NOISE DETECTED!\nSeverity: ${da.severity_name}\nNormalized: ${da.normalized_spl_db} dB at 10m\n${da.recommendation}`;
//       }
      
//       let aiInfo = '';
//       if (aiResults) {
//         aiInfo = '\n🤖 AI Analysis:';
//         aiInfo += `\n   • Decibel: ${aiResults.decibel} dB`;
//         if (aiResults.distance) {
//           aiInfo += `\n   • Distance: ~${aiResults.distance.meters}m (${aiResults.distance.category})`;
//         }
//         if (aiResults.detections && aiResults.detections.length > 0) {
//           aiInfo += '\n   • Top Detections:';
//           aiResults.detections.slice(0, 3).forEach((d, i) => {
//             aiInfo += `\n     ${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`;
//           });
//         }
//       }

//       const reportDetails = `✅ Noise Report Submitted Successfully!\n\n` +
//         `📋 Report ID: ${response.data.reportId || 'N/A'}\n` +
//         `${comment ? `📄 Details: ${comment}\n` : ''}` +
//         `${noiseLevelText}` +
//         `${aiInfo}` +
//         `${disturbanceInfo}` +
//         `\n📎 ${attachmentInfo}` +
//         `${sourceInfo}` +
//         `${locationInfo}` +
//         `\n⏱️ Submitted: ${new Date().toLocaleString()}`;

//       Alert.alert('✅ Report Submitted', reportDetails, [
//         { 
//           text: 'OK', 
//           onPress: () => {
//             setComment('');
//             setNoiseLevel('');
//             setSelectedFileName(null);
//             if (sound) {
//               sound.unloadAsync();
//             }
//             setSound(null);
//             setAudioUri(null);
//             setVideoUri(null);
//             setAttachmentType(null);
//             setLocation(null);
//             setLocationError(null);
//             setMediaSource(null);
//             setTotalDuration(0);
//             setPlaybackPosition(0);
//             setAiResults(null);
//             setDisturbanceAlert(null);
//             setActiveTab('analysis');
//           }
//         }
//       ]);

//     } catch (error) {
//       setIsSubmitting(false);
//       console.error('Error submitting report:', error);
      
//       let errorMessage = 'Failed to submit noise report. Please try again.';
      
//       if (error.response) {
//         errorMessage = error.response.data?.message || errorMessage;
//         console.error('Server response:', error.response.data);
//       } else if (error.request) {
//         errorMessage = 'Network error. Please check your internet connection.';
//       }
      
//       Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
//     }
//   };

//   const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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

//   // ==================== RENDER MEDIA SECTION ====================
//   const renderMediaSection = () => {
//     if (videoUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.mediaHeader}>
//             <View style={s.mediaIconContainer}>
//               <Ionicons name="videocam" size={24} color="#8B4513" />
//             </View>
//             <View style={s.mediaInfo}>
//               <Text style={s.mediaTitle}>Video Attachment</Text>
//               {selectedFileName && (
//                 <Text style={s.mediaFileName} numberOfLines={1}>{selectedFileName}</Text>
//               )}
//             </View>
//             <View style={[s.sourceBadge, mediaSource === 'live' ? s.liveBadge : s.downloadedBadge]}>
//               <Ionicons name={mediaSource === 'live' ? "mic" : "download"} size={12} color="#fff" />
//               <Text style={s.sourceBadgeText}>{mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//             </View>
//             <TouchableOpacity onPress={deleteMedia} style={s.deleteBtn}>
//               <Ionicons name="trash-outline" size={22} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
//           <View style={s.videoContainer}>
//             <Video 
//               ref={videoRef} 
//               source={{ uri: videoUri }} 
//               style={s.video} 
//               useNativeControls 
//               resizeMode="contain" 
//               isLooping 
//             />
//           </View>
//         </View>
//       );
//     }

//     if (audioUri) {
//       return (
//         <View style={s.mediaSection}>
//           <View style={s.mediaHeader}>
//             <View style={s.mediaIconContainer}>
//               <Ionicons name="musical-notes" size={24} color="#8B4513" />
//             </View>
//             <View style={s.mediaInfo}>
//               <Text style={s.mediaTitle}>Audio Recording</Text>
//               {selectedFileName && (
//                 <Text style={s.mediaFileName} numberOfLines={1}>{selectedFileName}</Text>
//               )}
//             </View>
//             <View style={[s.sourceBadge, mediaSource === 'live' ? s.liveBadge : s.downloadedBadge]}>
//               <Ionicons name={mediaSource === 'live' ? "mic" : "download"} size={12} color="#fff" />
//               <Text style={s.sourceBadgeText}>{mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
//             </View>
//             <TouchableOpacity onPress={deleteMedia} style={s.deleteBtn}>
//               <Ionicons name="trash-outline" size={22} color="#E74C3C" />
//             </TouchableOpacity>
//           </View>
//           <View style={s.audioPlayerContainer}>
//             <View style={s.progressContainer}>
//               <View style={s.progressBar}>
//                 <View style={[
//                   s.progressFill, 
//                   { width: `${totalDuration > 0 ? (playbackPosition / totalDuration) * 100 : 0}%` }
//                 ]} />
//               </View>
//               <View style={s.timeLabels}>
//                 <Text style={s.timeText}>{formatTime(playbackPosition)}</Text>
//                 <Text style={s.timeText}>{formatTime(totalDuration)}</Text>
//               </View>
//             </View>
//             <View style={s.audioControls}>
//               <TouchableOpacity onPress={restartRecording} style={s.controlBtn}>
//                 <Ionicons name="play-skip-back" size={24} color="#8B4513" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={playPauseRecording} style={s.playBtn}>
//                 <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
//               </TouchableOpacity>
//               <TouchableOpacity onPress={deleteRecording} style={s.controlBtn}>
//                 <Ionicons name="trash" size={24} color="#E74C3C" />
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       );
//     }

//     return null;
//   };

//   // ==================== RENDER MANUAL LOCATION MODAL WITH SEARCH ====================
// const renderManualLocationModal = () => {
//   return (
//     <Modal
//       visible={showManualLocationModal}
//       transparent={true}
//       animationType="slide"
//       onRequestClose={() => setShowManualLocationModal(false)}
//     >
//       <View style={s.modalOverlay}>
//         <View style={s.mapModalContent}>
//           <View style={s.modalHeader}>
//             <Text style={s.modalTitle}>Select Location on Map</Text>
//             <TouchableOpacity onPress={() => setShowManualLocationModal(false)}>
//               <Ionicons name="close" size={24} color="#666" />
//             </TouchableOpacity>
//           </View>
          
//           {/* Search Bar */}
//           <View style={s.searchContainer}>
//             <View style={s.searchInputContainer}>
//               <Ionicons name="search" size={20} color="#999" style={s.searchIcon} />
//               <TextInput
//                 style={s.searchInput}
//                 placeholder="Search for a location (city, street, landmark)..."
//                 placeholderTextColor="#999"
//                 value={searchQuery}
//                 onChangeText={setSearchQuery}
//                 onSubmitEditing={searchLocation}
//                 returnKeyType="search"
//               />
//               {searchQuery.length > 0 && (
//                 <TouchableOpacity onPress={() => setSearchQuery('')}>
//                   <Ionicons name="close-circle" size={20} color="#999" />
//                 </TouchableOpacity>
//               )}
//             </View>
//             <TouchableOpacity style={s.searchButton} onPress={searchLocation} disabled={isSearching}>
//               <LinearGradient colors={['#8B4513', '#654321']} style={s.searchButtonGradient}>
//                 <Text style={s.searchButtonText}>{isSearching ? 'Searching...' : 'Search'}</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </View>
          
//           {/* Search Results */}
//           {searchResults.length > 0 && (
//             <View style={s.searchResultsContainer}>
//               <ScrollView style={s.searchResultsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
//                 {searchResults.map((result, index) => (
//                   <TouchableOpacity
//                     key={index}
//                     style={s.searchResultItem}
//                     onPress={() => selectSearchResult(result)}
//                   >
//                     <Ionicons name="location-outline" size={18} color="#8B4513" />
//                     <View style={s.searchResultTextContainer}>
//                       <Text style={s.searchResultText} numberOfLines={2}>
//                         {result.display_name}
//                       </Text>
//                       {result.full_address && result.full_address !== result.display_name && (
//                         <Text style={s.searchResultAddress} numberOfLines={1}>
//                           {result.full_address}
//                         </Text>
//                       )}
//                     </View>
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </View>
//           )}
          
//           <View style={s.mapContainer}>
//             <MapView
//               ref={mapRef}
//               style={s.map}
//               initialRegion={{
//                 latitude: 14.5995,
//                 longitude: 120.9842,
//                 latitudeDelta: 0.0922,
//                 longitudeDelta: 0.0421,
//               }}
//               onPress={(e) => {
//                 const { latitude, longitude } = e.nativeEvent.coordinate;
//                 setSelectedMapLocation({ latitude, longitude });
//               }}
//             >
//               {selectedMapLocation && (
//                 <Marker
//                   coordinate={selectedMapLocation}
//                   draggable
//                   onDragEnd={(e) => {
//                     setSelectedMapLocation(e.nativeEvent.coordinate);
//                   }}
//                 />
//               )}
//             </MapView>
//           </View>
          
//           <View style={s.mapInstructions}>
//             <Ionicons name="finger-print" size={20} color="#8B4513" />
//             <Text style={s.mapInstructionsText}>Tap on map to place marker, drag to adjust, or search above</Text>
//           </View>
          
//           <TouchableOpacity style={s.confirmLocationBtn} onPress={confirmManualLocation}>
//             <LinearGradient colors={['#8B4513', '#654321']} style={s.confirmLocationGradient}>
//               <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//               <Text style={s.confirmLocationText}>Confirm Location</Text>
//             </LinearGradient>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// };

//   // ==================== RENDER DISTURBANCE BANNER ====================
//   const renderDisturbanceBanner = () => {
//     if (!disturbanceAlert) return null;
    
//     const isSevere = disturbanceAlert.severity_name === 'SEVERE';
//     const colors = isSevere ? ['#E74C3C', '#C0392B'] : ['#E67E22', '#D35400'];
    
//     return (
//       <TouchableOpacity 
//         style={s.disturbanceBanner}
//         onPress={() => showDisturbanceAlert(disturbanceAlert)}
//         activeOpacity={0.9}
//       >
//         <LinearGradient
//           colors={colors}
//           style={s.disturbanceGradient}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 0 }}
//         >
//           <Ionicons name={isSevere ? "alert-circle" : "warning"} size={24} color="#fff" />
//           <View style={s.disturbanceContent}>
//             <Text style={s.disturbanceTitle}>
//               {isSevere ? 'URGENT: Noise Violation' : 'Reportable Noise Detected'}
//             </Text>
//             <Text style={s.disturbanceText} numberOfLines={1}>
//               {disturbanceAlert.recommendation}
//             </Text>
//           </View>
//           <Ionicons name="chevron-forward" size={20} color="#fff" />
//         </LinearGradient>
//       </TouchableOpacity>
//     );
//   };

//   // ==================== RENDER NOISE LEVEL CARD ====================
//   const renderNoiseLevelCard = () => {
//     if (!noiseLevel || !aiResults) return null;
    
//     const level = noiseLevels.find(l => l.value === noiseLevel);
//     if (!level) return null;
    
//     const disturbance = aiResults.disturbance_assessment;
//     const isReportable = disturbance?.is_reportable;
//     const severity = disturbance?.severity_name;
    
//     const cardColors = isReportable && severity === 'SEVERE' 
//       ? ['#FFEBEE', '#FFCDD2'] 
//       : [level.bgColor, '#fff'];
    
//     return (
//       <LinearGradient
//         colors={cardColors}
//         style={s.noiseLevelCard}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//       >
//         <View style={s.noiseLevelHeader}>
//           <View style={[s.noiseLevelIconContainer, { backgroundColor: isReportable && severity === 'SEVERE' ? '#E74C3C' : level.color }]}>
//             <Ionicons name={isReportable && severity === 'SEVERE' ? "alert" : level.icon} size={32} color="#fff" />
//           </View>
//           <View style={s.noiseLevelInfo}>
//             <Text style={s.noiseLevelLabel}>
//               {isReportable ? `${severity} Noise Violation` : `${level.label} Noise Level`}
//             </Text>
//             <Text style={s.noiseLevelDesc}>
//               {isReportable ? disturbance?.recommendation?.substring(0, 50) : level.description}
//             </Text>
//           </View>
//           <Text style={s.noiseLevelEmoji}>
//             {isReportable ? (severity === 'SEVERE' ? '🚨' : '⚠️') : level.emoji}
//           </Text>
//         </View>
        
//         <View style={s.noiseLevelMetrics}>
//           <View style={s.metricItem}>
//             <Text style={s.metricValue}>{aiResults.decibel} dB</Text>
//             <Text style={s.metricLabel}>Measured</Text>
//           </View>
//           {disturbance?.normalized_spl_db && (
//             <View style={s.metricItem}>
//               <Text style={[s.metricValue, { color: isReportable ? '#E74C3C' : '#8B4513' }]}>
//                 {disturbance.normalized_spl_db} dB
//               </Text>
//               <Text style={s.metricLabel}>At 10m</Text>
//             </View>
//           )}
//           {aiResults.distance && (
//             <View style={s.metricItem}>
//               <Text style={s.metricValue}>~{aiResults.distance.meters}m</Text>
//               <Text style={s.metricLabel}>Distance</Text>
//             </View>
//           )}
//         </View>
        
//         {disturbance?.is_reportable && disturbance.reasons?.length > 0 && (
//           <View style={s.reasonsContainer}>
//             <Text style={s.reasonsTitle}>Reasons for Report:</Text>
//             {disturbance.reasons.slice(0, 2).map((reason, idx) => (
//               <View key={idx} style={s.reasonItem}>
//                 <Ionicons name="alert-circle" size={14} color="#E74C3C" />
//                 <Text style={s.reasonText}>{reason}</Text>
//               </View>
//             ))}
//           </View>
//         )}
        
//         <View style={s.noiseLevelBadge}>
//           <Text style={[s.noiseLevelBadgeText, { color: isReportable ? '#E74C3C' : level.color }]}>
//             {isReportable ? '⚠️ Requires Action' : '✓ Automatically Detected'}
//           </Text>
//         </View>
//       </LinearGradient>
//     );
//   };

//   // ==================== RENDER DETECTIONS ====================
//   const renderDetections = () => {
//     if (!aiResults?.detections) return null;
    
//     const disturbance = aiResults.disturbance_assessment;
    
//     return (
//       <View style={s.detectionsContainer}>
//         <View style={s.sectionHeader}>
//           <Ionicons name="list" size={20} color="#8B4513" />
//           <Text style={s.sectionHeaderTitle}>Top Detected Sounds</Text>
//           {disturbance?.is_reportable && (
//             <View style={s.reportableBadge}>
//               <Text style={s.reportableBadgeText}>Reportable</Text>
//             </View>
//           )}
//         </View>
//         {aiResults.detections?.slice(0, 5).map((detection, index) => {
//           const confidencePercent = (detection.confidence * 100).toFixed(1);
//           const isPrimary = index === 0 && disturbance?.sound_type === detection.class;
          
//           return (
//             <View key={index} style={[s.detectionItem, isPrimary && s.primaryDetection]}>
//               <View style={s.detectionRank}>
//                 <LinearGradient
//                   colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
//                   style={s.rankBadge}
//                 >
//                   <Text style={s.rankText}>#{index + 1}</Text>
//                 </LinearGradient>
//               </View>
//               <View style={s.detectionContent}>
//                 <Text style={s.detectionClass}>
//                   {detection.class}
//                   {isPrimary && disturbance?.is_reportable && (
//                     <Text style={s.violationTag}> ⚠️</Text>
//                   )}
//                 </Text>
//                 <View style={s.confidenceBar}>
//                   <View style={s.confidenceBarBg}>
//                     <LinearGradient
//                       colors={index === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
//                       style={[s.confidenceBarFill, { width: `${confidencePercent}%` }]}
//                     />
//                   </View>
//                   <Text style={s.confidenceText}>{confidencePercent}%</Text>
//                 </View>
//               </View>
//             </View>
//           );
//         })}
//       </View>
//     );
//   };

//   // ==================== RENDER DISTANCE CARD ====================
//   const renderDistanceCard = () => {
//     if (!aiResults?.distance) return null;
    
//     const disturbance = aiResults.disturbance_assessment;
//     const isSignificant = disturbance?.normalized_spl_db > disturbance?.threshold_applied;
    
//     return (
//       <View style={s.distanceCard}>
//         <View style={s.sectionHeader}>
//           <Ionicons name="navigate" size={20} color="#8B4513" />
//           <Text style={s.sectionHeaderTitle}>Distance Analysis</Text>
//         </View>
//         <View style={s.distanceContent}>
//           <View style={[s.distanceIconLarge, isSignificant && s.distanceIconWarning]}>
//             <Text style={s.distanceIconEmoji}>{aiResults.distance.icon}</Text>
//           </View>
//           <View style={s.distanceDetails}>
//             <Text style={s.distanceCategory}>{aiResults.distance.category}</Text>
//             <Text style={s.distanceValue}>~{aiResults.distance.meters} meters away</Text>
//             {disturbance?.normalized_spl_db && (
//               <Text style={[s.distanceRef, isSignificant && s.warningText]}>
//                 {disturbance.normalized_spl_db} dB at 10m {isSignificant ? '(Exceeds threshold)' : '(Within limits)'}
//               </Text>
//             )}
//           </View>
//         </View>
//       </View>
//     );
//   };

//   // ==================== RENDER MEDIA MODAL ====================
//   const renderMediaModal = () => {
//     return (
//       <Modal
//         visible={isMediaModalVisible}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={closeMediaModal}
//       >
//         <View style={s.modalOverlay}>
//           <View style={s.modalContent}>
//             <View style={s.modalHeader}>
//               <Text style={s.modalTitle}>Add Media</Text>
//               <TouchableOpacity onPress={closeMediaModal}>
//                 <Ionicons name="close" size={24} color="#666" />
//               </TouchableOpacity>
//             </View>
            
//             <ScrollView showsVerticalScrollIndicator={false}>
//               {/* Audio Section */}
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
//                   <TouchableOpacity style={s.modalOption} onPress={pickAudioFile}>
//                     <LinearGradient colors={['#4CAF50', '#388E3C']} style={s.modalOptionGradient}>
//                       <Ionicons name="folder-open" size={28} color="#fff" />
//                       <Text style={s.modalOptionText}>Choose Audio</Text>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 </View>
//               </View>
              
//               {/* Video Section */}
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
//                   <TouchableOpacity style={s.modalOption} onPress={pickVideoFile}>
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

//   // ==================== RENDER TAB CONTENT ====================
//   // ==================== RENDER TAB CONTENT - FIXED LOCATION DISPLAY ====================
// const renderTabContent = () => {
//   switch (activeTab) {
//     case 'analysis':
//       return (
//         <View style={s.tabContent}>
//           {renderDisturbanceBanner()}
//           {aiResults ? (
//             <>
//               {renderNoiseLevelCard()}
//               {renderDetections()}
//               {renderDistanceCard()}
              
//               <TouchableOpacity style={s.shareButton} onPress={shareAnalysisReport}>
//                 <LinearGradient colors={['#8B4513', '#654321']} style={s.shareGradient}>
//                   <Ionicons name="share-social" size={20} color="#D4AC0D" />
//                   <Text style={s.shareText}>Share Analysis Report</Text>
//                 </LinearGradient>
//               </TouchableOpacity>
//             </>
//           ) : (
//             <View style={s.emptyAnalysis}>
//               <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
//                 <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
//               </Animated.View>
//               <Text style={s.emptyTitle}>No Analysis Yet</Text>
//               <Text style={s.emptyText}>Tap the + button to add audio or video</Text>
//               <Text style={s.emptySubtext}>AI will detect reportable noise disturbances</Text>
//             </View>
//           )}
//         </View>
//       );

//     case 'details':
//       return (
//         <View style={s.tabContent}>
//           <View style={s.detailsCard}>
//             <View style={s.sectionHeader}>
//               <Ionicons name="chatbubble-outline" size={20} color="#8B4513" />
//               <Text style={s.sectionHeaderTitle}>Additional Details</Text>
//             </View>
//             <TextInput 
//               style={s.detailsInput} 
//               placeholder="Describe the noise issue (optional)" 
//               placeholderTextColor="#999" 
//               multiline 
//               numberOfLines={4} 
//               value={comment} 
//               onChangeText={setComment} 
//               maxLength={500} 
//               textAlignVertical="top" 
//             />
//             <Text style={s.charCount}>{comment.length}/500</Text>
//           </View>
//         </View>
//       );

//     case 'location':
//       return (
//         <View style={s.tabContent}>
//           <View style={s.locationCard}>
//             <View style={s.sectionHeader}>
//               <Ionicons name="location-outline" size={20} color="#8B4513" />
//               <Text style={s.sectionHeaderTitle}>Location</Text>
//             </View>
            
//             {!location ? (
//               <>
//                 <TouchableOpacity 
//                   style={s.addLocationBtn} 
//                   onPress={getUserLocation} 
//                   disabled={locationLoading}
//                 >
//                   <LinearGradient
//                     colors={['#8B4513', '#654321']}
//                     style={s.addLocationGradient}
//                   >
//                     <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#D4AC0D" />
//                     <Text style={s.addLocationText}>
//                       {locationLoading ? 'Getting Location...' : 'Use Current Location'}
//                     </Text>
//                   </LinearGradient>
//                 </TouchableOpacity>
                
//                 <View style={s.orDivider}>
//                   <View style={s.dividerLine} />
//                   <Text style={s.dividerText}>OR</Text>
//                   <View style={s.dividerLine} />
//                 </View>
                
//                 <TouchableOpacity 
//                   style={s.addLocationBtn} 
//                   onPress={openManualLocationPicker}
//                 >
//                   <LinearGradient
//                     colors={['#D4AC0D', '#8B4513']}
//                     style={s.addLocationGradient}
//                   >
//                     <Ionicons name="map" size={24} color="#fff" />
//                     <Text style={s.addLocationText}>Select on Map</Text>
//                   </LinearGradient>
//                 </TouchableOpacity>
//               </>
//             ) : (
//               <View style={s.locationInfoCard}>
//                 <View style={s.locationHeader}>
//                   <View style={s.locationBadge}>
//                     <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
//                     <Text style={s.locationBadgeText}>
//                       Location Added {location.isManual ? '(Manual)' : '(GPS)'}
//                     </Text>
//                   </View>
//                   <TouchableOpacity onPress={() => setLocation(null)} style={s.removeLocationBtn}>
//                     <Ionicons name="close" size={20} color="#E74C3C" />
//                   </TouchableOpacity>
//                 </View>
                
//                 <View style={s.locationDetails}>
//                   {/* FIXED: Display address properly without rendering object */}
//                   <Text style={s.locationAddress}>
//                     {location.address?.street || 
//                      location.address?.name || 
//                      location.address?.formattedAddress || 
//                      (typeof location.address === 'string' ? location.address : 'Selected Location')}
//                   </Text>
//                   {location.address?.city && (
//                     <Text style={s.locationCity}>
//                       {location.address.city}, {location.address.region || ''}
//                     </Text>
//                   )}
//                   {location.latitude && (
//                     <>
//                       <View style={s.coordinatesContainer}>
//                         <Text style={s.coordinatesLabel}>Latitude:</Text>
//                         <Text style={s.coordinatesValue}>{location.latitude.toFixed(6)}</Text>
//                       </View>
//                       <View style={s.coordinatesContainer}>
//                         <Text style={s.coordinatesLabel}>Longitude:</Text>
//                         <Text style={s.coordinatesValue}>{location.longitude.toFixed(6)}</Text>
//                       </View>
//                     </>
//                   )}
//                 </View>
                
//                 <TouchableOpacity style={s.refreshLocationBtn} onPress={getUserLocation}>
//                   <Ionicons name="refresh" size={18} color="#8B4513" />
//                   <Text style={s.refreshLocationText}>Refresh GPS Location</Text>
//                 </TouchableOpacity>
//               </View>
//             )}
            
//             {locationError && (
//               <View style={s.locationError}>
//                 <Ionicons name="alert-circle" size={20} color="#E74C3C" />
//                 <Text style={s.locationErrorText}>{locationError}</Text>
//               </View>
//             )}
//           </View>
//         </View>
//       );

//     default:
//       return null;
//   }
// };

//   return (
//     <SafeAreaView style={s.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
//       {/* Header */}
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
//              videoUri ? 'Video attached' : 
//              audioUri ? 'Audio ready' : 
//              'Record or select media'}
//           </Text>
//           {isAnalyzing && (
//             <View style={s.analyzingBadge}>
//               <ActivityIndicator size="small" color="#D4AC0D" />
//               <Text style={s.analyzingText}>AI Analyzing...</Text>
//             </View>
//           )}
//         </View>
//       </LinearGradient>

//       {/* Recording Control - Visible when recording */}
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

//       {/* Add Media Button - Only show when not recording */}
//       {!isRecording && (
//         <TouchableOpacity style={s.addMediaButton} onPress={openMediaModal}>
//           <LinearGradient
//             colors={['#D4AC0D', '#8B4513']}
//             style={s.addMediaGradient}
//           >
//             <Ionicons name="add-circle" size={28} color="#fff" />
//             <Text style={s.addMediaText}>Add Media</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       )}

//       {/* Media Preview */}
//       {renderMediaSection()}

//       {/* Tabs - Only show when media is selected and not recording */}
//       {(audioUri || videoUri) && !isRecording && (
//         <View style={s.tabsContainer}>
//           <TouchableOpacity
//             style={[s.tab, activeTab === 'analysis' && s.activeTab]}
//             onPress={() => setActiveTab('analysis')}
//           >
//             <Ionicons 
//               name="analytics" 
//               size={20} 
//               color={activeTab === 'analysis' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'analysis' && s.activeTabText]}>
//               Analysis
//             </Text>
//             {disturbanceAlert && activeTab !== 'analysis' && (
//               <View style={s.notificationDot} />
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'details' && s.activeTab]}
//             onPress={() => setActiveTab('details')}
//           >
//             <Ionicons 
//               name="document-text" 
//               size={20} 
//               color={activeTab === 'details' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'details' && s.activeTabText]}>
//               Details
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[s.tab, activeTab === 'location' && s.activeTab]}
//             onPress={() => setActiveTab('location')}
//           >
//             <Ionicons 
//               name="location" 
//               size={20} 
//               color={activeTab === 'location' ? '#8B4513' : '#999'} 
//             />
//             <Text style={[s.tabText, activeTab === 'location' && s.activeTabText]}>
//               Location
//             </Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Tab Content - Scrollable Analysis */}
//       <ScrollView 
//         style={s.tabContentContainer} 
//         contentContainerStyle={s.tabContentContainerContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {renderTabContent()}

//         {/* Submit Button - Only show when media is selected and not recording */}
//         {(audioUri || videoUri) && !isRecording && (
//           <TouchableOpacity
//             onPress={saveRecording}
//             style={[s.submitBtn, (!noiseLevel || isSubmitting) && s.submitBtnDisabled]}
//             disabled={!noiseLevel || isSubmitting}
//           >
//             <LinearGradient
//               colors={['#8B4513', '#654321']}
//               style={s.submitGradient}
//             >
//               {isSubmitting ? (
//                 <>
//                   <ActivityIndicator size="small" color="#D4AC0D" />
//                   <Text style={s.submitText}>Submitting...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
//                   <Text style={s.submitText}>Submit Report</Text>
//                   {aiResults && (
//                     <View style={s.aiBadge}>
//                       <Ionicons name="sparkles" size={16} color="#D4AC0D" />
//                     </View>
//                   )}
//                 </>
//               )}
//             </LinearGradient>
//           </TouchableOpacity>
//         )}
//       </ScrollView>

//       {/* Media Selection Modal */}
//       {renderMediaModal()}
      
//       {/* Manual Location Map Modal */}
//       {renderManualLocationModal()}

//       {/* Drawer Modal */}
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
  
//   // Header
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
//   analyzingBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//     alignSelf: 'flex-start',
//     marginTop: 8,
//     gap: 8,
//   },
//   analyzingText: { color: '#D4AC0D', fontSize: 12, fontWeight: '600' },

//   // Recording Control
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
//   recordingInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//   },
//   recordingDot: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     backgroundColor: '#fff',
//   },
//   recordingTimer: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
//   },
//   stopRecordingButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 25,
//   },
//   stopRecordingText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   // Add Media Button
//   addMediaButton: {
//     marginHorizontal: 15,
//     marginTop: 15,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//   },
//   addMediaGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 14,
//   },
//   addMediaText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   // Media Section
//   mediaSection: {
//     marginHorizontal: 15,
//     marginBottom: 15,
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 3,
//   },
//   mediaHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   mediaIconContainer: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   mediaInfo: {
//     flex: 1,
//   },
//   mediaTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   mediaFileName: {
//     fontSize: 11,
//     color: '#999',
//     marginTop: 2,
//   },
//   sourceBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     gap: 4,
//     marginRight: 8,
//   },
//   liveBadge: {
//     backgroundColor: '#4CAF50',
//   },
//   downloadedBadge: {
//     backgroundColor: '#2196F3',
//   },
//   sourceBadgeText: {
//     fontSize: 10,
//     color: '#fff',
//     fontWeight: '600',
//   },
//   deleteBtn: {
//     padding: 4,
//   },
//   videoContainer: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     backgroundColor: '#000',
//   },
//   video: {
//     width: '100%',
//     height: 200,
//   },
//   audioPlayerContainer: {
//     gap: 15,
//   },
//   progressContainer: { marginBottom: 5 },
//   progressBar: { 
//     height: 6, 
//     backgroundColor: '#e0e0e0', 
//     borderRadius: 3, 
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   progressFill: { 
//     height: '100%', 
//     backgroundColor: '#D4AC0D', 
//     borderRadius: 3 
//   },
//   timeLabels: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between' 
//   },
//   timeText: { 
//     fontSize: 12, 
//     color: '#666',
//   },
//   audioControls: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 25,
//   },
//   controlBtn: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   playBtn: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: '#D4AC0D',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 4,
//   },

//   // Tabs
//   tabsContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     marginHorizontal: 15,
//     marginBottom: 15,
//     borderRadius: 15,
//     padding: 5,
//     elevation: 2,
//   },
//   tab: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 12,
//     borderRadius: 12,
//     position: 'relative',
//   },
//   activeTab: {
//     backgroundColor: '#f5f5f5',
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#999',
//     fontWeight: '500',
//   },
//   activeTabText: {
//     color: '#8B4513',
//     fontWeight: '600',
//   },
//   notificationDot: {
//     position: 'absolute',
//     top: 8,
//     right: '30%',
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#D4AC0D',
//   },

//   // Tab Content Container - Scrollable
//   tabContentContainer: {
//     flex: 1,
//   },
//   tabContentContainerContent: {
//     paddingHorizontal: 15,
//     paddingBottom: 30,
//   },
//   tabContent: {
//     gap: 15,
//   },

//   // Disturbance Banner
//   disturbanceBanner: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginBottom: 5,
//   },
//   disturbanceGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     gap: 12,
//   },
//   disturbanceContent: {
//     flex: 1,
//   },
//   disturbanceTitle: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
//   disturbanceText: {
//     color: '#fff',
//     fontSize: 12,
//     opacity: 0.9,
//   },

//   // Noise Level Card
//   noiseLevelCard: {
//     borderRadius: 20,
//     padding: 20,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     elevation: 3,
//   },
//   noiseLevelHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   noiseLevelIconContainer: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   noiseLevelInfo: {
//     flex: 1,
//   },
//   noiseLevelLabel: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   noiseLevelDesc: {
//     fontSize: 12,
//     color: '#666',
//   },
//   noiseLevelEmoji: {
//     fontSize: 32,
//   },
//   noiseLevelMetrics: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 15,
//   },
//   metricItem: {
//     alignItems: 'center',
//   },
//   metricValue: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   metricLabel: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 4,
//   },
//   reasonsContainer: {
//     backgroundColor: '#FFF9C4',
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 12,
//   },
//   reasonsTitle: {
//     fontSize: 12,
//     fontWeight: 'bold',
//     color: '#E67E22',
//     marginBottom: 6,
//   },
//   reasonItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     marginBottom: 4,
//   },
//   reasonText: {
//     fontSize: 11,
//     color: '#666',
//     flex: 1,
//   },
//   noiseLevelBadge: {
//     alignItems: 'center',
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   noiseLevelBadgeText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },

//   // Detections Container
//   detectionsContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 12,
//   },
//   sectionHeaderTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#8B4513',
//     flex: 1,
//   },
//   reportableBadge: {
//     backgroundColor: '#FFEBEE',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   reportableBadgeText: {
//     fontSize: 10,
//     color: '#E74C3C',
//     fontWeight: 'bold',
//   },
//   detectionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//   },
//   primaryDetection: {
//     backgroundColor: '#FFF9C4',
//     borderColor: '#D4AC0D',
//   },
//   detectionRank: {
//     marginRight: 12,
//   },
//   rankBadge: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   rankText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   detectionContent: {
//     flex: 1,
//   },
//   detectionClass: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 6,
//   },
//   violationTag: {
//     color: '#E74C3C',
//     fontSize: 12,
//   },
//   confidenceBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   confidenceBarBg: {
//     flex: 1,
//     height: 6,
//     backgroundColor: '#f0f0f0',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   confidenceBarFill: {
//     height: '100%',
//     borderRadius: 3,
//   },
//   confidenceText: {
//     fontSize: 12,
//     color: '#666',
//     fontWeight: '500',
//     width: 45,
//   },

//   // Distance Card
//   distanceCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   distanceContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 15,
//   },
//   distanceIconLarge: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   distanceIconWarning: {
//     backgroundColor: '#FFEBEE',
//   },
//   distanceIconEmoji: {
//     fontSize: 30,
//   },
//   distanceDetails: {
//     flex: 1,
//   },
//   distanceCategory: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginBottom: 4,
//   },
//   distanceValue: {
//     fontSize: 14,
//     color: '#333',
//     marginBottom: 4,
//   },
//   distanceRef: {
//     fontSize: 12,
//     color: '#999',
//     fontStyle: 'italic',
//   },
//   warningText: {
//     color: '#E74C3C',
//     fontWeight: '500',
//   },

//   // Share Button
//   shareButton: {
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginTop: 5,
//   },
//   shareGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 12,
//   },
//   shareText: {
//     color: '#D4AC0D',
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   // Empty Analysis
//   emptyAnalysis: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#8B4513',
//     marginTop: 15,
//     marginBottom: 8,
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#999',
//     textAlign: 'center',
//   },
//   emptySubtext: {
//     fontSize: 12,
//     color: '#ccc',
//     marginTop: 8,
//     textAlign: 'center',
//   },

//   // Details Card
//   detailsCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   detailsInput: {
//     borderWidth: 1,
//     borderColor: '#f0f0f0',
//     borderRadius: 12,
//     padding: 12,
//     fontSize: 14,
//     backgroundColor: '#f8f9fa',
//     minHeight: 100,
//   },
//   charCount: {
//     textAlign: 'right',
//     fontSize: 12,
//     color: '#999',
//     marginTop: 8,
//   },

//   // Location Card
//   locationCard: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 15,
//     elevation: 2,
//   },
//   addLocationBtn: {
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginTop: 5,
//   },
//   addLocationGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   addLocationText: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   orDivider: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 15,
//   },
//   dividerLine: {
//     flex: 1,
//     height: 1,
//     backgroundColor: '#e0e0e0',
//   },
//   dividerText: {
//     marginHorizontal: 10,
//     color: '#999',
//     fontSize: 12,
//   },
//   locationInfoCard: {
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     padding: 15,
//     marginTop: 5,
//   },
//   locationHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   locationBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
//   locationBadgeText: {
//     fontSize: 13,
//     color: '#4CAF50',
//     fontWeight: '600',
//   },
//   removeLocationBtn: {
//     padding: 4,
//   },
//   locationDetails: {
//     marginBottom: 12,
//   },
//   locationAddress: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 4,
//   },
//   locationCity: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 12,
//   },
//   coordinatesContainer: {
//     flexDirection: 'row',
//     marginBottom: 4,
//   },
//   coordinatesLabel: {
//     fontSize: 12,
//     color: '#999',
//     width: 70,
//   },
//   coordinatesValue: {
//     fontSize: 12,
//     color: '#333',
//   },
//   refreshLocationBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   refreshLocationText: {
//     fontSize: 13,
//     color: '#8B4513',
//     fontWeight: '500',
//   },
//   locationError: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFEBEE',
//     padding: 12,
//     borderRadius: 10,
//     marginTop: 10,
//     gap: 8,
//   },
//   locationErrorText: {
//     fontSize: 13,
//     color: '#E74C3C',
//     flex: 1,
//   },

//   // Submit Button
//   submitBtn: {
//     marginTop: 10,
//     marginBottom: 20,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 3,
//   },
//   submitGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 16,
//   },
//   submitText: {
//     color: '#D4AC0D',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   submitBtnDisabled: {
//     opacity: 0.5,
//   },
//   aiBadge: {
//     backgroundColor: 'rgba(212, 172, 13, 0.2)',
//     padding: 4,
//     borderRadius: 12,
//   },

//   // Modal
//   modalContainer: { flex: 1 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//   drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },

//   // Media Modal
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContent: {
//     backgroundColor: '#fff',
//     borderRadius: 25,
//     width: width - 40,
//     maxHeight: height * 0.8,
//     padding: 20,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//     paddingBottom: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#8B4513',
//   },
//   modalSection: {
//     marginBottom: 24,
//   },
//   modalSectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#8B4513',
//     marginBottom: 12,
//   },
//   modalOptionsRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   modalOption: {
//     flex: 1,
//     minWidth: (width - 80) / 2 - 12,
//     borderRadius: 15,
//     overflow: 'hidden',
//     elevation: 2,
//   },
//   modalOptionGradient: {
//     alignItems: 'center',
//     paddingVertical: 16,
//     gap: 8,
//   },
//   modalOptionText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600',
//   },
  
//   // Map Modal
//   mapModalContent: {
//     backgroundColor: '#fff',
//     borderRadius: 25,
//     width: width - 20,
//     height: height * 0.8,
//     padding: 20,
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     gap: 10,
//     marginBottom: 12,
//   },
//   searchInputContainer: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f5f5f5',
//     borderRadius: 12,
//     paddingHorizontal: 12,
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//   },
//   searchIcon: {
//     marginRight: 8,
//   },
//   searchInput: {
//     flex: 1,
//     paddingVertical: 12,
//     fontSize: 14,
//     color: '#333',
//   },
//   searchButton: {
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   searchButtonGradient: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   searchButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   searchResultsContainer: {
//     maxHeight: 200,
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//   },
//   searchResultsScroll: {
//     maxHeight: 200,
//   },
//   searchResultItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//     gap: 10,
//   },
//   searchResultText: {
//     flex: 1,
//     fontSize: 13,
//     color: '#333',
//   },
//   mapContainer: {
//     flex: 1,
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginVertical: 12,
//   },
//   map: {
//     width: '100%',
//     height: '100%',
//   },
//   mapInstructions: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     marginVertical: 10,
//   },
//   mapInstructionsText: {
//     fontSize: 12,
//     color: '#666',
//   },
//   confirmLocationBtn: {
//     borderRadius: 15,
//     overflow: 'hidden',
//     marginTop: 10,
//   },
//   confirmLocationGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//     paddingVertical: 14,
//   },
//   confirmLocationText: {
//     color: '#D4AC0D',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },

//   // Add to your StyleSheet
// searchResultsContainer: {
//   maxHeight: 200,
//   backgroundColor: '#fff',
//   borderRadius: 12,
//   marginBottom: 12,
//   borderWidth: 1,
//   borderColor: '#e0e0e0',
// },
// searchResultsScroll: {
//   maxHeight: 200,
// },
// searchResultItem: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   padding: 12,
//   borderBottomWidth: 1,
//   borderBottomColor: '#f0f0f0',
//   gap: 12,
// },
// searchResultTextContainer: {
//   flex: 1,
// },
// searchResultText: {
//   fontSize: 14,
//   color: '#333',
//   fontWeight: '500',
// },
// searchResultAddress: {
//   fontSize: 11,
//   color: '#999',
//   marginTop: 2,
// },
// });

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
  Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator,
  Share, SafeAreaView, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { FFmpegKit } from 'ffmpeg-kit-react-native';
import axios from 'axios';
import API_BASE_URL from '../../utils/api';
import CustomDrawer from '../CustomDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import MapView, { Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');
const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

export default function AudioRecordingScreen({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [comment, setComment] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showManualLocationModal, setShowManualLocationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [disturbanceAlerts, setDisturbanceAlerts] = useState([]);
  const [analyzingFileId, setAnalyzingFileId] = useState(null);
  const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingFileId, setPlayingFileId] = useState(null);
  const [playbackPositionMap, setPlaybackPositionMap] = useState({});
  const [durationMap, setDurationMap] = useState({});

  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingInterval = useRef(null);
  const videoRef = useRef(null);
  const mapRef = useRef(null);
  const soundRef = useRef(null);

  const noiseLevels = [
    { value: 'green', label: 'Low', icon: 'checkmark-circle', color: '#4CAF50', bgColor: '#E8F5E9', description: 'Mild disturbance', emoji: '😌' },
    { value: 'yellow', label: 'Medium', icon: 'warning', color: '#FFC107', bgColor: '#FFF9C4', description: 'Moderate noise', emoji: '😐' },
    { value: 'red', label: 'High', icon: 'alert-circle', color: '#F44336', bgColor: '#FFEBEE', description: 'Severe disturbance', emoji: '😠' }
  ];

  const AI_SERVICE_URL = 'https://answeringly-priviest-tyree.ngrok-free.dev';

  const supportedAudioFormats = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.3gp'];
  const supportedVideoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.3gp'];

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
      } catch (error) {
        console.error('Error setting up audio:', error);
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
    };
  }, []);

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
        aspect: [16, 9],
        quality: 1,
        allowsMultipleSelection: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = [];
        
        for (const asset of result.assets) {
          const videoUri = asset.uri;
          const fileName = asset.fileName || `video_${Date.now()}.mp4`;
          const fileId = Date.now().toString() + Math.random();
          
          newFiles.push({
            id: fileId,
            uri: videoUri,
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
        
        for (const file of newFiles) {
          setAnalyzingFileId(file.id);
          await analyzeMediaFile(file.id, file.uri, 'video');
        }
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
      const fileInfo = await FileSystem.getInfoAsync(mediaUri);
      if (!fileInfo.exists) {
        throw new Error('File not found');
      }
      
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
          'Content-Type': 'multipart/form-data',
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
        
        if (data.disturbance_assessment?.is_reportable) {
          setDisturbanceAlerts(prev => [...prev, {
            fileId: fileId,
            fileName: fileName,
            disturbance: data.disturbance_assessment
          }]);
          
          if (data.disturbance_assessment.severity_name === 'SEVERE') {
            showDisturbanceAlert(data.disturbance_assessment, fileId);
          }
        }
      } else {
        Alert.alert('Analysis Failed', data.error || 'Unknown error');
        setMediaFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, isAnalyzing: false, analysisError: data.error } : f
        ));
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
    } finally {
      if (analyzingFileId === fileId) {
        setAnalyzingFileId(null);
      }
    }
  };

  const removeMediaFile = (fileId) => {
    Alert.alert('Remove File', 'Remove this file from the report?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive', 
        onPress: () => {
          setMediaFiles(prev => prev.filter(f => f.id !== fileId));
          setDisturbanceAlerts(prev => prev.filter(a => a.fileId !== fileId));
          if (playingFileId === fileId) {
            if (soundRef.current) {
              soundRef.current.unloadAsync();
            }
            setPlayingFileId(null);
            setIsPlaying(false);
          }
        }
      },
    ]);
  };

  const playMedia = async (fileId, uri) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setPlayingFileId(null);
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = newSound;
      const status = await newSound.getStatusAsync();
      setDurationMap(prev => ({ ...prev, [fileId]: Math.floor(status.durationMillis / 1000) }));
      setPlayingFileId(fileId);
      
      await newSound.playAsync();
      setIsPlaying(true);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPositionMap(prev => ({ ...prev, [fileId]: Math.floor(status.positionMillis / 1000) }));
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
      Alert.alert('Error', 'Failed to play media');
    }
  };

  const showDisturbanceAlert = (disturbance, fileId) => {
    Alert.alert(
      disturbance.severity_name === 'SEVERE' ? '🚨 URGENT: Noise Violation Detected!' : '⚠️ Reportable Noise Detected',
      `${disturbance.recommendation}\n\nReasons:\n${disturbance.reasons?.map(r => `• ${r}`).join('\n')}\n\nNormalized SPL: ${disturbance.normalized_spl_db} dB at 10m`,
      [
        { text: 'View Details', onPress: () => setActiveTab('analysis') },
        { text: 'Dismiss', style: 'cancel' }
      ]
    );
  };

  const shareAnalysisReport = async (file) => {
    if (!file.aiResults) return;
    
    const disturbance = file.aiResults.disturbance_assessment;
    const reportText = `
🎤 Noise Analysis Report - ${file.fileName}
========================
${disturbance?.is_reportable ? '⚠️ REPORTABLE NOISE DETECTED' : '✅ No Reportable Noise'}

📊 Sound: ${file.aiResults.urban_classification?.primary_sound || 'Unknown'}
🔊 Volume: ${file.aiResults.decibel} dB
📏 Normalized SPL: ${disturbance?.normalized_spl_db || 'N/A'} dB at 10m
📍 Distance: ${file.aiResults.distance?.meters || '?'}m (${file.aiResults.distance?.category || 'Unknown'})
⏱️ Duration: ${file.aiResults.duration_seconds || 0}s
📹 Source: ${file.mediaSource === 'live' ? 'Live Recording' : 'Downloaded File'}

${disturbance?.is_reportable ? `
🚨 VIOLATION DETAILS:
Severity: ${disturbance.severity_name}
Reasons: ${disturbance.reasons?.join(', ') || 'N/A'}
Action: ${disturbance.recommendation}
` : ''}

🎧 Top Detections:
${file.aiResults.detections?.slice(0, 3).map((d, i) => `${i+1}. ${d.class} (${(d.confidence * 100).toFixed(1)}%)`).join('\n')}

Generated by NoiseWatch AI
${new Date().toLocaleString()}
    `;
    
    try {
      await Share.share({
        message: reportText,
        title: `Noise Analysis - ${file.fileName}`
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const openMediaModal = () => {
    setIsMediaModalVisible(true);
  };

  const closeMediaModal = () => {
    setIsMediaModalVisible(false);
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
          message += `Classes: ${responseData.flask_ai.yamnet_classes}\n`;
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

  // ==================== LOCATION FUNCTIONS ====================
  const getUserLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        Alert.alert('Permission Required', 'Please grant location access.');
        setLocationLoading(false);
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
      setLocationLoading(false);
      
      const displayAddress = cleanAddress.street || 
                            `${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`;
      
      Alert.alert('✅ Location Added', `${displayAddress}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
    } catch (error) {
      setLocationError('Failed to get location');
      setLocationLoading(false);
      Alert.alert('Error', 'Failed to get location.');
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search', 'Please enter a location to search');
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const results = data.features.map(feature => ({
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          display_name: feature.properties.name || feature.properties.street || 
                        `${feature.properties.city || ''} ${feature.properties.country || ''}`,
          full_address: feature.properties.street ? 
                        `${feature.properties.street}, ${feature.properties.city || ''}, ${feature.properties.country || ''}` :
                        feature.properties.name || 'Selected location'
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
        Alert.alert('No Results', 'No locations found. Try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to search location. Please try again or tap on the map directly.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const locationName = result.display_name;
    
    setSelectedMapLocation({ latitude: lat, longitude: lng });
    setSearchQuery(locationName);
    setSearchResults([]);
    
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const openManualLocationPicker = () => {
    setSelectedMapLocation(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowManualLocationModal(true);
  };

  const confirmManualLocation = async () => {
    if (!selectedMapLocation) {
      Alert.alert('No Location Selected', 'Please search or tap on the map to select a location');
      return;
    }
    
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: selectedMapLocation.latitude,
        longitude: selectedMapLocation.longitude
      });
      
      const addressData = address[0] || {};
      const cleanAddress = {
        street: addressData.street || addressData.name || 'Selected location',
        city: addressData.city || addressData.subregion || addressData.district || '',
        region: addressData.region || '',
        country: addressData.country || '',
        postalCode: addressData.postalCode || '',
        name: addressData.name || ''
      };
      
      setLocation({
        latitude: selectedMapLocation.latitude,
        longitude: selectedMapLocation.longitude,
        address: cleanAddress,
        timestamp: new Date().toISOString(),
        isManual: true
      });
      
      setShowManualLocationModal(false);
      
      const displayAddress = cleanAddress.street || 
                            `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`;
      
      Alert.alert('✅ Location Added', displayAddress);
      
    } catch (error) {
      console.error('Error getting address:', error);
      setLocation({
        latitude: selectedMapLocation.latitude,
        longitude: selectedMapLocation.longitude,
        address: { street: 'Selected location', city: '', region: '', country: '' },
        timestamp: new Date().toISOString(),
        isManual: true
      });
      setShowManualLocationModal(false);
      Alert.alert('✅ Location Added', `${selectedMapLocation.latitude.toFixed(6)}, ${selectedMapLocation.longitude.toFixed(6)}`);
    }
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

      const formData = new FormData();
      formData.append('userId', userId);
      
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
          formData.append(`media_${i}_ai_analysis`, JSON.stringify(file.aiResults));
          formData.append(`media_${i}_ai_decibel`, file.aiResults.decibel?.toString() || '0');
          formData.append(`media_${i}_ai_noise_level`, file.aiResults.noise_level?.level || '');
          formData.append(`media_${i}_ai_noise_value`, file.aiResults.noise_level?.value || '');
          formData.append(`media_${i}_ai_noise_description`, file.aiResults.noise_level?.description || '');
          
          if (file.aiResults.disturbance_assessment) {
            const da = file.aiResults.disturbance_assessment;
            formData.append(`media_${i}_ai_is_reportable`, da.is_reportable?.toString() || 'false');
            formData.append(`media_${i}_ai_severity`, da.severity_name || '');
            formData.append(`media_${i}_ai_disturbance_score`, da.disturbance_score?.toString() || '0');
            formData.append(`media_${i}_ai_normalized_spl`, da.normalized_spl_db?.toString() || '0');
            formData.append(`media_${i}_ai_recommendation`, da.recommendation || '');
            formData.append(`media_${i}_ai_reasons`, JSON.stringify(da.reasons || []));
          }
          
          if (file.aiResults.detections && file.aiResults.detections.length > 0) {
            formData.append(`media_${i}_ai_detections`, JSON.stringify(file.aiResults.detections));
            file.aiResults.detections.slice(0, 3).forEach((detection, idx) => {
              formData.append(`media_${i}_ai_detection_${idx + 1}_class`, detection.class);
              formData.append(`media_${i}_ai_detection_${idx + 1}_confidence`, detection.confidence?.toString() || '0');
            });
          }
          
          if (file.aiResults.distance) {
            formData.append(`media_${i}_ai_distance_meters`, file.aiResults.distance.meters?.toString() || '0');
            formData.append(`media_${i}_ai_distance_category`, file.aiResults.distance.category || '');
          }
        }
        
        formData.append(`media_${i}_duration`, file.totalDuration?.toString() || '0');
      }
      
      formData.append('total_files', mediaFiles.length.toString());
      
      if (comment) {
        formData.append('comment', comment);
      }
      
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
          isManual: location.isManual || false
        }));
        
        formData.append('location_latitude', location.latitude?.toString() || '');
        formData.append('location_longitude', location.longitude?.toString() || '');
        formData.append('location_address_street', locationAddress);
        formData.append('location_address_city', location.address?.city || '');
        formData.append('location_address_region', location.address?.region || '');
        formData.append('location_address_country', location.address?.country || '');
        formData.append('location_timestamp', location.timestamp || '');
        formData.append('location_is_manual', (location.isManual || false).toString());
      }
      
      formData.append('app_version', Constants.expoConfig?.version || '1.0.0');
      formData.append('platform', Platform.OS);
      formData.append('platform_version', Platform.Version?.toString() || '');
      formData.append('timestamp', new Date().toISOString());

      console.log('📤 Submitting report with', mediaFiles.length, 'files...');
      
      const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      });

      setIsSubmitting(false);

      const reportableCount = mediaFiles.filter(f => f.aiResults?.disturbance_assessment?.is_reportable).length;
      const severeCount = mediaFiles.filter(f => f.aiResults?.disturbance_assessment?.severity_name === 'SEVERE').length;
      
      const reportDetails = `✅ Multi-File Report Submitted!\n\n` +
        `📋 Report ID: ${response.data.reportId || 'N/A'}\n` +
        `📁 Files Submitted: ${mediaFiles.length}\n` +
        `⚠️ Reportable Files: ${reportableCount}\n` +
        `${severeCount > 0 ? `🚨 Severe Violations: ${severeCount}\n` : ''}` +
        `${comment ? `📄 Details: ${comment}\n` : ''}` +
        `${location ? `📍 Location: ${location.address?.street || ''} ${location.address?.city || ''}\n` : ''}` +
        `⏱️ Submitted: ${new Date().toLocaleString()}`;

      Alert.alert('✅ Report Submitted', reportDetails, [
        { 
          text: 'OK', 
          onPress: () => {
            setComment('');
            setMediaFiles([]);
            setLocation(null);
            setLocationError(null);
            setDisturbanceAlerts([]);
            setActiveTab('analysis');
          }
        }
      ]);

    } catch (error) {
      setIsSubmitting(false);
      console.error('Error submitting report:', error);
      
      let errorMessage = 'Failed to submit noise report. Please try again.';
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
  const renderDetailedAnalysis = (item, index) => {
    const level = item.aiResults?.noise_level?.value;
    const levelInfo = noiseLevels.find(l => l.value === level);
    const disturbance = item.aiResults?.disturbance_assessment;
    const isReportable = disturbance?.is_reportable;
    const severity = disturbance?.severity_name;
    const isPlayingThis = playingFileId === item.id;
    const currentPos = playbackPositionMap[item.id] || 0;
    const duration = durationMap[item.id] || item.totalDuration || 0;
    
    if (!item.aiResults) {
      return (
        <View style={s.analysisCard}>
          <View style={s.analysisCardHeader}>
            <View style={s.analysisFileIcon}>
              <Ionicons name={item.type === 'video' ? 'videocam' : 'musical-notes'} size={24} color="#8B4513" />
            </View>
            <View style={s.analysisFileInfo}>
              <Text style={s.analysisFileName}>{item.fileName}</Text>
              <View style={s.analysisFileMeta}>
                <View style={[s.sourceBadgeSmall, item.mediaSource === 'live' ? s.liveBadgeSmall : s.downloadedBadgeSmall]}>
                  <Ionicons name={item.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
                  <Text style={s.sourceBadgeTextSmall}>{item.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
                </View>
                {item.isAnalyzing && (
                  <View style={s.analyzingBadgeSmall}>
                    <ActivityIndicator size="small" color="#D4AC0D" />
                    <Text style={s.analyzingTextSmall}>Analyzing...</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          {item.isAnalyzing && (
            <View style={s.analyzingContainer}>
              <ActivityIndicator size="large" color="#D4AC0D" />
              <Text style={s.analyzingText}>AI is analyzing this file...</Text>
            </View>
          )}
        </View>
      );
    }
    
    return (
      <View style={[s.analysisCard, isReportable && severity === 'SEVERE' && s.criticalCard]}>
        {/* File Header */}
        <View style={s.analysisCardHeader}>
          <View style={s.analysisFileIcon}>
            <Ionicons name={item.type === 'video' ? 'videocam' : 'musical-notes'} size={24} color={isReportable ? '#E74C3C' : '#8B4513'} />
          </View>
          <View style={s.analysisFileInfo}>
            <Text style={s.analysisFileName}>{item.fileName}</Text>
            <View style={s.analysisFileMeta}>
              <View style={[s.sourceBadgeSmall, item.mediaSource === 'live' ? s.liveBadgeSmall : s.downloadedBadgeSmall]}>
                <Ionicons name={item.mediaSource === 'live' ? "mic" : "download"} size={10} color="#fff" />
                <Text style={s.sourceBadgeTextSmall}>{item.mediaSource === 'live' ? 'Live' : 'Downloaded'}</Text>
              </View>
              {isReportable && (
                <View style={s.reportableBadgeSmall}>
                  <Ionicons name="alert" size={12} color="#E74C3C" />
                  <Text style={s.reportableTextSmall}>{severity}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {/* Disturbance Banner if Reportable */}
        {isReportable && disturbance && (
          <View style={s.disturbanceInline}>
            <LinearGradient colors={severity === 'SEVERE' ? ['#E74C3C', '#C0392B'] : ['#E67E22', '#D35400']} style={s.disturbanceInlineGradient}>
              <Ionicons name={severity === 'SEVERE' ? "alert-circle" : "warning"} size={20} color="#fff" />
              <View style={s.disturbanceInlineContent}>
                <Text style={s.disturbanceInlineTitle}>{severity === 'SEVERE' ? 'URGENT' : 'Reportable'}</Text>
                <Text style={s.disturbanceInlineText}>{disturbance.recommendation?.substring(0, 60)}...</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        
        {/* Main Metrics */}
        <View style={s.analysisMetrics}>
          <View style={s.metricLarge}>
            <Text style={s.metricLargeValue}>{item.aiResults.decibel} dB</Text>
            <Text style={s.metricLargeLabel}>Measured</Text>
          </View>
          {disturbance?.normalized_spl_db && (
            <View style={s.metricLarge}>
              <Text style={[s.metricLargeValue, { color: isReportable ? '#E74C3C' : '#8B4513' }]}>
                {disturbance.normalized_spl_db} dB
              </Text>
              <Text style={s.metricLargeLabel}>At 10m</Text>
            </View>
          )}
          {item.aiResults.distance && (
            <View style={s.metricLarge}>
              <Text style={s.metricLargeValue}>{item.aiResults.distance.meters}m</Text>
              <Text style={s.metricLargeLabel}>Distance</Text>
            </View>
          )}
        </View>
        
        {/* Audio Progress Bar */}
        {item.type === 'audio' && (
          <View style={s.progressSection}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${duration > 0 ? (currentPos / duration) * 100 : 0}%` }]} />
            </View>
            <View style={s.timeLabels}>
              <Text style={s.timeText}>{formatTime(currentPos)}</Text>
              <Text style={s.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        )}
        
        {/* Top Detections */}
        {item.aiResults.detections && item.aiResults.detections.length > 0 && (
          <View style={s.detectionsSection}>
            <Text style={s.detectionsTitle}>Top Detected Sounds</Text>
            {item.aiResults.detections.slice(0, 3).map((detection, idx) => {
              const confidencePercent = (detection.confidence * 100).toFixed(1);
              return (
                <View key={idx} style={s.detectionRow}>
                  <View style={s.detectionRankContainer}>
                    <LinearGradient
                      colors={idx === 0 ? ['#D4AC0D', '#8B4513'] : ['#E0E0E0', '#BDBDBD']}
                      style={s.detectionRankBadge}
                    >
                      <Text style={s.detectionRankText}>{idx + 1}</Text>
                    </LinearGradient>
                  </View>
                  <View style={s.detectionInfo}>
                    <Text style={s.detectionName}>{detection.class}</Text>
                    <View style={s.detectionConfidenceBar}>
                      <View style={s.detectionConfidenceBg}>
                        <LinearGradient
                          colors={idx === 0 ? ['#D4AC0D', '#8B4513'] : ['#2196F3', '#1976D2']}
                          style={[s.detectionConfidenceFill, { width: `${confidencePercent}%` }]}
                        />
                      </View>
                      <Text style={s.detectionConfidenceText}>{confidencePercent}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {/* Reasons if Reportable */}
        {isReportable && disturbance?.reasons && disturbance.reasons.length > 0 && (
          <View style={s.reasonsSection}>
            <Text style={s.reasonsTitle}>Reasons:</Text>
            {disturbance.reasons.slice(0, 2).map((reason, idx) => (
              <View key={idx} style={s.reasonRow}>
                <Ionicons name="alert-circle" size={14} color="#E74C3C" />
                <Text style={s.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={s.analysisActions}>
          {item.type === 'audio' && (
            <TouchableOpacity style={s.actionBtn} onPress={() => playMedia(item.id, item.uri)}>
              <Ionicons name={isPlayingThis ? "pause" : "play"} size={18} color="#8B4513" />
              <Text style={s.actionBtnText}>{isPlayingThis ? 'Pause' : 'Play'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.actionBtn} onPress={() => shareAnalysisReport(item)}>
            <Ionicons name="share-outline" size={18} color="#8B4513" />
            <Text style={s.actionBtnText}>Share</Text>
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
        onRequestClose={closeMediaModal}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Media</Text>
              <TouchableOpacity onPress={closeMediaModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Audio Section */}
              <View style={s.modalSection}>
                <Text style={s.modalSectionTitle}>
                  <Ionicons name="mic" size={18} color="#8B4513" /> Audio
                </Text>
                <View style={s.modalOptionsRow}>
                  <TouchableOpacity style={s.modalOption} onPress={startRecording}>
                    <LinearGradient colors={['#2196F3', '#1976D2']} style={s.modalOptionGradient}>
                      <Ionicons name="mic" size={28} color="#fff" />
                      <Text style={s.modalOptionText}>Record Audio</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.modalOption} onPress={pickAudioFiles}>
                    <LinearGradient colors={['#4CAF50', '#388E3C']} style={s.modalOptionGradient}>
                      <Ionicons name="folder-open" size={28} color="#fff" />
                      <Text style={s.modalOptionText}>Choose Audio</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Video Section */}
              <View style={s.modalSection}>
                <Text style={s.modalSectionTitle}>
                  <Ionicons name="videocam" size={18} color="#8B4513" /> Video
                </Text>
                <View style={s.modalOptionsRow}>
                  <TouchableOpacity style={s.modalOption} onPress={recordVideo}>
                    <LinearGradient colors={['#E91E63', '#C2185B']} style={s.modalOptionGradient}>
                      <Ionicons name="videocam" size={28} color="#fff" />
                      <Text style={s.modalOptionText}>Record Video</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.modalOption} onPress={pickVideoFromGallery}>
                    <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={s.modalOptionGradient}>
                      <Ionicons name="images" size={28} color="#fff" />
                      <Text style={s.modalOptionText}>From Gallery</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.modalOption} onPress={pickVideoFiles}>
                    <LinearGradient colors={['#FF9800', '#F57C00']} style={s.modalOptionGradient}>
                      <Ionicons name="folder-open" size={28} color="#fff" />
                      <Text style={s.modalOptionText}>Choose Video</Text>
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

  const renderManualLocationModal = () => {
    return (
      <Modal
        visible={showManualLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowManualLocationModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.mapModalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Location on Map</Text>
              <TouchableOpacity onPress={() => setShowManualLocationModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={s.searchContainer}>
              <View style={s.searchInputContainer}>
                <Ionicons name="search" size={20} color="#999" style={s.searchIcon} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search for a location..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={searchLocation}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={s.searchButton} onPress={searchLocation} disabled={isSearching}>
                <LinearGradient colors={['#8B4513', '#654321']} style={s.searchButtonGradient}>
                  <Text style={s.searchButtonText}>{isSearching ? 'Searching...' : 'Search'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {searchResults.length > 0 && (
              <View style={s.searchResultsContainer}>
                <ScrollView style={s.searchResultsScroll} nestedScrollEnabled>
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={s.searchResultItem}
                      onPress={() => selectSearchResult(result)}
                    >
                      <Ionicons name="location-outline" size={18} color="#8B4513" />
                      <Text style={s.searchResultText} numberOfLines={2}>{result.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            <View style={s.mapContainer}>
              <MapView
                ref={mapRef}
                style={s.map}
                initialRegion={{
                  latitude: 14.5995,
                  longitude: 120.9842,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setSelectedMapLocation({ latitude, longitude });
                }}
              >
                {selectedMapLocation && (
                  <Marker
                    coordinate={selectedMapLocation}
                    draggable
                    onDragEnd={(e) => {
                      setSelectedMapLocation(e.nativeEvent.coordinate);
                    }}
                  />
                )}
              </MapView>
            </View>
            
            <View style={s.mapInstructions}>
              <Ionicons name="finger-print" size={20} color="#8B4513" />
              <Text style={s.mapInstructionsText}>Tap on map to place marker, drag to adjust</Text>
            </View>
            
            <TouchableOpacity style={s.confirmLocationBtn} onPress={confirmManualLocation}>
              <LinearGradient colors={['#8B4513', '#654321']} style={s.confirmLocationGradient}>
                <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
                <Text style={s.confirmLocationText}>Confirm Location</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analysis':
        return (
          <View style={s.tabContent}>
            {disturbanceAlerts.length > 0 && (
              <View style={s.alertSummary}>
                <LinearGradient colors={['#FFEBEE', '#FFCDD2']} style={s.alertSummaryGradient}>
                  <Ionicons name="warning" size={24} color="#E74C3C" />
                  <View style={s.alertSummaryContent}>
                    <Text style={s.alertSummaryTitle}>
                      {disturbanceAlerts.length} Reportable Noise(s) Detected
                    </Text>
                    <Text style={s.alertSummaryText}>
                      {disturbanceAlerts.filter(a => a.disturbance.severity_name === 'SEVERE').length} severe violations
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            )}
            
            {mediaFiles.length > 0 ? (
              <FlatList
                data={mediaFiles}
                renderItem={({ item, index }) => renderDetailedAnalysis(item, index)}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                contentContainerStyle={s.detailedAnalysisContainer}
              />
            ) : (
              <View style={s.emptyAnalysis}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons name="analytics-outline" size={60} color="#D4AC0D" />
                </Animated.View>
                <Text style={s.emptyTitle}>No Media Added</Text>
                <Text style={s.emptyText}>Tap the + button to add audio or video files</Text>
                <Text style={s.emptySubtext}>AI will analyze each file separately</Text>
              </View>
            )}
          </View>
        );

      case 'details':
        return (
          <View style={s.tabContent}>
            <View style={s.detailsCard}>
              <View style={s.sectionHeader}>
                <Ionicons name="chatbubble-outline" size={20} color="#8B4513" />
                <Text style={s.sectionHeaderTitle}>Additional Details</Text>
              </View>
              <TextInput 
                style={s.detailsInput} 
                placeholder="Describe the noise issue (optional)" 
                placeholderTextColor="#999" 
                multiline 
                numberOfLines={4} 
                value={comment} 
                onChangeText={setComment} 
                maxLength={500} 
                textAlignVertical="top" 
              />
              <Text style={s.charCount}>{comment.length}/500</Text>
            </View>
          </View>
        );

      case 'location':
        return (
          <View style={s.tabContent}>
            <View style={s.locationCard}>
              <View style={s.sectionHeader}>
                <Ionicons name="location-outline" size={20} color="#8B4513" />
                <Text style={s.sectionHeaderTitle}>Location</Text>
              </View>
              
              {!location ? (
                <>
                  <TouchableOpacity 
                    style={s.addLocationBtn} 
                    onPress={getUserLocation} 
                    disabled={locationLoading}
                  >
                    <LinearGradient
                      colors={['#8B4513', '#654321']}
                      style={s.addLocationGradient}
                    >
                      <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#D4AC0D" />
                      <Text style={s.addLocationText}>
                        {locationLoading ? 'Getting Location...' : 'Use Current Location'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <View style={s.orDivider}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerText}>OR</Text>
                    <View style={s.dividerLine} />
                  </View>
                  
                  <TouchableOpacity 
                    style={s.addLocationBtn} 
                    onPress={openManualLocationPicker}
                  >
                    <LinearGradient
                      colors={['#D4AC0D', '#8B4513']}
                      style={s.addLocationGradient}
                    >
                      <Ionicons name="map" size={24} color="#fff" />
                      <Text style={s.addLocationText}>Select on Map</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={s.locationInfoCard}>
                  <View style={s.locationHeader}>
                    <View style={s.locationBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={s.locationBadgeText}>
                        Location Added {location.isManual ? '(Manual)' : '(GPS)'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setLocation(null)} style={s.removeLocationBtn}>
                      <Ionicons name="close" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={s.locationDetails}>
                    <Text style={s.locationAddress}>
                      {location.address?.street || location.address?.name || 'Selected Location'}
                    </Text>
                    {location.address?.city && (
                      <Text style={s.locationCity}>
                        {location.address.city}, {location.address.region || ''}
                      </Text>
                    )}
                    {location.latitude && (
                      <>
                        <View style={s.coordinatesContainer}>
                          <Text style={s.coordinatesLabel}>Latitude:</Text>
                          <Text style={s.coordinatesValue}>{location.latitude.toFixed(6)}</Text>
                        </View>
                        <View style={s.coordinatesContainer}>
                          <Text style={s.coordinatesLabel}>Longitude:</Text>
                          <Text style={s.coordinatesValue}>{location.longitude.toFixed(6)}</Text>
                        </View>
                      </>
                    )}
                  </View>
                  
                  <TouchableOpacity style={s.refreshLocationBtn} onPress={getUserLocation}>
                    <Ionicons name="refresh" size={18} color="#8B4513" />
                    <Text style={s.refreshLocationText}>Refresh GPS Location</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {locationError && (
                <View style={s.locationError}>
                  <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                  <Text style={s.locationErrorText}>{locationError}</Text>
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
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      {/* Header */}
      <LinearGradient colors={['#8B4513', '#654321']} style={s.header}>
        <View style={s.headerContent}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={s.headerButton}>
              <Ionicons name="menu" size={28} color="#D4AC0D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}>
              <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={testAIService} style={s.headerButton}>
              <Ionicons name="wifi" size={24} color="#D4AC0D" />
            </TouchableOpacity>
          </View>
          <Text style={s.headerTitle}>Noise Report</Text>
          <Text style={s.headerSubtitle}>
            {isRecording ? 'Recording in progress...' : 
             mediaFiles.length > 0 ? `${mediaFiles.length} file(s) ready` : 
             'Add media files for analysis'}
          </Text>
        </View>
      </LinearGradient>

      {/* Recording Control */}
      {isRecording && (
        <View style={s.recordingControlContainer}>
          <LinearGradient colors={['#E74C3C', '#C0392B']} style={s.recordingControlGradient}>
            <View style={s.recordingInfo}>
              <View style={s.recordingDot} />
              <Text style={s.recordingTimer}>{formatTime(recordingDuration)}</Text>
            </View>
            <TouchableOpacity style={s.stopRecordingButton} onPress={stopRecording}>
              <Ionicons name="stop-circle" size={32} color="#fff" />
              <Text style={s.stopRecordingText}>Stop Recording</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Add Media Button */}
      {!isRecording && (
        <TouchableOpacity style={s.addMediaButton} onPress={openMediaModal}>
          <LinearGradient colors={['#D4AC0D', '#8B4513']} style={s.addMediaGradient}>
            <Ionicons name="add-circle" size={28} color="#fff" />
            <Text style={s.addMediaText}>Add Media Files</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Tabs - Show when there are media files and not recording */}
      {mediaFiles.length > 0 && !isRecording && (
        <View style={s.tabsContainer}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'analysis' && s.activeTab]}
            onPress={() => setActiveTab('analysis')}
          >
            <Ionicons 
              name="analytics" 
              size={20} 
              color={activeTab === 'analysis' ? '#8B4513' : '#999'} 
            />
            <Text style={[s.tabText, activeTab === 'analysis' && s.activeTabText]}>
              Analysis
            </Text>
            {disturbanceAlerts.length > 0 && activeTab !== 'analysis' && (
              <View style={s.notificationDot} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tab, activeTab === 'details' && s.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Ionicons 
              name="document-text" 
              size={20} 
              color={activeTab === 'details' ? '#8B4513' : '#999'} 
            />
            <Text style={[s.tabText, activeTab === 'details' && s.activeTabText]}>
              Details
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tab, activeTab === 'location' && s.activeTab]}
            onPress={() => setActiveTab('location')}
          >
            <Ionicons 
              name="location" 
              size={20} 
              color={activeTab === 'location' ? '#8B4513' : '#999'} 
            />
            <Text style={[s.tabText, activeTab === 'location' && s.activeTabText]}>
              Location
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Content */}
      <ScrollView 
        style={s.tabContentContainer} 
        contentContainerStyle={s.tabContentContainerContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}

        {/* Submit Button */}
        {mediaFiles.length > 0 && !isRecording && (
          <TouchableOpacity
            onPress={saveRecording}
            style={[s.submitBtn, (mediaFiles.some(f => f.isAnalyzing) || isSubmitting) && s.submitBtnDisabled]}
            disabled={mediaFiles.some(f => f.isAnalyzing) || isSubmitting}
          >
            <LinearGradient colors={['#8B4513', '#654321']} style={s.submitGradient}>
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#D4AC0D" />
                  <Text style={s.submitText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#D4AC0D" />
                  <Text style={s.submitText}>Submit Report ({mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''})</Text>
                  {disturbanceAlerts.length > 0 && (
                    <View style={s.reportableIndicator}>
                      <Ionicons name="alert" size={16} color="#E74C3C" />
                    </View>
                  )}
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modals */}
      {renderMediaModal()}
      {renderManualLocationModal()}

      {/* Drawer Modal */}
      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={s.modalContainer}>
          <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[s.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  
  // Header
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

  // Recording Control
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
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  recordingTimer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  stopRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
  },
  stopRecordingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Add Media Button
  addMediaButton: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  addMediaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  addMediaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    padding: 5,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#f5f5f5',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#8B4513',
    fontWeight: '600',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: '30%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
  },

  // Tab Content
  tabContentContainer: {
    flex: 1,
  },
  tabContentContainerContent: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  tabContent: {
    gap: 15,
  },

  // Alert Summary
  alertSummary: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 5,
  },
  alertSummaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  alertSummaryContent: {
    flex: 1,
  },
  alertSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  alertSummaryText: {
    fontSize: 12,
    color: '#E74C3C',
    opacity: 0.8,
    marginTop: 2,
  },

  // Empty Analysis
  emptyAnalysis: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },

  // Detailed Analysis Card
  detailedAnalysisContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  criticalCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFCDD2',
  },
  analysisCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  analysisFileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisFileInfo: {
    flex: 1,
  },
  analysisFileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  analysisFileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveBadgeSmall: {
    backgroundColor: '#4CAF50',
  },
  downloadedBadgeSmall: {
    backgroundColor: '#2196F3',
  },
  sourceBadgeTextSmall: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  reportableBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  reportableTextSmall: {
    fontSize: 10,
    color: '#E74C3C',
    fontWeight: '600',
  },
  analyzingBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyzingTextSmall: {
    fontSize: 10,
    color: '#D4AC0D',
  },

  // Disturbance Inline
  disturbanceInline: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  disturbanceInlineGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  disturbanceInlineContent: {
    flex: 1,
  },
  disturbanceInlineTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disturbanceInlineText: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.9,
    marginTop: 2,
  },

  // Analysis Metrics
  analysisMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricLarge: {
    alignItems: 'center',
  },
  metricLargeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  metricLargeLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  // Progress Section
  progressSection: {
    marginBottom: 16,
  },
  progressBar: { 
    height: 6, 
    backgroundColor: '#e0e0e0', 
    borderRadius: 3, 
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#D4AC0D', 
    borderRadius: 3 
  },
  timeLabels: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  timeText: { 
    fontSize: 12, 
    color: '#666',
  },

  // Detections Section
  detectionsSection: {
    marginBottom: 16,
  },
  detectionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 12,
  },
  detectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detectionRankContainer: {
    width: 32,
  },
  detectionRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectionRankText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detectionInfo: {
    flex: 1,
  },
  detectionName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  detectionConfidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detectionConfidenceBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  detectionConfidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  detectionConfidenceText: {
    fontSize: 11,
    color: '#666',
    width: 40,
  },

  // Reasons Section
  reasonsSection: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  reasonsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E67E22',
    marginBottom: 6,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },

  // Analysis Actions
  analysisActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  actionBtnText: {
    fontSize: 12,
    color: '#8B4513',
  },

  // Analyzing Container
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  analyzingText: {
    fontSize: 14,
    color: '#8B4513',
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    minHeight: 100,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },

  // Location Card
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    elevation: 2,
  },
  addLocationBtn: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 5,
  },
  addLocationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  addLocationText: {
    color: '#D4AC0D',
    fontSize: 16,
    fontWeight: '600',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 12,
  },
  locationInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginTop: 5,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationBadgeText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  removeLocationBtn: {
    padding: 4,
  },
  locationDetails: {
    marginBottom: 12,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationCity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  coordinatesLabel: {
    fontSize: 12,
    color: '#999',
    width: 70,
  },
  coordinatesValue: {
    fontSize: 12,
    color: '#333',
  },
  refreshLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  refreshLocationText: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '500',
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  locationErrorText: {
    fontSize: 13,
    color: '#E74C3C',
    flex: 1,
  },

  // Submit Button
  submitBtn: {
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitText: {
    color: '#D4AC0D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  reportableIndicator: {
    backgroundColor: '#FFEBEE',
    padding: 4,
    borderRadius: 12,
    marginLeft: 8,
  },

  // Modals
  modalContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    width: width - 40,
    maxHeight: height * 0.8,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 12,
  },
  modalOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalOption: {
    flex: 1,
    minWidth: (width - 80) / 2 - 12,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
  },
  modalOptionGradient: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Map Modal
  mapModalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    width: width - 20,
    height: height * 0.7,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  searchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchResultsScroll: {
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  searchResultText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  mapContainer: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    marginVertical: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 10,
  },
  mapInstructionsText: {
    fontSize: 12,
    color: '#666',
  },
  confirmLocationBtn: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
  },
  confirmLocationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  confirmLocationText: {
    color: '#D4AC0D',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
