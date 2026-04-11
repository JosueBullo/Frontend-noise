import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Dimensions, Modal, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../utils/api';

const { width, height } = Dimensions.get('window');

const C = {
  dark:   '#3E2C23',
  saddle: '#8B4513',
  gold:   '#DAA520',
  cream:  '#FDF5E6',
  white:  '#FFFFFF',
  bg:     '#F5F0E8',
  sub:    '#8B7355',
  muted:  '#A89070',
};

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm Decibel AI 👋 I'm here to help you with noise disturbance questions — safe levels, health effects, how to report, Philippine noise laws, and more. What can I help you with?",
};

const SUGGESTED = [
  'What is a safe noise level?',
  'How do I file a noise complaint?',
  'What are Philippine noise laws?',
  'How does noise affect health?',
  'What dB level is dangerous?',
];

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={ty.wrap}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[ty.dot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

const ty = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  dot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.muted },
});

export default function DecibelAI({ visible, onClose }) {
  const [messages, setMessages]     = useState([WELCOME_MSG]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const flatRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Load this user's chat history from DB when chat opens
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/chatbot/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success && data.messages.length > 0) {
        // Prepend welcome message before history
        setMessages([WELCOME_MSG, ...data.messages]);
      } else {
        setMessages([WELCOME_MSG]);
      }
    } catch {
      setMessages([WELCOME_MSG]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadHistory();
  }, [visible, loadHistory]);

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');

    const userMsg = { id: Date.now().toString(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: msg }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || "Sorry, I couldn't get a response. Please try again.",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Connection error. Please check your internet and try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear your chat history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            await fetch(`${API_BASE_URL}/chatbot/history`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            setMessages([WELCOME_MSG]);
          } catch { /* silent */ }
        }
      }
    ]);
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser && (
          <LinearGradient colors={[C.saddle, C.dark]} style={s.avatar}>
            <Image source={require('../assets/AI.png')} style={s.avatarImg} resizeMode="contain" />
          </LinearGradient>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleBot]}>
          <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView
          style={s.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <LinearGradient colors={[C.dark, C.saddle]} style={s.header}>
            <View style={s.headerLeft}>
              <LinearGradient colors={[C.gold, '#B8860B']} style={s.headerAvatar}>
                <Image source={require('../assets/AI.png')} style={s.headerAvatarImg} resizeMode="contain" />
              </LinearGradient>
              <View>
                <Text style={s.headerTitle}>Decibel AI</Text>
                <Text style={s.headerSub}>Noise Disturbance Assistant</Text>
              </View>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity onPress={clearHistory} style={s.headerBtn}>
                <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={s.headerBtn}>
                <Ionicons name="close" size={24} color={C.cream} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Loading history */}
          {historyLoading ? (
            <View style={s.historyLoading}>
              <ActivityIndicator size="small" color={C.saddle} />
              <Text style={s.historyLoadingText}>Loading your chat history...</Text>
            </View>
          ) : (
            <>
              {/* Messages */}
              <FlatList
                ref={flatRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={s.messageList}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={loading ? (
                  <View style={s.msgRow}>
                    <LinearGradient colors={[C.saddle, C.dark]} style={s.avatar}>
                      <Image source={require('../assets/AI.png')} style={s.avatarImg} resizeMode="contain" />
                    </LinearGradient>
                    <View style={s.bubbleBot}>
                      <TypingIndicator />
                    </View>
                  </View>
                ) : null}
              />

              {/* Suggested questions — show only at start */}
              {messages.length <= 1 && !loading && (
                <View style={s.suggestedWrap}>
                  <Text style={s.suggestedLabel}>Suggested questions</Text>
                  <FlatList
                    horizontal
                    data={SUGGESTED}
                    keyExtractor={(_, i) => i.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={s.chip} onPress={() => sendMessage(item)}>
                        <Text style={s.chipText}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Input */}
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  placeholder="Ask about noise disturbances..."
                  placeholderTextColor={C.muted}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={500}
                  onSubmitEditing={() => sendMessage()}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
                  onPress={() => sendMessage()}
                  disabled={!input.trim() || loading}
                >
                  {loading
                    ? <ActivityIndicator size="small" color={C.white} />
                    : <Ionicons name="send" size={18} color={C.white} />
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:          { height: height * 0.85, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar:   { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  headerAvatarImg:{ width: 28, height: 28, borderRadius: 14 },
  headerTitle:    { fontSize: 16, fontWeight: '800', color: C.white },
  headerSub:      { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtn:      { padding: 6 },

  // History loading
  historyLoading:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  historyLoadingText: { fontSize: 13, color: C.muted },

  // Messages
  messageList:    { padding: 16, gap: 12, paddingBottom: 8 },
  msgRow:         { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser:     { flexDirection: 'row-reverse' },
  avatar:         { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarImg:      { width: 22, height: 22, borderRadius: 11 },
  bubble:         { maxWidth: width * 0.72, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot:      { backgroundColor: C.white, borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  bubbleUser:     { backgroundColor: C.saddle, borderBottomRightRadius: 4 },
  bubbleText:     { fontSize: 14, color: C.dark, lineHeight: 20 },
  bubbleTextUser: { color: C.white },

  // Suggested
  suggestedWrap:  { paddingVertical: 10 },
  suggestedLabel: { fontSize: 11, color: C.muted, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  chip:           { backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E8DDD0' },
  chipText:       { fontSize: 12, color: C.saddle, fontWeight: '600' },

  // Input
  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: '#EEE' },
  input:          { flex: 1, backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.dark, maxHeight: 100, borderWidth: 1, borderColor: '#E8DDD0' },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: C.saddle, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled:{ backgroundColor: C.muted },
});
